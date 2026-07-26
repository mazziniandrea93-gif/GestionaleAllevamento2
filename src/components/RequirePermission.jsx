import { Navigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useMembership } from '@/hooks/useMembership'

// Protegge una rotta in base ai permessi del dipendente.
// - Titolare o membro con permesso → mostra la pagina.
// - Membro senza permesso → lo rimanda alle Attività (Routine).
// - Membro senza nemmeno le Routine → schermata "nessun accesso"
//   (evita loop di redirect).
export default function RequirePermission({ module, children }) {
  const { can, loading } = useMembership()

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (can(module)) return children
  if (can('routines')) return <Navigate to="/routines" replace />

  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-2xl font-black text-gray-800 mb-2">Accesso non disponibile</h2>
      <p className="text-gray-500 max-w-md">
        Il tuo profilo non ha ancora sezioni abilitate. Contatta il titolare dell’allevamento per ricevere i permessi.
      </p>
    </div>
  )
}
