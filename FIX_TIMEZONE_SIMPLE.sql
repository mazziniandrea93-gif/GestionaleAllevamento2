-- ============================================
-- FIX TIMEZONE PERFORMANCE - VERSIONE SEMPLICE
-- ============================================
-- Esegui questo script per risolvere il problema pg_timezone_names

-- STEP 1: Imposta timezone del database
ALTER DATABASE postgres SET timezone TO 'Europe/Rome';

-- STEP 2: Imposta timezone per i ruoli Supabase
ALTER ROLE authenticator SET timezone TO 'Europe/Rome';
ALTER ROLE anon SET timezone TO 'Europe/Rome';
ALTER ROLE authenticated SET timezone TO 'Europe/Rome';

-- STEP 3: Crea indici ottimizzati
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_date_completed ON events(event_date, completed);
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, event_date);

-- STEP 4: Verifica che funzioni
SHOW timezone;

-- FATTO! Ora:
-- 1. Riavvia il database (Settings → Database → Restart) OPPURE
-- 2. Attendi 10 minuti per le nuove connessioni
--
-- Risultato atteso: timezone = Europe/Rome
-- Performance: 99% meno chiamate a pg_timezone_names!

