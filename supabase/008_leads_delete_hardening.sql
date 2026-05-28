-- KAU v4.2.17 - correção definitiva da exclusão de leads
-- Execute uma vez no SQL Editor do Supabase se o lead some e volta depois de atualizar.

alter table public.leads enable row level security;

drop policy if exists "Allow anon delete leads" on public.leads;
create policy "Allow anon delete leads"
on public.leads
for delete
to anon
using (true);

drop policy if exists "Allow authenticated delete leads" on public.leads;
create policy "Allow authenticated delete leads"
on public.leads
for delete
to authenticated
using (true);

-- Garante que a API consiga confirmar se a linha deletada existia.
drop policy if exists "Allow anon read leads" on public.leads;
create policy "Allow anon read leads"
on public.leads
for select
to anon
using (true);

drop policy if exists "Allow authenticated read leads" on public.leads;
create policy "Allow authenticated read leads"
on public.leads
for select
to authenticated
using (true);
