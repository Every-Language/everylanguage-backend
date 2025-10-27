-- Idempotent seed for roles and role_permissions
-- Uses LEFT JOIN/NOT EXISTS instead of ON CONFLICT (works without unique constraints)
WITH
  desired_roles (resource_type, role_key, name) AS (
    VALUES
      (
        'project'::resource_type,
        'project_viewer',
        'Project Viewer'
      ),
      (
        'project'::resource_type,
        'project_editor',
        'Project Editor'
      ),
      (
        'project'::resource_type,
        'project_admin',
        'Project Admin'
      ),
      (
        'team'::resource_type,
        'team_member',
        'Team Member'
      ),
      (
        'team'::resource_type,
        'team_leader',
        'Team Leader'
      ),
      ('team'::resource_type, 'team_admin', 'Team Admin'),
      (
        'base'::resource_type,
        'base_member',
        'Base Member'
      ),
      (
        'base'::resource_type,
        'base_leader',
        'Base Leader'
      ),
      ('base'::resource_type, 'base_admin', 'Base Admin'),
      (
        'partner'::resource_type,
        'partner_member',
        'Partner Organization Member'
      ),
      (
        'partner'::resource_type,
        'partner_leader',
        'Partner Organization Leader'
      ),
      (
        'partner'::resource_type,
        'partner_admin',
        'Partner Organization Admin'
      ),
      (
        'global'::resource_type,
        'system_admin',
        'System Admin'
      )
  ),
  ins_roles AS (
    INSERT INTO
      public.roles (id, name, role_key, resource_type)
    SELECT
      GEN_RANDOM_UUID(),
      d.name,
      d.role_key,
      d.resource_type
    FROM
      desired_roles d
      LEFT JOIN public.roles r ON r.resource_type = d.resource_type
      AND r.role_key = d.role_key
    WHERE
      r.id IS NULL
    RETURNING
      id,
      resource_type,
      role_key
  ),
  upd_roles AS (
    UPDATE public.roles r
    SET
      name = d.name
    FROM
      desired_roles d
    WHERE
      r.resource_type = d.resource_type
      AND r.role_key = d.role_key
      AND r.name IS DISTINCT FROM d.name
    RETURNING
      r.id,
      r.resource_type,
      r.role_key
  ),
  role_map AS (
    SELECT
      id,
      resource_type,
      role_key
    FROM
      ins_roles
    UNION ALL
    SELECT
      id,
      resource_type,
      role_key
    FROM
      public.roles
    WHERE
      (resource_type, role_key) IN (
        ('project'::resource_type, 'project_viewer'),
        ('project'::resource_type, 'project_editor'),
        ('project'::resource_type, 'project_admin'),
        ('team'::resource_type, 'team_member'),
        ('team'::resource_type, 'team_leader'),
        ('team'::resource_type, 'team_admin'),
        ('base'::resource_type, 'base_member'),
        ('base'::resource_type, 'base_leader'),
        ('base'::resource_type, 'base_admin'),
        ('partner'::resource_type, 'partner_member'),
        ('partner'::resource_type, 'partner_leader'),
        ('partner'::resource_type, 'partner_admin'),
        ('global'::resource_type, 'system_admin')
      )
  ),
  desired_perms (resource_type, role_key, permission_key) AS (
    VALUES
      -- project
      (
        'project'::resource_type,
        'project_viewer',
        'project.read'::permission_key
      ),
      (
        'project'::resource_type,
        'project_viewer',
        'budget.read'::permission_key
      ),
      (
        'project'::resource_type,
        'project_viewer',
        'contribution.read'::permission_key
      ),
      (
        'project'::resource_type,
        'project_editor',
        'project.read'::permission_key
      ),
      (
        'project'::resource_type,
        'project_editor',
        'budget.read'::permission_key
      ),
      (
        'project'::resource_type,
        'project_editor',
        'contribution.read'::permission_key
      ),
      (
        'project'::resource_type,
        'project_editor',
        'project.write'::permission_key
      ),
      (
        'project'::resource_type,
        'project_admin',
        'project.read'::permission_key
      ),
      (
        'project'::resource_type,
        'project_admin',
        'budget.read'::permission_key
      ),
      (
        'project'::resource_type,
        'project_admin',
        'budget.write'::permission_key
      ),
      (
        'project'::resource_type,
        'project_admin',
        'contribution.read'::permission_key
      ),
      (
        'project'::resource_type,
        'project_admin',
        'project.write'::permission_key
      ),
      (
        'project'::resource_type,
        'project_admin',
        'project.delete'::permission_key
      ),
      (
        'project'::resource_type,
        'project_admin',
        'project.manage_roles'::permission_key
      ),
      -- team
      (
        'team'::resource_type,
        'team_member',
        'team.read'::permission_key
      ),
      (
        'team'::resource_type,
        'team_leader',
        'team.read'::permission_key
      ),
      (
        'team'::resource_type,
        'team_leader',
        'team.write'::permission_key
      ),
      (
        'team'::resource_type,
        'team_admin',
        'team.read'::permission_key
      ),
      (
        'team'::resource_type,
        'team_admin',
        'team.write'::permission_key
      ),
      (
        'team'::resource_type,
        'team_admin',
        'team.delete'::permission_key
      ),
      (
        'team'::resource_type,
        'team_admin',
        'team.manage_roles'::permission_key
      ),
      -- base
      (
        'base'::resource_type,
        'base_member',
        'base.read'::permission_key
      ),
      (
        'base'::resource_type,
        'base_leader',
        'base.read'::permission_key
      ),
      (
        'base'::resource_type,
        'base_leader',
        'base.write'::permission_key
      ),
      (
        'base'::resource_type,
        'base_admin',
        'base.read'::permission_key
      ),
      (
        'base'::resource_type,
        'base_admin',
        'base.write'::permission_key
      ),
      (
        'base'::resource_type,
        'base_admin',
        'base.delete'::permission_key
      ),
      (
        'base'::resource_type,
        'base_admin',
        'base.manage_roles'::permission_key
      ),
      -- partner
      (
        'partner'::resource_type,
        'partner_member',
        'partner.read'::permission_key
      ),
      (
        'partner'::resource_type,
        'partner_member',
        'contribution.read'::permission_key
      ),
      (
        'partner'::resource_type,
        'partner_leader',
        'partner.read'::permission_key
      ),
      (
        'partner'::resource_type,
        'partner_leader',
        'contribution.read'::permission_key
      ),
      (
        'partner'::resource_type,
        'partner_leader',
        'contribution.write'::permission_key
      ),
      (
        'partner'::resource_type,
        'partner_admin',
        'partner.read'::permission_key
      ),
      (
        'partner'::resource_type,
        'partner_admin',
        'partner.manage_roles'::permission_key
      ),
      (
        'partner'::resource_type,
        'partner_admin',
        'contribution.read'::permission_key
      ),
      (
        'partner'::resource_type,
        'partner_admin',
        'contribution.write'::permission_key
      ),
      -- global
      (
        'global'::resource_type,
        'system_admin',
        'system.admin'::permission_key
      )
  ),
  ins_perms AS (
    INSERT INTO
      public.role_permissions (
        role_id,
        resource_type,
        permission_key,
        is_allowed
      )
    SELECT
      rm.id,
      dp.resource_type,
      dp.permission_key,
      TRUE
    FROM
      desired_perms dp
      JOIN role_map rm ON rm.resource_type = dp.resource_type
      AND rm.role_key = dp.role_key
      LEFT JOIN public.role_permissions rp ON rp.role_id = rm.id
      AND rp.resource_type = dp.resource_type
      AND rp.permission_key = dp.permission_key
    WHERE
      rp.id IS NULL
    RETURNING
      1
  ),
  upd_perms AS (
    UPDATE public.role_permissions rp
    SET
      is_allowed = TRUE
    FROM
      desired_perms dp
      JOIN role_map rm ON rm.resource_type = dp.resource_type
      AND rm.role_key = dp.role_key
    WHERE
      rp.role_id = rm.id
      AND rp.resource_type = dp.resource_type
      AND rp.permission_key = dp.permission_key
      AND rp.is_allowed IS DISTINCT FROM TRUE
    RETURNING
      1
  )
SELECT
  'ok';
