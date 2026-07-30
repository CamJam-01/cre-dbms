create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.land_sales (
  id uuid primary key default gen_random_uuid(),
  property_name text not null,
  address text not null default '',
  sale_date date not null,
  sale_price numeric(15,2) not null check (sale_price >= 0),
  acreage numeric(12,4) not null check (acreage > 0),
  seller text not null default '',
  buyer text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index land_sales_sale_date_idx on public.land_sales (sale_date desc);
create index land_sales_property_name_idx on public.land_sales (property_name);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger land_sales_set_updated_at before update on public.land_sales for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email, full_name = case when excluded.full_name <> '' then excluded.full_name else public.users.full_name end;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.land_sales enable row level security;
create policy "authenticated users can read users" on public.users for select to authenticated using (true);
create policy "authenticated users can insert users" on public.users for insert to authenticated with check (true);
create policy "authenticated users can update users" on public.users for update to authenticated using (true) with check (true);
create policy "authenticated users can delete users" on public.users for delete to authenticated using (true);
create policy "authenticated users can read land sales" on public.land_sales for select to authenticated using (true);
create policy "authenticated users can insert land sales" on public.land_sales for insert to authenticated with check (true);
create policy "authenticated users can update land sales" on public.land_sales for update to authenticated using (true) with check (true);
create policy "authenticated users can delete land sales" on public.land_sales for delete to authenticated using (true);
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.land_sales to authenticated;
