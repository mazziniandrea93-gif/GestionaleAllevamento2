# 🔧 MIGRAZIONE DATABASE - ISTRUZIONI COMPLETE

## ⚠️ PROBLEMA RILEVATO
```
Could not find the 'females' column of 'litters' in the schema cache
```

Questo errore si verifica quando provi ad aggiungere una cucciolata perché mancano le colonne `males` e `females` nella tabella `litters`.

---

## 🎯 SOLUZIONE RAPIDA

### **Passo 1: Apri SQL Editor**
Clicca su questo link (o copialo nel browser):
```
https://app.supabase.com/project/pmidxvswypdhdlscumyr/sql/new
```

### **Passo 2: Copia e incolla questo script**
```sql
-- Aggiungi colonne mancanti
ALTER TABLE matings ADD COLUMN IF NOT EXISTS mating_dates JSONB;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS males INTEGER DEFAULT 0;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS females INTEGER DEFAULT 0;

-- Aggiorna dati esistenti
UPDATE matings SET mating_dates = jsonb_build_array(mating_date::text)
WHERE mating_dates IS NULL AND mating_date IS NOT NULL;

-- Verifica
SELECT 'OK' as status;
```

### **Passo 3: Esegui**
- Clicca su "Run" (o premi `Ctrl+Enter`)
- Dovresti vedere: `status: OK`

### **Passo 4: Testa**
- Ricarica l'applicazione (F5)
- Vai su Riproduzione → Nuova Cucciolata
- I campi dovrebbero funzionare!

---

## 📊 COSA SONO QUESTE COLONNE

| Colonna | Tabella | Scopo |
|---------|---------|-------|
| `mating_dates` | matings | Array JSON con fino a 3 date di accoppiamento |
| `males` | litters | Numero di cuccioli maschi |
| `females` | litters | Numero di cucciole femmine |

---

## ✅ VERIFICHE POST-MIGRAZIONE

Dopo aver eseguito lo script, verifica che:

1. ✅ Nuovo Accoppiamento funziona
   - Puoi selezionare femmina e maschio
   - Puoi aggiungere fino a 3 date

2. ✅ Nuova Cucciolata funziona
   - Puoi inserire numero maschi
   - Puoi inserire numero femmine
   - Totale si calcola automaticamente

---

## 🐛 TROUBLESHOOTING

### Errore: "permission denied for table matings"
**Soluzione**: Assicurati di essere loggato su Supabase con l'account corretto

### Errore: "relation matings does not exist"
**Soluzione**: Lo schema base non è stato creato. Esegui prima `supabase_schema_multitenant.sql`

### I campi ancora non funzionano
**Soluzione**: 
1. Apri la console del browser (F12)
2. Cerca errori nella tab "Console"
3. Copia l'errore e avvisami

---

## 🔗 LINK UTILI

- **SQL Editor**: https://app.supabase.com/project/pmidxvswypdhdlscumyr/sql
- **Table Editor**: https://app.supabase.com/project/pmidxvswypdhdlscumyr/editor
- **Logs**: https://app.supabase.com/project/pmidxvswypdhdlscumyr/logs

---

## 📝 NOTA

Se preferisci, puoi anche eseguire il file `ADD_MATING_DATES_COLUMN.sql` che contiene lo stesso script con commenti più dettagliati.

---

## 🎉 COMPLETATO?

Una volta eseguito lo script:
- ✅ Ricarica l'app (F5)
- ✅ Prova Nuovo Accoppiamento
- ✅ Prova Nuova Cucciolata
- ✅ Tutto dovrebbe funzionare!

