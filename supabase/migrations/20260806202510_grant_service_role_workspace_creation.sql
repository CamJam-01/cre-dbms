-- The Workspace creation API authenticates the caller first, then uses the
-- server-only service-role client to create the initial Workspace and its
-- membership rows as one protected operation.
grant select, insert, update, delete on table public.workspaces to service_role;
grant select, insert, update, delete on table public.workspace_members to service_role;
grant select on table public.users to service_role;
