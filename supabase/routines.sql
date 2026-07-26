-- ============================================================
-- ROUTINE, TASK GIORNALIERE E DIPENDENTI
-- ============================================================
-- Gestione operativa dell'allevamento:
--   staff         -> i dipendenti/collaboratori
--   routines      -> attività ricorrenti (es. "ogni mercoledì pulizia
--                    box", "alle 13:00 cibo ai cani", "alle 19:00 cibo")
--   routine_logs  -> stato per giorno di ogni routine (fatto/da fare +
--                    eventuale assegnatario del giorno)
--
-- Le task giornaliere NON vengono materializzate: si generano al volo
-- espandendo le routine attive che ricadono in un dato giorno e
-- incrociandole con routine_logs (vedi db.getRoutineTasksForDate).
--
-- Eseguire nella SQL Editor di Supabase
-- (Dashboard → SQL Editor → New query → incolla → Run).
-- ============================================================

-- ── DIPENDENTI ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  role        text,             -- es. "Addetto pulizie", "Toelettatore"
  color       text,             -- colore avatar (#rrggbb)
  phone       text,
  email       text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_user_idx ON staff (user_id);

-- ── ROUTINE (template ricorrenti) ──────────────────────────
CREATE TABLE IF NOT EXISTS routines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  -- pulizia | alimentazione | cura | uscita | salute | altro
  category      text NOT NULL DEFAULT 'altro',
  -- Giorni della settimana (convenzione JS: 0=Domenica .. 6=Sabato).
  -- Array vuoto = tutti i giorni.
  days_of_week  smallint[] NOT NULL DEFAULT '{}',
  time_of_day   time,           -- NULL = orario libero
  staff_id      uuid REFERENCES staff(id) ON DELETE SET NULL,  -- assegnatario predefinito
  dog_ids       uuid[] NOT NULL DEFAULT '{}',  -- cani coinvolti (facoltativo)
  notes         text,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Aggiunge dog_ids anche a installazioni già create in precedenza
ALTER TABLE routines ADD COLUMN IF NOT EXISTS dog_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS routines_user_idx   ON routines (user_id);
CREATE INDEX IF NOT EXISTS routines_active_idx ON routines (user_id) WHERE active;

-- ── LOG GIORNALIERI (stato per giorno) ─────────────────────
CREATE TABLE IF NOT EXISTS routine_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id  uuid NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  log_date    date NOT NULL,
  done        boolean NOT NULL DEFAULT false,
  done_at     timestamptz,
  staff_id    uuid REFERENCES staff(id) ON DELETE SET NULL,  -- override assegnatario del giorno
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routine_id, log_date)
);

CREATE INDEX IF NOT EXISTS routine_logs_user_idx ON routine_logs (user_id);
CREATE INDEX IF NOT EXISTS routine_logs_date_idx ON routine_logs (log_date);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_logs ENABLE ROW LEVEL SECURITY;

-- staff
DROP POLICY IF EXISTS "staff: select own" ON staff;
CREATE POLICY "staff: select own" ON staff
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "staff: insert own" ON staff;
CREATE POLICY "staff: insert own" ON staff
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "staff: update own" ON staff;
CREATE POLICY "staff: update own" ON staff
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "staff: delete own" ON staff;
CREATE POLICY "staff: delete own" ON staff
  FOR DELETE USING (auth.uid() = user_id);

-- routines
DROP POLICY IF EXISTS "routines: select own" ON routines;
CREATE POLICY "routines: select own" ON routines
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "routines: insert own" ON routines;
CREATE POLICY "routines: insert own" ON routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "routines: update own" ON routines;
CREATE POLICY "routines: update own" ON routines
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "routines: delete own" ON routines;
CREATE POLICY "routines: delete own" ON routines
  FOR DELETE USING (auth.uid() = user_id);

-- routine_logs (upsert richiede sia INSERT che UPDATE)
DROP POLICY IF EXISTS "routine_logs: select own" ON routine_logs;
CREATE POLICY "routine_logs: select own" ON routine_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_logs: insert own" ON routine_logs;
CREATE POLICY "routine_logs: insert own" ON routine_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_logs: update own" ON routine_logs;
CREATE POLICY "routine_logs: update own" ON routine_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_logs: delete own" ON routine_logs;
CREATE POLICY "routine_logs: delete own" ON routine_logs
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- NOTA: quando si aggiornerà delete_user_account() (rls_policies.sql)
-- ricordarsi di ripulire anche queste tabelle prima di dogs/auth, es.:
--   DELETE FROM routine_logs WHERE user_id = calling_user_id;
--   DELETE FROM routines     WHERE user_id = calling_user_id;
--   DELETE FROM staff        WHERE user_id = calling_user_id;
-- (il CASCADE sulle foreign key le copre comunque all'eliminazione utente)
-- ============================================================
