import { useState, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { db } from '@/lib/supabase'
import { computeCOI, coiRisk } from '@/lib/coi'
import { Plus, Search, X, Dna, AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import DogForm from '@/components/dogs/DogForm'
import toast from 'react-hot-toast'

// L'anagrafica genitori arriva a 3 generazioni di antenati (vedi
// db.getDogWithAncestors): Soggetto → Genitori → Nonni → Bisnonni.
const MAX_GEN = 3

// ── Helper ────────────────────────────────────────────────────────────────
// Il sesso è salvato in minuscolo ('maschio'/'femmina') ma i genitori
// esterni vengono creati capitalizzati: normalizziamo sempre.
const genderKey = g => {
  const l = g?.toLowerCase() || ''
  if (l.startsWith('m')) return 'm'
  if (l.startsWith('f')) return 'f'
  return null
}
const genderColor = g => (g === 'f' ? '#EC4899' : g === 'm' ? '#3B82F6' : '#94A3B8')
const birthYear = d => (d?.birth_date ? String(d.birth_date).slice(0, 4) : null)
const initials = d => (d?.nickname || d?.name || '?').trim().charAt(0).toUpperCase()

const STATUS_COLORS = {
  attivo:      { bg: '#D1FAE5', text: '#065F46', label: 'Attivo' },
  venduto:     { bg: '#DBEAFE', text: '#1E40AF', label: 'Venduto' },
  ceduto:      { bg: '#EDE9FE', text: '#5B21B6', label: 'Ceduto' },
  deceduto:    { bg: '#F3F4F6', text: '#374151', label: 'Deceduto' },
  disponibile: { bg: '#D1FAE5', text: '#065F46', label: 'Disponibile' },
  prenotato:   { bg: '#FEF3C7', text: '#92400E', label: 'Prenotato' },
  esterno:     { bg: '#FFEDD5', text: '#9A3412', label: 'Esterno' },
}

// CSS dei connettori a parentesi del pedigree. Pseudo-elementi non
// esprimibili inline, quindi iniettati una volta con classi prefissate "ft-".
const TREE_CSS = `
.ft-scroll { overflow-x: auto; overflow-y: hidden; padding: 8px 4px 12px; --ft-line: #CBD5E1; }
.ft-node { display: flex; align-items: center; }
.ft-branches { display: flex; flex-direction: column; justify-content: center; position: relative; margin-left: 34px; }
.ft-branches::before { content: ''; position: absolute; left: -34px; top: 50%; width: 34px; height: 2px; background: var(--ft-line); }
.ft-branches > .ft-node { position: relative; padding-left: 34px; margin: 9px 0; }
.ft-branches > .ft-node::before { content: ''; position: absolute; left: 0; top: 50%; width: 34px; height: 2px; background: var(--ft-line); }
.ft-branches > .ft-node::after { content: ''; position: absolute; left: 0; width: 2px; background: var(--ft-line); }
.ft-branches > .ft-node:first-child::after { top: 50%; bottom: -9px; }
.ft-branches > .ft-node:last-child::after  { top: -9px; bottom: 50%; }
.ft-card { box-sizing: border-box; border-radius: 14px; position: relative; overflow: hidden; user-select: none; background: #fff; transition: box-shadow .15s, transform .15s, border-color .15s; }
.ft-card.clickable { cursor: pointer; }
.ft-card.clickable:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15,23,42,.14); }
.ft-ph { display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; font-size: 12.5px; cursor: pointer; background: transparent; transition: background .15s, border-color .15s, color .15s; }
.ft-ph:hover { filter: brightness(.97); }
`

// ── Card cane / slot vuoto ─────────────────────────────────────────────────
function SlotCard({ dog, isRoot, role, isCommon, onClick }) {
  const W = isRoot ? 212 : 190
  const H = isRoot ? 94 : 72

  // Slot vuoto → invito ad aggiungere il genitore mancante
  if (!dog) {
    const c = role === 'Madre' ? '#EC4899' : '#3B82F6'
    return (
      <button
        type="button"
        onClick={onClick}
        className="ft-card ft-ph"
        style={{ width: W, height: H, border: `2px dashed ${c}`, color: c, background: `${c}0D` }}
      >
        <Plus size={14} /> Aggiungi {role}
      </button>
    )
  }

  const g = genderKey(dog.gender)
  const color = genderColor(g)
  const sc = STATUS_COLORS[dog.status] || null
  const year = birthYear(dog)

  return (
    <div
      onClick={onClick}
      className={`ft-card${onClick ? ' clickable' : ''}`}
      style={{
        width: W,
        height: H,
        border: `2px solid ${isCommon ? '#F59E0B' : isRoot ? color : '#E5E7EB'}`,
        boxShadow: isCommon
          ? '0 0 0 3px rgba(245,158,11,.18)'
          : isRoot
            ? '0 4px 14px rgba(15,23,42,.12)'
            : '0 1px 4px rgba(15,23,42,.06)',
      }}
    >
      {/* Striscia colore sesso */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: color }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: '100%', padding: isRoot ? '10px 12px 10px 15px' : '8px 10px 8px 13px' }}>
        {/* Avatar */}
        <div
          style={{
            width: isRoot ? 46 : 38, height: isRoot ? 46 : 38, borderRadius: 11,
            flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: isRoot ? 18 : 15,
            background: dog.color || color,
          }}
        >
          {dog.photo_url
            ? <img src={dog.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials(dog)}
        </div>

        {/* Testo */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color, fontSize: 11, fontWeight: 800, lineHeight: 1 }}>
              {g === 'f' ? '♀' : g === 'm' ? '♂' : '•'}
            </span>
            <span style={{
              fontWeight: 800, fontSize: isRoot ? 13.5 : 12.5, color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {dog.nickname || dog.name || '—'}
            </span>
          </div>

          {dog.breed && (
            <div style={{ color: '#6B7280', fontSize: 10, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dog.breed}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'nowrap' }}>
            {year && <span style={{ color: '#9CA3AF', fontSize: 9.5, fontWeight: 700 }}>{year}</span>}
            {isRoot
              ? <span style={{ background: '#E0F2FE', color: '#0E5280', borderRadius: 5, padding: '1px 6px', fontSize: 8.5, fontWeight: 800, letterSpacing: .3 }}>SOGGETTO</span>
              : sc && <span style={{ background: sc.bg, color: sc.text, borderRadius: 5, padding: '1px 6px', fontSize: 8.5, fontWeight: 700 }}>{sc.label}</span>}
            {isCommon && !isRoot && (
              <span title="Antenato comune (consanguineità)" style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 5, padding: '1px 5px', fontSize: 8.5, fontWeight: 800 }}>
                ⚠ COMUNE
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Nodo ricorsivo del pedigree ────────────────────────────────────────────
// `dog` è il cane in questo slot; le sue colonne padre/madre vengono renderizzate
// a destra. Gli slot vuoti sono cliccabili solo se esiste il cane figlio
// (parentDog), perché serve il suo id per collegare il genitore.
function PedigreeNode({ dog, parentDog, role, gen, commonIds, onPick, onOpen }) {
  const isRoot = gen === 0
  const isCommon = dog?.id ? commonIds.has(dog.id) : false

  const handleClick = () => {
    if (!dog) {
      if (parentDog?.id) onPick({ role, dogId: parentDog.id })
    } else if (!isRoot) {
      onOpen(dog.id)
    }
  }

  // Le colonne degli antenati si espandono solo se il cane esiste e non
  // abbiamo raggiunto la profondità massima dell'anagrafica.
  const showBranches = !!dog && gen < MAX_GEN

  return (
    <div className="ft-node">
      <SlotCard
        dog={dog}
        isRoot={isRoot}
        role={role}
        isCommon={isCommon}
        onClick={dog && isRoot ? undefined : handleClick}
      />
      {showBranches && (
        <div className="ft-branches">
          <PedigreeNode dog={dog.father} parentDog={dog} role="Padre" gen={gen + 1} commonIds={commonIds} onPick={onPick} onOpen={onOpen} />
          <PedigreeNode dog={dog.mother} parentDog={dog} role="Madre" gen={gen + 1} commonIds={commonIds} onPick={onPick} onOpen={onOpen} />
        </div>
      )}
    </div>
  )
}

// ── Modale selezione/creazione genitore ────────────────────────────────────
function ParentPickerModal({ role, dogId, onClose, onSaved }) {
  const [tab, setTab]       = useState('miei')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [extForm, setExtForm] = useState({ name: '', breed: '', birth_year: '' })

  const { data: allDogs = [] } = useQuery({ queryKey: ['dogs'], queryFn: () => db.getDogs() })

  const isMadre  = role === 'Madre'
  const accent   = isMadre ? '#BE185D' : '#1D4ED8'
  const accentBg = isMadre ? '#FCE7F3' : '#DBEAFE'

  const filtered = allDogs.filter(d =>
    d.id !== dogId &&
    (isMadre ? genderKey(d.gender) === 'f' : genderKey(d.gender) === 'm') &&
    [d.name, d.nickname, d.breed].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleSelect(parentId) {
    if (parentId === dogId) {
      toast.error('Un cane non può essere genitore di se stesso')
      return
    }
    setSaving(true)
    try {
      const field = isMadre ? 'mother_id' : 'father_id'
      await db.updateDog(dogId, { [field]: parentId })
      toast.success(`${role} collegat${isMadre ? 'a' : 'o'}`)
      onSaved()
    } catch (err) {
      console.error('handleSelect error:', err)
      toast.error('Errore nel salvataggio')
      setSaving(false)
    }
  }

  async function handleSaveExternal(e) {
    e.preventDefault()
    if (!extForm.name.trim()) return
    setSaving(true)
    try {
      const created = await db.createDog({
        name:       extForm.name.trim(),
        breed:      extForm.breed.trim() || null,
        birth_date: extForm.birth_year ? `${extForm.birth_year}-01-01` : null,
        gender:     isMadre ? 'femmina' : 'maschio',
        status:     'esterno',
      })
      if (!created?.id) throw new Error('Creazione cane fallita')

      const field = isMadre ? 'mother_id' : 'father_id'
      await db.updateDog(dogId, { [field]: created.id })
      toast.success(`${role} collegat${isMadre ? 'a' : 'o'}`)
      onSaved()
    } catch (err) {
      console.error('handleSaveExternal error:', err)
      toast.error(err?.message || 'Errore nel salvataggio')
      setSaving(false)
    }
  }

  if (showCreate) {
    return (
      <DogForm
        defaultGender={isMadre ? 'femmina' : 'maschio'}
        onClose={() => setShowCreate(false)}
        onSuccess={async newDog => {
          if (newDog?.id) await handleSelect(newDog.id)
          else { onSaved(); setShowCreate(false) }
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">

        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-gray-900">Seleziona {role}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          {[{ id: 'miei', label: 'I miei cani' }, { id: 'esterno', label: 'Genitore esterno' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === t.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'miei' ? (
          <>
            <div className="px-6 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input autoFocus type="text" placeholder="Cerca per nome o razza…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-400 focus:outline-none" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-3 space-y-1">
              {filtered.length === 0
                ? <p className="text-center text-gray-400 text-sm py-8">
                    {search ? 'Nessun risultato' : `Nessun cane ${isMadre ? 'femmina' : 'maschio'} registrato`}
                  </p>
                : filtered.map(d => (
                  <button key={d.id} disabled={saving} onClick={() => handleSelect(d.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 text-left transition border-2 border-transparent hover:border-gray-100">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold overflow-hidden"
                      style={{ backgroundColor: d.color || accentBg, color: d.color ? '#fff' : accent }}>
                      {d.photo_url ? <img src={d.photo_url} alt="" className="w-full h-full object-cover" /> : (isMadre ? '♀' : '♂')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">{d.nickname || d.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {d.breed}
                        {birthYear(d) ? ` · ${birthYear(d)}` : ''}
                        {d.status === 'esterno' && <span className="ml-1 text-orange-400 font-semibold">· Esterno</span>}
                      </p>
                    </div>
                  </button>
                ))
              }
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-bold text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition">
                <Plus className="w-4 h-4" /> Crea cane completo
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSaveExternal} className="flex flex-col flex-1">
            <div className="flex-1 px-6 py-6 space-y-5">
              <p className="text-sm text-gray-500">
                Registra un genitore esterno alla struttura. Verrà salvato con stato{' '}
                <span className="font-semibold text-orange-500">Esterno</span> e apparirà nell'albero.
              </p>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome *</label>
                <input autoFocus required type="text"
                  placeholder={`Nome del ${isMadre ? 'genitore femmina' : 'genitore maschio'}…`}
                  value={extForm.name} onChange={e => setExtForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Razza</label>
                <input type="text" placeholder="Es. Golden Retriever…" value={extForm.breed}
                  onChange={e => setExtForm(f => ({ ...f, breed: e.target.value }))}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Anno di nascita</label>
                <input type="number" placeholder="Es. 2019" min="1990" max={new Date().getFullYear()}
                  value={extForm.birth_year} onChange={e => setExtForm(f => ({ ...f, birth_year: e.target.value }))}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-400 focus:outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition text-sm">
                Annulla
              </button>
              <button type="submit" disabled={saving || !extForm.name.trim()}
                className="flex-1 py-2.5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-700 transition text-sm disabled:opacity-50">
                {saving ? 'Salvo…' : `Salva come ${role}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Banner consanguineità (COI) ────────────────────────────────────────────
const RISK_STYLE = {
  green: { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  amber: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  red:   { text: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200'   },
}

function CoiBanner({ coi, commonAncestors }) {
  const pct = coi * 100
  const risk = coiRisk(coi)
  const s = RISK_STYLE[risk.color]
  return (
    <div className={`rounded-2xl border-2 ${s.border} ${s.bg} p-4 flex flex-col sm:flex-row sm:items-center gap-3`}>
      <div className="flex items-center gap-3 flex-1">
        <div className="w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
          <Dna className={`w-6 h-6 ${s.text}`} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase">Consanguineità del soggetto (COI)</p>
          <p className={`text-2xl font-black ${s.text} leading-tight`}>
            {pct.toFixed(2)}%
            <span className="text-sm font-bold ml-2">
              {risk.color === 'green' ? <CheckCircle2 className="w-4 h-4 inline -mt-0.5" /> : <AlertTriangle className="w-4 h-4 inline -mt-0.5" />}
              {' '}Rischio {risk.label}
            </span>
          </p>
        </div>
      </div>
      <div className="text-xs text-gray-500 sm:text-right sm:max-w-[280px]">
        {commonAncestors.length === 0
          ? 'Nessun antenato comune nelle 3 generazioni: outcross.'
          : <>Antenati comuni evidenziati in <span className="font-bold text-amber-600">arancione</span>: {commonAncestors.map(a => a.node.nickname || a.node.name).join(', ')}.</>}
      </div>
    </div>
  )
}

// ── Componente principale ──────────────────────────────────────────────────
export default function FamilyTree({ dog }) {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const [pickingParent, setPickingParent] = useState(null)
  const treeRef = useRef(null)

  const { data: enrichedDog, isLoading } = useQuery({
    queryKey: ['dog-with-ancestors', dog.id],
    queryFn:  () => db.getDogWithAncestors(dog.id),
  })

  const fullDog = enrichedDog || dog

  // COI del soggetto = parentela tra suo padre e sua madre. Gli antenati
  // comuni vengono evidenziati nelle card dell'albero.
  const { coi, commonAncestors, commonIds, hasBothParents } = useMemo(() => {
    if (!fullDog?.father || !fullDog?.mother) {
      return { coi: 0, commonAncestors: [], commonIds: new Set(), hasBothParents: false }
    }
    const { coi, commonAncestors } = computeCOI(fullDog.father, fullDog.mother)
    return {
      coi,
      commonAncestors,
      commonIds: new Set(commonAncestors.map(a => a.node.id)),
      hasBothParents: true,
    }
  }, [fullDog])

  const handleExport = async () => {
    if (!treeRef.current) return
    const t = toast.loading('Genero immagine…')
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(treeRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        windowWidth: treeRef.current.scrollWidth + 40,
      })
      const link = document.createElement('a')
      link.download = `pedigree-${(fullDog.nickname || fullDog.name || 'cane').replace(/\s+/g, '_')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Immagine scaricata', { id: t })
    } catch (err) {
      console.error('export pedigree error:', err)
      toast.error('Errore durante l\'esportazione', { id: t })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <style>{TREE_CSS}</style>

      {/* Intestazione + legenda + azioni */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-gray-900">Albero genealogico</h3>
          <p className="text-sm text-gray-500">Soggetto a sinistra, antenati fino ai bisnonni a destra.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <span className="w-3 h-3 rounded-full" style={{ background: '#3B82F6' }} /> Maschio
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <span className="w-3 h-3 rounded-full" style={{ background: '#EC4899' }} /> Femmina
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
          >
            <Download className="w-4 h-4" /> Esporta
          </button>
        </div>
      </div>

      {/* Banner consanguineità */}
      {hasBothParents && <CoiBanner coi={coi} commonAncestors={commonAncestors} />}

      {/* Pedigree */}
      <div className="ft-scroll rounded-2xl border-2 border-gray-100 bg-gradient-to-br from-gray-50 to-white">
        <div ref={treeRef} style={{ display: 'inline-block', minWidth: '100%', padding: '12px 16px' }}>
          <PedigreeNode
            dog={fullDog}
            parentDog={null}
            role="Soggetto"
            gen={0}
            commonIds={commonIds}
            onPick={setPickingParent}
            onOpen={id => navigate(`/dogs/${id}`)}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Tocca un riquadro tratteggiato <strong className="text-primary-500">+</strong> per collegare un antenato ·
        tocca un cane per aprirne la scheda. Scorri lateralmente per vedere tutte le generazioni.
      </p>

      {pickingParent && (
        <ParentPickerModal
          role={pickingParent.role}
          dogId={pickingParent.dogId}
          onClose={() => setPickingParent(null)}
          onSaved={() => {
            setPickingParent(null)
            queryClient.invalidateQueries({ queryKey: ['dog-with-ancestors', dog.id] })
            queryClient.invalidateQueries({ queryKey: ['dog', dog.id] })
            queryClient.invalidateQueries({ queryKey: ['dogs'] })
          }}
        />
      )}
    </div>
  )
}
