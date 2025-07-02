# Seed Data Guide

## Overview

This directory contains seed data for local development. The seed data creates a complete test environment with users, teams, bases, and roles.

## What's Included

### Test Users (All with password: `password123`)

- **Sarah Johnson** (`sarah.johnson@example.com`) - Administrator in FF Kona team, Administrator at Kona base
- **Michael Chen** (`michael.chen@example.com`) - Leader in FF Kona team, Leader at Pokhara base
- **Priya Sharma** (`priya.sharma@example.com`) - Member in FF Pohkara team, Member at Pokhara base
- **David Wilson** (`david.wilson@example.com`) - Leader in OMT Pokhara 1 team, Administrator at Port Harcourt base
- **Anne Okafor** (`anne.okafor@example.com`) - Administrator in OMT Pokhara 1 team, Leader at Port Harcourt base
- **Raj Patel** (`raj.patel@example.com`) - Member in OMT Pokhara 2 team, Member at Pokhara base
- **Lisa Martinez** (`lisa.martinez@example.com`) - No team assignment, Leader at Kona base
- **John Doe** (`john.doe@example.com`) - No team assignment, Member at Port Harcourt base

### Teams

- **FF Kona April Quarter 2025** (translation) - Links to Kona and Pokhara bases
- **FF Pohkara January Quarter 2025** (translation) - Links to Pokhara base
- **OMT Pokhara 1** (technical) - Links to Port Harcourt and Pokhara bases
- **OMT Pokhara 2** (technical) - Links to Pokhara base

### Bases (with real coordinates)

- **Kona** (Hawaii) - `-155.9969, 19.6389`
- **Port Harcourt** (Nigeria) - `7.0134, 4.8156`
- **Pokhara OMT Lighthouse** (Nepal) - `83.9856, 28.2096`

### Roles & Permissions

- **member** - Can view team/base data
- **leader** - Can view and edit team/base data
- **administrator** - Can view, edit, and manage team members/base users

## How to Use

### Method 1: Automatic on Reset (Recommended)

Supabase automatically runs all SQL files in `/supabase/seed/` when you run:

```bash
npm run reset
# or
supabase db reset
```

### Method 2: Manual Load

```bash
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed/dev_seed.sql
```

### Method 3: Via Supabase CLI

```bash
supabase db seed dev_seed.sql
```

## Testing Authentication

You can log in as any of the test users using their email and the password `password123`. For example:

```javascript
// In your frontend
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'sarah.johnson@example.com',
  password: 'password123',
});
```

## Verification

After seeding, you can run these queries in your Supabase dashboard to verify everything worked:

```sql
-- Check all users and their auth connections
SELECT u.first_name, u.last_name, u.email, au.email as auth_email
FROM public.users u
JOIN auth.users au ON u.auth_uid = au.id
ORDER BY u.first_name;
```

```sql
-- Check user team assignments
SELECT
  u.first_name || ' ' || u.last_name as user_name,
  r.name as role,
  t.name as team
FROM public.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN teams t ON ur.context_id = t.id
WHERE ur.context_type = 'team'
ORDER BY u.first_name;
```

## Notes

- All users have both team and base role assignments
- Some users (Lisa, John) have no team assignment to test edge cases
- The seed data is idempotent - you can run it multiple times safely
- Phone numbers include realistic country codes for the base locations
- Coordinates are real locations close to the named cities
