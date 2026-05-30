-- KAU V4.2.6 - permitir confirmar pagamento/recebimento pelo app MVP
-- Execute uma vez no Supabase se estiver usando anon key no .env.local.

alter table public.sales enable row level security;

drop policy if exists "Allow anon update sales payment" on public.sales;
create policy "Allow anon update sales payment"
on public.sales
for update
to anon
using (true)
with check (true);

-- Mantem leitura e exclusao liberadas no MVP local.
drop policy if exists "Allow anon read sales" on public.sales;
create policy "Allow anon read sales"
on public.sales
for select
to anon
using (true);

drop policy if exists "Allow anon delete sales" on public.sales;
create policy "Allow anon delete sales"
on public.sales
for delete
to anon
using (true);
