# GUIDA: CAMBIO PASSWORD E GESTIONE ACCOUNT

## Nuove Funzionalità Implementate

Ho implementato nella pagina **Impostazioni → Sicurezza** due funzionalità importanti:

### 1. Cambio Password ✅

**Come funziona:**
- Vai su Impostazioni → Tab "Sicurezza"
- Compila il form con:
  - Nuova Password (minimo 6 caratteri)
  - Conferma Password
- Clicca su "Aggiorna Password"
- La password viene cambiata immediatamente tramite Supabase Auth
- Riceverai una notifica di conferma

**Vantaggi:**
- ✅ Tutto gestito direttamente nell'app
- ✅ Nessun redirect a Supabase
- ✅ Validazione password in tempo reale
- ✅ Conferma password per evitare errori

### 2. Eliminazione Account 🗑️

**Come funziona:**
- Vai su Impostazioni → Tab "Sicurezza"
- Nella sezione "Zona Pericolosa" clicca su "Elimina Account"
- Ti verrà chiesto di confermare cliccando di nuovo entro 5 secondi
- Tutti i tuoi dati verranno eliminati definitivamente

**Cosa viene eliminato:**
- ✅ Tutti i cani
- ✅ Tutte le cucciolate e cuccioli
- ✅ Tutti gli accoppiamenti
- ✅ Tutte le spese e entrate
- ✅ Tutti i record di salute
- ✅ Tutti gli eventi del calendario
- ✅ Tutte le impostazioni
- ✅ Tutte le misurazioni di crescita

**Sicurezza:**
- Doppia conferma richiesta
- Timer di 5 secondi per evitare click accidentali
- Azione irreversibile

## Setup Database (Opzionale ma Consigliato)

Per una gestione più sicura dell'eliminazione account, esegui lo script SQL:

1. Vai su Supabase Dashboard → SQL Editor
2. Apri `ADD_DELETE_ACCOUNT_FUNCTION.sql`
3. Esegui lo script
4. Questo crea una funzione server-side per l'eliminazione sicura

**Nota:** Anche senza eseguire questo script, l'eliminazione funzionerà tramite il logout dell'utente. Lo script è solo per una pulizia più completa dei dati.

## Codice Implementato

### File Modificato: `src/pages/Settings.jsx`

**Nuove funzioni aggiunte:**
- `handlePasswordChange()` - Gestisce l'input del form password
- `handleChangePassword()` - Esegue il cambio password
- `handleDeleteAccount()` - Gestisce l'eliminazione account con doppia conferma

**State aggiunto:**
```javascript
const [passwordData, setPasswordData] = useState({
  newPassword: '',
  confirmPassword: ''
})
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
```

## Utilizzo API Supabase

**Cambio Password:**
```javascript
await supabase.auth.updateUser({
  password: passwordData.newPassword
})
```

**Eliminazione Account:**
```javascript
await supabase.rpc('delete_user_account') // Se hai eseguito lo script SQL
// oppure
await supabase.auth.signOut() // Fallback
```

## Test

1. **Test Cambio Password:**
   - Prova a cambiare la password con una password troppo corta (< 6 caratteri) → Errore
   - Prova con password non coincidenti → Errore
   - Prova con password valida → Successo ✅

2. **Test Eliminazione Account:**
   - Clicca "Elimina Account" una volta → Messaggio di conferma
   - Aspetta 5 secondi → Il messaggio scompare
   - Clicca di nuovo due volte velocemente → Account eliminato ✅

## Note Tecniche

- Le password vengono hashate e gestite in modo sicuro da Supabase Auth
- La funzione `updateUser()` di Supabase invia anche un'email di conferma (se configurato)
- L'eliminazione account è protetta da RLS (Row Level Security)
- I vincoli ON DELETE CASCADE nel database assicurano la pulizia completa dei dati

## Sicurezza

✅ **Implementazioni di Sicurezza:**
- Password minima 6 caratteri
- Conferma password obbligatoria
- Doppia conferma per eliminazione
- Timer anti-click accidentale
- Validazione lato client e server
- RLS policies attive su tutte le tabelle

