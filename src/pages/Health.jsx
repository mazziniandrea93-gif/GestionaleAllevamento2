import { useState } from 'react'
import { Heart as HeartIcon, Plus, Syringe, Pill, Activity } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'
import HealthRecordForm from '@/components/health/HealthRecordForm'
import HealthRecordCard from '@/components/health/HealthRecordCard'

export default function Health() {
  const [activeTab, setActiveTab] = useState('tutti')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const queryClient = useQueryClient()

  // Fetch dogs per ottenere i record sanitari
  const { data: dogs = [] } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => db.getDogs(),
  })

  // Fetch health records per tutti i cani
  const { data: allRecords = [], isLoading } = useQuery({
    queryKey: ['health-records-all'],
    queryFn: async () => {
      const records = []
      for (const dog of dogs) {
        const dogRecords = await db.getHealthRecords(dog.id)
        records.push(...dogRecords.map(r => ({ ...r, dog })))
      }
      return records.sort((a, b) => new Date(b.record_date) - new Date(a.record_date))
    },
    enabled: dogs.length > 0,
  })

  // Filter records by type
  const filteredRecords = allRecords.filter(record => {
    if (activeTab === 'tutti') return true
    if (activeTab === 'vaccini') return record.record_type === 'vaccinazione'
    if (activeTab === 'visite') return record.record_type === 'visita'
    if (activeTab === 'terapie') return record.record_type === 'terapia' || record.record_type === 'trattamento'
    return true
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calculate stats
  const stats = {
    vacciniScaduti: allRecords.filter(r =>
      r.record_type === 'vaccinazione' &&
      r.next_appointment_date &&
      new Date(r.next_appointment_date) < today
    ).length,
    visiteProgrammate: allRecords.filter(r =>
      r.record_type === 'visita' &&
      r.next_appointment_date &&
      new Date(r.next_appointment_date) >= today
    ).length,
    terapieAttive: allRecords.filter(r =>
      (r.record_type === 'terapia' || r.record_type === 'trattamento') &&
      (!r.next_appointment_date || new Date(r.next_appointment_date) >= today)
    ).length,
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setSelectedRecord(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    queryClient.invalidateQueries(['health-records-all'])
  }

  const handleEdit = (record) => {
    setSelectedRecord(record)
    setIsFormOpen(true)
  }

  const handleDelete = async (record) => {
    if (!confirm(`Sei sicuro di voler eliminare questo record sanitario?\n\n"${record.description}"`)) return

    try {
      await db.deleteHealthRecord(record.id)
      toast.success('Record sanitario eliminato con successo')
      queryClient.invalidateQueries(['health-records-all'])
    } catch (error) {
      console.error('Error deleting health record:', error)
      toast.error('Errore durante l\'eliminazione')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-dark-900">Salute</h2>
          <p className="text-gray-500 mt-1">Monitora la salute dei tuoi cani</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
        >
          <Plus className="w-5 h-5" />
          Nuovo Evento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'tutti', label: 'Tutti', icon: HeartIcon },
          { id: 'vaccini', label: 'Vaccini', icon: Syringe },
          { id: 'visite', label: 'Visite', icon: Activity },
          { id: 'terapie', label: 'Terapie', icon: Pill },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-bold transition ${
              activeTab === tab.id
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-400 to-blue-500 p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold opacity-80 uppercase text-xs">Vaccini Scaduti</p>
              <Syringe className="w-6 h-6 opacity-50" />
            </div>
            <h3 className="text-5xl font-black">{stats.vacciniScaduti}</h3>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
        </div>

        <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold opacity-80 uppercase text-xs">Visite Programmate</p>
              <Activity className="w-6 h-6 opacity-50" />
            </div>
            <h3 className="text-5xl font-black">{stats.visiteProgrammate}</h3>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
        </div>

        <div className="bg-gradient-to-br from-purple-400 to-purple-500 p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold opacity-80 uppercase text-xs">Terapie Attive</p>
              <Pill className="w-6 h-6 opacity-50" />
            </div>
            <h3 className="text-5xl font-black">{stats.terapieAttive}</h3>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Health Records Grid */}
      {!isLoading && filteredRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map((record) => (
            <HealthRecordCard
              key={record.id}
              record={record}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRecords.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HeartIcon className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            {activeTab === 'tutti' ? 'Nessun Evento di Salute' : `Nessun record di tipo "${activeTab}"`}
          </h3>
          <p className="text-gray-500">
            {activeTab === 'tutti'
              ? 'Inizia registrando vaccini, visite o terapie'
              : `Non ci sono record di tipo "${activeTab}" registrati`
            }
          </p>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <HealthRecordForm
          record={selectedRecord}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}

