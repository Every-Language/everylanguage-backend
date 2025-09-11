-- Per-character mojibake repair for tough cases (e.g., China alias)
-- Local validation first
BEGIN;


-- Map bytes 0x80-0x9F to CP1252 equivalents where possible, else strip
CREATE OR REPLACE FUNCTION public.cp1252_softmap (input bytea) returns bytea language plpgsql immutable AS $$
DECLARE
  out bytea := '\x'::bytea;
  b  int;
  len int := length(input);
  i   int := 0;
  ch bytea;
BEGIN
  WHILE i < len LOOP
    i := i + 1;
    ch := substring(input from i for 1); -- single byte as bytea
    b := get_byte(input, i-1);
    -- If in 0x80..0x9F (C1 controls), map common CP1252 or skip
    IF b BETWEEN 128 AND 159 THEN
      -- Known CP1252 mappings subset; extend as needed
      CASE b
        WHEN 130 THEN out := out || convert_to('‚','UTF8');
        WHEN 131 THEN out := out || convert_to('ƒ','UTF8');
        WHEN 132 THEN out := out || convert_to('„','UTF8');
        WHEN 133 THEN out := out || convert_to('…','UTF8');
        WHEN 134 THEN out := out || convert_to('†','UTF8');
        WHEN 135 THEN out := out || convert_to('‡','UTF8');
        WHEN 136 THEN out := out || convert_to('ˆ','UTF8');
        WHEN 137 THEN out := out || convert_to('‰','UTF8');
        WHEN 138 THEN out := out || convert_to('Š','UTF8');
        WHEN 139 THEN out := out || convert_to('‹','UTF8');
        WHEN 140 THEN out := out || convert_to('Œ','UTF8');
        WHEN 145 THEN out := out || convert_to('‘','UTF8');
        WHEN 146 THEN out := out || convert_to('’','UTF8');
        WHEN 147 THEN out := out || convert_to('“','UTF8');
        WHEN 148 THEN out := out || convert_to('”','UTF8');
        WHEN 149 THEN out := out || convert_to('•','UTF8');
        WHEN 150 THEN out := out || convert_to('–','UTF8');
        WHEN 151 THEN out := out || convert_to('—','UTF8');
        WHEN 152 THEN out := out || convert_to('˜','UTF8');
        WHEN 153 THEN out := out || convert_to('™','UTF8');
        WHEN 154 THEN out := out || convert_to('š','UTF8');
        WHEN 155 THEN out := out || convert_to('›','UTF8');
        WHEN 156 THEN out := out || convert_to('œ','UTF8');
        WHEN 159 THEN out := out || convert_to('Ÿ','UTF8');
        ELSE
          -- skip unknown control
          NULL;
      END CASE;
    ELSE
      out := out || ch;
    END IF;
  END LOOP;
  RETURN out;
END;
$$;


-- Try to repair: normalize controls, then multi-pass decode
CREATE OR REPLACE FUNCTION public.mojibake_fix_hard (value TEXT) returns TEXT language plpgsql stable AS $$
DECLARE
  v TEXT := value;
  ccp TEXT;
  cl1 TEXT;
  dcp TEXT;
  dl1 TEXT;
BEGIN
  IF v IS NULL OR v = '' THEN RETURN v; END IF;

  -- Try interpreting using CP1252 and Latin1, with soft mapping for C1 controls
  BEGIN ccp := convert_from(public.cp1252_softmap(convert_to(v, 'WIN1252')), 'UTF8'); EXCEPTION WHEN OTHERS THEN ccp := NULL; END;
  BEGIN cl1 := convert_from(public.cp1252_softmap(convert_to(v, 'LATIN1')), 'UTF8'); EXCEPTION WHEN OTHERS THEN cl1 := NULL; END;

  -- Double-pass attempts
  IF ccp IS NOT NULL THEN
    BEGIN dcp := convert_from(public.cp1252_softmap(convert_to(ccp, 'WIN1252')), 'UTF8'); EXCEPTION WHEN OTHERS THEN dcp := NULL; END;
  END IF;
  IF cl1 IS NOT NULL THEN
    BEGIN dl1 := convert_from(public.cp1252_softmap(convert_to(cl1, 'LATIN1')), 'UTF8'); EXCEPTION WHEN OTHERS THEN dl1 := NULL; END;
  END IF;

  -- Prefer the first change
  IF dcp IS NOT NULL AND dcp <> v THEN RETURN dcp; END IF;
  IF dl1 IS NOT NULL AND dl1 <> v THEN RETURN dl1; END IF;
  IF ccp IS NOT NULL AND ccp <> v THEN RETURN ccp; END IF;
  IF cl1 IS NOT NULL AND cl1 <> v THEN RETURN cl1; END IF;

  RETURN v;
END;
$$;


-- Preview helper: see proposed fixes
CREATE OR REPLACE VIEW public.vw_aliases_mojibake_preview AS
SELECT
  'region' AS tbl,
  ra.id,
  ra.alias_name AS current,
  public.mojibake_fix_hard (ra.alias_name) AS proposed
FROM
  public.region_aliases ra
UNION ALL
SELECT
  'language' AS tbl,
  la.id,
  la.alias_name AS current,
  public.mojibake_fix_hard (la.alias_name) AS proposed
FROM
  public.language_aliases la;


COMMIT;
