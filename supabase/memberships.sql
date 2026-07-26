-- ============================================================
-- ACCESSI DIPENDENTI (multi-utente per allevamento)
-- ============================================================
-- Trasforma l'account del titolare in un "allevamento" a cui possono
-- accedere dei dipendenti con permessi limitati.
--
-- Modello:
--   - Il TITOLARE è il proprietario dei dati (user_id su ogni tabella).
--   - Un DIPENDENTE è un utente auth separato, collegato a una riga della
--     tabella `staff` del titolare (staff.member_user_id), con un set di
--     permessi per sezione (staff.permissions jsonb).
--
-- La sicurezza vera è QUI (RLS): il blocco lato frontend è solo cosmetico.
-- Le policy dei membri sono AGGIUNTE a quelle esistenti del titolare
-- (le policy permissive si combinano in OR), quindi non tocchiamo le
-- policy già presenti sulle tabelle.
--
-- PREREQUISITO: eseguire prima routines.sql (crea la tabella `staff`).
-- Eseguire nella SQL Editor di Supabase.
-- ============================================================

-- ── 1. Estende `staff` con i campi d'accesso ───────────────
ALTER TABLE staff ADD COLUMN IF NOT EXISTS member_email   text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS member_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS access_level   text NOT NULL DEFAULT 'nessuno';   -- nessuno | dipendente | responsabile
ALTER TABLE staff ADD COLUMN IF NOT EXISTS permissions    jsonb NOT NULL DEFAULT '{}'::jsonb; -- { "routines": true, ... }
ALTER TABLE staff ADD COLUMN IF NOT EXISTS access_status  text NOT NULL DEFAULT 'nessuno';   -- nessuno | invitato | attivo | sospeso

CREATE INDEX IF NOT EXISTS staff_member_user_idx ON staff (member_user_id);
CREATE INDEX IF NOT EXISTS staff_member_email_idx ON staff (lower(member_email));


-- ── 2. Funzioni helper (SECURITY DEFINER = bypassano la RLS di staff,
--       necessario per evitare ricorsione nelle policy) ─────
-- Owner "effettivo" dell'utente corrente: se è un dipendente collegato,
-- restituisce l'id del titolare; altrimenti se stesso.
CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT user_id FROM public.staff
      WHERE member_user_id = auth.uid() AND access_status = 'attivo'
      LIMIT 1),
    auth.uid()
  );
$$;

-- L'utente corrente è un dipendente (membro) di qualcuno?
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE member_user_id = auth.uid() AND access_status = 'attivo'
  );
$$;

-- Ha il permesso per una sezione? I titolari hanno sempre true.
CREATE OR REPLACE FUNCTION public.has_permission(perm_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT public.is_member() THEN true
    ELSE COALESCE(
      (SELECT (permissions ->> perm_key)::boolean FROM public.staff
        WHERE member_user_id = auth.uid() AND access_status = 'attivo'
        LIMIT 1),
      false
    )
  END;
$$;


-- ── 3. Collegamento automatico su registrazione ────────────
-- Quando un utente si registra con un'email invitata, la sua riga staff
-- viene collegata e attivata.
CREATE OR REPLACE FUNCTION public.link_invited_staff()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.staff
     SET member_user_id = NEW.id, access_status = 'attivo'
   WHERE lower(member_email) = lower(NEW.email)
     AND access_status = 'invitato'
     AND member_user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_staff ON auth.users;
CREATE TRIGGER on_auth_user_created_link_staff
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_invited_staff();

-- Collegamento manuale (caso: l'utente aveva già un account prima
-- dell'invito). Chiamabile dal client via rpc('accept_invite').
CREATE OR REPLACE FUNCTION public.accept_invite()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.staff
     SET member_user_id = auth.uid(), access_status = 'attivo'
   WHERE lower(member_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
     AND access_status = 'invitato'
     AND member_user_id IS NULL;
END;
$$;


-- ── 4. Policy di lettura per i dipendenti ──────────────────
-- Ogni policy dà accesso ai dati del PROPRIO titolare, solo se il membro
-- ha il permesso della sezione. Per i titolari current_owner_id()=auth.uid()
-- e has_permission()=true, quindi restano identiche a prima (nessun impatto).
-- Le tabelle senza una policy membro restano riservate al titolare (deny).

-- Cani e crescita → 'dogs'
DROP POLICY IF EXISTS "dogs: member read" ON dogs;
CREATE POLICY "dogs: member read" ON dogs FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('dogs'));
DROP POLICY IF EXISTS "dog_measurements: member read" ON dog_measurements;
CREATE POLICY "dog_measurements: member read" ON dog_measurements FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('dogs'));

-- Riproduzione → 'breeding'
DROP POLICY IF EXISTS "heat_cycles: member read" ON heat_cycles;
CREATE POLICY "heat_cycles: member read" ON heat_cycles FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('breeding'));
DROP POLICY IF EXISTS "matings: member read" ON matings;
CREATE POLICY "matings: member read" ON matings FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('breeding'));
DROP POLICY IF EXISTS "litters: member read" ON litters;
CREATE POLICY "litters: member read" ON litters FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('breeding'));

-- Cuccioli → 'puppies'
DROP POLICY IF EXISTS "puppies: member read" ON puppies;
CREATE POLICY "puppies: member read" ON puppies FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('puppies'));

-- Salute → 'health'
DROP POLICY IF EXISTS "health_records: member read" ON health_records;
CREATE POLICY "health_records: member read" ON health_records FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('health'));
DROP POLICY IF EXISTS "health_reminders: member read" ON health_reminders;
CREATE POLICY "health_reminders: member read" ON health_reminders FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('health'));

-- Finanze → 'finance'
DROP POLICY IF EXISTS "expenses: member read" ON expenses;
CREATE POLICY "expenses: member read" ON expenses FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('finance'));
DROP POLICY IF EXISTS "income: member read" ON income;
CREATE POLICY "income: member read" ON income FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('finance'));

-- Calendario → 'calendar' (sola lettura per i membri)
DROP POLICY IF EXISTS "events: member read" ON events;
CREATE POLICY "events: member read" ON events FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('calendar'));

-- Giudici → 'judges'
DROP POLICY IF EXISTS "judges: member read" ON judges;
CREATE POLICY "judges: member read" ON judges FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('judges'));
DROP POLICY IF EXISTS "dog_judgments: member read" ON dog_judgments;
CREATE POLICY "dog_judgments: member read" ON dog_judgments FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('judges'));

-- Routine → 'routines' (lettura template + task)
DROP POLICY IF EXISTS "routines: member read" ON routines;
CREATE POLICY "routines: member read" ON routines FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('routines'));


-- ── 5. Routine_logs: i membri possono spuntare le task ─────
DROP POLICY IF EXISTS "routine_logs: member read" ON routine_logs;
CREATE POLICY "routine_logs: member read" ON routine_logs FOR SELECT
  USING (user_id = public.current_owner_id() AND public.has_permission('routines'));
DROP POLICY IF EXISTS "routine_logs: member insert" ON routine_logs;
CREATE POLICY "routine_logs: member insert" ON routine_logs FOR INSERT
  WITH CHECK (user_id = public.current_owner_id() AND public.has_permission('routines'));
DROP POLICY IF EXISTS "routine_logs: member update" ON routine_logs;
CREATE POLICY "routine_logs: member update" ON routine_logs FOR UPDATE
  USING (user_id = public.current_owner_id() AND public.has_permission('routines'))
  WITH CHECK (user_id = public.current_owner_id() AND public.has_permission('routines'));


-- ── 6. Staff: il membro vede la propria riga e i colleghi ──
DROP POLICY IF EXISTS "staff: member read" ON staff;
CREATE POLICY "staff: member read" ON staff FOR SELECT
  USING (
    member_user_id = auth.uid()
    OR (user_id = public.current_owner_id() AND public.has_permission('routines'))
  );


-- ============================================================
-- NOTA: nella funzione delete_user_account() la CASCADE già gestisce
-- staff/routine_logs; member_user_id ha ON DELETE SET NULL, quindi se un
-- dipendente elimina il proprio account resta lo storico ma slegato.
-- ============================================================
