import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Buffer (giorni) di anticipo con cui creare l'evento rispetto al primo
// giorno utile di notifica (next_due_date - reminder_days). Garantisce che
// l'evento esista prima che send-reminders debba inviare la push.
const LEAD_BUFFER_DAYS = 3
const MS_PER_DAY = 1000 * 60 * 60 * 24

const typeLabel: Record<string, string> = {
  vaccinazione: '💉 Vaccino',
  antiparassitario: '🐛 Antiparassitario',
  sverminazione: '💊 Sverminazione',
  altro: '🩺 Promemoria',
}

Deno.serve(async (_req) => {
  // L'accesso è già protetto dalla verifica JWT della piattaforma (verify_jwt):
  // solo chi presenta una chiave valida del progetto (es. la service role key
  // usata dal cron) raggiunge questo codice. Nessun controllo aggiuntivo serve.

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Promemoria attivi con una scadenza impostata.
  // Includo lo stato del cane: per cani non più attivi (deceduto/venduto/
  // ceduto) non si generano eventi né notifiche.
  const { data: reminders, error } = await supabase
    .from('health_reminders')
    .select('id, user_id, dog_id, reminder_type, description, next_due_date, reminder_days, dog:dogs(status)')
    .eq('active', true)

  if (error) {
    console.error('Errore fetch promemoria:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // Tieni solo i promemoria di cani attivi e abbastanza vicini alla scadenza
  // da dover già avere l'evento (e quindi la push) pronto.
  let skippedInactive = 0
  const dueSoon = (reminders ?? []).filter(r => {
    if (r.dog?.status && r.dog.status !== 'attivo') {
      skippedInactive++
      return false
    }
    const due = new Date(r.next_due_date)
    due.setHours(0, 0, 0, 0)
    const daysUntil = Math.round((due.getTime() - today.getTime()) / MS_PER_DAY)
    return daysUntil >= 0 && daysUntil <= (r.reminder_days ?? 0) + LEAD_BUFFER_DAYS
  })

  if (skippedInactive > 0) {
    console.log(`⏭️ ${skippedInactive} promemoria saltati (cane non attivo)`)
  }

  console.log(`🔔 ${dueSoon.length} promemoria in finestra di generazione`)

  let created = 0
  let skipped = 0

  for (const r of dueSoon) {
    // Tag univoco per evitare duplicati: una sola volta per scadenza
    const tag = `__health_reminder:${r.id}:${r.next_due_date}__`

    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .ilike('description', `%${tag}%`)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    const label = typeLabel[r.reminder_type] ?? typeLabel.altro
    const { error: insertError } = await supabase
      .from('events')
      .insert([{
        user_id: r.user_id,
        dog_ids: [r.dog_id],
        event_type: 'veterinario',
        title: `${label}: ${r.description ?? ''}`.trim(),
        description: tag,
        event_date: r.next_due_date,
        completed: false,
        reminder_days: r.reminder_days ?? 0,
      }])

    if (insertError) {
      console.error(`❌ Evento per promemoria ${r.id}:`, insertError.message)
    } else {
      console.log(`✅ Evento creato per "${r.description}" il ${r.next_due_date}`)
      created++
    }
  }

  return new Response(
    JSON.stringify({ created, skipped, checked: dueSoon.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
