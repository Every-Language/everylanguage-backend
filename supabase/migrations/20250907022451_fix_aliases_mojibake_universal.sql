-- Universal mojibake repair for aliases tables (local test first)
-- Applies multi-pass decode on all rows, changing only when it improves text
BEGIN;


CREATE OR REPLACE FUNCTION public.mojibake_fix_multi (value TEXT) returns TEXT language plpgsql stable AS $$
DECLARE
  v TEXT := value;
  c1 TEXT;
  c2 TEXT;
  c3 TEXT;
  c4 TEXT;
BEGIN
  IF v IS NULL OR v = '' THEN RETURN v; END IF;

  -- Try CP1252
  BEGIN c1 := CONVERT_FROM(CONVERT_TO(v, 'WIN1252'), 'UTF8'); EXCEPTION WHEN OTHERS THEN c1 := NULL; END;
  -- Try Latin1
  BEGIN c2 := CONVERT_FROM(CONVERT_TO(v, 'LATIN1'), 'UTF8'); EXCEPTION WHEN OTHERS THEN c2 := NULL; END;
  -- Try double CP1252
  IF c1 IS NOT NULL THEN
    BEGIN c3 := CONVERT_FROM(CONVERT_TO(c1, 'WIN1252'), 'UTF8'); EXCEPTION WHEN OTHERS THEN c3 := NULL; END;
  END IF;
  -- Try double Latin1
  IF c2 IS NOT NULL THEN
    BEGIN c4 := CONVERT_FROM(CONVERT_TO(c2, 'LATIN1'), 'UTF8'); EXCEPTION WHEN OTHERS THEN c4 := NULL; END;
  END IF;

  -- Prefer the first successful change, falling back to original
  IF c1 IS NOT NULL AND c1 <> v THEN RETURN c1; END IF;
  IF c2 IS NOT NULL AND c2 <> v THEN RETURN c2; END IF;
  IF c3 IS NOT NULL AND c3 <> v THEN RETURN c3; END IF;
  IF c4 IS NOT NULL AND c4 <> v THEN RETURN c4; END IF;
  RETURN v;
END;
$$;


-- Apply to region_aliases
UPDATE public.region_aliases ra
SET
  alias_name = public.mojibake_fix_multi (ra.alias_name)
WHERE
  public.mojibake_fix_multi (ra.alias_name) <> ra.alias_name;


-- Apply to language_aliases
UPDATE public.language_aliases la
SET
  alias_name = public.mojibake_fix_multi (la.alias_name)
WHERE
  public.mojibake_fix_multi (la.alias_name) <> la.alias_name;


COMMIT;
