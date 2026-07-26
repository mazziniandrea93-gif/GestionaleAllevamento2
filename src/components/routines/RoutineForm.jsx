import { useState } from 'react'
import { X, Repeat, Brush, Utensils, Heart, Footprints, Stethoscope, ClipboardList, Search } from 'lucide-react'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'

const CATEGORY_OPTIONS = [
  { value: 'pulizia', label: 'Pulizia', icon: Brush, color: '#0ea5e9' },
  { value: 'alimentazione', label: 'Alimentazione', icon: Utensils, color: '#f59e0b' },
  { value: 'cura', label: 'Cura', icon: Heart, color: '#ec4899' },
  { value: 'uscita', label: 'Uscita', icon: Footprints, color: '#10b981' },
  { value: 'salute', label: 'Salute', icon: Stethoscope, color: '#8b5cf6' },
  { value: 'altro', label: 'Altro', icon: ClipboardList, color: '#6b7280' },
]

// Convenzione JS: 0=Domenica .. 6=Sabato. Mostrati in ordine Lun→Dom.
const WEEKDAYS = [
  { v: 1, short: 'Lun' },
  { v: 2, short: 'Mar' },
  { v: 3, short: 'Mer' },
  { v: 4, short: 'Gio' },
  { v: 5, short: 'Ven' },
  { v: 6, short: 'Sab' },
  { v: 0, short: 'Dom' },
]

export default function RoutineForm({ routine, staff = [], dogs = [], onClose, onSuccess }) {
  const isEdit = !!routine?.id
  const [loading, setLoading] = useState(false)
  const [dogSearch, setDogSearch] = useState('')

  const initialDays = routine?.days_of_week || []
  const [form, setForm] = useState({
    title: routine?.title || '',
    category: routine?.category || 'alimentazione',
    everyDay: initialDays.length === 0,
    days: initialDays,
    time_of_day: routine?.time_of_day ? routine.time_of_day.slice(0, 5) : '',
    staff_id: routine?.staff_id || '',
    dog_ids: routine?.dog_ids || [],
    notes: routine?.notes || '',
    active: routine?.active ?? true,
  })

  const change = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const toggleDay = (v) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(v) ? f.days.filter((d) => d !== v) : [...f.days, v],
    }))
  }

  const toggleDog = (id) => {
    setForm((f) => ({
      ...f,
      dog_ids: f.dog_ids.includes(id) ? f.dog_ids.filter((x) => x !== id) : [...f.dog_ids, id],
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Inserisci un titolo per la routine')
      return
    }
    if (!form.everyDay && form.days.length === 0) {
      toast.error('Seleziona almeno un giorno (o scegli "Ogni giorno")')
      return
    }
    setLoading(true)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        days_of_week: form.everyDay ? [] : [...form.days].sort((a, b) => a - b),
        time_of_day: form.time_of_day || null,
        staff_id: form.staff_id || null,
        dog_ids: form.dog_ids,
        notes: form.notes.trim() || null,
        active: form.active,
      }
      if (isEdit) {
        await db.updateRoutine(routine.id, payload)
        toast.success('Routine aggiornata')
      } else {
        await db.createRoutine(payload)
        toast.success('Routine creata')
      }
      onSuccess()
    } catch (err) {
      console.error('save routine error:', err)
      toast.error(err.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const activeStaff = staff.filter((s) => s.active !== false)
  const filteredDogs = dogs.filter((d) =>
    d.name?.toLowerCase().includes(dogSearch.toLowerCase()) ||
    d.breed?.toLowerCase().includes(dogSearch.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-2xl font-black text-dark-900 flex items-center gap-2">
            <Repeat className="w-6 h-6 text-primary-500" />
            {isEdit ? 'Modifica Routine' : 'Nuova Routine'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-6">
          {/* Categoria */}
          <div className="space-y-3">
            <h4 className="font-bold text-lg text-gray-900">Tipo di attività</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {CATEGORY_OPTIONS.map((c) => {
                const Icon = c.icon
                const selected = form.category === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl font-bold transition text-xs ${selected ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    style={selected ? { backgroundColor: c.color } : {}}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{c.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Titolo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cosa fare *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={change}
              required
              placeholder="Es. Pulizia box · Cibo ai cani · Uscita nel parco"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
            />
          </div>

          {/* Giorni */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quando</label>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={form.everyDay}
                onChange={(e) => setForm((f) => ({ ...f, everyDay: e.target.checked }))}
                className="w-5 h-5 rounded text-primary-500 focus:ring-primary-200"
              />
              <span className="text-sm font-semibold text-gray-700">Ogni giorno</span>
            </label>
            {!form.everyDay && (
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => {
                  const on = form.days.includes(d.v)
                  return (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => toggleDay(d.v)}
                      className={`w-14 py-2 rounded-xl text-sm font-bold transition ${on ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {d.short}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Orario + Assegnatario (l'assegnatario appare solo se hai dipendenti) */}
          <div className={`grid grid-cols-1 ${activeStaff.length > 0 ? 'md:grid-cols-2' : ''} gap-4`}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Orario</label>
              <input
                type="time"
                name="time_of_day"
                value={form.time_of_day}
                onChange={change}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
              <p className="text-xs text-gray-400 mt-1">Lascia vuoto se non ha un orario preciso.</p>
            </div>
            {activeStaff.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Assegna a</label>
                <select
                  name="staff_id"
                  value={form.staff_id}
                  onChange={change}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="">Nessun assegnatario</option>
                  {activeStaff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.role ? ` · ${s.role}` : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cani coinvolti (facoltativo) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Cani coinvolti <span className="text-gray-400 font-normal">(facoltativo)</span>
              {form.dog_ids.length > 0 && (
                <span className="ml-2 text-primary-600 font-bold">{form.dog_ids.length} selezionati</span>
              )}
            </label>
            {dogs.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nessun cane registrato</p>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={dogSearch}
                    onChange={(e) => setDogSearch(e.target.value)}
                    placeholder="Cerca cane..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                  {filteredDogs.map((dog) => {
                    const checked = form.dog_ids.includes(dog.id)
                    return (
                      <label
                        key={dog.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition ${
                          checked ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDog(dog.id)}
                          className="w-4 h-4 rounded text-primary-500 focus:ring-primary-200"
                        />
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dog.color || '#94a3b8' }} />
                        <span className="text-sm font-medium truncate">{dog.nickname || dog.name}</span>
                      </label>
                    )
                  })}
                  {filteredDogs.length === 0 && (
                    <p className="text-sm text-gray-400 italic col-span-full px-1">Nessun risultato per "{dogSearch}"</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Note</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={change}
              rows={2}
              placeholder="Dettagli o istruzioni (facoltativo)"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
            />
          </div>

          {/* Attiva */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="w-5 h-5 rounded text-primary-500 focus:ring-primary-200"
            />
            <span className="text-sm font-semibold text-gray-700">Routine attiva</span>
            <span className="text-xs text-gray-400">— se disattivata non genera task</span>
          </label>

          {/* Buttons */}
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
              className="flex-1 px-6 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvataggio...' : isEdit ? 'Aggiorna' : 'Crea Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
