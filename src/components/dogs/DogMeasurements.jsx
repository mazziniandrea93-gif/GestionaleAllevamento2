import { useState } from 'react'
import { X, Plus, TrendingUp, Calendar, Ruler, Weight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function DogMeasurements({ dogId, dogName }) {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  // Fetch measurements
  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ['dog-measurements', dogId],
    queryFn: () => db.getDogMeasurements(dogId),
    enabled: !!dogId,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-gray-900">Tracciamento Crescita</h3>
          <p className="text-sm text-gray-600">Monitora peso e altezza nel tempo</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition"
        >
          <Plus className="w-5 h-5" />
          Aggiungi Misurazione
        </button>
      </div>

      {measurements.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Nessuna misurazione registrata</p>
          <p className="text-sm text-gray-500 mt-2">
            Inizia a tracciare peso e altezza di {dogName}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {measurements.map((measurement) => (
            <MeasurementCard
              key={measurement.id}
              measurement={measurement}
              onDelete={() => {
                queryClient.invalidateQueries(['dog-measurements', dogId])
                queryClient.invalidateQueries(['dog', dogId])
              }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <MeasurementForm
          dogId={dogId}
          dogName={dogName}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries(['dog-measurements', dogId])
            queryClient.invalidateQueries(['dog', dogId])
          }}
        />
      )}
    </div>
  )
}

function MeasurementCard({ measurement, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa misurazione?')) return

    setDeleting(true)
    try {
      await db.deleteDogMeasurement(measurement.id)
      toast.success('Misurazione eliminata')
      onDelete()
    } catch (error) {
      toast.error('Errore durante l\'eliminazione')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-primary-300 transition">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-semibold">
            {format(new Date(measurement.measurement_date), 'dd MMMM yyyy', { locale: it })}
          </span>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-500 hover:text-red-700 text-xs font-bold disabled:opacity-50"
        >
          Elimina
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {measurement.weight && (
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-xl">
              <Weight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Peso</p>
              <p className="text-lg font-black text-gray-900">{measurement.weight} kg</p>
            </div>
          </div>
        )}

        {measurement.height && (
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-xl">
              <Ruler className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Altezza</p>
              <p className="text-lg font-black text-gray-900">{measurement.height} cm</p>
            </div>
          </div>
        )}
      </div>

      {measurement.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">{measurement.notes}</p>
        </div>
      )}
    </div>
  )
}

function MeasurementForm({ dogId, dogName, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    dog_id: dogId,
    measurement_date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    height: '',
    notes: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.weight && !formData.height) {
      toast.error('Inserisci almeno peso o altezza')
      return
    }

    setLoading(true)
    try {
      await db.createDogMeasurement({
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
      })
      toast.success('Misurazione aggiunta con successo')
      onSuccess()
    } catch (error) {
      console.error('Error saving measurement:', error)
      toast.error(error.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-black text-gray-900">
            Nuova Misurazione - {dogName}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Data Misurazione *
            </label>
            <input
              type="date"
              name="measurement_date"
              value={formData.measurement_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Peso (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                step="0.1"
                min="0"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                placeholder="25.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Altezza (cm)
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                step="0.1"
                min="0"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                placeholder="55.0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Note (opzionale)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
              placeholder="Es: Prima misurazione dopo il vaccino..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition disabled:opacity-50"
            >
              {loading ? 'Salvataggio...' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

