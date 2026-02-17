# 📐 ARCHITETTURA COMPLETA - Gestionale Allevamento

## 🎯 Overview Progetto

Sistema web completo per gestione professionale di allevamento canino con:
- Tracking finanziario avanzato
- Gestione riproduzione e genealogia
- Sistema eventi e promemoria
- Cartelle sanitarie digitali
- Analytics e reportistica

## 🗄️ Database Schema (Supabase PostgreSQL)

### Tabelle Principali

#### 1. **dogs** - Cani in allevamento
```sql
- id (UUID, PK)
- name, microchip, breed, gender, birth_date
- color, pedigree_number
- status (attivo/venduto/ceduto/deceduto)
- photo_url
- purchase_price, purchase_date
- sale_price, sale_date, owner info
```

**Trigger automatici:**
- `update_updated_at` - Aggiorna timestamp

**Indici:**
- status, breed per query veloci

#### 2. **heat_cycles** - Calori femmine
```sql
- id (UUID, PK)
- dog_id (FK)
- start_date, end_date, duration_days
- next_estimated_date (AUTO-CALCOLATO)
- mating_occurred
```

**FEATURE CHIAVE:**
```sql
-- Auto-calcola prossimo calore
CREATE TRIGGER auto_calculate_next_heat
BEFORE INSERT OR UPDATE ON heat_cycles
FOR EACH ROW EXECUTE FUNCTION calculate_next_heat();
```

**Logica:**
1. Calcola media cicli precedenti
2. Se nessuno, usa default da settings (180 gg)
3. Stima: `start_date + media_giorni`

#### 3. **matings** - Accoppiamenti
```sql
- id (UUID, PK)
- female_id, male_id (FK dogs)
- mating_date
- expected_delivery (mating_date + 63 gg)
- confirmed_pregnancy
- stud_fee
```

**Trigger:**
```sql
-- Auto-crea evento parto stimato
CREATE TRIGGER auto_create_delivery_event
AFTER INSERT OR UPDATE ON matings
FOR EACH ROW EXECUTE FUNCTION create_delivery_event();
```

#### 4. **litters** - Cucciolate
```sql
- id (UUID, PK)
- mating_id (FK)
- birth_date
- total_puppies, alive_puppies, deceased_puppies
```

#### 5. **puppies** - Singoli cuccioli
```sql
- id (UUID, PK)
- litter_id (FK)
- name, gender, color, birth_weight
- status (disponibile/prenotato/venduto/deceduto/trattenuto)
- microchip
- sale_price, buyer_info, deposit_info
```

#### 6. **expenses** - Spese
```sql
- id (UUID, PK)
- dog_id (FK, optional)
- category (veterinario/alimentazione/toelettatura/...)
- description, amount, expense_date
- receipt_url (Supabase Storage)
```

**Categorie:**
- veterinario
- alimentazione
- toelettatura
- medicinali
- attrezzatura
- esposizioni
- riproduzione
- addestramento
- altro

#### 7. **income** - Incassi
```sql
- id (UUID, PK)
- puppy_id (FK, optional)
- category (vendita_cucciolo/monta/pensione/...)
- description, amount, income_date
- payment_method, invoice_number
```

#### 8. **health_records** - Cartelle sanitarie
```sql
- id (UUID, PK)
- dog_id (FK)
- record_type (vaccinazione/visita/intervento/...)
- description, record_date
- veterinarian, cost
- next_appointment_date (per richiami)
- documents_url (Storage)
```

#### 9. **events** - Calendario eventi
```sql
- id (UUID, PK)
- dog_id (FK)
- event_type (veterinario/toelettatura/esposizione/calore_stimato/parto_stimato)
- title, description, event_date
- completed (boolean)
- reminder_days (notifica X giorni prima)
```

#### 10. **settings** - Impostazioni allevamento
```sql
- kennel_name, kennel_affix
- owner_name, vat_number
- address, phone, email, website
- logo_url
- default_heat_cycle_days (180)
- default_pregnancy_days (63)
```

### View Materialized

#### dashboard_summary
```sql
- total_active_dogs
- available_puppies
- monthly_income
- monthly_expenses
- upcoming_events (prossimi 7 gg)
```

## 🎨 Frontend Architecture

### Tech Stack
```
React 18.2
├── Vite (build tool)
├── React Router v6 (routing)
├── TanStack Query (data fetching + cache)
├── Zustand (state management, opzionale)
├── React Hook Form + Zod (forms validation)
├── TailwindCSS (styling)
├── Recharts (grafici)
├── Lucide React (icone)
├── date-fns (date utilities)
└── react-hot-toast (notifications)
```

### Folder Structure
```
src/
├── lib/
│   ├── supabase.js      # Client + helper DB functions
│   ├── utils.js         # Utility functions
│   └── constants.js     # Enums, configs
│
├── hooks/
│   ├── useDogs.js       # Custom hook per dogs
│   ├── useExpenses.js
│   ├── useIncome.js
│   └── useEvents.js
│
├── components/
│   ├── layout/
│   ├── ui/             # Reusable (Button, Modal, Input...)
│   ├── dogs/
│   ├── breeding/
│   ├── finance/
│   ├── health/
│   └── puppies/
│
└── pages/
    ├── Dashboard.jsx
    ├── Dogs.jsx
    ├── DogDetail.jsx
    ├── Breeding.jsx
    ├── Puppies.jsx
    ├── Finance.jsx
    ├── Health.jsx
    ├── Calendar.jsx
    └── Settings.jsx
```

### State Management

**TanStack Query** per server state:
```js
const { data: dogs } = useQuery({
  queryKey: ['dogs', status],
  queryFn: () => db.getDogs(status),
  staleTime: 5 * 60 * 1000, // 5 min cache
})
```

**Zustand** per UI state (opzionale):
```js
// stores/useUIStore.js
const useUIStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
```

### Routing Structure

```js
/                    → Dashboard
/dogs                → Lista cani
/dogs/:id            → Dettaglio cane
/breeding            → Gestione riproduzione
/puppies             → Gestione cuccioli
/finance             → Incassi/Spese
/health              → Cartelle sanitarie
/calendar            → Eventi
/settings            → Impostazioni
```

## 🔐 Security & Performance

### Row Level Security (RLS)

**Setup per multi-utente:**

```sql
-- Abilita RLS su tutte le tabelle
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ... etc

-- Policy: ogni utente vede solo i suoi dati
CREATE POLICY "Users view own data"
ON dogs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users modify own data"
ON dogs FOR INSERT, UPDATE, DELETE
USING (auth.uid() = user_id);
```

**Aggiunta colonna user_id:**
```sql
ALTER TABLE dogs ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- ... etc
```

### Performance Optimization

#### Database
- ✅ Indici su colonne filtrate frequentemente (status, breed, dates)
- ✅ View materializzata per dashboard (refresh periodico)
- ✅ Trigger efficienti (solo calcoli necessari)
- 📋 TODO: Partitioning su tabelle grandi (expenses/income per anno)

#### Frontend
- ✅ React Query cache (5 min stale time)
- ✅ Lazy loading immagini
- ✅ Code splitting pages
- 📋 TODO: Virtual scrolling per liste lunghe
- 📋 TODO: Image optimization (WebP, dimensioni multiple)

#### Storage (Supabase)
```js
// Upload ottimizzato
async uploadImage(file) {
  // 1. Resize client-side (max 1920x1080)
  const resized = await resizeImage(file, 1920, 1080)
  
  // 2. Convert to WebP
  const webp = await convertToWebP(resized)
  
  // 3. Upload
  return db.uploadImage(webp, 'dogs')
}
```

## 📊 Features Avanzate

### 1. Heat Cycle Predictor

**Algorithm:**
```js
function predictNextHeat(dogId) {
  // 1. Fetch ultimi N cicli
  const cycles = await db.getHeatCycles(dogId)
  
  // 2. Calcola intervallo medio
  const intervals = cycles.map((c, i) => {
    if (i === 0) return null
    return differenceInDays(c.start_date, cycles[i-1].start_date)
  }).filter(Boolean)
  
  const avgInterval = mean(intervals) || 180 // default
  
  // 3. Stima prossimo
  const lastCycle = cycles[0]
  const nextDate = addDays(lastCycle.start_date, avgInterval)
  
  // 4. Crea evento
  await db.createEvent({
    dog_id: dogId,
    event_type: 'calore_stimato',
    event_date: nextDate,
    reminder_days: 7
  })
}
```

### 2. Pregnancy Tracker

**Timeline:**
```
Day 0:  Mating
Day 28: Ultrasound confirmation
Day 45: X-ray for puppy count
Day 58: Prepare whelping box
Day 63: Expected delivery (±3 days)
```

**Auto-events:**
```js
async createMating(matingData) {
  const mating = await db.createMating(matingData)
  
  // Auto-create milestones
  const events = [
    { day: 28, title: 'Conferma gravidanza (ecografia)' },
    { day: 45, title: 'Radiografia conta cuccioli' },
    { day: 58, title: 'Preparare box parto' },
    { day: 63, title: 'Parto stimato' },
  ]
  
  for (const e of events) {
    await db.createEvent({
      dog_id: mating.female_id,
      event_type: e.day === 63 ? 'parto_stimato' : 'altro',
      title: e.title,
      event_date: addDays(mating.mating_date, e.day),
      reminder_days: 3
    })
  }
}
```

### 3. Financial Analytics

**Dashboard Charts:**

```js
// Monthly Revenue Trend (6 mesi)
const getMonthlyRevenue = async () => {
  const last6Months = Array.from({ length: 6 }, (_, i) => 
    subMonths(new Date(), i)
  ).reverse()
  
  const data = await Promise.all(
    last6Months.map(async (month) => {
      const [income, expenses] = await Promise.all([
        db.getIncome({
          startDate: startOfMonth(month),
          endDate: endOfMonth(month)
        }),
        db.getExpenses({
          startDate: startOfMonth(month),
          endDate: endOfMonth(month)
        })
      ])
      
      return {
        month: format(month, 'MMM'),
        income: sum(income.map(i => i.amount)),
        expenses: sum(expenses.map(e => e.amount)),
        profit: sum(income.map(i => i.amount)) - sum(expenses.map(e => e.amount))
      }
    })
  )
  
  return data
}
```

**Category Breakdown (Pie Chart):**
```js
const expensesByCategory = expenses.reduce((acc, e) => {
  acc[e.category] = (acc[e.category] || 0) + e.amount
  return acc
}, {})
```

### 4. Health Records Timeline

**Vaccination Tracker:**
```js
const getVaccinationStatus = (dog) => {
  const vaccines = healthRecords
    .filter(r => r.record_type === 'vaccinazione')
    .sort((a, b) => new Date(b.record_date) - new Date(a.record_date))
  
  return vaccines.map(v => ({
    ...v,
    status: isPast(v.next_appointment_date) ? 'overdue' : 'current',
    daysUntil: differenceInDays(v.next_appointment_date, new Date())
  }))
}
```

### 5. Document Generation

**Contratto Vendita PDF:**
```js
import { jsPDF } from 'jspdf'

async function generateSaleContract(puppy, buyer) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.text('CONTRATTO DI VENDITA CUCCIOLO', 20, 20)
  
  // Allevamento info
  const settings = await db.getSettings()
  doc.setFontSize(12)
  doc.text(`Allevamento: ${settings.kennel_name}`, 20, 40)
  doc.text(`P.IVA: ${settings.vat_number}`, 20, 50)
  
  // Puppy info
  doc.text(`Cucciolo: ${puppy.name}`, 20, 70)
  doc.text(`Microchip: ${puppy.microchip}`, 20, 80)
  doc.text(`Prezzo: €${puppy.sale_price}`, 20, 90)
  
  // Buyer info
  doc.text(`Acquirente: ${buyer.name}`, 20, 110)
  doc.text(`Indirizzo: ${buyer.address}`, 20, 120)
  
  // Terms
  doc.setFontSize(10)
  doc.text(contractTerms, 20, 140, { maxWidth: 170 })
  
  // Signatures
  doc.text('Firma Venditore: ________________', 20, 250)
  doc.text('Firma Acquirente: ________________', 120, 250)
  
  // Save
  doc.save(`contratto_${puppy.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}
```

### 6. Export Data (Excel)

```js
import * as XLSX from 'xlsx'

async function exportFinancialReport(year) {
  const [income, expenses] = await Promise.all([
    db.getIncome({ year }),
    db.getExpenses({ year })
  ])
  
  const wb = XLSX.utils.book_new()
  
  // Sheet 1: Incassi
  const wsIncome = XLSX.utils.json_to_sheet(
    income.map(i => ({
      Data: format(i.income_date, 'dd/MM/yyyy'),
      Categoria: i.category,
      Descrizione: i.description,
      Importo: i.amount,
      Metodo: i.payment_method
    }))
  )
  XLSX.utils.book_append_sheet(wb, wsIncome, 'Incassi')
  
  // Sheet 2: Spese
  const wsExpenses = XLSX.utils.json_to_sheet(
    expenses.map(e => ({
      Data: format(e.expense_date, 'dd/MM/yyyy'),
      Categoria: e.category,
      Descrizione: e.description,
      Importo: e.amount,
      Cane: e.dog?.name || '-'
    }))
  )
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Spese')
  
  // Sheet 3: Riepilogo
  const summary = {
    'Totale Incassi': sum(income.map(i => i.amount)),
    'Totale Spese': sum(expenses.map(e => e.amount)),
    'Bilancio': sum(income.map(i => i.amount)) - sum(expenses.map(e => e.amount))
  }
  const wsSummary = XLSX.utils.json_to_sheet([summary])
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Riepilogo')
  
  // Download
  XLSX.writeFile(wb, `report_${year}.xlsx`)
}
```

## 🚀 Deployment

### Vercel Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Production
vercel --prod
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-key"
  }
}
```

### CI/CD GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
          vercel-args: '--prod'
```

## 🔮 Future Enhancements

### Short Term (1-2 mesi)
- [ ] Email notifications (Resend/SendGrid)
- [ ] WhatsApp notifications (Twilio)
- [ ] QR code generator per cani
- [ ] Backup automatico database
- [ ] Dark mode

### Medium Term (3-6 mesi)
- [ ] Mobile app (React Native + Expo)
- [ ] Pedigree tree visualizer
- [ ] AI photo tagging (riconoscimento cani)
- [ ] Inventory management (cibo, medicinali)
- [ ] Customer portal per acquirenti

### Long Term (6-12 mesi)
- [ ] Multi-kennel support (SaaS)
- [ ] Marketplace cuccioli
- [ ] Veterinarian integration
- [ ] Blockchain pedigree certificates
- [ ] DNA testing integration

## 📞 Support & Maintenance

### Monitoring
- Vercel Analytics per performance
- Supabase Dashboard per database health
- Sentry per error tracking (opzionale)

### Backup Strategy
```js
// Backup script (esegui settimanalmente)
async function backupDatabase() {
  // 1. Export da Supabase (Settings → Database → Export)
  // 2. Download SQL dump
  // 3. Salva su Google Drive / Dropbox
  // 4. Retention: keep last 4 weeks
}
```

### Updates
```bash
# Update dependencies monthly
npm update
npm audit fix

# Check for major updates
npx npm-check-updates -u
```

---

**Build with ❤️ for professional dog breeding management**
