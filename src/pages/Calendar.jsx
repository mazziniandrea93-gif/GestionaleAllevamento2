import { useState } from 'react'
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'
import EventForm from '@/components/calendar/EventForm'
import EventCard from '@/components/calendar/EventCard'

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const queryClient = useQueryClient()

  // Fetch all events
  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => db.getEvents({}),
  })

  // Filter events for selected date
  const eventsForSelectedDate = allEvents.filter(event =>
    isSameDay(new Date(event.event_date), selectedDate)
  )

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  // Get events count for each day
  const getEventsForDay = (day) => {
    return allEvents.filter(event => isSameDay(new Date(event.event_date), day))
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setSelectedEvent(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    queryClient.invalidateQueries(['events'])
  }

  const handleEdit = (event) => {
    setSelectedEvent(event)
    setIsFormOpen(true)
  }

  const handleDelete = async (event) => {
    if (!confirm(`Sei sicuro di voler eliminare l'evento?\n\n"${event.title}"`)) return

    try {
      await db.deleteEvent(event.id)
      toast.success('Evento eliminato con successo')
      queryClient.invalidateQueries(['events'])
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Errore durante l\'eliminazione')
    }
  }

  const handleToggleComplete = async (event) => {
    try {
      await db.updateEvent(event.id, { completed: !event.completed })
      toast.success(event.completed ? 'Evento segnato come non completato' : 'Evento completato!')
      queryClient.invalidateQueries(['events'])
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error('Errore durante l\'aggiornamento')
    }
  }

  const handleDayClick = (day) => {
    setSelectedDate(day)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-dark-900">Calendario</h2>
          <p className="text-gray-500 mt-1">Organizza eventi e appuntamenti</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
        >
          <Plus className="w-5 h-5" />
          Nuovo Evento
        </button>
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-gray-900 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: it })}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-xl transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-xl transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-bold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isCurrentDay = isToday(day)
            const isSelected = isSameDay(day, selectedDate)
            const dayEvents = getEventsForDay(day)
            const hasEvents = dayEvents.length > 0

            return (
              <button
                key={idx}
                onClick={() => handleDayClick(day)}
                className={`
                  aspect-square p-2 rounded-xl text-center transition relative
                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}
                  ${isCurrentDay ? 'bg-primary-500 text-white font-bold' : ''}
                  ${isSelected && !isCurrentDay ? 'bg-primary-100 border-2 border-primary-500' : ''}
                  ${!isCurrentDay && !isSelected ? 'hover:bg-gray-100' : ''}
                `}
              >
                <div className="text-sm">{format(day, 'd')}</div>
                {hasEvents && isCurrentMonth && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${isCurrentDay ? 'bg-white' : 'bg-primary-500'}`}></div>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
        <h3 className="text-xl font-black text-gray-900 mb-4">
          Eventi del {format(selectedDate, 'dd MMMM yyyy', { locale: it })}
        </h3>

        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        )}

        {!isLoading && eventsForSelectedDate.length > 0 && (
          <div className="space-y-4">
            {eventsForSelectedDate.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        )}

        {!isLoading && eventsForSelectedDate.length === 0 && (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CalendarIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">Nessun evento programmato per questa data</p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition"
            >
              Aggiungi Evento
            </button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <EventForm
          event={selectedEvent}
          selectedDate={selectedDate}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}

