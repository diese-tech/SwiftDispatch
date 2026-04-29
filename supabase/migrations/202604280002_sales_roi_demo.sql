alter table public.companies
add column if not exists close_status text not null default 'not_contacted',
add column if not exists demo_mode_enabled boolean not null default false;

alter table public.companies
drop constraint if exists companies_close_status_check;

alter table public.companies
add constraint companies_close_status_check
check (close_status in (
  'not_contacted',
  'contacted',
  'demo_done',
  'interested',
  'closed_won',
  'closed_lost'
));

drop policy if exists "users can update own company sales fields"
on public.companies;

create policy "users can update own company sales fields"
on public.companies for update
using (id = public.current_company_id())
with check (id = public.current_company_id());
