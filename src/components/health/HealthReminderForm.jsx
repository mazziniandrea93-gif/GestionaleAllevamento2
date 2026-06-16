import { useState } from 'react'
import { X, Syringe, Bug, Pill, HelpCircle, Search, Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { db, addInterval } from '@/lib/supabase'
import toast from 'react-hot-toast'

const REMINDER_TYPES = [
  { value: 'vaccinazione', label: 'Vaccino', icon: Syringe, color: '#3b82f6' },
  { value: 'antiparassitario', label: 'Antiparassitario', icon: Bug, color: '#10b981' },
  { value: 'sverminazione', label: 'Sverminazione', icon: Pill, color: '#f97316' },
  { value: 'altro', label: 'Altro', icon: HelpCircle, color: '#6b7280' },
]

export default function HealthReminderForm({ reminder, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [dogSearch, setDogSearch] = useState('')

  const isEdit = !!reminder?.id

  const [formData, setFormData] = useState({
    dog_ids: reminder?.dog_id ? [reminder.dog_id] : [],
    reminder_type: reminder?.reminder_type || 'vaccinazione',
    description: reminder?.description || '',
    interval_unit: reminder?.interval_unit || 'mesi',
    interval_value: reminder?.interval_value || 12,
    next_due_date: reminder?.next_due_date || new Date().toISOString().split('T')[0],
    reminder_days: reminder?.reminder_days ?? 7,
  })

  const { data: dogs = [] } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => db.getDogs(),
  })

  const filteredDogs = dogs.filter(dog =>
    dog.name.toLowerCase().includes(dogSearch.toLowerCase()) ||
    (dog.breed && dog.breed.toLowerCase().includes(dogSearch.toLowerCase()))
  )

  const toggleDog = (dogId) => {
    setFormData(prev => ({
      ...prev,
      dog_ids: prev.dog_ids.includes(dogId)
        ? prev.dog_ids.filter(id => id !== dogId)
        : [...prev.dog_ids, dogId],
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Anteprima della scadenza successiva dopo questa
  const nextAfter = formData.next_due_date
    ? addInterval(new Date(formData.next_due_date + 'T00:00:00'), formData.interval_unit, formData.interval_value)
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.dog_ids.length === 0) {
      toast.error('Seleziona almeno un cane')
      return
    }
    if (!formData.description.trim()) {
      toast.error('Inserisci una descrizione')
      return
    }
    setLoading(true)

    try {
      const base = {
        reminder_type: formData.reminder_type,
        description: formData.description.trim(),
        interval_unit: formData.interval_unit,
        interval_value: parseInt(formData.interval_value) || 1,
        next_due_date: formData.next_due_date,
        reminder_days: parseInt(formData.reminder_days) || 0,
      }

      if (isEdit) {
        await db.updateHealthReminder(reminder.id, { ...base, dog_id: formData.dog_ids[0] })
        toast.success('Promemoria aggiornato')
      } else {
        for (const dogId of formData.dog_ids) {
          await db.createHealthReminder({ ...base, dog_id: dogId })
        }
        toast.success(
          formData.dog_ids.length > 1
            ? `${formData.dog_ids.length} promemoria creati`
            : 'Promemoria creato'
        )
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving health reminder:', error)
      toast.error(error.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-500" />
            {isEdit ? 'Modifica Promemoria' : 'Nuovo Promemoria Ricorrente'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Tipo */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Tipo di Scadenza</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {REMINDER_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = formData.reminder_type === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, reminder_type: type.value }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl font-bold transition ${isSelected ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    style={isSelected ? { backgroundColor: type.color } : {}}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cani */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Cane *
              {formData.dog_ids.length > 0 && (
                <span className="ml-2 text-primary-600 font-bold">{formData.dog_ids.length} selezionati</span>
              )}
            </label>

            {dogs.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nessun cane registrato</p>
            ) : (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={dogSearch}
                    onChange={(e) => setDogSearch(e.target.value)}
                    placeholder="Cerca cane..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredDogs.map((dog) => {
                    const isChecked = formData.dog_ids.includes(dog.id)
                    return (
                      <label
                        key={dog.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition ${
                          isChecked
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDog(dog.id)}
                          className="w-4 h-4 rounded text-primary-500 focus:ring-primary-200"
                        />
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dog.color || '#94a3b8' }}
                        />
                        <span className="text-sm font-medium min-w-0">
                          {dog.name}
                          {dog.breed && <span className="text-xs text-gray-400 block truncate">{dog.breed}</span>}
                        </span>
                      </label>
                    )
                  })}
                  {filteredDogs.length === 0 && dogSearch && (
                    <p className="text-sm text-gray-400 italic col-span-full px-1">Nessun risultato per "{dogSearch}"</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Descrizione *</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              placeholder={
                formData.reminder_type === 'vaccinazione' ? 'Es: Vaccino antirabbica' :
                formData.reminder_type === 'antiparassitario' ? 'Es: Pipetta antipulci' :
                formData.reminder_type === 'sverminazione' ? 'Es: Sverminazione' :
                'Es: Controllo periodico'
              }
            />
          </div>

          {/* Ricorrenza + prossima scadenza */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ricorrenza (ogni)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="interval_value"
                  value={formData.interval_value}
                  onChange={handleChange}
                  min="1"
                  className="w-24 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-center"
                />
                <select
                  name="interval_unit"
                  value={formData.interval_unit}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="giorni">giorni</option>
                  <option value="mesi">mesi</option>
                  <option value="anni">anni</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Prossima scadenza *</label>
              <input
                type="date"
                name="next_due_date"
                value={formData.next_due_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
            </div>
          </div>

          {/* Giorni di preavviso */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Avvisami quanti giorni prima
            </label>
            <input
              type="number"
              name="reminder_days"
              value={formData.reminder_days}
              onChange={handleChange}
              min="0"
              className="w-32 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-center"
            />
            <p className="text-xs text-gray-400 mt-1">
              Riceverai una notifica push a questo numero di giorni e, in automatico, anche 2 giorni prima.
            </p>
          </div>

          {/* Anteprima */}
          {nextAfter && (
            <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-2xl border-2 border-primary-100 text-sm">
              <span className="text-primary-600 font-semibold">Dopo questa, la successiva sarà:</span>
              <span className="text-primary-700 font-black">
                {nextAfter.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}

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
              {loading ? 'Salvataggio...' : isEdit ? 'Aggiorna' : 'Crea Promemoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
