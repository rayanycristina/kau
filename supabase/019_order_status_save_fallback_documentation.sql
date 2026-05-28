-- KAU v4.2.95 - reforço de persistência do Status do Pedido
-- Rode no SQL Editor do Supabase para garantir colunas oficiais.
-- O app também possui fallback temporário via notes caso esta migration ainda não tenha sido aplicada.

alter table public.sales
  add column if not exists order_status text not null default 'active',
  add column if not exists order_tags text[] not null default '{}',
  add column if not exists order_status_note text;

update public.sales
set order_status = case
  when notes ~* '\\[KAU_ORDER_STATUS:cancelled\\]' then 'cancelled'
  when notes ~* '\\[KAU_ORDER_STATUS:returned\\]' then 'returned'
  when notes ~* '\\[KAU_ORDER_STATUS:lost\\]' then 'lost'
  when notes ~* '\\[KAU_ORDER_STATUS:review\\]' then 'review'
  when lower(coalesce(order_status, '')) in ('cancelled', 'canceled', 'cancelado', 'cancelada') then 'cancelled'
  when lower(coalesce(order_status, '')) in ('returned', 'devolvido', 'devolvida') then 'returned'
  when lower(coalesce(order_status, '')) in ('lost', 'perdido', 'perdida') then 'lost'
  when lower(coalesce(order_status, '')) in ('review', 'em análise', 'em analise', 'analise', 'análise') then 'review'
  else 'active'
end;

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
