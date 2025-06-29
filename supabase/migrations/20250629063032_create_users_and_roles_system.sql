-- Create users and roles system
-- This migration establishes the foundation for user management and RBAC
-- ============================================================================
-- CORE USER TABLES
-- ============================================================================
-- Public users table to store user metadata
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  auth_uid UUID REFERENCES auth.users (id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================================
-- RBAC TABLES
-- ============================================================================
-- User roles junction table with context
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES roles (id) ON DELETE CASCADE NOT NULL,
  context_type TEXT, -- 'team', 'base', 'global', etc.
  context_id UUID, -- ID of the context object (team_id, base_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique role per user per context
  UNIQUE (user_id, role_id, context_type, context_id)
);


-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  role_id UUID REFERENCES roles (id) ON DELETE CASCADE NOT NULL,
  context_type TEXT NOT NULL, -- 'team', 'base', 'global', etc.
  context_id UUID, --ID of the context object (team_id, base_id, etc.)
  description TEXT NOT NULL, -- e.g., 'can_edit_team_settings', 'can_manage_users'
  allow_deny BOOLEAN NOT NULL DEFAULT TRUE, -- true = allow, false = deny
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique permission per role per context
  UNIQUE (role_id, context_type, description)
);


-- ============================================================================
-- CONTEXT TABLES
-- ============================================================================
-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  name TEXT NOT NULL,
  type TEXT, -- e.g., 'translation', 'technical', 'leadership'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Bases table (physical locations)
-- Note: region_id references will be added in future migration when regions table is created
CREATE TABLE bases (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  name TEXT NOT NULL,
  location point, -- PostGIS point for lat/long coordinates
  region_id UUID, -- Will be constrained to regions table in future migration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Bases-Teams junction table
CREATE TABLE bases_teams (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  team_id UUID REFERENCES teams (id) ON DELETE CASCADE NOT NULL,
  base_id UUID REFERENCES bases (id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES roles (id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique team-base-role combination
  UNIQUE (team_id, base_id, role_id)
);


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- Users table indexes
CREATE INDEX idx_users_auth_uid ON public.users (auth_uid);


CREATE INDEX idx_users_email ON public.users (email);


CREATE INDEX idx_users_created_at ON public.users (created_at);


-- Roles table indexes
CREATE INDEX idx_roles_name ON roles (name);


-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);


CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);


CREATE INDEX idx_user_roles_context ON user_roles (context_type, context_id);


-- Permissions indexes
CREATE INDEX idx_permissions_role_id ON permissions (role_id);


CREATE INDEX idx_permissions_context_type ON permissions (context_type);


-- Teams indexes
CREATE INDEX idx_teams_name ON teams (name);


CREATE INDEX idx_teams_type ON teams (type);


-- Bases indexes
CREATE INDEX idx_bases_name ON bases (name);


CREATE INDEX idx_bases_region_id ON bases (region_id);


CREATE INDEX idx_bases_location ON bases USING gist (location);


-- Spatial index for location queries
-- Bases teams indexes
CREATE INDEX idx_bases_teams_team_id ON bases_teams (team_id);


CREATE INDEX idx_bases_teams_base_id ON bases_teams (base_id);


CREATE INDEX idx_bases_teams_role_id ON bases_teams (role_id);


-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE public.users enable ROW level security;


ALTER TABLE roles enable ROW level security;


ALTER TABLE user_roles enable ROW level security;


ALTER TABLE permissions enable ROW level security;


ALTER TABLE teams enable ROW level security;


ALTER TABLE bases enable ROW level security;


ALTER TABLE bases_teams enable ROW level security;


-- Users policies
CREATE POLICY "Users can view own profile" ON public.users FOR
SELECT
  USING (auth.uid () = auth_uid);


CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE
  USING (auth.uid () = auth_uid);


CREATE POLICY "Users can insert own profile" ON public.users FOR insert
WITH
  CHECK (auth.uid () = auth_uid);


-- Roles policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view roles" ON roles FOR
SELECT
  USING (auth.role () = 'authenticated');


-- User roles policies
CREATE POLICY "Users can view own roles" ON user_roles FOR
SELECT
  USING (
    user_id IN (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- Permissions policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view permissions" ON permissions FOR
SELECT
  USING (auth.role () = 'authenticated');


-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column () returns trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';


-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at before
UPDATE ON public.users FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_roles_updated_at before
UPDATE ON roles FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_user_roles_updated_at before
UPDATE ON user_roles FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_permissions_updated_at before
UPDATE ON permissions FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_teams_updated_at before
UPDATE ON teams FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_bases_updated_at before
UPDATE ON bases FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_bases_teams_updated_at before
UPDATE ON bases_teams FOR each ROW
EXECUTE function update_updated_at_column ();


-- ============================================================================
-- COMMENTS
-- ============================================================================
comment ON TABLE public.users IS 'User profiles linked to Supabase auth.users';


comment ON TABLE roles IS 'System roles for RBAC';


comment ON TABLE user_roles IS 'Many-to-many junction table for users and roles with context';


comment ON TABLE permissions IS 'Permissions associated with roles and contexts';


comment ON TABLE teams IS 'Organizational teams';


comment ON TABLE bases IS 'Physical bases/locations';


comment ON TABLE bases_teams IS 'Many-to-many junction table for bases and teams';


comment ON COLUMN bases.location IS 'PostGIS point storing latitude/longitude coordinates';


comment ON COLUMN bases.region_id IS 'Reference to regions table (to be added in future migration)';


comment ON COLUMN user_roles.context_type IS 'Type of context (team, base, global, etc.)';


comment ON COLUMN user_roles.context_id IS 'ID of the context object';


comment ON COLUMN permissions.allow_deny IS 'true = allow permission, false = deny permission';
