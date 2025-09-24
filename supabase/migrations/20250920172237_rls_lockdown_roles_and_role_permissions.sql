-- Lock down roles and role_permissions to service role or system admin
-- Enable RLS on roles/role_permissions
ALTER TABLE public.roles enable ROW level security;


ALTER TABLE public.role_permissions enable ROW level security;


-- SELECT policies: service_role or system admin
DROP POLICY if EXISTS roles_select_allowed ON public.roles;


CREATE POLICY roles_select_allowed ON public.roles FOR
SELECT
  USING (
    auth.role () = 'service_role'
    OR public.has_permission (
      auth.uid (),
      'system.admin',
      'global',
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  );


DROP POLICY if EXISTS role_permissions_select_allowed ON public.role_permissions;


CREATE POLICY role_permissions_select_allowed ON public.role_permissions FOR
SELECT
  USING (
    auth.role () = 'service_role'
    OR public.has_permission (
      auth.uid (),
      'system.admin',
      'global',
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  );


-- Optional hard lock: Only service_role may write (admins manage via migrations)
DROP POLICY if EXISTS roles_write_service_only ON public.roles;


CREATE POLICY roles_write_service_only ON public.roles FOR ALL USING (auth.role () = 'service_role')
WITH
  CHECK (auth.role () = 'service_role');


DROP POLICY if EXISTS role_permissions_write_service_only ON public.role_permissions;


CREATE POLICY role_permissions_write_service_only ON public.role_permissions FOR ALL USING (auth.role () = 'service_role')
WITH
  CHECK (auth.role () = 'service_role');
