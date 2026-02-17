# 🎯 LEGGI QUI PRIMA DI CONTINUARE

## ⚠️ ERRORE: Could not find the 'females' column

### COSA È SUCCESSO
Mancano 3 colonne nel database per il sistema di riproduzione.

---

## 🚀 SOLUZIONE IN 3 PASSI

### PASSO 1: Apri questo link
👉 https://app.supabase.com/project/pmidxvswypdhdlscumyr/sql/new

### PASSO 2: Copia e incolla questo codice
```sql
ALTER TABLE matings ADD COLUMN IF NOT EXISTS mating_dates JSONB;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS males INTEGER DEFAULT 0;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS females INTEGER DEFAULT 0;

-- Fix alive_puppies NOT NULL constraint
ALTER TABLE litters ALTER COLUMN alive_puppies DROP NOT NULL;
ALTER TABLE litters ALTER COLUMN deceased_puppies SET DEFAULT 0;

UPDATE matings SET mating_dates = jsonb_build_array(mating_date::text)
WHERE mating_dates IS NULL AND mating_date IS NOT NULL;

UPDATE litters SET alive_puppies = total_puppies - COALESCE(deceased_puppies, 0)
WHERE alive_puppies IS NULL;
```

### PASSO 3: Clicca "Run"

---

## ✅ POI

1. Torna all'app
2. Ricarica (F5)
3. Prova "Nuovo Accoppiamento" e "Nuova Cucciolata"

---

## 📄 ALTRE RISORSE

- **Istruzioni visive**: Apri `MIGRAZIONE_DATABASE.html`
- **Guida completa**: Leggi `RIEPILOGO_SISTEMA_RIPRODUZIONE.md`

---

## 🎉 È SICURO?

Sì! Lo script usa `IF NOT EXISTS` quindi:
- ✅ Non cancella dati esistenti
- ✅ Non da errori se già eseguito
- ✅ Aggiunge solo le colonne mancanti

---

## 💡 COSA OTTIENI

Dopo aver eseguito lo script:
- ✅ Selezione maschi/femmine negli accoppiamenti
- ✅ Fino a 3 date di accoppiamento
- ✅ Conteggio maschi/femmine nelle cucciolate
- ✅ Sistema riproduzione completamente funzionante

---

🐕 **Fatto? Ottimo! Ora tutto funzionerà perfettamente!**

