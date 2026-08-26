begin;

-- Aplicar SOMENTE após o deploy do código tenant-aware (que sempre envia company_id).
-- Remove o fallback transitório da Empresa A para que uma futura omissão falhe de forma segura.
do $$
declare v_table text;
begin
  foreach v_table in array array[
    'sales', 'leads', 'call_records', 'order_status_history',
    'cash_withdrawals', 'expenses', 'expense_tax_items', 'expense_categories',
    'guarantee_settings', 'postpaid_guarantees', 'guarantee_payment_date_corrections',
    'ad_accounts', 'campaigns', 'capital_cycle_settings', 'products',
    'product_cost_history', 'product_kits', 'manual_sale_cost_obligations',
    'coproducers', 'product_coproducer_rules', 'sale_coproducer_obligations', 'sellers'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I alter column company_id drop default', v_table);
    end if;
  end loop;
end;
$$;

-- Libera o singleton legado para que cada empresa possua seu próprio registro id=1.
alter table public.capital_cycle_settings drop constraint if exists capital_cycle_settings_pkey;
alter table public.capital_cycle_settings drop constraint if exists capital_cycle_settings_singleton;
alter table public.capital_cycle_settings drop constraint if exists capital_cycle_settings_company_id_id_key;
alter table public.capital_cycle_settings add constraint capital_cycle_settings_id_check check (id = 1);
alter table public.capital_cycle_settings add primary key (company_id, id);

commit;
