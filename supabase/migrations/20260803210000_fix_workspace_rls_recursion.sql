-- Prevent workspace SELECT policy evaluation from recursively re-entering
-- data_tables policies through the membership lookup.
create or replace function private.has_workspace_access(
  p_workspace_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = p_workspace_id
      and w.owner_id = p_user_id
  )
  or exists (
    select 1
    from public.data_tables dt
    join public.data_table_members m on m.table_id = dt.id
    where dt.workspace_id = p_workspace_id
      and m.user_id = p_user_id
  );
$$;

drop policy if exists workspace_access on public.workspaces;
create policy workspace_access
on public.workspaces
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or private.has_workspace_access(id)
);
