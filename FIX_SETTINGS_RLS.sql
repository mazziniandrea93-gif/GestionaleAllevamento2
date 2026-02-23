-- ============================================
-- FIX RLS POLICY PER SETTINGS
-- Questo script assicura che le policy RLS per la tabella settings siano correttamente configurate
-- ============================================

-- Abilita RLS sulla tabella settings (se non già abilitato)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Rimuovi policy esistenti (se presenti) per evitare conflitti
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON settings;
DROP POLICY IF EXISTS "Users can update own settings" ON settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON settings;

-- Ricrea le policy RLS
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

-- Verifica che il trigger per inizializzazione settings esista
CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO settings (user_id, kennel_name, default_heat_cycle_days, default_pregnancy_days)
    VALUES (NEW.id, 'Il Mio Allevamento', 180, 63)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ricrea il trigger (se già esiste, verrà sostituito)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_settings();

-- Verifica che tutti gli utenti esistenti abbiano una riga in settings
INSERT INTO settings (user_id, kennel_name, default_heat_cycle_days, default_pregnancy_days)
SELECT id, 'Il Mio Allevamento', 180, 63
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE settings.user_id = auth.users.id);

