// ============================================================
// CONFIGURAZIONE PIANI
// ============================================================
// Unica fonte di verità lato client per piani, limiti e funzioni.
// Il piano dell'utente vive in user_subscriptions (vedi
// supabase/plans.sql); qui si definisce cosa include ogni piano.
//
// LAUNCH_MODE = true → fase di lancio: tutte le funzioni sono
// sbloccate per tutti, a prescindere dal piano. Per iniziare a
// monetizzare basta metterlo a false (e collegare Stripe).
// I limiti veri andranno poi replicati anche lato database
// (RLS con public.current_plan()), perché il solo blocco
// frontend è aggirabile.
// ============================================================

export const LAUNCH_MODE = true

// null = illimitato
export const PLANS = {
  free: {
    id: 'free',
    name: 'Base',
    tagline: 'Per chi inizia o ha pochi cani',
    priceYearly: 0,
    limits: {
      dogs: 5,
      littersPerYear: 1,
    },
    features: {
      health_records: true,
      health_reminders: true,
      calendar: true,
      push_notifications: true,
      growth_charts: true,
      family_tree: true,
      routines: true,
      staff: false,
      coi_planner: false,
      pdf_export: false,
      contracts: false,
      finance: false,
      judges: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Allevatore',
    tagline: 'Per allevamenti attivi',
    priceYearly: 99,
    limits: {
      dogs: 30,
      littersPerYear: null,
    },
    features: {
      health_records: true,
      health_reminders: true,
      calendar: true,
      push_notifications: true,
      growth_charts: true,
      family_tree: true,
      routines: true,
      staff: false,
      coi_planner: true,
      pdf_export: true,
      contracts: true,
      finance: true,
      judges: false,
    },
  },
  premium: {
    id: 'premium',
    name: 'Professionale',
    tagline: 'Tutto incluso, senza limiti',
    priceYearly: 199,
    limits: {
      dogs: null,
      littersPerYear: null,
    },
    features: {
      health_records: true,
      health_reminders: true,
      calendar: true,
      push_notifications: true,
      growth_charts: true,
      family_tree: true,
      routines: true,
      staff: true,
      coi_planner: true,
      pdf_export: true,
      contracts: true,
      finance: true,
      judges: true,
    },
  },
}

export const PLAN_ORDER = ['free', 'pro', 'premium']

// Etichette leggibili per la pagina Piano e i prompt di upgrade
export const FEATURE_LABELS = {
  health_records: 'Libretto sanitario',
  health_reminders: 'Promemoria sanitari ricorrenti',
  calendar: 'Calendario eventi',
  push_notifications: 'Notifiche push',
  growth_charts: 'Grafici di crescita',
  family_tree: 'Albero genealogico',
  routines: 'Routine e attività giornaliere',
  staff: 'Gestione dipendenti',
  coi_planner: 'Pianificatore accoppiamenti (COI)',
  pdf_export: 'Export PDF',
  contracts: 'Contratti e precontratti',
  finance: 'Gestione finanziaria',
  judges: 'Giudici ed expo',
}

export const LIMIT_LABELS = {
  dogs: 'Cani registrabili',
  littersPerYear: 'Cucciolate per anno',
}

// Primo piano (in ordine di prezzo) che include la funzione:
// usato dai prompt di upgrade per suggerire a cosa passare.
export function planWithFeature(featureKey) {
  const id = PLAN_ORDER.find(p => PLANS[p].features[featureKey])
  return id ? PLANS[id] : null
}
