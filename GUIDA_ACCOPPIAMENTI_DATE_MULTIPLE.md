# Aggiungere supporto per date multiple di accoppiamento

## Problema risolto
- Il form di accoppiamento non permetteva di selezionare maschio e femmina
- Non era possibile inserire più date di accoppiamento (fino a 3)

## Modifiche apportate

### 1. Database
È necessario aggiungere una colonna alla tabella `matings` per supportare le date multiple.

**IMPORTANTE**: Vai su Supabase → SQL Editor e esegui questo script:

```sql
-- Aggiungi colonna per gestire date multiple di accoppiamento
ALTER TABLE matings 
ADD COLUMN IF NOT EXISTS mating_dates JSONB;

-- Aggiorna i record esistenti
UPDATE matings 
SET mating_dates = jsonb_build_array(mating_date::text)
WHERE mating_dates IS NULL AND mating_date IS NOT NULL;
```

Oppure esegui il file: `ADD_MATING_DATES_COLUMN.sql`

### 2. Codice aggiornato

#### MatingForm.jsx
- ✅ Aggiunto debug per capire perché non si selezionavano i cani
- ✅ Supporto per selezionare fino a 3 date di accoppiamento
- ✅ Pulsanti per aggiungere/rimuovere date
- ✅ Calcolo automatico del parto basato sulla prima data
- ✅ Mostra il numero di cani disponibili per sesso
- ✅ Gestisce vari formati del campo sesso (femmina/f/maschio/m)

#### MatingCard.jsx
- ✅ Visualizza tutte le date di accoppiamento se sono multiple
- ✅ Layout migliorato per mostrare più date

### 3. Come funziona

1. Nel form di nuovo accoppiamento puoi:
   - Selezionare femmina e maschio (ora mostra quanti sono disponibili)
   - Inserire la prima data di accoppiamento
   - Cliccare su "Aggiungi data" per inserire fino a 2 date aggiuntive
   - Rimuovere date con il pulsante del cestino

2. Il sistema:
   - Calcola automaticamente la data presunta del parto (63 giorni dalla prima data)
   - Salva tutte le date nel database
   - Mostra tutte le date nella card dell'accoppiamento

### 4. Debug selezione cani

Il problema della selezione potrebbe essere dovuto a:
- Valori diversi nel campo `sex` (es. "F" invece di "femmina")
- Il form ora accetta entrambi i formati

Controlla nella console del browser (F12) quando apri il form per vedere:
- Quanti cani sono stati caricati
- Quante femmine e maschi sono disponibili

### 5. Test

Dopo aver eseguito lo script SQL:
1. Apri la pagina Riproduzione
2. Clicca su "Nuovo Accoppiamento"
3. Verifica che femmine e maschi siano selezionabili
4. Aggiungi 2-3 date di accoppiamento
5. Salva e verifica che tutte le date vengano mostrate nella card

## Nota
Se i cani ancora non compaiono, controlla:
1. Che ci siano cani con sesso impostato nel database
2. Nella console del browser (F12 → Console) per vedere i log di debug
3. Che il campo `sex` nella tabella `dogs` si chiami effettivamente `sex` e non `gender`

