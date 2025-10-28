-- Funding settings and language_adoptions overrides
-- 1) funding_settings table (singleton-style K/V with typed columns)
CREATE TABLE IF NOT EXISTS public.funding_settings (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  deposit_percent NUMERIC NOT NULL DEFAULT 0.20 CHECK (
    deposit_percent >= 0
    AND deposit_percent <= 1
  ),
  recurring_months INTEGER NOT NULL DEFAULT 12 CHECK (recurring_months > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL
);


-- Ensure only one active row (optional, keep flexible for future versions)
CREATE UNIQUE INDEX if NOT EXISTS funding_settings_singleton_idx ON public.funding_settings ((TRUE));


ALTER TABLE public.funding_settings enable ROW level security;


-- Admin-only read/write
DROP POLICY if EXISTS funding_settings_admin_read ON public.funding_settings;


CREATE POLICY funding_settings_admin_read ON public.funding_settings FOR
SELECT
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS funding_settings_admin_write ON public.funding_settings;


CREATE POLICY funding_settings_admin_write ON public.funding_settings FOR ALL TO authenticated USING (
  public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
)
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- 2) language_adoptions overrides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'language_adoptions'
      AND column_name = 'deposit_percent'
  ) THEN
    ALTER TABLE public.language_adoptions
      ADD COLUMN deposit_percent NUMERIC NULL CHECK (deposit_percent >= 0 AND deposit_percent <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'language_adoptions'
      AND column_name = 'recurring_months'
  ) THEN
    ALTER TABLE public.language_adoptions
      ADD COLUMN recurring_months INTEGER NULL CHECK (recurring_months > 0);
  END IF;
END $$;
