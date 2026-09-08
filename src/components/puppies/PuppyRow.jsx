import { useState } from 'react'
import { Edit, Trash2, Baby, FileText, Check, X as XIcon, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import DocumentiModal from '@/components/dogs/DocumentiModal'

const STATUS = {
  disponibile: { label: 'Disponibile', bar: '#22c55e', badge: 'bg-green-100 text-green-700' },
  prenotato:   { label: 'Prenotato',   bar: '#f97316', badge: 'bg-orange-100 text-orange-700' },
  venduto:     { label: 'Venduto',     bar: '#3b82f6', badge: 'bg-blue-100 text-blue-700' },
  trattenuto:  { label: 'Trattenuto',  bar: '#a855f7', badge: 'bg-purple-100 text-purple-700' },
  deceduto:    { label: 'Deceduto',    bar: '#9ca3af', badge: 'bg-gray-200 text-gray-500' },
}

export default function PuppyRow({ puppy, onEdit, onDelete, onRename }) {
  const [docModal, setDocModal] = useState(null)
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(puppy.name || '')

  const isDeceased = puppy.status === 'deceduto'
  const showBuyer = puppy.status === 'venduto' || puppy.status === 'prenotato'
  const st = STATUS[puppy.status] || STATUS.disponibile
  const avatarGradient = puppy.gender === 'femmina' ? 'from-pink-400 to-rose-400' : 'from-sky-400 to-blue-400'
  const genderLabel = puppy.gender === 'maschio' ? '♂ Maschio' : puppy.gender === 'femmina' ? '♀ Femmina' : '—'

  const docFilterTypes =
    puppy.status === 'venduto'     ? ['contratto', 'passaggio'] :
    puppy.status === 'prenotato'   ? ['precontratto', 'contratto'] :
    puppy.status === 'disponibile' ? ['precontratto'] : null

  const startEdit = () => { setNameVal(puppy.name || ''); setEditing(true) }
  const cancelEdit = () => { setNameVal(puppy.name || ''); setEditing(false) }
  const saveName = async () => {
    const trimmed = nameVal.trim()
    setEditing(false)
    if (trimmed === (puppy.name || '')) return
    await onRename?.(puppy, trimmed)
  }

  // Sottoriga: genere · colore · nascita
  const subParts = [
    genderLabel,
    puppy.color || null,
    puppy.litter?.birth_date ? `nato ${format(new Date(puppy.litter.birth_date), 'dd MMM', { locale: it })}` : null,
  ].filter(Boolean)

  const remaining = showBuyer && puppy.sale_price > 0
    ? Math.max(0, Number(puppy.sale_price) - Number(puppy.deposit_amount || 0))
    : 0
  const settled = puppy.balance_paid || remaining === 0

  return (
    <>
      <div className={`flex items-center gap-3 px-3 py-2.5 bg-white border-2 border-gray-100 rounded-xl transition hover:shadow-sm ${isDeceased ? 'opacity-50' : ''}`}>
        {/* Accent stato */}
        <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: st.bar }} />

        {/* Avatar */}
        <div className={`w-9 h-9 bg-gradient-to-br ${avatarGradient} rounded-lg flex items-center justify-center text-white shrink-0`}>
          <Baby className="w-5 h-5" />
        </div>

        {/* Nome (modificabile) + sottoriga */}
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEdit() }}
                onBlur={saveName}
                placeholder="Nome cucciolo"
                className="w-full max-w-[220px] px-2 py-1 rounded-lg border-2 border-primary-400 text-sm font-bold focus:outline-none"
              />
              <button onMouseDown={(e) => e.preventDefault()} onClick={saveName} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Salva">
                <Check className="w-4 h-4" />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Annulla">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="group flex items-center gap-1.5 max-w-full text-left"
              title="Modifica nome"
            >
              <span className={`font-black text-sm truncate ${isDeceased ? 'line-through text-gray-400' : 'text-gray-900'} ${!puppy.name ? 'text-gray-400 font-bold italic' : ''}`}>
                {puppy.name || 'Senza nome'}
              </span>
              <Pencil className="w-3 h-3 text-gray-300 group-hover:text-primary-500 shrink-0" />
            </button>
          )}
          <p className="text-xs text-gray-500 truncate">{subParts.join(' · ')}</p>
        </div>

        {/* Acquirente (lg+) */}
        {showBuyer && (
          <span className="hidden lg:block text-sm text-gray-600 w-32 truncate" title={puppy.buyer_name || ''}>
            {puppy.buyer_name || '—'}
          </span>
        )}

        {/* Prezzo / saldo (sm+) */}
        <div className="hidden sm:flex flex-col items-end w-24 shrink-0">
          {puppy.sale_price ? (
            <span className="text-sm font-bold text-green-600">€{puppy.sale_price}</span>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
          {showBuyer && puppy.sale_price > 0 && (
            <span className={`mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${settled ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {settled ? 'Saldato' : `Residuo €${remaining.toFixed(0)}`}
            </span>
          )}
        </div>

        {/* Stato */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${st.badge}`}>{st.label}</span>

        {/* Azioni */}
        <div className="flex gap-1 shrink-0">
          {docFilterTypes && (
            <button onClick={() => setDocModal('open')} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition" title="Genera documento">
              <FileText className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => onEdit(puppy)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition" title="Modifica">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(puppy)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition" title="Elimina">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {docModal && (
        <DocumentiModal
          dog={puppy}
          filterTypes={docFilterTypes}
          onClose={() => setDocModal(null)}
        />
      )}
    </>
  )
}
