import { Edit, Trash2, Baby, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function PuppyCard({ puppy, onEdit, onDelete }) {
  const getStatusColor = (status) => {
    const colors = {
      disponibile: 'bg-green-100 text-green-700',
      prenotato: 'bg-yellow-100 text-yellow-700',
      venduto: 'bg-blue-100 text-blue-700',
      trattenuto: 'bg-purple-100 text-purple-700',
      deceduto: 'bg-gray-100 text-gray-700',
    }
    return colors[status] || colors.disponibile
  }

  const getStatusLabel = (status) => {
    const labels = {
      disponibile: 'Disponibile',
      prenotato: 'Prenotato',
      venduto: 'Venduto',
      trattenuto: 'Trattenuto',
      deceduto: 'Deceduto',
    }
    return labels[status] || status
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-primary-300 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-400 rounded-xl flex items-center justify-center text-white">
            <Baby className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-gray-900">
              {puppy.name || 'Senza nome'}
            </h3>
            <p className="text-sm text-gray-600 font-semibold">
              {puppy.gender === 'maschio' ? '♂ Maschio' : '♀ Femmina'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(puppy)}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
            title="Modifica"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(puppy)}
            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
            title="Elimina"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 font-semibold">Stato:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(puppy.status)}`}>
            {getStatusLabel(puppy.status)}
          </span>
        </div>

        {puppy.color && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 font-semibold">Colore:</span>
            <span className="text-sm font-bold text-gray-900">{puppy.color}</span>
          </div>
        )}

        {puppy.birth_weight && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 font-semibold">Peso nascita:</span>
            <span className="text-sm font-bold text-gray-900">{puppy.birth_weight} kg</span>
          </div>
        )}

        {puppy.microchip && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 font-semibold">Microchip:</span>
            <span className="text-sm font-bold text-gray-900">{puppy.microchip}</span>
          </div>
        )}

        {puppy.sale_price && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 font-semibold">Prezzo:</span>
            <span className="text-sm font-bold text-green-600">€{puppy.sale_price}</span>
          </div>
        )}

        {puppy.buyer_name && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 font-semibold">Acquirente:</span>
            <span className="text-sm font-bold text-gray-900">{puppy.buyer_name}</span>
          </div>
        )}

        {puppy.litter?.birth_date && (
          <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-200">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">
              Nato il {format(new Date(puppy.litter.birth_date), 'dd MMM yyyy', { locale: it })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

