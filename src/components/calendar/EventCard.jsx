import { Calendar, Stethoscope, Scissors, Trophy, Heart, AlertCircle, Edit, Trash2, Check } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function EventCard({ event, onEdit, onDelete, onToggleComplete }) {
  const getTypeConfig = (type) => {
    const configs = {
      veterinario: { icon: Stethoscope, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
      toelettatura: { icon: Scissors, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
      esposizione: { icon: Trophy, color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-600' },
      calore_stimato: { icon: Heart, color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-600' },
      parto_stimato: { icon: AlertCircle, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600' },
      altro: { icon: Calendar, color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
    }
    return configs[type] || configs.altro
  }

  const getTypeLabel = (type) => {
    const labels = {
      veterinario: 'Veterinario',
      toelettatura: 'Toelettatura',
      esposizione: 'Esposizione',
      calore_stimato: 'Calore Stimato',
      parto_stimato: 'Parto Stimato',
      altro: 'Altro',
    }
    return labels[type] || type
  }

  const typeConfig = getTypeConfig(event.event_type)
  const Icon = typeConfig.icon

  return (
    <div className={`bg-white rounded-2xl border-2 p-5 hover:border-primary-300 hover:shadow-lg transition ${
      event.completed ? 'border-gray-300 opacity-60' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-12 h-12 ${typeConfig.bgColor} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${typeConfig.textColor}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-1 ${typeConfig.bgColor} ${typeConfig.textColor} rounded-lg text-xs font-bold`}>
                {getTypeLabel(event.event_type)}
              </span>
              {event.completed && (
                <span className="px-2 py-1 bg-green-100 text-green-600 rounded-lg text-xs font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Completato
                </span>
              )}
            </div>
            <h3 className={`font-black text-lg truncate ${event.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {event.title}
            </h3>
            {event.dog?.name && (
              <p className="text-sm text-gray-600 font-semibold">
                🐕 {event.dog.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 ml-3">
          <button
            onClick={() => onToggleComplete && onToggleComplete(event)}
            className={`p-2 rounded-lg transition ${
              event.completed 
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
            title={event.completed ? 'Segna come non completato' : 'Segna come completato'}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit && onEdit(event)}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
            title="Modifica"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete && onDelete(event)}
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
            {format(new Date(event.event_date), 'EEEE, dd MMMM yyyy', { locale: it })}
          </span>
        </div>

        {event.description && (
          <p className="text-sm text-gray-600 mt-2">{event.description}</p>
        )}

        {event.notes && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600 italic">{event.notes}</p>
          </div>
        )}

        {event.reminder_days > 0 && !event.completed && (
          <div className="mt-2 text-xs text-gray-500 font-semibold">
            🔔 Promemoria: {event.reminder_days} {event.reminder_days === 1 ? 'giorno' : 'giorni'} prima
          </div>
        )}
      </div>
    </div>
  )
}

