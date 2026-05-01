-- Migration 3: Technician Auth Fields
alter table public.technicians
  add column if not exists handle text unique,
  add column if not exists auth_user_id uuid references auth.users(id),
  add column if not exists preferred_last text,
  add column if not exists availability_status text default 'available'
    check (availability_status in ('available', 'on_job', 'offline')),
  add column if not exists current_job_id uuid references public.jobs(id);

create unique index if not exists technicians_handle_idx on public.technicians(handle)
  where handle is not null;
