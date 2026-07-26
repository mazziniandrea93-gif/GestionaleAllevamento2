import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PLANS, LAUNCH_MODE } from '@/lib/plans'

// Piano e limiti dell'utente corrente.
// In LAUNCH_MODE tutte le funzioni risultano disponibili a prescindere
// dal piano: i gate nel codice esistono già, ma non bloccano nulla.
export function usePlan() {
  const { user } = useAuth()

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  // Abbonamento scaduto/cancellato (o riga mancante) → free
  const isActive =
    subscription &&
    ['active', 'trialing'].includes(subscription.status) &&
    (!subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date())

  const planId = isActive ? subscription.plan : 'free'
  const planDef = PLANS[planId] ?? PLANS.free

  const hasFeature = (key) => LAUNCH_MODE || planDef.features[key] === true

  // null nel config = illimitato
  const limitFor = (key) => (LAUNCH_MODE ? null : planDef.limits[key] ?? null)

  const withinLimit = (key, currentCount) => {
    const limit = limitFor(key)
    return limit === null || currentCount < limit
  }

  return {
    planId,
    planDef,
    subscription,
    hasFeature,
    limitFor,
    withinLimit,
    isLaunchMode: LAUNCH_MODE,
    loading: isLoading,
  }
}
