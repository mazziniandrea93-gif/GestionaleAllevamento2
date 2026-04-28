import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  X, FileText, Loader2, FileDown, Receipt,
  Stethoscope, ChevronRight, AlertCircle,
} from 'lucide-react'

// ── Costanti layout A4 (mm) ───────────────────────────────────────────────────
const W = 210, H = 297, ML = 18, MR = 18, MT = 15
const CW = W - ML - MR   // 174mm larghezza contenuto

// ── Colori ────────────────────────────────────────────────────────────────────
const C = {
  dark:   [31,  41,  55],    // #1F2937
  yellow: [245, 158, 11],    // #F59E0B
  gray:   [107, 114, 128],   // #6B7280
  light:  [249, 250, 251],   // #F9FAFB
  border: [229, 231, 235],   // #E5E7EB
  white:  [255, 255, 255],
  green:  [16,  185, 129],
  red:    [239,  68,  68],
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

// ── Blocchi di disegno PDF ────────────────────────────────────────────────────

function hdr(doc, settings, docTitle, docNum) {
  // Banda scura in alto
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, W, 28, 'F')

  // Nome allevamento
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

  // Info destra
  doc.setTextColor(180, 185, 195)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const lines = [
    settings?.owner_name,
    settings?.address,
    settings?.phone,
  ].filter(Boolean)
  lines.forEach((l, i) => doc.text(l, W - MR, 10 + i * 5, { align: 'right' }))

  // Striscia gialla sottile
  doc.setFillColor(...C.yellow)
  doc.rect(0, 28, W, 1.5, 'F')

  // Titolo documento
  doc.setTextColor(...C.dark)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(docTitle.toUpperCase(), W / 2, 40, { align: 'center' })

  // Numero e data
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.gray)
  const meta = `N° ${docNum}   ·   Data emissione: ${format(new Date(), 'dd/MM/yyyy', { locale: it })}`
  doc.text(meta, W / 2, 46, { align: 'center' })

  // Linea separatore
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(ML, 49, W - MR, 49)

  return 53  // y di partenza
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
    // Linea firma
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

// ── DOCUMENTO 1: Certificato di Cessione ──────────────────────────────────────
function makeCessione(doc, dog, settings, form) {
  let y = hdr(doc, settings, 'Certificato di Cessione', `CC-${Date.now().toString().slice(-6)}`)

  // Sezione cedente
  y = secTitle(doc, y, '1. Soggetto Cedente')
  y = infoTable(doc, y, [
    ['Cognome e Nome',  v(settings?.owner_name)],
    ['Allevamento',     v(settings?.kennel_name)],
    ['Affisso',         v(settings?.kennel_affix)],
    ['Indirizzo',       v(settings?.address)],
    ['Telefono',        v(settings?.phone)],
    ['P.IVA / C.F.',    v(settings?.vat_number)],
  ])

  y += 2
  // Sezione cessionario (acquirente)
  y = secTitle(doc, y, '2. Soggetto Cessionario')
  y = infoTable(doc, y, [
    ['Cognome e Nome',  v(form.acquirente_nome)],
    ['Indirizzo',       v(form.acquirente_indirizzo)],
    ['Codice Fiscale',  v(form.acquirente_cf)],
    ['Telefono',        v(form.acquirente_telefono)],
  ])

  y += 2
  // Sezione animale
  y = secTitle(doc, y, '3. Descrizione del Soggetto')
  y = infoTable(doc, y, [
    ['Nome',            v(dog.name)],
    ['Razza',           v(dog.breed)],
    ['Sesso',           gender(dog.gender)],
    ['Data di Nascita', d(dog.birth_date)],
    ['Microchip',       v(dog.microchip)],
    ['N° Pedigree',     v(dog.pedigree_number)],
    ['Colore Mantello', v(dog.coat_color)],
  ])

  y += 2
  // Sezione cessione
  y = secTitle(doc, y, '4. Condizioni della Cessione')
  y = infoTable(doc, y, [
    ['Data Cessione',   form.data_cessione ? d(form.data_cessione) : format(new Date(), 'dd/MM/yyyy', { locale: it })],
    ['Corrispettivo',   form.prezzo ? `€ ${parseFloat(form.prezzo).toFixed(2)}` : '(non commerciale)'],
    ['Note',            v(form.note)],
  ])

  y += 4
  // Dichiarazione
  y = clausola(doc, y,
    `Il sottoscritto ${v(settings?.owner_name)}, in qualità di titolare dell'allevamento ${v(settings?.kennel_name)}, ` +
    `dichiara di cedere il soggetto sopra descritto al Sig./Sig.ra ${v(form.acquirente_nome)}, ` +
    `con decorrenza dalla data indicata. Il cedente dichiara che l'animale è in buone condizioni di salute ` +
    `alla data della cessione e che le informazioni fornite sono veritiere.`
  )

  y += 6
  // Spazio firme
  y = signBox(doc, y, ['FIRMA CEDENTE', 'FIRMA CESSIONARIO', 'DATA E LUOGO'])

  // Footer
  ftr(doc, settings, 1, 1)
  return doc
}

// ── DOCUMENTO 2: Contratto di Vendita Cucciolo ────────────────────────────────
function makeContratto(doc, dog, settings, form, healthRecords) {
  let y = hdr(doc, settings, 'Contratto di Vendita Cucciolo', `CV-${Date.now().toString().slice(-6)}`)
  let pageNum = 1

  const newPage = () => {
    ftr(doc, settings, pageNum, '?')
    doc.addPage()
    pageNum++
    y = 25
  }

  // Art. 1 - Parti
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
  // Art. 2 - Oggetto
  y = secTitle(doc, y, 'Art. 2 — Oggetto del Contratto')
  y = infoTable(doc, y, [
    ['Nome del cucciolo', v(dog.name)],
    ['Razza',             v(dog.breed)],
    ['Sesso',             gender(dog.gender)],
    ['Data di Nascita',   d(dog.birth_date)],
    ['Età alla vendita',  dog.birth_date ? age(dog.birth_date) : '—'],
    ['Microchip',         v(dog.microchip)],
    ['N° Pedigree ENCI',  v(dog.pedigree_number)],
    ['Colore Mantello',   v(dog.coat_color || dog.color)],
  ])

  y += 3
  // Art. 3 - Prezzo
  y = secTitle(doc, y, 'Art. 3 — Prezzo e Pagamento')
  y = infoTable(doc, y, [
    ['Prezzo Concordato', form.prezzo ? `€ ${parseFloat(form.prezzo).toFixed(2)}` : '—'],
    ['Modalità',          v(form.modalita_pagamento) || 'Da concordare tra le parti'],
    ['Data Vendita',      form.data_vendita ? d(form.data_vendita) : format(new Date(), 'dd/MM/yyyy', { locale: it })],
  ])

  if (y > H - 80) newPage()
  y += 3

  // Art. 4 - Stato di salute
  y = secTitle(doc, y, 'Art. 4 — Stato di Salute alla Consegna')
  const vaccines = healthRecords.filter(r => r.record_type === 'vaccinazione')
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

  // Art. 5 - Garanzie
  y = secTitle(doc, y, 'Art. 5 — Garanzie e Dichiarazioni')
  const garanzie = [
    'Il venditore garantisce che il soggetto è in buono stato di salute alla data della consegna.',
    'Il venditore dichiara che il cucciolo è stato regolarmente svezzato e socializzato.',
    'Il pedigree ENCI sarà consegnato contestualmente o nei termini di legge.',
    `L'acquirente si impegna a garantire adeguate cure veterinarie, alimentazione e benessere all'animale.`,
    `In caso di patologie genetiche gravi entro 12 mesi, il venditore valuterà con l'acquirente una soluzione equa.`,
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

  if (form.note) {
    y += 3
    y = secTitle(doc, y, 'Note Aggiuntive')
    y = clausola(doc, y, form.note)
  }

  if (y > H - 55) newPage()
  y += 6

  // Firme
  y = secTitle(doc, y, 'Sottoscrizione')
  y = clausola(doc, y,
    'Le parti dichiarano di aver letto e compreso integralmente il presente contratto e di accettarne ' +
    'tutte le condizioni, firmando per accettazione in ogni sua parte.'
  )
  y += 4
  y = signBox(doc, y, ['FIRMA VENDITORE', 'FIRMA ACQUIRENTE'])

  // Footer su tutte le pagine
  ftr(doc, settings, pageNum, pageNum)
  for (let p = 1; p < pageNum; p++) {
    doc.setPage(p)
    ftr(doc, settings, p, pageNum)
  }

  return doc
}

// ── DOCUMENTO 3: Scheda Sanitaria ─────────────────────────────────────────────
function makeSanitaria(doc, dog, settings, healthRecords, form) {
  let y = hdr(doc, settings, 'Scheda Sanitaria', `SS-${Date.now().toString().slice(-6)}`)
  let pageNum = 1

  const newPage = () => {
    ftr(doc, settings, pageNum, '?')
    doc.addPage()
    pageNum++
    y = 25
  }

  // Dati animale
  y = secTitle(doc, y, 'Dati del Soggetto')
  y = infoTable(doc, y, [
    ['Nome',             v(dog.name)],
    ['Razza',            v(dog.breed)],
    ['Sesso',            gender(dog.gender)],
    ['Data di Nascita',  d(dog.birth_date)],
    ['Età',              dog.birth_date ? age(dog.birth_date) : '—'],
    ['Microchip',        v(dog.microchip)],
    ['Pedigree',         v(dog.pedigree_number)],
    ['Peso attuale',     dog.weight ? `${dog.weight} kg` : '—'],
    ['Altezza',          dog.height ? `${dog.height} cm` : '—'],
    ['Colore Mantello',  v(dog.coat_color)],
  ])

  y += 3
  // Dati veterinario
  y = secTitle(doc, y, 'Veterinario di Riferimento')
  y = infoTable(doc, y, [
    ['Nominativo',  v(form.vet_nome)],
    ['Studio/Clinica', v(form.vet_clinica)],
    ['Indirizzo',   v(form.vet_indirizzo)],
    ['Telefono',    v(form.vet_telefono)],
  ])

  y += 3

  // Vaccinazioni
  const vaccines = healthRecords.filter(r => r.record_type === 'vaccinazione')
  y = secTitle(doc, y, `Vaccinazioni (${vaccines.length})`)
  if (vaccines.length === 0) {
    y = clausola(doc, y, 'Nessuna vaccinazione registrata.')
  } else {
    // Intestazione tabella
    const cols = [CW * 0.40, CW * 0.22, CW * 0.22, CW * 0.16]
    const headers = ['Descrizione', 'Data', 'Prossima', 'Veterinario']
    doc.setFillColor(...C.dark)
    doc.rect(ML, y, CW, 6, 'F')
    let cx = ML
    headers.forEach((h_, i) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...C.white)
      doc.text(h_, cx + 2, y + 4.2)
      cx += cols[i]
    })
    y += 6
    vaccines.forEach((rec, idx) => {
      if (y > H - 40) { newPage(); ftr(doc, settings, pageNum, '?') }
      doc.setFillColor(...(idx % 2 === 0 ? C.white : C.light))
      doc.rect(ML, y, CW, 7, 'F')
      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.2)
      doc.rect(ML, y, CW, 7, 'S')
      const cells = [
        rec.description || '—',
        d(rec.record_date),
        rec.next_appointment_date ? d(rec.next_appointment_date) : '—',
        rec.veterinarian || '—',
      ]
      cx = ML
      cells.forEach((cell, i) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...C.dark)
        const t = doc.splitTextToSize(String(cell), cols[i] - 4)
        doc.text(t[0], cx + 2, y + 4.8)
        cx += cols[i]
      })
      y += 7
    })
    y += 2
  }

  if (y > H - 60) newPage()
  y += 3

  // Trattamenti e visite
  const altri = healthRecords.filter(r => r.record_type !== 'vaccinazione')
  y = secTitle(doc, y, `Trattamenti e Visite (${altri.length})`)
  if (altri.length === 0) {
    y = clausola(doc, y, 'Nessun trattamento o visita registrati.')
  } else {
    altri.slice(0, 10).forEach((rec, idx) => {
      if (y > H - 40) newPage()
      const typeLabel = { visita: 'VISITA', intervento: 'INTERV.', esame: 'ESAME', terapia: 'TERAPIA', trattamento: 'TRATT.', altro: 'ALTRO' }[rec.record_type] || rec.record_type.toUpperCase()
      const rowH = 8
      doc.setFillColor(...(idx % 2 === 0 ? C.white : C.light))
      doc.rect(ML, y, CW, rowH, 'F')
      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.2)
      doc.rect(ML, y, CW, rowH, 'S')

      doc.setFillColor(220, 230, 250)
      doc.rect(ML + 1, y + 1.5, 14, 5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(30, 60, 130)
      doc.text(typeLabel, ML + 8, y + 5, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.dark)
      const desc = doc.splitTextToSize(rec.description || '—', CW * 0.55)
      doc.text(desc[0], ML + 17, y + 5.5)

      doc.setTextColor(...C.gray)
      doc.setFontSize(7.5)
      doc.text(d(rec.record_date), W - MR - 2, y + 5.5, { align: 'right' })
      y += rowH
    })
    y += 2
  }

  if (form.note) {
    y += 3
    y = secTitle(doc, y, 'Note Veterinario')
    y = clausola(doc, y, form.note)
    y += 4
  }

  if (y > H - 40) newPage()
  y += 4

  // Timbro / firma vet
  y = signBox(doc, y, ['TIMBRO E FIRMA VETERINARIO', 'FIRMA PROPRIETARIO'], CW)

  ftr(doc, settings, pageNum, pageNum)
  for (let p = 1; p < pageNum; p++) {
    doc.setPage(p)
    ftr(doc, settings, p, pageNum)
  }

  return doc
}

// ── Configurazione tipi documento ─────────────────────────────────────────────
const DOC_TYPES = [
  {
    id: 'cessione',
    label: 'Certificato di Cessione',
    icon: FileText,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    desc: 'Trasferimento di proprietà dell\'animale',
    fields: [
      { key: 'acquirente_nome',      label: 'Nome Acquirente *',    type: 'text',   placeholder: 'Mario Rossi' },
      { key: 'acquirente_cf',        label: 'Codice Fiscale',       type: 'text',   placeholder: 'RSSMRA...' },
      { key: 'acquirente_indirizzo', label: 'Indirizzo Acquirente', type: 'text',   placeholder: 'Via Roma 1, Milano' },
      { key: 'acquirente_telefono',  label: 'Telefono',             type: 'tel',    placeholder: '+39 333...' },
      { key: 'data_cessione',        label: 'Data Cessione',        type: 'date',   placeholder: '' },
      { key: 'prezzo',               label: 'Corrispettivo (€)',    type: 'number', placeholder: '0 = cessione gratuita' },
      { key: 'note',                 label: 'Note',                 type: 'textarea', placeholder: '' },
    ],
  },
  {
    id: 'contratto',
    label: 'Contratto di Vendita',
    icon: Receipt,
    color: 'bg-green-50 border-green-200 text-green-700',
    desc: 'Contratto completo con garanzie e clausole',
    fields: [
      { key: 'acquirente_nome',      label: 'Nome Acquirente *',     type: 'text',   placeholder: 'Mario Rossi' },
      { key: 'acquirente_cf',        label: 'Codice Fiscale',        type: 'text',   placeholder: 'RSSMRA...' },
      { key: 'acquirente_indirizzo', label: 'Indirizzo',             type: 'text',   placeholder: 'Via Roma 1, Milano' },
      { key: 'acquirente_telefono',  label: 'Telefono',              type: 'tel',    placeholder: '+39 333...' },
      { key: 'prezzo',               label: 'Prezzo di Vendita (€) *', type: 'number', placeholder: '800' },
      { key: 'modalita_pagamento',   label: 'Modalità Pagamento',    type: 'text',   placeholder: 'Contanti / Bonifico' },
      { key: 'data_vendita',         label: 'Data Vendita',          type: 'date',   placeholder: '' },
      { key: 'note',                 label: 'Note aggiuntive',       type: 'textarea', placeholder: '' },
    ],
  },
  {
    id: 'sanitaria',
    label: 'Scheda Sanitaria',
    icon: Stethoscope,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    desc: 'Registro vaccinazioni e trattamenti',
    fields: [
      { key: 'vet_nome',      label: 'Veterinario',        type: 'text', placeholder: 'Dott. Bianchi' },
      { key: 'vet_clinica',   label: 'Clinica / Studio',   type: 'text', placeholder: 'Clinica Veterinaria...' },
      { key: 'vet_indirizzo', label: 'Indirizzo Studio',   type: 'text', placeholder: 'Via Garibaldi 5, Roma' },
      { key: 'vet_telefono',  label: 'Telefono Studio',    type: 'tel',  placeholder: '+39 02...' },
      { key: 'note',          label: 'Note veterinario',   type: 'textarea', placeholder: '' },
    ],
  },
]

// ── MODAL ─────────────────────────────────────────────────────────────────────
export default function DocumentiModal({ dog, onClose }) {
  const [step, setStep] = useState('type')   // 'type' | 'form'
  const [docType, setDocType] = useState(null)
  const [form, setForm] = useState({})
  const [generating, setGenerating] = useState(false)

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: db.getSettings })
  const { data: healthRecords = [] } = useQuery({
    queryKey: ['healthRecords', dog.id],
    queryFn: () => db.getHealthRecords(dog.id),
    enabled: !!dog.id,
  })

  const selectedType = DOC_TYPES.find(t => t.id === docType)

  function handleGenerate() {
    setGenerating(true)
    try {
      const jDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      let pdf
      if (docType === 'cessione') pdf = makeCessione(jDoc, dog, settings, form)
      else if (docType === 'contratto') pdf = makeContratto(jDoc, dog, settings, form, healthRecords)
      else if (docType === 'sanitaria') pdf = makeSanitaria(jDoc, dog, settings, healthRecords, form)
      const filename = `${dog.name.toLowerCase().replace(/\s+/g, '_')}_${docType}_${format(new Date(), 'yyyyMMdd')}.pdf`
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
            <p className="text-xs text-gray-500">{dog.name} · {dog.breed}</p>
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
              {DOC_TYPES.map(type => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => { setDocType(type.id); setForm({}); setStep('form') }}
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

              {/* Avviso dati allevamento */}
              {(!settings?.owner_name || !settings?.kennel_name) && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>Dati allevamento incompleti.</strong> Vai in <strong>Impostazioni → Allevamento</strong> per
                    aggiungere nome, affisso e indirizzo: verranno pre-compilati automaticamente in tutti i documenti.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Compilazione campi */}
          {step === 'form' && selectedType && (
            <div className="space-y-4">
              {/* Dati cane (readonly preview) */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Dati pre-compilati dal gestionale</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-400">Cane:</span> <span className="font-bold">{dog.name}</span></div>
                  <div><span className="text-gray-400">Razza:</span> <span className="font-bold">{dog.breed}</span></div>
                  <div><span className="text-gray-400">Microchip:</span> <span className="font-mono text-xs">{dog.microchip || '—'}</span></div>
                  <div><span className="text-gray-400">Allevamento:</span> <span className="font-bold">{settings?.kennel_name || '—'}</span></div>
                </div>
              </div>

              {/* Campi da compilare */}
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

        {/* Footer azioni */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3">
          {step === 'type' ? (
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
              Chiudi
            </button>
          ) : (
            <>
              <button onClick={() => setStep('type')} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
                ← Indietro
              </button>
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
