create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  customer_name text not null,
  customer_phone text not null,
  city text,
  address text,
  neighborhood text,

  product_name text not null default 'AlphaSin',
  temperature text not null default 'hot' check (temperature in ('hot', 'warm', 'cold')),
  contact_status text not null default 'new' check (contact_status in ('new', 'answered', 'not_answered', 'called_no_answer', 'scheduled', 'call_soon', 'return_tomorrow', 'proposal_sent', 'sold', 'lost')),
  priority text not null default 'high' check (priority in ('critical', 'high', 'normal', 'low')),

  seller_name text not null default 'Gabriel Moreira',
  next_action text,
  next_action_at timestamptz,
  last_contact_at timestamptz,
  estimated_value numeric(12,2) not null default 197.00,
  source text,

  notes text,
  objections text,
  follow_up_history text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_temperature_idx on public.leads (temperature);
create index if not exists leads_contact_status_idx on public.leads (contact_status);
create index if not exists leads_next_action_at_idx on public.leads (next_action_at);

alter table public.leads enable row level security;

drop policy if exists "Allow anon read leads" on public.leads;
create policy "Allow anon read leads"
on public.leads
for select
to anon
using (true);

drop policy if exists "Allow anon insert leads" on public.leads;
create policy "Allow anon insert leads"
on public.leads
for insert
to anon
with check (true);

drop policy if exists "Allow anon update leads" on public.leads;
create policy "Allow anon update leads"
on public.leads
for update
to anon
using (true)
with check (true);
