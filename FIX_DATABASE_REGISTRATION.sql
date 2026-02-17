-- ============================================
-- FIX PER ERRORE REGISTRAZIONE UTENTI
-- ============================================
-- Esegui questo script nel SQL Editor di Supabase
-- per risolvere il problema "Database error saving new user"

-- 1. Verifica se la tabella settings esiste
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'settings'
);

-- 2. Se la tabella settings non esiste, creala
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    kennel_name VARCHAR(200),
    kennel_affix VARCHAR(100),
    owner_name VARCHAR(100),
    vat_number VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(200),
    logo_url TEXT,
    default_heat_cycle_days INTEGER DEFAULT 180,
    default_pregnancy_days INTEGER DEFAULT 63,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Abilita RLS sulla tabella settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 4. Drop delle policy esistenti se ci sono
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON settings;
DROP POLICY IF EXISTS "Users can update own settings" ON settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON settings;

-- 5. Crea le policy per RLS
CREATE POLICY "Users can view own settings"
    ON settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
    ON settings FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Drop del trigger esistente se c'è
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 7. Drop della funzione esistente se c'è
DROP FUNCTION IF EXISTS initialize_user_settings();

-- 8. Crea la funzione aggiornata per inizializzare le settings
CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.settings (
        user_id,
        kennel_name,
        default_heat_cycle_days,
        default_pregnancy_days,
        email
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'kennel_name', 'Il Mio Allevamento'),
        180,
        63,
        NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error creating settings for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Crea il trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_settings();

-- 10. Crea settings per utenti esistenti che non ce l'hanno
INSERT INTO public.settings (user_id, kennel_name, default_heat_cycle_days, default_pregnancy_days, email)
SELECT
    id,
    COALESCE(raw_user_meta_data->>'kennel_name', 'Il Mio Allevamento'),
    180,
    63,
    email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.settings)
ON CONFLICT (user_id) DO NOTHING;

-- 11. Verifica che tutto sia configurato correttamente
SELECT
    'Settings table exists' as check_name,
    EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') as passed
UNION ALL
SELECT
    'RLS enabled on settings',
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'settings') as passed
UNION ALL
SELECT
    'Trigger exists',
    EXISTS (SELECT FROM pg_trigger WHERE tgname = 'on_auth_user_created') as passed
UNION ALL
SELECT
    'Function exists',
    EXISTS (SELECT FROM pg_proc WHERE proname = 'initialize_user_settings') as passed;

-- ============================================
-- ISTRUZIONI:
-- ============================================
-- 1. Vai su https://app.supabase.com
-- 2. Seleziona il tuo progetto
-- 3. Vai su "SQL Editor"
-- 4. Crea una nuova query
-- 5. Incolla questo intero script
-- 6. Esegui (Run)
-- 7. Verifica che tutti i check mostrino "passed = true"
-- 8. Prova a registrare un nuovo utente nell'applicazione
-- ============================================

