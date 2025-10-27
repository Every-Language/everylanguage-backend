-- Development Seed Data
-- This file contains seed data for local development
-- Run with: supabase db reset (this will run migrations + seed)
-- Or: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed/dev_seed.sql
-- ============================================================================
-- ROLES
-- ============================================================================
INSERT INTO
  roles (id, name, role_key, resource_type)
VALUES
  -- Team roles
  (
    '550e8400-e29b-41d4-a716-446655440301',
    'Team Member',
    'team_member',
    'team'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440302',
    'Team Leader',
    'team_leader',
    'team'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440303',
    'Team Admin',
    'team_admin',
    'team'
  ),
  -- Base roles
  (
    '550e8400-e29b-41d4-a716-446655440401',
    'Base Member',
    'base_member',
    'base'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440402',
    'Base Staff',
    'base_staff',
    'base'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440403',
    'Base Admin',
    'base_admin',
    'base'
  ),
  -- Partner roles
  (
    '550e8400-e29b-41d4-a716-446655440501',
    'Partner Organization Member',
    'partner_member',
    'partner'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440502',
    'Partner Organization Leader',
    'partner_leader',
    'partner'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440503',
    'Partner Organization Admin',
    'partner_admin',
    'partner'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440101',
    'project_viewer',
    'project_viewer',
    'project'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440102',
    'project_editor',
    'project_editor',
    'project'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440103',
    'project_admin',
    'project_admin',
    'project'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440200',
    'system_admin',
    'system_admin',
    'global'
  )
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- BASES
-- ============================================================================
INSERT INTO
  bases (id, name, location)
VALUES
  (
    '660e8400-e29b-41d4-a716-446655440001',
    'Kona',
    POINT(-155.9969, 19.6389)
  ), -- Kona, Hawaii
  (
    '660e8400-e29b-41d4-a716-446655440002',
    'Port Harcourt',
    POINT(7.0134, 4.8156)
  ), -- Port Harcourt, Nigeria
  (
    '660e8400-e29b-41d4-a716-446655440003',
    'Pokhara OMT Lighthouse',
    POINT(83.9856, 28.2096)
  ) -- Pokhara, Nepal
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- PUBLIC USERS (explicit insert to ensure FK for created_by)
-- =========================================================================
-- public.users rows will be created by trigger from auth.users; ensure they exist
INSERT INTO
  public.users (id, email, is_anonymous)
SELECT
  id,
  email,
  FALSE
FROM
  auth.users
WHERE
  id IN (
    '880e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440003',
    '880e8400-e29b-41d4-a716-446655440004',
    '880e8400-e29b-41d4-a716-446655440005',
    '880e8400-e29b-41d4-a716-446655440006',
    '880e8400-e29b-41d4-a716-446655440007',
    '880e8400-e29b-41d4-a716-446655440008'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- AUTH USERS (for testing login)
-- ============================================================================
-- Note: These are created directly in auth.users for testing
-- In production, users would sign up through your frontend
INSERT INTO
  auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440001',
    'authenticated',
    'authenticated',
    'sarah.johnson@example.com',
    crypt ('password123', gen_salt ('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440002',
    'authenticated',
    'authenticated',
    'michael.chen@example.com',
    crypt ('password123', gen_salt ('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440003',
    'authenticated',
    'authenticated',
    'priya.sharma@example.com',
    crypt ('password123', gen_salt ('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440004',
    'authenticated',
    'authenticated',
    'david.wilson@example.com',
    crypt ('password123', gen_salt ('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440005',
    'authenticated',
    'authenticated',
    'anne.okafor@example.com',
    crypt ('password123', gen_salt ('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440006',
    'authenticated',
    'authenticated',
    'raj.patel@example.com',
    crypt ('password123', gen_salt ('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440007',
    'authenticated',
    'authenticated',
    'lisa.martinez@example.com',
    crypt ('password123', gen_salt ('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440008',
    'authenticated',
    'authenticated',
    'john.doe@example.com',
    crypt ('password123', gen_salt ('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- TEAMS
-- =========================================================================
INSERT INTO
  teams (id, name, type)
VALUES
  (
    '770e8400-e29b-41d4-a716-446655440001',
    'FF Kona April Quarter 2025',
    'translation'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440002',
    'FF Pohkara January Quarter 2025',
    'translation'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440003',
    'OMT Pokhara 1',
    'technical'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440004',
    'OMT Pokhara 2',
    'technical'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- BASES-TEAMS RELATIONSHIPS
-- ============================================================================
INSERT INTO
  bases_teams (team_id, base_id, role_id)
VALUES
  -- FF Kona April Quarter 2025 -> Kona and Pokhara bases with leader role
  (
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440402'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440402'
  ),
  -- FF Pohkara January Quarter 2025 -> Pokhara base with member role
  (
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440401'
  ),
  -- OMT Pokhara 1 -> Port Harcourt and Pokhara with administrator role
  (
    '770e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440403'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440403'
  ),
  -- OMT Pokhara 2 -> Pokhara only with leader role
  (
    '770e8400-e29b-41d4-a716-446655440004',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440402'
  )
ON CONFLICT (team_id, base_id, role_id) DO NOTHING;


-- =========================================================================
-- LANGUAGE ENTITIES (minimal for project foreign keys)
-- =========================================================================
INSERT INTO
  public.language_entities (id, level, name)
VALUES
  (
    '990e8400-e29b-41d4-a716-446655440001',
    'language',
    'Lang A'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440002',
    'language',
    'Lang B'
  )
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- PROJECTS
-- =========================================================================
INSERT INTO
  public.projects (
    id,
    name,
    description,
    source_language_entity_id,
    target_language_entity_id,
    created_by
  )
VALUES
  (
    'aa0e8400-e29b-41d4-a716-446655440001',
    'Test Project Kona',
    'Seeded test project for RBAC checks',
    '990e8400-e29b-41d4-a716-446655440001',
    '990e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440001'
  )
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- PROJECTS_TEAMS (assign team to project with a project role)
-- =========================================================================
INSERT INTO
  public.projects_teams (project_id, team_id, project_role_id, is_primary)
VALUES
  (
    'aa0e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440102',
    TRUE
  )
ON CONFLICT (project_id, team_id)
WHERE
  (unassigned_at IS NULL) DO NOTHING;


-- =========================================================================
-- PARTNER ORGS AND ASSIGNMENT
-- =========================================================================
INSERT INTO
  public.partner_orgs (id, name, description, created_by)
VALUES
  (
    'bb0e8400-e29b-41d4-a716-446655440001',
    'Kona Community Church',
    'Seeded partner org for RBAC checks',
    '880e8400-e29b-41d4-a716-446655440001'
  )
ON CONFLICT (id) DO NOTHING;


INSERT INTO
  public.partner_orgs_projects (project_id, partner_org_id)
VALUES
  (
    'aa0e8400-e29b-41d4-a716-446655440001',
    'bb0e8400-e29b-41d4-a716-446655440001'
  )
ON CONFLICT (project_id, partner_org_id)
WHERE
  (unassigned_at IS NULL) DO NOTHING;


-- ============================================================================
-- USER ROLES - TEAM ASSIGNMENTS
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
VALUES
  -- Sarah Johnson - Administrator in FF Kona April Quarter 2025
  (
    '880e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440303',
    'team',
    '770e8400-e29b-41d4-a716-446655440001'
  ),
  -- Michael Chen - Leader in FF Kona April Quarter 2025  
  (
    '880e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440302',
    'team',
    '770e8400-e29b-41d4-a716-446655440001'
  ),
  -- Priya Sharma - Member in FF Pohkara January Quarter 2025
  (
    '880e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440301',
    'team',
    '770e8400-e29b-41d4-a716-446655440002'
  ),
  -- David Wilson - Leader in OMT Pokhara 1
  (
    '880e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440302',
    'team',
    '770e8400-e29b-41d4-a716-446655440003'
  ),
  -- Anne Okafor - Administrator in OMT Pokhara 1
  (
    '880e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440303',
    'team',
    '770e8400-e29b-41d4-a716-446655440003'
  ),
  -- Raj Patel - Member in OMT Pokhara 2
  (
    '880e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440301',
    'team',
    '770e8400-e29b-41d4-a716-446655440004'
  )
  -- Lisa Martinez - No team assignment (only base role)
  -- John Doe - No team assignment (only base role)
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- USER ROLES - BASE ASSIGNMENTS
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
VALUES
  -- Base assignments for all users
  -- Sarah Johnson - Administrator at Kona base
  (
    '880e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440403',
    'base',
    '660e8400-e29b-41d4-a716-446655440001'
  ),
  -- Michael Chen - Leader at Pokhara base
  (
    '880e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440402',
    'base',
    '660e8400-e29b-41d4-a716-446655440003'
  ),
  -- Priya Sharma - Member at Pokhara base
  (
    '880e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440003'
  ),
  -- David Wilson - Administrator at Port Harcourt base
  (
    '880e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440403',
    'base',
    '660e8400-e29b-41d4-a716-446655440002'
  ),
  -- Anne Okafor - Leader at Port Harcourt base
  (
    '880e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440402',
    'base',
    '660e8400-e29b-41d4-a716-446655440002'
  ),
  -- Raj Patel - Member at Pokhara base
  (
    '880e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440003'
  ),
  -- Lisa Martinez - Leader at Kona base (no team)
  (
    '880e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440402',
    'base',
    '660e8400-e29b-41d4-a716-446655440001'
  ),
  -- John Doe - Member at Port Harcourt base (no team)
  (
    '880e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440002'
  )
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- =========================================================================
-- SAMPLE PERMISSIONS (for demonstration)
-- =========================================================================
-- ROLE PERMISSIONS (new model)
INSERT INTO
  public.role_permissions (
    role_id,
    resource_type,
    permission_key,
    is_allowed
  )
VALUES
  -- Project roles
  (
    '550e8400-e29b-41d4-a716-446655440101',
    'project',
    'project.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440102',
    'project',
    'project.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440102',
    'project',
    'project.write',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440103',
    'project',
    'project.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440103',
    'project',
    'project.write',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440103',
    'project',
    'project.delete',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440103',
    'project',
    'project.manage_roles',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440103',
    'project',
    'project.invite',
    TRUE
  ),
  -- Team roles
  (
    '550e8400-e29b-41d4-a716-446655440301',
    'team',
    'team.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440302',
    'team',
    'team.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440302',
    'team',
    'team.write',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440303',
    'team',
    'team.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440303',
    'team',
    'team.write',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440303',
    'team',
    'team.delete',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440303',
    'team',
    'team.manage_roles',
    TRUE
  ),
  -- Base roles
  (
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    'base.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440402',
    'base',
    'base.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440402',
    'base',
    'base.write',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440403',
    'base',
    'base.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440403',
    'base',
    'base.write',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440403',
    'base',
    'base.delete',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440403',
    'base',
    'base.manage_roles',
    TRUE
  ),
  -- Partner roles
  (
    '550e8400-e29b-41d4-a716-446655440501',
    'partner',
    'partner.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440502',
    'partner',
    'partner.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440503',
    'partner',
    'partner.read',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440503',
    'partner',
    'partner.manage_roles',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440200',
    'global',
    'system.admin',
    TRUE
  )
ON CONFLICT (role_id, resource_type, permission_key) DO NOTHING;


-- =========================================================================
-- SET created_by for bases and teams (ownership for testing)
-- =========================================================================
-- Bases
UPDATE public.bases
SET
  created_by = '880e8400-e29b-41d4-a716-446655440001' -- Sarah Johnson
WHERE
  id = '660e8400-e29b-41d4-a716-446655440001';


-- Kona
UPDATE public.bases
SET
  created_by = '880e8400-e29b-41d4-a716-446655440004' -- David Wilson
WHERE
  id = '660e8400-e29b-41d4-a716-446655440002';


-- Port Harcourt
UPDATE public.bases
SET
  created_by = '880e8400-e29b-41d4-a716-446655440002' -- Michael Chen
WHERE
  id = '660e8400-e29b-41d4-a716-446655440003';


-- Pokhara
-- Teams
UPDATE public.teams
SET
  created_by = '880e8400-e29b-41d4-a716-446655440001' -- Sarah Johnson
WHERE
  id = '770e8400-e29b-41d4-a716-446655440001';


-- FF Kona April Quarter 2025
UPDATE public.teams
SET
  created_by = '880e8400-e29b-41d4-a716-446655440003' -- Priya Sharma
WHERE
  id = '770e8400-e29b-41d4-a716-446655440002';


-- FF Pohkara January Quarter 2025
UPDATE public.teams
SET
  created_by = '880e8400-e29b-41d4-a716-446655440005' -- Anne Okafor
WHERE
  id = '770e8400-e29b-41d4-a716-446655440003';


-- OMT Pokhara 1
UPDATE public.teams
SET
  created_by = '880e8400-e29b-41d4-a716-446655440006' -- Raj Patel
WHERE
  id = '770e8400-e29b-41d4-a716-446655440004';


-- OMT Pokhara 2
-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the seed worked)
-- ============================================================================
/*
-- Check users and their auth connections
SELECT u.first_name, u.last_name, u.email, au.email as auth_email
FROM public.users u
JOIN auth.users au ON u.auth_uid = au.id;

-- Check user team assignments
SELECT 
u.first_name || ' ' || u.last_name as user_name,
r.name as role,
t.name as team,
'team' as context_type
FROM public.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN teams t ON ur.context_id = t.id
WHERE ur.context_type = 'team'
ORDER BY u.first_name;

-- Check user base assignments  
SELECT 
u.first_name || ' ' || u.last_name as user_name,
r.name as role,
b.name as base,
'base' as context_type
FROM public.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN bases b ON ur.context_id = b.id
WHERE ur.context_type = 'base'
ORDER BY u.first_name;

-- Check team-base relationships
SELECT 
t.name as team,
b.name as base,
r.name as role
FROM teams t
JOIN bases_teams bt ON t.id = bt.team_id
JOIN bases b ON bt.base_id = b.id
JOIN roles r ON bt.role_id = r.id
ORDER BY t.name, b.name;
*/
