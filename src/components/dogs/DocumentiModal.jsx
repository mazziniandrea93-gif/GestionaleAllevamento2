import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  X, FileText, Loader2, FileDown, Receipt,
  ChevronRight, AlertCircle, ClipboardList,
} from 'lucide-react'

// ── Costanti layout A4 (mm) ───────────────────────────────────────────────────
const W = 210, H = 297, ML = 18, MR = 18
const CW = W - ML - MR

// ── Colori ────────────────────────────────────────────────────────────────────
const C = {
  dark:   [31,  41,  55],
  yellow: [245, 158, 11],
  gray:   [107, 114, 128],
  light:  [249, 250, 251],
  border: [229, 231, 235],
  white:  [255, 255, 255],
  green:  [16,  185, 129],
  amber:  [245, 158, 11],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function d(str) {
  if (!str) return '—'
  try { return format(new Date(str.includes('T') ? str : str + 'T00:00:00'), 'dd/MM/yyyy', { locale: it }) }
  catch { return str }
}
function v(val) { return val || '—' }
function gender(g) { return g?.toLowerCase() === 'femmina' || g?.toLowerCase() === 'f' ? 'Femmina' : 'Maschio' }
function age(bd) {
  if (!bd) return '—'
  const y = Math.floor((Date.now() - new Date(bd).getTime()) / (365.25 * 24 * 3600 * 1000))
  const m = Math.floor((Date.now() - new Date(bd).getTime()) / (30.44 * 24 * 3600 * 1000)) % 12
  if (y > 0) return `${y} ${y === 1 ? 'anno' : 'anni'}${m > 0 ? ` e ${m} mesi` : ''}`
  return `${m} ${m === 1 ? 'mese' : 'mesi'}`
}

// Normalizza un cucciolo (puppy) per renderlo compatibile con le funzioni PDF
function normalizeSubject(subjectRaw) {
  return {
    ...subjectRaw,
    birth_date: subjectRaw.birth_date || subjectRaw.litter?.birth_date || null,
    coat_color: subjectRaw.coat_color || subjectRaw.color || null,
    breed: subjectRaw.breed || subjectRaw.litter?.mating?.female?.breed || '',
    pedigree_number: subjectRaw.pedigree_number || '',
  }
}

// ── Blocchi di disegno PDF ────────────────────────────────────────────────────

function hdr(doc, settings, docTitle, docNum) {
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, W, 28, 'F')

  doc.setTextColor(...C.yellow)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(settings?.kennel_name || 'Allevamento', ML, 11)

  if (settings?.kennel_affix) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(180, 185, 195)
    doc.text(`Affisso: ${settings.kennel_affix}`, ML, 17)
  }

  doc.setTextColor(180, 185, 195)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const lines = [settings?.owner_name, settings?.address, settings?.phone].filter(Boolean)
  lines.forEach((l, i) => doc.text(l, W - MR, 10 + i * 5, { align: 'right' }))

  doc.setFillColor(...C.yellow)
  doc.rect(0, 28, W, 1.5, 'F')

  doc.setTextColor(...C.dark)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(docTitle.toUpperCase(), W / 2, 40, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.gray)
  const meta = `N° ${docNum}   ·   Data emissione: ${format(new Date(), 'dd/MM/yyyy', { locale: it })}`
  doc.text(meta, W / 2, 46, { align: 'center' })

  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(ML, 49, W - MR, 49)

  return 53
}

function ftr(doc, settings, pageNum, total) {
  doc.setFillColor(...C.light)
  doc.rect(0, H - 12, W, 12, 'F')
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(0, H - 12, W, H - 12)

  doc.setTextColor(...C.gray)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(settings?.kennel_name || '', ML, H - 5)
  doc.text(`Pag. ${pageNum} / ${total}`, W - MR, H - 5, { align: 'right' })
  if (settings?.vat_number) doc.text(`P.IVA: ${settings.vat_number}`, W / 2, H - 5, { align: 'center' })
}

function secTitle(doc, y, title) {
  doc.setFillColor(...C.light)
  doc.rect(ML, y, CW, 7, 'F')
  doc.setFillColor(...C.yellow)
  doc.rect(ML, y, 2.5, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.dark)
  doc.text(title.toUpperCase(), ML + 6, y + 5)
  return y + 11
}

function infoTable(doc, y, rows, col1 = 52) {
  const col2 = CW - col1
  const rowH = 7.5
  rows.forEach(([label, value], i) => {
    const bg = i % 2 === 0 ? C.white : C.light
    doc.setFillColor(...bg)
    doc.rect(ML, y, CW, rowH, 'F')
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.2)
    doc.rect(ML, y, CW, rowH, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...C.gray)
    doc.text(label, ML + 3, y + 5.2)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.dark)
    const wrapped = doc.splitTextToSize(String(value || '—'), col2 - 6)
    doc.text(wrapped[0], ML + col1, y + 5.2)
    y += rowH
  })
  return y + 2
}

function signBox(doc, y, labels, width) {
  const boxW = width || CW
  const boxH = 22
  const colW = boxW / labels.length

  labels.forEach((label, i) => {
    const x = ML + i * colW
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.3)
    doc.rect(x, y, colW - 2, boxH, 'S')
    doc.setFillColor(...C.light)
    doc.rect(x, y, colW - 2, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.dark)
    doc.text(label, x + (colW - 2) / 2, y + 4, { align: 'center' })
    doc.setDrawColor(...C.gray)
    doc.setLineWidth(0.2)
    doc.line(x + 6, y + 18, x + colW - 8, y + 18)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...C.gray)
    doc.text('Firma', x + (colW - 2) / 2, y + 21, { align: 'center' })
  })
  return y + boxH + 4
}

function clausola(doc, y, text, maxW) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.gray)
  const lines = doc.splitTextToSize(text, maxW || CW)
  doc.text(lines, ML, y)
  return y + lines.length * 4 + 2
}

// ── DOCUMENTO 1: Precontratto con Caparra ─────────────────────────────────────
function makePrecontratto(doc, subject, settings, form) {
  const s = normalizeSubject(subject)
  let y = hdr(doc, settings, 'Precontratto di Vendita con Caparra', `PC-${Date.now().toString().slice(-6)}`)
  let pageNum = 1

  const newPage = () => {
    ftr(doc, settings, pageNum, '?')
    doc.addPage()
    pageNum++
    y = 25
  }

  y = secTitle(doc, y, 'Art. 1 — Parti del Contratto')
  y = infoTable(doc, y, [
    ['VENDITORE',       `${v(settings?.owner_name)} — ${v(settings?.kennel_name)}`],
    ['Indirizzo',       v(settings?.address)],
    ['Telefono/Email',  v(settings?.phone)],
    ['P.IVA / C.F.',    v(settings?.vat_number)],
  ])
  y += 3
  y = infoTable(doc, y, [
    ['ACQUIRENTE',      v(form.acquirente_nome)],
    ['Indirizzo',       v(form.acquirente_indirizzo)],
    ['Codice Fiscale',  v(form.acquirente_cf)],
    ['Telefono',        v(form.acquirente_telefono)],
  ])

  y += 3
  y = secTitle(doc, y, 'Art. 2 — Oggetto')
  y = infoTable(doc, y, [
    ['Nome cucciolo',   v(s.name)],
    ['Razza',           v(s.breed)],
    ['Sesso',           gender(s.gender)],
    ['Data di Nascita', d(s.birth_date)],
    ['Colore mantello', v(s.coat_color)],
    ['Microchip',       v(s.microchip)],
    ['N° Pedigree',     v(s.pedigree_number)],
  ])

  y += 3
  y = secTitle(doc, y, 'Art. 3 — Caparra e Prezzo di Vendita')
  y = infoTable(doc, y, [
    ['Prezzo totale concordato',  form.prezzo_totale  ? `€ ${parseFloat(form.prezzo_totale).toFixed(2)}`  : '—'],
    ['Caparra confirmatoria',     form.caparra        ? `€ ${parseFloat(form.caparra).toFixed(2)}`        : '—'],
    ['Saldo alla consegna',       (form.prezzo_totale && form.caparra)
      ? `€ ${(parseFloat(form.prezzo_totale) - parseFloat(form.caparra)).toFixed(2)}`
      : '—'],
    ['Data di consegna prevista', form.data_consegna  ? d(form.data_consegna) : '—'],
    ['Modalità pagamento saldo',  v(form.modalita_saldo) || 'Da concordare tra le parti'],
  ])

  if (y > H - 80) newPage()
  y += 3

  y = secTitle(doc, y, 'Art. 4 — Condizioni della Caparra')
  const condizioni = [
    `La caparra confirmatoria di € ${form.caparra ? parseFloat(form.caparra).toFixed(2) : '___'} viene versata dall'acquirente a titolo di conferma dell'impegno.`,
    'In caso di recesso da parte dell\'acquirente, la caparra sarà trattenuta dal venditore a titolo di risarcimento.',
    'In caso di recesso da parte del venditore, lo stesso è tenuto a restituire il doppio della caparra ricevuta.',
    'Il presente precontratto si perfezionerà in contratto definitivo al momento della consegna del cucciolo e del saldo del prezzo concordato.',
  ]
  condizioni.forEach(c => {
    if (y > H - 50) newPage()
    doc.setFillColor(255, 251, 235)
    doc.rect(ML, y, CW, 6.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.dark)
    doc.text(`• ${c}`, ML + 3, y + 4.5, { maxWidth: CW - 6 })
    y += 8
  })

  // Clausole personalizzate dall'allevatore
  if (settings?.doc_precontratto_clausole) {
    if (y > H - 50) newPage()
    y += 3
    y = secTitle(doc, y, 'Condizioni Aggiuntive dell\'Allevamento')
    settings.doc_precontratto_clausole.split('\n').filter(Boolean).forEach(line => {
      if (y > H - 20) newPage()
      y = clausola(doc, y, line.startsWith('•') ? line : `• ${line}`)
    })
  }

  if (form.note) {
    if (y > H - 30) newPage()
    y += 3
    y = secTitle(doc, y, 'Note')
    y = clausola(doc, y, form.note)
  }

  // Foro competente
  const foro = settings?.doc_foro_competente
  if (y > H - 55) newPage()
  y += 6

  y = secTitle(doc, y, 'Sottoscrizione')
  y = clausola(doc, y,
    'Le parti, avendo letto e compreso il presente precontratto, lo sottoscrivono per accettazione di tutti i termini e le condizioni in esso contenuti.' +
    (foro ? ` Per qualsiasi controversia è competente il Foro di ${foro}.` : '')
  )
  y += 4
  y = signBox(doc, y, ['FIRMA VENDITORE', 'FIRMA ACQUIRENTE'])

  ftr(doc, settings, pageNum, pageNum)
  for (let p = 1; p < pageNum; p++) {
    doc.setPage(p)
    ftr(doc, settings, p, pageNum)
  }

  return doc
}

// ── DOCUMENTO 2: Contratto di Vendita Cucciolo ────────────────────────────────
function makeContratto(doc, subject, settings, form, healthRecords) {
  const s = normalizeSubject(subject)
  let y = hdr(doc, settings, 'Contratto di Vendita Cucciolo', `CV-${Date.now().toString().slice(-6)}`)
  let pageNum = 1

  const newPage = () => {
    ftr(doc, settings, pageNum, '?')
    doc.addPage()
    pageNum++
    y = 25
  }

  y = secTitle(doc, y, 'Art. 1 — Parti del Contratto')
  y = infoTable(doc, y, [
    ['VENDITORE',        `${v(settings?.owner_name)} — ${v(settings?.kennel_name)}`],
    ['Indirizzo',        v(settings?.address)],
    ['Telefono/Email',   v(settings?.phone)],
    ['P.IVA / C.F.',     v(settings?.vat_number)],
  ])
  y += 3
  y = infoTable(doc, y, [
    ['ACQUIRENTE',       v(form.acquirente_nome)],
    ['Indirizzo',        v(form.acquirente_indirizzo)],
    ['Codice Fiscale',   v(form.acquirente_cf)],
    ['Telefono',         v(form.acquirente_telefono)],
  ])

  y += 3
  y = secTitle(doc, y, 'Art. 2 — Oggetto del Contratto')
  y = infoTable(doc, y, [
    ['Nome del cucciolo', v(s.name)],
    ['Razza',             v(s.breed)],
    ['Sesso',             gender(s.gender)],
    ['Data di Nascita',   d(s.birth_date)],
    ['Età alla vendita',  s.birth_date ? age(s.birth_date) : '—'],
    ['Microchip',         v(s.microchip)],
    ['N° Pedigree ENCI',  v(s.pedigree_number)],
    ['Colore Mantello',   v(s.coat_color)],
  ])

  y += 3
  y = secTitle(doc, y, 'Art. 3 — Prezzo e Pagamento')
  y = infoTable(doc, y, [
    ['Prezzo Concordato',    form.prezzo ? `€ ${parseFloat(form.prezzo).toFixed(2)}` : '—'],
    ['Caparra già versata',  form.caparra_versata ? `€ ${parseFloat(form.caparra_versata).toFixed(2)}` : '—'],
    ['Saldo corrisposto',    (form.prezzo && form.caparra_versata)
      ? `€ ${(parseFloat(form.prezzo) - parseFloat(form.caparra_versata)).toFixed(2)}`
      : '—'],
    ['Modalità',             v(form.modalita_pagamento) || 'Da concordare tra le parti'],
    ['Data Vendita',         form.data_vendita ? d(form.data_vendita) : format(new Date(), 'dd/MM/yyyy', { locale: it })],
  ])

  if (y > H - 80) newPage()
  y += 3

  y = secTitle(doc, y, 'Art. 4 — Stato di Salute alla Consegna')
  const vaccines = (healthRecords || []).filter(r => r.record_type === 'vaccinazione')
  if (vaccines.length > 0) {
    vaccines.slice(0, 4).forEach(v_ => {
      const rowH = 7
      doc.setFillColor(...C.light)
      doc.rect(ML, y, CW, rowH, 'F')
      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.2)
      doc.rect(ML, y, CW, rowH, 'S')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.dark)
      doc.text(`✓  ${v_.description}`, ML + 4, y + 5)
      doc.setTextColor(...C.gray)
      doc.text(d(v_.record_date), W - MR - 2, y + 5, { align: 'right' })
      y += rowH
    })
    y += 2
  } else {
    y = clausola(doc, y, 'Nessuna vaccinazione registrata nel sistema alla data del contratto.')
  }

  if (y > H - 80) newPage()
  y += 3

  y = secTitle(doc, y, 'Art. 5 — Garanzie e Dichiarazioni')
  const garanzie = [
    'Il venditore garantisce che il soggetto è in buono stato di salute alla data della consegna.',
    'Il venditore dichiara che il cucciolo è stato regolarmente svezzato e socializzato.',
    'Il pedigree ENCI sarà consegnato contestualmente o nei termini di legge.',
    `L'acquirente si impegna a garantire adeguate cure veterinarie, alimentazione e benessere all'animale.`,
    `In caso di patologie genetiche gravi entro 12 mesi, il venditore valuterà con l'acquirente una soluzione equa.`,
    // Garanzie personalizzate dall'allevatore
    ...(settings?.doc_contratto_garanzie
      ? settings.doc_contratto_garanzie.split('\n').filter(Boolean).map(l => l.replace(/^[•\-]\s*/, ''))
      : []),
  ]
  garanzie.forEach(g => {
    if (y > H - 50) newPage()
    doc.setFillColor(240, 253, 244)
    doc.rect(ML, y, CW, 6.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.dark)
    doc.text(`• ${g}`, ML + 3, y + 4.5, { maxWidth: CW - 6 })
    y += 7
  })

  // Clausole aggiuntive personalizzate
  if (settings?.doc_contratto_clausole) {
    if (y > H - 50) newPage()
    y += 3
    y = secTitle(doc, y, 'Art. 6 — Condizioni Aggiuntive dell\'Allevamento')
    settings.doc_contratto_clausole.split('\n').filter(Boolean).forEach(line => {
      if (y > H - 20) newPage()
      y = clausola(doc, y, line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`)
    })
  }

  if (form.note) {
    if (y > H - 30) newPage()
    y += 3
    y = secTitle(doc, y, 'Note Aggiuntive')
    y = clausola(doc, y, form.note)
  }

  const foro = settings?.doc_foro_competente
  if (y > H - 55) newPage()
  y += 6

  y = secTitle(doc, y, 'Sottoscrizione')
  y = clausola(doc, y,
    'Le parti dichiarano di aver letto e compreso integralmente il presente contratto e di accettarne ' +
    'tutte le condizioni, firmando per accettazione in ogni sua parte.' +
    (foro ? ` Per qualsiasi controversia è competente il Foro di ${foro}.` : '')
  )
  y += 4
  y = signBox(doc, y, ['FIRMA VENDITORE', 'FIRMA ACQUIRENTE'])

  ftr(doc, settings, pageNum, pageNum)
  for (let p = 1; p < pageNum; p++) {
    doc.setPage(p)
    ftr(doc, settings, p, pageNum)
  }

  return doc
}

// ── Configurazione tipi documento ─────────────────────────────────────────────
const ALL_DOC_TYPES = [
  {
    id: 'precontratto',
    label: 'Precontratto con Caparra',
    icon: ClipboardList,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    desc: 'L\'acquirente versa una caparra per prenotare il cucciolo. Il contratto definitivo verrà firmato alla consegna.',
    fields: [
      { key: 'acquirente_nome',      label: 'Nome Acquirente *',         type: 'text',   placeholder: 'Mario Rossi' },
      { key: 'acquirente_cf',        label: 'Codice Fiscale',            type: 'text',   placeholder: 'RSSMRA...' },
      { key: 'acquirente_indirizzo', label: 'Indirizzo Acquirente',      type: 'text',   placeholder: 'Via Roma 1, Milano' },
      { key: 'acquirente_telefono',  label: 'Telefono',                  type: 'tel',    placeholder: '+39 333...' },
      { key: 'prezzo_totale',        label: 'Prezzo totale concordato *', type: 'number', placeholder: '800' },
      { key: 'caparra',              label: 'Caparra versata (€) *',     type: 'number', placeholder: '200' },
      { key: 'data_consegna',        label: 'Data consegna prevista',    type: 'date',   placeholder: '' },
      { key: 'modalita_saldo',       label: 'Modalità pagamento saldo',  type: 'text',   placeholder: 'Contanti / Bonifico' },
      { key: 'note',                 label: 'Note',                      type: 'textarea', placeholder: '' },
    ],
  },
  {
    id: 'contratto',
    label: 'Contratto di Vendita',
    icon: Receipt,
    color: 'bg-green-50 border-green-200 text-green-700',
    desc: 'Contratto finale di vendita con garanzie. Da firmare al momento della consegna del cucciolo e del pagamento del saldo.',
    fields: [
      { key: 'acquirente_nome',      label: 'Nome Acquirente *',      type: 'text',   placeholder: 'Mario Rossi' },
      { key: 'acquirente_cf',        label: 'Codice Fiscale',         type: 'text',   placeholder: 'RSSMRA...' },
      { key: 'acquirente_indirizzo', label: 'Indirizzo',              type: 'text',   placeholder: 'Via Roma 1, Milano' },
      { key: 'acquirente_telefono',  label: 'Telefono',               type: 'tel',    placeholder: '+39 333...' },
      { key: 'prezzo',               label: 'Prezzo di Vendita (€) *', type: 'number', placeholder: '800' },
      { key: 'caparra_versata',      label: 'Caparra già versata (€)', type: 'number', placeholder: '200' },
      { key: 'modalita_pagamento',   label: 'Modalità Pagamento',     type: 'text',   placeholder: 'Contanti / Bonifico' },
      { key: 'data_vendita',         label: 'Data Vendita',           type: 'date',   placeholder: '' },
      { key: 'note',                 label: 'Note aggiuntive',        type: 'textarea', placeholder: '' },
    ],
  },
]

// ── MODAL ─────────────────────────────────────────────────────────────────────
// filterTypes: array di ID da mostrare (es. ['contratto'] oppure ['precontratto','contratto'])
// initialDocType: apre direttamente sul form di quel tipo
export default function DocumentiModal({ dog, onClose, filterTypes, initialDocType }) {
  const docTypes = filterTypes
    ? ALL_DOC_TYPES.filter(t => filterTypes.includes(t.id))
    : ALL_DOC_TYPES

  const startStep = initialDocType ? 'form' : 'type'

  const [step, setStep] = useState(startStep)
  const [docType, setDocType] = useState(initialDocType || null)

  // Pre-popola con i dati già presenti nel cucciolo (buyer_name, sale_price, sale_date)
  function buildInitialForm(typeId) {
    const f = {}
    if (typeId === 'precontratto' || typeId === 'contratto') {
      if (dog.buyer_name) f.acquirente_nome = dog.buyer_name
      const [email, phone] = (dog.buyer_contact || '').split('|')
      if (phone?.trim()) f.acquirente_telefono = phone.trim()
      if (email?.trim()) f.acquirente_email = email.trim()
      if (dog.sale_price) {
        if (typeId === 'precontratto') f.prezzo_totale = String(dog.sale_price)
        else f.prezzo = String(dog.sale_price)
      }
      if (dog.sale_date) {
        if (typeId === 'precontratto') f.data_consegna = dog.sale_date
        else f.data_vendita = dog.sale_date
      }
    }
    return f
  }

  const [form, setForm] = useState(() => initialDocType ? buildInitialForm(initialDocType) : {})
  const [generating, setGenerating] = useState(false)

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: db.getSettings })
  const { data: healthRecords = [] } = useQuery({
    queryKey: ['healthRecords', dog.id],
    queryFn: () => db.getHealthRecords(dog.id),
    enabled: !!dog.id,
  })

  const selectedType = ALL_DOC_TYPES.find(t => t.id === docType)

  function selectType(id) {
    setDocType(id)
    setForm(buildInitialForm(id))
    setStep('form')
  }

  function handleGenerate() {
    setGenerating(true)
    try {
      const jDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      let pdf
      if (docType === 'precontratto') pdf = makePrecontratto(jDoc, dog, settings, form)
      else if (docType === 'contratto') pdf = makeContratto(jDoc, dog, settings, form, healthRecords)
      const filename = `${(dog.name || 'cucciolo').toLowerCase().replace(/\s+/g, '_')}_${docType}_${format(new Date(), 'yyyyMMdd')}.pdf`
      pdf.save(filename)
    } finally {
      setGenerating(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-black text-gray-900">Modulistica</h3>
            <p className="text-xs text-gray-500">{dog.name || 'Cucciolo'} · {dog.breed || dog.litter?.mating?.female?.breed || '—'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* STEP 1 — Scelta tipo */}
          {step === 'type' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-500 mb-4">Seleziona il documento da generare</p>
              {docTypes.map(type => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => selectType(type.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition hover:shadow-sm ${type.color}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{type.label}</p>
                      <p className="text-xs opacity-70">{type.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 flex-shrink-0" />
                  </button>
                )
              })}

              {(!settings?.owner_name || !settings?.kennel_name) && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>Dati allevamento incompleti.</strong> Vai in <strong>Impostazioni → Allevamento</strong> per
                    aggiungere nome, affisso e indirizzo.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Compilazione campi */}
          {step === 'form' && selectedType && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Dati pre-compilati dal gestionale</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-400">Soggetto:</span> <span className="font-bold">{dog.name || '—'}</span></div>
                  <div><span className="text-gray-400">Razza:</span> <span className="font-bold">{dog.breed || dog.litter?.mating?.female?.breed || '—'}</span></div>
                  <div><span className="text-gray-400">Microchip:</span> <span className="font-mono text-xs">{dog.microchip || '—'}</span></div>
                  <div><span className="text-gray-400">Allevamento:</span> <span className="font-bold">{settings?.kennel_name || '—'}</span></div>
                </div>
              </div>

              <p className="text-sm font-semibold text-gray-600">Completa i dati mancanti</p>
              {selectedType.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={form[field.key] || ''}
                      placeholder={field.placeholder}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm resize-none"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={form[field.key] || ''}
                      placeholder={field.placeholder}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3">
          {step === 'type' ? (
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
              Chiudi
            </button>
          ) : (
            <>
              {docTypes.length > 1 ? (
                <button onClick={() => setStep('type')} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
                  ← Indietro
                </button>
              ) : (
                <button onClick={onClose} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
                  Chiudi
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 text-sm disabled:opacity-50 transition"
              >
                {generating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generazione…</>
                  : <><FileDown className="w-4 h-4" /> Genera PDF</>
                }
              </button>
            </>
          )}
        </div>

      </div>
    </div>,
    document.body
  )
}
