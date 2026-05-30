-- KAU v4.2.92 - separa ETIQUETAS de STATUS DO PEDIDO
-- Rode uma vez no Supabase SQL editor depois da 015, ou em qualquer base antiga.

alter table public.sales
  add column if not exists order_status text not null default 'active',
  add column if not exists order_tags text[] not null default '{}',
  add column if not exists order_status_note text;

-- Migrar status antigo para o novo campo financeiro/operacional.
update public.sales
set order_status = case
  when lower(coalesce(order_status, '')) in ('cancelled', 'cancelado') then 'cancelled'
  when lower(coalesce(order_status, '')) in ('returned', 'devolvido') then 'returned'
  when lower(coalesce(order_status, '')) in ('lost', 'perdido') then 'lost'
  when lower(coalesce(order_status, '')) in ('review', 'em análise', 'em analise') then 'review'
  else 'active'
end;

-- Sanitizar etiquetas: etiquetas sao leitura comercial e NAO impactam financeiro.
update public.sales
set order_tags = coalesce((
  select array_agg(distinct tag)
  from unnest(coalesce(order_tags, '{}')) as tag
  where tag in ('hot_customer', 'cold_customer', 'rescheduled', 'frustrated', 'fraud', 'defaulted', 'priority')
), '{}');

-- Recriar constraint antiga, se existir, para permitir somente status separado.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.sales'::regclass
    and conname = 'sales_order_status_check'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.sales drop constraint %I', constraint_name);
  end if;

  alter table public.sales
    add constraint sales_order_status_check
    check (order_status in ('active', 'cancelled', 'returned', 'lost', 'review'));
end $$;

create index if not exists sales_order_status_idx on public.sales (order_status);
create index if not exists sales_order_tags_gin_idx on public.sales using gin (order_tags);

notify pgrst, 'reload schema';
