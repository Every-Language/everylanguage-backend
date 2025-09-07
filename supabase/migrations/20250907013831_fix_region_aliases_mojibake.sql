-- Fix mojibake in region_aliases produced by UTF-8→Latin1 mis-decoding
-- Only repair rows that match common mojibake patterns; no-op for clean rows
-- Safe to run multiple times
BEGIN;


-- Helper to safely attempt mojibake repair without aborting the whole statement
DROP FUNCTION if EXISTS public.try_fix_mojibake (TEXT);


CREATE OR REPLACE FUNCTION public.try_fix_mojibake (value TEXT) returns TEXT language plpgsql stable AS $$
DECLARE
  v text;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;
  v := value;

  -- Only attempt conversion if typical mojibake markers are present
  IF v ~ '[ÃÂÐØ]' OR v LIKE '%ä¸%' OR v LIKE '%Â%' OR v LIKE '%Ã%' THEN
    BEGIN
      -- First try Windows-1252, then Latin1; if both fail, return original
      RETURN CONVERT_FROM(CONVERT_TO(v, 'WIN1252'), 'UTF8');
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        RETURN CONVERT_FROM(CONVERT_TO(v, 'LATIN1'), 'UTF8');
      EXCEPTION WHEN OTHERS THEN
        RETURN v;
      END;
    END;
  ELSE
    RETURN v;
  END IF;
END;
$$;


-- Repair region_aliases.alias_name
UPDATE public.region_aliases ra
SET
  alias_name = public.try_fix_mojibake (ra.alias_name)
WHERE
  (
    ra.alias_name ~ '[ÃÂÐØ]'
    OR ra.alias_name LIKE '%Â%'
    OR ra.alias_name LIKE '%Ã%'
    OR ra.alias_name LIKE '%ä¸%'
  )
  AND public.try_fix_mojibake (ra.alias_name) <> ra.alias_name;


-- Optionally repair regions.name if ever impacted (commented by default)
UPDATE public.regions r
SET
  name = public.try_fix_mojibake (r.name)
WHERE
  (
    r.name ~ '[ÃÂÐØ]'
    OR r.name LIKE '%Â%'
    OR r.name LIKE '%Ã%'
    OR r.name LIKE '%ä¸%'
  )
  AND public.try_fix_mojibake (r.name) <> r.name;


COMMIT;
