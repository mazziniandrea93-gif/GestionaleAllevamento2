import { useState } from 'react'
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, X, Clock, CheckCircle, Edit, Trash2, Circle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/supabase'
import toast from 'react-hot-toast'
import EventForm from '@/components/calendar/EventForm'

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const queryClient = useQueryClient()

  // Fetch all events
  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => db.getEvents({}),
  })

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

  // Get events for a specific day
  const getEventsForDay = (day) => {
    return allEvents.filter(event => isSameDay(new Date(event.event_date), day))
  }

  const handleDayClick = (day, events) => {
    if (events.length > 0) {
      setSelectedDay(day)
    }
  }

  const handleEventClick = (event, e) => {
    e.stopPropagation()
    setSelectedEvent(event)
  }

  const handleCloseModal = () => {
    setSelectedDay(null)
    setSelectedEvent(null)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingEvent(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    queryClient.invalidateQueries(['events'])
    handleCloseModal()
  }

  const handleEdit = (event) => {
    setEditingEvent(event)
    setIsFormOpen(true)
    setSelectedEvent(null)
  }

  const handleDelete = async (event) => {
    if (!confirm(`Sei sicuro di voler eliminare l'evento?\n\n"${event.title}"`)) return

    try {
      await db.deleteEvent(event.id)
      toast.success('Evento eliminato con successo')
      queryClient.invalidateQueries(['events'])
      handleCloseModal()
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

  const getCategoryColor = (category) => {
    const colors = {
      vaccino: 'bg-blue-500',
      visita: 'bg-green-500',
      toelettatura: 'bg-purple-500',
      addestramento: 'bg-orange-500',
      esposizione: 'bg-pink-500',
      altro: 'bg-gray-500'
    }
    return colors[category] || 'bg-gray-500'
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

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isCurrentDay = isToday(day)
            const dayEvents = getEventsForDay(day)
            const hasEvents = dayEvents.length > 0

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day, dayEvents)}
                className={`
                  min-h-[120px] p-2 rounded-xl border-2 transition cursor-pointer
                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${isCurrentDay ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}
                  ${hasEvents && isCurrentMonth ? 'hover:border-primary-300 hover:shadow-md' : 'hover:border-gray-300'}
                `}
              >
                {/* Day Number */}
                <div className={`
                  text-sm font-bold mb-1
                  ${!isCurrentMonth ? 'text-gray-300' : isCurrentDay ? 'text-primary-600' : 'text-gray-700'}
                `}>
                  {format(day, 'd')}
                </div>

                {/* Events List */}
                {isCurrentMonth && (
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className={`
                          text-xs px-2 py-1 rounded-lg font-medium truncate
                          ${getCategoryColor(event.category)} text-white
                          hover:scale-105 transition cursor-pointer
                          ${event.completed ? 'opacity-60 line-through' : ''}
                        `}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium px-2">
                        +{dayEvents.length - 3} altri
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Legenda Categorie</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { category: 'vaccino', label: 'Vaccino' },
            { category: 'visita', label: 'Visita' },
            { category: 'toelettatura', label: 'Toelettatura' },
            { category: 'addestramento', label: 'Addestramento' },
            { category: 'esposizione', label: 'Esposizione' },
            { category: 'altro', label: 'Altro' }
          ].map(({ category, label }) => (
            <div key={category} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${getCategoryColor(category)}`}></div>
              <span className="text-sm text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal - Day Events */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 flex justify-between items-center rounded-t-3xl">
              <h3 className="text-2xl font-black text-dark-900">
                {format(selectedDay, 'dd MMMM yyyy', { locale: it })}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Events List */}
            <div className="p-8 space-y-4">
              {getEventsForDay(selectedDay).map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100 hover:border-primary-200 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(event.category)}`}></div>
                        <h4 className={`text-lg font-bold text-gray-900 ${event.completed ? 'line-through' : ''}`}>
                          {event.title}
                        </h4>
                      </div>
                      {event.dog?.name && (
                        <p className="text-sm text-gray-600 mb-2">
                          🐕 {event.dog.name}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(event.event_date), 'HH:mm', { locale: it })}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleComplete(event)}
                        className={`p-2 rounded-xl transition ${
                          event.completed
                            ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={event.completed ? 'Segna come non completato' : 'Segna come completato'}
                      >
                        {event.completed ? <Circle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleEdit(event)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(event)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal - Single Event Details */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-6 rounded-t-3xl">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className={`text-2xl font-black text-white mb-2 ${selectedEvent.completed ? 'line-through' : ''}`}>
                    {selectedEvent.title}
                  </h3>
                  <div className="flex items-center gap-2 text-white/90">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {format(new Date(selectedEvent.event_date), 'dd MMMM yyyy - HH:mm', { locale: it })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-white/80 hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              {/* Category */}
              <div>
                <div className="text-sm font-bold text-gray-500 mb-2">Categoria</div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${getCategoryColor(selectedEvent.category)}`}></div>
                  <span className="capitalize font-medium">{selectedEvent.category}</span>
                </div>
              </div>

              {/* Dog */}
              {selectedEvent.dog?.name && (
                <div>
                  <div className="text-sm font-bold text-gray-500 mb-2">Cane</div>
                  <div className="text-lg font-bold text-gray-900">
                    🐕 {selectedEvent.dog.name}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <div className="text-sm font-bold text-gray-500 mb-2">Descrizione</div>
                  <p className="text-gray-700 leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}

              {/* Status */}
              <div>
                <div className="text-sm font-bold text-gray-500 mb-2">Stato</div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${
                  selectedEvent.completed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedEvent.completed ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Completato
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5" />
                      Da completare
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleToggleComplete(selectedEvent)}
                  className={`flex-1 px-6 py-3 rounded-2xl font-bold transition ${
                    selectedEvent.completed
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/30'
                  }`}
                >
                  {selectedEvent.completed ? 'Segna Non Completato' : 'Segna Completato'}
                </button>
                <button
                  onClick={() => handleEdit(selectedEvent)}
                  className="px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
                >
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(selectedEvent)}
                  className="px-6 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition shadow-lg shadow-red-500/30"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {isFormOpen && (
        <EventForm
          event={editingEvent}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}

