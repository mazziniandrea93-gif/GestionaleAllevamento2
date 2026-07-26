import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import RequirePermission from './components/RequirePermission'
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
import Judges from './pages/Judges'
import Routines from './pages/Routines'
import Staff from './pages/Staff'

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
              <Route path="dashboard" element={<RequirePermission module="dashboard"><Dashboard /></RequirePermission>} />
              <Route path="dogs" element={<RequirePermission module="dogs"><Dogs /></RequirePermission>} />
              <Route path="dogs/:id" element={<RequirePermission module="dogs"><DogDetail /></RequirePermission>} />
              <Route path="breeding" element={<RequirePermission module="breeding"><Breeding /></RequirePermission>} />
              <Route path="puppies" element={<RequirePermission module="puppies"><Puppies /></RequirePermission>} />
              <Route path="finance" element={<RequirePermission module="finance"><Finance /></RequirePermission>} />
              <Route path="health" element={<RequirePermission module="health"><Health /></RequirePermission>} />
              <Route path="routines" element={<RequirePermission module="routines"><Routines /></RequirePermission>} />
              <Route path="staff" element={<RequirePermission module="staff"><Staff /></RequirePermission>} />
              <Route path="calendar" element={<RequirePermission module="calendar"><Calendar /></RequirePermission>} />
              <Route path="judges" element={<RequirePermission module="judges"><Judges /></RequirePermission>} />
              <Route path="settings" element={<RequirePermission module="settings"><Settings /></RequirePermission>} />
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
