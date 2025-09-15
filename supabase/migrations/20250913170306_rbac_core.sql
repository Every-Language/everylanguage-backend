-- RBAC core: enums, tables, indexes, helper function
-- This migration adds resource/permission enums, role_permissions, projects_teams with project_role_id,
-- partner_orgs and partner_orgs_projects, augments bases_teams with assignment windows, adds indexes,
-- and implements has_permission(user_id, action, resource_type, resource_id).
-- Ensure UUID generator
CREATE EXTENSION if NOT EXISTS pgcrypto;


-- 1) Enums
DO $$
begin
  if not exists (select 1 from pg_type where typname = 'resource_type') then
    create type resource_type as enum ('global', 'team', 'project', 'base', 'partner');
  end if;
end $$;


DO $$
begin
  if not exists (select 1 from pg_type where typname = 'permission_key') then
    create type permission_key as enum (
      'system.admin',
      'team.read', 'team.write', 'team.delete', 'team.invite', 'team.manage_roles',
      'project.read', 'project.write', 'project.delete', 'project.invite', 'project.manage_roles',
      'base.read', 'base.write', 'base.delete', 'base.manage_roles',
      'partner.read', 'partner.manage_roles',
      'budget.read', 'budget.write', 'contribution.read', 'contribution.write'
    );
  end if;
end $$;


-- 2) roles table enhancements (non-breaking; nullable to allow phased backfill)
DO $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'roles' and column_name = 'role_key'
  ) then
    alter table public.roles add column role_key text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'roles' and column_name = 'resource_type'
  ) then
    alter table public.roles add column resource_type resource_type;
  end if;
end $$;


CREATE UNIQUE INDEX if NOT EXISTS roles_resource_type_role_key_uniq ON public.roles (resource_type, role_key)
WHERE
  role_key IS NOT NULL
  AND resource_type IS NOT NULL;


-- 3) Replace legacy permissions table with role_permissions (idempotent drop)
DO $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'permissions') then
    drop table public.permissions cascade;
  end if;
end $$;


CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  role_id UUID NOT NULL REFERENCES public.roles (id) ON DELETE CASCADE,
  resource_type resource_type NOT NULL,
  permission_key permission_key NOT NULL,
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE UNIQUE INDEX if NOT EXISTS role_permissions_role_resource_perm_uniq ON public.role_permissions (role_id, resource_type, permission_key);


-- 4) Relationship tables
-- projects_teams with project_role_id (role to be inherited by all team members on that project)
CREATE TABLE IF NOT EXISTS public.projects_teams (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  project_role_id UUID NULL REFERENCES public.roles (id) ON DELETE SET NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ NULL
);


CREATE INDEX if NOT EXISTS projects_teams_project_id_idx ON public.projects_teams (project_id);


CREATE INDEX if NOT EXISTS projects_teams_team_id_idx ON public.projects_teams (team_id);


CREATE UNIQUE INDEX if NOT EXISTS projects_teams_active_pair_uniq ON public.projects_teams (project_id, team_id)
WHERE
  unassigned_at IS NULL;


-- partner_orgs
CREATE TABLE IF NOT EXISTS public.partner_orgs (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  name TEXT NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NULL
);


-- partner_orgs_projects
CREATE TABLE IF NOT EXISTS public.partner_orgs_projects (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  partner_org_id UUID NOT NULL REFERENCES public.partner_orgs (id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ NULL
);


CREATE INDEX if NOT EXISTS partner_orgs_projects_project_id_idx ON public.partner_orgs_projects (project_id);


CREATE INDEX if NOT EXISTS partner_orgs_projects_partner_org_id_idx ON public.partner_orgs_projects (partner_org_id);


CREATE UNIQUE INDEX if NOT EXISTS partner_orgs_projects_active_pair_uniq ON public.partner_orgs_projects (project_id, partner_org_id)
WHERE
  unassigned_at IS NULL;


-- 5) Augment bases_teams with assignment windows
DO $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bases_teams' and column_name = 'assigned_at'
  ) then
    alter table public.bases_teams add column assigned_at timestamptz not null default now();
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bases_teams' and column_name = 'unassigned_at'
  ) then
    alter table public.bases_teams add column unassigned_at timestamptz null;
  end if;
end $$;


CREATE INDEX if NOT EXISTS bases_teams_base_id_idx ON public.bases_teams (base_id);


CREATE INDEX if NOT EXISTS bases_teams_team_id_idx ON public.bases_teams (team_id);


CREATE UNIQUE INDEX if NOT EXISTS bases_teams_active_pair_uniq ON public.bases_teams (base_id, team_id)
WHERE
  unassigned_at IS NULL;


-- Remove created_at/updated_at from bases_teams (standardize on assignment window only)
DO $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bases_teams' and column_name = 'created_at'
  ) then
    alter table public.bases_teams drop column created_at;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bases_teams' and column_name = 'updated_at'
  ) then
    alter table public.bases_teams drop column updated_at;
  end if;
end $$;


-- 6) Helpful indexes
CREATE INDEX if NOT EXISTS user_roles_user_ctx_idx ON public.user_roles (user_id, context_type, context_id);


CREATE INDEX if NOT EXISTS role_permissions_lookup_idx ON public.role_permissions (resource_type, permission_key);


-- 7) has_permission helper
CREATE OR REPLACE FUNCTION public.has_permission (
  p_user_id UUID,
  p_action permission_key,
  p_resource_type resource_type,
  p_resource_id UUID
) returns BOOLEAN language plpgsql stable AS $$
begin
  -- 1) System admin shortcut
  if exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = p_user_id
      and rp.resource_type = 'global'::resource_type
      and rp.permission_key = 'system.admin'::permission_key
      and rp.is_allowed = true
    limit 1
  ) then
    return true;
  end if;

  -- 2) Ownership shortcut (resource-specific)
  if p_resource_type = 'project'::resource_type then
    if exists (
      select 1 from public.projects pr
      where pr.id = p_resource_id
        and pr.created_by = p_user_id
      limit 1
    ) then
      -- Project owners can read/write; DELETE still requires explicit permission
      if p_action in ('project.read'::permission_key, 'project.write'::permission_key) then
        return true;
      end if;
    end if;
  elsif p_resource_type = 'partner'::resource_type then
    if exists (
      select 1 from public.partner_orgs po
      where po.id = p_resource_id
        and po.created_by = p_user_id
      limit 1
    ) then
      if p_action in ('partner.read'::permission_key, 'partner.manage_roles'::permission_key) then
        return true;
      end if;
    end if;
  end if;

  -- 3) Direct role on resource
  if exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = p_user_id
      and ur.context_type = (p_resource_type::text)
      and ur.context_id::uuid = p_resource_id
      and rp.resource_type = p_resource_type
      and rp.permission_key = p_action
      and rp.is_allowed = true
    limit 1
  ) then
    return true;
  end if;

  -- 4) Team inheritance and project-team role inheritance (projects only)
  if p_resource_type = 'project'::resource_type then
    -- A) Inherit from user's team role → project permission
    if exists (
      select 1
      from public.user_roles ur_team
      join public.projects_teams pt
        on ur_team.context_id::uuid = pt.team_id
       and pt.project_id = p_resource_id
       and pt.unassigned_at is null
      join public.role_permissions rp on rp.role_id = ur_team.role_id
      where ur_team.user_id = p_user_id
        and ur_team.context_type = 'team'
        and rp.resource_type = 'project'
        and rp.permission_key = p_action
        and rp.is_allowed = true
      limit 1
    ) then
      return true;
    end if;

    -- B) Inherit project role assigned to the team on this project → all team members
    if exists (
      select 1
      from public.user_roles ur_team
      join public.projects_teams pt
        on ur_team.context_id::uuid = pt.team_id
       and pt.project_id = p_resource_id
       and pt.unassigned_at is null
      join public.role_permissions rp on rp.role_id = pt.project_role_id
      where ur_team.user_id = p_user_id
        and ur_team.context_type = 'team'
        and rp.resource_type = 'project'
        and rp.permission_key = p_action
        and rp.is_allowed = true
      limit 1
    ) then
      return true;
    end if;
  end if;

  -- 5) Base inheritance (projects only; team+project coupled)
  if p_resource_type = 'project'::resource_type then
    if exists (
      select 1
      from public.user_roles ur_base
      join public.bases_teams bt
        on ur_base.context_id::uuid = bt.base_id
       and bt.unassigned_at is null
      join public.projects_teams pt
        on pt.team_id = bt.team_id
       and pt.project_id = p_resource_id
       and pt.unassigned_at is null
      join public.role_permissions rp on rp.role_id = ur_base.role_id
      where ur_base.user_id = p_user_id
        and ur_base.context_type = 'base'
        and rp.resource_type = 'project'
        and rp.permission_key = p_action
        and rp.is_allowed = true
      limit 1
    ) then
      return true;
    end if;
  end if;

  -- 6) Partner inheritance (projects only)
  if p_resource_type = 'project'::resource_type then
    if exists (
      select 1
      from public.user_roles ur_partner
      join public.partner_orgs_projects pop
        on ur_partner.context_id::uuid = pop.partner_org_id
       and pop.project_id = p_resource_id
       and pop.unassigned_at is null
      join public.role_permissions rp on rp.role_id = ur_partner.role_id
      where ur_partner.user_id = p_user_id
        and ur_partner.context_type = 'partner'
        and rp.resource_type = 'project'
        and rp.permission_key = p_action
        and rp.is_allowed = true
      limit 1
    ) then
      return true;
    end if;
  end if;

  return false;
end;
$$;
