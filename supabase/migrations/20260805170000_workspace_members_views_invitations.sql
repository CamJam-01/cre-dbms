-- Workspace authorization, invitations, saved Views, and shared Templates.
-- Additive migration: legacy table memberships remain available until cleanup verification.

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor', 'admin')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('viewer', 'editor', 'admin')),
  invited_by uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (workspace_id, email, status)
);

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  table_id uuid not null references public.data_tables(id) on delete cascade,
  name text not null,
  search_term text not null default '',
  filters jsonb not null default '{}'::jsonb,
  sort_key text,
  sort_direction text not null default 'asc' check (sort_direction in ('asc', 'desc')),
  is_shared boolean not null default false,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.docx_templates add column if not exists is_shared boolean not null default false;

create index if not exists workspace_members_user_idx on public.workspace_members(user_id);
create index if not exists workspace_invitations_workspace_idx on public.workspace_invitations(workspace_id, status);
create index if not exists saved_views_workspace_idx on public.saved_views(workspace_id, updated_at desc);
create index if not exists saved_views_table_idx on public.saved_views(table_id, updated_at desc);

-- Convert table memberships to Workspace memberships, preserving the strongest role.
insert into public.workspace_members (workspace_id, user_id, role)
select dt.workspace_id,
       m.user_id,
       case max(case m.role when 'admin' then 3 when 'operator' then 2 when 'editor' then 2 else 1 end)
         when 3 then 'admin'
         when 2 then 'editor'
         else 'viewer'
       end
from public.data_table_members m
join public.data_tables dt on dt.id = m.table_id
group by dt.workspace_id, m.user_id
on conflict (workspace_id, user_id) do update
set role = case
  when excluded.role = 'admin' or public.workspace_members.role = 'admin' then 'admin'
  when excluded.role = 'editor' or public.workspace_members.role = 'editor' then 'editor'
  else 'viewer'
end;

insert into public.workspace_members (workspace_id, user_id, role)
select id, owner_id, 'admin'
from public.workspaces
on conflict (workspace_id, user_id) do update set role = 'admin';

create or replace function private.workspace_role(
  p_workspace_id uuid,
  p_user_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select case
    when w.owner_id = p_user_id then 'admin'
    else coalesce(wm.role, '')
  end
  from public.workspaces w
  left join public.workspace_members wm
    on wm.workspace_id = w.id and wm.user_id = p_user_id
  where w.id = p_workspace_id;
$$;

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
  select coalesce(private.workspace_role(p_workspace_id, p_user_id) in ('viewer', 'editor', 'admin'), false);
$$;

create or replace function private.has_workspace_role(
  p_workspace_id uuid,
  p_roles text[],
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(private.workspace_role(p_workspace_id, p_user_id) = any(p_roles), false);
$$;

revoke all on function private.workspace_role(uuid, uuid) from public;
revoke all on function private.has_workspace_access(uuid, uuid) from public;
revoke all on function private.has_workspace_role(uuid, text[], uuid) from public;
grant execute on function private.workspace_role(uuid, uuid) to authenticated;
grant execute on function private.has_workspace_access(uuid, uuid) to authenticated;
grant execute on function private.has_workspace_role(uuid, text[], uuid) to authenticated;

alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.saved_views enable row level security;
alter table public.docx_templates enable row level security;

drop policy if exists workspace_members_access on public.workspace_members;
create policy workspace_members_access on public.workspace_members
for select to authenticated
using (private.has_workspace_access(workspace_id));

drop policy if exists workspace_members_manage on public.workspace_members;
create policy workspace_members_manage on public.workspace_members
for all to authenticated
using (private.has_workspace_role(workspace_id, array['admin']))
with check (private.has_workspace_role(workspace_id, array['admin']));

drop policy if exists workspace_invitations_access on public.workspace_invitations;
create policy workspace_invitations_access on public.workspace_invitations
for select to authenticated
using (
  private.has_workspace_role(workspace_id, array['admin'])
  or lower(email) = lower((select auth.jwt() ->> 'email'))
);

drop policy if exists workspace_invitations_manage on public.workspace_invitations;
create policy workspace_invitations_manage on public.workspace_invitations
for all to authenticated
using (private.has_workspace_role(workspace_id, array['admin']))
with check (
  private.has_workspace_role(workspace_id, array['admin'])
  and invited_by = (select auth.uid())
);

drop policy if exists saved_views_access on public.saved_views;
create policy saved_views_access on public.saved_views
for select to authenticated
using (
  private.has_workspace_access(workspace_id)
  and (is_shared or created_by = (select auth.uid()) or private.has_workspace_role(workspace_id, array['admin']))
);

drop policy if exists saved_views_create on public.saved_views;
create policy saved_views_create on public.saved_views
for insert to authenticated
with check (
  private.has_workspace_access(workspace_id)
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.data_tables dt
    where dt.id = table_id and dt.workspace_id = saved_views.workspace_id
  )
);

drop policy if exists saved_views_update on public.saved_views;
create policy saved_views_update on public.saved_views
for update to authenticated
using (created_by = (select auth.uid()) or private.has_workspace_role(workspace_id, array['admin']))
with check (created_by = (select auth.uid()) or private.has_workspace_role(workspace_id, array['admin']));

drop policy if exists saved_views_delete on public.saved_views;
create policy saved_views_delete on public.saved_views
for delete to authenticated
using (created_by = (select auth.uid()) or private.has_workspace_role(workspace_id, array['admin']));

drop policy if exists workspace_access on public.workspaces;
create policy workspace_access on public.workspaces
for select to authenticated
using (private.has_workspace_access(id));

drop policy if exists workspace_update on public.workspaces;
create policy workspace_update on public.workspaces
for update to authenticated
using (private.has_workspace_role(id, array['admin']))
with check (private.has_workspace_role(id, array['admin']));

drop policy if exists workspace_delete on public.workspaces;
create policy workspace_delete on public.workspaces
for delete to authenticated
using (private.has_workspace_role(id, array['admin']));

drop policy if exists data_tables_access on public.data_tables;
create policy data_tables_access on public.data_tables
for select to authenticated
using (private.has_workspace_access(workspace_id));

drop policy if exists data_tables_create on public.data_tables;
create policy data_tables_create on public.data_tables
for insert to authenticated
with check (
  private.has_workspace_role(workspace_id, array['admin'])
  and owner_id = (select auth.uid())
);

drop policy if exists data_tables_update on public.data_tables;
create policy data_tables_update on public.data_tables
for update to authenticated
using (private.has_workspace_role(workspace_id, array['admin']))
with check (private.has_workspace_role(workspace_id, array['admin']));

drop policy if exists data_tables_delete on public.data_tables;
create policy data_tables_delete on public.data_tables
for delete to authenticated
using (private.has_workspace_role(workspace_id, array['admin']));

drop policy if exists data_table_members_access on public.data_table_members;
create policy data_table_members_access on public.data_table_members
for select to authenticated
using (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_access(dt.workspace_id)));

drop policy if exists data_table_members_manage on public.data_table_members;
create policy data_table_members_manage on public.data_table_members
for all to authenticated
using (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_role(dt.workspace_id, array['admin'])))
with check (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_role(dt.workspace_id, array['admin'])));

drop policy if exists data_table_fields_access on public.data_table_fields;
create policy data_table_fields_access on public.data_table_fields
for select to authenticated
using (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_access(dt.workspace_id)));

drop policy if exists data_table_fields_manage on public.data_table_fields;
create policy data_table_fields_manage on public.data_table_fields
for all to authenticated
using (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_role(dt.workspace_id, array['admin'])))
with check (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_role(dt.workspace_id, array['admin'])));

drop policy if exists data_table_rows_access on public.data_table_rows;
create policy data_table_rows_access on public.data_table_rows
for select to authenticated
using (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_access(dt.workspace_id)));

drop policy if exists data_table_rows_create on public.data_table_rows;
create policy data_table_rows_create on public.data_table_rows
for insert to authenticated
with check (
  exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_role(dt.workspace_id, array['editor', 'admin']))
  and created_by = (select auth.uid()) and updated_by = (select auth.uid())
);

drop policy if exists data_table_rows_update on public.data_table_rows;
create policy data_table_rows_update on public.data_table_rows
for update to authenticated
using (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_role(dt.workspace_id, array['editor', 'admin'])))
with check (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_role(dt.workspace_id, array['editor', 'admin'])));

drop policy if exists data_table_rows_delete on public.data_table_rows;
create policy data_table_rows_delete on public.data_table_rows
for delete to authenticated
using (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_role(dt.workspace_id, array['admin'])));

drop policy if exists docx_templates_access on public.docx_templates;
create policy docx_templates_access on public.docx_templates
for select to authenticated
using (
  exists (
    select 1 from public.data_tables dt
    where dt.id = table_id
      and private.has_workspace_access(dt.workspace_id)
      and (is_shared or uploaded_by = (select auth.uid()) or private.has_workspace_role(dt.workspace_id, array['admin']))
  )
);

drop policy if exists docx_templates_manage on public.docx_templates;
create policy docx_templates_manage on public.docx_templates
for all to authenticated
using (exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_role(dt.workspace_id, array['admin'])))
with check (
  exists (select 1 from public.data_tables dt where dt.id = table_id and private.has_workspace_role(dt.workspace_id, array['admin']))
  and uploaded_by = (select auth.uid())
);

create or replace trigger saved_views_set_updated_at
before update on public.saved_views
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.workspace_members, public.workspace_invitations, public.saved_views to authenticated;
grant select, insert, update, delete on public.docx_templates to authenticated;
