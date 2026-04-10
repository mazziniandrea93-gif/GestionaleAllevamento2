# 📋 TRACCIAMENTO CUCCIOLATE NATE DAGLI ACCOPPIAMENTI

## ✨ Nuova Funzionalità Implementata

Quando dichiari una nuova cucciolata, il sistema ora **aggiorna automaticamente** l'accoppiamento associato con:
- 📅 **Data di nascita** della cucciolata
- ⏱️ **Giorni di gestazione** calcolati automaticamente
- ✅ **Stato "Cucciolata nata"**

---

## 🔧 SETUP NECESSARIO

### 1. Esegui lo Script SQL su Supabase

⚠️ **IMPORTANTE**: Prima di usare questa funzione, devi eseguire lo script SQL!

1. Apri **Supabase Dashboard**
2. Vai su **SQL Editor**
3. Apri il file `ADD_LITTER_INFO_TO_MATINGS.sql`
4. Copia e incolla lo script completo:

```sql
-- Aggiungi colonna data di nascita cucciolata
ALTER TABLE matings ADD COLUMN IF NOT EXISTS litter_birth_date DATE;

-- Aggiungi colonna giorni di gestazione
ALTER TABLE matings ADD COLUMN IF NOT EXISTS gestation_days INTEGER;

-- Aggiungi colonna flag che indica se la cucciolata è nata
ALTER TABLE matings ADD COLUMN IF NOT EXISTS litter_born BOOLEAN DEFAULT FALSE;

-- Commenti per documentazione
COMMENT ON COLUMN matings.litter_birth_date IS 'Data di nascita della cucciolata';
COMMENT ON COLUMN matings.gestation_days IS 'Giorni di gestazione calcolati automaticamente';
COMMENT ON COLUMN matings.litter_born IS 'Flag che indica se la cucciolata è nata';
```

5. Clicca **RUN** per eseguire lo script
6. Verifica che non ci siano errori

---

## 📖 COME FUNZIONA

### Quando Crei una Nuova Cucciolata:

1. Vai su **Riproduzione** → **Cucciolate**
2. Clicca **"Nuova Cucciolata"**
3. Compila il form:
   - **Accoppiamento**: Seleziona l'accoppiamento da cui è nata
   - **Data di Nascita**: Inserisci quando è nata la cucciolata
   - **Totale Cuccioli**: Numero totale di cuccioli
   - Altri dettagli...
4. Clicca **"Crea Cucciolata"**

### ✅ Il Sistema Automaticamente:

1. **Salva la cucciolata** nel database
2. **Calcola i giorni di gestazione**:
   - Differenza tra data accoppiamento e data nascita
   - Esempio: Accoppiamento 1 Gen → Nascita 5 Mar = 63 giorni
3. **Aggiorna l'accoppiamento** con:
   - Data di nascita della cucciolata
   - Giorni di gestazione
   - Flag "Cucciolata nata" = true

---

## 🎨 VISUALIZZAZIONE

### Nel Card dell'Accoppiamento

Prima (senza cucciolata):
```
┌─────────────────────────────────┐
│ Luna × Max                      │
│ Accoppiamento: 1 Gen 2026       │
│                                 │
│ Parto previsto: 5 Mar 2026      │
│ 63 giorni                       │
└─────────────────────────────────┘
```

Dopo (con cucciolata nata):
```
┌─────────────────────────────────┐
│ Luna × Max  ✅ Cucciolata nata  │
│ Accoppiamento: 1 Gen 2026       │
│                                 │
│ 🍼 Cucciolata nata il           │
│ 5 Mar 2026                      │
│ Dopo 63 giorni di gestazione    │
└─────────────────────────────────┘
```

---

## 📊 INFORMAZIONI UTILI

### Giorni di Gestazione Normali:
- **Media**: 63 giorni (9 settimane)
- **Range normale**: 58-68 giorni
- **Piccole razze**: 58-63 giorni
- **Grandi razze**: 63-68 giorni

### Badge Stato:
- ✅ **Verde "Cucciolata nata"**: La cucciolata è stata dichiarata
- 📅 **Azzurro "Parto previsto"**: In attesa del parto
- ⚠️ **Giallo**: Parto previsto tra meno di 7 giorni
- 🚨 **Rosso**: Data prevista superata (potrebbe servire assistenza)

---

## 🔄 MODIFICHE A CUCCIOLATA ESISTENTE

Se modifichi una cucciolata già creata:
- Il sistema **ricalcola** automaticamente i giorni di gestazione
- Se cambi la **data di nascita**, l'accoppiamento viene **aggiornato**
- Se cambi l'**accoppiamento associato**, vengono aggiornati entrambi

---

## 📝 ESEMPI PRATICI

### Esempio 1: Gestazione Normale
```
Accoppiamento: 1 Gennaio 2026
Nascita: 5 Marzo 2026
Giorni di gestazione: 63 giorni ✅
```

### Esempio 2: Gestazione Breve
```
Accoppiamento: 15 Febbraio 2026
Nascita: 12 Aprile 2026
Giorni di gestazione: 57 giorni ⚠️ (breve ma normale)
```

### Esempio 3: Gestazione Lunga
```
Accoppiamento: 10 Gennaio 2026
Nascita: 20 Marzo 2026
Giorni di gestazione: 69 giorni ⚠️ (lunga, controllare)
```

---

## ✅ CHECKLIST VERIFICA

Prima di usare:
- [ ] Script SQL eseguito su Supabase
- [ ] Nessun errore nello script
- [ ] App ricaricata (F5)

Dopo aver creato una cucciolata:
- [ ] Il card dell'accoppiamento mostra "Cucciolata nata"
- [ ] La data di nascita è visualizzata
- [ ] I giorni di gestazione sono calcolati
- [ ] Il badge verde è visibile
- [ ] La sezione "Parto previsto" è nascosta

---

## 🆘 RISOLUZIONE PROBLEMI

### "Could not find the column litter_birth_date"
➡️ Lo script SQL non è stato eseguito. Eseguilo su Supabase.

### I giorni di gestazione sono sbagliati
➡️ Verifica che le date di accoppiamento e nascita siano corrette.
➡️ Modifica la cucciolata per ricalcolarli.

### Il badge "Cucciolata nata" non appare
➡️ Ricarica la pagina (F5)
➡️ Verifica che la cucciolata sia associata all'accoppiamento corretto

### Non vedo le modifiche
➡️ Ricarica la pagina (F5)
➡️ Controlla la console browser (F12) per errori
➡️ Verifica che lo script SQL sia stato eseguito

---

## 🎯 BENEFICI

### Per Te:
- ✅ **Tracciamento automatico** delle nascite
- ✅ **Calcolo preciso** dei giorni di gestazione
- ✅ **Storico completo** di ogni accoppiamento
- ✅ **Nessun lavoro manuale** extra

### Per l'Allevamento:
- 📊 **Statistiche accurate** sulla riproduzione
- 📈 **Analisi** delle gestazioni per femmina
- 🔍 **Identificazione** di pattern riproduttivi
- 📝 **Documentazione completa** per veterinari

---

## 🚀 UTILIZZO

1. **Esegui lo script SQL** (una volta sola)
2. **Ricarica l'app** (F5)
3. **Crea accoppiamenti** come sempre
4. **Dichiara cucciolate** quando nascono
5. **Visualizza automaticamente** tutte le info!

---

**Data implementazione**: 17 Febbraio 2026  
**Versione**: 1.0  
**Status**: ✅ Pronto all'uso (dopo script SQL)

🐕💕 **Buon lavoro con il tuo allevamento!**

