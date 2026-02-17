import { useState } from 'react'
import { Baby, Plus, Search, Filter } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'
import PuppyForm from '@/components/puppies/PuppyForm'
import PuppyCard from '@/components/puppies/PuppyCard'

export default function Puppies() {
  const [filter, setFilter] = useState('tutti')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedPuppy, setSelectedPuppy] = useState(null)
  const queryClient = useQueryClient()

  // Fetch puppies
  const { data: allPuppies = [], isLoading } = useQuery({
    queryKey: ['puppies'],
    queryFn: () => db.getPuppies(),
  })

  // Filter puppies
  const filteredPuppies = allPuppies.filter(puppy => {
    if (filter === 'tutti') return true
    if (filter === 'disponibili') return puppy.status === 'disponibile'
    if (filter === 'prenotati') return puppy.status === 'prenotato'
    if (filter === 'venduti') return puppy.status === 'venduto'
    return true
  })

  // Calculate stats
  const stats = {
    totale: allPuppies.length,
    disponibili: allPuppies.filter(p => p.status === 'disponibile').length,
    prenotati: allPuppies.filter(p => p.status === 'prenotato').length,
    venduti: allPuppies.filter(p => p.status === 'venduto').length,
  }

  const handleEdit = (puppy) => {
    setSelectedPuppy(puppy)
    setIsFormOpen(true)
  }

  const handleDelete = async (puppy) => {
    if (!confirm(`Sei sicuro di voler eliminare ${puppy.name || 'questo cucciolo'}?`)) return

    try {
      await db.deletePuppy(puppy.id)
      toast.success('Cucciolo eliminato con successo')
      queryClient.invalidateQueries(['puppies'])
    } catch (error) {
      console.error('Error deleting puppy:', error)
      toast.error('Errore durante l\'eliminazione')
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setSelectedPuppy(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    queryClient.invalidateQueries(['puppies'])
  }

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
      <div className="flex gap-3">
        {['tutti', 'disponibili', 'prenotati', 'venduti'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl font-semibold capitalize transition ${
              filter === status
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Totale', value: stats.totale, icon: Baby, gradient: 'from-blue-400 to-blue-500' },
          { label: 'Disponibili', value: stats.disponibili, icon: Baby, gradient: 'from-green-400 to-emerald-500' },
          { label: 'Prenotati', value: stats.prenotati, icon: Baby, gradient: 'from-yellow-400 to-orange-500' },
          { label: 'Venduti', value: stats.venduti, icon: Baby, gradient: 'from-purple-400 to-purple-500' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.gradient} p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold opacity-80 uppercase text-xs">{stat.label}</p>
                <stat.icon className="w-6 h-6 opacity-50" />
              </div>
              <h3 className="text-5xl font-black">{stat.value}</h3>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
          </div>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Puppies Grid */}
      {!isLoading && filteredPuppies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPuppies.map((puppy) => (
            <PuppyCard
              key={puppy.id}
              puppy={puppy}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPuppies.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Baby className="w-10 h-10 text-pink-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            {filter === 'tutti' ? 'Nessun Cucciolo' : `Nessun cucciolo ${filter}`}
          </h3>
          <p className="text-gray-500">
            {filter === 'tutti'
              ? 'Inizia aggiungendo il tuo primo cucciolo'
              : `Non ci sono cuccioli con stato "${filter}"`
            }
          </p>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <PuppyForm
          puppy={selectedPuppy}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}

