# 🔒 GESTIONE AUTOMATICA DISPONIBILITÀ ACCOPPIAMENTI

## Data: 17 Febbraio 2026

---

## ✨ NUOVA FUNZIONALITÀ IMPLEMENTATA

### 🎯 Obiettivo
**Un accoppiamento può generare UNA SOLA cucciolata.**

Dopo che una cucciolata è nata, quell'accoppiamento non può più generare altre cucciolate (perché la femmina non può partorire due volte dallo stesso accoppiamento).

---

## 🔧 COME FUNZIONA

### ✅ Quando Dichiari una Cucciolata:

1. **Salvi la cucciolata** con tutti i dettagli (cuccioli, data nascita, ecc.)
2. **L'accoppiamento viene aggiornato** automaticamente:
   - `litter_born = true`
   - `litter_birth_date = data della nascita`
   - `gestation_days = giorni calcolati`
3. **L'accoppiamento viene DISABILITATO** dalla lista degli accoppiamenti disponibili
4. Non puoi più selezionarlo per creare nuove cucciolate

### 🗑️ Quando Elimini una Cucciolata:

1. **La cucciolata viene eliminata** dal database
2. **L'accoppiamento viene RIATTIVATO** automaticamente:
   - `litter_born = false`
   - `litter_birth_date = null`
   - `gestation_days = null`
3. **L'accoppiamento torna disponibile** nella lista degli accoppiamenti selezionabili
4. Puoi di nuovo usarlo per dichiarare una cucciolata

### ✏️ Quando Modifichi una Cucciolata:

- Puoi sempre **modificare** una cucciolata esistente
- Puoi anche **cambiare accoppiamento** (il vecchio viene riattivato, il nuovo viene disabilitato)
- L'accoppiamento corrente è sempre disponibile nella lista anche se già usato

---

## 📋 FILE MODIFICATI

### 1. `src/components/breeding/LitterForm.jsx`

**Modifiche nella funzione `loadMatings()`:**
```javascript
async function loadMatings() {
  const data = await db.getMatings()
  // Filtra: mostra solo accoppiamenti senza cucciolata
  // Oppure l'accoppiamento corrente se in modifica
  const availableMatings = data.filter(m => 
    !m.litter_born || (litter && m.id === litter.mating_id)
  )
  setMatings(availableMatings)
}
```

**Aggiunto messaggio quando non ci sono accoppiamenti:**
```jsx
{matings.length === 0 && !litter ? (
  <div className="warning-box">
    ⚠️ Nessun accoppiamento disponibile. 
    Tutti gli accoppiamenti hanno già una cucciolata dichiarata.
  </div>
) : (
  <select>...</select>
)}
```

### 2. `src/pages/Breeding.jsx`

**Modifiche nella mutation `deleteLitterMutation`:**
```javascript
const deleteLitterMutation = useMutation({
  mutationFn: async (litterId) => {
    // Trova la cucciolata
    const litter = litters.find(l => l.id === litterId)
    
    // Elimina la cucciolata
    await db.deleteLitter(litterId)
    
    // Resetta l'accoppiamento associato
    if (litter && litter.mating_id) {
      await db.updateMating(litter.mating_id, {
        litter_birth_date: null,
        gestation_days: null,
        litter_born: false
      })
    }
  },
  onSuccess: () => {
    // Invalida entrambe le cache
    queryClient.invalidateQueries(['litters'])
    queryClient.invalidateQueries(['matings'])
  }
})
```

**Modifiche nella funzione `handleLitterSuccess`:**
```javascript
function handleLitterSuccess() {
  queryClient.invalidateQueries(['litters'])
  queryClient.invalidateQueries(['matings']) // Aggiornato per riflettere disponibilità
}
```

---

## 📊 SCENARI D'USO

### Scenario 1: Prima Cucciolata
```
1. Hai 3 accoppiamenti: A, B, C
2. Tutti e 3 sono disponibili
3. Dichiari cucciolata per accoppiamento A
4. Ora disponibili: B, C (A è disabilitato)
```

### Scenario 2: Tutte le Cucciolate Dichiarate
```
1. Hai 2 accoppiamenti: A, B
2. Dichiari cucciolata per A
3. Dichiari cucciolata per B
4. Nessun accoppiamento disponibile!
5. Messaggio: "⚠️ Nessun accoppiamento disponibile"
```

### Scenario 3: Eliminazione e Riuso
```
1. Hai accoppiamento A con cucciolata
2. A è disabilitato (non selezionabile)
3. Elimini la cucciolata di A
4. A torna disponibile!
5. Puoi di nuovo usarlo (es. per correggere errori)
```

### Scenario 4: Modifica Cucciolata
```
1. Hai cucciolata da accoppiamento A
2. Modifichi la cucciolata
3. Nel form vedi A nella lista (il tuo accoppiamento)
4. Ma non vedi B e C (hanno già cucciolate)
5. Puoi cambiare accoppiamento se serve
```

---

## 💡 VANTAGGI

### Per l'Allevatore:
✅ **Non puoi creare per errore** due cucciolate dallo stesso accoppiamento  
✅ **Lista pulita** - vedi solo accoppiamenti realmente disponibili  
✅ **Nessuna confusione** - chiaro quali accoppiamenti hanno già cucciolate  
✅ **Correzione errori facile** - elimina e ricrea se hai sbagliato

### Per il Sistema:
✅ **Integrità dati** - un accoppiamento = una cucciolata max  
✅ **Validazione automatica** - il sistema previene errori  
✅ **Tracciabilità** - ogni cucciolata è legata univocamente a un accoppiamento  
✅ **Pulizia automatica** - eliminazione gestisce il reset

---

## 🎨 UI/UX

### Quando Crei Nuova Cucciolata:

**Caso 1: Ci sono accoppiamenti disponibili**
```
┌─────────────────────────────────┐
│ Accoppiamento *                 │
│ ┌─────────────────────────────┐ │
│ │ Seleziona accoppiamento   ▼ │ │
│ └─────────────────────────────┘ │
│ - Luna × Max - 1 Gen 2026       │
│ - Bella × Zeus - 15 Gen 2026    │
└─────────────────────────────────┘
```

**Caso 2: Nessun accoppiamento disponibile**
```
┌─────────────────────────────────┐
│ Accoppiamento *                 │
│ ┌─────────────────────────────┐ │
│ │ ⚠️ Nessun accoppiamento     │ │
│ │ disponibile. Tutti gli      │ │
│ │ accoppiamenti hanno già     │ │
│ │ una cucciolata dichiarata.  │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Quando Modifichi Cucciolata Esistente:

```
┌─────────────────────────────────┐
│ Accoppiamento *                 │
│ ┌─────────────────────────────┐ │
│ │ Luna × Max - 1 Gen 2026   ▼ │ │ (selezionato)
│ └─────────────────────────────┘ │
│ - Luna × Max - 1 Gen 2026       │ (il tuo)
│ - Bella × Zeus - 15 Gen 2026    │ (senza cucciolata)
└─────────────────────────────────┘
```

---

## 🔄 FLUSSO COMPLETO

```
┌──────────────────┐
│ Crea             │
│ Accoppiamento    │──┐
└──────────────────┘  │
                      ▼
┌──────────────────────────────────────┐
│ Accoppiamento DISPONIBILE            │
│ - litter_born = false                │
│ - Selezionabile per nuove cucciolate │
└──────────────────────────────────────┘
                      │
                      │ Dichiari cucciolata
                      ▼
┌──────────────────────────────────────┐
│ Accoppiamento USATO                  │
│ - litter_born = true                 │
│ - NON selezionabile                  │
│ - Badge "Cucciolata nata" visibile   │
└──────────────────────────────────────┘
                      │
                      │ Elimini cucciolata
                      ▼
┌──────────────────────────────────────┐
│ Accoppiamento RIATTIVATO             │
│ - litter_born = false                │
│ - Di nuovo selezionabile             │
│ - Badge rimosso                      │
└──────────────────────────────────────┘
```

---

## ⚠️ CASI PARTICOLARI

### ❓ Cosa succede se ho già cucciolate create prima dell'aggiornamento?

**Risposta:** Gli accoppiamenti vecchi con cucciolate esistenti potrebbero avere `litter_born = false` (se create prima dello script SQL). 

**Soluzione:** Modifica ogni cucciolata vecchia e salva di nuovo. Il sistema aggiornerà automaticamente gli accoppiamenti.

### ❓ Posso avere due cucciolate dalla stessa femmina?

**Risposta:** Sì! Ma devi creare DUE accoppiamenti diversi (con date diverse). Ogni accoppiamento genera UNA cucciolata.

**Esempio:**
```
Accoppiamento 1: Luna × Max (1 Gen 2026) → Cucciolata 1 (5 Mar 2026)
Accoppiamento 2: Luna × Max (1 Giu 2026) → Cucciolata 2 (3 Ago 2026)
```

### ❓ Posso cambiare l'accoppiamento di una cucciolata esistente?

**Risposta:** Sì! Quando modifichi una cucciolata e cambi accoppiamento:
1. Il vecchio accoppiamento viene RIATTIVATO
2. Il nuovo accoppiamento viene DISABILITATO
3. Tutti i dati (giorni gestazione, ecc.) vengono ricalcolati

---

## ✅ CHECKLIST FUNZIONALITÀ

- [x] Filtrare accoppiamenti disponibili (esclude quelli con cucciolata)
- [x] Includere accoppiamento corrente quando si modifica
- [x] Mostrare messaggio se nessun accoppiamento disponibile
- [x] Resettare accoppiamento quando si elimina cucciolata
- [x] Invalidare cache per aggiornare liste
- [x] Gestire cambio accoppiamento in modifica
- [x] UI chiara e intuitiva
- [x] Nessun errore TypeScript/ESLint

---

## 🎉 STATO

### ✅ Implementato Completamente:
- Filtro accoppiamenti disponibili
- Reset automatico su eliminazione
- Gestione modifica cucciolate
- UI con messaggi informativi
- Invalidazione cache corretta

### 🚀 Pronto Per:
- Uso in produzione
- Test con dati reali
- Nessuna configurazione aggiuntiva richiesta

---

**Data implementazione**: 17 Febbraio 2026  
**Versione**: 1.1  
**Status**: ✅ Pronto all'uso  
**Prerequisiti**: Script SQL `ADD_LITTER_INFO_TO_MATINGS.sql` già eseguito

---

## 📚 FILE CORRELATI

- `QUICK_START_CUCCIOLATE.md` - Aggiornato con nuove info
- `IMPLEMENTAZIONE_TRACCIAMENTO_CUCCIOLATE.md` - Documentazione base
- `ADD_LITTER_INFO_TO_MATINGS.sql` - Script SQL (già eseguito)

🐕💕 **Un accoppiamento, una cucciolata. Semplice e chiaro!**

