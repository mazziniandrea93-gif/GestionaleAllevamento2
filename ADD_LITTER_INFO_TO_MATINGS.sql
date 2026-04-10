-- ============================================
-- AGGIUNTA INFORMAZIONI CUCCIOLATA A MATINGS
-- ============================================
-- Questi campi permettono di tracciare quando una cucciolata
-- è nata da un accoppiamento e calcolare i giorni di gestazione

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

