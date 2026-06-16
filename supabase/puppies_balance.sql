-- ============================================================
-- PUPPIES - Tracciamento saldo
-- ============================================================
-- Aggiunge il flag "saldo pagato" ai cuccioli. L'acconto è già
-- gestito da deposit_amount/deposit_date; il residuo si calcola
-- come sale_price - deposit_amount lato applicazione.
--
-- Eseguire nella SQL Editor di Supabase (o già applicato via CLI).
-- ============================================================

ALTER TABLE puppies
  ADD COLUMN IF NOT EXISTS balance_paid boolean NOT NULL DEFAULT false;
