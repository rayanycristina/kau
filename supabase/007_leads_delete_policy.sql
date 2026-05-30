-- KAU v4.2.16 - permite excluir leads pela Lista de Leads
alter table public.leads enable row level security;

drop policy if exists "Allow anon delete leads" on public.leads;
create policy "Allow anon delete leads"
on public.leads
for delete
to anon
using (true);
