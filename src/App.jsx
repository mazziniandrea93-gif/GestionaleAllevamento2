import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Auth } from './pages/Auth'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Dogs from './pages/Dogs'
import DogDetail from './pages/DogDetail'
import Breeding from './pages/Breeding'
import Puppies from './pages/Puppies'
import Finance from './pages/Finance'
import Health from './pages/Health'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minuti
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rotta pubblica per autenticazione */}
            <Route path="/auth" element={<Auth />} />

            {/* Rotte protette */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="dogs" element={<Dogs />} />
              <Route path="dogs/:id" element={<DogDetail />} />
              <Route path="breeding" element={<Breeding />} />
              <Route path="puppies" element={<Puppies />} />
              <Route path="finance" element={<Finance />} />
              <Route path="health" element={<Health />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>

      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#2D1B14',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
