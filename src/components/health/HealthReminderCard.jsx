import { Syringe, Bug, Pill, HelpCircle, Edit, Trash2, CheckCircle, RotateCw, Calendar } from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'
import { it } from 'date-fns/locale'

const TYPE_CONFIG = {
  vaccinazione:     { icon: Syringe, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Vaccino' },
  antiparassitario: { icon: Bug,     bg: 'bg-green-100', text: 'text-green-600', label: 'Antiparassitario' },
  sverminazione:    { icon: Pill,    bg: 'bg-orange-100', text: 'text-orange-600', label: 'Sverminazione' },
  altro:            { icon: HelpCircle, bg: 'bg-gray-100', text: 'text-gray-600', label: 'Altro' },
}

export default function HealthReminderCard({ reminder, onEdit, onDelete, onMarkDone }) {
  const cfg = TYPE_CONFIG[reminder.reminder_type] || TYPE_CONFIG.altro
  const Icon = cfg.icon

  // Sospeso se disattivato o se il cane non è più attivo (deceduto/venduto/ceduto)
  const isSuspended = reminder.active === false || (reminder.dog?.status && reminder.dog.status !== 'attivo')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(reminder.next_due_date + 'T00:00:00')
  const daysLeft = differenceInCalendarDays(due, today)

  // Stato scadenza
  let badge
  if (daysLeft < 0) badge = { text: `Scaduto da ${Math.abs(daysLeft)} gg`, cls: 'bg-red-100 text-red-700' }
  else if (daysLeft === 0) badge = { text: 'Oggi', cls: 'bg-red-100 text-red-700' }
  else if (daysLeft <= reminder.reminder_days) badge = { text: `Tra ${daysLeft} gg`, cls: 'bg-amber-100 text-amber-700' }
  else badge = { text: `Tra ${daysLeft} gg`, cls: 'bg-gray-100 text-gray-500' }

  const intervalLabel = `ogni ${reminder.interval_value} ${reminder.interval_unit}`

  return (
    <div className={`bg-white rounded-2xl border-2 border-gray-200 p-5 transition ${isSuspended ? 'opacity-60' : 'hover:border-primary-300 hover:shadow-lg'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-12 h-12 ${cfg.bg} rounded-xl flex items-center justify-center shrink-0`}>
            <Icon className={`w-6 h-6 ${cfg.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-1 ${cfg.bg} ${cfg.text} rounded-lg text-xs font-bold`}>{cfg.label}</span>
              {isSuspended
                ? <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-200 text-gray-600">Sospeso</span>
                : <span className={`px-2 py-1 rounded-lg text-xs font-bold ${badge.cls}`}>{badge.text}</span>
              }
            </div>
            <h3 className="font-black text-lg text-gray-900 truncate">{reminder.description}</h3>
            {reminder.dog?.name && (
              <p className="text-sm text-gray-600 font-semibold">🐕 {reminder.dog.name}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 ml-3 shrink-0">
          <button
            onClick={() => onEdit && onEdit(reminder)}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
            title="Modifica"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete && onDelete(reminder)}
            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
            title="Elimina"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 font-semibold">
            Prossima: {format(due, 'dd MMMM yyyy', { locale: it })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <RotateCw className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">{intervalLabel} · avviso {reminder.reminder_days} gg prima</span>
        </div>
        {reminder.last_done_date && (
          <p className="text-xs text-gray-400">
            Ultima volta: {format(new Date(reminder.last_done_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: it })}
          </p>
        )}
      </div>

      {isSuspended ? (
        <p className="mt-4 text-center text-sm text-gray-400 font-semibold">
          Promemoria sospeso{reminder.dog?.status && reminder.dog.status !== 'attivo' ? ` — cane ${reminder.dog.status}` : ''}
        </p>
      ) : (
        <button
          onClick={() => onMarkDone && onMarkDone(reminder)}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition"
        >
          <CheckCircle className="w-5 h-5" />
          Segna come fatto
        </button>
      )}
    </div>
  )
}
