do $$
begin
  create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected');
exception
  when duplicate_object then null;
end $$;

alter table public.jobs
add column if not exists technician_assigned_at timestamptz;

alter table public.quotes
add column if not exists quote_sent_at timestamptz,
add column if not exists accepted_at timestamptz,
add column if not exists rejected_at timestamptz;

alter table public.quotes
alter column status drop default;

alter table public.quotes
alter column status type public.quote_status
using status::public.quote_status;

alter table public.quotes
alter column status set default 'draft'::public.quote_status;

update public.quotes
set quote_sent_at = created_at
where status in ('sent', 'accepted', 'rejected')
and quote_sent_at is null;
