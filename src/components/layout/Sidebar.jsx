import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Dog,
  Calendar,
  Heart,
  Baby,
  Euro,
  TrendingUp,
  Trophy,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const allNavigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'I Miei Cani', to: '/dogs', icon: Dog },
  { name: 'Riproduzione', to: '/breeding', icon: Heart, breedingOnly: true },
  { name: 'Cuccioli', to: '/puppies', icon: Baby, breedingOnly: true },
  { name: 'Finanze', to: '/finance', icon: Euro },
  { name: 'Salute', to: '/health', icon: TrendingUp },
  { name: 'Giudici', to: '/judges', icon: Trophy },
  { name: 'Calendario', to: '/calendar', icon: Calendar },
]

function BrandIcon() {
  return (
    <svg viewBox="0 0 65 55.02" className="w-9 h-9 flex-shrink-0">
      <path fill="#35ED6C" d="M55,38.52h-2.41c-.89,0-1.62-.73-1.62-1.62v-9.91c0-.89-.73-1.62-1.62-1.62h-5.66c-.89,0-1.62-.73-1.62-1.62v-5.5c0-.89-.73-1.62-1.62-1.62h-17.08c-.89,0-1.62.73-1.62,1.62v5.5c0,.89-.73,1.62-1.62,1.62h-5.66c-.89,0-1.62.73-1.62,1.62v9.91c0,.89-.73,1.62-1.62,1.62h-2.97c-.89,0-1.62.73-1.62,1.62v8.59c0,.89.73,1.62,1.62,1.62h17.08c.89,0,1.62-.73,1.62-1.62v-2.67c0-.89.73-1.62,1.62-1.62h6.1c.89,0,1.62.73,1.62,1.62v2.67c0,.89.73,1.62,1.62,1.62h17.08c.89,0,1.62-.73,1.62-1.62v-8.59c0-.89-.73-1.62-1.62-1.62ZM35.92,34.85c0,.89-.73,1.62-1.62,1.62h-4.78c-.89,0-1.62-.73-1.62-1.62v-4.78c0-.89.73-1.62,1.62-1.62h4.78c.89,0,1.62.73,1.62,1.62v4.78Z"/>
      <rect fill="#35ED6C" x="1.03" y="13.05" width="11.82" height="11.82" rx="1.62" ry="1.62"/>
      <rect fill="#35ED6C" x="15.84" y=".73" width="11.82" height="11.82" rx="1.62" ry="1.62"/>
      <rect fill="#35ED6C" x="36.16" y=".73" width="11.82" height="11.82" rx="1.62" ry="1.62"/>
      <rect fill="#35ED6C" x="50.97" y="13.05" width="11.82" height="11.82" rx="1.62" ry="1.62"/>
    </svg>
  )
}

export default function Sidebar() {
  const { isPrivate } = useAuth()
  const navigate = useNavigate()
  const navigation = allNavigation.filter(item => !isPrivate || !item.breedingOnly)

  return (
    <aside className="w-64 bg-primary-900 text-white hidden md:flex flex-col py-6 px-4">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <BrandIcon />
        <div>
          <p className="text-sm font-bold leading-tight text-white tracking-wide">Allevamento</p>
          <p className="text-xs font-semibold text-primary-100 tracking-widest uppercase">Digitale</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary-100 text-primary-900 font-semibold shadow-sm'
                  : 'text-primary-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="mt-auto pt-4 border-t border-primary-800 space-y-1">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-primary-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Impostazioni</span>
        </button>
      </div>
    </aside>
  )
}
