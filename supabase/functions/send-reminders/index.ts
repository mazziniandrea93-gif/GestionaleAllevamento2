import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
const ONESIGNAL_REST_KEY = Deno.env.get('ONESIGNAL_REST_KEY')!

Deno.serve(async (req) => {
  // Consenti chiamate solo da Supabase cron o con Authorization header
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Recupera tutti gli eventi non completati che hanno reminder_days > 0
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, event_date, reminder_days, event_type, user_id')
    .eq('completed', false)
    .gt('reminder_days', 0)

  if (error) {
    console.error('Errore fetch eventi:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // Filtra gli eventi il cui giorno di reminder coincide con oggi
  const toNotify = (events ?? []).filter(event => {
    const eventDate = new Date(event.event_date)
    eventDate.setHours(0, 0, 0, 0)
    const reminderDate = new Date(eventDate)
    reminderDate.setDate(reminderDate.getDate() - (event.reminder_days ?? 0))
    return reminderDate.getTime() === today.getTime()
  })

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

    const daysLeft = event.reminder_days ?? 0
    const typeLabel = eventTypeLabel[event.event_type] ?? '📅 Evento'
    const heading = daysLeft === 1
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
