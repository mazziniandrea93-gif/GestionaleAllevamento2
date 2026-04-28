import { useRef, useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Tree from 'react-d3-tree'
import { db } from '@/lib/supabase'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { GitBranch, User, Baby, Heart, AlertCircle, ExternalLink, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

const STATUS_COLORS = {
  attivo:      { bg: '#D1FAE5', text: '#065F46', label: 'Attivo' },
  venduto:     { bg: '#DBEAFE', text: '#1E40AF', label: 'Venduto' },
  ceduto:      { bg: '#EDE9FE', text: '#5B21B6', label: 'Ceduto' },
  deceduto:    { bg: '#F3F4F6', text: '#374151', label: 'Deceduto' },
  disponibile: { bg: '#D1FAE5', text: '#065F46', label: 'Disponibile' },
  prenotato:   { bg: '#FEF3C7', text: '#92400E', label: 'Prenotato' },
}

const GENDER_COLOR = { maschio: '#3B82F6', femmina: '#EC4899', m: '#3B82F6', f: '#EC4899' }

function genderColor(g) {
  return GENDER_COLOR[g?.toLowerCase()] || '#9CA3AF'
}

// ── Nodo personalizzato per react-d3-tree ─────────────────────────────────
function CustomNode({ nodeDatum, onNodeClick }) {
  const { nodeType, dogId, color, gender, breed, status, birthDate, puppyStatus, litterDate, litterCount, partnerName } = nodeDatum.attrs || {}

  // ── Cane (root o genitore) ──
  if (nodeType === 'dog' || nodeType === 'root') {
    const isRoot = nodeType === 'root'
    const sc = STATUS_COLORS[status] || STATUS_COLORS.attivo
    const gc = genderColor(gender)
    const w = 160, h = 90

    return (
      <g onClick={() => !isRoot && dogId && onNodeClick(dogId)} style={{ cursor: isRoot ? 'default' : 'pointer' }}>
        {/* Ombra */}
        <rect x={-w/2 + 3} y={-h/2 + 3} width={w} height={h} rx={12} ry={12} fill="rgba(0,0,0,0.08)" />
        {/* Box principale */}
        <rect
          x={-w/2} y={-h/2} width={w} height={h} rx={12} ry={12}
          fill={isRoot ? '#1F2937' : 'white'}
          stroke={isRoot ? '#F59E0B' : gc}
          strokeWidth={isRoot ? 3 : 2}
        />
        {/* Banda sinistra colorata */}
        {!isRoot && (
          <rect x={-w/2} y={-h/2} width={6} height={h} rx={3} ry={3} fill={color || gc} />
        )}
        {/* Avatar cerchio genere */}
        <circle cx={isRoot ? 0 : -w/2 + 26} cy={isRoot ? -h/2 + 22 : 0} r={12} fill={gc} opacity={0.9} />
        <text
          x={isRoot ? 0 : -w/2 + 26} y={isRoot ? -h/2 + 27 : 5}
          textAnchor="middle" fontSize={11} fill="white" fontWeight="bold"
        >
          {gender?.toLowerCase().startsWith('m') ? '♂' : '♀'}
        </text>
        {/* Nome */}
        <text
          x={isRoot ? 0 : -w/2 + 46}
          y={isRoot ? 2 : -14}
          textAnchor={isRoot ? 'middle' : 'start'}
          fontSize={isRoot ? 15 : 13}
          fontWeight="bold"
          fill={isRoot ? '#F59E0B' : '#111827'}
        >
          {nodeDatum.name.length > 16 ? nodeDatum.name.slice(0, 14) + '…' : nodeDatum.name}
        </text>
        {/* Razza */}
        <text
          x={isRoot ? 0 : -w/2 + 46}
          y={isRoot ? 18 : 4}
          textAnchor={isRoot ? 'middle' : 'start'}
          fontSize={9} fill={isRoot ? '#9CA3AF' : '#6B7280'}
        >
          {(breed || '').slice(0, 20)}
        </text>
        {/* Status badge */}
        {!isRoot && status && (
          <>
            <rect x={-w/2 + 46} y={12} width={60} height={14} rx={4} ry={4} fill={sc.bg} />
            <text x={-w/2 + 76} y={22} textAnchor="middle" fontSize={8} fill={sc.text} fontWeight="bold">
              {sc.label}
            </text>
          </>
        )}
        {/* Icona navigazione */}
        {!isRoot && dogId && (
          <text x={w/2 - 14} y={-h/2 + 14} fontSize={9} fill="#9CA3AF">↗</text>
        )}
      </g>
    )
  }

  // ── Cucciolata ──
  if (nodeType === 'litter') {
    const w = 150, h = 70
    return (
      <g style={{ cursor: 'default' }}>
        <rect x={-w/2 + 2} y={-h/2 + 2} width={w} height={h} rx={10} ry={10} fill="rgba(0,0,0,0.06)" />
        <rect x={-w/2} y={-h/2} width={w} height={h} rx={10} ry={10} fill="#FFFBEB" stroke="#F59E0B" strokeWidth={1.5} />
        <text x={0} y={-14} textAnchor="middle" fontSize={9} fill="#92400E" fontWeight="bold">CUCCIOLATA</text>
        <text x={0} y={2} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#111827">
          {litterDate ? format(new Date(litterDate + 'T00:00:00'), 'MMM yyyy', { locale: it }) : '—'}
        </text>
        {partnerName && (
          <text x={0} y={16} textAnchor="middle" fontSize={9} fill="#6B7280">
            con {partnerName.slice(0, 18)}
          </text>
        )}
        <text x={0} y={30} textAnchor="middle" fontSize={8} fill="#9CA3AF">
          {litterCount} cuccioli
        </text>
      </g>
    )
  }

  // ── Cucciolo ──
  if (nodeType === 'puppy') {
    const gc = genderColor(gender)
    const sc = STATUS_COLORS[puppyStatus] || STATUS_COLORS.disponibile
    const w = 110, h = 60

    return (
      <g style={{ cursor: 'default' }}>
        <rect x={-w/2 + 2} y={-h/2 + 2} width={w} height={h} rx={8} ry={8} fill="rgba(0,0,0,0.05)" />
        <rect x={-w/2} y={-h/2} width={w} height={h} rx={8} ry={8} fill="white" stroke={gc} strokeWidth={1.5} />
        <circle cx={0} cy={-12} r={8} fill={gc} opacity={0.85} />
        <text x={0} y={-8} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
          {gender?.toLowerCase().startsWith('m') ? '♂' : '♀'}
        </text>
        <text x={0} y={8} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#111827">
          {nodeDatum.name.length > 12 ? nodeDatum.name.slice(0, 10) + '…' : nodeDatum.name}
        </text>
        <rect x={-30} y={14} width={60} height={13} rx={4} ry={4} fill={sc.bg} />
        <text x={0} y={23} textAnchor="middle" fontSize={8} fill={sc.text} fontWeight="bold">
          {sc.label}
        </text>
      </g>
    )
  }

  // ── Nodo placeholder (genitore non registrato) ──
  const w = 130, h = 55
  return (
    <g style={{ cursor: 'default' }}>
      <rect x={-w/2} y={-h/2} width={w} height={h} rx={8} ry={8} fill="#F9FAFB" stroke="#E5E7EB" strokeWidth={1.5} strokeDasharray="6,3" />
      <text x={0} y={-5} textAnchor="middle" fontSize={10} fill="#9CA3AF">Non registrato</text>
      <text x={0} y={12} textAnchor="middle" fontSize={9} fill="#D1D5DB">{nodeDatum.name}</text>
    </g>
  )
}

// ── Costruisce il tree data da matings ────────────────────────────────────
function buildDescendantsTree(dog, matings) {
  const children = matings.flatMap(mating => {
    const isFemale = mating.female_id === dog.id
    const partner = isFemale ? mating.male : mating.female
    return (mating.litters || []).map(litter => ({
      name: `Cucciolata ${litter.birth_date ? format(new Date(litter.birth_date + 'T00:00:00'), 'MMM yyyy', { locale: it }) : ''}`,
      attrs: {
        nodeType: 'litter',
        litterDate: litter.birth_date,
        litterCount: litter.alive_puppies || litter.total_puppies || (litter.puppies?.length ?? 0),
        partnerName: partner?.name,
      },
      children: (litter.puppies || []).map(p => ({
        name: p.name || 'Senza nome',
        attrs: {
          nodeType: 'puppy',
          gender: p.gender,
          color: p.color,
          puppyStatus: p.status,
        },
        children: [],
      })),
    }))
  })

  return {
    name: dog.name,
    attrs: {
      nodeType: 'root',
      gender: dog.gender,
      breed: dog.breed,
      color: dog.color,
      status: dog.status,
    },
    children,
  }
}

// ── Componente card per i genitori (sopra l'albero) ───────────────────────
function ParentCard({ parent, role, onClick }) {
  if (!parent) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-50">
        <div className="w-28 h-16 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center">
          <User className="w-5 h-5 text-gray-400" />
        </div>
        <span className="text-xs text-gray-400 font-semibold">{role} non registrat{role === 'Madre' ? 'a' : 'o'}</span>
      </div>
    )
  }

  const gc = genderColor(parent.gender)
  const sc = STATUS_COLORS[parent.status] || STATUS_COLORS.attivo

  return (
    <button
      onClick={() => onClick(parent.id)}
      className="flex flex-col items-center gap-1 group"
    >
      <div
        className="w-32 h-18 border-2 rounded-2xl p-3 bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 text-left relative overflow-hidden"
        style={{ borderColor: gc, minHeight: '72px' }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl" style={{ backgroundColor: parent.color || gc }} />
        <div className="pl-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-black text-gray-900 truncate max-w-[90px]">{parent.name}</span>
            <ExternalLink className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
          </div>
          <p className="text-xs text-gray-500 truncate">{parent.breed}</p>
          {parent.birth_date && (
            <p className="text-xs text-gray-400">{format(new Date(parent.birth_date + 'T00:00:00'), 'yyyy', { locale: it })}</p>
          )}
        </div>
      </div>
      <span className="text-xs font-bold" style={{ color: gc }}>{role}</span>
    </button>
  )
}

// ── Componente principale ─────────────────────────────────────────────────
export default function FamilyTree({ dog }) {
  const navigate = useNavigate()
  const treeContainerRef = useRef(null)
  const [translate, setTranslate] = useState(null)
  const [zoom, setZoom] = useState(0.75)

  const { data: matings = [], isLoading: loadingMatings } = useQuery({
    queryKey: ['matings-for-dog', dog.id],
    queryFn: () => db.getMatingsForDog(dog.id),
  })

  const { data: dogWithParents, isLoading: loadingParents } = useQuery({
    queryKey: ['dog-with-parents', dog.id],
    queryFn: () => db.getDogWithParents(dog.id),
  })

  const isLoading = loadingMatings || loadingParents

  const enrichedDog = dogWithParents || dog
  const hasDescendants = matings.some(m => (m.litters || []).length > 0)
  const hasAncestors = enrichedDog?.mother || enrichedDog?.father

  const treeData = buildDescendantsTree(enrichedDog, matings)

  const handleNodeClick = useCallback((dogId) => {
    navigate(`/dogs/${dogId}`)
  }, [navigate])

  const renderNode = useCallback(({ nodeDatum }) => (
    <CustomNode nodeDatum={nodeDatum} onNodeClick={handleNodeClick} />
  ), [handleNodeClick])

  // Centra l'albero al montaggio del container
  const containerRef = useCallback((node) => {
    if (node) {
      const { width } = node.getBoundingClientRect()
      setTranslate({ x: width / 2, y: 60 })
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Sezione Antenati ── */}
      {(hasAncestors || true) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-pink-500" />
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Genitori</h3>
            {!hasAncestors && (
              <span className="text-xs text-gray-400 ml-1">— imposta madre e padre dalla modifica cane</span>
            )}
          </div>
          <div className="flex items-end justify-center gap-6">
            <ParentCard parent={enrichedDog?.mother} role="Madre" onClick={(id) => navigate(`/dogs/${id}`)} />
            {/* Linea connessione verso il cane corrente */}
            <div className="flex flex-col items-center gap-0 pb-6">
              <div className="w-20 h-px bg-gray-300 relative">
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-px h-4 bg-gray-300" />
              </div>
            </div>
            <ParentCard parent={enrichedDog?.father} role="Padre" onClick={(id) => navigate(`/dogs/${id}`)} />
          </div>
          {/* Freccia verso il nodo radice dell'albero */}
          <div className="flex justify-center mt-0">
            <div className="w-px h-8 bg-gray-300" />
          </div>
        </div>
      )}

      {/* ── Albero Discendenti ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-yellow-500" />
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Discendenti</h3>
            {hasDescendants && (
              <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
                {matings.reduce((acc, m) => acc + (m.litters || []).reduce((a, l) => a + (l.puppies?.length || 0), 0), 0)} cuccioli
              </span>
            )}
          </div>
          {/* Controlli zoom */}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (treeContainerRef.current) {
                  const { width } = treeContainerRef.current.getBoundingClientRect()
                  setTranslate({ x: width / 2, y: 60 })
                  setZoom(0.75)
                }
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 ml-1"
              title="Reimposta vista"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!hasDescendants ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Baby className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-500">Nessun discendente registrato</p>
            <p className="text-sm text-gray-400 mt-1">Aggiungi accoppiamenti e cucciolate dalla sezione Riproduzione</p>
          </div>
        ) : (
          <div
            ref={(node) => { treeContainerRef.current = node; containerRef(node) }}
            className="border-2 border-gray-100 rounded-2xl overflow-hidden bg-gray-50"
            style={{ height: '480px' }}
          >
            {translate && (
              <Tree
                data={treeData}
                translate={translate}
                zoom={zoom}
                onUpdate={({ zoom: z }) => setZoom(z)}
                orientation="vertical"
                pathFunc="step"
                renderCustomNodeElement={renderNode}
                separation={{ siblings: 1.4, nonSiblings: 1.8 }}
                nodeSize={{ x: 180, y: 140 }}
                pathClassFunc={() => 'custom-tree-path'}
                svgClassName="family-tree-svg"
                draggable
                collapsible
                zoomable
                initialDepth={2}
                styles={{
                  links: { stroke: '#E5E7EB', strokeWidth: 2 },
                  nodes: { node: { circle: { fill: 'transparent', stroke: 'transparent' } }, leafNode: { circle: { fill: 'transparent', stroke: 'transparent' } } },
                }}
              />
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2 text-center">
          Trascina per spostarti · Scorri per zoom · Clicca su un genitore per aprirne la scheda
        </p>
      </div>
    </div>
  )
}
