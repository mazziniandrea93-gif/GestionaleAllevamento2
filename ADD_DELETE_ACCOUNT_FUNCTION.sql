-- ============================================
-- FUNZIONE PER ELIMINAZIONE ACCOUNT UTENTE
-- Questa funzione elimina in modo sicuro tutti i dati dell'utente
-- ============================================

-- Crea la funzione per eliminare l'account utente
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Ottieni l'ID dell'utente corrente
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Utente non autenticato';
    END IF;

    -- Elimina tutti i dati dell'utente
    -- Grazie a ON DELETE CASCADE, questa query eliminerà automaticamente:
    -- - dogs
    -- - heat_cycles
    -- - matings
    -- - litters
    -- - puppies
    -- - expenses
    -- - income
    -- - health_records
    -- - events
    -- - settings
    -- - dog_measurements

    DELETE FROM dogs WHERE user_id = current_user_id;
    DELETE FROM heat_cycles WHERE user_id = current_user_id;
    DELETE FROM matings WHERE user_id = current_user_id;
    DELETE FROM litters WHERE user_id = current_user_id;
    DELETE FROM puppies WHERE user_id = current_user_id;
    DELETE FROM expenses WHERE user_id = current_user_id;
    DELETE FROM income WHERE user_id = current_user_id;
    DELETE FROM health_records WHERE user_id = current_user_id;
    DELETE FROM events WHERE user_id = current_user_id;
    DELETE FROM settings WHERE user_id = current_user_id;

    -- Elimina anche le misurazioni se la tabella esiste
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dog_measurements') THEN
        DELETE FROM dog_measurements WHERE user_id = current_user_id;
    END IF;

    -- Nota: l'utente da auth.users non viene eliminato qui
    -- Supabase gestisce l'eliminazione dell'utente da auth.users separatamente
    -- Per eliminare completamente l'account, l'utente deve farlo dal pannello Supabase
    -- oppure bisogna usare la Admin API

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Concedi i permessi agli utenti autenticati
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Commento: Questa funzione può essere chiamata dall'applicazione con:
-- await supabase.rpc('delete_user_account')

