-- KAU - Order status and operational history
-- Run once in Supabase SQL editor before relying on Status do pedido persistence.

alter table public.sales
  add column if not exists order_status text not null default 'active',
  add column if not exists order_tags text[] not null default '{}', -- multiple operational tags: hot_customer, cold_customer, rescheduled, frustrated, fraud, defaulted, priority.
  add column if not exists order_status_note text;

update public.sales
set order_status = 'active'
where order_status is null or trim(order_status) = '';

update public.sales
set order_tags = '{}'
where order_tags is null;

-- Extend delivery_status with rescheduled while preserving existing values.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.sales'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%delivery_status%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.sales drop constraint %I', constraint_name);
  end if;

  alter table public.sales
    add constraint sales_delivery_status_check
    check (delivery_status in ('pending', 'scheduled', 'delivered', 'risk', 'rescheduled'));
end $$;

-- Keep order status values controlled without deleting old data.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_order_status_check'
  ) then
    alter table public.sales
      add constraint sales_order_status_check
      check (order_status in ('active', 'cancelled', 'returned', 'lost', 'review'));
  end if;
end $$;

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  lead_id uuid null,
  customer_name text,
  previous_order_status text,
  new_order_status text,
  previous_delivery_status text,
  new_delivery_status text,
  event_type text not null default 'order_status_changed',
  note text,
  changed_by text,
  created_at timestamptz not null default now()
);

create index if not exists sales_order_tags_gin_idx on public.sales using gin (order_tags);

create index if not exists order_status_history_sale_id_idx on public.order_status_history (sale_id);
create index if not exists order_status_history_lead_id_idx on public.order_status_history (lead_id);
create index if not exists order_status_history_created_at_idx on public.order_status_history (created_at desc);
create index if not exists order_status_history_new_order_status_idx on public.order_status_history (new_order_status);
create index if not exists order_status_history_event_type_idx on public.order_status_history (event_type);

notify pgrst, 'reload schema';
