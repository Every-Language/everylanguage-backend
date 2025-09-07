-- Robust mojibake repair pass 2
-- Tries CP1252 and Latin1, including double-pass, and leaves clean text unchanged
BEGIN;


CREATE OR REPLACE FUNCTION public.try_fix_mojibake_v2 (value TEXT) returns TEXT language plpgsql stable AS $$
DECLARE
  v TEXT := value;
  c1 TEXT;
  c2 TEXT;
  c3 TEXT;
  c4 TEXT;
BEGIN
  IF v IS NULL OR v = '' THEN
    RETURN v;
  END IF;

  -- Only attempt if mojibake markers present
  IF v ~ '[ÃÂÐØ]' OR v LIKE '%ä¸%' OR v LIKE '%Â%' OR v LIKE '%Ã%' THEN
    -- Pass 1: CP1252
    BEGIN
      c1 := CONVERT_FROM(CONVERT_TO(v, 'WIN1252'), 'UTF8');
    EXCEPTION WHEN OTHERS THEN
      c1 := NULL;
    END;

    -- Pass 2: Latin1
    BEGIN
      c2 := CONVERT_FROM(CONVERT_TO(v, 'LATIN1'), 'UTF8');
    EXCEPTION WHEN OTHERS THEN
      c2 := NULL;
    END;

    -- Pass 3: Double CP1252→UTF8→CP1252→UTF8 (handles chained mis-decodes)
    IF c1 IS NOT NULL THEN
      BEGIN
        c3 := CONVERT_FROM(CONVERT_TO(c1, 'WIN1252'), 'UTF8');
      EXCEPTION WHEN OTHERS THEN
        c3 := NULL;
      END;
    END IF;

    -- Pass 4: Double Latin1
    IF c2 IS NOT NULL THEN
      BEGIN
        c4 := CONVERT_FROM(CONVERT_TO(c2, 'LATIN1'), 'UTF8');
      EXCEPTION WHEN OTHERS THEN
        c4 := NULL;
      END;
    END IF;

    -- Prefer the first successful that changes the string
    IF c1 IS NOT NULL AND c1 <> v THEN RETURN c1; END IF;
    IF c2 IS NOT NULL AND c2 <> v THEN RETURN c2; END IF;
    IF c3 IS NOT NULL AND c3 <> v THEN RETURN c3; END IF;
    IF c4 IS NOT NULL AND c4 <> v THEN RETURN c4; END IF;

    RETURN v;
  ELSE
    RETURN v;
  END IF;
END;
$$;


-- Update remaining mojibake rows only if the function changes them
UPDATE public.region_aliases ra
SET
  alias_name = public.try_fix_mojibake_v2 (ra.alias_name)
WHERE
  (
    ra.alias_name ~ '[ÃÂÐØ]'
    OR ra.alias_name LIKE '%Â%'
    OR ra.alias_name LIKE '%Ã%'
    OR ra.alias_name LIKE '%ä¸%'
  )
  AND public.try_fix_mojibake_v2 (ra.alias_name) <> ra.alias_name;


UPDATE public.regions r
SET
  name = public.try_fix_mojibake_v2 (r.name)
WHERE
  (
    r.name ~ '[ÃÂÐØ]'
    OR r.name LIKE '%Â%'
    OR r.name LIKE '%Ã%'
    OR r.name LIKE '%ä¸%'
  )
  AND public.try_fix_mojibake_v2 (r.name) <> r.name;


COMMIT;
