import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper per ottenere user_id corrente
async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')
  return user.id
}

// Aggiunge un intervallo (giorni/mesi/anni) a una data, restituendo una nuova Date.
// Usato per calcolare la prossima scadenza dei promemoria sanitari ricorrenti.
export function addInterval(date, unit, value) {
  const d = new Date(date)
  const n = parseInt(value) || 0
  if (unit === 'giorni') d.setDate(d.getDate() + n)
  else if (unit === 'anni') d.setFullYear(d.getFullYear() + n)
  else d.setMonth(d.getMonth() + n) // default: mesi
  return d
}

// Helper functions per le operazioni comuni
export const db = {
  // DOGS
  async getDogs(status = null) {
    let query = supabase
      .from('dogs')
      .select('*')
      .order('name')
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getDog(id) {
    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getDogWithParents(id) {
    const { data, error } = await supabase
      .from('dogs')
      .select(`
        *,
        mother:dogs!dogs_mother_id_fkey(id, name, breed, gender, color, birth_date, status),
        father:dogs!dogs_father_id_fkey(id, name, breed, gender, color, birth_date, status)
      `)
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async getDogWithAncestors(id) {
    const lvl3 = `id, name, nickname, breed, gender, color, birth_date, status`
    const lvl2 = `id, name, nickname, breed, gender, color, birth_date, status,
      mother:dogs!dogs_mother_id_fkey(${lvl3}),
      father:dogs!dogs_father_id_fkey(${lvl3})`
    const lvl1 = `id, name, nickname, breed, gender, color, birth_date, status,
      mother:dogs!dogs_mother_id_fkey(${lvl2}),
      father:dogs!dogs_father_id_fkey(${lvl2})`
    const { data, error } = await supabase
      .from('dogs')
      .select(`*, mother:dogs!dogs_mother_id_fkey(${lvl1}), father:dogs!dogs_father_id_fkey(${lvl1})`)
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async getMatingsForDog(dogId) {
    const { data, error } = await supabase
      .from('matings')
      .select(`
        *,
        female:dogs!female_id(id, name, gender, color, breed),
        male:dogs!male_id(id, name, gender, color, breed),
        litters(
          id, birth_date, males, females, total_puppies, alive_puppies,
          puppies(id, name, gender, color, status)
        )
      `)
      .or(`female_id.eq.${dogId},male_id.eq.${dogId}`)
      .order('mating_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createDog(dog) {
    const userId = await getCurrentUserId()
    const payload = { ...dog, user_id: userId }
    if (!payload.microchip) payload.microchip = null
    if (payload.weight === '' || payload.weight === undefined) payload.weight = null
    if (payload.height === '' || payload.height === undefined) payload.height = null

    const { data, error } = await supabase
      .from('dogs')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateDog(id, updates) {
    const payload = { ...updates }
    // Nullifica solo se il campo è stato esplicitamente passato come stringa vuota
    if ('microchip' in payload && !payload.microchip) payload.microchip = null
    if ('weight'   in payload && (payload.weight === '' || payload.weight === null)) payload.weight = null
    if ('height'   in payload && (payload.height === '' || payload.height === null)) payload.height = null

    const { data, error } = await supabase
      .from('dogs')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Se il cane non è più attivo (deceduto/venduto/ceduto) sospende i suoi
    // promemoria sanitari ricorrenti: niente più eventi né notifiche.
    if ('status' in payload && payload.status && payload.status !== 'attivo') {
      await supabase
        .from('health_reminders')
        .update({ active: false })
        .eq('dog_id', id)
        .eq('active', true)
    }

    return data
  },

  async deleteDog(id) {
    const { error } = await supabase
      .from('dogs')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // HEAT CYCLES
  async getHeatCycles(dogId = null) {
    let query = supabase
      .from('heat_cycles')
      .select(`
        *,
        dog:dogs(name, microchip)
      `)
      .order('start_date', { ascending: false })
    
    if (dogId) {
      query = query.eq('dog_id', dogId)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createHeatCycle(cycle) {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('heat_cycles')
      .insert([{ ...cycle, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateHeatCycle(id, updates) {
    const { data, error } = await supabase
      .from('heat_cycles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteHeatCycle(id) {
    const { error } = await supabase
      .from('heat_cycles')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // EXPENSES
  async getExpenses(filters = {}) {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        dog:dogs(name)
      `)
      .order('expense_date', { ascending: false })
    
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    
    if (filters.startDate) {
      query = query.gte('expense_date', filters.startDate)
    }
    
    if (filters.endDate) {
      query = query.lte('expense_date', filters.endDate)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createExpense(expense) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expense, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateExpense(id, updates) {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteExpense(id) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // INCOME
  async getIncome(filters = {}) {
    let query = supabase
      .from('income')
      .select('*')
      .order('income_date', { ascending: false })
    
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    
    if (filters.startDate) {
      query = query.gte('income_date', filters.startDate)
    }
    
    if (filters.endDate) {
      query = query.lte('income_date', filters.endDate)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createIncome(income) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('income')
      .insert([{ ...income, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateIncome(id, updates) {
    const { data, error } = await supabase
      .from('income')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteIncome(id) {
    const { error } = await supabase
      .from('income')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // PUPPIES
  async getPuppies(litterId = null, status = null) {
    let query = supabase
      .from('puppies')
      .select(`
        *,
        litter:litters(
          id,
          birth_date,
          males,
          females,
          total_puppies,
          alive_puppies,
          deceased_puppies
        )
      `)
      .order('created_at', { ascending: false })
    
    if (litterId) {
      query = query.eq('litter_id', litterId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createPuppy(puppy) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('puppies')
      .insert([{ ...puppy, user_id: userId }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updatePuppy(id, updates) {
    const { data, error } = await supabase
      .from('puppies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deletePuppy(id) {
    const { error } = await supabase
      .from('puppies')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // EVENTS
  async getEvents(filters = {}) {
    let query = supabase
      .from('events')
      .select('*')
      .order('event_date')

    if (filters.upcoming) {
      query = query
        .gte('event_date', new Date().toISOString().split('T')[0])
        .eq('completed', false)
    }

    if (filters.dogId) {
      query = query.contains('dog_ids', [filters.dogId])
    }

    const { data: events, error } = await query
    if (error) throw error

    // Arricchisce ogni evento con i dati dei cani da dog_ids
    const allDogIds = [...new Set(events.flatMap(e => e.dog_ids || []))]
    let dogsMap = {}
    if (allDogIds.length > 0) {
      const { data: dogs } = await supabase
        .from('dogs')
        .select('id, name, breed, color, gender, photo_url')
        .in('id', allDogIds)
      dogs?.forEach(d => { dogsMap[d.id] = d })
    }

    return events.map(e => ({
      ...e,
      dogs: (e.dog_ids || []).map(id => dogsMap[id]).filter(Boolean),
    }))
  },

  async getHeatEventByDogId(dogId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .ilike('description', `%__heat_dog:${dogId}__%`)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getHeatEventsByDogId(dogId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .ilike('description', `%__heat_dog:${dogId}__%`)
      .order('event_date', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getEventByMatingId(matingId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .ilike('description', `%__mating_id:${matingId}__%`)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async createEvent(event) {
    const userId = await getCurrentUserId()
    const { dog_ids = [], ...rest } = event

    const { data, error } = await supabase
      .from('events')
      .insert([{ ...rest, dog_ids, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateEvent(id, updates) {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteEvent(id) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // DASHBOARD SUMMARY
  async getDashboardSummary() {
    const { data, error } = await supabase
      .from('dashboard_summary')
      .select('*')
      .single()
    
    if (error) throw error
    return data
  },

  // STATISTICS - Annuali
  async getYearlyIncome(year = new Date().getFullYear()) {
    const { data, error } = await supabase
      .from('income')
      .select('amount')
      .gte('income_date', `${year}-01-01`)
      .lte('income_date', `${year}-12-31`)

    if (error) throw error

    const total = data.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
    return total
  },

  async getYearlyExpenses(year = new Date().getFullYear()) {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', `${year}-01-01`)
      .lte('expense_date', `${year}-12-31`)

    if (error) throw error

    const total = data.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
    return total
  },

  async getActiveDogs() {
    const { data, error } = await supabase
      .from('dogs')
      .select('id')
      .eq('status', 'attivo')

    if (error) throw error
    return data.length
  },

  async getAvailablePuppies() {
    const { data, error } = await supabase
      .from('puppies')
      .select('id')
      .eq('status', 'disponibile')

    if (error) throw error
    return data.length
  },

  // DOG MEASUREMENTS - Tracciamento crescita
  async getDogMeasurements(dogId) {
    const { data, error } = await supabase
      .from('dog_measurements')
      .select('*')
      .eq('dog_id', dogId)
      .order('measurement_date', { ascending: true })

    if (error) throw error
    return data
  },

  // Media di peso/altezza per fascia d'età (in mesi), calcolata sui cani
  // della stessa razza, escludendo il cane corrente. Serve come linea di
  // riferimento nei grafici di crescita. Calcolo live, cachato lato client.
  async getBreedGrowthAverages(breed, excludeDogId = null) {
    if (!breed) return []

    // Prendo i cani della stessa razza (con data di nascita) escluso il corrente
    let dogsQuery = supabase
      .from('dogs')
      .select('id, birth_date')
      .eq('breed', breed)
      .not('birth_date', 'is', null)

    if (excludeDogId) {
      dogsQuery = dogsQuery.neq('id', excludeDogId)
    }

    const { data: dogs, error: dogsError } = await dogsQuery
    if (dogsError) throw dogsError
    if (!dogs || dogs.length === 0) return []

    const birthById = {}
    dogs.forEach(d => { birthById[d.id] = d.birth_date })
    const dogIds = dogs.map(d => d.id)

    const { data: measurements, error: mError } = await supabase
      .from('dog_measurements')
      .select('dog_id, measurement_date, weight, height')
      .in('dog_id', dogIds)
    if (mError) throw mError

    // Raggruppo per età in mesi al momento della misurazione
    const buckets = {}
    for (const m of measurements || []) {
      const birth = birthById[m.dog_id]
      if (!birth) continue
      const ageMonths = Math.max(0, Math.round(
        (new Date(m.measurement_date) - new Date(birth)) / (1000 * 60 * 60 * 24 * 30.44)
      ))
      if (!buckets[ageMonths]) {
        buckets[ageMonths] = { weightSum: 0, weightCount: 0, heightSum: 0, heightCount: 0 }
      }
      if (m.weight != null) {
        buckets[ageMonths].weightSum += parseFloat(m.weight)
        buckets[ageMonths].weightCount++
      }
      if (m.height != null) {
        buckets[ageMonths].heightSum += parseFloat(m.height)
        buckets[ageMonths].heightCount++
      }
    }

    // Mostra la media di una fascia solo se calcolata su più di 2 valori:
    // con 1-2 campioni non è statisticamente significativa.
    const MIN_SAMPLES = 3
    return Object.entries(buckets)
      .map(([ageMonths, b]) => ({
        ageMonths: Number(ageMonths),
        avgWeight: b.weightCount >= MIN_SAMPLES ? b.weightSum / b.weightCount : null,
        avgHeight: b.heightCount >= MIN_SAMPLES ? b.heightSum / b.heightCount : null,
      }))
      .filter(b => b.avgWeight != null || b.avgHeight != null)
      .sort((a, b) => a.ageMonths - b.ageMonths)
  },

  async createDogMeasurement(measurement) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('dog_measurements')
      .insert([{ ...measurement, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateDogMeasurement(id, updates) {
    const { data, error } = await supabase
      .from('dog_measurements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteDogMeasurement(id) {
    const { error } = await supabase
      .from('dog_measurements')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // HEALTH RECORDS
  async getHealthRecords(dogId) {
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('dog_id', dogId)
      .order('record_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  async createHealthRecord(record) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('health_records')
      .insert([{ ...record, user_id: userId }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateHealthRecord(id, updates) {
    const { data, error } = await supabase
      .from('health_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteHealthRecord(id) {
    const { error } = await supabase
      .from('health_records')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // FINANCIALS - Bilancio per cane / cucciolata
  async getDogFinancials(dogId) {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount, category, expense_date')
      .eq('dog_id', dogId)
    if (error) throw error

    let total = 0
    const byCategory = {}
    for (const e of data) {
      const amt = parseFloat(e.amount || 0)
      total += amt
      byCategory[e.category || 'altro'] = (byCategory[e.category || 'altro'] || 0) + amt
    }
    return { total, byCategory, count: data.length }
  },

  // Ricavi di una cucciolata: somma delle entrate collegate ai suoi cuccioli
  // (income.puppy_id). I costi non sono collegabili alla cucciolata (le
  // spese hanno dog_id, non litter_id), quindi qui si calcolano i ricavi.
  async getLitterFinancials(litterId) {
    const { data: pups, error: pErr } = await supabase
      .from('puppies')
      .select('id, status')
      .eq('litter_id', litterId)
    if (pErr) throw pErr

    const puppyIds = pups.map(p => p.id)
    let income = []
    if (puppyIds.length > 0) {
      const { data, error } = await supabase
        .from('income')
        .select('amount, puppy_id')
        .in('puppy_id', puppyIds)
      if (error) throw error
      income = data
    }

    const totalIncome = income.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
    const soldCount = pups.filter(p => p.status === 'venduto').length
    return { totalIncome, soldCount, puppyCount: pups.length }
  },

  // HEALTH REMINDERS - Promemoria sanitari ricorrenti
  async getHealthReminders(dogId = null) {
    let query = supabase
      .from('health_reminders')
      .select(`*, dog:dogs(id, name, breed, color, status)`)
      .order('next_due_date', { ascending: true })

    if (dogId) {
      query = query.eq('dog_id', dogId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createHealthReminder(reminder) {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('health_reminders')
      .insert([{ ...reminder, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateHealthReminder(id, updates) {
    const { data, error } = await supabase
      .from('health_reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteHealthReminder(id) {
    const { error } = await supabase
      .from('health_reminders')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Segna la scadenza come fatta oggi e calcola la prossima in base
  // alla ricorrenza (giorni/mesi/anni). Restituisce il record aggiornato.
  async markHealthReminderDone(id, doneDate = null) {
    const { data: reminder, error: fetchError } = await supabase
      .from('health_reminders')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError

    const done = doneDate ? new Date(doneDate + 'T00:00:00') : new Date()
    done.setHours(0, 0, 0, 0)
    const next = addInterval(done, reminder.interval_unit, reminder.interval_value)

    return db.updateHealthReminder(id, {
      last_done_date: done.toISOString().split('T')[0],
      next_due_date: next.toISOString().split('T')[0],
    })
  },

  // STORAGE - Upload immagini
  async uploadImage(file, bucket = 'dogs-photos', path = '') {
    const userId = await getCurrentUserId()
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${userId}/${path ? path + '/' : ''}${fileName}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return publicUrl
  },

  // MATINGS
  async getMatings() {
    const { data, error } = await supabase
      .from('matings')
      .select(`
        *,
        female:dogs!female_id(id, name),
        male:dogs!male_id(id, name)
      `)
      .order('mating_date', { ascending: false })

    if (error) throw error
    return data
  },

  async createMating(mating) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('matings')
      .insert([{ ...mating, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateMating(id, updates) {
    const { data, error } = await supabase
      .from('matings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteMating(id) {
    const { error } = await supabase
      .from('matings')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // LITTERS
  async getLitters() {
    const { data, error } = await supabase
      .from('litters')
      .select('*')
      .order('birth_date', { ascending: false })

    if (error) throw error
    return data
  },

  async createLitter(litter) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('litters')
      .insert([{ ...litter, user_id: userId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateLitter(id, updates) {
    const { data, error } = await supabase
      .from('litters')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteLitter(id) {
    const { error } = await supabase
      .from('litters')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // JUDGES
  async getJudges() {
    const { data, error } = await supabase
      .from('judges')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  async createJudge(judge) {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('judges')
      .insert([{ ...judge, user_id: userId }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateJudge(id, updates) {
    const { data, error } = await supabase
      .from('judges')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteJudge(id) {
    const { error } = await supabase
      .from('judges')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // DOG JUDGMENTS
  async getJudgments(dogId) {
    const { data, error } = await supabase
      .from('dog_judgments')
      .select(`*, judge:judges(id, name, nationality, specialization)`)
      .eq('dog_id', dogId)
      .order('judgment_date', { ascending: false })
    if (error) throw error
    return data
  },

  async createJudgment(judgment) {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('dog_judgments')
      .insert([{ ...judgment, user_id: userId }])
      .select(`*, judge:judges(id, name, nationality, specialization)`)
      .single()
    if (error) throw error
    return data
  },

  async updateJudgment(id, updates) {
    const { data, error } = await supabase
      .from('dog_judgments')
      .update(updates)
      .eq('id', id)
      .select(`*, judge:judges(id, name, nationality, specialization)`)
      .single()
    if (error) throw error
    return data
  },

  async deleteJudgment(id) {
    const { error } = await supabase
      .from('dog_judgments')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getAllJudgments() {
    const { data, error } = await supabase
      .from('dog_judgments')
      .select(`*, judge:judges(id, name, nationality, specialization), dog:dogs(id, name, breed)`)
      .order('judgment_date', { ascending: false })
    if (error) throw error
    return data
  },

  // SETTINGS
  async getSettings() {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async updateSettings(updates) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
