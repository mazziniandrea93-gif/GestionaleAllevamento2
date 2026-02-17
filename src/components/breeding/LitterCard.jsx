import { Calendar, Edit, Trash2 } from 'lucide-react'

export default function LitterCard({ litter, onEdit, onDelete }) {
  const birthDate = new Date(litter.birth_date)
  const ageInDays = Math.floor((new Date() - birthDate) / (1000 * 60 * 60 * 24))

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100 hover:border-primary-200 transition group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-black text-dark-900 mb-2">
            {litter.mating?.female?.name} × {litter.mating?.male?.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{birthDate.toLocaleDateString('it-IT')}</span>
            <span className="text-primary-600 font-bold">• {ageInDays} giorni</span>
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onEdit(litter)}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(litter.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-primary-50 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-primary-600">{litter.total_puppies}</div>
          <div className="text-sm font-bold text-gray-600 mt-1">Totale</div>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-blue-600">{litter.males || 0}</div>
          <div className="text-sm font-bold text-gray-600 mt-1">Maschi</div>
        </div>
        <div className="bg-pink-50 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-pink-600">{litter.females || 0}</div>
          <div className="text-sm font-bold text-gray-600 mt-1">Femmine</div>
        </div>
      </div>

      {/* Cuccioli vivi e deceduti */}
      {(litter.alive_puppies !== undefined || litter.deceased_puppies > 0) && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-green-50 rounded-2xl p-3 text-center">
            <div className="text-2xl font-black text-green-600">{litter.alive_puppies || 0}</div>
            <div className="text-xs font-bold text-gray-600 mt-1">Vivi</div>
          </div>
          {litter.deceased_puppies > 0 && (
            <div className="bg-gray-100 rounded-2xl p-3 text-center">
              <div className="text-2xl font-black text-gray-600">{litter.deceased_puppies}</div>
              <div className="text-xs font-bold text-gray-600 mt-1">Deceduti</div>
            </div>
          )}
        </div>
      )}

      {litter.notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">{litter.notes}</p>
        </div>
      )}
    </div>
  )
}

