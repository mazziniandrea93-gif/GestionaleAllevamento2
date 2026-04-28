import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, FileDown, Loader2, CheckSquare, Square } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ─── colore fisso grigio ─────────────────────────────────────────────────────
const ACCENT     = '#4b5563'
const ACCENT_RGB = [75, 85, 99]
const PAGE_WIDTH = 760

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—'
  try { return format(new Date(str.includes('T') ? str : str + 'T00:00:00'), 'dd MMM yyyy', { locale: it }) }
  catch { return str }
}

function typeLabel(t) {
  return { vaccinazione:'Vaccinazione', visita:'Visita', intervento:'Intervento',
           esame:'Esame', terapia:'Terapia', trattamento:'Terapia', altro:'Altro' }[t] || t
}

function eventTypeLabel(t) {
  return { veterinario:'Veterinario', toelettatura:'Toelettatura', esposizione:'Esposizione',
           calore_stimato:'Calore Stimato', parto_stimato:'Parto Stimato', altro:'Altro' }[t] || t
}

function parseTherapyNotes(notes) {
  if (!notes) return { fasi: [], extra: '' }
  try { const p = JSON.parse(notes); if (p.fasi) return p } catch {}
  return { fasi: [], extra: notes }
}

function healthTypeColors(t) {
  return {
    vaccinazione: { bg: '#dbeafe', color: '#1d4ed8' },
    visita:       { bg: '#dcfce7', color: '#15803d' },
    intervento:   { bg: '#fee2e2', color: '#b91c1c' },
    esame:        { bg: '#f3e8ff', color: '#7e22ce' },
    terapia:      { bg: '#ffedd5', color: '#c2410c' },
    trattamento:  { bg: '#ffedd5', color: '#c2410c' },
    altro:        { bg: '#f3f4f6', color: '#374151' },
  }[t] || { bg: '#f3f4f6', color: '#374151' }
}

function eventTypeColors(t) {
  return {
    veterinario:    { bg: '#dbeafe', color: '#1d4ed8' },
    toelettatura:   { bg: '#f3e8ff', color: '#7e22ce' },
    esposizione:    { bg: '#fef9c3', color: '#854d0e' },
    calore_stimato: { bg: '#fce7f3', color: '#9d174d' },
    parto_stimato:  { bg: '#ffedd5', color: '#c2410c' },
    altro:          { bg: '#f3f4f6', color: '#374151' },
  }[t] || { bg: '#f3f4f6', color: '#374151' }
}

// ─── stili comuni (con line-height: 1 per box centrati) ──────────────────────

const baseFont = { fontFamily: 'Arial, Helvetica, sans-serif' }

const centerBox = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  textAlign: 'center',
}

const s = {
  block:        { ...baseFont, color: '#111', marginBottom: 10, breakInside: 'avoid' },
  sectionTitle: { ...baseFont, fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5,
                  color: ACCENT, borderBottom: `3px solid ${ACCENT}`, paddingBottom: 8, marginBottom: 14, lineHeight: 1.2 },
  grid2:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  infoBox:      { background: '#f9fafb', borderRadius: 12, padding: '10px 14px', lineHeight: 1.3 },
  label:        { fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 3, lineHeight: 1.2 },
  value:        { fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.3 },
  card:         { background: '#fff', border: '2px solid #e5e7eb', borderRadius: 14, padding: 14, lineHeight: 1.3 },
  badge:        (bg, color) => ({
                  ...centerBox,
                  display: 'inline-flex',
                  background: bg, color, borderRadius: 8, padding: '3px 10px',
                  fontSize: 11, fontWeight: 800, height: 20,
                }),
  pillIcon:     (bg) => ({ ...centerBox, width: 32, height: 32, borderRadius: 10, background: bg, flexShrink: 0 }),
  smallPill:    (bg, color) => ({ ...centerBox, width: 20, height: 20, borderRadius: '50%', background: bg, color, fontSize: 10, fontWeight: 900, flexShrink: 0 }),
}

// ─── Componenti blocco ───────────────────────────────────────────────────────

function DogIntroBlock({ dog }) {
  return (
    <div style={{ ...s.block, background: '#f9fafb', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{
        ...centerBox,
        width: 72, height: 72, borderRadius: 16, background: ACCENT,
        fontSize: 34, fontWeight: 900, color: '#fff', flexShrink: 0,
        ...baseFont,
      }}>
        {dog.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1.1, ...baseFont }}>{dog.name}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 1.3 }}>
          {dog.breed} · {dog.gender === 'maschio' ? 'Maschio' : 'Femmina'}
        </div>
      </div>
    </div>
  )
}

function SectionTitleBlock({ title }) {
  return <div style={{ ...s.block, ...s.sectionTitle }}>{title}</div>
}

function InfoGridBlock({ dog }) {
  const items = [
    ['Data di Nascita', fmtDate(dog.birth_date)],
    ['Età', dog.birth_date ? (() => {
      const y = new Date().getFullYear() - new Date(dog.birth_date).getFullYear()
      return `${y} ${y === 1 ? 'anno' : 'anni'}`
    })() : null],
    ['Microchip', dog.microchip],
    ['Pedigree', dog.pedigree_number],
    ['Peso', dog.weight ? `${dog.weight} kg` : null],
    ['Altezza', dog.height ? `${dog.height} cm` : null],
    ['Colore Mantello', dog.coat_color],
  ].filter(([, v]) => v)

  return (
    <div style={{ ...s.block, ...s.grid2 }}>
      {items.map(([label, value]) => (
        <div key={label} style={s.infoBox}>
          <div style={s.label}>{label}</div>
          <div style={s.value}>{value}</div>
        </div>
      ))}
    </div>
  )
}

function NotesBlock({ notes }) {
  return (
    <div style={{ ...s.block, ...s.infoBox }}>
      <div style={s.label}>Note</div>
      <div style={{ ...s.value, fontWeight: 400, fontSize: 13, whiteSpace: 'pre-wrap' }}>{notes}</div>
    </div>
  )
}

function HealthRecordBlock({ record }) {
  const c = healthTypeColors(record.record_type)
  const isTer = record.record_type === 'terapia' || record.record_type === 'trattamento'
  const therapy = isTer ? parseTherapyNotes(record.notes) : null

  return (
    <div style={{ ...s.block, ...s.card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={s.badge(c.bg, c.color)}>{typeLabel(record.record_type)}</span>
          <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{record.description}</span>
        </div>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, flexShrink: 0, lineHeight: 1.2 }}>{fmtDate(record.record_date)}</span>
      </div>

      {isTer && therapy?.fasi?.some(f => f.dosaggio) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {therapy.fasi.filter(f => f.dosaggio).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <span style={s.smallPill('#ffedd5', '#c2410c')}>{i+1}</span>
              <span style={{ fontWeight: 700 }}>{f.dosaggio}</span>
              {f.frequenza && <span style={{ color: '#6b7280' }}>· {f.frequenza}</span>}
              {f.giorni && <span style={{ color: '#c2410c', fontWeight: 700 }}>· {f.giorni} gg</span>}
            </div>
          ))}
        </div>
      )}

      {(record.veterinarian || record.cost || record.next_appointment_date) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 1.3 }}>
          {record.veterinarian && <span><strong style={{ color: '#374151' }}>Vet:</strong> {record.veterinarian}</span>}
          {record.cost && <span style={{ color: '#15803d', fontWeight: 700 }}>€ {parseFloat(record.cost).toFixed(2)}</span>}
          {record.next_appointment_date && (
            <span><strong style={{ color: '#374151' }}>{isTer ? 'Fine: ' : 'Prossimo: '}</strong>{fmtDate(record.next_appointment_date)}</span>
          )}
        </div>
      )}
    </div>
  )
}

function MeasurementBlock({ measurement }) {
  return (
    <div style={{ ...s.block, ...s.card }}>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 10, lineHeight: 1.2 }}>
        {fmtDate(measurement.measurement_date)}
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        {measurement.weight && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={s.pillIcon('#dbeafe')}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#1d4ed8' }}>kg</span>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.2 }}>Peso</div>
              <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>{measurement.weight}</div>
            </div>
          </div>
        )}
        {measurement.height && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={s.pillIcon('#f3e8ff')}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#7e22ce' }}>cm</span>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.2 }}>Altezza</div>
              <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>{measurement.height}</div>
            </div>
          </div>
        )}
      </div>
      {measurement.notes && (
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 10, borderTop: '1px solid #e5e7eb', paddingTop: 8, lineHeight: 1.3 }}>
          {measurement.notes}
        </div>
      )}
    </div>
  )
}

function ChartBlock({ title, dataKey, data, color }) {
  return (
    <div style={{ ...s.block, ...s.card, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: ACCENT }}>{title}</div>
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: 11 }} />
          <YAxis stroke="#6b7280" style={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function EventBlock({ event }) {
  const c = eventTypeColors(event.event_type)
  return (
    <div style={{ ...s.block, ...s.card, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ ...s.pillIcon(c.bg), width: 36, height: 36, borderRadius: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: c.color, textTransform: 'uppercase' }}>
          {eventTypeLabel(event.event_type).slice(0, 3)}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={s.badge(c.bg, c.color)}>{eventTypeLabel(event.event_type)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: event.completed ? '#15803d' : '#c2410c', lineHeight: 1.2 }}>
            {event.completed ? 'Completato' : 'In programma'}
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{event.title}</div>
        {event.description && !event.description.includes('__heat_dog:') && (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 1.3 }}>{event.description}</div>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, flexShrink: 0, lineHeight: 1.2 }}>{fmtDate(event.event_date)}</div>
    </div>
  )
}

function HeatBlock({ cycle }) {
  return (
    <div style={{ ...s.block, ...s.infoBox, border: '2px solid #fce7f3', background: '#fdf2f8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ ...s.pillIcon('#fce7f3'), width: 36, height: 36 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#9d174d' }}>♥</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>{fmtDate(cycle.start_date)}</div>
          {cycle.end_date && <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.3 }}>Fine: {fmtDate(cycle.end_date)}</div>}
          {cycle.duration_days && <div style={{ fontSize: 11, color: '#9d174d', fontWeight: 700, lineHeight: 1.3 }}>{cycle.duration_days} giorni</div>}
          {cycle.notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, lineHeight: 1.3 }}>{cycle.notes}</div>}
        </div>
      </div>
    </div>
  )
}

// ─── header / footer nativi jsPDF ────────────────────────────────────────────

function drawHeader(pdf, dog, pageW, headerH) {
  pdf.setFillColor(...ACCENT_RGB)
  pdf.rect(0, 0, pageW, headerH, 'F')

  const cy = headerH / 2 + 4

  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text(dog.name, 22, cy)
  const nameW = pdf.getTextWidth(dog.name)

  if (dog.breed) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(220, 220, 225)
    pdf.text(`· ${dog.breed}`, 22 + nameW + 6, cy)
  }

  const dateStr = format(new Date(), 'dd/MM/yyyy')
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(220, 220, 225)
  const dateW = pdf.getTextWidth(dateStr)
  pdf.text(dateStr, pageW - 22 - dateW, cy)
}

function drawFooter(pdf, dog, pageW, pageH, pageNum, totalPages) {
  pdf.setTextColor(160, 160, 165)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  const text = `${dog.name} · Generato ${format(new Date(), 'dd/MM/yyyy')}`
  const w = pdf.getTextWidth(text)
  pdf.text(text, (pageW - w) / 2, pageH - 14)

  const pageStr = `${pageNum} / ${totalPages}`
  const pw = pdf.getTextWidth(pageStr)
  pdf.text(pageStr, pageW - 22 - pw, pageH - 14)
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'info',   label: 'Informazioni Base',  required: true  },
  { id: 'salute', label: 'Registro Sanitario', required: false },
  { id: 'misure', label: 'Misure e Crescita',  required: false },
  { id: 'eventi', label: 'Storico Eventi',     required: false },
  { id: 'calori', label: 'Cicli di Calore',    required: false },
]

export default function DogPdfModal({ dog, dogEvents, heatCycles, onClose }) {
  const [selected, setSelected] = useState({ info: true, salute: true, misure: true, eventi: true, calori: true })
  const [generating, setGenerating] = useState(false)
  const [ready, setReady] = useState(false)
  const containerRef = useRef(null)

  const { data: healthRecords = [] } = useQuery({
    queryKey: ['healthRecords', dog.id],
    queryFn: () => db.getHealthRecords(dog.id),
    enabled: !!dog.id,
  })
  const { data: measurements = [] } = useQuery({
    queryKey: ['measurements', dog.id],
    queryFn: () => db.getDogMeasurements(dog.id),
    enabled: !!dog.id,
  })

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900)
    return () => clearTimeout(t)
  }, [healthRecords.length, measurements.length, dogEvents.length, heatCycles.length])

  const toggle = (id) => {
    if (id === 'info') return
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleGenerate = async () => {
    if (!ready || !containerRef.current) return
    setGenerating(true)
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4', hotfixes: ['px_scaling'] })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()

      const HEADER_H   = 34
      const FOOTER_H   = 22
      const MARGIN_X   = 24
      const TOP_GAP    = 14
      const BOTTOM_GAP = 8
      const CONTENT_W  = pdfW - MARGIN_X * 2
      const CONTENT_TOP    = HEADER_H + TOP_GAP
      const CONTENT_BOTTOM = pdfH - FOOTER_H - BOTTOM_GAP
      const BLOCK_GAP = 8

      const sectionsActive = SECTIONS.filter(sec => selected[sec.id])

      // Pre-cattura tutti i blocchi: una scansione, riusabile fra le pagine
      const blocksBySection = {}
      for (const sec of sectionsActive) {
        const nodes = containerRef.current.querySelectorAll(`[data-pdf-section="${sec.id}"] [data-pdf-block]`)
        const captured = []
        for (const node of nodes) {
          const canvas = await html2canvas(node, {
            scale: 2, useCORS: true, allowTaint: true,
            backgroundColor: '#ffffff', logging: false,
          })
          const ratio = CONTENT_W / canvas.width
          captured.push({
            img: canvas.toDataURL('image/jpeg', 0.95),
            w: CONTENT_W,
            h: canvas.height * ratio,
          })
        }
        blocksBySection[sec.id] = captured
      }

      // Disposizione blocchi nelle pagine — mai spezzare un blocco
      let pageNum = 1
      let y = CONTENT_TOP

      const newPage = () => {
        pdf.addPage()
        pageNum++
        y = CONTENT_TOP
      }

      for (let si = 0; si < sectionsActive.length; si++) {
        const sec = sectionsActive[si]
        if (si > 0) newPage()                        // ogni sezione su nuova pagina
        const blocks = blocksBySection[sec.id]

        for (const block of blocks) {
          // se non ci sta e siamo già a metà pagina → nuova pagina
          if (y + block.h > CONTENT_BOTTOM && y > CONTENT_TOP + 1) {
            newPage()
          }
          // se anche su pagina vuota non ci sta → lo aggiungiamo comunque scalandolo a fit
          if (block.h > CONTENT_BOTTOM - CONTENT_TOP) {
            const fitH = CONTENT_BOTTOM - CONTENT_TOP
            pdf.addImage(block.img, 'JPEG', MARGIN_X, y, block.w, fitH)
            y += fitH + BLOCK_GAP
          } else {
            pdf.addImage(block.img, 'JPEG', MARGIN_X, y, block.w, block.h)
            y += block.h + BLOCK_GAP
          }
        }
      }

      // disegna header + footer su ogni pagina alla fine
      const total = pdf.internal.getNumberOfPages()
      for (let p = 1; p <= total; p++) {
        pdf.setPage(p)
        drawHeader(pdf, dog, pdfW, HEADER_H)
        drawFooter(pdf, dog, pdfW, pdfH, p, total)
      }

      pdf.save(`${dog.name.toLowerCase().replace(/\s+/g, '_')}_scheda.pdf`)
    } finally {
      setGenerating(false)
    }
  }

  // dati derivati per le misure
  const chartData = measurements.map(m => ({
    date: format(new Date(m.measurement_date + 'T00:00:00'), 'dd/MM/yy'),
    weight: m.weight ? parseFloat(m.weight) : null,
    height: m.height ? parseFloat(m.height) : null,
  }))
  const hasWeight = measurements.some(m => m.weight)
  const hasHeight = measurements.some(m => m.height)

  return createPortal(
    <>
      {/* Container off-screen con tutti i blocchi marcati */}
      <div
        style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <div ref={containerRef} style={{ width: PAGE_WIDTH + 'px', background: '#fff', padding: 0, ...baseFont }}>

          {/* INFO */}
          <div data-pdf-section="info" style={{ width: PAGE_WIDTH, padding: '0 4px' }}>
            <div data-pdf-block><DogIntroBlock dog={dog} /></div>
            <div data-pdf-block><SectionTitleBlock title="Informazioni Base" /></div>
            <div data-pdf-block><InfoGridBlock dog={dog} /></div>
            {dog.notes && <div data-pdf-block><NotesBlock notes={dog.notes} /></div>}
          </div>

          {/* SALUTE */}
          <div data-pdf-section="salute" style={{ width: PAGE_WIDTH, padding: '0 4px' }}>
            <div data-pdf-block><SectionTitleBlock title="Registro Sanitario" /></div>
            {healthRecords.length === 0
              ? <div data-pdf-block><div style={{ ...s.block, ...s.infoBox, textAlign: 'center', color: '#9ca3af' }}>Nessun record sanitario</div></div>
              : healthRecords.map(r => (
                <div key={r.id} data-pdf-block><HealthRecordBlock record={r} /></div>
              ))
            }
          </div>

          {/* MISURE */}
          <div data-pdf-section="misure" style={{ width: PAGE_WIDTH, padding: '0 4px' }}>
            <div data-pdf-block><SectionTitleBlock title="Misure e Crescita" /></div>
            {measurements.length === 0
              ? <div data-pdf-block><div style={{ ...s.block, ...s.infoBox, textAlign: 'center', color: '#9ca3af' }}>Nessuna misurazione</div></div>
              : <>
                {measurements.map(m => (
                  <div key={m.id} data-pdf-block><MeasurementBlock measurement={m} /></div>
                ))}
                {hasWeight && (
                  <div data-pdf-block>
                    <ChartBlock title="Andamento Peso (kg)" dataKey="weight" data={chartData} color={ACCENT} />
                  </div>
                )}
                {hasHeight && (
                  <div data-pdf-block>
                    <ChartBlock title="Andamento Altezza (cm)" dataKey="height" data={chartData} color="#6b7280" />
                  </div>
                )}
              </>
            }
          </div>

          {/* EVENTI */}
          <div data-pdf-section="eventi" style={{ width: PAGE_WIDTH, padding: '0 4px' }}>
            <div data-pdf-block><SectionTitleBlock title="Storico Eventi" /></div>
            {dogEvents.length === 0
              ? <div data-pdf-block><div style={{ ...s.block, ...s.infoBox, textAlign: 'center', color: '#9ca3af' }}>Nessun evento</div></div>
              : dogEvents.map(e => (
                <div key={e.id} data-pdf-block><EventBlock event={e} /></div>
              ))
            }
          </div>

          {/* CALORI */}
          <div data-pdf-section="calori" style={{ width: PAGE_WIDTH, padding: '0 4px' }}>
            <div data-pdf-block><SectionTitleBlock title="Cicli di Calore" /></div>
            {heatCycles.length === 0
              ? <div data-pdf-block><div style={{ ...s.block, ...s.infoBox, textAlign: 'center', color: '#9ca3af' }}>Nessun ciclo registrato</div></div>
              : heatCycles.map(h => (
                <div key={h.id} data-pdf-block><HeatBlock cycle={h} /></div>
              ))
            }
          </div>

        </div>
      </div>

      {/* Modal filtri */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">

          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
                style={{ backgroundColor: ACCENT }}>
                {dog.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Esporta PDF</h3>
                <p className="text-xs text-gray-500">{dog.name} · {dog.breed}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-2">
            <p className="text-sm font-semibold text-gray-500 mb-3">Scegli le sezioni da includere</p>
            {SECTIONS.map(section => {
              const isOn = selected[section.id]
              const counts = {
                salute: `${healthRecords.length} record`,
                misure: `${measurements.length} misure`,
                eventi: `${dogEvents.length} eventi`,
                calori: `${heatCycles.length} cicli`,
              }
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => toggle(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left ${
                    isOn ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  } ${section.required ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                >
                  {isOn
                    ? <CheckSquare className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    : <Square className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  }
                  <span className={`flex-1 text-sm font-bold ${isOn ? 'text-gray-800' : 'text-gray-500'}`}>
                    {section.label}
                    {section.required && <span className="ml-2 text-xs font-normal text-gray-400">(sempre incluso)</span>}
                  </span>
                  {counts[section.id] && (
                    <span className="text-xs text-gray-400 font-semibold">{counts[section.id]}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || !ready}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold transition disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generazione...</>
                : !ready
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Caricamento...</>
                : <><FileDown className="w-4 h-4" /> Genera PDF</>
              }
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
