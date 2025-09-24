-- RLS fixes: parent INSERT policies and join-table RLS/policies
-- - Fix INSERT policies for parents to allow owner-or-admin creation
-- - Add RLS and policies for projects_teams, bases_teams, partner_orgs_projects
-- =============================
-- Add created_by to bases and teams (ownership)
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.teams ADD COLUMN created_by uuid NULL REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bases' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.bases ADD COLUMN created_by uuid NULL REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END$$;


-- =============================
-- Parent INSERT policy fixes
-- =============================
-- Projects: allow insert only when created_by = auth.uid()
DROP POLICY if EXISTS projects_insert_with_permission ON public.projects;


CREATE POLICY projects_insert_with_permission ON public.projects FOR insert
WITH
  CHECK (created_by = auth.uid ());


-- Bases: allow insert only when system admin AND created_by = auth.uid()
DROP POLICY if EXISTS bases_insert_with_permission ON public.bases;


CREATE POLICY bases_insert_with_permission ON public.bases FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE
        ur.user_id = auth.uid ()
        AND rp.resource_type = 'global'::resource_type
        AND rp.permission_key = 'system.admin'::permission_key
        AND rp.is_allowed = TRUE
      LIMIT
        1
    )
  );


-- Teams: allow insert only when created_by = auth.uid() AND (system admin OR base staff/admin)
DROP POLICY if EXISTS teams_insert_with_permission ON public.teams;


CREATE POLICY teams_insert_with_permission ON public.teams FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND (
      -- system admin
      EXISTS (
        SELECT
          1
        FROM
          public.user_roles ur
          JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        WHERE
          ur.user_id = auth.uid ()
          AND rp.resource_type = 'global'::resource_type
          AND rp.permission_key = 'system.admin'::permission_key
          AND rp.is_allowed = TRUE
        LIMIT
          1
      )
      OR
      -- base leader/staff or base admin (base.write or base.manage_roles on any base)
      EXISTS (
        SELECT
          1
        FROM
          public.user_roles ur
          JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        WHERE
          ur.user_id = auth.uid ()
          AND ur.context_type = 'base'
          AND rp.resource_type = 'base'::resource_type
          AND rp.permission_key IN (
            'base.write'::permission_key,
            'base.manage_roles'::permission_key
          )
          AND rp.is_allowed = TRUE
        LIMIT
          1
      )
    )
  );


-- Partner Orgs: allow insert only when system admin AND created_by = auth.uid()
DROP POLICY if EXISTS partner_orgs_insert_with_permission ON public.partner_orgs;


CREATE POLICY partner_orgs_insert_with_permission ON public.partner_orgs FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE
        ur.user_id = auth.uid ()
        AND rp.resource_type = 'global'::resource_type
        AND rp.permission_key = 'system.admin'::permission_key
        AND rp.is_allowed = TRUE
      LIMIT
        1
    )
  );


-- =============================
-- Join tables: enable RLS and gate writes by manage_roles
-- =============================
-- projects_teams
ALTER TABLE public.projects_teams enable ROW level security;


-- Optional: public-ish SELECT (derives from publicly readable projects)
DROP POLICY if EXISTS projects_teams_select_public ON public.projects_teams;


CREATE POLICY projects_teams_select_public ON public.projects_teams FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.projects p
      WHERE
        p.id = projects_teams.project_id
    )
  );


-- Write operations require project.manage_roles on the linked project
DROP POLICY if EXISTS projects_teams_insert_with_manage ON public.projects_teams;


CREATE POLICY projects_teams_insert_with_manage ON public.projects_teams FOR insert
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.manage_roles',
      'project',
      project_id
    )
    AND (
      project_role_id IS NULL
      OR EXISTS (
        SELECT
          1
        FROM
          public.roles r
        WHERE
          r.id = project_role_id
          AND r.resource_type = 'project'
      )
    )
  );


DROP POLICY if EXISTS projects_teams_update_with_manage ON public.projects_teams;


CREATE POLICY projects_teams_update_with_manage ON public.projects_teams
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'project.manage_roles',
      'project',
      project_id
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.manage_roles',
      'project',
      project_id
    )
    AND (
      project_role_id IS NULL
      OR EXISTS (
        SELECT
          1
        FROM
          public.roles r
        WHERE
          r.id = project_role_id
          AND r.resource_type = 'project'
      )
    )
  );


DROP POLICY if EXISTS projects_teams_delete_with_manage ON public.projects_teams;


CREATE POLICY projects_teams_delete_with_manage ON public.projects_teams FOR delete USING (
  public.has_permission (
    auth.uid (),
    'project.manage_roles',
    'project',
    project_id
  )
);


-- bases_teams
ALTER TABLE public.bases_teams enable ROW level security;


-- Optional: public-ish SELECT (derives from publicly readable bases)
DROP POLICY if EXISTS bases_teams_select_public ON public.bases_teams;


CREATE POLICY bases_teams_select_public ON public.bases_teams FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.bases b
      WHERE
        b.id = bases_teams.base_id
    )
  );


-- Write operations require base.manage_roles on the linked base
DROP POLICY if EXISTS bases_teams_insert_with_manage ON public.bases_teams;


CREATE POLICY bases_teams_insert_with_manage ON public.bases_teams FOR insert
WITH
  CHECK (
    public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
  );


DROP POLICY if EXISTS bases_teams_update_with_manage ON public.bases_teams;


CREATE POLICY bases_teams_update_with_manage ON public.bases_teams
FOR UPDATE
  USING (
    public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
  );


DROP POLICY if EXISTS bases_teams_delete_with_manage ON public.bases_teams;


CREATE POLICY bases_teams_delete_with_manage ON public.bases_teams FOR delete USING (
  public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
);


-- partner_orgs_projects
ALTER TABLE public.partner_orgs_projects enable ROW level security;


-- Optional: public-ish SELECT (derives from publicly readable projects/partners)
DROP POLICY if EXISTS partner_orgs_projects_select_public ON public.partner_orgs_projects;


CREATE POLICY partner_orgs_projects_select_public ON public.partner_orgs_projects FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.projects p
      WHERE
        p.id = partner_orgs_projects.project_id
    )
    AND EXISTS (
      SELECT
        1
      FROM
        public.partner_orgs po
      WHERE
        po.id = partner_orgs_projects.partner_org_id
    )
  );


-- Write operations require partner.manage_roles on the linked partner_org
DROP POLICY if EXISTS partner_orgs_projects_insert_with_manage ON public.partner_orgs_projects;


CREATE POLICY partner_orgs_projects_insert_with_manage ON public.partner_orgs_projects FOR insert
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      partner_org_id
    )
  );


DROP POLICY if EXISTS partner_orgs_projects_update_with_manage ON public.partner_orgs_projects;


CREATE POLICY partner_orgs_projects_update_with_manage ON public.partner_orgs_projects
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      partner_org_id
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      partner_org_id
    )
  );


DROP POLICY if EXISTS partner_orgs_projects_delete_with_manage ON public.partner_orgs_projects;


CREATE POLICY partner_orgs_projects_delete_with_manage ON public.partner_orgs_projects FOR delete USING (
  public.has_permission (
    auth.uid (),
    'partner.manage_roles',
    'partner',
    partner_org_id
  )
);


-- =============================
-- Ownership indexes
-- =============================
CREATE INDEX if NOT EXISTS projects_created_by_idx ON public.projects (created_by);


CREATE INDEX if NOT EXISTS partner_orgs_created_by_idx ON public.partner_orgs (created_by);


CREATE INDEX if NOT EXISTS teams_created_by_idx ON public.teams (created_by);


CREATE INDEX if NOT EXISTS bases_created_by_idx ON public.bases (created_by);


-- =============================
-- Tags RLS: insert/update/delete limited by created_by ownership
-- =============================
DROP POLICY if EXISTS tags_insert_own ON public.tags;


CREATE POLICY tags_insert_own ON public.tags FOR insert
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS tags_update_own ON public.tags;


CREATE POLICY tags_update_own ON public.tags
FOR UPDATE
  USING (created_by = auth.uid ())
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS tags_delete_own ON public.tags;


CREATE POLICY tags_delete_own ON public.tags FOR delete USING (created_by = auth.uid ());
