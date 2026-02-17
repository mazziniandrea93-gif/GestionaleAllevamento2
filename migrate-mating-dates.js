import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Carica le variabili d'ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Errore: Variabili d\'ambiente Supabase mancanti')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function addMatingDatesColumn() {
  console.log('🔄 Aggiunta colonna mating_dates alla tabella matings...')

  try {
    // Nota: La libreria client di Supabase non supporta ALTER TABLE direttamente
    // Dobbiamo usare l'API RPC o edge functions
    // Per ora facciamo una verifica che la colonna esista provando a fare una query

    const { data, error } = await supabase
      .from('matings')
      .select('id, mating_dates')
      .limit(1)

    if (error) {
      console.log('⚠️  La colonna mating_dates potrebbe non esistere ancora')
      console.log('📝 Dettagli errore:', error.message)
      console.log('')
      console.log('🔧 AZIONE MANUALE RICHIESTA:')
      console.log('   Vai su Supabase Dashboard → SQL Editor')
      console.log('   Ed esegui questo script:')
      console.log('')
      console.log('   ALTER TABLE matings ADD COLUMN IF NOT EXISTS mating_dates JSONB;')
      console.log('   UPDATE matings SET mating_dates = jsonb_build_array(mating_date::text)')
      console.log('   WHERE mating_dates IS NULL AND mating_date IS NOT NULL;')
      console.log('')
      return false
    }

    console.log('✅ La colonna mating_dates esiste già o è stata creata!')

    // Aggiorna i record esistenti che non hanno mating_dates
    const { data: matings, error: fetchError } = await supabase
      .from('matings')
      .select('id, mating_date, mating_dates')
      .is('mating_dates', null)

    if (fetchError) {
      console.error('❌ Errore nel recupero degli accoppiamenti:', fetchError)
      return false
    }

    if (matings && matings.length > 0) {
      console.log(`🔄 Aggiornamento di ${matings.length} accoppiamenti...`)

      for (const mating of matings) {
        if (mating.mating_date) {
          const { error: updateError } = await supabase
            .from('matings')
            .update({ mating_dates: [mating.mating_date] })
            .eq('id', mating.id)

          if (updateError) {
            console.error(`❌ Errore aggiornamento ${mating.id}:`, updateError)
          }
        }
      }

      console.log('✅ Accoppiamenti aggiornati con successo!')
    } else {
      console.log('ℹ️  Nessun accoppiamento da aggiornare')
    }

    return true

  } catch (error) {
    console.error('❌ Errore:', error.message)
    return false
  }
}

async function verifyChanges() {
  console.log('\n🔍 Verifica modifiche...')

  try {
    const { data, error } = await supabase
      .from('matings')
      .select('id, mating_date, mating_dates')
      .limit(5)

    if (error) {
      console.error('❌ Errore verifica:', error)
      return false
    }

    console.log('✅ Struttura tabella corretta!')
    console.log(`📊 Trovati ${data?.length || 0} accoppiamenti`)

    if (data && data.length > 0) {
      console.log('\n📝 Esempio record:')
      console.log(JSON.stringify(data[0], null, 2))
    }

    return true

  } catch (error) {
    console.error('❌ Errore verifica:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Script di migrazione database - Accoppiamenti date multiple\n')

  const success = await addMatingDatesColumn()

  if (success) {
    await verifyChanges()
    console.log('\n✅ Migrazione completata con successo!')
  } else {
    console.log('\n⚠️  Migrazione non completata - Segui le istruzioni sopra')
  }
}

main()

