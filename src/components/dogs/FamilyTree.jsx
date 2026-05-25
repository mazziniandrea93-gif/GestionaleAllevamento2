import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow, Background, Controls,
  Handle, Position, useNodesState, useEdgesState,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { db } from '@/lib/supabase'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Plus, Search, X } from 'lucide-react'
import DogForm from '@/components/dogs/DogForm'
import toast from 'react-hot-toast'

// ── Costanti layout ───────────────────────────────────────────────────────
// Layout VERTICALE: radice in basso, bisnonni in alto
//
//  GGP[0] GGP[1] GGP[2] GGP[3] GGP[4] GGP[5] GGP[6] GGP[7]  ← y=0
//      GP[0]         GP[1]         GP[2]         GP[3]          ← y=VS
//            Father                      Mother                 ← y=2*VS
//                          Root                                 ← y=3*VS

const NW  = 168   // larghezza nodo
const NH  = 80    // altezza nodo
const HS  = 200   // spaziatura orizzontale tra slot GGP
const VS  = 130   // spaziatura verticale tra livelli

// x del nodo centrato sullo slot (es. 0.5, 1.5 … 7.5)
const nx = slot => slot * HS - NW / 2

function gc(g) {
  const l = g?.toLowerCase() || ''
  if (l.startsWith('m')) return '#3B82F6'
  if (l.startsWith('f')) return '#EC4899'
  return '#9CA3AF'
}

const STATUS_COLORS = {
  attivo:      { bg: '#D1FAE5', text: '#065F46', label: 'Attivo' },
  venduto:     { bg: '#DBEAFE', text: '#1E40AF', label: 'Venduto' },
  ceduto:      { bg: '#EDE9FE', text: '#5B21B6', label: 'Ceduto' },
  deceduto:    { bg: '#F3F4F6', text: '#374151', label: 'Deceduto' },
  disponibile: { bg: '#D1FAE5', text: '#065F46', label: 'Disponibile' },
  prenotato:   { bg: '#FEF3C7', text: '#92400E', label: 'Prenotato' },
  esterno:     { bg: '#FFEDD5', text: '#9A3412', label: 'Esterno' },
}

// ── Nodo Cane ─────────────────────────────────────────────────────────────
function DogNode({ data }) {
  const { dog, isRoot } = data
  if (!dog) return null
  const color = gc(dog.gender)
  const sc    = STATUS_COLORS[dog.status] || null

  return (
    <div style={{
      width: NW, minHeight: NH,
      border: `2px solid ${isRoot ? '#F59E0B' : color}`,
      background: isRoot ? '#1F2937' : '#ffffff',
      borderRadius: 14,
      cursor: isRoot ? 'default' : 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      position: 'relative',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      {/* Handle TOP = si connette al genitore (sopra) */}
      <Handle type="source" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />
      {/* Handle BOTTOM = riceve connessione dal figlio (sotto) */}
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />

      {/* Striscia colorata sinistra */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 5,
        background: isRoot ? '#F59E0B' : color,
        borderRadius: '12px 0 0 12px',
      }} />

      <div style={{ padding: '9px 10px 9px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{ color, fontSize: 11, fontWeight: 800 }}>
            {dog.gender?.toLowerCase().startsWith('f') ? '♀' : '♂'}
          </span>
          <span style={{
            color: isRoot ? '#F59E0B' : '#111827',
            fontWeight: 800, fontSize: 12,
            maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {dog.nickname || dog.name || '—'}
          </span>
        </div>
        {dog.breed && (
          <div style={{
            color: isRoot ? '#9CA3AF' : '#6B7280', fontSize: 10, marginBottom: 2,
            maxWidth: 144, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {dog.breed}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          {dog.birth_date && (
            <span style={{ color: '#9CA3AF', fontSize: 10 }}>
              {format(new Date(dog.birth_date + 'T00:00:00'), 'yyyy', { locale: it })}
            </span>
          )}
          {sc && (
            <span style={{
              background: sc.bg, color: sc.text,
              borderRadius: 5, padding: '1px 6px', fontSize: 9, fontWeight: 700,
            }}>
              {sc.label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Nodo Placeholder ──────────────────────────────────────────────────────
function PlaceholderNode({ data }) {
  const { role } = data
  const color = role === 'Madre' ? '#EC4899' : '#3B82F6'

  return (
    <div style={{
      width: NW, height: NH,
      border: `2px dashed ${color}`,
      borderRadius: 12,
      background: color + '10',
      color,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      cursor: 'pointer', fontWeight: 700, fontSize: 12,
      userSelect: 'none',
    }}>
      <Handle type="source" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Plus size={13} /> {role}
    </div>
  )
}

const nodeTypes = { dogNode: DogNode, placeholderNode: PlaceholderNode }

// ── Build layout verticale ────────────────────────────────────────────────
function buildTree(dog) {
  const nodes = []
  const edges = []
  const seen  = new Set()

  // slot = posizione orizzontale (es. 0.5, 1.5 … 7.5 per GGP)
  // level = livello verticale (0=bisnonni, 1=nonni, 2=genitori, 3=radice)
  function addDog(dogData, slot, level, opts = {}) {
    const x = nx(slot)
    const y = (3 - level) * VS          // radice in basso, bisnonni in alto
    const id = dogData
      ? `dog-${dogData.id}`
      : `ph-${opts.role}-${opts.parentId || 'root'}-${Math.round(slot * 10)}`
    if (seen.has(id)) return id
    seen.add(id)

    if (!dogData) {
      nodes.push({
        id, type: 'placeholderNode',
        position: { x, y },
        data: { role: opts.role, parentId: opts.parentId, field: opts.field },
      })
    } else {
      nodes.push({
        id, type: 'dogNode',
        position: { x, y },
        data: { dog: dogData, isRoot: !!opts.isRoot },
      })
    }
    return id
  }

  function edge(childId, parentId, faint = false) {
    edges.push({
      id: `e-${childId}-${parentId}`,
      source: childId,   // handle TOP del figlio
      target: parentId,  // handle BOTTOM del genitore
      type: 'smoothstep',
      style: { stroke: faint ? '#E2E8F0' : '#CBD5E1', strokeWidth: faint ? 1 : 1.5 },
    })
  }

  // ── Livello 3: Radice (slot 4.0 = centro degli 8 slot) ──
  const rootId = addDog(dog, 4, 3, { isRoot: true })

  // ── Livello 2: Genitori ──
  // Padre: centro degli slot 0-3 → slot 2
  // Madre: centro degli slot 4-7 → slot 6
  const fatherId = addDog(dog.father, 2, 2, { role: 'Padre', parentId: dog.id, field: 'father_id' })
  const motherId = addDog(dog.mother, 6, 2, { role: 'Madre', parentId: dog.id, field: 'mother_id' })
  edge(rootId, fatherId)
  edge(rootId, motherId)

  // ── Livello 1: Nonni ──
  const GP = [
    { slot: 1, dog: dog.father?.father, role: 'Padre', parentId: dog.father?.id, field: 'father_id', childId: fatherId },
    { slot: 3, dog: dog.father?.mother, role: 'Madre', parentId: dog.father?.id, field: 'mother_id', childId: fatherId },
    { slot: 5, dog: dog.mother?.father, role: 'Padre', parentId: dog.mother?.id, field: 'father_id', childId: motherId },
    { slot: 7, dog: dog.mother?.mother, role: 'Madre', parentId: dog.mother?.id, field: 'mother_id', childId: motherId },
  ]
  const gpIds = GP.map(g => {
    if (!g.parentId) return null
    const id = addDog(g.dog, g.slot, 1, { role: g.role, parentId: g.parentId, field: g.field })
    edge(g.childId, id)
    return id
  })

  // ── Livello 0: Bisnonni ──
  const GGP = [
    { slot: 0.5, dog: dog.father?.father?.father, role: 'Padre', parentId: dog.father?.father?.id, field: 'father_id', gpIdx: 0 },
    { slot: 1.5, dog: dog.father?.father?.mother, role: 'Madre', parentId: dog.father?.father?.id, field: 'mother_id', gpIdx: 0 },
    { slot: 2.5, dog: dog.father?.mother?.father, role: 'Padre', parentId: dog.father?.mother?.id, field: 'father_id', gpIdx: 1 },
    { slot: 3.5, dog: dog.father?.mother?.mother, role: 'Madre', parentId: dog.father?.mother?.id, field: 'mother_id', gpIdx: 1 },
    { slot: 4.5, dog: dog.mother?.father?.father, role: 'Padre', parentId: dog.mother?.father?.id, field: 'father_id', gpIdx: 2 },
    { slot: 5.5, dog: dog.mother?.father?.mother, role: 'Madre', parentId: dog.mother?.father?.id, field: 'mother_id', gpIdx: 2 },
    { slot: 6.5, dog: dog.mother?.mother?.father, role: 'Padre', parentId: dog.mother?.mother?.id, field: 'father_id', gpIdx: 3 },
    { slot: 7.5, dog: dog.mother?.mother?.mother, role: 'Madre', parentId: dog.mother?.mother?.id, field: 'mother_id', gpIdx: 3 },
  ]
  GGP.forEach(g => {
    if (!g.parentId) return
    const parentGpId = gpIds[g.gpIdx]
    if (!parentGpId) return
    const id = addDog(g.dog, g.slot, 0, { role: g.role, parentId: g.parentId, field: g.field })
    edge(parentGpId, id, true)
  })

  return { nodes, edges }
}

// ── ParentPickerModal ─────────────────────────────────────────────────────
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
    (isMadre ? d.gender?.toLowerCase().startsWith('f') : d.gender?.toLowerCase().startsWith('m')) &&
    [d.name, d.nickname, d.breed].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleSelect(parentId) {
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
      // 1. Crea il cane esterno
      const created = await db.createDog({
        name:       extForm.name.trim(),
        breed:      extForm.breed.trim() || null,
        birth_date: extForm.birth_year ? `${extForm.birth_year}-01-01` : null,
        gender:     isMadre ? 'Femmina' : 'Maschio',
        status:     'esterno',
      })
      if (!created?.id) throw new Error('Creazione cane fallita')

      // 2. Collega come genitore
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
        defaultGender={isMadre ? 'Femmina' : 'Maschio'}
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
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold"
                      style={{ backgroundColor: accentBg, color: accent }}>
                      {isMadre ? '♀' : '♂'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">{d.nickname || d.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {d.breed}
                        {d.birth_date ? ` · ${format(new Date(d.birth_date + 'T00:00:00'), 'yyyy', { locale: it })}` : ''}
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

// ── Componente principale ─────────────────────────────────────────────────
export default function FamilyTree({ dog }) {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const [pickingParent, setPickingParent] = useState(null)
  const [nodes, setNodes] = useNodesState([])
  const [edges, setEdges] = useEdgesState([])

  const { data: enrichedDog, isLoading } = useQuery({
    queryKey: ['dog-with-ancestors', dog.id],
    queryFn:  () => db.getDogWithAncestors(dog.id),
  })

  const fullDog = enrichedDog || dog

  useEffect(() => {
    if (isLoading) return
    const { nodes: n, edges: e } = buildTree(fullDog)
    setNodes(n)
    setEdges(e)
  }, [fullDog, isLoading])

  const handleNodeClick = useCallback((_evt, node) => {
    if (node.type === 'placeholderNode') {
      const { role, parentId, field } = node.data
      if (parentId) setPickingParent({ role, dogId: parentId, field })
    } else if (node.type === 'dogNode') {
      const { dog: d, isRoot } = node.data
      if (!isRoot && d?.id) navigate(`/dogs/${d.id}`)
    }
  }, [navigate])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
      </div>
    )
  }

  return (
    <>
      <div style={{ height: 640, borderRadius: 20, overflow: 'hidden', border: '2px solid #F1F5F9' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.10, maxZoom: 0.9 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" gap={20} size={1} color="#E2E8F0" />
          <Controls showInteractive={false} />
          <Panel position="bottom-center">
            <div style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              borderRadius: 20, padding: '5px 14px',
              fontSize: 11, color: '#94A3B8', fontWeight: 600,
              border: '1px solid #E2E8F0',
            }}>
              Scroll per zoom · Drag per spostare · Clicca un riquadro{' '}
              <strong style={{ color: '#3B82F6' }}>+</strong> per aggiungere un antenato
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {pickingParent && (
        <ParentPickerModal
          role={pickingParent.role}
          dogId={pickingParent.dogId}
          onClose={() => setPickingParent(null)}
          onSaved={() => {
            setPickingParent(null)
            queryClient.invalidateQueries({ queryKey: ['dog-with-ancestors', dog.id] })
            queryClient.invalidateQueries({ queryKey: ['dog', dog.id] })
          }}
        />
      )}
    </>
  )
}
