-- Test seed for funding settings and language adoptions
-- Creates a singleton funding_settings row and three sample language_adoptions
-- 1) Global funding settings (20% deposit over 12 months)
INSERT INTO
  public.funding_settings (deposit_percent, recurring_months)
VALUES
  (0.20, 12);


-- 2) Language adoptions
-- Uses language_entity ids from test languages seed (02_seed_test_languages_regions.sql)
-- Nepali (language)
INSERT INTO
  public.language_adoptions (
    language_entity_id,
    status,
    estimated_budget_cents,
    currency_code,
    translators_ready,
    available_since,
    notes,
    deposit_percent,
    recurring_months
  )
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba', -- Nepali
    'available',
    5000000,
    'USD',
    TRUE,
    NOW(),
    'Test seed: Nepali ready for adoption',
    0.25, -- override to test per-language deposit
    6 -- override to test per-language months
  );


-- Igbo (language)
INSERT INTO
  public.language_adoptions (
    language_entity_id,
    status,
    estimated_budget_cents,
    currency_code,
    translators_ready,
    available_since,
    notes
  )
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Igbo
    'available',
    3000000,
    'USD',
    TRUE,
    NOW(),
    'Test seed: Igbo available with global defaults'
  );


-- Hawaiian (language)
INSERT INTO
  public.language_adoptions (
    language_entity_id,
    status,
    estimated_budget_cents,
    currency_code,
    translators_ready,
    available_since,
    notes
  )
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc', -- Hawaiian
    'available',
    1200000,
    'USD',
    TRUE,
    NOW(),
    'Test seed: Hawaiian available with global defaults'
  );
