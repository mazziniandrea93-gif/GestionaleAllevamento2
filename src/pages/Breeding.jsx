import { useState } from 'react'
import { Heart, Plus, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import LitterForm from '@/components/breeding/LitterForm'
import LitterCard from '@/components/breeding/LitterCard'
import MatingForm from '@/components/breeding/MatingForm'
import MatingCard from '@/components/breeding/MatingCard'

export default function Breeding() {
  const [activeTab, setActiveTab] = useState('cucciolate')
  const [showLitterForm, setShowLitterForm] = useState(false)
  const [showMatingForm, setShowMatingForm] = useState(false)
  const [selectedLitter, setSelectedLitter] = useState(null)
  const [selectedMating, setSelectedMating] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const queryClient = useQueryClient()

  // Query per le cucciolate
  const { data: litters = [], isLoading: littersLoading } = useQuery({
    queryKey: ['litters'],
    queryFn: () => db.getLitters()
  })

  // Query per gli accoppiamenti
  const { data: matings = [], isLoading: matingsLoading } = useQuery({
    queryKey: ['matings'],
    queryFn: () => db.getMatings()
  })

  // Mutation per eliminare cucciolata
  const deleteLitterMutation = useMutation({
    mutationFn: (id) => db.deleteLitter(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['litters'])
    }
  })

  // Mutation per eliminare accoppiamento
  const deleteMatingMutation = useMutation({
    mutationFn: (id) => db.deleteMating(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['matings'])
    }
  })

  function handleEditLitter(litter) {
    setSelectedLitter(litter)
    setShowLitterForm(true)
  }

  function handleDeleteLitter(id) {
    if (confirm('Sei sicuro di voler eliminare questa cucciolata?')) {
      deleteLitterMutation.mutate(id)
    }
  }

  function handleEditMating(mating) {
    setSelectedMating(mating)
    setShowMatingForm(true)
  }

  function handleDeleteMating(id) {
    if (confirm('Sei sicuro di voler eliminare questo accoppiamento?')) {
      deleteMatingMutation.mutate(id)
    }
  }

  function handleCloseLitterForm() {
    setShowLitterForm(false)
    setSelectedLitter(null)
  }

  function handleCloseMatingForm() {
    setShowMatingForm(false)
    setSelectedMating(null)
  }

  function handleLitterSuccess() {
    queryClient.invalidateQueries(['litters'])
  }

  function handleMatingSuccess() {
    queryClient.invalidateQueries(['matings'])
  }

  // Filtra i risultati in base alla ricerca
  const filteredLitters = litters.filter(litter =>
    litter.mating?.female?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    litter.mating?.male?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredMatings = matings.filter(mating =>
    mating.female?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mating.male?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-dark-900">Riproduzione</h2>
          <p className="text-gray-500 mt-1">Gestisci accoppiamenti e cucciolate</p>
        </div>
        <button
          onClick={() => activeTab === 'cucciolate' ? setShowLitterForm(true) : setShowMatingForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'cucciolate' ? 'Nuova Cucciolata' : 'Nuovo Accoppiamento'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['cucciolate', 'accoppiamenti'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-bold capitalize transition ${
              activeTab === tab
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Cerca per nome cane..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none transition"
        />
      </div>

      {/* Content - Cucciolate */}
      {activeTab === 'cucciolate' && (
        <div>
          {littersLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : filteredLitters.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Nessuna cucciolata</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Nessuna cucciolata trovata con questi criteri' : 'Inizia aggiungendo la prima cucciolata'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowLitterForm(true)}
                  className="px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
                >
                  Aggiungi Cucciolata
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredLitters.map((litter) => (
                <LitterCard
                  key={litter.id}
                  litter={litter}
                  onEdit={handleEditLitter}
                  onDelete={handleDeleteLitter}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content - Accoppiamenti */}
      {activeTab === 'accoppiamenti' && (
        <div>
          {matingsLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : filteredMatings.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun accoppiamento</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Nessun accoppiamento trovato con questi criteri' : 'Inizia registrando il primo accoppiamento'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowMatingForm(true)}
                  className="px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
                >
                  Aggiungi Accoppiamento
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredMatings.map((mating) => (
                <MatingCard
                  key={mating.id}
                  mating={mating}
                  onEdit={handleEditMating}
                  onDelete={handleDeleteMating}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showLitterForm && (
        <LitterForm
          litter={selectedLitter}
          onClose={handleCloseLitterForm}
          onSuccess={handleLitterSuccess}
        />
      )}

      {showMatingForm && (
        <MatingForm
          mating={selectedMating}
          onClose={handleCloseMatingForm}
          onSuccess={handleMatingSuccess}
        />
      )}
    </div>
  )
}




