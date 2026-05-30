-- KAU v4.2.94 - correção definitiva de Status do Pedido no financeiro e no painel
-- Rode uma vez no SQL Editor do Supabase.
-- Objetivo: garantir que CANCELADO/DEVOLVIDO/PERDIDO persistam como status do pedido
-- e possam ser usados pelo front para retirar dos totais sem sumir do histórico.

alter table public.sales
  add column if not exists order_status text not null default 'active',
  add column if not exists order_tags text[] not null default '{}',
  add column if not exists order_status_note text;

update public.sales
set order_status = case
  when lower(coalesce(order_status, '')) in ('cancelled', 'canceled', 'cancelado', 'cancelada') then 'cancelled'
  when lower(coalesce(order_status, '')) in ('returned', 'devolvido', 'devolvida') then 'returned'
  when lower(coalesce(order_status, '')) in ('lost', 'perdido', 'perdida') then 'lost'
  when lower(coalesce(order_status, '')) in ('review', 'em análise', 'em analise', 'analise', 'análise') then 'review'
  else 'active'
end;

update public.sales
set order_tags = coalesce((
  select array_agg(distinct tag)
  from unnest(coalesce(order_tags, '{}')) as tag
  where tag in ('hot_customer', 'cold_customer', 'rescheduled', 'frustrated', 'fraud', 'defaulted', 'priority')
), '{}');

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_order_status_check'
  ) then
    alter table public.sales drop constraint sales_order_status_check;
  end if;

  alter table public.sales
    add constraint sales_order_status_check
    check (order_status in ('active', 'cancelled', 'returned', 'lost', 'review'));
end $$;

create index if not exists sales_order_status_idx on public.sales (order_status);
create index if not exists sales_order_tags_gin_idx on public.sales using gin (order_tags);

notify pgrst, 'reload schema';
