-- Migration 1: Job Timestamp Columns + new status values
alter table public.jobs
  add column if not exists assigned_at timestamptz,
  add column if not exists en_route_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists source text default 'manual'
    check (source in ('manual', 'intake', 'call')),
  add column if not exists sms_consent_type text default 'none'
    check (sms_consent_type in ('intake_form', 'verbal_logged', 'none')),
  add column if not exists cancellation_reason text,
  add column if not exists problem_description text,
  add column if not exists urgency text default 'scheduled'
    check (urgency in ('emergency', 'same_day', 'scheduled')),
  add column if not exists priority text
    generated always as (urgency) stored,
  add column if not exists customer_id uuid,
  add column if not exists job_ref text
    generated always as (substring(id::text, 1, 8)) stored;

-- Update status check constraint to include new statuses
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('new', 'assigned', 'en_route', 'in_progress', 'quote_pending', 'completed', 'cancelled', 'no_access', 'New', 'Assigned', 'En Route', 'Completed'));
