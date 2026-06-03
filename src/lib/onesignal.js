/**
 * Modulo OneSignal — inizializzazione singola, condivisa tra tutti i componenti.
 * L'init parte al caricamento dell'app; chiunque ne abbia bisogno
 * chiama `getOneSignalReady()` e attende la promise.
 */
import OneSignal from 'react-onesignal'

let _initPromise = null

export function initOneSignal() {
  if (_initPromise) return _initPromise

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID
  if (!appId) {
    console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID non configurato')
    _initPromise = Promise.resolve()
    return _initPromise
  }

  _initPromise = OneSignal.init({
    appId,
    notifyButton: { enable: false },
    allowLocalhostAsSecureOrigin: true,
  }).then(() => {
    console.log('[OneSignal] Init completato ✓')
  }).catch(err => {
    console.error('[OneSignal] Init fallito:', err)
  })

  return _initPromise
}

export function getOneSignalReady() {
  if (!_initPromise) initOneSignal()
  return _initPromise
}
