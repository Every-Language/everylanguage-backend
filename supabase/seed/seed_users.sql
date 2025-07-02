-- Development Seed Data
-- This file contains seed data for local development
-- Run with: supabase db reset (this will run migrations + seed)
-- Or: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed/dev_seed.sql
-- ============================================================================
-- ROLES
-- ============================================================================
INSERT INTO
  roles (id, name)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'member'),
  ('550e8400-e29b-41d4-a716-446655440002', 'leader'),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'administrator'
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


-- ============================================================================
-- TEAMS
-- ============================================================================
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
    '550e8400-e29b-41d4-a716-446655440002'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002'
  ),
  -- FF Pohkara January Quarter 2025 -> Pokhara base with member role
  (
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001'
  ),
  -- OMT Pokhara 1 -> Port Harcourt and Pokhara with administrator role
  (
    '770e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003'
  ),
  -- OMT Pokhara 2 -> Pokhara only with leader role
  (
    '770e8400-e29b-41d4-a716-446655440004',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002'
  )
ON CONFLICT (team_id, base_id, role_id) DO NOTHING;


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


-- ============================================================================
-- PUBLIC USERS
-- ============================================================================
INSERT INTO
  public.users (
    id,
    auth_uid,
    first_name,
    last_name,
    email,
    phone_number
  )
VALUES
  (
    '990e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440001',
    'Sarah',
    'Johnson',
    'sarah.johnson@example.com',
    '+1-808-555-0101'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440002',
    'Michael',
    'Chen',
    'michael.chen@example.com',
    '+1-808-555-0102'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440003',
    '880e8400-e29b-41d4-a716-446655440003',
    'Priya',
    'Sharma',
    'priya.sharma@example.com',
    '+977-1-555-0103'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440004',
    '880e8400-e29b-41d4-a716-446655440004',
    'David',
    'Wilson',
    'david.wilson@example.com',
    '+234-1-555-0104'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440005',
    '880e8400-e29b-41d4-a716-446655440005',
    'Anne',
    'Okafor',
    'anne.okafor@example.com',
    '+234-1-555-0105'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440006',
    '880e8400-e29b-41d4-a716-446655440006',
    'Raj',
    'Patel',
    'raj.patel@example.com',
    '+977-1-555-0106'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440007',
    '880e8400-e29b-41d4-a716-446655440007',
    'Lisa',
    'Martinez',
    'lisa.martinez@example.com',
    '+1-808-555-0107'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440008',
    '880e8400-e29b-41d4-a716-446655440008',
    'John',
    'Doe',
    'john.doe@example.com',
    '+1-555-0108'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- USER ROLES - TEAM ASSIGNMENTS
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
VALUES
  -- Sarah Johnson - Administrator in FF Kona April Quarter 2025
  (
    '990e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440003',
    'team',
    '770e8400-e29b-41d4-a716-446655440001'
  ),
  -- Michael Chen - Leader in FF Kona April Quarter 2025  
  (
    '990e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'team',
    '770e8400-e29b-41d4-a716-446655440001'
  ),
  -- Priya Sharma - Member in FF Pohkara January Quarter 2025
  (
    '990e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'team',
    '770e8400-e29b-41d4-a716-446655440002'
  ),
  -- David Wilson - Leader in OMT Pokhara 1
  (
    '990e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440002',
    'team',
    '770e8400-e29b-41d4-a716-446655440003'
  ),
  -- Anne Okafor - Administrator in OMT Pokhara 1
  (
    '990e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440003',
    'team',
    '770e8400-e29b-41d4-a716-446655440003'
  ),
  -- Raj Patel - Member in OMT Pokhara 2
  (
    '990e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440001',
    'team',
    '770e8400-e29b-41d4-a716-446655440004'
  ),
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
    '990e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440003',
    'base',
    '660e8400-e29b-41d4-a716-446655440001'
  ),
  -- Michael Chen - Leader at Pokhara base
  (
    '990e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'base',
    '660e8400-e29b-41d4-a716-446655440003'
  ),
  -- Priya Sharma - Member at Pokhara base
  (
    '990e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'base',
    '660e8400-e29b-41d4-a716-446655440003'
  ),
  -- David Wilson - Administrator at Port Harcourt base
  (
    '990e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440003',
    'base',
    '660e8400-e29b-41d4-a716-446655440002'
  ),
  -- Anne Okafor - Leader at Port Harcourt base
  (
    '990e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440002',
    'base',
    '660e8400-e29b-41d4-a716-446655440002'
  ),
  -- Raj Patel - Member at Pokhara base
  (
    '990e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440001',
    'base',
    '660e8400-e29b-41d4-a716-446655440003'
  ),
  -- Lisa Martinez - Leader at Kona base (no team)
  (
    '990e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440002',
    'base',
    '660e8400-e29b-41d4-a716-446655440001'
  ),
  -- John Doe - Member at Port Harcourt base (no team)
  (
    '990e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440001',
    'base',
    '660e8400-e29b-41d4-a716-446655440002'
  )
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- SAMPLE PERMISSIONS (for demonstration)
-- ============================================================================
INSERT INTO
  permissions (role_id, context_type, description, allow_deny)
VALUES
  -- Member permissions
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'team',
    'view_team_data',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'base',
    'view_base_data',
    TRUE
  ),
  -- Leader permissions  
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'team',
    'view_team_data',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'team',
    'edit_team_data',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'base',
    'view_base_data',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'base',
    'edit_base_data',
    TRUE
  ),
  -- Administrator permissions
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'team',
    'view_team_data',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'team',
    'edit_team_data',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'team',
    'manage_team_members',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'base',
    'view_base_data',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'base',
    'edit_base_data',
    TRUE
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'base',
    'manage_base_users',
    TRUE
  )
ON CONFLICT (role_id, context_type, description) DO NOTHING;


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
