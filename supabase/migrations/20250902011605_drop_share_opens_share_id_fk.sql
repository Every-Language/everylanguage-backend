-- Drop the strict FK on share_opens.share_id so opens can arrive before shares
-- SAFETY: Use IF EXISTS to be idempotent across environments
-- Down migration note: If you later want to restore the FK, consider using
--   REFERENCES public.shares(id) ON DELETE SET NULL
-- instead of CASCADE to avoid deletes rippling unexpectedly.
ALTER TABLE IF EXISTS public.share_opens
DROP CONSTRAINT if EXISTS share_opens_share_id_fkey;


-- Optional: if NOT NULL is currently set on share_id due to prior schema,
-- you may also want to relax it to allow orphaned opens until shares are created.
-- Uncomment if desired:
-- ALTER TABLE public.share_opens ALTER COLUMN share_id DROP NOT NULL;
-- Rename origin_share_id -> parent_share_id and drop related FKs
-- 1) share_opens
ALTER TABLE IF EXISTS public.share_opens
DROP CONSTRAINT if EXISTS share_opens_origin_share_id_fkey;


ALTER TABLE IF EXISTS public.share_opens
RENAME COLUMN origin_share_id TO parent_share_id;


-- 2) shares
ALTER TABLE IF EXISTS public.shares
DROP CONSTRAINT if EXISTS shares_origin_share_id_fkey;


ALTER TABLE IF EXISTS public.shares
RENAME COLUMN origin_share_id TO parent_share_id;
