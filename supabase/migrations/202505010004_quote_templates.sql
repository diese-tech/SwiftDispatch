-- Migration 4: Quote Templates
create table if not exists public.quote_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  line_items jsonb not null default '[]',
  estimated_duration_minutes int default 60,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.quote_templates enable row level security;

create policy "Company members can manage their templates"
  on public.quote_templates for all
  using (
    company_id = (
      select company_id from public.users where id = auth.uid()
    )
  );

-- Seed 5 default templates for existing companies
insert into public.quote_templates (company_id, name, line_items, estimated_duration_minutes)
select
  c.id,
  t.name,
  t.line_items::jsonb,
  t.duration
from public.companies c
cross join (values
  (
    'AC diagnostic',
    '[{"description":"Diagnostic fee","unit_price":89,"qty":1,"optional":false}]',
    60
  ),
  (
    'AC not cooling — refrigerant recharge',
    '[{"description":"Diagnostic fee","unit_price":89,"qty":1,"optional":false},{"description":"Refrigerant recharge","unit_price":120,"qty":1,"optional":false},{"description":"Labor — HVAC repair","unit_price":95,"qty":1,"unit":"hour","optional":false}]',
    90
  ),
  (
    'Furnace not heating — diagnostic',
    '[{"description":"Diagnostic fee","unit_price":89,"qty":1,"optional":false}]',
    60
  ),
  (
    'Emergency callout — after hours',
    '[{"description":"After-hours emergency callout","unit_price":150,"qty":1,"optional":false},{"description":"Labor — HVAC repair","unit_price":120,"qty":1,"unit":"hour","optional":false}]',
    90
  ),
  (
    'General HVAC repair — diagnostic',
    '[{"description":"Diagnostic fee","unit_price":89,"qty":1,"optional":false},{"description":"Labor — HVAC repair","unit_price":95,"qty":1,"unit":"hour","optional":false}]',
    75
  )
) as t(name, line_items, duration);
