import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Dog,
  Calendar,
  Heart,
  Baby,
  Euro,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const allNavigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'I Miei Cani', to: '/dogs', icon: Dog },
  { name: 'Riproduzione', to: '/breeding', icon: Heart, breedingOnly: true },
  { name: 'Cuccioli', to: '/puppies', icon: Baby, breedingOnly: true },
  { name: 'Finanze', to: '/finance', icon: Euro },
  { name: 'Salute', to: '/health', icon: TrendingUp },
  { name: 'Calendario', to: '/calendar', icon: Calendar },
]

export default function Sidebar() {
  const { isPrivate } = useAuth()
  const navigation = allNavigation.filter(item => !isPrivate || !item.breedingOnly)
  return (
    <aside className="w-64 bg-dark-900 text-white hidden md:flex flex-col p-6">
      {/* Logo */}
      <div className="mb-10">
        <h1 className="text-2xl font-black tracking-tight">
          🐕 ALLEVAMENTO
        </h1>
        <p className="text-xs text-gray-400 mt-1">Gestionale Professionale</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-2xl transition ${
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

      {/* User Profile */}
      <div className="mt-auto pt-6 border-t border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
            AG
          </div>
          <div>
            <p className="text-xs font-bold">Allevatore</p>
            <p className="text-[10px] text-gray-400">admin@allevamento.it</p>
          </div>
        </div>
        
      </div>
    </aside>
  )
}
