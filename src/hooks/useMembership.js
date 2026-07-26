import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Stabilisce se l'utente corrente è il TITOLARE dell'account o un
// DIPENDENTE con accesso limitato, e con quali permessi.
//
// Nota: la sicurezza reale è nelle policy RLS. Questo hook serve solo a
// mostrare/nascondere le sezioni giuste: in caso di errore ripiega su
// "titolare" (fail-open lato UI), ma i dati restano comunque protetti dal
// database, che a un dipendente restituisce solo ciò che gli compete.
export function useMembership() {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['membership', user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // Collega un eventuale invito già presente (caso: l'account esisteva
      // già prima dell'invito). No-op se non c'è nulla da collegare.
      try { await supabase.rpc('accept_invite') } catch { /* ignora */ }

      const { data, error } = await supabase
        .from('staff')
        .select('id, user_id, name, access_level, permissions, access_status')
        .eq('member_user_id', user.id)
        .eq('access_status', 'attivo')
        .maybeSingle()
      if (error) throw error
      return data || null
    },
  })

  const isMember = !!data
  const isOwner = !isMember
  const ownerId = data?.user_id || user?.id || null
  const permissions = data?.permissions || null

  // I titolari possono tutto; i dipendenti solo le sezioni permesse.
  const can = (mod) => isOwner || permissions?.[mod] === true

  return {
    isOwner,
    isMember,
    ownerId,
    permissions,
    membership: data || null,
    can,
    loading: isLoading,
  }
}
