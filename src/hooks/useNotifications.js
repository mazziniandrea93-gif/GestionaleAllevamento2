import { useEffect, useState, useCallback, useRef } from 'react'
import OneSignal from 'react-onesignal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useNotifications() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState('default')
  const [isReady, setIsReady] = useState(false)
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
    } catch (err) {
      console.error('Errore salvataggio subscription ID:', err)
    }
  }, [user?.id])

  // Legge lo stato corrente dall'SDK
  const syncState = useCallback(() => {
    try {
      const opted = OneSignal.User?.PushSubscription?.optedIn ?? false
      const perm = OneSignal.Notifications?.permission ?? false
      setIsSubscribed(opted)
      setPermission(perm ? 'granted' : 'default')
    } catch {
      // SDK non ancora pronto
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return

    // Collega l'account OneSignal all'utente Supabase (una volta sola)
    if (!linkedRef.current) {
      linkedRef.current = true
      OneSignal.login(user.id).catch(console.error)
    }

    // Piccolo delay per attendere che l'SDK completi l'init
    const timer = setTimeout(() => {
      syncState()
      setIsReady(true)
      saveSubscriptionId()
    }, 600)

    // Ascolta cambiamenti di subscription
    const handleChange = (event) => {
      const optedIn = event.current?.optedIn ?? false
      setIsSubscribed(optedIn)
      if (optedIn) saveSubscriptionId()
    }
    OneSignal.User.PushSubscription.addEventListener('change', handleChange)

    return () => {
      clearTimeout(timer)
      OneSignal.User.PushSubscription.removeEventListener('change', handleChange)
    }
  }, [user?.id, syncState, saveSubscriptionId])

  // Richiede il permesso al browser e attiva le notifiche
  const enableNotifications = useCallback(async () => {
    try {
      if (permission !== 'granted') {
        const granted = await OneSignal.Notifications.requestPermission()
        if (!granted) {
          setPermission('denied')
          return false
        }
        setPermission('granted')
      }
      await OneSignal.User.PushSubscription.optIn()
      setIsSubscribed(true)
      await saveSubscriptionId()
      return true
    } catch (err) {
      console.error('Errore attivazione notifiche:', err)
      return false
    }
  }, [permission, saveSubscriptionId])

  // Disattiva le notifiche (senza revocare il permesso browser)
  const disableNotifications = useCallback(async () => {
    try {
      await OneSignal.User.PushSubscription.optOut()
      setIsSubscribed(false)
    } catch (err) {
      console.error('Errore disattivazione notifiche:', err)
    }
  }, [])

  return {
    isSubscribed,
    permission,
    isReady,
    enableNotifications,
    disableNotifications,
  }
}
