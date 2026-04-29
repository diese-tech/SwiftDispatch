alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.technicians enable row level security;
alter table public.jobs enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;

alter table public.companies force row level security;
alter table public.users force row level security;
alter table public.technicians force row level security;
alter table public.jobs force row level security;
alter table public.quotes force row level security;
alter table public.quote_line_items force row level security;

drop policy if exists "users can update own profile" on public.users;
create policy "users can update own profile"
on public.users for update
using (id = auth.uid() and company_id = public.current_company_id())
with check (id = auth.uid() and company_id = public.current_company_id());

drop policy if exists "company users can update quote line items"
on public.quote_line_items;
create policy "company users can update quote line items"
on public.quote_line_items for update
using (
  exists (
    select 1
    from public.quotes
    join public.jobs on jobs.id = quotes.job_id
    where quotes.id = quote_line_items.quote_id
    and jobs.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.quotes
    join public.jobs on jobs.id = quotes.job_id
    where quotes.id = quote_line_items.quote_id
    and jobs.company_id = public.current_company_id()
  )
);

drop policy if exists "company users can delete quote line items"
on public.quote_line_items;
create policy "company users can delete quote line items"
on public.quote_line_items for delete
using (
  exists (
    select 1
    from public.quotes
    join public.jobs on jobs.id = quotes.job_id
    where quotes.id = quote_line_items.quote_id
    and jobs.company_id = public.current_company_id()
  )
);
