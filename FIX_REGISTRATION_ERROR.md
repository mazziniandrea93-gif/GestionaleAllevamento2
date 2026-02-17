# 🐕 Risoluzione Errore "Database error saving new user"

## Problema
Quando si registra un nuovo account, appare l'errore: **"Database error saving new user"**

## Causa
Il trigger del database che dovrebbe creare automaticamente il record nella tabella `settings` non funziona correttamente o non ha i permessi necessari.

## Soluzione

### Opzione 1: Fix Automatico nel Codice (GIÀ IMPLEMENTATO)
Ho modificato il file `src/pages/Auth.jsx` per gestire automaticamente la creazione del record `settings` anche se il trigger fallisce. Questo dovrebbe risolvere il problema nella maggior parte dei casi.

### Opzione 2: Fix Manuale nel Database (CONSIGLIATO)
Se il problema persiste, esegui lo script SQL sul database Supabase:

1. **Vai su Supabase Dashboard**
   - Apri https://app.supabase.com
   - Seleziona il tuo progetto

2. **Apri SQL Editor**
   - Nel menu laterale, clicca su "SQL Editor"
   - Clicca su "New query"

3. **Esegui lo script di fix**
   - Apri il file `FIX_DATABASE_REGISTRATION.sql`
   - Copia tutto il contenuto
   - Incollalo nell'editor SQL
   - Clicca su "Run" o premi Ctrl+Enter

4. **Verifica il risultato**
   - Alla fine dello script vedrai una tabella con 4 check
   - Tutti dovrebbero mostrare `passed = true`
   - Se qualcuno è `false`, leggi i messaggi di errore

5. **Testa la registrazione**
   - Torna all'applicazione
   - Prova a registrare un nuovo utente
   - Dovrebbe funzionare senza errori

## Cosa fa lo script SQL?

1. **Verifica e crea la tabella settings** se non esiste
2. **Configura le policy RLS** per la sicurezza multi-tenant
3. **Crea un trigger robusto** che gestisce gli errori senza bloccare la registrazione
4. **Crea settings per utenti esistenti** che non li hanno ancora
5. **Verifica che tutto sia configurato** correttamente

## Verifica Post-Fix

Dopo aver applicato il fix, registra un nuovo utente e verifica che:

✅ La registrazione avviene senza errori
✅ L'utente riceve l'email di conferma
✅ Dopo il login, l'utente può accedere alla dashboard
✅ Non ci sono errori nella console del browser

## Dettagli Tecnici

### Cosa contiene la tabella `settings`?
```sql
- id: UUID univoco
- user_id: Riferimento all'utente in auth.users
- kennel_name: Nome dell'allevamento
- kennel_affix: Affisso allevamento
- owner_name: Nome proprietario
- phone, email, website: Contatti
- default_heat_cycle_days: Giorni medi tra calori (default: 180)
- default_pregnancy_days: Durata gravidanza (default: 63)
```

### Come funziona il trigger?
```sql
1. Quando viene creato un nuovo utente in auth.users
2. Il trigger `on_auth_user_created` si attiva automaticamente
3. Chiama la funzione `initialize_user_settings()`
4. Crea un record in `settings` con valori di default
5. Se c'è un errore, registra un warning ma non blocca la registrazione
```

### Fallback nel codice
Se il trigger fallisce, il codice JavaScript in `Auth.jsx`:
1. Attende 1 secondo che il trigger si esegua
2. Controlla se `settings` esiste
3. Se non esiste, lo crea manualmente
4. L'utente può continuare anche se questo fallisce

## Problemi Comuni

### "Permission denied for table settings"
**Soluzione:** Assicurati che le policy RLS siano configurate correttamente (step 4-5 dello script)

### "Function initialize_user_settings does not exist"
**Soluzione:** Riesegui lo script completo (step 7-8 dello script)

### "Trigger does not exist"
**Soluzione:** Riesegui lo script completo (step 9 dello script)

### L'utente viene creato ma non può fare login
**Soluzione:** 
1. Verifica che l'email sia confermata
2. Controlla che il record in `settings` sia stato creato:
   ```sql
   SELECT * FROM settings WHERE user_id = 'USER_ID_QUI';
   ```

## Supporto

Se il problema persiste dopo aver applicato entrambi i fix:
1. Controlla i log di Supabase nella dashboard
2. Verifica che RLS sia abilitato: `ALTER TABLE settings ENABLE ROW LEVEL SECURITY;`
3. Verifica i permessi dell'utente authenticated
4. Controlla la console del browser per errori JavaScript

## File Modificati

- ✅ `src/pages/Auth.jsx` - Gestione fallback creazione settings
- ✅ `FIX_DATABASE_REGISTRATION.sql` - Script SQL per fix database
- ✅ `FIX_REGISTRATION_ERROR.md` - Questa guida

## Note Importanti

⚠️ **Non disabilitare RLS sulla tabella settings!** 
Il sistema è multi-tenant, ogni utente deve vedere solo i propri dati.

⚠️ **Backup prima di modificare il database!**
Anche se lo script è sicuro, è sempre meglio fare un backup.

⚠️ **Testa con un account di test prima!**
Non usare la tua email principale per testare.

---

**Problema risolto? Ottimo! 🎉**
Ora puoi registrare nuovi utenti senza problemi e ogni allevatore avrà i suoi dati isolati dagli altri.

