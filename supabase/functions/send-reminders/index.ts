import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
const ONESIGNAL_REST_KEY = Deno.env.get('ONESIGNAL_REST_KEY')!

Deno.serve(async (_req) => {
  // L'accesso è già protetto dalla verifica JWT della piattaforma (verify_jwt):
  // solo chi presenta una chiave valida del progetto (es. la service role key
  // usata dal cron) raggiunge questo codice. Nessun controllo aggiuntivo serve.

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Recupera tutti gli eventi non completati che hanno reminder_days > 0
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, event_date, reminder_days, event_type, user_id, dog_ids')
    .eq('completed', false)
    .gt('reminder_days', 0)

  if (error) {
    console.error('Errore fetch eventi:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // Per ogni evento controlla se oggi è un giorno di promemoria.
  // Si notifica sia al giorno impostato (reminder_days) sia sempre 2 giorni prima.
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  let toNotify = (events ?? [])
    .map(event => {
      const eventDate = new Date(event.event_date)
      eventDate.setHours(0, 0, 0, 0)
      const daysLeft = Math.round((eventDate.getTime() - today.getTime()) / MS_PER_DAY)
      // Giorni in cui scatta il promemoria: quello configurato + 2 giorni prima
      const reminderOffsets = new Set([event.reminder_days ?? 0, 2])
      return { ...event, daysLeft, shouldNotify: reminderOffsets.has(daysLeft) }
    })
    .filter(event => event.shouldNotify)

  // Salta gli eventi i cui cani sono tutti non più attivi (deceduto/venduto/
  // ceduto). Gli eventi senza cani collegati restano sempre validi.
  const eventDogIds = [...new Set(toNotify.flatMap(e => e.dog_ids ?? []))]
  const statusByDog: Record<string, string> = {}
  if (eventDogIds.length > 0) {
    const { data: dogRows } = await supabase
      .from('dogs')
      .select('id, status')
      .in('id', eventDogIds)
    dogRows?.forEach(d => { statusByDog[d.id] = d.status })
  }

  const activeNotify = toNotify.filter(event => {
    const ids = event.dog_ids ?? []
    if (ids.length === 0) return true // evento generico non legato a un cane
    // Tieni l'evento se almeno un cane collegato è ancora attivo
    return ids.some(id => (statusByDog[id] ?? 'attivo') === 'attivo')
  })

  const skippedInactive = toNotify.length - activeNotify.length
  if (skippedInactive > 0) {
    console.log(`⏭️ ${skippedInactive} eventi saltati (cani non attivi)`)
  }
  toNotify = activeNotify

  console.log(`📅 Oggi: ${today.toISOString().split('T')[0]} — ${toNotify.length} promemoria da inviare`)

  if (toNotify.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Carica i player ID per ogni utente coinvolto
  const userIds = [...new Set(toNotify.map(e => e.user_id))]
  const { data: settingsRows } = await supabase
    .from('settings')
    .select('user_id, onesignal_player_id')
    .in('user_id', userIds)

  const playerIdByUser: Record<string, string> = {}
  settingsRows?.forEach(s => {
    if (s.onesignal_player_id) playerIdByUser[s.user_id] = s.onesignal_player_id
  })

  const eventTypeLabel: Record<string, string> = {
    veterinario: '🩺 Veterinario',
    toelettatura: '✂️ Toelettatura',
    esposizione: '🏆 Esposizione',
    calore_stimato: '🌡️ Calore stimato',
    parto_stimato: '🐶 Parto previsto',
    altro: '📅 Evento',
  }

  let sent = 0
  let skipped = 0

  for (const event of toNotify) {
    const playerId = playerIdByUser[event.user_id]
    if (!playerId) {
      console.log(`⚠️ Nessun player ID per utente ${event.user_id} — evento "${event.title}" saltato`)
      skipped++
      continue
    }

    const daysLeft = event.daysLeft
    const typeLabel = eventTypeLabel[event.event_type] ?? '📅 Evento'
    const heading = daysLeft === 0
      ? `${typeLabel} — oggi!`
      : daysLeft === 1
        ? `${typeLabel} — domani!`
        : `${typeLabel} — tra ${daysLeft} giorni`

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_subscription_ids: [playerId],
        headings: { it: heading, en: heading },
        contents: { it: event.title, en: event.title },
        url: `${Deno.env.get('APP_URL') ?? ''}/calendar`,
        web_push_topic: `event-${event.id}`,       // evita duplicati
        ttl: 86400,                                 // scade dopo 24h
      }),
    })

    const result = await res.json()
    if (result.errors?.length) {
      console.error(`❌ "${event.title}":`, result.errors)
    } else {
      console.log(`✅ Inviato "${event.title}" a ${playerId}`)
      sent++
    }
  }

  return new Response(
    JSON.stringify({ sent, skipped, total: toNotify.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
