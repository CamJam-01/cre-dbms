-- Ensure View creation verifies both Workspace membership and Table ownership
-- of the submitted Workspace/Table pair.
drop policy if exists saved_views_create on public.saved_views;
create policy saved_views_create on public.saved_views
for insert to authenticated
with check (
  private.has_workspace_access(workspace_id)
  and created_by = (select auth.uid())
  and exists (
    select 1
    from public.data_tables dt
    where dt.id = saved_views.table_id
      and dt.workspace_id = saved_views.workspace_id
  )
);
