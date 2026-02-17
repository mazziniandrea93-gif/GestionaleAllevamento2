import { TrendingUp, TrendingDown, Calendar, Edit, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function TransactionCard({ transaction, type, onEdit, onDelete }) {
  const isIncome = type === 'income'
  const date = isIncome ? transaction.income_date : transaction.expense_date

  const getCategoryLabel = (category) => {
    const labels = {
      // Income
      vendita_cucciolo: 'Vendita Cucciolo',
      monta: 'Monta',
      pensione: 'Pensione',
      addestramento: 'Addestramento',
      // Expense
      veterinario: 'Veterinario',
      alimentazione: 'Alimentazione',
      toelettatura: 'Toelettatura',
      medicinali: 'Medicinali',
      attrezzatura: 'Attrezzatura',
      esposizioni: 'Esposizioni',
      riproduzione: 'Riproduzione',
      altro: 'Altro',
    }
    return labels[category] || category
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 hover:border-primary-300 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isIncome ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {isIncome ? (
              <TrendingUp className={`w-6 h-6 ${isIncome ? 'text-green-600' : 'text-red-600'}`} />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-lg text-gray-900 truncate">
              {transaction.description}
            </h3>
            <p className="text-sm text-gray-600 font-semibold">
              {getCategoryLabel(transaction.category)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 ml-3">
          <div className={`text-right ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
            <p className="text-2xl font-black">
              {isIncome ? '+' : '-'}€{parseFloat(transaction.amount).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="font-semibold">
              {format(new Date(date), 'dd MMM yyyy', { locale: it })}
            </span>
          </div>

          {transaction.payment_method && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold capitalize">
              {transaction.payment_method}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {transaction.dog?.name && (
            <span className="text-xs text-gray-500 font-semibold">
              🐕 {transaction.dog.name}
            </span>
          )}
        </div>
      </div>

      {transaction.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600 italic">{transaction.notes}</p>
        </div>
      )}
    </div>
  )
}

