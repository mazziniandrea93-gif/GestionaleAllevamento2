import { Lock, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePlan } from '@/hooks/usePlan'
import { FEATURE_LABELS, planWithFeature } from '@/lib/plans'

// Racchiude una funzione riservata ai piani a pagamento:
//   <FeatureGate feature="coi_planner"> ... </FeatureGate>
// Se il piano dell'utente include la funzione (o siamo in LAUNCH_MODE)
// mostra i children; altrimenti mostra il prompt di upgrade.
// Con fallback si può sostituire il prompt (es. fallback={null} per
// nascondere del tutto un pulsante).
export function FeatureGate({ feature, children, fallback }) {
  const { hasFeature } = usePlan()

  if (hasFeature(feature)) return children
  if (fallback !== undefined) return fallback
  return <UpgradePrompt feature={feature} />
}

export function UpgradePrompt({ feature }) {
  const requiredPlan = planWithFeature(feature)
  const label = FEATURE_LABELS[feature] || 'Questa funzione'

  return (
    <div className="p-6 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center space-y-3">
      <div className="w-12 h-12 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
        <Lock className="w-6 h-6 text-amber-600" />
      </div>
      <div>
        <p className="font-bold text-amber-800">{label} non è inclusa nel tuo piano</p>
        {requiredPlan && (
          <p className="text-sm text-amber-700 mt-1">
            È disponibile dal piano <strong>{requiredPlan.name}</strong>.
          </p>
        )}
      </div>
      <Link
        to="/settings?tab=piano"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition"
      >
        <Sparkles className="w-4 h-4" />
        Vedi i piani
      </Link>
    </div>
  )
}
