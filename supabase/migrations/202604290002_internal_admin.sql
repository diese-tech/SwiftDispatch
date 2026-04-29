alter table public.companies
add column if not exists email text,
add column if not exists phone text;

alter table public.jobs
add column if not exists is_demo boolean not null default false;

alter table public.quotes
add column if not exists is_demo boolean not null default false;

create index if not exists jobs_company_demo_idx
on public.jobs (company_id, is_demo);

create index if not exists quotes_demo_idx
on public.quotes (is_demo);

drop policy if exists "users can update own company sales fields"
on public.companies;
