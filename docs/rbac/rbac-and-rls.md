### RBAC model and has_permission helper

This backend uses scoped roles with explicit permissions and inheritance across relationships.

- Core tables

  - `roles(id, name, role_key, resource_type)`
  - `user_roles(user_id, role_id, context_type, context_id)`
  - `role_permissions(role_id, resource_type, permission_key, is_allowed)`
  - `projects_teams(project_id, team_id, project_role_id, assigned_at, unassigned_at)`
  - `bases_teams(base_id, team_id, assigned_at, unassigned_at)`
  - `partner_orgs(id, name, ...)` and `partner_orgs_projects(project_id, partner_org_id, assigned_at, unassigned_at)`

- Enums

  - `resource_type`: `global | team | project | base | partner`
  - `permission_key`: includes keys like `system.admin`, `team.read`, `team.manage_roles`, `project.read`, `project.write`, `project.delete`, `project.invite`, `project.manage_roles`, `base.read`, `base.write`, `base.delete`, `base.manage_roles`, `partner.read`, `partner.manage_roles` (finance keys added later).

- Helper

  - `has_permission(user_id uuid, action permission_key, resource resource_type, resource_id uuid) returns boolean`
  - Evaluation order:
    1. System admin shortcut
    2. Ownership: `created_by = user_id` for shared tables (e.g. `project.read`, `project.write`), tables with `user_id` continue to use direct `user_id = auth.uid()` RLS
    3. Direct role on resource
    4. Team inheritance → project (via `user_roles(context_type='team')` + `projects_teams`); includes optional `project_role_id` that all team members inherit for that project
    5. Base inheritance → project (via `user_roles(context_type='base')` + `bases_teams` + `projects_teams`)
    6. Partner inheritance → project (via `user_roles(context_type='partner')` + `partner_orgs_projects`)

- RLS pattern

  - Projects:
    - SELECT USING: `has_permission(auth.uid(), 'project.read', 'project', id)`
    - INSERT/UPDATE WITH CHECK: `has_permission(auth.uid(), 'project.write', 'project', id)`
    - DELETE USING: `has_permission(auth.uid(), 'project.delete', 'project', id)`
  - Keep per-user tables with simple `user_id = auth.uid()` policies.

- Roles

  - Use domain-specific roles per context (examples):
    - Team: `team_admin`, `team_leader`, `team_member`
    - Project: `project_admin`, `project_editor`, `project_viewer`
    - Base: `base_admin`, `base_staff`, `base_member`
    - Partner: `partner_admin`, `partner_leader`, `partner_member` (plus `partner_billing_admin` later)
    - Global: `system_admin`
  - Map roles to permissions in `role_permissions`.
  - Team/base admins do not automatically gain `project.delete`—only `project_admin` has delete by default.

- Indexing

  - `user_roles(user_id, context_type, context_id)`
  - `role_permissions(role_id, resource_type, permission_key)`
  - `projects_teams(project_id, team_id) where unassigned_at is null`, `(team_id, project_id)`
  - `bases_teams(base_id, team_id) where unassigned_at is null`, `(team_id, base_id)`
  - `partner_orgs_projects(project_id, partner_org_id) where unassigned_at is null`

- Seeding and testing

  - Test seed creates users in `auth.users`, mirrors into `public.users`, seeds roles/permissions, a sample project, project-team linkage with an inherited `project_editor` role, and a partner org linked to the project.
  - To reset locally: `supabase db reset --local`

- Notes
  - `resource_type` is stored alongside `permission_key` to enforce type-safety and enable a future move to generic keys (e.g., `read`, `write`) without renaming keys.
  - Relationship rows maintain soft history via `assigned_at`/`unassigned_at`. Current assignments are those with `unassigned_at is null`.
