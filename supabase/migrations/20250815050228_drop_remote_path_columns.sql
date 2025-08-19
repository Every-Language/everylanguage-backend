-- Drop legacy remote_path columns now that object_key is in place
BEGIN;


-- Ensure object_key present (do NOT enforce NOT NULL yet, per request)
-- We assume earlier backfill added object_key for existing rows
ALTER TABLE public.media_files
DROP COLUMN IF EXISTS remote_path;


ALTER TABLE public.images
DROP COLUMN IF EXISTS remote_path;


COMMIT;
