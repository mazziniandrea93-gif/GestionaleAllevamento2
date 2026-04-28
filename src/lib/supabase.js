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

  async getMatingsForDog(dogId) {
    const { data, error } = await supabase
      .from('matings')
      .select(`
        *,
        female:dogs!matings_female_id_fkey(id, name, gender, color, breed),
        male:dogs!matings_male_id_fkey(id, name, gender, color, breed),
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
    if (!payload.microchip) payload.microchip = null
    if (payload.weight === '' || payload.weight === undefined) payload.weight = null
    if (payload.height === '' || payload.height === undefined) payload.height = null

    const { data, error } = await supabase
      .from('dogs')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
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
          deceased_puppies,
          mating:matings(
            female:dogs!matings_female_id_fkey(name),
            male:dogs!matings_male_id_fkey(name)
          )
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
        .select('id, name, breed, color')
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
        female:dogs!matings_female_id_fkey(id, name),
        male:dogs!matings_male_id_fkey(id, name)
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
      .select(`
        *,
        mating:matings(
          female:dogs!matings_female_id_fkey(name),
          male:dogs!matings_male_id_fkey(name)
        )
      `)
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
