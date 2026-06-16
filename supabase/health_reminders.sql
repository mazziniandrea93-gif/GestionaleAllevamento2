-- ============================================================
-- HEALTH_REMINDERS - Promemoria sanitari ricorrenti
-- ============================================================
-- Scadenze sanitarie ricorrenti (vaccini, antiparassitari,
-- sverminazioni, richiami) che generano automaticamente eventi
-- e notifiche push, riusando la edge function send-reminders.
--
-- Eseguire questo script nella SQL Editor di Supabase
-- (Dashboard → SQL Editor → New query → incolla → Run)
-- ============================================================

CREATE TABLE IF NOT EXISTS health_reminders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id           uuid NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,

  -- vaccinazione | antiparassitario | sverminazione | altro
  reminder_type    text NOT NULL DEFAULT 'altro',
  description      text,

  -- Ricorrenza: ogni <interval_value> <interval_unit>
  -- interval_unit: giorni | mesi | anni
  interval_unit    text NOT NULL DEFAULT 'mesi',
  interval_value   integer NOT NULL DEFAULT 1 CHECK (interval_value > 0),

  -- Prossima scadenza e quanti giorni prima notificare
  next_due_date    date NOT NULL,
  reminder_days    integer NOT NULL DEFAULT 7 CHECK (reminder_days >= 0),

  last_done_date   date,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_reminders_user_idx ON health_reminders (user_id);
CREATE INDEX IF NOT EXISTS health_reminders_dog_idx  ON health_reminders (dog_id);
CREATE INDEX IF NOT EXISTS health_reminders_due_idx  ON health_reminders (next_due_date) WHERE active;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE health_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_reminders: select own" ON health_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "health_reminders: insert own" ON health_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "health_reminders: update own" ON health_reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "health_reminders: delete own" ON health_reminders
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- NOTA: ricordarsi di aggiungere health_reminders alla funzione
-- delete_user_account() in rls_policies.sql, es.:
--   DELETE FROM health_reminders WHERE user_id = calling_user_id;
-- (prima della DELETE su dogs, per via della foreign key)
-- ============================================================
