-- Migration 2: StatusEvent Table
create table if not exists public.status_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references public.users(id),
  actor_role text not null check (actor_role in ('dispatcher', 'admin', 'technician', 'customer', 'system')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.status_events enable row level security;

create policy "Company members can view their job events"
  on public.status_events for select
  using (
    job_id in (
      select id from public.jobs
      where company_id = (
        select company_id from public.users where id = auth.uid()
      )
    )
  );

create index if not exists status_events_job_id_idx on public.status_events(job_id);
create index if not exists status_events_created_at_idx on public.status_events(created_at);
