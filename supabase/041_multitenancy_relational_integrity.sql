begin;

-- Chaves candidatas utilizadas pelas FKs compostas, impedindo vínculos cruzados.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'sales', 'leads', 'call_records', 'order_status_history', 'cash_withdrawals',
    'expenses', 'expense_tax_items', 'expense_categories', 'guarantee_settings',
    'postpaid_guarantees', 'guarantee_payment_date_corrections', 'ad_accounts',
    'campaigns', 'products', 'product_cost_history', 'product_kits',
    'manual_sale_cost_obligations', 'coproducers', 'product_coproducer_rules',
    'sale_coproducer_obligations', 'sellers'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format(
        'alter table public.%I add constraint %I unique (company_id, id)',
        v_table,
        v_table || '_company_id_id_key'
      );
    end if;
  end loop;
end;
$$;

-- Unicidades que antes eram globais passam a existir por empresa.
alter table public.user_profiles drop constraint if exists user_profiles_seller_display_name_unique;
alter table public.expenses drop constraint if exists expenses_category_fkey;
alter table public.expense_categories drop constraint if exists expense_categories_slug_key;
drop index if exists public.expense_categories_normalized_name_key;
create unique index expense_categories_company_slug_key
  on public.expense_categories(company_id, slug);
create unique index expense_categories_company_normalized_name_key
  on public.expense_categories(company_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

drop index if exists public.ad_accounts_normalized_name_platform_key;
create unique index ad_accounts_company_normalized_name_platform_key
  on public.ad_accounts(company_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')), platform);

drop index if exists public.campaigns_normalized_name_account_key;
create unique index campaigns_company_normalized_name_account_key
  on public.campaigns(company_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')), coalesce(ad_account_id, '00000000-0000-0000-0000-000000000000'::uuid));

drop index if exists public.sellers_full_name_unique_idx;
drop index if exists public.sellers_username_unique_idx;
drop index if exists public.sellers_email_unique_idx;
drop index if exists public.sellers_single_owner_idx;
create unique index sellers_company_full_name_unique_idx on public.sellers(company_id, lower(btrim(full_name)));
create unique index sellers_company_username_unique_idx on public.sellers(company_id, lower(btrim(username))) where username is not null;
create unique index sellers_company_email_unique_idx on public.sellers(company_id, lower(btrim(email))) where email is not null;
create unique index sellers_company_single_owner_idx on public.sellers(company_id) where is_owner = true;

alter table public.guarantee_settings drop constraint if exists guarantee_settings_platform_payment_mode_effective_from_key;
alter table public.guarantee_settings add constraint guarantee_settings_company_effective_key
  unique (company_id, platform, payment_mode, effective_from);

alter table public.product_cost_history drop constraint if exists product_cost_history_product_id_effective_from_key;
alter table public.product_cost_history add constraint product_cost_history_company_effective_key
  unique (company_id, product_id, effective_from);

drop index if exists public.product_kits_normalized_name_key;
create unique index product_kits_company_normalized_name_key
  on public.product_kits(company_id, product_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

-- Categorias de despesas agora são resolvidas dentro da própria empresa.
alter table public.expenses add constraint expenses_company_category_fkey
  foreign key (company_id, category)
  references public.expense_categories(company_id, slug)
  on update restrict on delete restrict;

-- Relações comerciais e financeiras críticas.
-- order_status_history não existe no schema real atual; não criar FK para tabela ausente.
alter table public.expense_tax_items add constraint expense_tax_items_company_expense_fkey
  foreign key (company_id, expense_id) references public.expenses(company_id, id) on delete cascade;
alter table public.postpaid_guarantees add constraint postpaid_guarantees_company_sale_fkey
  foreign key (company_id, sale_id) references public.sales(company_id, id) on delete restrict;
alter table public.postpaid_guarantees add constraint postpaid_guarantees_company_expense_fkey
  foreign key (company_id, expense_id) references public.expenses(company_id, id) on delete restrict;
alter table public.guarantee_payment_date_corrections add constraint guarantee_corrections_company_guarantee_fkey
  foreign key (company_id, guarantee_id) references public.postpaid_guarantees(company_id, id) on delete restrict;
alter table public.guarantee_payment_date_corrections add constraint guarantee_corrections_company_expense_fkey
  foreign key (company_id, expense_id) references public.expenses(company_id, id) on delete set null (expense_id);

alter table public.campaigns add constraint campaigns_company_ad_account_fkey
  foreign key (company_id, ad_account_id) references public.ad_accounts(company_id, id) on delete restrict;
alter table public.sales add constraint sales_company_campaign_fkey
  foreign key (company_id, campaign_id) references public.campaigns(company_id, id) on delete restrict;
alter table public.expenses add constraint expenses_company_campaign_fkey
  foreign key (company_id, campaign_id) references public.campaigns(company_id, id) on delete restrict;
alter table public.sales add constraint sales_company_seller_fkey
  foreign key (company_id, seller_id) references public.sellers(company_id, id) on delete set null (seller_id);
alter table public.sales add constraint sales_company_product_fkey
  foreign key (company_id, product_id) references public.products(company_id, id) on delete restrict;
alter table public.sales add constraint sales_company_product_kit_fkey
  foreign key (company_id, product_kit_id) references public.product_kits(company_id, id) on delete restrict;
alter table public.product_cost_history add constraint product_cost_history_company_product_fkey
  foreign key (company_id, product_id) references public.products(company_id, id) on delete restrict;
alter table public.product_kits add constraint product_kits_company_product_fkey
  foreign key (company_id, product_id) references public.products(company_id, id) on delete restrict;
alter table public.manual_sale_cost_obligations add constraint manual_costs_company_sale_fkey
  foreign key (company_id, sale_id) references public.sales(company_id, id) on delete restrict;
alter table public.manual_sale_cost_obligations add constraint manual_costs_company_product_fkey
  foreign key (company_id, product_id) references public.products(company_id, id) on delete restrict;
alter table public.manual_sale_cost_obligations add constraint manual_costs_company_expense_fkey
  foreign key (company_id, expense_id) references public.expenses(company_id, id) on delete restrict;

-- Estruturas de coprodução não existem no schema real atual; preservar para futura migration específica.

-- Saques deixam de depender somente do array text[] e ganham vínculo relacional auditável.
create table public.cash_withdrawal_sales (
  company_id uuid not null references public.companies(id) on delete restrict,
  withdrawal_id uuid not null,
  sale_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (company_id, withdrawal_id, sale_id),
  foreign key (company_id, withdrawal_id) references public.cash_withdrawals(company_id, id) on delete cascade,
  foreign key (company_id, sale_id) references public.sales(company_id, id) on delete restrict
);

-- Falha antes do backfill se o JOIN abaixo descartaria algum vínculo legado.
-- Inclui elementos nulos/vazios/malformados, órfãos e vendas de outra empresa.
-- Não converte texto arbitrário para uuid e não filtra vendas soft-deleted:
-- o vínculo histórico de um saque deve continuar existindo.
do $$
declare
  v_invalid_count bigint;
  v_example text;
begin
  select count(*), min(format('saque=%s company=%s posição=%s sale_id=%L',
    withdrawal.id, withdrawal.company_id, legacy.position, legacy.sale_id))
  into v_invalid_count, v_example
  from public.cash_withdrawals withdrawal
  cross join lateral unnest(withdrawal.sale_ids) with ordinality as legacy(sale_id, position)
  where not exists (
    select 1 from public.sales sale
    where sale.company_id = withdrawal.company_id and sale.id::text = legacy.sale_id
  );

  if v_invalid_count > 0 then
    raise exception 'Backfill de cash_withdrawal_sales bloqueado: % vínculo(s) inválido(s), órfão(s) ou incompatível(is). Exemplo: %',
      v_invalid_count, v_example
      using hint = 'Investigue os sale_ids legados antes de reaplicar a migration 041. Nenhum vínculo será descartado silenciosamente.';
  end if;
end;
$$;

insert into public.cash_withdrawal_sales(company_id, withdrawal_id, sale_id)
select withdrawal.company_id, withdrawal.id, sale.id
from public.cash_withdrawals withdrawal
cross join lateral unnest(withdrawal.sale_ids) raw_sale_id
join public.sales sale
  on sale.company_id = withdrawal.company_id
 and sale.id::text = raw_sale_id
on conflict do nothing;

-- capital_cycle_settings não existe no schema real atual; não criar constraint em tabela ausente.

commit;
