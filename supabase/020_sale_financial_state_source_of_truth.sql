-- KAU v4.2.98 - Fonte única de verdade para Status do Pedido e Etiquetas
-- Rode uma vez no SQL Editor do Supabase.
-- Mantém o padrão técnico atual do projeto: order_status = STATUS DO PEDIDO.
-- Etiquetas seguem em order_tags e não impactam cálculos financeiros.

alter table public.sales
  add column if not exists order_status text not null default 'active',
  add column if not exists order_tags text[] not null default '{}',
  add column if not exists order_status_note text;

-- Consolida fallback salvo em notes nas versões anteriores.
update public.sales
set order_status = case
  when notes ~* '\\[KAU_ORDER_STATUS:cancelled\\]' then 'cancelled'
  when notes ~* '\\[KAU_ORDER_STATUS:returned\\]' then 'returned'
  when notes ~* '\\[KAU_ORDER_STATUS:lost\\]' then 'lost'
  when notes ~* '\\[KAU_ORDER_STATUS:review\\]' then 'review'
  when lower(coalesce(order_status, '')) in ('cancelled', 'canceled', 'cancelado', 'cancelada') then 'cancelled'
  when lower(coalesce(order_status, '')) in ('returned', 'devolvido', 'devolvida', 'devolucao', 'devolução') then 'returned'
  when lower(coalesce(order_status, '')) in ('lost', 'perdido', 'perdida') then 'lost'
  when lower(coalesce(order_status, '')) in ('review', 'em análise', 'em analise', 'analise', 'análise', 'em_analise') then 'review'
  else 'active'
end;

-- Normaliza etiquetas existentes. Etiquetas são leitura operacional, não regra financeira.
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

comment on column public.sales.order_status is 'STATUS DO PEDIDO no KAU: active, cancelled, returned, lost, review. Decide faturamento, comissão, caixa e ranking.';
comment on column public.sales.order_tags is 'Etiquetas comerciais/operacionais do cliente. Não alteram faturamento, comissão, caixa ou ranking.';

notify pgrst, 'reload schema';
