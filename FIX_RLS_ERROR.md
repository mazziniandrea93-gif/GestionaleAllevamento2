# 🔧 FIX ERRORE: "new row violates row-level security policy for table health_records"

## ❌ PROBLEMA

Quando provi a salvare un evento di salute, ricevi l'errore:
```
new row violates row-level security policy for table "health_records"
```

## 🔍 CAUSA

Le **Row Level Security (RLS) policies** per la tabella `health_records` non sono state create o non sono attive su Supabase.

## ✅ SOLUZIONE

Devi eseguire lo script SQL su Supabase per creare le policy RLS.

---

## 🚀 PASSO 1: Esegui lo script SQL

### Vai su Supabase:
1. Apri **https://supabase.com**
2. Seleziona il tuo progetto
3. Vai su **SQL Editor** (menù laterale)

### Opzione A - Script rapido (consigliato):
Copia e incolla questo script nel SQL Editor:

```sql
-- Abilita RLS sulla tabella health_records
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

-- Elimina eventuali policy esistenti per evitare conflitti
DROP POLICY IF EXISTS "Users can view own health_records" ON health_records;
DROP POLICY IF EXISTS "Users can insert own health_records" ON health_records;
DROP POLICY IF EXISTS "Users can update own health_records" ON health_records;
DROP POLICY IF EXISTS "Users can delete own health_records" ON health_records;

-- Crea le policy RLS
CREATE POLICY "Users can view own health_records"
    ON health_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health_records"
    ON health_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health_records"
    ON health_records FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health_records"
    ON health_records FOR DELETE
    USING (auth.uid() = user_id);
```

### Opzione B - Script completo dal file:
Oppure apri il file `FIX_HEALTH_RECORDS_RLS.sql` che ho creato e copia tutto il contenuto.

### Esegui lo script:
1. Incolla il codice SQL
2. Clicca **RUN** (o premi Ctrl+Enter)
3. Verifica che vedi "Success"

---

## 🔍 PASSO 2: Verifica che le policy siano state create

Esegui questa query per verificare:

```sql
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'health_records';
```

Dovresti vedere 4 policy:
- ✅ Users can view own health_records
- ✅ Users can insert own health_records
- ✅ Users can update own health_records
- ✅ Users can delete own health_records

---

## 🧪 PASSO 3: Testa il salvataggio

1. Torna sulla pagina **Salute** del tuo gestionale
2. Clicca **"Nuovo Evento"**
3. Compila il form
4. Clicca **"Aggiungi"**

**Ora dovrebbe funzionare!** ✅

---

## 📝 COSA FANNO LE POLICY RLS

Le policy RLS (Row Level Security) garantiscono che:

1. **Ogni utente vede solo i propri dati**
   - L'utente A non può vedere i record sanitari dell'utente B

2. **Ogni utente può creare solo record propri**
   - Quando crei un record, il `user_id` viene automaticamente associato al tuo account

3. **Ogni utente può modificare/eliminare solo i propri dati**
   - Non puoi modificare o eliminare record di altri utenti

Questo rende il sistema **multi-tenant sicuro** ✅

---

## 🔧 SE IL PROBLEMA PERSISTE

### Controlla l'autenticazione:
Assicurati di essere **loggato** nell'applicazione. Le policy RLS verificano `auth.uid()`, quindi se non sei autenticato, non funziona.

### Controlla la console del browser:
1. Apri gli **Strumenti per sviluppatori** (F12)
2. Vai su **Console**
3. Cerca eventuali errori aggiuntivi

### Verifica che la tabella esista:
```sql
SELECT * FROM health_records LIMIT 1;
```

### Verifica che RLS sia abilitato:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'health_records' 
AND schemaname = 'public';
```

La colonna `rowsecurity` deve essere `true`.

---

## 📋 CHECKLIST COMPLETA

- [ ] Hai eseguito lo script SQL su Supabase
- [ ] Hai visto "Success" dopo l'esecuzione
- [ ] Hai verificato che le 4 policy esistono
- [ ] Sei loggato nell'applicazione
- [ ] Hai ricaricato la pagina dopo aver creato le policy
- [ ] Hai provato a salvare un nuovo evento di salute

---

## 🎉 DOPO IL FIX

Una volta eseguite le policy, il sistema funzionerà perfettamente e:

✅ Potrai salvare eventi di salute
✅ Ogni utente vedrà solo i propri dati
✅ Il sistema sarà sicuro e multi-tenant
✅ Non vedrai più l'errore RLS

---

## 💡 NOTA IMPORTANTE

Questo stesso problema potrebbe verificarsi anche per altre tabelle se non hai eseguito lo script completo `supabase_schema_multitenant.sql`.

### Altre tabelle che potrebbero avere lo stesso problema:
- `dogs`
- `puppies`
- `expenses`
- `income`
- `events`
- `heat_cycles`
- `matings`
- `litters`
- `dog_measurements`

### Soluzione preventiva:
Se hai creato le tabelle ma **non** hai eseguito le sezioni con le policy RLS, ti consiglio di eseguire l'intero script `supabase_schema_multitenant.sql` per creare tutte le policy in una volta sola.

---

## 📞 FILE UTILI

- `FIX_HEALTH_RECORDS_RLS.sql` - Script rapido per health_records
- `supabase_schema_multitenant.sql` - Schema completo con tutte le policy

---

**Esegui lo script SQL e il problema sarà risolto!** 🚀

