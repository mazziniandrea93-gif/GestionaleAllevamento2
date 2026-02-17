import { Search, Bell, LogOut, User } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Header() {
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: it })
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Logout effettuato con successo')
    } catch (error) {
      toast.error('Errore durante il logout')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 p-6">
      <div className="flex justify-between items-center">
        {/* Date & Time */}
        <div>
          <p className="text-sm text-gray-500 capitalize">{today}</p>
        </div>

        {/* Search & Notifications & User */}
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca cane, evento..."
              className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:ring-2 focus:ring-primary-300 focus:border-transparent outline-none w-64"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-full hover:bg-gray-100 transition">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Info */}
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">{user?.email}</p>
              <p className="text-xs text-gray-500">Allevatore</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
