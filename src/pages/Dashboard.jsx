import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Dog, 
  Calendar,
  Baby
} from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'

export default function Dashboard() {
  const currentYear = new Date().getFullYear()

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
                className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition"
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
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                  event.event_type === 'veterinario' ? 'bg-red-100 text-red-700' :
                  event.event_type === 'calore_stimato' ? 'bg-pink-100 text-pink-700' :
                  event.event_type === 'parto_stimato' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {event.event_type.replace('_', ' ')}
                </span>
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
                className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-sm"
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
                <span className="text-green-600 font-bold">+€{item.amount}</span>
              </div>
            ))}

            {/* Expenses */}
            {expenses?.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-sm"
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
                <span className="text-red-600 font-bold">-€{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
