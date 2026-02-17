-- ============================================
-- FIX: Row Level Security per health_records
-- ============================================

-- Abilita RLS sulla tabella health_records (se non già abilitato)
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

-- Elimina eventuali policy esistenti per evitare conflitti
DROP POLICY IF EXISTS "Users can view own health records" ON health_records;
DROP POLICY IF EXISTS "Users can insert own health records" ON health_records;
DROP POLICY IF EXISTS "Users can update own health records" ON health_records;
DROP POLICY IF EXISTS "Users can delete own health records" ON health_records;

-- Policy: Gli utenti possono vedere solo i propri record sanitari
CREATE POLICY "Users can view own health records"
    ON health_records FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Gli utenti possono inserire record sanitari per i propri cani
CREATE POLICY "Users can insert own health records"
    ON health_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Gli utenti possono aggiornare i propri record sanitari
CREATE POLICY "Users can update own health records"
    ON health_records FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Gli utenti possono eliminare i propri record sanitari
CREATE POLICY "Users can delete own health records"
    ON health_records FOR DELETE
    USING (auth.uid() = user_id);

-- Verifica le policy create
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'health_records';

