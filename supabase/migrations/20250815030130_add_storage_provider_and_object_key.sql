-- Add object_key and storage_provider to media_files and images, with backfill
-- NOTE: created_by references public.users; no changes required here
BEGIN;


-- media_files
ALTER TABLE public.media_files
ADD COLUMN IF NOT EXISTS object_key TEXT,
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'r2';


-- Backfill object_key from remote_path when missing (take last path segment)
UPDATE public.media_files
SET
  object_key = CASE
    WHEN remote_path IS NULL
    OR POSITION('/' IN remote_path) = 0 THEN remote_path
    ELSE REGEXP_REPLACE(remote_path, '.*/', '')
  END,
  storage_provider = COALESCE(storage_provider, 'b2')
WHERE
  object_key IS NULL;


-- images
ALTER TABLE public.images
ADD COLUMN IF NOT EXISTS object_key TEXT,
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'r2';


UPDATE public.images
SET
  object_key = CASE
    WHEN remote_path IS NULL
    OR POSITION('/' IN remote_path) = 0 THEN remote_path
    ELSE REGEXP_REPLACE(remote_path, '.*/', '')
  END,
  storage_provider = COALESCE(storage_provider, 'b2')
WHERE
  object_key IS NULL;


COMMIT;
