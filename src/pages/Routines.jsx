import { useState } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, Check, Clock, Pencil, Trash2, Repeat,
  ListChecks, Brush, Utensils, Heart, Footprints, Stethoscope, ClipboardList,
  CalendarDays,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, addDays, isToday } from 'date-fns'
import { it } from 'date-fns/locale'
import { db } from '@/lib/supabase'
import { useMembership } from '@/hooks/useMembership'
import RoutineForm from '@/components/routines/RoutineForm'
import toast from 'react-hot-toast'

// ── Categorie ──────────────────────────────────────────────
const CATEGORIES = {
  pulizia: { label: 'Pulizia', color: '#0ea5e9', icon: Brush },
  alimentazione: { label: 'Alimentazione', color: '#f59e0b', icon: Utensils },
  cura: { label: 'Cura', color: '#ec4899', icon: Heart },
  uscita: { label: 'Uscita', color: '#10b981', icon: Footprints },
  salute: { label: 'Salute', color: '#8b5cf6', icon: Stethoscope },
  altro: { label: 'Altro', color: '#6b7280', icon: ClipboardList },
}
const catOf = (c) => CATEGORIES[c] || CATEGORIES.altro

// ── Giorni della settimana (0=Dom..6=Sab) ──────────────────
const DOW_SHORT = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 5: 'Ven', 6: 'Sab', 0: 'Dom' }
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

function scheduleLabel(days) {
  if (!days || days.length === 0 || days.length === 7) return 'Ogni giorno'
  const set = new Set(days)
  if (WEEK_ORDER.slice(0, 5).every((d) => set.has(d)) && set.size === 5) return 'Lun – Ven'
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekend'
  return WEEK_ORDER.filter((d) => set.has(d)).map((d) => DOW_SHORT[d]).join(', ')
}

const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase()

// ── Avatar dipendente ──────────────────────────────────────
function StaffAvatar({ member, size = 28 }) {
  if (!member) return null
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ backgroundColor: member.color || '#94a3b8', width: size, height: size, fontSize: size * 0.42 }}
      title={member.name}
    >
      {initialOf(member.name)}
    </div>
  )
}

// ── Chip dei cani coinvolti ────────────────────────────────
function DogChips({ ids, dogById, max = 4 }) {
  const list = (ids || []).map((id) => dogById[id]).filter(Boolean)
  if (list.length === 0) return null
  const shown = list.slice(0, max)
  const extra = list.length - shown.length
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {shown.map((d) => (
        <span key={d.id} className="inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          {d.photo_url
            ? <img src={d.photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
            : <span className="w-4 h-4 rounded-full" style={{ background: d.color || '#94a3b8' }} />}
          {d.nickname || d.name}
        </span>
      ))}
      {extra > 0 && <span className="text-xs text-gray-400 font-semibold">+{extra}</span>}
    </div>
  )
}

export default function Routines() {
  const queryClient = useQueryClient()
  const { isOwner } = useMembership()
  const [tab, setTab] = useState('attivita')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [staffFilter, setStaffFilter] = useState('tutti')

  const [routineModal, setRoutineModal] = useState(null) // { routine } | null
  const [confirmDialog, setConfirmDialog] = useState(null) // { message, onConfirm }

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data: staff = [] } = useQuery({ queryKey: ['staff'], queryFn: () => db.getStaff() })
  const { data: dogs = [] } = useQuery({ queryKey: ['dogs'], queryFn: () => db.getDogs() })
  const { data: routines = [] } = useQuery({ queryKey: ['routines'], queryFn: () => db.getRoutines() })
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['routine-tasks', dateStr],
    queryFn: () => db.getRoutineTasksForDate(dateStr),
  })

  const staffById = {}
  staff.forEach((s) => { staffById[s.id] = s })
  const dogById = {}
  dogs.forEach((d) => { dogById[d.id] = d })

  const hasStaff = staff.length > 0

  const refreshTasks = () => queryClient.invalidateQueries({ queryKey: ['routine-tasks'] })

  // ── Azioni task giornaliere ──────────────────────────────
  const handleToggleDone = async (task) => {
    try {
      await db.setRoutineDone(task.routine_id, dateStr, !task.done)
      refreshTasks()
    } catch (err) {
      console.error('toggle routine done error:', err)
      toast.error('Errore durante l\'aggiornamento')
    }
  }

  const handleReassign = async (task, staffId) => {
    try {
      await db.assignRoutineForDate(task.routine_id, dateStr, staffId || null)
      toast.success('Assegnazione aggiornata')
      refreshTasks()
    } catch (err) {
      console.error('reassign routine error:', err)
      toast.error('Errore durante l\'assegnazione')
    }
  }

  // ── CRUD routine ─────────────────────────────────────────
  const handleRoutineSaved = () => {
    setRoutineModal(null)
    queryClient.invalidateQueries({ queryKey: ['routines'] })
    refreshTasks()
  }

  const handleToggleRoutineActive = async (routine) => {
    try {
      await db.updateRoutine(routine.id, { active: !routine.active })
      queryClient.invalidateQueries({ queryKey: ['routines'] })
      refreshTasks()
    } catch (err) {
      console.error('toggle routine active error:', err)
      toast.error('Errore durante l\'aggiornamento')
    }
  }

  const handleDeleteRoutine = (routine) => {
    setConfirmDialog({
      message: `Eliminare la routine "${routine.title}"? Verranno rimosse anche le sue task e lo storico.`,
      onConfirm: async () => {
        try {
          await db.deleteRoutine(routine.id)
          toast.success('Routine eliminata')
          queryClient.invalidateQueries({ queryKey: ['routines'] })
          refreshTasks()
        } catch (err) {
          console.error('delete routine error:', err)
          toast.error('Errore durante l\'eliminazione')
        } finally {
          setConfirmDialog(null)
        }
      },
    })
  }

  // ── Filtro task per dipendente ───────────────────────────
  const filteredTasks = tasks.filter((t) => {
    if (!hasStaff || staffFilter === 'tutti') return true
    if (staffFilter === 'nessuno') return !t.staff_id
    return t.staff_id === staffFilter
  })
  const doneCount = filteredTasks.filter((t) => t.done).length
  const progress = filteredTasks.length > 0 ? Math.round((doneCount / filteredTasks.length) * 100) : 0

  // I dipendenti vedono solo la board delle attività; la gestione delle
  // routine è riservata al titolare.
  const TABS = [
    { id: 'attivita', label: 'Attività del giorno', icon: ListChecks },
    { id: 'routine', label: 'Le mie routine', icon: Repeat, ownerOnly: true },
  ].filter((t) => isOwner || !t.ownerOnly)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-dark-900">Routine</h2>
          <p className="text-gray-500 mt-1">Organizza le attività quotidiane dell'allevamento</p>
        </div>
        {tab === 'routine' && (
          <button
            onClick={() => setRoutineModal({ routine: null })}
            className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
          >
            <Plus className="w-5 h-5" />
            Nuova Routine
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 font-bold transition whitespace-nowrap ${
              tab === t.id ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: ATTIVITÀ DEL GIORNO ══ */}
      {tab === 'attivita' && (
        <div className="space-y-5">
          {/* Navigatore data */}
          <div className="bg-white rounded-3xl border-2 border-gray-100 p-4 flex items-center justify-between gap-3">
            <button onClick={() => setSelectedDate((d) => addDays(d, -1))} className="p-2 hover:bg-gray-100 rounded-xl transition">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center flex-1 min-w-0">
              <p className="text-lg md:text-xl font-black text-gray-900 capitalize truncate">
                {format(selectedDate, 'EEEE d MMMM', { locale: it })}
              </p>
              {!isToday(selectedDate) && (
                <button onClick={() => setSelectedDate(new Date())} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                  Torna a oggi
                </button>
              )}
              {isToday(selectedDate) && <p className="text-xs font-bold text-primary-600">Oggi</p>}
            </div>
            <button onClick={() => setSelectedDate((d) => addDays(d, 1))} className="p-2 hover:bg-gray-100 rounded-xl transition">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Barra progresso */}
          {filteredTasks.length > 0 && (
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">
                  {doneCount} di {filteredTasks.length} completate
                </span>
                <span className="text-sm font-black text-primary-600">{progress}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Filtro dipendente (solo se ci sono dipendenti) */}
          {hasStaff && (
            <div className="flex flex-wrap gap-2">
              {[{ id: 'tutti', label: 'Tutti' }, ...staff.map((s) => ({ id: s.id, label: s.name })), { id: 'nessuno', label: 'Non assegnate' }].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setStaffFilter(chip.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${
                    staffFilter === chip.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Lista task */}
          {loadingTasks ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Nessuna attività per questo giorno</h3>
              <p className="text-gray-500 mb-5">
                {routines.length === 0
                  ? isOwner
                    ? 'Crea la tua prima routine: le task verranno generate ogni giorno automaticamente.'
                    : 'Il titolare non ha ancora impostato delle routine.'
                  : 'Nessuna routine attiva ricade in questa data (o filtro).'}
              </p>
              {routines.length === 0 && isOwner && (
                <button
                  onClick={() => setRoutineModal({ routine: null })}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition"
                >
                  <Plus className="w-5 h-5" /> Crea routine
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const cat = catOf(task.category)
                const Icon = cat.icon
                return (
                  <div
                    key={task.routine_id}
                    className={`bg-white rounded-2xl border-2 p-4 flex items-center gap-4 transition ${
                      task.done ? 'border-green-200 bg-green-50/40' : 'border-gray-100'
                    }`}
                  >
                    {/* Check */}
                    <button
                      onClick={() => handleToggleDone(task)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                        task.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-primary-400'
                      }`}
                      title={task.done ? 'Segna da fare' : 'Segna come fatto'}
                    >
                      <Check className="w-5 h-5" />
                    </button>

                    {/* Orario */}
                    <div className="w-16 flex-shrink-0 text-center">
                      {task.time_of_day ? (
                        <span className="inline-flex items-center gap-1 text-sm font-black text-gray-700">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {task.time_of_day}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 font-semibold">—</span>
                      )}
                    </div>

                    {/* Testo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${cat.color}1A`, color: cat.color }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <p className={`font-bold text-gray-900 truncate ${task.done ? 'line-through text-gray-400' : ''}`}>
                          {task.title}
                        </p>
                      </div>
                      {(task.dog_ids?.length > 0 || task.notes) && (
                        <div className="ml-8 mt-1 space-y-1">
                          <DogChips ids={task.dog_ids} dogById={dogById} />
                          {task.notes && <p className="text-xs text-gray-500 truncate">{task.notes}</p>}
                        </div>
                      )}
                    </div>

                    {/* Assegnatario (solo se ci sono dipendenti) */}
                    {hasStaff && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.staff && <StaffAvatar member={task.staff} />}
                        {isOwner && (
                          <select
                            value={task.staff_id || ''}
                            onChange={(e) => handleReassign(task, e.target.value)}
                            className="text-xs font-semibold border-2 border-gray-200 rounded-lg px-2 py-1.5 focus:border-primary-400 outline-none max-w-[130px]"
                            title="Assegna a"
                          >
                            <option value="">Non assegnata</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: LE MIE ROUTINE ══ */}
      {tab === 'routine' && (
        <>
          {routines.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Repeat className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Nessuna routine</h3>
              <p className="text-gray-500 mb-5">
                Crea attività ricorrenti come "ogni mercoledì pulizia box" o "alle 13:00 cibo ai cani".
              </p>
              <button
                onClick={() => setRoutineModal({ routine: null })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition"
              >
                <Plus className="w-5 h-5" /> Nuova Routine
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {routines.map((r) => {
                const cat = catOf(r.category)
                const Icon = cat.icon
                const assignee = r.staff_id ? staffById[r.staff_id] : null
                return (
                  <div
                    key={r.id}
                    className={`bg-white rounded-3xl border-2 border-gray-100 overflow-hidden transition hover:shadow-lg ${r.active ? '' : 'opacity-60'}`}
                  >
                    <div className="h-1.5" style={{ backgroundColor: cat.color }} />
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cat.color}1A`, color: cat.color }}>
                            <Icon className="w-5 h-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 truncate">{r.title}</p>
                            <p className="text-xs font-bold" style={{ color: cat.color }}>{cat.label}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => setRoutineModal({ routine: r })} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteRoutine(r)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg font-semibold text-gray-600">
                          <CalendarDays className="w-3.5 h-3.5" /> {scheduleLabel(r.days_of_week)}
                        </span>
                        {r.time_of_day && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg font-semibold text-gray-600">
                            <Clock className="w-3.5 h-3.5" /> {r.time_of_day.slice(0, 5)}
                          </span>
                        )}
                      </div>

                      {r.dog_ids?.length > 0 && <DogChips ids={r.dog_ids} dogById={dogById} />}

                      <div className="flex items-center justify-between pt-1">
                        {hasStaff ? (
                          <div className="flex items-center gap-2 min-w-0">
                            {assignee ? (
                              <>
                                <StaffAvatar member={assignee} size={24} />
                                <span className="text-sm font-semibold text-gray-600 truncate">{assignee.name}</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 font-semibold">Non assegnata</span>
                            )}
                          </div>
                        ) : <span />}
                        {/* Toggle attiva */}
                        <button
                          onClick={() => handleToggleRoutineActive(r)}
                          className={`relative w-11 h-6 rounded-full transition flex-shrink-0 ${r.active ? 'bg-primary-500' : 'bg-gray-300'}`}
                          title={r.active ? 'Attiva' : 'Disattivata'}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${r.active ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modale routine */}
      {routineModal && (
        <RoutineForm
          routine={routineModal.routine}
          staff={staff}
          dogs={dogs}
          onClose={() => setRoutineModal(null)}
          onSuccess={handleRoutineSaved}
        />
      )}

      {/* Conferma eliminazione */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Conferma eliminazione</h3>
              <p className="text-gray-500 text-sm">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition shadow-lg shadow-red-500/30"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
