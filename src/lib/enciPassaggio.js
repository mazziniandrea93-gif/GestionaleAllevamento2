// ============================================================
// MODULO ENCI F-7242 — Passaggio di Proprietà
// ============================================================
// Riempie il modulo ENCI reale (AcroForm) con i dati del gestionale
// usando pdf-lib. Il PDF sorgente è servito come asset statico in
// public/enci/f-7242.pdf. Il modulo NON viene "appiattito": restano
// modificabili i campi (firme e spazio delegazione si compilano a mano).
//
// pdf-lib è importato dinamicamente: entra nel bundle solo quando si
// genera davvero un passaggio di proprietà.
// ============================================================

const FORM_URL = '/enci/f-7242.pdf'

// Confronto tollerante dei nomi campo: ignora maiuscole, accenti,
// spazi/underscore (alcuni campi del modulo hanno accenti, es. "Città").
function norm(s) {
  return String(s)
    .replace(/[àáâ]/gi, 'a')
    .replace(/[èéê]/gi, 'e')
    .replace(/[ìíî]/gi, 'i')
    .replace(/[òóô]/gi, 'o')
    .replace(/[ùúû]/gi, 'u')
    .toLowerCase()
    .replace(/[\s_]+/g, '')
}

// Chiave dati (nostra) → nome campo nel PDF ENCI
const TEXT_MAP = {
  delegazione:     'DELEGAZIONE',
  nome_cane:       'Nome cane',
  microchip:       'Codice identificativo microchip',
  num_registro:    'num_iscrizione registro',

  cedente_nome:    'Cognome Nome proprietario cedente',
  cedente_via:     'cedente_via',
  cedente_civico:  'cedente_num_civ',
  cedente_cap:     'cedente_cap',
  cedente_citta:   'cedente_Città',
  cedente_cf:      'cedente_Codice Fiscale',
  cedente_tel:     'cedente_Tel',
  cedente_cell:    'cedente_Cell',
  cedente_email:   'cedente_email',
  cedente_pec:     'cedente_PEC',

  nuovo_nome:      'nuovoprop_nome-cognome',
  nuovo_via:       'nuovoprop_Via',
  nuovo_civico:    'nuovoprop_numciv',
  nuovo_cap:       'nuovoprop_CAP',
  nuovo_citta:     'nuovoprop_Città',
  nuovo_cf:        'nuovoprop_Codice Fiscale',
  nuovo_tel:       'nuovoprop_Tel',
  nuovo_cell:      'nuovoprop_Cell',
  nuovo_email:     'nuovoprop_email',
  nuovo_pec:       'nuovoprop_PEC',

  data_cessione:   'datacessionecane',
  pratica_sig:     'Pratica presentata dal sig',
  sodalizio_nome:  'Nome sodalizio',
  sodalizio_anno:  'Anno sodalizio',
  tessera_num:     'Numerotessera',
}

// Chiave dati (nostra) → checkbox/radio nel PDF ENCI
const CHECK_MAP = {
  registro_roi:       'REGISTRO',
  socio_allevatore:   'STATUS',
  cert_allegato:      'ALLEGATO',
  cert_inviato:       'INVIATO A CURA DEL CEDENTE',
  cedente_consenso:   'Consenso dati ENCI',
  cedente_pubblicita: 'Pubblicità ENCI',
  cedente_mkt:        'MKT ENCI',
  nuovo_consenso:     'nuovoprop_consensoENCI',
  nuovo_pubblicita:   'nuovoprop_PUBBLICITA',
  nuovo_mkt:          'nuovoprop_MKT',
}

// Alcuni "flag" del modulo non sono checkbox standard (/On) ma campi a
// valore d'esportazione personalizzato, che pdf-lib espone come radio:
// per attivarli va selezionato il valore "acceso".
const CHECK_ON = {
  'REGISTRO':               'ROI',
  'STATUS':                 'SOCIOALLEVATORE',
  'Consenso dati ENCI':     'enci_consenso_SI',
  'Pubblicità ENCI':        'SI',
  'MKT ENCI':               'MKT_consenso_SI',
  'nuovoprop_consensoENCI': 'Sì',
  'nuovoprop_PUBBLICITA':   'Sì',
  'nuovoprop_MKT':          'Sì',
}

function triggerDownload(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Riempie il modulo ENCI e avvia il download. `data` usa le chiavi di
// TEXT_MAP/CHECK_MAP. Le date vanno già formattate (gg/mm/aaaa).
export async function generatePassaggioProprieta(data, filename) {
  const { PDFDocument } = await import('pdf-lib')

  const res = await fetch(FORM_URL)
  if (!res.ok) throw new Error('Modulo ENCI (f-7242.pdf) non trovato tra gli asset.')
  const srcBytes = await res.arrayBuffer()

  const pdf = await PDFDocument.load(srcBytes)
  const form = pdf.getForm()

  // Indicizza i campi per nome normalizzato (robusto agli accenti)
  const byNorm = {}
  form.getFields().forEach((f) => { byNorm[norm(f.getName())] = f })

  const setText = (pdfName, value) => {
    if (value == null || value === '') return
    const f = byNorm[norm(pdfName)]
    if (!f || typeof f.setText !== 'function') return
    try { f.setText(String(value)) } catch (e) { console.warn('ENCI setText', pdfName, e) }
  }
  const setCheck = (pdfName, on) => {
    if (!on) return
    const f = byNorm[norm(pdfName)]
    if (!f) return
    try {
      // Checkbox standard (/On)
      if (typeof f.check === 'function') { f.check(); return }
      // Campi con valore d'esportazione personalizzato → pdf-lib li tratta
      // come radio: seleziona il valore "acceso".
      if (typeof f.select === 'function') {
        const opts = (typeof f.getOptions === 'function' ? f.getOptions() : []) || []
        const desired = CHECK_ON[pdfName]
        const pick = (desired && opts.includes(desired))
          ? desired
          : opts.find((o) => o && String(o).toLowerCase() !== 'off')
        if (pick) f.select(pick)
      }
    } catch (e) { console.warn('ENCI check', pdfName, e) }
  }

  Object.entries(TEXT_MAP).forEach(([k, pdfName]) => setText(pdfName, data[k]))
  Object.entries(CHECK_MAP).forEach(([k, pdfName]) => setCheck(pdfName, data[k]))

  const outBytes = await pdf.save()
  triggerDownload(outBytes, filename)
}
