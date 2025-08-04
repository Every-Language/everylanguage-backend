-- Setup PowerSync for Supabase
-- This migration creates the necessary user, permissions, and publication for PowerSync
-- Create a role/user with replication privileges for PowerSync
CREATE ROLE powersync_role
WITH
  replication bypassrls login password 'myhighlyrandompassword';


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
CREATE PUBLICATION powersync FOR ALL tables;


-- Grant usage on the public schema
GRANT usage ON schema public TO powersync_role;
