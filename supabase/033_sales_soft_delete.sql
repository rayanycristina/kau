begin;

alter table public.sales
  add column if not exists deleted_at timestamptz;

alter table public.sales
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists sales_active_created_at_idx
  on public.sales (created_at desc)
  where deleted_at is null;

comment on column public.sales.deleted_at is
  'Exclusao operacional da venda. O registro e seus vinculos historicos permanecem preservados.';

comment on column public.sales.deleted_by is
  'Usuario autenticado que realizou a exclusao operacional da venda.';

notify pgrst, 'reload schema';

commit;
