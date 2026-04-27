import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileDown,
  Calendar,
  Heart,
  Activity,
  Award,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Stethoscope,
  Scissors,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  User,
  Star,
  MessageSquare,
  X,
} from 'lucide-react'
import { differenceInYears, differenceInMonths, format } from 'date-fns'
import { it } from 'date-fns/locale'
import toast from 'react-hot-toast'
import DogForm from '@/components/dogs/DogForm'
import DogMeasurements from '@/components/dogs/DogMeasurements'
import DogGrowthChart from '@/components/dogs/DogGrowthChart'
import DogPdfModal from '@/components/dogs/DogPdfModal'

const EVENT_TYPE_CONFIG = {
  veterinario:    { label: 'Veterinario',    icon: Stethoscope, bg: 'bg-blue-100',   text: 'text-blue-700'   },
  toelettatura:   { label: 'Toelettatura',   icon: Scissors,    bg: 'bg-purple-100', text: 'text-purple-700' },
  esposizione:    { label: 'Esposizione',    icon: Trophy,      bg: 'bg-yellow-100', text: 'text-yellow-700' },
  calore_stimato: { label: 'Calore Stimato', icon: Heart,       bg: 'bg-pink-100',   text: 'text-pink-700'   },
  parto_stimato:  { label: 'Parto Stimato',  icon: AlertCircle, bg: 'bg-orange-100', text: 'text-orange-700' },
  altro:          { label: 'Altro',           icon: Calendar,    bg: 'bg-gray-100',   text: 'text-gray-700'   },
}

function DogHistory({ dogEvents, heatCycles }) {
  const [activeFilter, setActiveFilter] = useState('tutti')

  // Unifica eventi calendario e calori in un unico array ordinato per data
  const allItems = [
    ...dogEvents.map(e => ({
      id: `event-${e.id}`,
      date: e.event_date,
      title: e.title,
      description: e.description,
      type: e.event_type,
      completed: e.completed,
      source: 'calendar',
    })),
    ...heatCycles.map(h => ({
      id: `heat-${h.id}`,
      date: h.start_date,
      title: 'Calore',
      description: h.notes || null,
      type: 'calore_stimato',
      completed: true,
      source: 'heat',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  // Ricava solo i tipi effettivamente presenti per mostrare i filtri pertinenti
  const presentTypes = ['tutti', ...new Set(allItems.map(i => i.type))]

  const filtered = activeFilter === 'tutti'
    ? allItems
    : allItems.filter(i => i.type === activeFilter)

  if (allItems.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-8 h-8 text-purple-600" />
        </div>
        <p className="font-bold text-gray-700 mb-1">Nessun evento registrato</p>
        <p className="text-gray-500 text-sm">Gli eventi del calendario associati a questo cane appariranno qui</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-900">Storico Eventi</h3>
        <span className="text-sm text-gray-400 font-semibold">{filtered.length} eventi</span>
      </div>

      {/* Filtri per tipo */}
      <div className="flex flex-wrap gap-2">
        {presentTypes.map((type) => {
          const isAll = type === 'tutti'
          const config = isAll ? null : EVENT_TYPE_CONFIG[type] || EVENT_TYPE_CONFIG.altro
          const Icon = config?.icon
          const isActive = activeFilter === type
          return (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                isActive
                  ? isAll
                    ? 'bg-primary-500 text-white'
                    : `${config.bg} ${config.text} ring-2 ring-offset-1 ring-current`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {isAll ? 'Tutti' : config.label}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 font-semibold">
          Nessun evento di questo tipo
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const config = EVENT_TYPE_CONFIG[item.type] || EVENT_TYPE_CONFIG.altro
            const Icon = config.icon
            const dateStr = item.date?.includes('T')
              ? format(new Date(item.date), 'dd MMM yyyy · HH:mm', { locale: it })
              : format(new Date(item.date + 'T00:00:00'), 'dd MMM yyyy', { locale: it })

            return (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon className={`w-5 h-5 ${config.text}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${config.bg} ${config.text}`}>
                      {config.label}
                    </span>
                    {item.completed ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Completato
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-orange-500 font-semibold">
                        <Clock className="w-3 h-3" /> In programma
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-gray-900">{item.title}</p>
                  {item.description && !item.description.includes('__heat_dog:') && (
                    <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
                  )}
                  <p className="text-xs text-gray-400 font-semibold mt-1">{dateStr}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DogHeatTab({ heatCycles, dogId, dogName, onAdded }) {
  const queryClient = useQueryClient()

  // --- Calore reale ---
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ start_date: '', end_date: '', notes: '' })
  const [editingHeatId, setEditingHeatId] = useState(null)
  const [editHeatForm, setEditHeatForm] = useState({ start_date: '', end_date: '', notes: '' })

  // --- Calori stimati ---
  const [showAddEstimated, setShowAddEstimated] = useState(false)
  const [newEstimatedDate, setNewEstimatedDate] = useState('')
  const [savingEstimated, setSavingEstimated] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [editingEventDate, setEditingEventDate] = useState('')

  // Recupera tutti gli eventi calore_stimato dal calendario per questo cane
  const { data: heatEvents = [], refetch: refetchHeatEvents } = useQuery({
    queryKey: ['heatEvents', dogId],
    queryFn: () => db.getHeatEventsByDogId(dogId),
    enabled: !!dogId,
  })

  // Calcola statistiche sugli intercicli
  const realDates = [...heatCycles]
    .map(h => new Date(h.start_date))
    .sort((a, b) => b - a)

  let avgDays = null
  let autoNextDate = null

  if (realDates.length >= 2) {
    const diffs = []
    for (let i = 0; i < realDates.length - 1; i++) {
      diffs.push((realDates[i] - realDates[i + 1]) / (1000 * 60 * 60 * 24))
    }
    avgDays = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
    autoNextDate = new Date(realDates[0].getTime() + avgDays * 24 * 60 * 60 * 1000)
  } else if (realDates.length === 1) {
    avgDays = 180
    autoNextDate = new Date(realDates[0].getTime() + 180 * 24 * 60 * 60 * 1000)
  }

  const suggestedDateStr = autoNextDate ? autoNextDate.toISOString().split('T')[0] : ''

  function invalidate() {
    refetchHeatEvents()
    queryClient.invalidateQueries(['events'])
  }

  // --- Aggiungi calore stimato ---
  async function handleAddEstimated(e) {
    e.preventDefault()
    setSavingEstimated(true)
    try {
      await db.createEvent({
        title: `Calore stimato: ${dogName}`,
        description: `__heat_dog:${dogId}__`,
        event_date: newEstimatedDate,
        event_type: 'calore_stimato',
        dog_ids: [dogId],
        completed: false,
        reminder_days: 7,
      })
      toast.success('Calore stimato aggiunto al calendario')
      setShowAddEstimated(false)
      setNewEstimatedDate('')
      invalidate()
    } catch (err) {
      console.error(err)
      toast.error('Errore nel salvataggio')
    } finally {
      setSavingEstimated(false)
    }
  }

  // --- Modifica calore stimato ---
  async function handleEditEstimated(e) {
    e.preventDefault()
    setSavingEstimated(true)
    try {
      await db.updateEvent(editingEventId, {
        event_date: editingEventDate,
        title: `Calore stimato: ${dogName}`,
      })
      toast.success('Calore stimato aggiornato')
      setEditingEventId(null)
      invalidate()
    } catch (err) {
      console.error(err)
      toast.error('Errore nel salvataggio')
    } finally {
      setSavingEstimated(false)
    }
  }

  // --- Elimina calore stimato ---
  async function handleDeleteEstimated(id) {
    try {
      await db.deleteEvent(id)
      toast.success('Calore stimato rimosso')
      invalidate()
    } catch (err) {
      console.error(err)
      toast.error('Errore nella rimozione')
    }
  }

  // --- Modifica calore reale ---
  async function handleEditHeat(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const duration_days = editHeatForm.end_date
        ? Math.round((new Date(editHeatForm.end_date) - new Date(editHeatForm.start_date)) / (1000 * 60 * 60 * 24))
        : null
      await db.updateHeatCycle(editingHeatId, {
        start_date: editHeatForm.start_date,
        end_date: editHeatForm.end_date || null,
        duration_days,
        notes: editHeatForm.notes || null,
      })
      toast.success('Calore aggiornato')
      setEditingHeatId(null)
      onAdded()
    } catch (err) {
      console.error(err)
      toast.error('Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  // --- Elimina calore reale ---
  async function handleDeleteHeat(id) {
    if (!window.confirm('Eliminare questo calore reale?')) return
    try {
      await db.deleteHeatCycle(id)
      toast.success('Calore eliminato')
      onAdded()
    } catch (err) {
      console.error(err)
      toast.error('Errore nella rimozione')
    }
  }

  // --- Salva calore reale + aggiunge automaticamente il prossimo stimato ---
  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const duration_days = form.end_date
        ? Math.round((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24))
        : null
      await db.createHeatCycle({
        dog_id: dogId,
        start_date: form.start_date,
        end_date: form.end_date || null,
        duration_days,
        notes: form.notes || null,
      })

      // Calcola prossimo calore includendo il nuovo ciclo
      const allDates = [...heatCycles.map(h => new Date(h.start_date)), new Date(form.start_date)]
        .sort((a, b) => b - a)
      let computedNext
      if (allDates.length >= 2) {
        const diffs = []
        for (let i = 0; i < allDates.length - 1; i++) {
          diffs.push((allDates[i] - allDates[i + 1]) / (1000 * 60 * 60 * 24))
        }
        const avg = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
        computedNext = new Date(allDates[0].getTime() + avg * 24 * 60 * 60 * 1000)
      } else {
        computedNext = new Date(new Date(form.start_date).getTime() + 180 * 24 * 60 * 60 * 1000)
      }

      await db.createEvent({
        title: `Calore stimato: ${dogName}`,
        description: `__heat_dog:${dogId}__`,
        event_date: computedNext.toISOString().split('T')[0],
        event_type: 'calore_stimato',
        dog_ids: [dogId],
        completed: false,
        reminder_days: 7,
      })

      toast.success('Calore registrato e nuovo stimato aggiunto al calendario')
      setForm({ start_date: '', end_date: '', notes: '' })
      setShowForm(false)
      onAdded()
      invalidate()
    } catch (err) {
      console.error(err)
      toast.error(err?.message || JSON.stringify(err) || 'Errore')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── CALORI STIMATI ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">Calori stimati</h3>
          <button
            onClick={() => {
              setNewEstimatedDate(suggestedDateStr)
              setShowAddEstimated(v => !v)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Aggiungi stima
          </button>
        </div>

        {showAddEstimated && (
          <form onSubmit={handleAddEstimated} className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-pink-700 mb-1">Data calore stimato</label>
              <input
                type="date"
                required
                value={newEstimatedDate}
                onChange={e => setNewEstimatedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-pink-300 focus:border-pink-500 focus:outline-none text-sm bg-white"
              />
            </div>
            <button type="button" onClick={() => setShowAddEstimated(false)}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
              Annulla
            </button>
            <button type="submit" disabled={savingEstimated}
              className="px-4 py-2 bg-pink-500 text-white rounded-xl font-bold text-sm hover:bg-pink-600 transition disabled:opacity-50">
              {savingEstimated ? 'Salvo…' : 'Salva'}
            </button>
          </form>
        )}

        {heatEvents.length === 0 && !showAddEstimated ? (
          <p className="text-gray-500 text-sm py-2">Nessun calore stimato nel calendario. Usare il pulsante per aggiungerne uno.</p>
        ) : (
          <div className="space-y-2">
            {heatEvents.map(ev => {
              const evDate = new Date(ev.event_date.split('T')[0] + 'T00:00:00')
              const evPast = evDate < new Date()
              const evDays = Math.round((evDate - new Date()) / (1000 * 60 * 60 * 24))
              return (
                <div key={ev.id} className={`rounded-2xl border-2 p-4 ${evPast ? 'bg-red-50 border-red-200' : 'bg-pink-50 border-pink-200'}`}>
                  {editingEventId === ev.id ? (
                    <form onSubmit={handleEditEstimated} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <input
                          type="date"
                          required
                          value={editingEventDate}
                          onChange={e => setEditingEventDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 border-pink-300 focus:border-pink-500 focus:outline-none text-sm bg-white"
                        />
                      </div>
                      <button type="button" onClick={() => setEditingEventId(null)}
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
                        Annulla
                      </button>
                      <button type="submit" disabled={savingEstimated}
                        className="px-3 py-2 bg-pink-500 text-white rounded-xl font-bold text-sm hover:bg-pink-600 disabled:opacity-50">
                        Salva
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${evPast ? 'bg-red-100' : 'bg-pink-100'}`}>
                        <Heart className={`w-4 h-4 ${evPast ? 'text-red-500' : 'text-pink-500'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold ${evPast ? 'text-red-700' : 'text-pink-700'}`}>
                          {format(evDate, 'dd MMMM yyyy', { locale: it })}
                        </p>
                        <p className={`text-xs font-semibold ${evPast ? 'text-red-400' : 'text-gray-400'}`}>
                          {evPast ? `In ritardo di ${Math.abs(evDays)} giorni` : `Tra ${evDays} giorni`}
                        </p>
                      </div>
                      <button onClick={() => { setEditingEventId(ev.id); setEditingEventDate(ev.event_date.split('T')[0]) }}
                        className="p-2 hover:bg-white rounded-xl transition text-pink-500">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteEstimated(ev.id)}
                        className="p-2 hover:bg-white rounded-xl transition text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── STATISTICHE ── */}
      {heatCycles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 text-center">
            <p className="text-xs font-bold text-pink-400 uppercase mb-1">Calori registrati</p>
            <p className="text-3xl font-black text-pink-600">{heatCycles.length}</p>
          </div>
          {avgDays && (
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center">
              <p className="text-xs font-bold text-purple-400 uppercase mb-1">Media interciclo</p>
              <p className="text-3xl font-black text-purple-600">{avgDays}</p>
              <p className="text-xs text-purple-400">giorni</p>
            </div>
          )}
          {heatCycles[0]?.duration_days && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
              <p className="text-xs font-bold text-rose-400 uppercase mb-1">Durata ultimo</p>
              <p className="text-3xl font-black text-rose-600">{heatCycles[0].duration_days}</p>
              <p className="text-xs text-rose-400">giorni</p>
            </div>
          )}
        </div>
      )}

      {/* ── CALORI REALI ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-gray-900">Calori reali</h3>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Aggiungi calore
        </button>
      </div>

      {/* Form aggiunta calore reale */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-5 space-y-4">
          <h4 className="font-bold text-pink-800">Nuovo calore reale</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Data inizio *</label>
              <input type="date" required value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Data fine (opz.)</label>
              <input type="date" value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Note</label>
            <input type="text" value={form.notes} placeholder="Es: normale, abbondante…"
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none text-sm" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
              Annulla
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 text-sm disabled:opacity-50">
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      )}

      {/* Lista calori reali */}
      {heatCycles.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Heart className="w-7 h-7 text-pink-400" />
          </div>
          <p className="font-bold text-gray-700 mb-1">Nessun calore registrato</p>
          <p className="text-gray-500 text-sm">Usa il pulsante per aggiungere il primo calore reale</p>
        </div>
      ) : (
        <div className="space-y-3">
          {heatCycles.map(h => {
            const dur = h.duration_days ?? null
            return (
              <div key={h.id} className="bg-pink-50 border border-pink-200 rounded-2xl p-4">
                {editingHeatId === h.id ? (
                  <form onSubmit={handleEditHeat} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-pink-700 mb-1">Data inizio *</label>
                        <input type="date" required value={editHeatForm.start_date}
                          onChange={e => setEditHeatForm(f => ({ ...f, start_date: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-pink-700 mb-1">Data fine (opz.)</label>
                        <input type="date" value={editHeatForm.end_date}
                          onChange={e => setEditHeatForm(f => ({ ...f, end_date: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none text-sm" />
                      </div>
                    </div>
                    <input type="text" value={editHeatForm.notes} placeholder="Note…"
                      onChange={e => setEditHeatForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none text-sm" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingHeatId(null)}
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
                        Annulla
                      </button>
                      <button type="submit" disabled={saving}
                        className="flex-1 px-3 py-2 bg-pink-500 text-white rounded-xl font-bold text-sm hover:bg-pink-600 disabled:opacity-50">
                        {saving ? 'Salvo…' : 'Salva'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-pink-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-pink-200 text-pink-800">Calore reale</span>
                      </div>
                      <p className="font-bold text-gray-900">
                        {format(new Date(h.start_date + 'T00:00:00'), 'dd MMM yyyy', { locale: it })}
                        {h.end_date && (
                          <span className="text-gray-500 font-semibold text-sm">
                            {' '}→ {format(new Date(h.end_date + 'T00:00:00'), 'dd MMM yyyy', { locale: it })}
                          </span>
                        )}
                      </p>
                      {dur && <p className="text-xs text-gray-500 mt-0.5">Durata: {dur} giorni</p>}
                      {h.notes && <p className="text-sm text-gray-600 mt-0.5">{h.notes}</p>}
                    </div>
                    <button onClick={() => { setEditingHeatId(h.id); setEditHeatForm({ start_date: h.start_date, end_date: h.end_date || '', notes: h.notes || '' }) }}
                      className="p-2 hover:bg-white rounded-xl transition text-pink-500 flex-shrink-0">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteHeat(h.id)}
                      className="p-2 hover:bg-white rounded-xl transition text-red-400 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const GRADES = ['Eccellente', 'Molto Buono', 'Buono', 'Sufficiente', 'Qualificato', 'Fuori Concorso', 'Non Classificato']

const GRADE_COLORS = {
  'Eccellente':       'bg-emerald-100 text-emerald-700',
  'Molto Buono':      'bg-blue-100 text-blue-700',
  'Buono':            'bg-cyan-100 text-cyan-700',
  'Sufficiente':      'bg-yellow-100 text-yellow-700',
  'Qualificato':      'bg-purple-100 text-purple-700',
  'Fuori Concorso':   'bg-gray-100 text-gray-600',
  'Non Classificato': 'bg-red-100 text-red-600',
}

function DogJudgesTab({ dogId }) {
  const queryClient = useQueryClient()

  const { data: judges = [], refetch: refetchJudges } = useQuery({
    queryKey: ['judges'],
    queryFn: db.getJudges,
  })

  const { data: judgments = [], refetch: refetchJudgments } = useQuery({
    queryKey: ['judgments', dogId],
    queryFn: () => db.getJudgments(dogId),
    enabled: !!dogId,
  })

  const emptyForm = {
    judge_id: '',
    judgment_date: new Date().toISOString().split('T')[0],
    show_name: '',
    grade: '',
    judgment_text: '',
    our_comments: '',
  }

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [judgeSearch, setJudgeSearch] = useState('')
  const [showNewJudge, setShowNewJudge] = useState(false)
  const [newJudge, setNewJudge] = useState({ name: '', nationality: '', specialization: '' })
  const [savingJudge, setSavingJudge] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [deletingId, setDeletingId] = useState(null)

  const filteredJudges = judges.filter(j =>
    j.name.toLowerCase().includes(judgeSearch.toLowerCase())
  )

  async function handleCreateJudge(e) {
    e.preventDefault()
    setSavingJudge(true)
    try {
      const created = await db.createJudge(newJudge)
      toast.success('Giudice creato')
      await refetchJudges()
      setForm(f => ({ ...f, judge_id: created.id }))
      setJudgeSearch(created.name)
      setShowNewJudge(false)
      setNewJudge({ name: '', nationality: '', specialization: '' })
    } catch (err) {
      toast.error('Errore nella creazione del giudice')
    } finally {
      setSavingJudge(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.judge_id) { toast.error('Seleziona un giudice'); return }
    setSaving(true)
    try {
      await db.createJudgment({ ...form, dog_id: dogId })
      toast.success('Giudizio salvato')
      setForm(emptyForm)
      setJudgeSearch('')
      setShowForm(false)
      refetchJudgments()
    } catch (err) {
      toast.error('Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    if (!editForm.judge_id) { toast.error('Seleziona un giudice'); return }
    setSaving(true)
    try {
      await db.updateJudgment(editingId, editForm)
      toast.success('Giudizio aggiornato')
      setEditingId(null)
      refetchJudgments()
    } catch (err) {
      toast.error('Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Eliminare questo giudizio?')) return
    setDeletingId(id)
    try {
      await db.deleteJudgment(id)
      toast.success('Giudizio eliminato')
      refetchJudgments()
    } catch (err) {
      toast.error('Errore nella rimozione')
    } finally {
      setDeletingId(null)
    }
  }

  function JudgeSelector({ value, onSelect, search, onSearch }) {
    const [open, setOpen] = useState(false)
    const selected = judges.find(j => j.id === value)
    return (
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Giudice *</label>
        <div
          className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus-within:border-yellow-400 bg-white cursor-pointer flex items-center gap-2"
          onClick={() => setOpen(v => !v)}
        >
          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {selected
            ? <span className="font-semibold text-gray-900 text-sm">{selected.name}{selected.nationality ? ` (${selected.nationality})` : ''}</span>
            : <span className="text-gray-400 text-sm">Cerca o seleziona giudice…</span>
          }
        </div>
        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border-2 border-gray-200 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                type="text"
                placeholder="Cerca giudice…"
                value={search}
                onChange={e => onSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400"
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredJudges.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-400 text-center">Nessun giudice trovato</div>
              ) : (
                filteredJudges.map(j => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => { onSelect(j.id); onSearch(j.name); setOpen(false) }}
                    className="w-full text-left px-3 py-2.5 hover:bg-yellow-50 transition text-sm"
                  >
                    <p className="font-semibold text-gray-900">{j.name}</p>
                    {(j.nationality || j.specialization) && (
                      <p className="text-xs text-gray-400">{[j.nationality, j.specialization].filter(Boolean).join(' · ')}</p>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => { setShowNewJudge(true); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-yellow-700 hover:bg-yellow-50 transition"
              >
                <Plus className="w-4 h-4" /> Crea nuovo giudice
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function JudgmentForm({ formData, onSubmit, onChange, onJudgeSelect, search, onSearchChange, submitLabel }) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <JudgeSelector
            value={formData.judge_id}
            onSelect={id => onChange('judge_id', id)}
            search={search}
            onSearch={onSearchChange}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Data esposizione *</label>
            <input type="date" required value={formData.judgment_date}
              onChange={e => onChange('judgment_date', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome esposizione</label>
            <input type="text" value={formData.show_name} placeholder="Es: Esposizione Internazionale Milano"
              onChange={e => onChange('show_name', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Qualifica</label>
            <select value={formData.grade} onChange={e => onChange('grade', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm bg-white">
              <option value="">— Seleziona qualifica —</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Giudizio del giudice</label>
          <textarea rows={3} value={formData.judgment_text} placeholder="Testo del giudizio ufficiale…"
            onChange={e => onChange('judgment_text', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm resize-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nostri commenti</label>
          <textarea rows={2} value={formData.our_comments} placeholder="Note personali, considerazioni interne…"
            onChange={e => onChange('our_comments', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm resize-none" />
        </div>
        <div className="flex gap-3">
          <button type="button"
            onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); setJudgeSearch('') }}
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
            Annulla
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 text-sm disabled:opacity-50">
            {saving ? 'Salvataggio…' : submitLabel}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-900">Giudizi</h3>
        {!showForm && !editingId && (
          <button
            onClick={() => { setShowForm(true); setForm(emptyForm); setJudgeSearch('') }}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> Aggiungi giudizio
          </button>
        )}
      </div>

      {/* Modal crea nuovo giudice */}
      {showNewJudge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-lg font-black text-gray-900">Nuovo giudice</h4>
              <button onClick={() => setShowNewJudge(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateJudge} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label>
                <input type="text" required value={newJudge.name} placeholder="Nome e cognome"
                  onChange={e => setNewJudge(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nazionalità</label>
                <input type="text" value={newJudge.nationality} placeholder="Es: Italiano, Tedesco…"
                  onChange={e => setNewJudge(f => ({ ...f, nationality: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Specializzazione</label>
                <input type="text" value={newJudge.specialization} placeholder="Es: All-round, Golden Retriever…"
                  onChange={e => setNewJudge(f => ({ ...f, specialization: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:outline-none text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNewJudge(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm">
                  Annulla
                </button>
                <button type="submit" disabled={savingJudge}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 text-sm disabled:opacity-50">
                  {savingJudge ? 'Salvo…' : 'Crea giudice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form aggiunta */}
      {showForm && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5">
          <h4 className="font-bold text-yellow-800 mb-4">Nuovo giudizio</h4>
          <JudgmentForm
            formData={form}
            onSubmit={handleSave}
            onChange={(key, val) => setForm(f => ({ ...f, [key]: val }))}
            onJudgeSelect={id => setForm(f => ({ ...f, judge_id: id }))}
            search={judgeSearch}
            onSearchChange={setJudgeSearch}
            submitLabel="Salva giudizio"
          />
        </div>
      )}

      {/* Lista giudizi */}
      {judgments.length === 0 && !showForm ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="font-bold text-gray-700 mb-1">Nessun giudizio registrato</p>
          <p className="text-gray-500 text-sm">Aggiungi il primo giudizio tramite il pulsante in alto</p>
        </div>
      ) : (
        <div className="space-y-4">
          {judgments.map(j => (
            <div key={j.id} className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
              {editingId === j.id ? (
                <div>
                  <h4 className="font-bold text-yellow-800 mb-4">Modifica giudizio</h4>
                  <JudgmentForm
                    formData={editForm}
                    onSubmit={handleUpdate}
                    onChange={(key, val) => setEditForm(f => ({ ...f, [key]: val }))}
                    onJudgeSelect={id => setEditForm(f => ({ ...f, judge_id: id }))}
                    search={judgeSearch}
                    onSearchChange={setJudgeSearch}
                    submitLabel="Aggiorna"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{j.judge?.name || '—'}</p>
                        {(j.judge?.nationality || j.judge?.specialization) && (
                          <p className="text-xs text-gray-400">{[j.judge.nationality, j.judge.specialization].filter(Boolean).join(' · ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(j.id)
                          setEditForm({
                            judge_id: j.judge_id,
                            judgment_date: j.judgment_date,
                            show_name: j.show_name || '',
                            grade: j.grade || '',
                            judgment_text: j.judgment_text || '',
                            our_comments: j.our_comments || '',
                          })
                          setJudgeSearch(j.judge?.name || '')
                        }}
                        className="p-2 hover:bg-yellow-50 rounded-xl transition text-yellow-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(j.id)}
                        disabled={deletingId === j.id}
                        className="p-2 hover:bg-red-50 rounded-xl transition text-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {j.grade && (
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold ${GRADE_COLORS[j.grade] || 'bg-gray-100 text-gray-600'}`}>
                        <Star className="w-3 h-3 inline mr-1" />{j.grade}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 font-semibold">
                      {format(new Date(j.judgment_date + 'T00:00:00'), 'dd MMMM yyyy', { locale: it })}
                    </span>
                    {j.show_name && (
                      <span className="text-xs text-gray-500 font-semibold">· {j.show_name}</span>
                    )}
                  </div>

                  {j.judgment_text && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Giudizio ufficiale
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{j.judgment_text}</p>
                    </div>
                  )}

                  {j.our_comments && (
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-blue-400 uppercase mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Nostri commenti
                      </p>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{j.our_comments}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DogDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPdfOpen, setIsPdfOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  const { data: dog, isLoading, refetch } = useQuery({
    queryKey: ['dog', id],
    queryFn: () => db.getDog(id),
  })

  const { data: dogEvents = [] } = useQuery({
    queryKey: ['events', 'dog', id],
    queryFn: () => db.getEvents({ dogId: id }),
    enabled: !!id,
  })

  const { data: heatCycles = [] } = useQuery({
    queryKey: ['heatCycles', id],
    queryFn: () => db.getHeatCycles(id),
    enabled: !!id,
  })

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A'
    const years = differenceInYears(new Date(), new Date(birthDate))
    const months = differenceInMonths(new Date(), new Date(birthDate)) % 12

    if (years === 0) return `${months} mesi`
    if (months === 0) return `${years} ${years === 1 ? 'anno' : 'anni'}`
    return `${years} ${years === 1 ? 'anno' : 'anni'} e ${months} ${months === 1 ? 'mese' : 'mesi'}`
  }

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo cane?')) return

    try {
      await db.deleteDog(id)
      toast.success('Cane eliminato con successo')
      navigate('/dogs')
    } catch (error) {
      toast.error('Errore durante l\'eliminazione')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      attivo: 'bg-green-100 text-green-700',
      in_attesa: 'bg-yellow-100 text-yellow-700',
      venduto: 'bg-blue-100 text-blue-700',
      deceduto: 'bg-gray-100 text-gray-700',
    }
    return colors[status] || colors.attivo
  }

  const getStatusLabel = (status) => {
    const labels = {
      attivo: 'Attivo',
      in_attesa: 'In Attesa',
      venduto: 'Venduto',
      deceduto: 'Deceduto',
    }
    return labels[status] || status
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded-3xl"></div>
        <div className="grid grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  if (!dog) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-bold text-gray-700">Cane non trovato</h3>
        <button
          onClick={() => navigate('/dogs')}
          className="mt-4 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition"
        >
          Torna alla lista
        </button>
      </div>
    )
  }

  const isFemale = dog.gender?.toLowerCase() === 'femmina' || dog.gender?.toLowerCase() === 'f'

  const tabs = [
    { id: 'info', label: 'Informazioni' },
    { id: 'crescita', label: 'Crescita' },
    { id: 'salute', label: 'Salute' },
    { id: 'documenti', label: 'Documenti' },
    ...(isFemale ? [{ id: 'calori', label: 'Calori' }] : []),
    { id: 'giudici', label: 'Giudici' },
    { id: 'storia', label: 'Storia' },
  ]

  return (
      <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dogs')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Torna ai cani
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Dog Image */}
          <div
            className="w-full md:w-48 h-48 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: dog.color ? `linear-gradient(135deg, ${dog.color}cc, ${dog.color})` : 'linear-gradient(135deg, #818cf8, #6366f1)' }}
          >
            <span className="text-6xl font-black">{dog.name.charAt(0).toUpperCase()}</span>
          </div>

          {/* Dog Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2">{dog.name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(dog.status)}`}>
                    {getStatusLabel(dog.status)}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-bold">
                    {dog.gender === 'maschio' ? '♂ Maschio' : '♀ Femmina'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsPdfOpen(true)}
                  className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition"
                  title="Esporta PDF"
                >
                  <FileDown className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition"
                  title="Modifica"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition"
                  title="Elimina"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Razza</p>
                  <p className="text-sm font-bold text-gray-900">{dog.breed}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Età</p>
                  <p className="text-sm font-bold text-gray-900">{calculateAge(dog.birth_date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Heart className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Nato il</p>
                  <p className="text-sm font-bold text-gray-900">
                    {dog.birth_date ? format(new Date(dog.birth_date), 'dd MMM yyyy', { locale: it }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Peso</p>
          <p className="text-2xl font-black text-blue-600">{dog.weight ? `${dog.weight} kg` : 'N/A'}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Altezza</p>
          <p className="text-2xl font-black text-green-600">{dog.height ? `${dog.height} cm` : 'N/A'}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Colore</p>
          <p className="text-lg font-black text-purple-600">{dog.coat_color || 'N/A'}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Microchip</p>
          <p className="text-sm font-black text-orange-600">{dog.microchip || 'N/A'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-bold transition ${
              activeTab === tab.id
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-gray-900 mb-4">Informazioni Generali</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-semibold text-gray-500 mb-1">Pedigree</p>
                  <p className="font-bold text-gray-900">{dog.pedigree_number || 'Non disponibile'}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-semibold text-gray-500 mb-1">Microchip</p>
                  <p className="font-bold text-gray-900">{dog.microchip || 'Non disponibile'}</p>
                </div>
              </div>
            </div>

            {dog.notes && (
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-4">Note</h3>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-gray-700 whitespace-pre-wrap">{dog.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'crescita' && (
          <div className="space-y-8">
            <DogMeasurements dogId={dog.id} dogName={dog.name} />
            <DogGrowthChart dogId={dog.id} />
          </div>
        )}

        {activeTab === 'salute' && (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-gray-500">Registro sanitario in arrivo</p>
          </div>
        )}

        {activeTab === 'documenti' && (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-gray-500">Documenti in arrivo</p>
          </div>
        )}

        {activeTab === 'calori' && (
          <DogHeatTab
            heatCycles={heatCycles}
            dogId={dog.id}
            dogName={dog.name}
            onAdded={() => queryClient.invalidateQueries(['heatCycles', id])}
          />
        )}

        {activeTab === 'giudici' && (
          <DogJudgesTab dogId={dog.id} />
        )}

        {activeTab === 'storia' && (
          <DogHistory dogEvents={dogEvents} heatCycles={heatCycles} />
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <DogForm
          dog={dog}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => {
            setIsEditOpen(false)
            refetch()
          }}
        />
      )}

      {/* PDF Modal */}
      {isPdfOpen && (
        <DogPdfModal
          dog={dog}
          dogEvents={dogEvents}
          heatCycles={heatCycles}
          onClose={() => setIsPdfOpen(false)}
        />
      )}
    </div>
  )
}

