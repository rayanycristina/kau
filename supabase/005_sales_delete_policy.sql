-- KAU V4.2.2 - Permitir exclusao real de vendas pelo MVP
-- Rode uma vez no Supabase SQL Editor se vendas excluidas voltarem depois do F5.

alter table public.sales enable row level security;

drop policy if exists "Allow anon delete sales" on public.sales;
create policy "Allow anon delete sales"
on public.sales
for delete
to anon
using (true);

-- Opcional: confirmar se a policy existe
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'sales'
  and cmd = 'DELETE';
