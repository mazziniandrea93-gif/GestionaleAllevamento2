-- ================================================
-- SCRIPT DI VERIFICA SICUREZZA RLS
-- Esegui questo script per verificare che tutte le tabelle abbiano RLS attiva
-- ================================================

-- 1. VERIFICA CHE RLS SIA ATTIVA SU TUTTE LE TABELLE
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ RLS Attiva'
    ELSE '❌ RLS NON Attiva - PERICOLO!'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- 2. VERIFICA LE POLICY RLS ESISTENTI
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. CONTA LE POLICY PER TABELLA
SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ Policy OK'
    WHEN COUNT(*) = 1 THEN '⚠️ Solo 1 policy'
    ELSE '❌ Nessuna policy - PERICOLO!'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. VERIFICA TABELLE SENZA RLS O SENZA POLICY
SELECT
  t.tablename,
  CASE
    WHEN t.rowsecurity = false THEN '❌ RLS Non Attiva'
    WHEN p.tablename IS NULL THEN '❌ Nessuna Policy Configurata'
    ELSE '✅ OK'
  END AS problema
FROM pg_tables t
LEFT JOIN (
  SELECT DISTINCT tablename
  FROM pg_policies
  WHERE schemaname = 'public'
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND (t.rowsecurity = false OR p.tablename IS NULL);

-- 5. SCRIPT PER ABILITARE RLS SU TUTTE LE TABELLE (SE NECESSARIO)
-- DECOMMENTARE E ESEGUIRE SOLO SE CI SONO TABELLE SENZA RLS

/*
-- ABILITA RLS SU TUTTE LE TABELLE
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE puppies ENABLE ROW LEVEL SECURITY;
ALTER TABLE matings ENABLE ROW LEVEL SECURITY;
ALTER TABLE litters ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dog_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE heat_cycles ENABLE ROW LEVEL SECURITY;
*/

-- 6. TEMPLATE POLICY (DA ADATTARE PER OGNI TABELLA)
/*
-- ESEMPIO: Policy per tabella "dogs"
-- DROP POLICY IF EXISTS "users_select_own_dogs" ON dogs;
-- DROP POLICY IF EXISTS "users_insert_own_dogs" ON dogs;
-- DROP POLICY IF EXISTS "users_update_own_dogs" ON dogs;
-- DROP POLICY IF EXISTS "users_delete_own_dogs" ON dogs;

CREATE POLICY "users_select_own_dogs" ON dogs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_dogs" ON dogs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_dogs" ON dogs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_dogs" ON dogs
  FOR DELETE
  USING (auth.uid() = user_id);
*/

-- 7. VERIFICA EVENTO TRIGGER RLS AUTOMATICO (SE CONFIGURATO)
SELECT
  trigger_name,
  event_object_schema,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%rls%'
ORDER BY event_object_table;

-- 8. TEST DI SICUREZZA (ESEGUI COME UTENTE NON AUTENTICATO)
-- Questi dovrebbero FALLIRE o tornare 0 righe se RLS funziona correttamente
/*
SELECT * FROM dogs LIMIT 1;
SELECT * FROM puppies LIMIT 1;
SELECT * FROM matings LIMIT 1;
SELECT * FROM litters LIMIT 1;
SELECT * FROM health_records LIMIT 1;
SELECT * FROM expenses LIMIT 1;
SELECT * FROM income LIMIT 1;
SELECT * FROM events LIMIT 1;
SELECT * FROM settings LIMIT 1;
SELECT * FROM dog_measurements LIMIT 1;
*/

-- ================================================
-- RIEPILOGO SICUREZZA
-- ================================================
-- Tutte le tabelle dovrebbero avere:
-- 1. RLS Attiva (rowsecurity = true)
-- 2. Almeno 4 policy (SELECT, INSERT, UPDATE, DELETE)
-- 3. Ogni policy dovrebbe filtrare per auth.uid() = user_id
-- ================================================

