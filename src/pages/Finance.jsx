import { useState } from 'react'
import { DollarSign, Plus, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import TransactionForm from '@/components/finance/TransactionForm'
import TransactionCard from '@/components/finance/TransactionCard'
import toast from 'react-hot-toast'

export default function Finance() {
  const [filter, setFilter] = useState('tutti')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const queryClient = useQueryClient()

  const currentYear = {
    start: `${selectedYear}-01-01`,
    end: `${selectedYear}-12-31`,
  }

  // Fetch income per anno
  const { data: income = [], isLoading: loadingIncome } = useQuery({
    queryKey: ['income', selectedYear],
    queryFn: () => db.getIncome({
      startDate: currentYear.start,
      endDate: currentYear.end,
    }),
    staleTime: 1000 * 60 * 5, // Cache 5 minuti
  })

  // Fetch expenses per anno
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', selectedYear],
    queryFn: () => db.getExpenses({
      startDate: currentYear.start,
      endDate: currentYear.end,
    }),
    staleTime: 1000 * 60 * 5, // Cache 5 minuti
  })

  const isLoading = loadingIncome || loadingExpenses

  // Calculate totals
  const totalIncome = income.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  const totalExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  const balance = totalIncome - totalExpenses

  // Filter transactions
  const getFilteredTransactions = () => {
    if (filter === 'entrate') {
      return income.map(item => ({ ...item, type: 'income' }))
    }
    if (filter === 'uscite') {
      return expenses.map(item => ({ ...item, type: 'expense' }))
    }
    // Tutti - merge e ordina per data
    const allTransactions = [
      ...income.map(item => ({ ...item, type: 'income', date: item.income_date })),
      ...expenses.map(item => ({ ...item, type: 'expense', date: item.expense_date })),
    ]
    return allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  const filteredTransactions = getFilteredTransactions()

  const handleFormClose = () => {
    setIsFormOpen(false)
    setSelectedTransaction(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    queryClient.invalidateQueries(['income'])
    queryClient.invalidateQueries(['expenses'])
  }

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction)
    setIsFormOpen(true)
  }

  const handleDelete = async (transaction) => {
    const isIncome = transaction.type === 'income'
    const label = isIncome ? 'entrata' : 'spesa'
    if (!window.confirm(`Sei sicuro di voler eliminare questa ${label}?`)) return

    try {
      if (isIncome) {
        await db.deleteIncome(transaction.id)
      } else {
        await db.deleteExpense(transaction.id)
      }
      toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} eliminata con successo`)
      queryClient.invalidateQueries(['income'])
      queryClient.invalidateQueries(['expenses'])
    } catch (error) {
      toast.error(error.message || 'Errore durante l\'eliminazione')
    }
  }

  const goToPreviousYear = () => {
    setSelectedYear(prev => prev - 1)
  }

  const goToNextYear = () => {
    setSelectedYear(prev => prev + 1)
  }

  const goToCurrentYear = () => {
    setSelectedYear(new Date().getFullYear())
  }

  const isCurrentYear = selectedYear === new Date().getFullYear()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-dark-900">Finanze</h2>
          <p className="text-gray-500 mt-1">Gestisci entrate e uscite</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
        >
          <Plus className="w-5 h-5" />
          Nuova Transazione
        </button>
      </div>

      {/* Year Navigator */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={goToPreviousYear}
          className="p-3 rounded-xl bg-white border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition text-gray-600 hover:text-primary-600"
          title="Anno precedente"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-4xl font-black text-dark-900">{selectedYear}</div>
            <div className="text-sm text-gray-500 font-semibold mt-1">
              {isCurrentYear ? 'Anno corrente' : 'Anno selezionato'}
            </div>
          </div>

          {!isCurrentYear && (
            <button
              onClick={goToCurrentYear}
              className="px-4 py-2 bg-primary-100 text-primary-700 rounded-xl font-bold text-sm hover:bg-primary-200 transition"
            >
              Vai ad oggi
            </button>
          )}
        </div>

        <button
          onClick={goToNextYear}
          className="p-3 rounded-xl bg-white border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition text-gray-600 hover:text-primary-600"
          title="Anno successivo"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold opacity-80 uppercase text-xs">Entrate Annuali</p>
              <TrendingUp className="w-6 h-6 opacity-50" />
            </div>
            <h3 className="text-5xl font-black mb-3">€{totalIncome.toFixed(2)}</h3>
            <p className="text-sm opacity-90 font-semibold">{selectedYear}</p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
        </div>

        <div className="bg-gradient-to-br from-red-400 to-red-500 p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold opacity-80 uppercase text-xs">Uscite Annuali</p>
              <TrendingDown className="w-6 h-6 opacity-50" />
            </div>
            <h3 className="text-5xl font-black mb-3">€{totalExpenses.toFixed(2)}</h3>
            <p className="text-sm opacity-90 font-semibold">{selectedYear}</p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
        </div>

        <div className={`bg-gradient-to-br p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden ${
          balance >= 0 ? 'from-blue-400 to-blue-500' : 'from-orange-400 to-orange-500'
        }`}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold opacity-80 uppercase text-xs">Bilancio Annuale</p>
              <DollarSign className="w-6 h-6 opacity-50" />
            </div>
            <h3 className="text-5xl font-black mb-3">€{balance.toFixed(2)}</h3>
            <p className="text-sm opacity-90 font-semibold">{selectedYear}</p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {['tutti', 'entrate', 'uscite'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-xl font-semibold capitalize transition ${
              filter === type
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Transactions List */}
      {!isLoading && filteredTransactions.length > 0 && (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <TransactionCard
              key={`${transaction.type}-${transaction.id}`}
              transaction={transaction}
              type={transaction.type}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTransactions.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            {filter === 'tutti' ? 'Nessuna Transazione' : `Nessuna ${filter.slice(0, -1)}`}
          </h3>
          <p className="text-gray-500">
            {filter === 'tutti' 
              ? `Nessuna transazione registrata nel ${selectedYear}`
              : `Non ci sono ${filter} registrate nel ${selectedYear}`
            }
          </p>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <TransactionForm
          transaction={selectedTransaction}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}

