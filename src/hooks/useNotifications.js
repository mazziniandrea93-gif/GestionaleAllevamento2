import { useEffect, useState, useCallback, useRef } from 'react'
import OneSignal from 'react-onesignal'
import { getOneSignalReady } from '@/lib/onesignal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useNotifications() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState('default')
  const [isReady, setIsReady] = useState(false)
  const [sdkUnavailable, setSdkUnavailable] = useState(false)
  const linkedRef = useRef(false)

  // Salva il subscription ID su Supabase settings
  const saveSubscriptionId = useCallback(async () => {
    if (!user?.id) return
    try {
      const subId = OneSignal.User?.PushSubscription?.id
      if (!subId) return
      await supabase
        .from('settings')
        .update({ onesignal_player_id: subId })
        .eq('user_id', user.id)
      console.log('[OneSignal] Subscription ID salvato:', subId)
    } catch (err) {
      console.error('[OneSignal] Errore salvataggio subscription ID:', err)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false

    async function setup() {
      // Attende che l'SDK sia davvero pronto (con timeout di sicurezza)
      const ready = await getOneSignalReady()
      if (cancelled) return

      if (!ready) {
        setSdkUnavailable(true)
        setIsReady(true)
        return
      }

      // Collega l'account OneSignal all'utente Supabase (una volta sola)
      if (!linkedRef.current) {
        linkedRef.current = true
        try {
          await OneSignal.login(user.id)
          console.log('[OneSignal] Login utente:', user.id)
        } catch (err) {
          console.warn('[OneSignal] login() fallito (non critico):', err)
        }
      }

      // Legge lo stato reale dall'SDK
      const opted = OneSignal.User?.PushSubscription?.optedIn ?? false
      const perm   = OneSignal.Notifications?.permission ?? false
      console.log('[OneSignal] Stato iniziale — optedIn:', opted, 'permission:', perm)

      if (!cancelled) {
        setIsSubscribed(opted)
        setPermission(perm ? 'granted' : Notification.permission)
        setIsReady(true)
        if (opted) saveSubscriptionId()
      }

      // Ascolta cambiamenti di subscription
      const handleChange = (event) => {
        const optedIn = event.current?.optedIn ?? false
        console.log('[OneSignal] Subscription cambiata — optedIn:', optedIn)
        setIsSubscribed(optedIn)
        if (optedIn) saveSubscriptionId()
      }
      OneSignal.User.PushSubscription.addEventListener('change', handleChange)

      // Cleanup
      return () => {
        OneSignal.User.PushSubscription.removeEventListener('change', handleChange)
      }
    }

    const cleanupPromise = setup()

    return () => {
      cancelled = true
      cleanupPromise.then(cleanup => cleanup?.())
    }
  }, [user?.id, saveSubscriptionId])

  // Attiva le notifiche — deve essere chiamato da un click dell'utente
  const enableNotifications = useCallback(async () => {
    console.log('[OneSignal] enableNotifications() chiamato, permission:', permission)
    try {
      const ready = await getOneSignalReady()
      if (!ready) {
        setSdkUnavailable(true)
        return false
      }

      // Se il browser non ha ancora dato il permesso, chiediamolo
      if (Notification.permission !== 'granted') {
        console.log('[OneSignal] Richiedo permesso browser...')
        const granted = await OneSignal.Notifications.requestPermission()
        console.log('[OneSignal] Permesso browser:', granted)
        if (!granted) {
          setPermission('denied')
          return false
        }
        setPermission('granted')
      }

      // Opt-in alla subscription push
      await OneSignal.User.PushSubscription.optIn()
      const optedIn = OneSignal.User?.PushSubscription?.optedIn ?? true
      console.log('[OneSignal] optIn() — optedIn:', optedIn)
      setIsSubscribed(optedIn)
      await saveSubscriptionId()
      return true
    } catch (err) {
      console.error('[OneSignal] Errore enableNotifications:', err)
      return false
    }
  }, [permission, saveSubscriptionId])

  // Disattiva le notifiche (non revoca il permesso browser)
  const disableNotifications = useCallback(async () => {
    try {
      await getOneSignalReady()
      await OneSignal.User.PushSubscription.optOut()
      setIsSubscribed(false)
      console.log('[OneSignal] Notifiche disattivate')
    } catch (err) {
      console.error('[OneSignal] Errore disableNotifications:', err)
    }
  }, [])

  return {
    isSubscribed,
    permission,
    isReady,
    sdkUnavailable,
    enableNotifications,
    disableNotifications,
  }
}
