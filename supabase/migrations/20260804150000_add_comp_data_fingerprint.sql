-- Enforce concurrency-safe deduplication for the compatibility Comp Data table.
-- The fingerprint is generated in the database so every write path uses the
-- same normalization rules as the CSV import UI.

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
