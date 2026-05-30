-- KAU Sales OS patch
-- Execute somente se sua tabela sales antiga ainda der erro de commission_amount
-- Recria commission_amount como coluna calculada e garante índices para PAD/COD.

alter table public.sales
  alter column commission_rate set default 5.00;

-- Converte registros criados por versões antigas que gravavam 0.15 para representar 15%.
update public.sales
set commission_rate = commission_rate * 100
where commission_rate > 0 and commission_rate <= 1;

alter table public.sales
  drop column if exists commission_amount;

alter table public.sales
  add column commission_amount numeric(12,2) generated always as ((total_amount * commission_rate) / 100) stored;

create index if not exists sales_expected_payment_date_idx on public.sales (expected_payment_date);
create index if not exists sales_delivery_type_idx on public.sales (delivery_type);
create index if not exists sales_payment_status_idx on public.sales (payment_status);


-- Permissao para excluir vendas de teste pelo app MVP.
-- Em producao com login real, trocar por policies por usuario/vendedor.
drop policy if exists "Allow anon delete sales" on public.sales;
create policy "Allow anon delete sales"
on public.sales
for delete
to anon
using (true);


-- KAU como plataforma independente: produto padrao generico para novos registros.
alter table public.sales
  alter column product_name set default 'Produto';

alter table public.sales
  alter column payment_method set default 'PAGAMENTO ANTECIPADO';
