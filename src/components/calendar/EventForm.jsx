import { useState } from 'react'
import { X, Calendar, Stethoscope, Scissors, Trophy, Heart, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function EventForm({ event, selectedDate, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    dog_id: event?.dog_id || '',
    event_type: event?.event_type || 'veterinario',
    title: event?.title || '',
    description: event?.description || '',
    event_date: event?.event_date || (selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    completed: event?.completed || false,
    reminder_days: event?.reminder_days || 3,
    notes: event?.notes || '',
  })

  // Fetch dogs per il dropdown
  const { data: dogs = [] } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => db.getDogs(),
  })

  const eventTypes = [
    { value: 'veterinario', label: 'Veterinario', icon: Stethoscope, color: 'blue' },
    { value: 'toelettatura', label: 'Toelettatura', icon: Scissors, color: 'purple' },
    { value: 'esposizione', label: 'Esposizione', icon: Trophy, color: 'yellow' },
    { value: 'calore_stimato', label: 'Calore Stimato', icon: Heart, color: 'pink' },
    { value: 'parto_stimato', label: 'Parto Stimato', icon: AlertCircle, color: 'orange' },
    { value: 'altro', label: 'Altro', icon: Calendar, color: 'gray' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSubmit = {
        dog_id: formData.dog_id || null,
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description || null,
        event_date: formData.event_date,
        completed: formData.completed,
        reminder_days: parseInt(formData.reminder_days),
        notes: formData.notes || null,
      }

      if (event?.id) {
        await db.updateEvent(event.id, dataToSubmit)
        toast.success('Evento aggiornato con successo')
      } else {
        await db.createEvent(dataToSubmit)
        toast.success('Evento aggiunto con successo')
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving event:', error)
      toast.error(error.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900">
            {event ? 'Modifica Evento' : 'Nuovo Evento'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo Evento */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Tipo di Evento</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {eventTypes.map((type) => {
                const Icon = type.icon
                const isSelected = formData.event_type === type.value
                const colorClasses = {
                  blue: 'bg-blue-500',
                  purple: 'bg-purple-500',
                  yellow: 'bg-yellow-500',
                  pink: 'bg-pink-500',
                  orange: 'bg-orange-500',
                  gray: 'bg-gray-500'
                }
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, event_type: type.value }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl font-bold transition ${
                      isSelected
                        ? `${colorClasses[type.color]} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Informazioni Base */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Informazioni</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titolo *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                  placeholder="Es: Visita veterinaria di controllo"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cane (opzionale)
                </label>
                <select
                  name="dog_id"
                  value={formData.dog_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="">Nessun cane specifico</option>
                  {dogs.map((dog) => (
                    <option key={dog.id} value={dog.id}>
                      {dog.name} - {dog.breed}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data Evento *
                </label>
                <input
                  type="date"
                  name="event_date"
                  value={formData.event_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Giorni promemoria
                </label>
                <input
                  type="number"
                  name="reminder_days"
                  value={formData.reminder_days}
                  onChange={handleChange}
                  min="0"
                  max="30"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Giorni prima dell'evento per il promemoria
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="completed"
                  checked={formData.completed}
                  onChange={handleChange}
                  id="completed"
                  className="w-5 h-5 rounded border-2 border-gray-300 text-primary-500 focus:ring-2 focus:ring-primary-200"
                />
                <label htmlFor="completed" className="text-sm font-semibold text-gray-700">
                  Evento completato
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descrizione
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
                placeholder="Aggiungi una descrizione..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
                placeholder="Note aggiuntive..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
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
              className="flex-1 px-6 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvataggio...' : event ? 'Aggiorna' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

