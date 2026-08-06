-- Enforce concurrency-safe deduplication for the compatibility Comp Data table.
-- The fingerprint is generated in the database so every write path uses the
-- same normalization rules as the CSV import UI.

-- The hosted project contains this legacy compatibility table, but the original
-- local baseline migration omitted it. Keep clean local resets equivalent to
-- the hosted schema before applying the fingerprint change.
create table if not exists public.comp_data (
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

create index if not exists comp_data_sale_date_idx on public.comp_data (sale_date desc);
create index if not exists comp_data_property_name_idx on public.comp_data (property_name);
alter table public.comp_data enable row level security;
drop policy if exists "authenticated users can read land sales" on public.comp_data;
create policy "authenticated users can read land sales" on public.comp_data for select to authenticated using (true);
drop policy if exists "authenticated users can insert land sales" on public.comp_data;
create policy "authenticated users can insert land sales" on public.comp_data for insert to authenticated with check (true);
drop policy if exists "authenticated users can update land sales" on public.comp_data;
create policy "authenticated users can update land sales" on public.comp_data for update to authenticated using (true) with check (true);
drop policy if exists "authenticated users can delete land sales" on public.comp_data;
create policy "authenticated users can delete land sales" on public.comp_data for delete to authenticated using (true);
grant select, insert, update, delete on public.comp_data to authenticated;

drop trigger if exists comp_data_set_updated_at on public.comp_data;
create trigger comp_data_set_updated_at before update on public.comp_data for each row execute function public.set_updated_at();

alter table public.comp_data
  add column if not exists record_fingerprint text;

create or replace function public.set_comp_data_fingerprint()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.record_fingerprint := md5(concat_ws(chr(31),
    lower(trim(new.property_name)),
    lower(trim(new.address)),
    new.sale_date::text,
    new.sale_price::numeric::text,
    new.acreage::numeric::text,
    lower(trim(new.seller)),
    lower(trim(new.buyer)),
    lower(trim(new.notes))
  ));
  return new;
end;
$$;

update public.comp_data
set record_fingerprint = md5(concat_ws(chr(31),
  lower(trim(property_name)),
  lower(trim(address)),
  sale_date::text,
  sale_price::numeric::text,
  acreage::numeric::text,
  lower(trim(seller)),
  lower(trim(buyer)),
  lower(trim(notes))
))
where record_fingerprint is null;

alter table public.comp_data
  alter column record_fingerprint set not null;

create unique index if not exists comp_data_record_fingerprint_key
  on public.comp_data (record_fingerprint);

drop trigger if exists comp_data_set_fingerprint on public.comp_data;
create trigger comp_data_set_fingerprint
before insert or update of property_name, address, sale_date, sale_price,
  acreage, seller, buyer, notes
on public.comp_data
for each row execute function public.set_comp_data_fingerprint();
