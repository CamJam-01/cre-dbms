-- Shared-workspace authorization remains intentionally authenticated-only in
-- the original migration. Harden the trigger functions independently of the
-- row-access model selected for this POC.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.set_updated_at() from public;
