-- Fix mojibake in region_aliases produced by UTF-8→Latin1 mis-decoding
-- Only repair rows that match common mojibake patterns; no-op for clean rows
-- Safe to run multiple times
BEGIN;


-- Repair region_aliases.alias_name
UPDATE public.region_aliases
SET
  alias_name = CONVERT_FROM(CONVERT_TO(alias_name, 'LATIN1'), 'UTF8')
WHERE
  alias_name ~ '[ÃÐØ]'
  OR alias_name LIKE '%Â%'
  OR alias_name LIKE '%Ã%'
  OR alias_name LIKE '%ä¸%';


-- Optionally repair regions.name if ever impacted (commented by default)
UPDATE public.regions
SET
  name = CONVERT_FROM(CONVERT_TO(name, 'LATIN1'), 'UTF8')
WHERE
  name ~ '[ÃÐØ]'
  OR name LIKE '%Â%'
  OR name LIKE '%Ã%'
  OR name LIKE '%ä¸%';


COMMIT;
