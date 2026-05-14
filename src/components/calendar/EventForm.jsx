import { useState, useRef } from 'react'
import { X, Calendar, Stethoscope, Scissors, Trophy, Heart, AlertCircle, Search, Baby, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'

function toLocalDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const TYPE_LABELS = {
  veterinario: 'Visita veterinaria',
  toelettatura: 'Toelettatura',
  esposizione: 'Esposizione',
  calore_stimato: 'Calore stimato',
  parto_stimato: 'Parto previsto',
  altro: 'Evento',
}

function buildAutoTitle(eventType, dogIds, allDogs, matingId, allMatings) {
  if (eventType === 'parto_stimato') {
    const m = allMatings.find(x => x.id === matingId)
    if (m) return `Parto previsto: ${m.female?.name || '?'} × ${m.male?.name || '?'}`
    return 'Parto previsto'
  }
  const base = TYPE_LABELS[eventType] || eventType
  const selected = dogIds.map(id => allDogs.find(d => d.id === id)).filter(Boolean)
  if (selected.length === 0) return base
  return `${base} - ${selected.map(d => d.name).join(', ')}`
}

export default function EventForm({ event, selectedDate, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [dogSearch, setDogSearch] = useState('')
  const overlayRef = useRef(null)

  // Marker interno mating_id (non mostrato all'utente)
  const existingMatingId = event?.description?.match(/__mating_id:([a-f0-9-]+)__/)?.[1] || ''
  const existingUserDescription = (event?.description || '').replace(/__mating_id:[a-f0-9-]+__/, '').trim()
  const [selectedMatingId, setSelectedMatingId] = useState(existingMatingId)

  // Titolo auto: true solo per nuovi eventi (quelli esistenti si presuppone siano stati scelti)
  const [isTitleAuto, setIsTitleAuto] = useState(!event)

  const existingDate = event?.event_date
    ? event.event_date.split('T')[0]
    : (selectedDate ? toLocalDateString(selectedDate) : toLocalDateString(new Date()))
  const existingTime = event?.event_date?.includes('T')
    ? event.event_date.split('T')[1]?.slice(0, 5)
    : ''

  const [formData, setFormData] = useState({
    dog_ids: event?.dog_ids || [],
    event_type: event?.event_type || 'veterinario',
    title: event?.title || '',
    description: existingUserDescription,
    event_date: existingDate,
    event_time: existingTime,
    completed: event?.completed || false,
    reminder_days: event?.reminder_days || 3,
  })

  const { data: dogs = [] } = useQuery({ queryKey: ['dogs'], queryFn: () => db.getDogs() })
  const { data: matings = [] } = useQuery({ queryKey: ['matings'], queryFn: () => db.getMatings() })

  const baseDogs = formData.event_type === 'calore_stimato'
    ? dogs.filter(d => d.gender?.toLowerCase() === 'femmina' || d.gender?.toLowerCase() === 'f')
    : dogs

  const filteredDogs = baseDogs.filter(dog =>
    dog.name.toLowerCase().includes(dogSearch.toLowerCase()) ||
    (dog.breed && dog.breed.toLowerCase().includes(dogSearch.toLowerCase()))
  )

  function applyAutoTitle(eventType, dogIds, matingId) {
    const title = buildAutoTitle(eventType, dogIds, dogs, matingId, matings)
    setFormData(prev => ({ ...prev, title }))
  }

  function handleEventTypeChange(newType) {
    setFormData(prev => {
      const next = { ...prev, event_type: newType }
      if (isTitleAuto) {
        next.title = buildAutoTitle(newType, prev.dog_ids, dogs, selectedMatingId, matings)
      }
      return next
    })
  }

  function handleMatingSelect(matingId) {
    setSelectedMatingId(matingId)
    const m = matings.find(x => x.id === matingId)
    setFormData(prev => {
      const next = {
        ...prev,
        dog_ids: m ? [m.female_id, m.male_id].filter(Boolean) : [],
        event_date: m?.expected_delivery || prev.event_date,
      }
      if (isTitleAuto) {
        next.title = buildAutoTitle(prev.event_type, next.dog_ids, dogs, matingId, matings)
      }
      return next
    })
  }

  function toggleDog(dogId) {
    setFormData(prev => {
      const newIds = prev.dog_ids.includes(dogId)
        ? prev.dog_ids.filter(id => id !== dogId)
        : [...prev.dog_ids, dogId]
      const next = { ...prev, dog_ids: newIds }
      if (isTitleAuto) {
        next.title = buildAutoTitle(prev.event_type, newIds, dogs, selectedMatingId, matings)
      }
      return next
    })
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleTitleChange = (e) => {
    setIsTitleAuto(false)
    handleChange(e)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const eventDatetime = formData.event_time
        ? `${formData.event_date}T${formData.event_time}:00`
        : formData.event_date

      const matingMarker = selectedMatingId ? `__mating_id:${selectedMatingId}__` : ''
      const userDesc = formData.description.trim()
      const fullDescription = [matingMarker, userDesc].filter(Boolean).join('\n') || null

      const dataToSubmit = {
        dog_ids: formData.dog_ids,
        event_type: formData.event_type,
        title: formData.title,
        description: fullDescription,
        event_date: eventDatetime,
        completed: formData.completed,
        reminder_days: parseInt(formData.reminder_days),
      }

      if (event?.id) {
        await db.updateEvent(event.id, dataToSubmit)
        toast.success('Evento aggiornato con successo')
        if (selectedMatingId) {
          await db.updateMating(selectedMatingId, { expected_delivery: formData.event_date })
        }
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

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  const colorClasses = {
    blue: 'bg-blue-500', purple: 'bg-purple-500', yellow: 'bg-yellow-500',
    pink: 'bg-pink-500', orange: 'bg-orange-500', gray: 'bg-gray-500',
  }

  const eventTypes = [
    { value: 'veterinario', label: 'Veterinario', icon: Stethoscope, color: 'blue' },
    { value: 'toelettatura', label: 'Toelettatura', icon: Scissors, color: 'purple' },
    { value: 'esposizione', label: 'Esposizione', icon: Trophy, color: 'yellow' },
    { value: 'calore_stimato', label: 'Calore Stimato', icon: Heart, color: 'pink' },
    { value: 'parto_stimato', label: 'Parto Stimato', icon: AlertCircle, color: 'orange' },
    { value: 'altro', label: 'Altro', icon: Calendar, color: 'gray' },
  ]

  return (
    <div ref={overlayRef} onClick={handleOverlayClick} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900">{event ? 'Modifica Evento' : 'Nuovo Evento'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Tipo Evento */}
          <div className="space-y-3">
            <h4 className="font-bold text-lg text-gray-900">Tipo di Evento</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {eventTypes.map((type) => {
                const Icon = type.icon
                const isSelected = formData.event_type === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleEventTypeChange(type.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl font-bold transition ${
                      isSelected ? `${colorClasses[type.color]} text-white` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selezione accoppiamento (parto_stimato) */}
          {formData.event_type === 'parto_stimato' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Accoppiamento</label>
              {matings.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nessun accoppiamento registrato</p>
              ) : (
                <select
                  value={selectedMatingId}
                  onChange={(e) => handleMatingSelect(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition"
                >
                  <option value="">— Seleziona accoppiamento —</option>
                  {matings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.female?.name} × {m.male?.name}
                      {m.mating_date ? ` — ${new Date(m.mating_date).toLocaleDateString('it-IT')}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedMatingId && (() => {
                const m = matings.find(x => x.id === selectedMatingId)
                if (!m) return null
                return (
                  <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 rounded-xl border-2 border-orange-200">
                    <Baby className="w-5 h-5 text-orange-500 shrink-0" />
                    <div className="text-sm">
                      <span className="font-bold text-pink-600">{m.female?.name}</span>
                      <span className="text-gray-400 mx-1">×</span>
                      <span className="font-bold text-blue-600">{m.male?.name}</span>
                      {m.expected_delivery && (
                        <span className="block text-xs text-gray-500 mt-0.5">
                          Parto previsto: {new Date(m.expected_delivery).toLocaleDateString('it-IT')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Selezione cani (tutti gli altri tipi) */}
          {formData.event_type !== 'parto_stimato' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {formData.event_type === 'calore_stimato' ? 'Femmina' : 'Cani (opzionale)'}
                {formData.dog_ids.length > 0 && (
                  <span className="ml-2 text-primary-600 font-bold">{formData.dog_ids.length} selezionati</span>
                )}
                {formData.event_type === 'calore_stimato' && (
                  <span className="ml-2 text-pink-500 text-xs font-semibold">· solo femmine</span>
                )}
              </label>
              {dogs.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nessun cane registrato</p>
              ) : (
                <>
                  <div className="relative">
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
                            isChecked ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDog(dog.id)}
                            className="w-4 h-4 rounded text-primary-500 focus:ring-primary-200"
                          />
                          <span className="text-sm font-medium">
                            {dog.name}
                            {dog.breed && <span className="text-xs text-gray-400 block">{dog.breed}</span>}
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
          )}

          {/* Informazioni */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900">Informazioni</h4>

            {/* Titolo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Titolo *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleTitleChange}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                placeholder="Titolo evento"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Data Evento *</label>
                <input
                  type="date"
                  name="event_date"
                  value={formData.event_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                />
              </div>

              {/* Ora (non per parto stimato) */}
              {formData.event_type !== 'parto_stimato' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ora (opzionale)</label>
                <input
                  type="time"
                  name="event_time"
                  value={formData.event_time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                />
              </div>
              )}

              {/* Promemoria */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Giorni promemoria</label>
                <input
                  type="number"
                  name="reminder_days"
                  value={formData.reminder_days}
                  onChange={handleChange}
                  min="0"
                  max="30"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                />
                <p className="text-xs text-gray-500 mt-1">Giorni prima dell'evento per il promemoria</p>
              </div>

              {/* Completato */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  name="completed"
                  checked={formData.completed}
                  onChange={handleChange}
                  id="completed"
                  className="w-5 h-5 rounded border-2 border-gray-300 text-primary-500 focus:ring-2 focus:ring-primary-200"
                />
                <label htmlFor="completed" className="text-sm font-semibold text-gray-700">Evento completato</label>
              </div>
            </div>

            {/* Descrizione */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Descrizione</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
                placeholder="Aggiungi una descrizione..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition">
              Annulla
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-6 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Salvataggio...' : event ? 'Aggiorna' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
