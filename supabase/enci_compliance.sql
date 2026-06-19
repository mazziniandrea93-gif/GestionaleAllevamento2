-- ============================================================
-- ENCI - Compliance cucciolate
-- ============================================================
-- Campi per il registro/denuncia ENCI delle cucciolate e per
-- l'iscrizione ROI/LOI dei singoli cuccioli.
--
-- Eseguire nella SQL Editor di Supabase (o già applicato via CLI).
-- ============================================================

-- Livello cucciolata
ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS enci_denuncia_sent boolean NOT NULL DEFAULT false;
ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS enci_denuncia_date date;
ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS roi_litter_number text;  -- numero registrazione cucciolata

-- Livello singolo cucciolo
ALTER TABLE puppies
  ADD COLUMN IF NOT EXISTS roi_loi_number text;      -- numero iscrizione ROI/LOI
