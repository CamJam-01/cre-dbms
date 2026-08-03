-- Configurable, permissioned data tables for Vantage CRE.
-- The existing shared Comp Data table is migrated into the first workspace table.

create schema if not exists private;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_tables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  owner_id uuid not null references public.users(id) on delete restrict,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table if not exists public.data_table_members (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.data_tables(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor', 'operator', 'admin')),
  created_at timestamptz not null default now(),
  unique (table_id, user_id)
);

create table if not exists public.data_table_fields (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.data_tables(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null check (field_type in ('text', 'long_text', 'number', 'currency', 'date', 'boolean', 'single_select', 'multi_select', 'image')),
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  display_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (table_id, field_key)
);

create table if not exists public.data_table_rows (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.data_tables(id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.users(id) on delete restrict,
  updated_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_row_images (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.data_table_rows(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 10485760),
  display_order integer not null default 0,
  is_thumbnail boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.docx_templates (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.data_tables(id) on delete cascade,
  name text not null,
  description text not null default '',
  storage_path text not null unique,
  supported_fields jsonb not null default '[]'::jsonb,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists data_tables_workspace_idx on public.data_tables(workspace_id);
create index if not exists data_table_members_user_idx on public.data_table_members(user_id);
create index if not exists data_table_fields_table_idx on public.data_table_fields(table_id, display_order);
create index if not exists data_table_rows_table_idx on public.data_table_rows(table_id, updated_at desc);
create index if not exists data_row_images_row_idx on public.data_row_images(row_id, display_order);

create or replace function private.table_role(p_table_id uuid, p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select case when dt.owner_id = p_user_id then 'admin' else coalesce(m.role, '') end
  from public.data_tables dt
  left join public.data_table_members m on m.table_id = dt.id and m.user_id = p_user_id
  where dt.id = p_table_id;
$$;

create or replace function private.has_table_access(p_table_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, private as $$
  select coalesce(private.table_role(p_table_id, p_user_id) in ('viewer', 'editor', 'operator', 'admin'), false);
$$;

create or replace function private.has_table_role(p_table_id uuid, p_roles text[], p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, private as $$
  select coalesce(private.table_role(p_table_id, p_user_id) = any(p_roles), false);
$$;

revoke all on function private.table_role(uuid, uuid) from public;
revoke all on function private.has_table_access(uuid, uuid) from public;
revoke all on function private.has_table_role(uuid, text[], uuid) from public;
grant execute on function private.table_role(uuid, uuid) to authenticated;
grant execute on function private.has_table_access(uuid, uuid) to authenticated;
grant execute on function private.has_table_role(uuid, text[], uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.data_tables enable row level security;
alter table public.data_table_members enable row level security;
alter table public.data_table_fields enable row level security;
alter table public.data_table_rows enable row level security;
alter table public.data_row_images enable row level security;
alter table public.docx_templates enable row level security;

drop policy if exists workspace_access on public.workspaces;
create policy workspace_access on public.workspaces for select to authenticated
using (owner_id = (select auth.uid()) or exists (select 1 from public.data_tables dt join public.data_table_members m on m.table_id = dt.id where dt.workspace_id = workspaces.id and m.user_id = (select auth.uid())));
drop policy if exists workspace_create on public.workspaces;
create policy workspace_create on public.workspaces for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists workspace_update on public.workspaces;
create policy workspace_update on public.workspaces for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists workspace_delete on public.workspaces;
create policy workspace_delete on public.workspaces for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists data_tables_access on public.data_tables;
create policy data_tables_access on public.data_tables for select to authenticated using (owner_id = (select auth.uid()) or private.has_table_access(id));
drop policy if exists data_tables_create on public.data_tables;
create policy data_tables_create on public.data_tables for insert to authenticated with check (owner_id = (select auth.uid()) and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));
drop policy if exists data_tables_update on public.data_tables;
create policy data_tables_update on public.data_tables for update to authenticated using (private.has_table_role(id, array['admin'])) with check (private.has_table_role(id, array['admin']));
drop policy if exists data_tables_delete on public.data_tables;
create policy data_tables_delete on public.data_tables for delete to authenticated using (private.has_table_role(id, array['admin']));

drop policy if exists data_table_members_access on public.data_table_members;
create policy data_table_members_access on public.data_table_members for select to authenticated using (private.has_table_access(table_id));
drop policy if exists data_table_members_manage on public.data_table_members;
create policy data_table_members_manage on public.data_table_members for all to authenticated using (private.has_table_role(table_id, array['admin'])) with check (private.has_table_role(table_id, array['admin']));

drop policy if exists data_table_fields_access on public.data_table_fields;
create policy data_table_fields_access on public.data_table_fields for select to authenticated using (private.has_table_access(table_id));
drop policy if exists data_table_fields_manage on public.data_table_fields;
create policy data_table_fields_manage on public.data_table_fields for all to authenticated using (private.has_table_role(table_id, array['admin'])) with check (private.has_table_role(table_id, array['admin']));

drop policy if exists data_table_rows_access on public.data_table_rows;
create policy data_table_rows_access on public.data_table_rows for select to authenticated using (private.has_table_access(table_id));
drop policy if exists data_table_rows_create on public.data_table_rows;
create policy data_table_rows_create on public.data_table_rows for insert to authenticated with check (private.has_table_role(table_id, array['operator', 'admin']) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
drop policy if exists data_table_rows_update on public.data_table_rows;
create policy data_table_rows_update on public.data_table_rows for update to authenticated using (private.has_table_role(table_id, array['editor', 'operator', 'admin'])) with check (private.has_table_role(table_id, array['editor', 'operator', 'admin']) and updated_by = (select auth.uid()));
drop policy if exists data_table_rows_delete on public.data_table_rows;
create policy data_table_rows_delete on public.data_table_rows for delete to authenticated using (private.has_table_role(table_id, array['operator', 'admin']));

drop policy if exists data_row_images_access on public.data_row_images;
create policy data_row_images_access on public.data_row_images for select to authenticated using (exists (select 1 from public.data_table_rows r where r.id = row_id and private.has_table_access(r.table_id)));
drop policy if exists data_row_images_insert on public.data_row_images;
create policy data_row_images_insert on public.data_row_images for insert to authenticated with check (exists (select 1 from public.data_table_rows r where r.id = row_id and private.has_table_role(r.table_id, array['operator', 'admin'])));
drop policy if exists data_row_images_update on public.data_row_images;
create policy data_row_images_update on public.data_row_images for update to authenticated using (exists (select 1 from public.data_table_rows r where r.id = row_id and private.has_table_role(r.table_id, array['operator', 'admin']))) with check (exists (select 1 from public.data_table_rows r where r.id = row_id and private.has_table_role(r.table_id, array['operator', 'admin'])));
drop policy if exists data_row_images_delete on public.data_row_images;
create policy data_row_images_delete on public.data_row_images for delete to authenticated using (exists (select 1 from public.data_table_rows r where r.id = row_id and private.has_table_role(r.table_id, array['operator', 'admin'])));

drop policy if exists docx_templates_access on public.docx_templates;
create policy docx_templates_access on public.docx_templates for select to authenticated using (private.has_table_access(table_id));
drop policy if exists docx_templates_manage on public.docx_templates;
create policy docx_templates_manage on public.docx_templates for all to authenticated using (private.has_table_role(table_id, array['admin'])) with check (private.has_table_role(table_id, array['admin']) and uploaded_by = (select auth.uid()));

grant select, insert, update, delete on public.workspaces, public.data_tables, public.data_table_members, public.data_table_fields, public.data_table_rows, public.data_row_images, public.docx_templates to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comp-images', 'comp-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('docx-templates', 'docx-templates', false, 20971520, array['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

drop policy if exists comp_images_select on storage.objects;
create policy comp_images_select on storage.objects for select to authenticated using (bucket_id = 'comp-images' and private.has_table_access(((storage.foldername(name))[1])::uuid));
drop policy if exists comp_images_insert on storage.objects;
create policy comp_images_insert on storage.objects for insert to authenticated with check (bucket_id = 'comp-images' and private.has_table_role(((storage.foldername(name))[1])::uuid, array['operator', 'admin']));
drop policy if exists comp_images_update on storage.objects;
create policy comp_images_update on storage.objects for update to authenticated using (bucket_id = 'comp-images' and private.has_table_role(((storage.foldername(name))[1])::uuid, array['operator', 'admin'])) with check (bucket_id = 'comp-images' and private.has_table_role(((storage.foldername(name))[1])::uuid, array['operator', 'admin']));
drop policy if exists comp_images_delete on storage.objects;
create policy comp_images_delete on storage.objects for delete to authenticated using (bucket_id = 'comp-images' and private.has_table_role(((storage.foldername(name))[1])::uuid, array['operator', 'admin']));

drop policy if exists docx_templates_select on storage.objects;
create policy docx_templates_select on storage.objects for select to authenticated using (bucket_id = 'docx-templates' and private.has_table_access(((storage.foldername(name))[1])::uuid));
drop policy if exists docx_templates_insert on storage.objects;
create policy docx_templates_insert on storage.objects for insert to authenticated with check (bucket_id = 'docx-templates' and private.has_table_role(((storage.foldername(name))[1])::uuid, array['admin']));
drop policy if exists docx_templates_delete on storage.objects;
create policy docx_templates_delete on storage.objects for delete to authenticated using (bucket_id = 'docx-templates' and private.has_table_role(((storage.foldername(name))[1])::uuid, array['admin']));

-- Bootstrap one shared workspace/table for the existing POC users and records.
do $$
declare
  v_owner uuid;
  v_workspace uuid;
  v_table uuid;
begin
  select id into v_owner from public.users order by created_at limit 1;
  if v_owner is null then return; end if;
  select id into v_workspace from public.workspaces order by created_at limit 1;
  if v_workspace is null then
    insert into public.workspaces (name, owner_id) values ('Vantage CRE Workspace', v_owner) returning id into v_workspace;
  end if;
  select id into v_table from public.data_tables where workspace_id = v_workspace and slug = 'comp-data';
  if v_table is null then
    insert into public.data_tables (workspace_id, name, slug, description, owner_id) values (v_workspace, 'Comp Data', 'comp-data', 'Commercial real estate comparables.', v_owner) returning id into v_table;
    insert into public.data_table_members (table_id, user_id, role) select v_table, id, case when id = v_owner then 'admin' else 'operator' end from public.users on conflict do nothing;
    insert into public.data_table_fields (table_id, field_key, label, field_type, required, display_order) values
      (v_table, 'property_name', 'Property name', 'text', true, 1),
      (v_table, 'address', 'Address', 'text', true, 2),
      (v_table, 'sale_date', 'Sale date', 'date', true, 3),
      (v_table, 'sale_price', 'Sale price', 'currency', true, 4),
      (v_table, 'acreage', 'Acreage', 'number', true, 5),
      (v_table, 'seller', 'Seller', 'text', true, 6),
      (v_table, 'buyer', 'Buyer', 'text', true, 7),
      (v_table, 'notes', 'Notes', 'long_text', false, 8);
    if to_regclass('public.comp_data') is not null then
      insert into public.data_table_rows (id, table_id, values, created_by, updated_by, created_at, updated_at)
      select id, v_table, jsonb_build_object('property_name', property_name, 'address', address, 'sale_date', sale_date, 'sale_price', sale_price, 'acreage', acreage, 'seller', seller, 'buyer', buyer, 'notes', notes), v_owner, v_owner, created_at, updated_at from public.comp_data on conflict (id) do nothing;
    end if;
    if to_regclass('public.land_sales') is not null then
      insert into public.data_table_rows (id, table_id, values, created_by, updated_by, created_at, updated_at)
      select id, v_table, jsonb_build_object('property_name', property_name, 'address', address, 'sale_date', sale_date, 'sale_price', sale_price, 'acreage', acreage, 'seller', seller, 'buyer', buyer, 'notes', notes), v_owner, v_owner, created_at, updated_at from public.land_sales on conflict (id) do nothing;
    end if;
  end if;
end $$;
