import { useEffect, useState } from 'react'
import OneSignal from 'react-onesignal'
import { supabase } from '@/lib/supabase'

export function useNotifications() {
  const [permission, setPermission] = useState(Notification.permission)

  // Salva il player ID su Supabase quando disponibile
  useEffect(() => {
    async function savePlayerId() {
      try {
        const playerId = await OneSignal.getUserId()
        if (!playerId) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
          .from('settings')
          .update({ onesignal_player_id: playerId })
          .eq('user_id', user.id)
      } catch (err) {
        console.error('Errore salvataggio player ID:', err)
      }
    }

    savePlayerId()

    OneSignal.on('subscriptionChange', (isSubscribed) => {
      if (isSubscribed) savePlayerId()
    })
  }, [])

  const requestPermission = async () => {
    await OneSignal.showSlidedownPrompt()
    setPermission(Notification.permission)
  }

  return { permission, requestPermission }
}
