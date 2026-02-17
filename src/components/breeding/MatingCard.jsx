import { Calendar, Edit, Trash2, AlertCircle } from 'lucide-react'

export default function MatingCard({ mating, onEdit, onDelete }) {
  // Gestisce sia date multiple che data singola
  const matingDates = mating.mating_dates && Array.isArray(mating.mating_dates)
    ? mating.mating_dates
    : [mating.mating_date]

  const firstMatingDate = new Date(matingDates[0])
  const expectedDelivery = mating.expected_delivery ? new Date(mating.expected_delivery) : null
  const today = new Date()

  const daysUntilDelivery = expectedDelivery
    ? Math.floor((expectedDelivery - today) / (1000 * 60 * 60 * 24))
    : null

  const isNearDelivery = daysUntilDelivery !== null && daysUntilDelivery <= 7 && daysUntilDelivery >= 0
  const isPastDelivery = daysUntilDelivery !== null && daysUntilDelivery < 0

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100 hover:border-primary-200 transition group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-black text-dark-900 mb-2">
            {mating.female?.name} × {mating.male?.name}
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>
                {matingDates.length > 1 ? 'Accoppiamenti:' : 'Accoppiamento:'}
              </span>
            </div>
            {matingDates.map((date, index) => (
              <div key={index} className="text-xs text-gray-600 ml-6">
                {new Date(date).toLocaleDateString('it-IT')}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onEdit(mating)}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(mating.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {expectedDelivery && (
        <div className={`rounded-2xl p-4 ${
          isPastDelivery ? 'bg-red-50' :
          isNearDelivery ? 'bg-yellow-50' : 'bg-primary-50'
        }`}>
          <div className="flex items-center gap-2">
            {(isNearDelivery || isPastDelivery) && (
              <AlertCircle className={`w-5 h-5 ${
                isPastDelivery ? 'text-red-600' : 'text-yellow-600'
              }`} />
            )}
            <div className="flex-1">
              <div className="text-sm font-bold text-gray-600">Parto previsto</div>
              <div className="text-lg font-black text-dark-900">
                {expectedDelivery.toLocaleDateString('it-IT')}
              </div>
            </div>
            {daysUntilDelivery !== null && (
              <div className={`text-right ${
                isPastDelivery ? 'text-red-600' :
                isNearDelivery ? 'text-yellow-600' : 'text-primary-600'
              }`}>
                <div className="text-2xl font-black">
                  {Math.abs(daysUntilDelivery)}
                </div>
                <div className="text-xs font-bold">
                  {isPastDelivery ? 'giorni fa' : 'giorni'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mating.notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">{mating.notes}</p>
        </div>
      )}
    </div>
  )
}

