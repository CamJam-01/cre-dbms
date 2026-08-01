# Vantage CRE

Proof-of-concept commercial real estate database management system built with Next.js and Supabase.

## Included

- Email/password signup, login, and logout
- `public.users` management: create, edit, delete
- `public.land_sales` management: create, edit, delete
- Immediate CRUD persistence through Supabase
- Row Level Security for authenticated users
- Server-side Supabase Admin API for user-account administration

## Stack

- Next.js App Router + TypeScript
- Supabase Auth + Postgres
- Vercel deployment target
- GitHub source control

## Environment variables

Copy `.env.example` to `.env.local` and provide:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose this to browser code)

The values are available from the Supabase project settings/API page.

## Database

The migration is stored at `supabase/migrations/20260730150000_create_users_and_land_sales.sql` and has already been applied to the configured Supabase project for this POC.

The Comp Data fields are:

- Property name
- Address
- Sale date
- Sale price
- Acreage
- Seller
- Buyer
- Notes

The current POC intentionally lets every authenticated user manage every user and land-sale record. Roles and finer-grained permissions are planned for a later phase.

## Vercel

Import this repository into Vercel using the **Next.js** preset. Add the three environment variables above to the Vercel project. Deployments can then be connected directly to the GitHub repository.
