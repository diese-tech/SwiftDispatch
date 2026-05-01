-- Add super_admin to valid user roles and add suspended flag to companies.
-- super_admin users have no company_id (NULL) and can access all companies.

-- Relax the role check constraint to include super_admin
alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
    check (role in ('dispatcher', 'admin', 'technician', 'super_admin'));

-- Allow company_id to be NULL for super_admin accounts
alter table public.users
  alter column company_id drop not null;

-- Suspended flag on companies so super_admin can lock out a tenant
alter table public.companies
  add column if not exists suspended boolean not null default false;

-- Index for efficient cross-company queries from super_admin views
create index if not exists users_role_idx on public.users (role);
