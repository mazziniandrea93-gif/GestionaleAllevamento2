import { createClient } from '@supabase/supabase-js'

// Leggi le credenziali dalle variabili d'ambiente
const supabaseUrl = 'https://pmidxvswypdhdlscumyr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtaWR4dnN3eXBkaGRsc2N1bXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDM4NTgsImV4cCI6MjA4NjQxOTg1OH0.LWtCb-LoqdU_ZRADuAJBHKaGUFigng0N2Kd11woNaDg'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔧 ISTRUZIONI PER AGGIORNARE IL DATABASE\n')
console.log('=' .repeat(60))
console.log('\n📋 COPIA E INCOLLA QUESTO SCRIPT SU SUPABASE:\n')
console.log('1. Vai su: https://app.supabase.com/project/pmidxvswypdhdlscumyr/sql/new')
console.log('2. Incolla lo script qui sotto')
console.log('3. Clicca "Run" o premi Ctrl+Enter\n')
console.log('=' .repeat(60))
console.log(`
-- ============================================
-- AGGIUNGI COLONNE MANCANTI
-- ============================================

-- 1. Aggiungi colonna per date multiple di accoppiamento
ALTER TABLE matings
ADD COLUMN IF NOT EXISTS mating_dates JSONB;

COMMENT ON COLUMN matings.mating_dates IS 'Array di date per accoppiamenti multipli (fino a 3 giorni)';

-- Aggiorna i record esistenti
UPDATE matings
SET mating_dates = jsonb_build_array(mating_date::text)
WHERE mating_dates IS NULL AND mating_date IS NOT NULL;

-- 2. Aggiungi colonne males e females alla tabella litters
ALTER TABLE litters
ADD COLUMN IF NOT EXISTS males INTEGER DEFAULT 0;

ALTER TABLE litters
ADD COLUMN IF NOT EXISTS females INTEGER DEFAULT 0;

COMMENT ON COLUMN litters.males IS 'Numero di cuccioli maschi nella cucciolata';
COMMENT ON COLUMN litters.females IS 'Numero di cucciole femmine nella cucciolata';

-- ============================================
-- VERIFICA
-- ============================================
SELECT 'Modifiche completate con successo!' as status;
`)
console.log('=' .repeat(60))
console.log('\n✅ Dopo aver eseguito lo script, premi un tasto per verificare...\n')

// Aspetta input utente
process.stdin.once('data', async () => {
  console.log('\n🔍 Verifica in corso...\n')

  try {
    // Verifica matings
    const { data: mating, error: matingError } = await supabase
      .from('matings')
      .select('id, mating_date, mating_dates')
      .limit(1)

    if (matingError) {
      console.log('❌ Errore matings:', matingError.message)
      console.log('   La colonna mating_dates potrebbe non essere stata creata')
    } else {
      console.log('✅ Tabella matings OK - colonna mating_dates presente')
    }

    // Verifica litters
    const { data: litter, error: litterError } = await supabase
      .from('litters')
      .select('id, males, females')
      .limit(1)

    if (litterError) {
      console.log('❌ Errore litters:', litterError.message)
      console.log('   Le colonne males/females potrebbero non essere state create')
    } else {
      console.log('✅ Tabella litters OK - colonne males/females presenti')
    }

    console.log('\n🎉 Verifica completata!\n')
    process.exit(0)

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error.message)
    process.exit(1)
  }
})

