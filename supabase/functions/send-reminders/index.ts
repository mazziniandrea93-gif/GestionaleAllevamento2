import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
const ONESIGNAL_REST_KEY = Deno.env.get('ONESIGNAL_REST_KEY')!

Deno.serve(async () => {
  const today = new Date()

  // Trova tutti gli eventi dove oggi cade nel range del reminder
  // (event_date - reminder_days = oggi)
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id, title, event_date, reminder_days, event_type, user_id
    `)
    .eq('completed', false)

  if (error) {
    console.error('Errore fetch eventi:', error)
    return new Response('Error', { status: 500 })
  }

  const toNotify = events?.filter(event => {
    const eventDate = new Date(event.event_date)
    const reminderDate = new Date(eventDate)
    reminderDate.setDate(reminderDate.getDate() - (event.reminder_days || 0))

    return (
      reminderDate.getFullYear() === today.getFullYear() &&
      reminderDate.getMonth() === today.getMonth() &&
      reminderDate.getDate() === today.getDate()
    )
  }) ?? []

  console.log(`Trovati ${toNotify.length} reminder da inviare`)

  // Raccoglie i player ID da settings per ogni utente coinvolto
  const userIds = [...new Set(toNotify.map(e => e.user_id))]
  const { data: settingsRows } = await supabase
    .from('settings')
    .select('user_id, onesignal_player_id')
    .in('user_id', userIds)

  const playerIdByUser: Record<string, string> = {}
  settingsRows?.forEach(s => {
    if (s.onesignal_player_id) playerIdByUser[s.user_id] = s.onesignal_player_id
  })

  for (const event of toNotify) {
    const playerId = playerIdByUser[event.user_id]
    const daysLeft = event.reminder_days

    const message = daysLeft === 0
      ? `📅 Oggi: ${event.title}`
      : `⏰ Tra ${daysLeft} giorni: ${event.title}`

    const body: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      contents: { it: message, en: message },
      headings: { it: 'Promemoria Evento', en: 'Event Reminder' },
    }

    // Invia al player ID specifico se disponibile, altrimenti a tutti
    if (playerId) {
      body.include_player_ids = [playerId]
    } else {
      body.included_segments = ['All']
    }

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_KEY}`,
      },
      body: JSON.stringify(body),
    })

    const result = await res.json()
    console.log(`Notifica "${event.title}":`, result)
  }

  return new Response(JSON.stringify({ sent: toNotify.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
