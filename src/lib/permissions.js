// ============================================================
// PERMESSI DIPENDENTI
// ============================================================
// Chiavi delle sezioni gate-abili e livelli d'accesso preimpostati.
// La sicurezza vera è nelle policy RLS (supabase/memberships.sql):
// qui si decide solo cosa mostrare/nascondere nell'interfaccia.
// ============================================================

// Etichette leggibili delle sezioni (per la scheda dipendente)
export const MODULE_LABELS = {
  dashboard: 'Dashboard',
  dogs: 'Cani',
  breeding: 'Riproduzione',
  puppies: 'Cuccioli',
  health: 'Salute',
  routines: 'Routine',
  calendar: 'Calendario',
  judges: 'Giudici',
  finance: 'Finanze',
}

// Livelli d'accesso pronti. `permissions` è la fonte di verità: una
// sezione assente vale "non permessa".
export const ACCESS_PRESETS = {
  nessuno: {
    label: 'Solo etichetta',
    hint: 'Non entra nell’app: lo usi solo per assegnare le attività.',
    permissions: {},
  },
  dipendente: {
    label: 'Dipendente',
    hint: 'Vede solo le Attività del giorno e il Calendario.',
    permissions: { routines: true, calendar: true },
  },
  responsabile: {
    label: 'Responsabile',
    hint: 'Vede tutto tranne Finanze, Dipendenti e Impostazioni.',
    permissions: {
      dashboard: true, dogs: true, breeding: true, puppies: true,
      health: true, routines: true, calendar: true, judges: true,
    },
  },
}

export const ACCESS_ORDER = ['nessuno', 'dipendente', 'responsabile']

export function presetPermissions(level) {
  return ACCESS_PRESETS[level]?.permissions || {}
}

// Etichette di stato per la UI
export const ACCESS_STATUS = {
  nessuno: { label: 'Nessun accesso', color: '#94a3b8' },
  invitato: { label: 'Invitato', color: '#f59e0b' },
  attivo: { label: 'Attivo', color: '#10b981' },
  sospeso: { label: 'Sospeso', color: '#ef4444' },
}
