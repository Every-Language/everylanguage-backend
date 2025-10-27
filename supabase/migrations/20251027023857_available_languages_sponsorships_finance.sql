-- Available Languages, Sponsorships, and Finance Models
-- Implements language_adoptions, sponsorships, allocations, project budgets & actuals,
-- multi-currency contributions, Stripe event audit, FX rates, and optional partner wallets.
-- Also adds RLS policies consistent with has_permission-based RBAC.
-- Ensure UUID generator
CREATE EXTENSION if NOT EXISTS pgcrypto;


-- 1) Enums (idempotent)
DO $$
begin
  if not exists (select 1 from pg_type where typname = 'adoption_status') then
    create type adoption_status as enum ('draft', 'available', 'on_hold', 'funded', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'sponsorship_status') then
    create type sponsorship_status as enum ('interest', 'pledged', 'active', 'paused', 'cancelled', 'completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'funding_status') then
    create type funding_status as enum ('unfunded', 'partially_funded', 'fully_funded');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type project_status as enum ('precreated', 'active', 'completed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'budget_item_category') then
    create type budget_item_category as enum ('meals', 'housing', 'transport', 'equipment');
  end if;
  if not exists (select 1 from pg_type where typname = 'contribution_kind') then
    create type contribution_kind as enum ('one_time', 'subscription', 'bank_transfer', 'adjustment', 'refund');
  end if;
  if not exists (select 1 from pg_type where typname = 'wallet_tx_type') then
    create type wallet_tx_type as enum ('deposit', 'withdrawal', 'adjustment');
  end if;
end $$;


-- 2) language_adoptions (public listing of languages available for sponsorship)
CREATE TABLE IF NOT EXISTS public.language_adoptions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID NOT NULL REFERENCES public.language_entities (id) ON DELETE CASCADE,
  status adoption_status NOT NULL DEFAULT 'draft',
  estimated_budget_cents INTEGER NOT NULL CHECK (estimated_budget_cents >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  translators_ready BOOLEAN NOT NULL DEFAULT FALSE,
  available_since TIMESTAMPTZ NULL,
  notes TEXT NULL,
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL
);


-- Unique active adoption per language (for draft/available states)
CREATE UNIQUE INDEX if NOT EXISTS language_adoptions_lang_active_uniq ON public.language_adoptions (language_entity_id)
WHERE
  status IN ('draft', 'available')
  AND deleted_at IS NULL;


ALTER TABLE public.language_adoptions enable ROW level security;


-- Public read access (anon + authenticated)
DROP POLICY if EXISTS language_adoptions_public_read ON public.language_adoptions;


CREATE POLICY language_adoptions_public_read ON public.language_adoptions FOR
SELECT
  TO anon USING (TRUE);


DROP POLICY if EXISTS language_adoptions_auth_read ON public.language_adoptions;


CREATE POLICY language_adoptions_auth_read ON public.language_adoptions FOR
SELECT
  TO authenticated USING (TRUE);


-- Admin-only writes
DROP POLICY if EXISTS language_adoptions_admin_insert ON public.language_adoptions;


CREATE POLICY language_adoptions_admin_insert ON public.language_adoptions FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS language_adoptions_admin_update ON public.language_adoptions;


CREATE POLICY language_adoptions_admin_update ON public.language_adoptions
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS language_adoptions_admin_delete ON public.language_adoptions;


CREATE POLICY language_adoptions_admin_delete ON public.language_adoptions FOR delete TO authenticated USING (
  public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
);


-- 3) sponsorships (commitments from partner orgs, pre- or post-project)
CREATE TABLE IF NOT EXISTS public.sponsorships (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  partner_org_id UUID NOT NULL REFERENCES public.partner_orgs (id) ON DELETE CASCADE,
  language_adoption_id UUID NULL REFERENCES public.language_adoptions (id) ON DELETE SET NULL,
  project_id UUID NULL REFERENCES public.projects (id) ON DELETE SET NULL,
  status sponsorship_status NOT NULL DEFAULT 'interest',
  pledge_one_time_cents INTEGER NOT NULL DEFAULT 0 CHECK (pledge_one_time_cents >= 0),
  pledge_recurring_cents INTEGER NOT NULL DEFAULT 0 CHECK (pledge_recurring_cents >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  stripe_customer_id TEXT NULL,
  stripe_payment_intent_id TEXT NULL,
  stripe_subscription_id TEXT NULL,
  stripe_price_id TEXT NULL,
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL
);


-- Exactly one of language_adoption_id or project_id must be set at creation (enforced by app; leave DB flexible for allocations/links)
-- Optionally enforce strict at DB-level; comment left to allow future flexibility.
ALTER TABLE public.sponsorships enable ROW level security;


-- moved below after sponsorship_allocations is created
-- Partner leaders/admins can write; system_admin always allowed
DROP POLICY if EXISTS sponsorships_partner_write ON public.sponsorships;


CREATE POLICY sponsorships_partner_write ON public.sponsorships FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'contribution.write',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS sponsorships_partner_update ON public.sponsorships;


CREATE POLICY sponsorships_partner_update ON public.sponsorships
FOR UPDATE
  TO authenticated USING (
    public.has_permission (
      auth.uid (),
      'contribution.write',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'contribution.write',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS sponsorships_admin_delete ON public.sponsorships;


CREATE POLICY sponsorships_admin_delete ON public.sponsorships FOR delete TO authenticated USING (
  public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
);


-- 4) sponsorship_allocations (map sponsorship → project(s) with percentages over time)
CREATE TABLE IF NOT EXISTS public.sponsorship_allocations (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  sponsorship_id UUID NOT NULL REFERENCES public.sponsorships (id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  allocation_percent NUMERIC NOT NULL CHECK (
    allocation_percent >= 0
    AND allocation_percent <= 1
  ),
  effective_from date NOT NULL,
  effective_to date NULL,
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Helper: ensure sums of active allocations <= 1 for a given sponsorship and date
CREATE OR REPLACE FUNCTION public.validate_allocation_sum () returns trigger AS $$
declare
  v_sum numeric;
  v_from date;
begin
  v_from := COALESCE(NEW.effective_from, CURRENT_DATE);
  SELECT COALESCE(SUM(allocation_percent), 0)
  INTO v_sum
  FROM public.sponsorship_allocations sa
  WHERE sa.sponsorship_id = NEW.sponsorship_id
    AND (sa.effective_to IS NULL OR sa.effective_to >= v_from)
    AND sa.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

  IF v_sum + NEW.allocation_percent > 1.0000001 THEN
    RAISE EXCEPTION 'Allocation percent sum exceeds 1 for sponsorship %', NEW.sponsorship_id;
  END IF;
  RETURN NEW;
end;
$$ language plpgsql;


DROP TRIGGER if EXISTS sponsorship_allocations_sum_check_insupd ON public.sponsorship_allocations;


CREATE TRIGGER sponsorship_allocations_sum_check_insupd before insert
OR
UPDATE ON public.sponsorship_allocations FOR each ROW
EXECUTE function public.validate_allocation_sum ();


ALTER TABLE public.sponsorship_allocations enable ROW level security;


DROP POLICY if EXISTS sponsorship_allocations_read ON public.sponsorship_allocations;


CREATE POLICY sponsorship_allocations_read ON public.sponsorship_allocations FOR
SELECT
  TO authenticated USING (
    -- Partner org membership on the parent sponsorship
    EXISTS (
      SELECT
        1
      FROM
        public.sponsorships s
        JOIN public.user_roles ur ON ur.user_id = auth.uid ()
        JOIN public.roles r ON r.id = ur.role_id
        AND r.resource_type = 'partner'
      WHERE
        s.id = sponsorship_id
        AND ur.context_type = 'partner'
        AND ur.context_id = s.partner_org_id
    )
    OR public.has_permission (
      auth.uid (),
      'contribution.read',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS sponsorship_allocations_admin_write ON public.sponsorship_allocations;


CREATE POLICY sponsorship_allocations_admin_write ON public.sponsorship_allocations FOR ALL TO authenticated USING (
  public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
)
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- Now that sponsorship_allocations exists, add sponsorships read policy
DROP POLICY if EXISTS sponsorships_partner_or_project_read ON public.sponsorships;


CREATE POLICY sponsorships_partner_or_project_read ON public.sponsorships FOR
SELECT
  TO authenticated USING (
    -- Partner org membership via user_roles
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        AND r.resource_type = 'partner'
      WHERE
        ur.user_id = auth.uid ()
        AND ur.context_type = 'partner'
        AND ur.context_id = partner_org_id
    )
    OR (
      project_id IS NOT NULL
      AND public.has_permission (
        auth.uid (),
        'contribution.read',
        'project',
        project_id
      )
    )
    OR (
      EXISTS (
        SELECT
          1
        FROM
          public.sponsorship_allocations sa
        WHERE
          sa.sponsorship_id = public.sponsorships.id
          AND public.has_permission (
            auth.uid (),
            'contribution.read',
            'project',
            sa.project_id
          )
      )
    )
  );


-- 5) Augment projects with funding + lifecycle status
DO $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'funding_status'
  ) then
    alter table public.projects add column funding_status funding_status not null default 'unfunded';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'project_status'
  ) then
    alter table public.projects add column project_status project_status not null default 'precreated';
  end if;
end $$;


-- 6) project_budgets and project_budget_items
CREATE TABLE IF NOT EXISTS public.project_budgets (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  estimated_total_cents INTEGER NOT NULL CHECK (estimated_total_cents >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  start_date date NULL,
  end_date date NULL,
  notes TEXT NULL,
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, version)
);


CREATE TABLE IF NOT EXISTS public.project_budget_items (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  project_budget_id UUID NOT NULL REFERENCES public.project_budgets (id) ON DELETE CASCADE,
  category budget_item_category NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  description TEXT NULL,
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


ALTER TABLE public.project_budgets enable ROW level security;


ALTER TABLE public.project_budget_items enable ROW level security;


-- Read by project members and linked partner org users
DROP POLICY if EXISTS project_budgets_read ON public.project_budgets;


CREATE POLICY project_budgets_read ON public.project_budgets FOR
SELECT
  TO authenticated USING (
    public.has_permission (auth.uid (), 'budget.read', 'project', project_id)
    OR EXISTS (
      SELECT
        1
      FROM
        public.partner_orgs_projects pop
      WHERE
        pop.project_id = public.project_budgets.project_id
        AND public.has_permission (
          auth.uid (),
          'partner.read',
          'partner',
          pop.partner_org_id
        )
    )
  );


-- Write budgets: project_admin (budget.write) and system_admin
DROP POLICY if EXISTS project_budgets_write ON public.project_budgets;


CREATE POLICY project_budgets_write ON public.project_budgets FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'budget.write',
      'project',
      project_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS project_budgets_update ON public.project_budgets;


CREATE POLICY project_budgets_update ON public.project_budgets
FOR UPDATE
  TO authenticated USING (
    public.has_permission (
      auth.uid (),
      'budget.write',
      'project',
      project_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'budget.write',
      'project',
      project_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS project_budgets_delete ON public.project_budgets;


CREATE POLICY project_budgets_delete ON public.project_budgets FOR delete TO authenticated USING (
  public.has_permission (
    auth.uid (),
    'budget.write',
    'project',
    project_id
  )
  OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
);


-- Items: read similar to budgets
DROP POLICY if EXISTS project_budget_items_read ON public.project_budget_items;


CREATE POLICY project_budget_items_read ON public.project_budget_items FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.project_budgets pb
      WHERE
        pb.id = public.project_budget_items.project_budget_id
        AND (
          public.has_permission (
            auth.uid (),
            'budget.read',
            'project',
            pb.project_id
          )
          OR EXISTS (
            SELECT
              1
            FROM
              public.partner_orgs_projects pop
            WHERE
              pop.project_id = pb.project_id
              AND public.has_permission (
                auth.uid (),
                'partner.read',
                'partner',
                pop.partner_org_id
              )
          )
        )
    )
  );


-- Items: insert/update own rows by any project member; admins can manage all
DROP POLICY if EXISTS project_budget_items_insert ON public.project_budget_items;


CREATE POLICY project_budget_items_insert ON public.project_budget_items FOR insert TO authenticated
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.project_budgets pb
      WHERE
        pb.id = project_budget_id
        AND (
          (
            public.has_permission (
              auth.uid (),
              'project.read',
              'project',
              pb.project_id
            )
            AND created_by = auth.uid ()
          )
          OR public.has_permission (
            auth.uid (),
            'budget.write',
            'project',
            pb.project_id
          )
          OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
        )
    )
  );


DROP POLICY if EXISTS project_budget_items_update ON public.project_budget_items;


CREATE POLICY project_budget_items_update ON public.project_budget_items
FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.project_budgets pb
      WHERE
        pb.id = project_budget_id
        AND (
          created_by = auth.uid ()
          OR public.has_permission (
            auth.uid (),
            'budget.write',
            'project',
            pb.project_id
          )
          OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.project_budgets pb
      WHERE
        pb.id = project_budget_id
        AND (
          created_by = auth.uid ()
          OR public.has_permission (
            auth.uid (),
            'budget.write',
            'project',
            pb.project_id
          )
          OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
        )
    )
  );


DROP POLICY if EXISTS project_budget_items_delete ON public.project_budget_items;


CREATE POLICY project_budget_items_delete ON public.project_budget_items FOR delete TO authenticated USING (
  EXISTS (
    SELECT
      1
    FROM
      public.project_budgets pb
    WHERE
      pb.id = project_budget_id
      AND (
        created_by = auth.uid ()
        OR public.has_permission (
          auth.uid (),
          'budget.write',
          'project',
          pb.project_id
        )
        OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
      )
  )
);


-- 7) project_budget_actual_costs (actual spend)
CREATE TABLE IF NOT EXISTS public.project_budget_actual_costs (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category budget_item_category NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  reporting_usd_cents BIGINT NULL,
  fx_rate_used NUMERIC NULL,
  note TEXT NULL,
  receipt_url TEXT NULL,
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


ALTER TABLE public.project_budget_actual_costs enable ROW level security;


DROP POLICY if EXISTS project_actuals_read ON public.project_budget_actual_costs;


CREATE POLICY project_actuals_read ON public.project_budget_actual_costs FOR
SELECT
  TO authenticated USING (
    public.has_permission (auth.uid (), 'budget.read', 'project', project_id)
    OR EXISTS (
      SELECT
        1
      FROM
        public.partner_orgs_projects pop
      WHERE
        pop.project_id = public.project_budget_actual_costs.project_id
        AND public.has_permission (
          auth.uid (),
          'partner.read',
          'partner',
          pop.partner_org_id
        )
    )
  );


DROP POLICY if EXISTS project_actuals_insert ON public.project_budget_actual_costs;


CREATE POLICY project_actuals_insert ON public.project_budget_actual_costs FOR insert TO authenticated
WITH
  CHECK (
    (
      public.has_permission (
        auth.uid (),
        'project.read',
        'project',
        project_id
      )
      AND created_by = auth.uid ()
    )
    OR public.has_permission (
      auth.uid (),
      'budget.write',
      'project',
      project_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS project_actuals_update ON public.project_budget_actual_costs;


CREATE POLICY project_actuals_update ON public.project_budget_actual_costs
FOR UPDATE
  TO authenticated USING (
    created_by = auth.uid ()
    OR public.has_permission (
      auth.uid (),
      'budget.write',
      'project',
      project_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    created_by = auth.uid ()
    OR public.has_permission (
      auth.uid (),
      'budget.write',
      'project',
      project_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS project_actuals_delete ON public.project_budget_actual_costs;


CREATE POLICY project_actuals_delete ON public.project_budget_actual_costs FOR delete TO authenticated USING (
  created_by = auth.uid ()
  OR public.has_permission (
    auth.uid (),
    'budget.write',
    'project',
    project_id
  )
  OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
);


-- 8) contributions (incoming funds)
CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  sponsorship_id UUID NOT NULL REFERENCES public.sponsorships (id) ON DELETE CASCADE,
  project_id UUID NULL REFERENCES public.projects (id) ON DELETE SET NULL,
  language_adoption_id UUID NULL REFERENCES public.language_adoptions (id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind contribution_kind NOT NULL,
  fee_cents INTEGER NULL,
  fee_covered_by_donor BOOLEAN NULL,
  stripe_charge_id TEXT NULL,
  stripe_payment_intent_id TEXT NULL,
  stripe_invoice_id TEXT NULL,
  stripe_subscription_id TEXT NULL,
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


ALTER TABLE public.contributions enable ROW level security;


DROP POLICY if EXISTS contributions_read ON public.contributions;


CREATE POLICY contributions_read ON public.contributions FOR
SELECT
  TO authenticated USING (
    -- Partner org membership on the parent sponsorship
    EXISTS (
      SELECT
        1
      FROM
        public.sponsorships s
        JOIN public.user_roles ur ON ur.user_id = auth.uid ()
        JOIN public.roles r ON r.id = ur.role_id
        AND r.resource_type = 'partner'
      WHERE
        s.id = public.contributions.sponsorship_id
        AND ur.context_type = 'partner'
        AND ur.context_id = s.partner_org_id
    )
    OR (
      project_id IS NOT NULL
      AND public.has_permission (
        auth.uid (),
        'contribution.read',
        'project',
        project_id
      )
    )
  );


DROP POLICY if EXISTS contributions_write ON public.contributions;


CREATE POLICY contributions_write ON public.contributions FOR insert TO authenticated
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.sponsorships s
      WHERE
        s.id = public.contributions.sponsorship_id
        AND (
          public.has_permission (
            auth.uid (),
            'contribution.write',
            'partner',
            s.partner_org_id
          )
          OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
        )
    )
  );


DROP POLICY if EXISTS contributions_update ON public.contributions;


CREATE POLICY contributions_update ON public.contributions
FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.sponsorships s
      WHERE
        s.id = public.contributions.sponsorship_id
        AND (
          public.has_permission (
            auth.uid (),
            'contribution.write',
            'partner',
            s.partner_org_id
          )
          OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.sponsorships s
      WHERE
        s.id = public.contributions.sponsorship_id
        AND (
          public.has_permission (
            auth.uid (),
            'contribution.write',
            'partner',
            s.partner_org_id
          )
          OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
        )
    )
  );


DROP POLICY if EXISTS contributions_admin_delete ON public.contributions;


CREATE POLICY contributions_admin_delete ON public.contributions FOR delete TO authenticated USING (
  public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
);


-- 9) stripe_events (auditable webhook log)
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NULL,
  success BOOLEAN NULL,
  error_message TEXT NULL
);


ALTER TABLE public.stripe_events enable ROW level security;


-- Only admins can read; inserts will typically use service_role which bypasses RLS
DROP POLICY if EXISTS stripe_events_admin_read ON public.stripe_events;


CREATE POLICY stripe_events_admin_read ON public.stripe_events FOR
SELECT
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- 10) exchange_rates (interbank rates; base USD)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  as_of_date date NOT NULL,
  base_currency CHAR(3) NOT NULL DEFAULT 'USD',
  rates JSONB NOT NULL,
  provider TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (as_of_date, base_currency, provider)
);


ALTER TABLE public.exchange_rates enable ROW level security;


DROP POLICY if EXISTS exchange_rates_admin_read ON public.exchange_rates;


CREATE POLICY exchange_rates_admin_read ON public.exchange_rates FOR
SELECT
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS exchange_rates_admin_write ON public.exchange_rates;


CREATE POLICY exchange_rates_admin_write ON public.exchange_rates FOR ALL TO authenticated USING (
  public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
)
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- 11) Optional partner wallets (for off-Stripe bank transfers / prepayments)
CREATE TABLE IF NOT EXISTS public.partner_wallets (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  partner_org_id UUID NOT NULL UNIQUE REFERENCES public.partner_orgs (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS public.partner_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  wallet_id UUID NOT NULL REFERENCES public.partner_wallets (id) ON DELETE CASCADE,
  tx_type wallet_tx_type NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference TEXT NULL,
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


ALTER TABLE public.partner_wallets enable ROW level security;


ALTER TABLE public.partner_wallet_transactions enable ROW level security;


DROP POLICY if EXISTS partner_wallets_read ON public.partner_wallets;


CREATE POLICY partner_wallets_read ON public.partner_wallets FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        AND r.resource_type = 'partner'
      WHERE
        ur.user_id = auth.uid ()
        AND ur.context_type = 'partner'
        AND ur.context_id = public.partner_wallets.partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS partner_wallets_write ON public.partner_wallets;


CREATE POLICY partner_wallets_write ON public.partner_wallets FOR ALL TO authenticated USING (
  public.has_permission (
    auth.uid (),
    'partner.manage_roles',
    'partner',
    partner_org_id
  )
  OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
)
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS partner_wallet_tx_read ON public.partner_wallet_transactions;


CREATE POLICY partner_wallet_tx_read ON public.partner_wallet_transactions FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.partner_wallets w
        JOIN public.user_roles ur ON ur.user_id = auth.uid ()
        JOIN public.roles r ON r.id = ur.role_id
        AND r.resource_type = 'partner'
      WHERE
        w.id = public.partner_wallet_transactions.wallet_id
        AND ur.context_type = 'partner'
        AND ur.context_id = w.partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


DROP POLICY if EXISTS partner_wallet_tx_write ON public.partner_wallet_transactions;


CREATE POLICY partner_wallet_tx_write ON public.partner_wallet_transactions FOR insert TO authenticated
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.partner_wallets w
        JOIN public.user_roles ur ON ur.user_id = auth.uid ()
        JOIN public.roles r ON r.id = ur.role_id
        AND r.resource_type = 'partner'
      WHERE
        w.id = public.partner_wallet_transactions.wallet_id
        AND ur.context_type = 'partner'
        AND ur.context_id = w.partner_org_id
        AND r.role_key IN ('partner_admin', 'partner_leader')
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- 12) FX conversion helper (expects exchange_rates.rates to map currency_code→USD per 1 unit)
CREATE OR REPLACE FUNCTION public.convert_to_usd (
  p_amount_cents INTEGER,
  p_currency_code CHAR(3),
  p_as_of_date date
) returns BIGINT language plpgsql stable AS $$
declare
  v_rate numeric;
  v_code text;
begin
  -- Guard: null or empty currency yields NULL (unknown conversion)
  if p_currency_code is null then
    return null;
  end if;

  v_code := upper(trim(p_currency_code));
  if v_code = '' then
    return null;
  end if;

  -- USD passthrough
  if v_code = 'USD' then
    return p_amount_cents::bigint;
  end if;

  -- Try date-specific rate first
  select (rates ->> v_code)::numeric into v_rate
  from public.exchange_rates er
  where er.as_of_date = p_as_of_date
  order by fetched_at desc
  limit 1;

  -- Fallback to latest available rate
  if v_rate is null then
    select (rates ->> v_code)::numeric into v_rate
    from public.exchange_rates er
    order by as_of_date desc, fetched_at desc
    limit 1;
  end if;

  -- If still missing, return NULL instead of raising
  if v_rate is null then
    return null;
  end if;

  return round(p_amount_cents::numeric * v_rate)::bigint;
end$$;


-- 13) Financial summary views
-- Materialized view per project
DROP MATERIALIZED VIEW IF EXISTS public.project_financials;


CREATE MATERIALIZED VIEW public.project_financials AS
WITH
  latest_budget AS (
    SELECT DISTINCT
      ON (pb.project_id) pb.project_id,
      pb.version,
      pb.estimated_total_cents,
      pb.currency_code,
      pb.start_date
    FROM
      public.project_budgets pb
    ORDER BY
      pb.project_id,
      pb.version DESC
  ),
  actuals AS (
    SELECT
      pa.project_id,
      COALESCE(SUM(pa.reporting_usd_cents), 0)::BIGINT AS actual_spend_usd_cents
    FROM
      public.project_budget_actual_costs pa
    GROUP BY
      pa.project_id
  ),
  funding AS (
    SELECT
      c.project_id,
      COALESCE(
        SUM(
          CASE
            WHEN c.currency_code = 'USD' THEN c.amount_cents::BIGINT
            ELSE public.convert_to_usd (
              c.amount_cents,
              c.currency_code,
              (c.occurred_at)::date
            )
          END
        ),
        0
      )::BIGINT AS funding_received_usd_cents
    FROM
      public.contributions c
    WHERE
      c.project_id IS NOT NULL
    GROUP BY
      c.project_id
  )
SELECT
  p.id AS project_id,
  lb.version AS latest_budget_version,
  lb.estimated_total_cents,
  lb.currency_code AS budget_currency_code,
  CASE
    WHEN lb.currency_code IS NULL THEN NULL
    WHEN lb.currency_code = 'USD' THEN lb.estimated_total_cents::BIGINT
    ELSE public.convert_to_usd (
      lb.estimated_total_cents,
      lb.currency_code,
      COALESCE(lb.start_date, current_date)
    )
  END AS estimated_total_usd_cents,
  a.actual_spend_usd_cents,
  f.funding_received_usd_cents,
  CASE
    WHEN (
      CASE
        WHEN lb.currency_code IS NULL THEN NULL
        WHEN lb.currency_code = 'USD' THEN lb.estimated_total_cents::BIGINT
        ELSE public.convert_to_usd (
          lb.estimated_total_cents,
          lb.currency_code,
          COALESCE(lb.start_date, current_date)
        )
      END
    ) > 0 THEN LEAST(
      1.0,
      (
        f.funding_received_usd_cents::NUMERIC / NULLIF(
          (
            CASE
              WHEN lb.currency_code IS NULL THEN NULL
              WHEN lb.currency_code = 'USD' THEN lb.estimated_total_cents::BIGINT
              ELSE public.convert_to_usd (
                lb.estimated_total_cents,
                lb.currency_code,
                COALESCE(lb.start_date, current_date)
              )
            END
          ),
          0
        )::NUMERIC
      )
    )
    ELSE 0
  END AS funded_percent
FROM
  public.projects p
  LEFT JOIN latest_budget lb ON lb.project_id = p.id
  LEFT JOIN actuals a ON a.project_id = p.id
  LEFT JOIN funding f ON f.project_id = p.id;


-- Public listing view for language adoptions with simple funded percent (pre-project)
DROP VIEW if EXISTS public.public_language_adoptions;


CREATE VIEW public.public_language_adoptions
WITH
  (security_invoker = TRUE) AS
SELECT
  la.id,
  la.language_entity_id,
  la.status,
  la.estimated_budget_cents,
  la.currency_code,
  la.translators_ready,
  la.available_since,
  la.notes,
  -- Contributions directly tied to this adoption
  COALESCE(
    (
      SELECT
        SUM(
          CASE
            WHEN c.currency_code = 'USD' THEN c.amount_cents::BIGINT
            ELSE public.convert_to_usd (
              c.amount_cents,
              c.currency_code,
              (c.occurred_at)::date
            )
          END
        )
      FROM
        public.contributions c
      WHERE
        c.language_adoption_id = la.id
    ),
    0
  ) AS funding_received_usd_cents
FROM
  public.language_adoptions la
WHERE
  la.deleted_at IS NULL;


-- 14) Helpful indexes
CREATE INDEX if NOT EXISTS sponsorships_partner_idx ON public.sponsorships (partner_org_id);


CREATE INDEX if NOT EXISTS sponsorships_proj_idx ON public.sponsorships (project_id);


CREATE INDEX if NOT EXISTS sponsorship_allocations_sponsorship_idx ON public.sponsorship_allocations (sponsorship_id);


CREATE INDEX if NOT EXISTS project_budgets_project_idx ON public.project_budgets (project_id);


CREATE INDEX if NOT EXISTS project_actuals_project_idx ON public.project_budget_actual_costs (project_id);


CREATE INDEX if NOT EXISTS contributions_project_idx ON public.contributions (project_id);


CREATE INDEX if NOT EXISTS contributions_adoption_idx ON public.contributions (language_adoption_id);
