-- Setup PowerSync for Supabase
-- This migration creates the necessary user, permissions, and publication for PowerSync
-- Create a role/user with replication privileges for PowerSync (handle existing role)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'powersync_role') THEN
        CREATE ROLE powersync_role
        WITH
          replication bypassrls login password 'myhighlyrandompassword';
        RAISE NOTICE 'Created powersync_role';
    ELSE
        RAISE NOTICE 'powersync_role already exists, skipping creation';
    END IF;
END
$$;


-- Set up permissions for the newly created role
-- Read-only (SELECT) access is required
GRANT
SELECT
  ON ALL tables IN schema public TO powersync_role;


-- Grant SELECT on future tables as well
ALTER DEFAULT PRIVILEGES IN schema public
GRANT
SELECT
  ON tables TO powersync_role;


-- Create a publication to replicate tables. 
-- The publication must be named "powersync"
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_publication WHERE pubname = 'powersync') THEN
        CREATE PUBLICATION powersync FOR ALL tables;
        RAISE NOTICE 'Created powersync publication';
    ELSE
        RAISE NOTICE 'powersync publication already exists, skipping creation';
    END IF;
END
$$;


-- Grant usage on the public schema
GRANT usage ON schema public TO powersync_role;
