-- ============================================
-- OTTIMIZZAZIONE PERFORMANCE TIMEZONE
-- ============================================
-- Questa query risolve il problema della query costosa pg_timezone_names
-- che viene eseguita da Supabase/PostgREST

-- SOLUZIONE 1: Imposta timezone del database
ALTER DATABASE postgres SET timezone TO 'Europe/Rome';

-- SOLUZIONE 2: Imposta timezone per il ruolo di Supabase
ALTER ROLE authenticator SET timezone TO 'Europe/Rome';
ALTER ROLE anon SET timezone TO 'Europe/Rome';
ALTER ROLE authenticated SET timezone TO 'Europe/Rome';

-- SOLUZIONE 3: Crea indici ottimizzati per le date
-- (se non esistono già)
-- Indice semplice su event_date per ordinamenti e filtri
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- Indice composto per query comuni (event_date + completed)
CREATE INDEX IF NOT EXISTS idx_events_date_completed ON events(event_date, completed);

-- Indice composto per query con user_id (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, event_date);

-- SOLUZIONE 4: Disabilita pg_stat_statements se abilitato (opzionale)
-- Questa estensione può causare overhead
-- DROP EXTENSION IF EXISTS pg_stat_statements;

-- SOLUZIONE 5: Ottimizza le impostazioni del database
-- Aumenta shared_buffers per migliorare cache
-- (da eseguire solo se hai accesso alle impostazioni server)
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';

-- VERIFICA: Controlla la timezone corrente
SHOW timezone;

-- ============================================
-- NOTE IMPORTANTI
-- ============================================
-- 1. La query pg_timezone_names viene eseguita da PostgREST per ogni richiesta
--    che coinvolge operazioni con date/timestamp
--
-- 2. Impostando un timezone fisso, PostgREST non ha bisogno di interrogare
--    pg_timezone_names ogni volta
--
-- 3. Gli indici ottimizzati riducono drasticamente il tempo di query
--    sulle date
--
-- 4. Se il problema persiste, controlla:
--    - Le query nel codice JavaScript (usa sempre DATE non TIMESTAMP)
--    - Usa .toISOString().split('T')[0] per convertire date in formato YYYY-MM-DD
--    - Evita comparazioni con TIMESTAMP se non necessario

-- ============================================
-- MONITORAGGIO (OPZIONALE - Solo se pg_stat_statements è abilitato)
-- ============================================
-- NOTA: Se pg_stat_statements non è abilitato, queste query daranno errore.
-- Per abilitarlo: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Per verificare quali query sono più costose:
-- (usa total_exec_time per PostgreSQL 13+, total_time per versioni precedenti)
SELECT
  query,
  calls,
  total_exec_time as total_time,
  mean_exec_time as mean_time,
  max_exec_time as max_time
FROM pg_stat_statements
WHERE query LIKE '%pg_timezone%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- Per vedere le query più lente:
SELECT
  query,
  calls,
  total_exec_time as total_time,
  mean_exec_time as mean_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;


