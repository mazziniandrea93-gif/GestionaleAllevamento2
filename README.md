# 🐕 Gestionale Allevamento Cani - Multi-Tenant

Sistema completo di gestione per allevamento canino con supporto multi-utente, tracking finanziario, sanitario e riproduttivo.

## ⚡ Quick Start

### 1. Aggiorna Node.js (IMPORTANTE!)

**Versione richiesta**: Node.js v20 o superiore

```bash
# Verifica versione attuale
node -v

# Se hai Node < v20, scarica da:
https://nodejs.org (versione LTS)
```

Dopo l'installazione:
```bash
# Elimina e reinstalla dipendenze
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

### 2. Configura Supabase

#### A. Crea Progetto Supabase

1. Vai su **https://supabase.com**
2. **Sign up** e crea **New Project**:
   - Name: `allevamento-manager`
   - Database Password: (salva questa password!)
   - Region: Europe West (Frankfurt)
   - Plan: Free

#### B. Applica Schema Database

1. Dashboard Supabase → **SQL Editor**
2. Apri il file `supabase_schema_multitenant.sql`
3. Copia tutto il contenuto
4. Incolla nell'editor SQL
5. **Run** (Ctrl+Enter)
6. Aspetta "Success"

#### C. Abilita Email Authentication

1. Dashboard → **Authentication** → **Providers**
2. **Email** → **Enable**
3. (Opzionale) Disabilita "Confirm email" per test rapidi

#### D. Configura .env

1. Dashboard → **Settings** → **API**
2. Copia questi valori:

```env
# File .env nella root del progetto
VITE_SUPABASE_URL=https://tuoprogetto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3. Avvia Applicazione

```bash
npm run dev
```

Apri **http://localhost:5173**

---

## 🧪 Test Multi-Tenant

1. Registra primo utente: `test1@test.com`
2. Crea un cane: "Rex"
3. Logout (icona in alto a destra)
4. Registra secondo utente: `test2@test.com`
5. ✅ Verifica che NON vedi "Rex" → Multi-tenant funziona!

---

## 📁 Struttura Progetto

```
allv/
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx          # Gestione autenticazione
│   ├── components/
│   │   ├── ProtectedRoute.jsx       # Protezione rotte
│   │   ├── layout/
│   │   │   ├── Header.jsx           # Header con logout
│   │   │   ├── Sidebar.jsx          # Menu laterale
│   │   │   └── Layout.jsx           # Layout principale
│   │   ├── dogs/                    # Componenti cani
│   │   ├── finance/                 # Componenti finanziari
│   │   ├── health/                  # Componenti sanitari
│   │   └── puppies/                 # Componenti cuccioli
│   ├── pages/
│   │   ├── Auth.jsx                 # Login/Registrazione
│   │   ├── Dashboard.jsx            # Dashboard principale
│   │   ├── Dogs.jsx                 # Gestione cani
│   │   ├── Finance.jsx              # Gestione finanziaria
│   │   └── ...
│   ├── lib/
│   │   └── supabase.js              # Client Supabase + CRUD
│   └── App.jsx                      # Router + Auth
├── supabase_schema_multitenant.sql  # Schema database con RLS
├── .env                             # Configurazione (da compilare)
└── package.json
```

---

## 🔐 Sicurezza Multi-Tenant

### Row Level Security (RLS)

Ogni utente vede **solo i propri dati**:
- ✅ Isolamento automatico a livello database
- ✅ Impossibile accedere ai dati di altri utenti
- ✅ Nessun filtro manuale necessario

### Come Funziona

```javascript
// Le query vengono filtrate automaticamente per user_id
const { data } = await supabase.from('dogs').select('*')
// Restituisce SOLO i cani dell'utente loggato
```

---

## 🎯 Funzionalità Principali

### Autenticazione
- ✅ Registrazione con email/password
- ✅ Login/Logout
- ✅ Sessione persistente
- ✅ Rotte protette

### Gestione Cani
- ✅ Anagrafica completa
- ✅ Foto e documenti
- ✅ Stato (attivo/venduto/deceduto)
- ✅ Pedigree e microchip

### Riproduzione
- ✅ Tracking calori
- ✅ Gestione accoppiamenti
- ✅ Cucciolate
- ✅ Gestione cuccioli

### Finanza
- ✅ Spese (categorizzate)
- ✅ Incassi
- ✅ Report mensili
- ✅ Grafici

### Salute
- ✅ Cartelle sanitarie
- ✅ Vaccinazioni
- ✅ Visite veterinarie
- ✅ Reminder automatici

### Calendario
- ✅ Eventi e appuntamenti
- ✅ Notifiche calori
- ✅ Date parto previste

---

## 🛠️ Tecnologie

- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State**: React Query, Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date**: date-fns

---

## 📚 File Documentazione

- **README.md** ← Questa guida principale
- **ERRORE_NODE_VECCHIO.md** ← Guida aggiornamento Node.js
- **ARCHITECTURE.md** ← Architettura sistema
- **FRONTEND_MULTITENANT_CODE.js** ← Esempi codice

---

## 🐛 Troubleshooting

### Errore: "Missing Supabase environment variables"
- ❌ File `.env` vuoto
- ✅ Compila `.env` con valori reali da Supabase Dashboard

### Errore: "crypto.getRandomValues is not a function"
- ❌ Node.js troppo vecchio (v16 o inferiore)
- ✅ Aggiorna a Node.js v20: https://nodejs.org
- ✅ Leggi: `ERRORE_NODE_VECCHIO.md`

### Errore: "relation does not exist"
- ❌ Schema database non applicato
- ✅ Esegui `supabase_schema_multitenant.sql` in SQL Editor

### Pagina bianca dopo login
- ❌ Errori JavaScript
- ✅ Apri console (F12) e verifica errori

### Dati di altri utenti visibili
- ❌ RLS non abilitato correttamente
- ✅ Riapplica lo schema SQL completo

---

## 🚀 Deploy Production

### Vercel (Consigliato)

1. Push codice su GitHub
2. Vai su **https://vercel.com**
3. **Import Project** dal tuo repository
4. Aggiungi variabili ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy**!

### Netlify

1. Push su GitHub
2. **https://netlify.com** → New site from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Environment variables: aggiungi le stesse di sopra

---

## 📈 Prossimi Step

### Monetizzazione
- Integra Stripe per pagamenti
- Piano Free: 5 cani max
- Piano Pro: €19.99/mese (50 cani)
- Piano Enterprise: €49.99/mese (illimitato)

### Funzionalità Avanzate
- Export dati (PDF/Excel)
- Invito collaboratori
- App mobile (React Native)
- Notifiche push
- Sistema di backup automatico

---

## 🆘 Supporto

### Problemi Comuni
1. **Node.js vecchio** → Aggiorna a v20
2. **Supabase non configurato** → Compila `.env`
3. **Schema non applicato** → Esegui SQL

### Link Utili
- **Supabase Docs**: https://supabase.com/docs
- **React Query**: https://tanstack.com/query
- **Vite**: https://vitejs.dev
- **TailwindCSS**: https://tailwindcss.com

---

## ✅ Checklist Completa

### Setup Iniziale
- [ ] Node.js v20+ installato
- [ ] Progetto Supabase creato
- [ ] Schema SQL applicato
- [ ] Email auth abilitata
- [ ] File `.env` compilato
- [ ] `npm install` completato
- [ ] `npm run dev` funzionante

### Test Multi-Tenant
- [ ] Registrato utente 1
- [ ] Creato dato utente 1
- [ ] Logout effettuato
- [ ] Registrato utente 2
- [ ] Verificato isolamento dati ✅

---

## 📄 Licenza

Questo progetto è privato e non ha licenza open source.

---

## 👤 Autore

Gestionale sviluppato per allevamenti cinofili professionali.

**Versione**: 1.0.0 Multi-Tenant  
**Ultimo aggiornamento**: Febbraio 2026

---

**Buon lavoro con il tuo gestionale! 🐕 🚀**

