import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Award } from 'lucide-react'
import { differenceInYears, differenceInMonths, format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function DogCard({ dog, onUpdate }) {
  const navigate = useNavigate()

  const calculateAge = (birthDate) => {
    const years = differenceInYears(new Date(), new Date(birthDate))
    const months = differenceInMonths(new Date(), new Date(birthDate)) % 12
    
    if (years > 0) {
      return `${years} ${years === 1 ? 'anno' : 'anni'}${months > 0 ? ` e ${months} ${months === 1 ? 'mese' : 'mesi'}` : ''}`
    }
    return `${months} ${months === 1 ? 'mese' : 'mesi'}`
  }

  const statusColors = {
    attivo: 'bg-green-100 text-green-700',
    venduto: 'bg-blue-100 text-blue-700',
    ceduto: 'bg-purple-100 text-purple-700',
    deceduto: 'bg-gray-100 text-gray-700',
  }

  const genderColors = {
    maschio: 'bg-blue-500',
    femmina: 'bg-pink-500',
  }

  return (
    <div
      onClick={() => navigate(`/dogs/${dog.id}`)}
      className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group border-2 border-transparent hover:border-primary-200"
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {dog.photo_url ? (
          <img
            src={dog.photo_url}
            alt={dog.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            🐕
          </div>
        )}
        
        {/* Gender Badge */}
        <div className={`absolute top-3 left-3 w-10 h-10 ${genderColors[dog.gender]} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
          {dog.gender === 'maschio' ? '♂' : '♀'}
        </div>

        {/* Status Badge */}
        <div className={`absolute top-3 right-3 ${statusColors[dog.status]} px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg`}>
          {dog.status}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-black text-dark-900 mb-1">{dog.name}</h3>
        <p className="text-sm text-gray-500 font-semibold mb-4">{dog.breed}</p>

        {/* Info Grid */}
        <div className="space-y-2">
          <div className="flex items-center text-xs text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-primary-500" />
            <span className="font-medium">{calculateAge(dog.birth_date)}</span>
          </div>
          
          {dog.microchip && (
            <div className="flex items-center text-xs text-gray-600">
              <Award className="w-4 h-4 mr-2 text-primary-500" />
              <span className="font-mono">{dog.microchip}</span>
            </div>
          )}

          {dog.color && (
            <div className="flex items-center text-xs text-gray-600">
              <div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary-500"></div>
              </div>
              <span>{dog.color}</span>
            </div>
          )}
        </div>

        {/* Pedigree */}
        {dog.pedigree_number && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold">Pedigree</p>
            <p className="text-sm font-mono text-dark-900">{dog.pedigree_number}</p>
          </div>
        )}

        {/* Sale Info */}
        {dog.status === 'venduto' && dog.sale_date && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold">Venduto</p>
            <p className="text-sm text-dark-900">
              {format(new Date(dog.sale_date), 'dd MMM yyyy', { locale: it })}
              {dog.sale_price && (
                <span className="ml-2 font-bold text-green-600">
                  €{dog.sale_price.toFixed(2)}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Hover Effect */}
      <div className="h-1 bg-gradient-to-r from-primary-400 to-primary-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
    </div>
  )
}
