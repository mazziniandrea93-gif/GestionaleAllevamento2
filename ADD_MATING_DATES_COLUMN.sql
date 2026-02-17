-- ============================================
-- SCRIPT 1: Aggiungi colonna per date multiple di accoppiamento
-- ============================================

ALTER TABLE matings
ADD COLUMN IF NOT EXISTS mating_dates JSONB;

-- Commento sulla colonna
COMMENT ON COLUMN matings.mating_dates IS 'Array di date per accoppiamenti multipli (fino a 3 giorni)';

-- Aggiorna i record esistenti per popolare mating_dates con mating_date
UPDATE matings
SET mating_dates = jsonb_build_array(mating_date::text)
WHERE mating_dates IS NULL AND mating_date IS NOT NULL;

-- ============================================
-- SCRIPT 2: Aggiungi colonne males e females alla tabella litters
-- ============================================

ALTER TABLE litters
ADD COLUMN IF NOT EXISTS males INTEGER DEFAULT 0;

ALTER TABLE litters
ADD COLUMN IF NOT EXISTS females INTEGER DEFAULT 0;

-- Commenti sulle colonne
COMMENT ON COLUMN litters.males IS 'Numero di cuccioli maschi nella cucciolata';
COMMENT ON COLUMN litters.females IS 'Numero di cucciole femmine nella cucciolata';

-- ============================================
-- SCRIPT 3: Fix alive_puppies - rendi nullable e aggiungi default
-- ============================================

-- Rendi alive_puppies nullable (può essere calcolato da total_puppies - deceased_puppies)
ALTER TABLE litters
ALTER COLUMN alive_puppies DROP NOT NULL;

-- Assicurati che deceased_puppies esista e abbia default 0
ALTER TABLE litters
ALTER COLUMN deceased_puppies SET DEFAULT 0;

-- Aggiorna record esistenti dove alive_puppies è NULL
UPDATE litters
SET alive_puppies = total_puppies - COALESCE(deceased_puppies, 0)
WHERE alive_puppies IS NULL;

COMMENT ON COLUMN litters.alive_puppies IS 'Numero di cuccioli vivi (calcolato: total_puppies - deceased_puppies)';

