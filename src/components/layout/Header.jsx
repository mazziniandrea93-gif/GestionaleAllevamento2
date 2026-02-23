import {
  Search, Bell, LogOut, User, X, Settings, UserCircle, Menu,
  LayoutDashboard, Dog, Calendar, Heart, Baby, Euro, TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useState, useEffect, useRef } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'

export default function Header() {
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: it })
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const searchRef = useRef(null)
  const notificationsRef = useRef(null)
  const userMenuRef = useRef(null)

  // Chiudi i dropdown quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Carica notifiche
  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user])

  const loadNotifications = async () => {
    try {
      // Carica eventi futuri (prossimi 7 giorni)
      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .lte('event_date', weekFromNow.toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5)

      // Carica cuccioli disponibili
      const { data: puppies, error: puppiesError } = await supabase
        .from('puppies')
        .select('*, litters(birth_date)')
        .eq('user_id', user.id)
        .eq('status', 'disponibile')
        .limit(3)

      const notificationsList = []

      if (events && events.length > 0) {
        events.forEach(event => {
          notificationsList.push({
            id: `event-${event.id}`,
            type: 'event',
            title: event.title,
            message: `${format(new Date(event.event_date), 'd MMM', { locale: it })} - ${event.event_type}`,
            date: event.event_date,
            link: '/calendar'
          })
        })
      }

      if (puppies && puppies.length > 0) {
        notificationsList.push({
          id: 'puppies-available',
          type: 'puppy',
          title: `${puppies.length} cuccioli disponibili`,
          message: 'Hai cuccioli pronti per la vendita',
          date: new Date(),
          link: '/puppies'
        })
      }

      setNotifications(notificationsList)
      setUnreadCount(notificationsList.length)
    } catch (error) {
      console.error('Errore caricamento notifiche:', error)
    }
  }

  // Funzione di ricerca
  const handleSearch = async (term) => {
    setSearchTerm(term)

    if (term.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    try {
      const searchLower = term.toLowerCase()

      // Cerca nei cani
      const { data: dogs, error: dogsError } = await supabase
        .from('dogs')
        .select('id, name, breed, status')
        .eq('user_id', user.id)
        .or(`name.ilike.%${searchLower}%,breed.ilike.%${searchLower}%,microchip.ilike.%${searchLower}%`)
        .limit(5)

      // Cerca nei cuccioli
      const { data: puppies, error: puppiesError } = await supabase
        .from('puppies')
        .select('id, name, gender, status')
        .eq('user_id', user.id)
        .or(`name.ilike.%${searchLower}%`)
        .limit(5)

      // Cerca negli eventi
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, event_type, event_date')
        .eq('user_id', user.id)
        .or(`title.ilike.%${searchLower}%,description.ilike.%${searchLower}%`)
        .limit(5)

      const results = []

      if (dogs && dogs.length > 0) {
        dogs.forEach(dog => {
          results.push({
            id: dog.id,
            type: 'dog',
            title: dog.name,
            subtitle: `${dog.breed} - ${dog.status}`,
            link: `/dogs/${dog.id}`
          })
        })
      }

      if (puppies && puppies.length > 0) {
        puppies.forEach(puppy => {
          results.push({
            id: puppy.id,
            type: 'puppy',
            title: puppy.name || 'Cucciolo senza nome',
            subtitle: `${puppy.gender} - ${puppy.status}`,
            link: '/puppies'
          })
        })
      }

      if (events && events.length > 0) {
        events.forEach(event => {
          results.push({
            id: event.id,
            type: 'event',
            title: event.title,
            subtitle: `${format(new Date(event.event_date), 'd MMM yyyy', { locale: it })}`,
            link: '/calendar'
          })
        })
      }

      setSearchResults(results)
      setShowSearchResults(results.length > 0)
    } catch (error) {
      console.error('Errore nella ricerca:', error)
    }
  }

  const handleResultClick = (link) => {
    navigate(link)
    setShowSearchResults(false)
    setSearchTerm('')
  }

  const handleNotificationClick = (notification) => {
    navigate(notification.link)
    setShowNotifications(false)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Logout effettuato con successo')
    } catch (error) {
      toast.error('Errore durante il logout')
    }
  }

  // Navigation items per mobile menu
  const navigation = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'I Miei Cani', to: '/dogs', icon: Dog },
    { name: 'Riproduzione', to: '/breeding', icon: Heart },
    { name: 'Cuccioli', to: '/puppies', icon: Baby },
    { name: 'Finanze', to: '/finance', icon: Euro },
    { name: 'Salute', to: '/health', icon: TrendingUp },
    { name: 'Calendario', to: '/calendar', icon: Calendar },
    { name: 'Impostazioni', to: '/settings', icon: Settings },
  ]

  return (
    <>
      <header className="bg-white border-b border-gray-200 p-4 md:p-6">
        <div className="flex justify-between items-center">
          {/* Mobile: Hamburger Menu */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>

          {/* Desktop: Date & Time */}
          <div className="hidden md:block">
            <p className="text-sm text-gray-500 capitalize">{today}</p>
          </div>

          {/* Search & Notifications & User */}
          <div className="flex items-center space-x-2 md:space-x-4 ml-auto">
            {/* Search Bar - Hidden on small mobile, visible on tablet+ */}
            <div className="relative hidden sm:block" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca cane, cucciolo, evento..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:ring-2 focus:ring-primary-300 focus:border-transparent outline-none w-48 md:w-64"
              />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSearchResults([])
                  setShowSearchResults(false)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                <div className="p-2">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result.link)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition flex items-center gap-3"
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        result.type === 'dog' ? 'bg-blue-500' :
                        result.type === 'puppy' ? 'bg-green-500' :
                        'bg-purple-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{result.title}</p>
                        <p className="text-xs text-gray-500">{result.subtitle}</p>
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{result.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-bold text-gray-900">Notifiche</h3>
                  <p className="text-xs text-gray-500">{unreadCount} non lette</p>
                </div>

                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nessuna notifica</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'event' ? 'bg-purple-500' : 'bg-green-500'
                          }`}></div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{notification.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {typeof notification.date === 'string'
                                ? format(new Date(notification.date), 'd MMM yyyy', { locale: it })
                                : format(notification.date, 'd MMM yyyy', { locale: it })
                              }
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {notifications.length > 0 && (
                  <div className="p-3 border-t border-gray-200 text-center">
                    <button
                      onClick={() => {
                        setUnreadCount(0)
                        setShowNotifications(false)
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                    >
                      Segna tutte come lette
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 md:gap-3 md:pl-3 md:border-l border-gray-200 hover:bg-gray-50 py-2 px-2 md:px-3 rounded-lg transition"
            >
              {/* Desktop: Email e Ruolo - Hidden on mobile */}
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-700">{user?.email}</p>
                <p className="text-xs text-gray-500">Allevatore</p>
              </div>
              {/* Avatar - Always visible */}
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200">
                  <p className="font-semibold text-gray-900 text-sm truncate">{user?.email}</p>
                  <p className="text-xs text-gray-500">Gestionale Allevamento</p>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      navigate('/settings')
                      setShowUserMenu(false)
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 rounded-lg transition flex items-center gap-3"
                  >
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Impostazioni</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/settings')
                      setShowUserMenu(false)
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 rounded-lg transition flex items-center gap-3"
                  >
                    <UserCircle className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Profilo</span>
                  </button>
                </div>

                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      handleLogout()
                      setShowUserMenu(false)
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 rounded-lg transition flex items-center gap-3 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-semibold">Esci</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

      {/* Mobile Offcanvas Menu */}
      {showMobileMenu && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          ></div>

          {/* Offcanvas Sidebar */}
          <div className="fixed top-0 left-0 bottom-0 w-80 bg-dark-900 text-white z-50 md:hidden overflow-y-auto">
            <div className="p-6">
              {/* Header con Logo e Close */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-black tracking-tight">
                    🐕 ALLEVAMENTO
                  </h1>
                  <p className="text-xs text-gray-400 mt-1">Gestionale Professionale</p>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* User Info */}
              <div className="mb-8 p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{user?.email}</p>
                    <p className="text-xs text-gray-400">Allevatore</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setShowMobileMenu(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 p-3 rounded-xl transition ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-400 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-semibold">{item.name}</span>
                  </NavLink>
                ))}
              </nav>

              {/* Logout Button */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <button
                  onClick={() => {
                    handleLogout()
                    setShowMobileMenu(false)
                  }}
                  className="flex items-center gap-3 p-3 w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition rounded-xl"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-semibold">Esci</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
