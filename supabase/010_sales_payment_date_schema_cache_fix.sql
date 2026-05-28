-- KAU v4.2.39 - garante campos de pagamento/horario e recarrega o schema cache do Supabase/PostgREST.
-- Execute este SQL no Supabase SQL Editor se aparecer:
-- Could not find the 'payment_date' column of 'sales' in the schema cache

alter table public.sales
  add column if not exists received_date date,
  add column if not exists payment_date date,
  add column if not exists sale_time time;

-- Compatibilidade com vendas antigas:
-- received_date representa quando o cliente recebeu o produto.
update public.sales
set received_date = coalesce(received_date, expected_payment_date)
where received_date is null and expected_payment_date is not null;

-- Para vendas ja pagas antes desse campo existir, tenta preencher uma data de pagamento.
update public.sales
set payment_date = coalesce(payment_date, expected_payment_date, sale_date, created_at::date)
where payment_date is null and payment_status = 'paid';

create index if not exists sales_received_date_idx on public.sales (received_date);
create index if not exists sales_payment_date_idx on public.sales (payment_date);
create index if not exists sales_sale_time_idx on public.sales (sale_time);

-- Forca o PostgREST/Supabase API a recarregar o schema cache imediatamente.
notify pgrst, 'reload schema';
