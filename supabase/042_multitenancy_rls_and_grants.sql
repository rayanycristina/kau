begin;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships membership
    join public.companies company on company.id = membership.company_id
    join public.user_profiles profile on profile.id = membership.user_id
    where membership.user_id = auth.uid()
      and membership.company_id = p_company_id
      and membership.is_active = true
      and profile.is_active = true
      and company.status = 'active'
  );
$$;

create or replace function public.is_company_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships membership
    join public.companies company on company.id = membership.company_id
    join public.user_profiles profile on profile.id = membership.user_id
    where membership.user_id = auth.uid()
      and membership.company_id = p_company_id
      and membership.role in ('owner', 'admin')
      and membership.is_active = true
      and profile.is_active = true
      and company.status = 'active'
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid() and is_active = true
  );
$$;

revoke all on function public.is_company_member(uuid) from public, anon;
revoke all on function public.is_company_admin(uuid) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_admin(uuid) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

-- Mesmo recorte das APIs comerciais anteriores ao multitenancy: seller_name é
-- comparado ao seller_display_name da identidade autenticada, nunca a um request.
-- member segue o papel seller da V1 (src/lib/auth.ts), sem poderes administrativos.
create or replace function public.is_company_seller_record(p_company_id uuid, p_seller_name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_company_member(p_company_id) and exists (
    select 1 from public.user_profiles profile
    join public.company_memberships membership on membership.user_id = profile.id
    where profile.id = auth.uid()
      and profile.is_active = true
      and profile.seller_display_name = p_seller_name
      and membership.company_id = p_company_id
      and membership.is_active = true
      and membership.role in ('seller', 'member')
  );
$$;
revoke all on function public.is_company_seller_record(uuid,text) from public, anon;
grant execute on function public.is_company_seller_record(uuid,text) to authenticated;

-- Remove todas as policies legadas das tabelas operacionais; nenhuma policy anônima sobrevive.
do $$
declare
  v_table text;
  v_policy record;
begin
  foreach v_table in array array[
    'sales', 'leads', 'call_records', 'order_status_history', 'cash_withdrawals',
    'cash_withdrawal_sales', 'expenses', 'expense_tax_items', 'expense_categories',
    'guarantee_settings', 'postpaid_guarantees', 'guarantee_payment_date_corrections',
    'ad_accounts', 'campaigns', 'capital_cycle_settings', 'products',
    'product_cost_history', 'product_kits', 'manual_sale_cost_obligations',
    'coproducers', 'product_coproducer_rules', 'sale_coproducer_obligations', 'sellers'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      for v_policy in
        select policyname from pg_policies where schemaname = 'public' and tablename = v_table
      loop
        execute format('drop policy if exists %I on public.%I', v_policy.policyname, v_table);
      end loop;
      execute format('alter table public.%I enable row level security', v_table);
      execute format('revoke all on public.%I from public, anon, authenticated', v_table);
      execute format('grant select on public.%I to authenticated', v_table);
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.is_company_admin(company_id))',
        v_table || '_company_select', v_table
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (public.is_company_admin(company_id))',
        v_table || '_company_admin_insert', v_table
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id))',
        v_table || '_company_admin_update', v_table
      );
      execute format(
        'create policy %I on public.%I for delete to authenticated using (public.is_company_admin(company_id))',
        v_table || '_company_admin_delete', v_table
      );
      execute format('grant insert, update, delete on public.%I to authenticated', v_table);
    end if;
  end loop;
end;
$$;

-- Leitura não administrativa é uma allowlist, não a regra genérica.
-- 022/023/024/032/034/036: despesas, tributos, garantias, capital, custos e
-- participações são administrativos. Categorias seguem requireAdmin da API.
-- 026/031: cadastros de vendedores/campanhas/contas eram legíveis por usuários
-- ativos e são usados nos seletores comerciais; não liberam métricas financeiras.
create policy sellers_company_member_select on public.sellers for select to authenticated
using (public.is_company_member(company_id));
create policy campaigns_company_member_select on public.campaigns for select to authenticated
using (public.is_company_member(company_id));
create policy ad_accounts_company_member_select on public.ad_accounts for select to authenticated
using (public.is_company_member(company_id));

-- 034: catálogo disponível para novas vendas, sem liberar produtos/ kits inativos.
create policy products_company_member_select on public.products for select to authenticated
using (public.is_company_member(company_id) and status = 'active' and available_for_new_sales = true);
create policy product_kits_company_member_select on public.product_kits for select to authenticated
using (
  public.is_company_member(company_id) and is_active and exists (
    select 1 from public.products product
    where product.company_id = product_kits.company_id and product.id = product_kits.product_id
      and product.status = 'active' and product.available_for_new_sales = true
  )
);

create policy sales_company_member_select on public.sales for select to authenticated
using (public.is_company_seller_record(company_id, seller_name));
create policy leads_company_member_select on public.leads for select to authenticated
using (public.is_company_seller_record(company_id, seller_name));
-- order_status_history não existe no schema real atual.
-- Quando essa tabela existir em migration futura, sua policy deve ser criada de forma tenant-aware.
create policy cash_withdrawals_company_member_select on public.cash_withdrawals for select to authenticated
using (scope = 'seller' and public.is_company_seller_record(company_id, seller_name));
create policy cash_withdrawal_sales_company_member_select on public.cash_withdrawal_sales for select to authenticated
using (
  public.is_company_member(company_id) and exists (
    select 1 from public.cash_withdrawals withdrawal
    where withdrawal.company_id = cash_withdrawal_sales.company_id and withdrawal.id = cash_withdrawal_sales.withdrawal_id
      and withdrawal.scope = 'seller'
      and public.is_company_seller_record(withdrawal.company_id, withdrawal.seller_name)
  )
);

-- Preserva os domínios que usam arquivamento/status e proíbem exclusão física.
drop policy if exists ad_accounts_company_admin_delete on public.ad_accounts;
drop policy if exists campaigns_company_admin_delete on public.campaigns;
drop policy if exists products_company_admin_delete on public.products;
drop policy if exists product_cost_history_company_admin_delete on public.product_cost_history;
drop policy if exists postpaid_guarantees_company_admin_delete on public.postpaid_guarantees;
drop policy if exists manual_sale_cost_obligations_company_admin_delete on public.manual_sale_cost_obligations;
drop policy if exists cash_withdrawal_sales_company_admin_insert on public.cash_withdrawal_sales;
drop policy if exists cash_withdrawal_sales_company_admin_update on public.cash_withdrawal_sales;
drop policy if exists cash_withdrawal_sales_company_admin_delete on public.cash_withdrawal_sales;

revoke delete on public.ad_accounts, public.campaigns, public.products, public.product_cost_history,
  public.postpaid_guarantees, public.manual_sale_cost_obligations
from authenticated;

revoke insert, update, delete on public.cash_withdrawal_sales from authenticated;

-- Estruturas de coprodução não existem no schema real atual.
-- Se existirem futuramente, aplicar as mesmas restrições em migration própria.

-- Mutações do vendedor também ficam restritas aos próprios registros/carteira.
create policy sales_company_member_insert on public.sales for insert to authenticated
with check (public.is_company_seller_record(company_id, seller_name));
create policy sales_company_member_update on public.sales for update to authenticated
using (public.is_company_seller_record(company_id, seller_name)) with check (public.is_company_seller_record(company_id, seller_name));
create policy leads_company_member_insert on public.leads for insert to authenticated
with check (public.is_company_seller_record(company_id, seller_name));
create policy leads_company_member_update on public.leads for update to authenticated
using (public.is_company_seller_record(company_id, seller_name)) with check (public.is_company_seller_record(company_id, seller_name));
create policy cash_withdrawals_company_member_insert on public.cash_withdrawals for insert to authenticated
with check (scope = 'seller' and public.is_company_seller_record(company_id, seller_name));
create policy cash_withdrawals_company_member_update on public.cash_withdrawals for update to authenticated
using (scope = 'seller' and public.is_company_seller_record(company_id, seller_name))
with check (scope = 'seller' and public.is_company_seller_record(company_id, seller_name));

do $$
begin
  if to_regclass('public.call_records') is not null then
    execute 'create policy call_records_company_member_select on public.call_records for select to authenticated using (public.is_company_seller_record(company_id, seller_name))';
    execute 'create policy call_records_company_member_insert on public.call_records for insert to authenticated with check (public.is_company_seller_record(company_id, seller_name))';
    execute 'create policy call_records_company_member_update on public.call_records for update to authenticated using (public.is_company_seller_record(company_id, seller_name)) with check (public.is_company_seller_record(company_id, seller_name))';
  end if;
end;
$$;

-- Metadados de plataforma e memberships têm policies próprias e não concedem acesso operacional global.
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.platform_admins enable row level security;

create policy companies_member_select on public.companies for select to authenticated
using (public.is_company_member(id));
create policy memberships_self_select on public.company_memberships for select to authenticated
using (user_id = auth.uid() or public.is_company_admin(company_id));
create policy platform_admins_self_select on public.platform_admins for select to authenticated
using (user_id = auth.uid());

grant select on public.companies, public.company_memberships, public.platform_admins to authenticated;
revoke insert, update, delete on public.company_memberships from anon, authenticated;

-- Perfis são identidades globais, mas dados pessoais só podem ser lidos pelo próprio usuário,
-- por administradores da mesma empresa ou pela administração da plataforma.
do $$
declare v_policy record;
begin
  for v_policy in select policyname from pg_policies where schemaname='public' and tablename='user_profiles'
  loop
    execute format('drop policy if exists %I on public.user_profiles', v_policy.policyname);
  end loop;
end;
$$;
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from public, anon, authenticated;
grant select on public.user_profiles to authenticated;
create policy user_profiles_tenant_select on public.user_profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_platform_admin()
  or exists (
    select 1
    from public.company_memberships target
    where target.user_id = user_profiles.id
      and target.is_active = true
      and public.is_company_admin(target.company_id)
  )
);

commit;
