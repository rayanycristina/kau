begin;

alter table public.sales
  drop constraint if exists sales_sale_platform_check;

alter table public.sales
  add constraint sales_sale_platform_check
  check (sale_platform is null or sale_platform in ('payt', 'coinzz', 'logzz', 'manual'));

notify pgrst, 'reload schema';

commit;
