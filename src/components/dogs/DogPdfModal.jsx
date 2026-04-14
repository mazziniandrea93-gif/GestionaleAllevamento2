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

// ─── helpers ────────────────────────────────────────────────────────────────

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

// ─── sezioni ────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'info',    label: 'Informazioni Base',  required: true  },
  { id: 'salute',  label: 'Registro Sanitario', required: false },
  { id: 'misure',  label: 'Misure e Crescita',  required: false },
  { id: 'eventi',  label: 'Storico Eventi',     required: false },
  { id: 'calori',  label: 'Cicli di Calore',    required: false },
]

// ─── COMPONENTE HTML NASCOSTO ────────────────────────────────────────────────

function PdfContent({ dog, sections, healthRecords, measurements, dogEvents, heatCycles }) {
  const dogColor = dog.color || '#6366f1'

  const chartData = measurements.map(m => ({
    date: format(new Date(m.measurement_date + 'T00:00:00'), 'dd/MM/yy'),
    fullDate: format(new Date(m.measurement_date + 'T00:00:00'), 'dd MMM yyyy', { locale: it }),
    weight: m.weight ? parseFloat(m.weight) : null,
    height: m.height ? parseFloat(m.height) : null,
  }))
  const hasWeight = measurements.some(m => m.weight)
  const hasHeight = measurements.some(m => m.height)

  const s = {
    page: { width: '794px', background: '#fff', fontFamily: 'Arial, sans-serif', color: '#111' },
    header: { background: dogColor, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: '20px' },
    avatar: { width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 900, color: '#fff', flexShrink: 0 },
    body: { padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28 },
    sectionTitle: { fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1,
                    color: dogColor, borderBottom: `3px solid ${dogColor}`, paddingBottom: 6, marginBottom: 14 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    infoBox: { background: '#f9fafb', borderRadius: 12, padding: '10px 14px' },
    label: { fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 2 },
    value: { fontSize: 13, fontWeight: 700, color: '#111' },
    card: { background: '#fff', border: '2px solid #e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12 },
    badge: (bg, color) => ({ display: 'inline-block', background: bg, color, borderRadius: 8,
                              padding: '2px 8px', fontSize: 11, fontWeight: 800 }),
    tag: (completed) => ({
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
      color: completed ? '#15803d' : '#c2410c',
    }),
    chartBox: { background: '#fff', border: '2px solid #e5e7eb', borderRadius: 16, padding: 16, marginBottom: 16 },
  }

  const statusLabels = { attivo:'Attivo', venduto:'Venduto', ceduto:'Ceduto', deceduto:'Deceduto' }

  return (
    <div style={s.page}>

      {/* HEADER */}
      <div style={s.header}>
        <div style={s.avatar}>{dog.name.charAt(0).toUpperCase()}</div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{dog.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
            {dog.breed}  ·  {dog.gender === 'maschio' ? '♂ Maschio' : '♀ Femmina'}
            {dog.status && <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '2px 8px' }}>{statusLabels[dog.status] || dog.status}</span>}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Generato il</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>

      <div style={s.body}>

        {/* INFO BASE */}
        {sections.info && (
          <div>
            <div style={s.sectionTitle}>Informazioni Base</div>
            <div style={s.grid2}>
              {[
                ['Data di Nascita', fmtDate(dog.birth_date)],
                ['Età', dog.birth_date ? (() => {
                  const y = new Date().getFullYear() - new Date(dog.birth_date).getFullYear()
                  return `${y} ${y === 1 ? 'anno' : 'anni'}`
                })() : '—'],
                ['Microchip', dog.microchip],
                ['Pedigree', dog.pedigree_number],
                ['Peso', dog.weight ? `${dog.weight} kg` : null],
                ['Altezza', dog.height ? `${dog.height} cm` : null],
                ['Colore Mantello', dog.coat_color],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={s.infoBox}>
                  <div style={s.label}>{label}</div>
                  <div style={s.value}>{value}</div>
                </div>
              ))}
            </div>
            {dog.notes && (
              <div style={{ ...s.infoBox, marginTop: 12 }}>
                <div style={s.label}>Note</div>
                <div style={{ ...s.value, fontWeight: 400, fontSize: 13, whiteSpace: 'pre-wrap' }}>{dog.notes}</div>
              </div>
            )}
          </div>
        )}

        {/* REGISTRO SANITARIO */}
        {sections.salute && healthRecords.length > 0 && (
          <div>
            <div style={s.sectionTitle}>Registro Sanitario</div>
            {healthRecords.map(r => {
              const c = healthTypeColors(r.record_type)
              const isTer = r.record_type === 'terapia' || r.record_type === 'trattamento'
              const therapy = isTer ? parseTherapyNotes(r.notes) : null
              return (
                <div key={r.id} style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={s.badge(c.bg, c.color)}>{typeLabel(r.record_type)}</span>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{r.description}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{fmtDate(r.record_date)}</span>
                  </div>
                  {isTer && therapy?.fasi?.some(f => f.dosaggio) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                      {therapy.fasi.filter(f => f.dosaggio).map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#ffedd5', color: '#c2410c',
                                         display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                         fontSize: 10, fontWeight: 900, flexShrink: 0 }}>{i+1}</span>
                          <span style={{ fontWeight: 700 }}>{f.dosaggio}</span>
                          {f.frequenza && <span style={{ color: '#6b7280' }}>· {f.frequenza}</span>}
                          {f.giorni && <span style={{ color: '#c2410c', fontWeight: 700 }}>· {f.giorni} gg</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                    {r.veterinarian && <span>👨‍⚕️ {r.veterinarian}</span>}
                    {r.cost && <span style={{ color: '#15803d', fontWeight: 700 }}>€{parseFloat(r.cost).toFixed(2)}</span>}
                    {r.next_appointment_date && <span>📅 {isTer ? 'Fine: ' : 'Prossimo: '}{fmtDate(r.next_appointment_date)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MISURE */}
        {sections.misure && measurements.length > 0 && (
          <div>
            <div style={s.sectionTitle}>Misure e Crescita</div>

            {/* Cards misurazioni */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {measurements.map(m => (
                <div key={m.id} style={s.card}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 8 }}>
                    📅 {fmtDate(m.measurement_date)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {m.weight && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ background: '#dbeafe', borderRadius: 10, padding: 6 }}>
                          <span style={{ fontSize: 14 }}>⚖️</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>Peso</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>{m.weight} <span style={{ fontSize: 11 }}>kg</span></div>
                        </div>
                      </div>
                    )}
                    {m.height && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ background: '#f3e8ff', borderRadius: 10, padding: 6 }}>
                          <span style={{ fontSize: 14 }}>📏</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>Altezza</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>{m.height} <span style={{ fontSize: 11 }}>cm</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                  {m.notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>{m.notes}</div>}
                </div>
              ))}
            </div>

            {/* Grafico Peso */}
            {hasWeight && (
              <div style={s.chartBox}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Andamento Peso (kg)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: 11 }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: 11 }} label={{ value: 'kg', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2.5}
                          dot={{ fill: '#3b82f6', r: 4 }} name="Peso (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Grafico Altezza */}
            {hasHeight && (
              <div style={s.chartBox}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Andamento Altezza (cm)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: 11 }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: 11 }} label={{ value: 'cm', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="height" stroke="#a855f7" strokeWidth={2.5}
                          dot={{ fill: '#a855f7', r: 4 }} name="Altezza (cm)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* STORICO EVENTI */}
        {sections.eventi && dogEvents.length > 0 && (
          <div>
            <div style={s.sectionTitle}>Storico Eventi</div>
            {dogEvents.map(e => {
              const c = eventTypeColors(e.event_type)
              return (
                <div key={e.id} style={{ ...s.card, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ background: c.bg, borderRadius: 10, padding: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>
                      {{ veterinario:'🩺', toelettatura:'✂️', esposizione:'🏆', calore_stimato:'❤️', parto_stimato:'🍼', altro:'📌' }[e.event_type] || '📌'}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={s.badge(c.bg, c.color)}>{eventTypeLabel(e.event_type)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: e.completed ? '#15803d' : '#c2410c' }}>
                        {e.completed ? '✓ Completato' : '⏳ In programma'}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{e.title}</div>
                    {e.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{e.description}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, flexShrink: 0 }}>
                    {fmtDate(e.event_date)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CICLI DI CALORE */}
        {sections.calori && heatCycles.length > 0 && (
          <div>
            <div style={s.sectionTitle}>Cicli di Calore</div>
            <div style={s.grid2}>
              {heatCycles.map(h => (
                <div key={h.id} style={{ ...s.infoBox, border: '2px solid #fce7f3' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>❤️</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{fmtDate(h.start_date)}</div>
                      {h.notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{h.notes}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            Scheda generata automaticamente · {dog.name} · {format(new Date(), 'dd/MM/yyyy')}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── MODAL ───────────────────────────────────────────────────────────────────

export default function DogPdfModal({ dog, dogEvents, heatCycles, onClose }) {
  const [selected, setSelected] = useState({ info: true, salute: true, misure: true, eventi: true, calori: true })
  const [generating, setGenerating] = useState(false)
  const [ready, setReady] = useState(false)
  const contentRef = useRef(null)

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

  // aspetta che i grafici recharts si renderizzino
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 800)
    return () => clearTimeout(t)
  }, [])

  const toggle = (id) => {
    if (id === 'info') return
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleGenerate = async () => {
    if (!contentRef.current || !ready) return
    setGenerating(true)
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData   = canvas.toDataURL('image/jpeg', 0.95)
      const pdf       = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' })
      const pdfW      = pdf.internal.pageSize.getWidth()
      const pdfH      = pdf.internal.pageSize.getHeight()
      const imgW      = canvas.width
      const imgH      = canvas.height
      const ratio     = pdfW / imgW
      const totalH    = imgH * ratio
      let   yOffset   = 0

      while (yOffset < totalH) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, -yOffset, pdfW, totalH)
        yOffset += pdfH
      }

      pdf.save(`${dog.name.toLowerCase().replace(/\s+/g, '_')}_scheda.pdf`)
    } finally {
      setGenerating(false)
    }
  }

  return createPortal(
    <>
      {/* Contenuto nascosto off-screen per la cattura */}
      <div
        style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <div ref={contentRef}>
          <PdfContent
            dog={dog}
            sections={selected}
            healthRecords={selected.salute ? healthRecords : []}
            measurements={selected.misure  ? measurements  : []}
            dogEvents={selected.eventi     ? dogEvents     : []}
            heatCycles={selected.calori    ? heatCycles    : []}
          />
        </div>
      </div>

      {/* Modal filtri */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">

          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
                style={{ backgroundColor: dog.color || '#6366f1' }}>
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
                    isOn ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  } ${section.required ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                >
                  {isOn
                    ? <CheckSquare className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    : <Square className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  }
                  <span className={`flex-1 text-sm font-bold ${isOn ? 'text-primary-700' : 'text-gray-600'}`}>
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
              style={{ backgroundColor: dog.color || '#6366f1' }}
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
