-- KAU Sales OS patch v4.2.37
-- Campos separados para recebimento do produto, pagamento real e hora da venda.

alter table public.sales
  add column if not exists received_date date,
  add column if not exists payment_date date,
  add column if not exists sale_time time;

-- Mantem compatibilidade com registros antigos: recebimento vinha de expected_payment_date.
update public.sales
set received_date = coalesce(received_date, expected_payment_date)
where received_date is null and expected_payment_date is not null;

-- Para vendas ja pagas sem payment_date, usa expected_payment_date quando existir.
update public.sales
set payment_date = coalesce(payment_date, expected_payment_date, created_at::date)
where payment_date is null and payment_status = 'paid';

create index if not exists sales_received_date_idx on public.sales (received_date);
create index if not exists sales_payment_date_idx on public.sales (payment_date);
create index if not exists sales_sale_time_idx on public.sales (sale_time);
