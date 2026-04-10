# 🚀 Guida Deploy su Vercel

## ⚠️ Warning: "Environment variables are publicly exposed"

### NON PREOCCUPARTI - È NORMALE! ✅

Vercel ti avvisa che le variabili con prefisso `VITE_` sono visibili pubblicamente. Questo è:
- ✅ **Previsto**: Le variabili frontend DEVONO essere pubbliche
- ✅ **Sicuro**: Supabase è progettato per questo
- ✅ **Standard**: Tutti i framework frontend funzionano così (Vite, Next.js, React, ecc.)

## 🔐 Perché È Sicuro?

Le tue variabili pubbliche sono:
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...
```

Queste sono **SICURE** perché:

1. **Anon Key è Pubblica per Design**
   - Non ha accesso completo al database
   - Funziona SOLO con le Row Level Security (RLS) policies
   - È come una "chiave di accesso pubblico" che richiede autenticazione

2. **RLS Protegge i Dati**
   - Ogni utente può vedere SOLO i propri dati
   - Anche con l'anon key, nessuno può vedere dati altrui
   - Il filtro avviene a livello database, non nel codice

3. **Autenticazione Separata**
   - Le password sono protette da Supabase Auth
   - I token JWT sono firmati lato server
   - Non è possibile falsificare l'identità

## 📋 Step Deployment Vercel

### 1. Prepara il Progetto

```bash
# Verifica che il build funzioni localmente
npm run build

# Test del build
npm run preview
```

### 2. Push su GitHub

```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

### 3. Deploy su Vercel

1. Vai su **https://vercel.com**
2. Click su **"Add New..." → Project**
3. Importa il tuo repository GitHub
4. Configura:

**Build Settings:**
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Environment Variables:**
- Nome: `VITE_SUPABASE_URL`
  - Valore: (Copia da Supabase Dashboard → Settings → API)
  - Environments: Production, Preview, Development ✅

- Nome: `VITE_SUPABASE_ANON_KEY`
  - Valore: (Copia da Supabase Dashboard → Settings → API)
  - Environments: Production, Preview, Development ✅

5. Click **Deploy**

### 4. Verifica Deployment

1. Aspetta che il deploy finisca (1-2 minuti)
2. Click sul link generato (es: `https://tuo-progetto.vercel.app`)
3. Prova a registrarti e fare login
4. Verifica che tutto funzioni

## ⚠️ Gestione del Warning Vercel

Quando aggiungi le variabili, Vercel mostrerà:

```
⚠️ Environment variables prefixed with VITE_ are publicly accessible
```

**IGNORA QUESTO WARNING** - È normale per applicazioni Vite/React!

### Come Riconoscere Variabili Sicure vs Non Sicure

✅ **SICURO esporre pubblicamente:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_NAME`
- Qualsiasi configurazione frontend

❌ **NON SICURO - Mai esporre:**
- `SUPABASE_SERVICE_ROLE_KEY` (accesso admin completo)
- `SUPABASE_JWT_SECRET` (firma token)
- API keys di pagamento (Stripe secret key)
- Credenziali database dirette
- Password o token sensibili

**Nel tuo progetto NON usi nessuna variabile sensibile nel frontend!** ✅

## 🔄 Update Deployment

Ogni volta che fai push su GitHub, Vercel:
1. Rileva automaticamente il push
2. Fa il build
3. Deploya la nuova versione
4. Aggiorna il sito live

## 🌐 Custom Domain (Opzionale)

1. Vercel Dashboard → Project → Settings → Domains
2. Aggiungi il tuo dominio (es: `gestionale.tuodominio.com`)
3. Configura DNS secondo le istruzioni Vercel
4. Vercel gestisce automaticamente HTTPS

## 🐛 Troubleshooting Vercel

### Build Failed
```bash
# Verifica localmente
npm run build

# Se fallisce, controlla console per errori
```

### 404 su Refresh Pagina
- ✅ Già risolto con `vercel.json` nel progetto

### Environment Variables Non Funzionano
1. Vercel Dashboard → Settings → Environment Variables
2. Verifica che abbiano prefisso `VITE_`
3. Verifica che siano abilitate per tutti gli environments
4. Rideploy il progetto

### Supabase Connection Failed
1. Verifica le variabili su Vercel Dashboard
2. Controlla che l'URL Supabase sia corretto
3. Controlla che l'anon key sia corretta (completa, lunga)

## 📊 Monitoraggio

Vercel Dashboard ti mostra:
- ⚡ Performance metrics
- 📈 Usage statistics
- 🐛 Error logs
- 📊 Analytics

## 💰 Pricing Vercel

- **Free Tier**: Perfetto per questo progetto
  - 100 GB bandwidth/mese
  - Deploy automatici
  - HTTPS automatico
  - Preview deployments

## 🔗 Link Utili

- **Vercel Docs**: https://vercel.com/docs
- **Supabase + Vercel**: https://supabase.com/docs/guides/hosting/vercel
- **Vite Deploy Guide**: https://vitejs.dev/guide/static-deploy.html

## ✅ Checklist Deploy

- [ ] Build locale funzionante (`npm run build`)
- [ ] Codice su GitHub
- [ ] Progetto importato su Vercel
- [ ] Environment variables configurate
- [ ] Deploy completato con successo
- [ ] Sito accessibile e funzionante
- [ ] Registrazione/Login funzionanti
- [ ] RLS verificato (utenti vedono solo i propri dati)

---

**🎉 Il tuo gestionale è online!**

⚠️ **Ricorda**: Il warning sulle variabili pubbliche è **NORMALE e SICURO**. Puoi ignorarlo tranquillamente!

