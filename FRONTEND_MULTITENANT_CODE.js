// ============================================
// ESEMPI CODICE FRONTEND PER MULTI-TENANT
// ============================================

// ============================================
// 1. PAGINA LOGIN/REGISTRO
// ============================================
// File: src/pages/Auth.jsx

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [kennelName, setKennelName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      toast.success('Login effettuato!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Registra l'utente
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            kennel_name: kennelName
          }
        }
      })

      if (error) throw error

      // Il trigger initialize_user_settings creerà automaticamente le impostazioni

      toast.success('Registrazione completata! Controlla la tua email.')
      setIsLogin(true)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">
            {isLogin ? 'Login' : 'Registrazione'}
          </h2>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nome Allevamento
              </label>
              <input
                type="text"
                value={kennelName}
                onChange={(e) => setKennelName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Caricamento...' : (isLogin ? 'Accedi' : 'Registrati')}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 2. CONTEXT PER GESTIONE AUTENTICAZIONE
// ============================================
// File: src/contexts/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Controlla sessione corrente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Ascolta cambiamenti autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    signOut: () => supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================
// 3. COMPONENTE PROTECTED ROUTE
// ============================================
// File: src/components/ProtectedRoute.jsx

import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" />
  }

  return children
}

// ============================================
// 4. AGGIORNAMENTO APP.JSX
// ============================================
// File: src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Auth } from './pages/Auth'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Dogs } from './pages/Dogs'
// ... altri import

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotta pubblica */}
          <Route path="/auth" element={<Auth />} />

          {/* Rotte protette */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dogs" element={<Dogs />} />
            {/* ... altre rotte */}
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

// ============================================
// 5. AGGIORNAMENTO SUPABASE.JS - FUNZIONI CRUD
// ============================================
// File: src/lib/supabase.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper per ottenere user_id corrente
async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')
  return user.id
}

export const db = {
  // ========== DOGS ==========
  async getDogs(status = null) {
    let query = supabase
      .from('dogs')
      .select('*')
      .order('name')

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getDog(id) {
    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createDog(dog) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('dogs')
      .insert([{ ...dog, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateDog(id, updates) {
    const { data, error } = await supabase
      .from('dogs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteDog(id) {
    const { error } = await supabase
      .from('dogs')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // ========== EXPENSES ==========
  async getExpenses(filters = {}) {
    let query = supabase
      .from('expenses')
      .select('*, dogs(name)')
      .order('expense_date', { ascending: false })

    if (filters.startDate) {
      query = query.gte('expense_date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('expense_date', filters.endDate)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createExpense(expense) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expense, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // ========== INCOME ==========
  async createIncome(income) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('income')
      .insert([{ ...income, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // ========== HEALTH RECORDS ==========
  async createHealthRecord(record) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('health_records')
      .insert([{ ...record, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // ========== EVENTS ==========
  async createEvent(event) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('events')
      .insert([{ ...event, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // ========== HEAT CYCLES ==========
  async createHeatCycle(heatCycle) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('heat_cycles')
      .insert([{ ...heatCycle, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // ========== MATINGS ==========
  async createMating(mating) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('matings')
      .insert([{ ...mating, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // ========== LITTERS ==========
  async createLitter(litter) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('litters')
      .insert([{ ...litter, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // ========== PUPPIES ==========
  async createPuppy(puppy) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('puppies')
      .insert([{ ...puppy, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // ========== DASHBOARD ==========
  async getDashboardSummary() {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .rpc('get_dashboard_summary', { p_user_id: userId })

    if (error) throw error
    return data[0]
  },

  // ========== SETTINGS ==========
  async getSettings() {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async updateSettings(updates) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ============================================
// 6. AGGIORNAMENTO HEADER CON LOGOUT
// ============================================
// File: src/components/layout/Header.jsx

import { useAuth } from '../../contexts/AuthContext'
import { LogOut } from 'lucide-react'

export function Header() {
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <header className="bg-white shadow">
      <div className="px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestionale Allevamento
        </h1>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            <LogOut size={16} />
            Esci
          </button>
        </div>
      </div>
    </header>
  )
}

// ============================================
// 7. ESEMPIO UPLOAD FILE SU STORAGE
// ============================================

// Funzione per upload foto cane
export async function uploadDogPhoto(file, dogId) {
  const userId = await getCurrentUserId()
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${dogId}/${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('dogs-photos')
    .upload(fileName, file)

  if (error) throw error

  // Ottieni URL pubblico
  const { data: { publicUrl } } = supabase.storage
    .from('dogs-photos')
    .getPublicUrl(fileName)

  return publicUrl
}

// ============================================
// 8. ESEMPIO REALTIME UPDATES (OPZIONALE)
// ============================================

// Ascolta cambiamenti in tempo reale sui propri cani
export function subscribeToUserDogs(userId, callback) {
  return supabase
    .channel('user-dogs')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'dogs',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

// Uso nel componente:
// useEffect(() => {
//   const subscription = subscribeToUserDogs(user.id, (payload) => {
//     console.log('Dog updated:', payload)
//     // Aggiorna lo stato locale
//   })
//
//   return () => subscription.unsubscribe()
// }, [user])

