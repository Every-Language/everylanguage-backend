-- Migration: Change shares.share_entity_id to TEXT
-- Rationale: verses/chapters use TEXT ids; shares.share_entity_id is a polymorphic
-- reference (app | chapter | playlist | verse | passage). Using TEXT avoids type
-- mismatches when referencing TEXT ids.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shares'
      AND column_name = 'share_entity_id'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.shares
      ALTER COLUMN share_entity_id TYPE TEXT USING share_entity_id::TEXT;
  END IF;
END $$;


-- Ensure index exists (harmless if already present)
CREATE INDEX if NOT EXISTS idx_shares_entity_id ON public.shares (share_entity_id);
