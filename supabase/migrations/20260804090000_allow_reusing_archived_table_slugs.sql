-- Archived tables should not reserve active names in a workspace.
alter table public.data_tables
  drop constraint if exists data_tables_workspace_id_slug_key;

create unique index if not exists data_tables_workspace_id_slug_active_key
  on public.data_tables (workspace_id, slug)
  where is_archived = false;
