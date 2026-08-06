drop extension if exists "pg_net";

drop trigger if exists "comp_data_set_updated_at" on "public"."comp_data";

drop trigger if exists "land_sales_set_updated_at" on "public"."land_sales";

drop trigger if exists "saved_views_set_updated_at" on "public"."saved_views";

drop policy "authenticated users can delete Comp Data" on "public"."land_sales";

drop policy "authenticated users can insert Comp Data" on "public"."land_sales";

drop policy "authenticated users can read Comp Data" on "public"."land_sales";

drop policy "authenticated users can update Comp Data" on "public"."land_sales";

drop policy "data_row_images_access" on "public"."data_row_images";

drop policy "data_row_images_delete" on "public"."data_row_images";

drop policy "data_row_images_insert" on "public"."data_row_images";

drop policy "data_row_images_update" on "public"."data_row_images";

drop policy "data_table_fields_manage" on "public"."data_table_fields";

drop policy "data_table_members_manage" on "public"."data_table_members";

drop policy "data_table_rows_create" on "public"."data_table_rows";

drop policy "data_table_rows_delete" on "public"."data_table_rows";

drop policy "data_table_rows_update" on "public"."data_table_rows";

drop policy "data_tables_create" on "public"."data_tables";

drop policy "docx_templates_access" on "public"."docx_templates";

drop policy "saved_views_create" on "public"."saved_views";

drop policy "workspace_delete" on "public"."workspaces";

drop policy "workspace_update" on "public"."workspaces";

revoke references on table "public"."land_sales" from "anon";

revoke trigger on table "public"."land_sales" from "anon";

revoke truncate on table "public"."land_sales" from "anon";

revoke delete on table "public"."land_sales" from "authenticated";

revoke insert on table "public"."land_sales" from "authenticated";

revoke references on table "public"."land_sales" from "authenticated";

revoke select on table "public"."land_sales" from "authenticated";

revoke trigger on table "public"."land_sales" from "authenticated";

revoke truncate on table "public"."land_sales" from "authenticated";

revoke update on table "public"."land_sales" from "authenticated";

revoke references on table "public"."land_sales" from "service_role";

revoke trigger on table "public"."land_sales" from "service_role";

revoke truncate on table "public"."land_sales" from "service_role";

alter table "public"."comp_data" drop constraint "comp_data_acreage_check";

alter table "public"."comp_data" drop constraint "comp_data_sale_price_check";

alter table "public"."land_sales" drop constraint "land_sales_acreage_check";

alter table "public"."land_sales" drop constraint "land_sales_sale_price_check";

alter table "public"."workspace_invitations" drop constraint "workspace_invitations_invited_by_fkey";

alter table "public"."workspace_invitations" drop constraint "workspace_invitations_status_check";

alter table "public"."comp_data" drop constraint "comp_data_pkey";

alter table "public"."land_sales" drop constraint "land_sales_pkey";

drop index if exists "public"."comp_data_pkey";

drop index if exists "public"."comp_data_property_name_idx";

drop index if exists "public"."comp_data_sale_date_idx";

drop index if exists "public"."saved_views_workspace_idx";

drop index if exists "public"."land_sales_pkey";

drop index if exists "public"."land_sales_property_name_idx";

drop index if exists "public"."land_sales_sale_date_idx";

drop index if exists "public"."saved_views_table_idx";

drop table "public"."land_sales";

CREATE UNIQUE INDEX land_sales_pkey ON public.comp_data USING btree (id);

CREATE INDEX land_sales_property_name_idx ON public.comp_data USING btree (property_name);

CREATE INDEX land_sales_sale_date_idx ON public.comp_data USING btree (sale_date DESC);

CREATE INDEX saved_views_table_idx ON public.saved_views USING btree (table_id, created_at DESC);

alter table "public"."comp_data" add constraint "land_sales_pkey" PRIMARY KEY using index "land_sales_pkey";

alter table "public"."comp_data" add constraint "land_sales_acreage_check" CHECK ((acreage > (0)::numeric)) not valid;

alter table "public"."comp_data" validate constraint "land_sales_acreage_check";

alter table "public"."comp_data" add constraint "land_sales_sale_price_check" CHECK ((sale_price >= (0)::numeric)) not valid;

alter table "public"."comp_data" validate constraint "land_sales_sale_price_check";

alter table "public"."workspace_invitations" add constraint "workspace_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE RESTRICT not valid;

alter table "public"."workspace_invitations" validate constraint "workspace_invitations_invited_by_fkey";

alter table "public"."workspace_invitations" add constraint "workspace_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text]))) not valid;

alter table "public"."workspace_invitations" validate constraint "workspace_invitations_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.has_table_workspace_role(p_table_id uuid, p_roles text[], p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  select exists (
    select 1 from public.data_tables dt
    where dt.id = p_table_id and private.has_workspace_role(dt.workspace_id, p_roles, p_user_id)
  );
$function$
;

CREATE OR REPLACE FUNCTION private.has_table_access(p_table_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  select coalesce(private.table_role(p_table_id, p_user_id) in ('viewer', 'editor', 'operator', 'admin'), false);
$function$
;

CREATE OR REPLACE FUNCTION private.has_table_role(p_table_id uuid, p_roles text[], p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  select coalesce(private.table_role(p_table_id, p_user_id) = any(p_roles), false);
$function$
;

CREATE OR REPLACE FUNCTION private.table_role(p_table_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  select case when dt.owner_id = p_user_id then 'admin' else coalesce(m.role, '') end
  from public.data_tables dt
  left join public.data_table_members m on m.table_id = dt.id and m.user_id = p_user_id
  where dt.id = p_table_id;
$function$
;

CREATE OR REPLACE FUNCTION private.workspace_role(p_workspace_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  select case when w.owner_id = p_user_id then 'admin' else coalesce(wm.role, '') end
  from public.workspaces w
  left join public.workspace_members wm on wm.workspace_id = w.id and wm.user_id = p_user_id
  where w.id = p_workspace_id;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.users (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update
    set email = excluded.email,
        full_name = case when excluded.full_name <> '' then excluded.full_name else public.users.full_name end;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_comp_data_fingerprint()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.record_fingerprint := md5(concat_ws(chr(31),
    lower(trim(new.property_name)), lower(trim(new.address)), new.sale_date::text,
    new.sale_price::numeric::text, new.acreage::numeric::text,
    lower(trim(new.seller)), lower(trim(new.buyer)), lower(trim(new.notes))
  ));
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;


  create policy "data_row_images_access"
  on "public"."data_row_images"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.data_table_rows r
     JOIN public.data_tables dt ON ((dt.id = r.table_id)))
  WHERE ((r.id = data_row_images.row_id) AND private.has_workspace_access(dt.workspace_id)))));



  create policy "data_row_images_delete"
  on "public"."data_row_images"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.data_table_rows r
  WHERE ((r.id = data_row_images.row_id) AND private.has_table_workspace_role(r.table_id, ARRAY['admin'::text])))));



  create policy "data_row_images_insert"
  on "public"."data_row_images"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.data_table_rows r
  WHERE ((r.id = data_row_images.row_id) AND private.has_table_workspace_role(r.table_id, ARRAY['editor'::text, 'admin'::text])))));



  create policy "data_row_images_update"
  on "public"."data_row_images"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.data_table_rows r
  WHERE ((r.id = data_row_images.row_id) AND private.has_table_workspace_role(r.table_id, ARRAY['editor'::text, 'admin'::text])))))
with check ((EXISTS ( SELECT 1
   FROM public.data_table_rows r
  WHERE ((r.id = data_row_images.row_id) AND private.has_table_workspace_role(r.table_id, ARRAY['editor'::text, 'admin'::text])))));



  create policy "data_table_fields_manage"
  on "public"."data_table_fields"
  as permissive
  for all
  to authenticated
using (private.has_table_workspace_role(table_id, ARRAY['admin'::text]))
with check (private.has_table_workspace_role(table_id, ARRAY['admin'::text]));



  create policy "data_table_members_manage"
  on "public"."data_table_members"
  as permissive
  for all
  to authenticated
using (false)
with check (false);



  create policy "data_table_rows_create"
  on "public"."data_table_rows"
  as permissive
  for insert
  to authenticated
with check ((private.has_table_workspace_role(table_id, ARRAY['admin'::text]) AND (created_by = ( SELECT auth.uid() AS uid)) AND (updated_by = ( SELECT auth.uid() AS uid))));



  create policy "data_table_rows_delete"
  on "public"."data_table_rows"
  as permissive
  for delete
  to authenticated
using (private.has_table_workspace_role(table_id, ARRAY['admin'::text]));



  create policy "data_table_rows_update"
  on "public"."data_table_rows"
  as permissive
  for update
  to authenticated
using (private.has_table_workspace_role(table_id, ARRAY['editor'::text, 'admin'::text]))
with check ((private.has_table_workspace_role(table_id, ARRAY['editor'::text, 'admin'::text]) AND (updated_by = ( SELECT auth.uid() AS uid))));



  create policy "data_tables_create"
  on "public"."data_tables"
  as permissive
  for insert
  to authenticated
with check (((owner_id = ( SELECT auth.uid() AS uid)) AND private.has_workspace_role(workspace_id, ARRAY['admin'::text])));



  create policy "docx_templates_access"
  on "public"."docx_templates"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.data_tables dt
  WHERE ((dt.id = docx_templates.table_id) AND private.has_workspace_access(dt.workspace_id)))) AND (is_shared OR (uploaded_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.data_tables dt
  WHERE ((dt.id = docx_templates.table_id) AND private.has_workspace_role(dt.workspace_id, ARRAY['admin'::text])))))));



  create policy "saved_views_create"
  on "public"."saved_views"
  as permissive
  for insert
  to authenticated
with check ((private.has_workspace_access(workspace_id) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.data_tables dt
  WHERE ((dt.id = saved_views.table_id) AND (dt.workspace_id = dt.workspace_id))))));



  create policy "workspace_delete"
  on "public"."workspaces"
  as permissive
  for delete
  to authenticated
using ((owner_id = ( SELECT auth.uid() AS uid)));



  create policy "workspace_update"
  on "public"."workspaces"
  as permissive
  for update
  to authenticated
using (private.has_workspace_role(id, ARRAY['admin'::text]))
with check ((owner_id = ( SELECT auth.uid() AS uid)));


CREATE TRIGGER land_sales_set_updated_at BEFORE UPDATE ON public.comp_data FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


