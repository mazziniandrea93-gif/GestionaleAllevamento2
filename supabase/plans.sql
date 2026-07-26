-- ============================================================
-- PIANI E ABBONAMENTI
-- ============================================================
-- Infrastruttura per i piani (free/pro/premium). Oggi tutti gli
-- utenti sono su "free" e l'app sblocca comunque tutto (LAUNCH_MODE
-- in src/lib/plans.js); quando si attiveranno i pagamenti, il webhook
-- Stripe (service role) aggiornerà plan/status su questa tabella.
--
-- Eseguire nella SQL Editor di Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'premium')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  -- Campi Stripe: restano NULL finché non si attivano i pagamenti
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- L'utente può solo LEGGERE il proprio abbonamento.
-- Insert/update/delete restano riservati al service role
-- (trigger di signup ora, webhook Stripe in futuro).
DROP POLICY IF EXISTS "Utenti leggono il proprio abbonamento" ON public.user_subscriptions;
CREATE POLICY "Utenti leggono il proprio abbonamento"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Ogni nuovo utente parte automaticamente con il piano free
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Backfill: crea la riga free per gli utenti già registrati
INSERT INTO public.user_subscriptions (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Piano effettivo dell'utente corrente, utilizzabile nelle policy RLS
-- per applicare i limiti anche lato database quando i piani saranno
-- a pagamento, es.:
--   CREATE POLICY ... WITH CHECK (public.current_plan() <> 'free' OR ...)
-- Un abbonamento scaduto/cancellato ricade su 'free'.
CREATE OR REPLACE FUNCTION public.current_plan()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.user_subscriptions
     WHERE user_id = auth.uid()
       AND status IN ('active', 'trialing')
       AND (current_period_end IS NULL OR current_period_end > now())),
    'free'
  );
$$;
