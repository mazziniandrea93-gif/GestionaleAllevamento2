# ISTRUZIONI PER AGGIUNGERE COLONNE AL DATABASE

## ⚠️ IMPORTANTE: Devi eseguire questo SQL su Supabase!

Il form ora include i campi `coat_color`, `weight` e `height`, ma queste colonne **non esistono ancora** nella tabella `dogs` del tuo database Supabase.

## 📝 PASSI DA SEGUIRE:

### 1. Vai su Supabase Dashboard
   - Apri il tuo progetto su https://supabase.com
   - Vai alla sezione **SQL Editor** (icona con il simbolo </>)

### 2. Esegui questo SQL:

```sql
-- Aggiungi colonna coat_color (colore mantello)
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS coat_color VARCHAR(50);

-- Aggiungi colonna weight (peso in kg)
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2);

-- Aggiungi colonna height (altezza in cm)
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);
```

### 3. (OPZIONALE) Copia i dati esistenti
Se hai già dei cani nel database con la colonna `color` popolata, puoi copiare i valori in `coat_color`:

```sql
UPDATE dogs 
SET coat_color = color 
WHERE coat_color IS NULL AND color IS NOT NULL;
```

### 4. Verifica le colonne
Esegui questa query per verificare che le colonne siano state aggiunte:

```sql
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'dogs' 
AND column_name IN ('coat_color', 'weight', 'height', 'color')
ORDER BY column_name;
```

### 5. Aggiorna le RLS Policy (se necessario)
Le policy RLS esistenti dovrebbero già coprire le nuove colonne, ma verifica che funzioni tutto.

## ✅ DOPO L'ESECUZIONE

Una volta eseguito lo SQL su Supabase, il form funzionerà correttamente e potrai:
- ✅ Inserire il colore del mantello
- ✅ Inserire il peso in kg
- ✅ Inserire l'altezza in cm
- ✅ Tutti i dati verranno salvati correttamente

## 📁 File Modificati

Ho già aggiornato questi file per te:
- ✅ `src/components/dogs/DogForm.jsx` - Ripristinati tutti i campi
- ✅ `ADD_MISSING_COLUMNS.sql` - Script SQL pronto da eseguire

## 🔄 Note Tecniche

- `coat_color`: VARCHAR(50) - Per descrizioni testuali del colore
- `weight`: DECIMAL(5,2) - Max 999.99 kg (es: 25.50)
- `height`: DECIMAL(5,2) - Max 999.99 cm (es: 55.00)

Hai mantenuto anche la colonna `color` originale dello schema, quindi ora hai sia `color` che `coat_color`. Puoi usare quello che preferisci o entrambi per scopi diversi.

