-- Enable RLS on tables added after the initial RLS migration.
-- sms_outbox, status_events, customers, invoices, and quote_templates
-- were created with `enable row level security` but not `force row level security`.
-- Writes to sms_outbox and status_events happen exclusively via the service role
-- (admin client), which bypasses RLS by design. The policies below protect reads
-- from user-scoped queries and guard against accidental future anon-key access.

-- sms_outbox
alter table public.sms_outbox enable row level security;
alter table public.sms_outbox force row level security;

drop policy if exists "Company members can read their own outbox rows" on public.sms_outbox;
create policy "Company members can read their own outbox rows"
  on public.sms_outbox for select
  using (company_id = public.current_company_id());

-- No INSERT/UPDATE/DELETE policies: all writes go through the service role key
-- (createSupabaseAdminClient). A user-scoped client cannot write to this table.

-- status_events
alter table public.status_events force row level security;

-- customers
alter table public.customers force row level security;

-- invoices
alter table public.invoices force row level security;

-- quote_templates
alter table public.quote_templates force row level security;
