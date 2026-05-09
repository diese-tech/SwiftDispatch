create table if not exists public.sms_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  to_phone text not null,
  body text not null,
  message_type text not null,
  dedupe_key text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'retrying', 'failed')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  provider_message_id text,
  last_error text,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sms_outbox_status_available_idx
  on public.sms_outbox(status, available_at, created_at);

create index if not exists sms_outbox_company_id_idx
  on public.sms_outbox(company_id);

create index if not exists sms_outbox_job_id_idx
  on public.sms_outbox(job_id);
