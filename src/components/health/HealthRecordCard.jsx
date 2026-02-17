import { Calendar, MapPin, DollarSign, Syringe, Activity, Scissors, FileText, Pill, HelpCircle, Edit, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function HealthRecordCard({ record, onEdit, onDelete }) {
  const getTypeConfig = (type) => {
    const configs = {
      vaccinazione: { icon: Syringe, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
      visita: { icon: Activity, color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-600' },
      intervento: { icon: Scissors, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600' },
      esame: { icon: FileText, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
      trattamento: { icon: Pill, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600' },
      altro: { icon: HelpCircle, color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
    }
    return configs[type] || configs.altro
  }

  const getTypeLabel = (type) => {
    const labels = {
      vaccinazione: 'Vaccinazione',
      visita: 'Visita',
      intervento: 'Intervento',
      esame: 'Esame',
      trattamento: 'Trattamento',
      altro: 'Altro',
    }
    return labels[type] || type
  }

  const typeConfig = getTypeConfig(record.record_type)
  const Icon = typeConfig.icon

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 hover:border-primary-300 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-12 h-12 ${typeConfig.bgColor} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${typeConfig.textColor}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-1 ${typeConfig.bgColor} ${typeConfig.textColor} rounded-lg text-xs font-bold`}>
                {getTypeLabel(record.record_type)}
              </span>
            </div>
            <h3 className="font-black text-lg text-gray-900 truncate">
              {record.description}
            </h3>
            {record.dog?.name && (
              <p className="text-sm text-gray-600 font-semibold">
                🐕 {record.dog.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 ml-3">
          <button
            onClick={() => onEdit && onEdit(record)}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
            title="Modifica"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete && onDelete(record)}
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
            {format(new Date(record.record_date), 'dd MMMM yyyy', { locale: it })}
          </span>
        </div>

        {record.veterinarian && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 font-semibold">
              {record.veterinarian}
            </span>
          </div>
        )}

        {record.cost && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-bold">
              €{parseFloat(record.cost).toFixed(2)}
            </span>
          </div>
        )}

        {record.next_appointment_date && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 font-semibold mb-1">Prossimo Appuntamento:</p>
            <p className="text-sm text-primary-600 font-bold">
              {format(new Date(record.next_appointment_date), 'dd MMMM yyyy', { locale: it })}
            </p>
          </div>
        )}

        {record.notes && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600 italic">{record.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

