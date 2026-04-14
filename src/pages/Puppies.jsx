import { useState } from 'react'
import { Baby, Plus, Calendar, Dog, Search, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import PuppyForm from '@/components/puppies/PuppyForm'
import PuppyCard from '@/components/puppies/PuppyCard'

// Gruppo cucciolata con ricerca interna
function LitterGroup({ group, onEdit, onDelete }) {
  const [search, setSearch] = useState('')

  const visiblePuppies = search.trim()
    ? group.puppies.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()))
    : group.puppies

  const litterName = group.litter?.mating?.female?.name && group.litter?.mating?.male?.name
    ? `${group.litter.mating.female.name} × ${group.litter.mating.male.name}`
    : 'Cucciolata'

  return (
    <div>
      {/* Header */}
      {group.litter_id ? (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-3 bg-white border-2 border-gray-200 rounded-2xl px-5 py-3 shadow-sm shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center">
              <Baby className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-gray-900 text-base">{litterName}</span>
                {group.litter?.birth_date && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(group.litter.birth_date), 'dd MMM yyyy', { locale: it })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 font-semibold mt-0.5">
                {group.litter?.males > 0 && <span>♂ {group.litter.males} maschi</span>}
                {group.litter?.females > 0 && <span>♀ {group.litter.females} femmine</span>}
                {group.litter?.deceased_puppies > 0 && (
                  <span className="text-gray-400">† {group.litter.deceased_puppies} deceduti</span>
                )}
                <span className="text-primary-600 font-bold">{group.puppies.length} record</span>
              </div>
            </div>
          </div>

          {/* Search inline */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca cucciolo..."
              className="pl-8 pr-8 py-2 rounded-xl border-2 border-gray-200 bg-white text-sm focus:border-primary-500 focus:outline-none transition w-44"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 h-px bg-gray-200" />
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 text-gray-500 font-bold text-sm shrink-0">
            <Dog className="w-4 h-4" />
            Senza cucciolata
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca cucciolo..."
              className="pl-8 pr-8 py-2 rounded-xl border-2 border-gray-200 bg-white text-sm focus:border-primary-500 focus:outline-none transition w-44"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      {/* Grid cuccioli */}
      {visiblePuppies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePuppies.map(puppy => (
            <PuppyCard key={puppy.id} puppy={puppy} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic pl-2">Nessun cucciolo trovato per "{search}"</p>
      )}
    </div>
  )
}

export default function Puppies() {
  const [filter, setFilter] = useState('tutti')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedPuppy, setSelectedPuppy] = useState(null)
  const queryClient = useQueryClient()

  const { data: allPuppies = [], isLoading } = useQuery({
    queryKey: ['puppies'],
    queryFn: () => db.getPuppies(),
  })

  const filteredPuppies = allPuppies.filter(puppy => {
    if (filter === 'disponibili') return puppy.status === 'disponibile'
    if (filter === 'prenotati') return puppy.status === 'prenotato'
    if (filter === 'venduti') return puppy.status === 'venduto'
    if (filter === 'deceduti') return puppy.status === 'deceduto'
    return true
  })

  const statusOrder = { disponibile: 0, prenotato: 1, venduto: 2, trattenuto: 3, deceduto: 4 }
  const genderOrder = { femmina: 0, maschio: 1 }
  const sortedPuppies = [...filteredPuppies].sort((a, b) => {
    const sa = statusOrder[a.status] ?? 5
    const sb = statusOrder[b.status] ?? 5
    if (sa !== sb) return sa - sb
    const ga = genderOrder[a.gender] ?? 2
    const gb = genderOrder[b.gender] ?? 2
    if (ga !== gb) return ga - gb
    return (a.name || '').localeCompare(b.name || '', 'it')
  })

  const groupedPuppies = sortedPuppies.reduce((acc, puppy) => {
    const key = puppy.litter_id || '__nolitter__'
    if (!acc[key]) acc[key] = { litter: puppy.litter || null, litter_id: puppy.litter_id, puppies: [] }
    acc[key].puppies.push(puppy)
    return acc
  }, {})

  const sortedGroups = Object.values(groupedPuppies).sort((a, b) => {
    if (!a.litter_id) return 1
    if (!b.litter_id) return -1
    return new Date(b.litter.birth_date) - new Date(a.litter.birth_date)
  })

  const stats = {
    totale: allPuppies.filter(p => p.status !== 'deceduto').length,
    disponibili: allPuppies.filter(p => p.status === 'disponibile').length,
    prenotati: allPuppies.filter(p => p.status === 'prenotato').length,
    venduti: allPuppies.filter(p => p.status === 'venduto').length,
  }

  const handleEdit = (puppy) => { setSelectedPuppy(puppy); setIsFormOpen(true) }

  const handleDelete = async (puppy) => {
    if (!confirm(`Sei sicuro di voler eliminare ${puppy.name || 'questo cucciolo'}?`)) return
    try {
      await db.deletePuppy(puppy.id)
      toast.success('Cucciolo eliminato con successo')
      queryClient.invalidateQueries(['puppies'])
    } catch (error) {
      toast.error('Errore durante l\'eliminazione')
    }
  }

  const handleFormClose = () => { setIsFormOpen(false); setSelectedPuppy(null) }
  const handleFormSuccess = () => { handleFormClose(); queryClient.invalidateQueries(['puppies']) }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-dark-900">Cuccioli</h2>
          <p className="text-gray-500 mt-1">Gestisci i cuccioli dell'allevamento</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
        >
          <Plus className="w-5 h-5" />
          Nuovo Cucciolo
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {[
          { key: 'tutti', label: 'Tutti' },
          { key: 'disponibili', label: 'Disponibili' },
          { key: 'prenotati', label: 'Prenotati' },
          { key: 'venduti', label: 'Venduti' },
          { key: 'deceduti', label: 'Deceduti' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl font-semibold transition ${
              filter === key
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Totale', value: stats.totale, gradient: 'from-blue-400 to-blue-500' },
          { label: 'Disponibili', value: stats.disponibili, gradient: 'from-green-400 to-emerald-500' },
          { label: 'Prenotati', value: stats.prenotati, gradient: 'from-yellow-400 to-orange-500' },
          { label: 'Venduti', value: stats.venduti, gradient: 'from-purple-400 to-purple-500' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.gradient} p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden`}>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold opacity-80 uppercase text-xs">{stat.label}</p>
                <Baby className="w-6 h-6 opacity-50" />
              </div>
              <h3 className="text-5xl font-black">{stat.value}</h3>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
          </div>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      )}

      {/* Gruppi per cucciolata */}
      {!isLoading && sortedGroups.length > 0 && (
        <div className="space-y-10">
          {sortedGroups.map(group => (
            <LitterGroup
              key={group.litter_id || '__nolitter__'}
              group={group}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredPuppies.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Baby className="w-10 h-10 text-pink-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            {filter === 'tutti' ? 'Nessun Cucciolo' : `Nessun cucciolo ${filter}`}
          </h3>
          <p className="text-gray-500">
            {filter === 'tutti' ? 'Inizia aggiungendo il tuo primo cucciolo' : `Non ci sono cuccioli con stato "${filter}"`}
          </p>
        </div>
      )}

      {isFormOpen && (
        <PuppyForm puppy={selectedPuppy} onClose={handleFormClose} onSuccess={handleFormSuccess} />
      )}
    </div>
  )
}
