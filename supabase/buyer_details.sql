-- ============================================================
-- ANAGRAFICA COMPLETA ACQUIRENTE (sui cuccioli)
-- ============================================================
-- Salva i dati anagrafici dell'acquirente sulla scheda del cucciolo,
-- così vengono inseriti UNA volta sola e ricompaiono in tutti i
-- documenti (precontratto, contratto, passaggio di proprietà ENCI).
--
-- Eseguire nella SQL Editor di Supabase.
-- (Le policy RLS della tabella puppies coprono automaticamente le
-- nuove colonne: nessuna policy aggiuntiva necessaria.)
-- ============================================================

ALTER TABLE puppies ADD COLUMN IF NOT EXISTS buyer_cf      text;  -- codice fiscale
ALTER TABLE puppies ADD COLUMN IF NOT EXISTS buyer_address text;  -- via e numero civico
ALTER TABLE puppies ADD COLUMN IF NOT EXISTS buyer_cap     text;  -- CAP
ALTER TABLE puppies ADD COLUMN IF NOT EXISTS buyer_city    text;  -- città
ALTER TABLE puppies ADD COLUMN IF NOT EXISTS buyer_pec     text;  -- PEC
