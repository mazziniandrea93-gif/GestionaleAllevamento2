import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Dog,
  Calendar,
  Baby,
  Edit,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import EventForm from '@/components/calendar/EventForm'
import TransactionForm from '@/components/finance/TransactionForm'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const currentYear = new Date().getFullYear()
  const queryClient = useQueryClient()

  const [editingEvent, setEditingEvent] = useState(null)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null) // { message, onConfirm }

  const invalidateEvents = () => queryClient.invalidateQueries(['upcoming-events'])
  const invalidateTransactions = () => {
    queryClient.invalidateQueries(['recent-income'])
    queryClient.invalidateQueries(['recent-expenses'])
    queryClient.invalidateQueries(['income'])
    queryClient.invalidateQueries(['expenses'])
    queryClient.invalidateQueries(['yearly-income', currentYear])
    queryClient.invalidateQueries(['yearly-expenses', currentYear])
  }

  const handleDeleteEvent = (event) => {
    setConfirmDialog({
      message: `Eliminare l'evento "${event.title}"?`,
      onConfirm: async () => {
        await db.deleteEvent(event.id)
        toast.success('Evento eliminato')
        invalidateEvents()
        setConfirmDialog(null)
      },
    })
  }

  const handleDoneEvent = (event) => {
    setConfirmDialog({
      message: `Segnare "${event.title}" come completato?`,
      confirmLabel: 'Fatto ✓',
      confirmClass: 'bg-green-500 hover:bg-green-600',
      onConfirm: async () => {
        await db.updateEvent(event.id, { completed: true })
        toast.success('Evento completato!')
        invalidateEvents()
        setConfirmDialog(null)
      },
    })
  }

  const handleDeleteTransaction = (item) => {
    setConfirmDialog({
      message: `Eliminare "${item.description}"?`,
      onConfirm: async () => {
        if (item.type === 'income') await db.deleteIncome(item.id)
        else await db.deleteExpense(item.id)
        toast.success('Transazione eliminata')
        invalidateTransactions()
        setConfirmDialog(null)
      },
    })
  }

  // Fetch statistiche annuali con cache
  const { data: yearlyIncome = 0, isLoading: loadingIncome } = useQuery({
    queryKey: ['yearly-income', currentYear],
    queryFn: () => db.getYearlyIncome(currentYear),
    staleTime: 1000 * 60 * 5, // Cache per 5 minuti
  })

  const { data: yearlyExpenses = 0, isLoading: loadingExpenses } = useQuery({
    queryKey: ['yearly-expenses', currentYear],
    queryFn: () => db.getYearlyExpenses(currentYear),
    staleTime: 1000 * 60 * 5, // Cache per 5 minuti
  })

  const { data: activeDogs = 0, isLoading: loadingDogs } = useQuery({
    queryKey: ['active-dogs'],
    queryFn: () => db.getActiveDogs(),
    staleTime: 1000 * 60 * 5, // Cache per 5 minuti
  })

  const { data: availablePuppies = 0, isLoading: loadingPuppies } = useQuery({
    queryKey: ['available-puppies'],
    queryFn: () => db.getAvailablePuppies(),
    staleTime: 1000 * 60 * 5, // Cache per 5 minuti
  })

  // Fetch recent expenses and income per transazioni
  const { data: expenses } = useQuery({
    queryKey: ['recent-expenses'],
    queryFn: () => db.getExpenses({
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
  })

  const { data: income } = useQuery({
    queryKey: ['recent-income'],
    queryFn: () => db.getIncome({
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
  })

  // Fetch upcoming events
  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: () => db.getEvents({ upcoming: true }),
  })

  const isLoading = loadingIncome || loadingExpenses || loadingDogs || loadingPuppies

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const stats = [
    {
      name: 'Cani Attivi',
      value: activeDogs,
      icon: Dog,
      gradient: 'from-purple-400 to-blue-400',
    },
    {
      name: 'Cuccioli Disponibili',
      value: availablePuppies,
      icon: Baby,
      gradient: 'from-pink-400 to-rose-400',
    },
    {
      name: 'Incassi Annuali',
      value: `€${yearlyIncome.toFixed(2)}`,
      icon: TrendingUp,
      gradient: 'from-green-400 to-emerald-400',
    },
    {
      name: 'Spese Annuali',
      value: `€${yearlyExpenses.toFixed(2)}`,
      icon: TrendingDown,
      gradient: 'from-orange-400 to-red-400',
    },
  ]

  const profit = yearlyIncome - yearlyExpenses

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-black text-dark-900 uppercase tracking-tighter">
          Buongiorno 🐕
        </h2>
        <p className="text-gray-500 font-medium mt-1">
          Ecco la panoramica del tuo allevamento
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className={`bg-gradient-to-br ${stat.gradient} p-8 rounded-[40px] shadow-lg text-white relative overflow-hidden`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold opacity-80 uppercase text-xs">{stat.name}</p>
                <stat.icon className="w-6 h-6 opacity-50" />
              </div>
              <h3 className="text-5xl font-black mb-3">{stat.value}</h3>
            </div>
            
            {/* Decorative element */}
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
          </div>
        ))}
      </div>

      {/* Profit/Loss Card */}
      <div className={`p-8 rounded-[40px] shadow-lg ${profit >= 0 ? 'bg-gradient-to-br from-green-100 to-emerald-100' : 'bg-gradient-to-br from-red-100 to-orange-100'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-600 uppercase">Bilancio Annuale {currentYear}</p>
            <h3 className="text-4xl font-black mt-2">
              €{Math.abs(profit).toFixed(2)}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {profit >= 0 ? 'Profitto' : 'Perdita'} quest'anno
            </p>
          </div>
          <DollarSign className={`w-20 h-20 ${profit >= 0 ? 'text-green-600' : 'text-red-600'} opacity-20`} />
        </div>
      </div>

      {/* Two Columns: Events & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Events */}
        <div className="bg-orange-50 p-8 rounded-[40px] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-black">Prossimi Eventi</h4>
            <Calendar className="w-6 h-6 text-orange-500" />
          </div>
          
          <div className="space-y-3">
            {upcomingEvents?.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{event.title}</p>
                    <p className="text-[10px] text-gray-400">
                      {format(new Date(event.event_date), 'dd MMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    event.event_type === 'veterinario' ? 'bg-red-100 text-red-700' :
                    event.event_type === 'calore_stimato' ? 'bg-pink-100 text-pink-700' :
                    event.event_type === 'parto_stimato' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {event.event_type.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => handleDoneEvent(event)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-green-500 hover:bg-green-50 transition opacity-0 group-hover:opacity-100"
                    title="Fatto"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingEvent(event)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-orange-500 hover:bg-orange-50 transition opacity-0 group-hover:opacity-100"
                    title="Modifica"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                    title="Elimina"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            
            {(!upcomingEvents || upcomingEvents.length === 0) && (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nessun evento in programma</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-green-50 p-8 rounded-[40px] shadow-sm">
          <h4 className="text-xl font-black mb-6">Transazioni Recenti</h4>
          
          <div className="space-y-3">
            {/* Income */}
            {income?.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{item.description}</p>
                    <p className="text-[10px] text-gray-400">
                      {format(new Date(item.income_date), 'dd MMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-green-600 font-bold">+€{item.amount}</span>
                  <button
                    onClick={() => setEditingTransaction({ ...item, type: 'income' })}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-green-500 hover:bg-green-50 transition opacity-0 group-hover:opacity-100"
                    title="Modifica"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTransaction({ ...item, type: 'income' })}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                    title="Elimina"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Expenses */}
            {expenses?.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{item.description}</p>
                    <p className="text-[10px] text-gray-400">
                      {format(new Date(item.expense_date), 'dd MMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-red-600 font-bold">-€{item.amount}</span>
                  <button
                    onClick={() => setEditingTransaction({ ...item, type: 'expense' })}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                    title="Modifica"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTransaction({ ...item, type: 'expense' })}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                    title="Elimina"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Popup conferma */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                confirmDialog.confirmClass?.includes('green') ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {confirmDialog.confirmClass?.includes('green')
                  ? <CheckCircle2 className="w-7 h-7 text-green-500" />
                  : <Trash2 className="w-7 h-7 text-red-500" />
                }
              </div>
              <p className="text-gray-700 font-semibold">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`flex-1 px-4 py-3 rounded-2xl text-white font-bold transition shadow-lg ${
                  confirmDialog.confirmClass || 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                }`}
              >
                {confirmDialog.confirmLabel || 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modifica Evento */}
      {editingEvent && (
        <EventForm
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSuccess={() => {
            setEditingEvent(null)
            queryClient.invalidateQueries(['upcoming-events'])
          }}
        />
      )}

      {/* Modifica Transazione */}
      {editingTransaction && (
        <TransactionForm
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={() => {
            setEditingTransaction(null)
            queryClient.invalidateQueries(['recent-income'])
            queryClient.invalidateQueries(['recent-expenses'])
            queryClient.invalidateQueries(['income'])
            queryClient.invalidateQueries(['expenses'])
          }}
        />
      )}
    </div>
  )
}
