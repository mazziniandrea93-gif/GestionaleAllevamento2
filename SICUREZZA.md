# 🔒 Guida alla Sicurezza del Gestionale Allevamento

## ✅ Variabili di Ambiente Pubbliche (SICURE)

### Variabili Esposte (È Normale!)
```env
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Perché È Sicuro?

1. **Anon Key è Pubblica per Design**
   - L'`anon key` di Supabase è progettata per essere esposta nel frontend
   - NON permette accesso illimitato ai dati
   - Funziona SOLO con le Row Level Security (RLS) policies attive

2. **Row Level Security (RLS) Attiva**
   - Ogni tabella ha policy RLS che controllano l'accesso
   - Gli utenti vedono SOLO i propri dati (filtrati per `user_id`)
   - Anche se qualcuno ha l'anon key, non può vedere dati di altri utenti

3. **Autenticazione Protetta**
   - Le password sono gestite da Supabase Auth
   - I token JWT sono firmati lato server
   - Non è possibile falsificare l'identità di un utente

## 🔐 Protezioni Attive

### 1. Row Level Security (RLS)
Tutte le tabelle hanno RLS attiva:
- ✅ `dogs` - Solo i cani del proprio user_id
- ✅ `puppies` - Solo i cuccioli del proprio user_id
- ✅ `matings` - Solo gli accoppiamenti del proprio user_id
- ✅ `litters` - Solo le cucciolate del proprio user_id
- ✅ `health_records` - Solo i record salute del proprio user_id
- ✅ `expenses` - Solo le spese del proprio user_id
- ✅ `income` - Solo le entrate del proprio user_id
- ✅ `events` - Solo gli eventi del proprio user_id
- ✅ `settings` - Solo le impostazioni del proprio user_id
- ✅ `dog_measurements` - Solo le misurazioni del proprio user_id

### 2. Autenticazione
- Email + Password gestita da Supabase Auth
- Token JWT con scadenza automatica
- Sessioni protette con refresh token

### 3. Backend Security
- Tutti i dati passano per Supabase (sicuro e certificato)
- HTTPS obbligatorio per tutte le connessioni
- CORS configurato correttamente

## ⚠️ Variabili da NON Esporre

Le seguenti variabili NON devono MAI essere esposte pubblicamente:
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Ha accesso completo, bypassa RLS
- ❌ `SUPABASE_JWT_SECRET` - Permette di firmare token
- ❌ API keys di terze parti (Stripe, PayPal, ecc.)
- ❌ Credenziali database dirette

**Nel tuo progetto non usi nessuna di queste variabili nel frontend, quindi sei al sicuro!**

## 📋 Checklist Sicurezza

### ✅ Completate
- [x] File `.env` in `.gitignore`
- [x] RLS attiva su tutte le tabelle
- [x] Policies RLS per user isolation
- [x] Solo variabili pubbliche nel frontend
- [x] Autenticazione Supabase configurata
- [x] HTTPS su Vercel
- [x] File `.env.example` per riferimento

### Configurazione Vercel

1. **Environment Variables su Vercel Dashboard**
   - Vai su: Dashboard → Il tuo progetto → Settings → Environment Variables
   - Aggiungi:
     - `VITE_SUPABASE_URL` = Il tuo URL Supabase
     - `VITE_SUPABASE_ANON_KEY` = La tua anon key

2. **Ambiente di Deployment**
   - Production: ✅ Seleziona
   - Preview: ✅ Seleziona
   - Development: ✅ Seleziona

## 🛡️ Come Verificare la Sicurezza

### Test 1: Verifica RLS su Supabase
```sql
-- Esegui come utente non autenticato
SELECT * FROM dogs;
-- Dovrebbe tornare: 0 rows (o errore)

SELECT * FROM puppies;
-- Dovrebbe tornare: 0 rows (o errore)
```

### Test 2: Prova Multiutente
1. Crea due account diversi
2. Aggiungi cani all'account 1
3. Accedi con account 2
4. Verifica che non vedi i cani dell'account 1

### Test 3: Ispeziona Variabili Frontend
1. Apri DevTools (F12) in produzione
2. Vai su Sources → Cerca "supabase"
3. Troverai URL e anon key → È normale!
4. Ma prova a usarle manualmente → Non potrai accedere a dati di altri utenti

## 📖 Risorse Ufficiali

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Perché l'Anon Key è Sicura](https://supabase.com/docs/guides/api/api-keys)
- [Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## 🎯 Conclusione

Il warning di Vercel è **normale e previsto**. Le tue variabili pubbliche non sono un "buco di sicurezza" ma parte del design corretto di un'applicazione Supabase. La vera sicurezza è garantita da:

1. ✅ Row Level Security (RLS) - I dati sono isolati per utente
2. ✅ Autenticazione Supabase - Le password sono protette
3. ✅ HTTPS - Tutte le comunicazioni sono criptate
4. ✅ Service Role Key NON esposta - Le operazioni admin sono protette

**Il tuo gestionale è sicuro! Puoi ignorare il warning di Vercel sulle variabili VITE_***

