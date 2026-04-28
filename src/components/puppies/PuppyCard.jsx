import { useState } from 'react'
import { Edit, Trash2, Baby, Calendar, User, Eye, EyeOff, FileText, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import DocumentiModal from '@/components/dogs/DocumentiModal'

export default function PuppyCard({ puppy, onEdit, onDelete }) {
  const [showContact, setShowContact] = useState(false)
  const [docModal, setDocModal] = useState(null) // null | 'precontratto' | 'contratto'
  const isDeceased = puppy.status === 'deceduto'
  const showBuyer = puppy.status === 'venduto' || puppy.status === 'prenotato'

  const [buyerEmail, buyerPhone] = (puppy.buyer_contact || '').split('|')

  const getStatusColor = (status) => {
    const colors = {
      disponibile: { card: 'bg-green-50 border-green-200 hover:border-green-400', badge: 'bg-green-200 text-green-800' },
      prenotato:   { card: 'bg-orange-100 border-orange-300 hover:border-orange-500', badge: 'bg-orange-400 text-white' },
      venduto:     { card: 'bg-blue-50 border-blue-200 hover:border-blue-400', badge: 'bg-blue-200 text-blue-800' },
      trattenuto:  { card: 'bg-purple-50 border-purple-200 hover:border-purple-400', badge: 'bg-purple-200 text-purple-800' },
      deceduto:    { card: 'bg-gray-50 border-gray-200', badge: 'bg-gray-200 text-gray-500' },
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

  const avatarGradient = puppy.gender === 'femmina'
    ? 'from-pink-400 to-rose-400'
    : 'from-sky-400 to-blue-400'

  const statusColor = getStatusColor(puppy.status)
  const hasContact = buyerEmail?.trim() || buyerPhone?.trim()

  const showPrecontratto = !['venduto', 'trattenuto', 'deceduto'].includes(puppy.status)
  const showContratto = puppy.status === 'venduto' || puppy.status === 'prenotato'

  return (
    <>
      <div className={`rounded-2xl border-2 p-6 transition ${statusColor.card} ${
        isDeceased ? 'opacity-50 grayscale' : 'hover:shadow-lg'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          {/* Avatar + info */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${avatarGradient} rounded-xl flex items-center justify-center text-white shrink-0`}>
              <Baby className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-black text-lg leading-tight ${isDeceased ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {puppy.name || 'Senza nome'}
              </h3>
              <p className="text-sm text-gray-600 font-semibold">
                {puppy.gender === 'maschio' ? '♂ Maschio' : puppy.gender === 'femmina' ? '♀ Femmina' : '— Genere n.d.'}
              </p>
              {puppy.litter?.birth_date && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Nato il {format(new Date(puppy.litter.birth_date), 'dd MMM yyyy', { locale: it })}
                </p>
              )}
            </div>
          </div>

          {/* Pulsanti + badge stato */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {showPrecontratto && (
                <button
                  onClick={() => setDocModal('precontratto')}
                  className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition"
                  title="Precontratto con Caparra"
                >
                  <FileText className="w-4 h-4" />
                </button>
              )}
              {showContratto && (
                <button
                  onClick={() => setDocModal('contratto')}
                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                  title="Contratto di Vendita"
                >
                  <Receipt className="w-4 h-4" />
                </button>
              )}
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
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor.badge}`}>
              {getStatusLabel(puppy.status)}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-2">
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

          {/* Acquirente */}
          {showBuyer && puppy.buyer_name && (
            <div className="flex items-center justify-between gap-3 pt-2 mt-2 border-t border-black/10">
              <div className="flex items-center gap-2 shrink-0">
                <User className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-700">{puppy.buyer_name}</span>
              </div>

              {hasContact && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`flex flex-col items-end text-right transition-all duration-200 min-w-0 ${
                    showContact ? '' : 'blur-sm select-none'
                  }`}>
                    {buyerEmail?.trim() && (
                      <span className="text-xs text-gray-600 truncate max-w-[120px]">{buyerEmail.trim()}</span>
                    )}
                    {buyerPhone?.trim() && (
                      <span className="text-xs text-gray-600">{buyerPhone.trim()}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowContact(v => !v)}
                    className="p-1.5 rounded-lg hover:bg-black/10 transition shrink-0"
                    title={showContact ? 'Nascondi contatti' : 'Mostra contatti'}
                  >
                    {showContact
                      ? <EyeOff className="w-4 h-4 text-gray-500" />
                      : <Eye className="w-4 h-4 text-gray-500" />
                    }
                  </button>
                </div>
              )}
            </div>
          )}

          {puppy.status === 'prenotato' && puppy.sale_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-sm text-gray-700 font-semibold">
                Ritiro: {format(new Date(puppy.sale_date), 'dd MMM yyyy', { locale: it })}
              </span>
            </div>
          )}
        </div>
      </div>

      {docModal && (
        <DocumentiModal
          dog={puppy}
          filterTypes={[docModal]}
          initialDocType={docModal}
          onClose={() => setDocModal(null)}
        />
      )}
    </>
  )
}
