import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import { Plus, Filter, Search, Dog } from 'lucide-react'
import DogCard from '@/components/dogs/DogCard'
import DogForm from '@/components/dogs/DogForm'

export default function Dogs() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filter, setFilter] = useState('attivo')
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const { data: dogs, isLoading } = useQuery({
    queryKey: ['dogs', filter],
    queryFn: () => db.getDogs(filter === 'tutti' ? null : filter),
  })

  const filteredDogs = dogs?.filter(dog =>
    dog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dog.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dog.microchip?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-dark-900">I Miei Cani</h2>
          <p className="text-gray-500 mt-1">Gestisci tutti i cani dell'allevamento</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary-600 transition flex items-center space-x-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Aggiungi Cane</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome, razza o microchip..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-primary-300 focus:ring-0 outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 bg-white p-1 rounded-2xl border-2 border-gray-200">
          {['tutti', 'attivo', 'venduto', 'ceduto'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${
                filter === status
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Totale', value: dogs?.length || 0, icon: Dog, gradient: 'from-blue-400 to-blue-500' },
          { label: 'Attivi', value: dogs?.filter(d => d.status === 'attivo').length || 0, icon: Dog, gradient: 'from-green-400 to-emerald-500' },
          { label: 'Femmine', value: dogs?.filter(d => d.gender === 'femmina').length || 0, icon: Dog, gradient: 'from-pink-400 to-rose-400' },
          { label: 'Maschi', value: dogs?.filter(d => d.gender === 'maschio').length || 0, icon: Dog, gradient: 'from-purple-400 to-purple-500' },
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

      {/* Dogs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-3xl animate-pulse">
              <div className="w-full h-48 bg-gray-200 rounded-2xl mb-4"></div>
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredDogs && filteredDogs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDogs.map((dog) => (
            <DogCard key={dog.id} dog={dog} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['dogs'] })} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun cane trovato</h3>
          <p className="text-gray-500">
            {searchQuery
              ? 'Prova a modificare i filtri di ricerca'
              : 'Inizia aggiungendo il tuo primo cane'}
          </p>
        </div>
      )}

      {/* Add Dog Modal */}
      {isFormOpen && (
        <DogForm
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false)
            queryClient.invalidateQueries({ queryKey: ['dogs'] })
          }}
        />
      )}
    </div>
  )
}
