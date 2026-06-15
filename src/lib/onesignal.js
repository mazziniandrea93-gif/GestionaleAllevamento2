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

// Restituisce true se l'init è andato a buon fine, false se ha superato il timeout
// (es. SDK bloccato da adblocker/rete) — non resta mai in attesa per sempre.
export function getOneSignalReady(timeoutMs = 8000) {
  if (!_initPromise) initOneSignal()

  const timeout = new Promise(resolve => {
    setTimeout(() => {
      console.warn('[OneSignal] Init non completato entro', timeoutMs, 'ms — probabile blocco SDK (adblocker/rete)')
      resolve(false)
    }, timeoutMs)
  })

  return Promise.race([_initPromise.then(() => true), timeout])
}
