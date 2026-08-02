begin;

create table if not exists public.guarantee_payment_date_corrections (
  id uuid primary key default gen_random_uuid(),
  guarantee_id uuid not null references public.postpaid_guarantees(id) on delete restrict,
  expense_id uuid references public.expenses(id) on delete set null,
  previous_paid_at date not null,
  new_paid_at date not null,
  corrected_by uuid not null references auth.users(id) on delete restrict,
  corrected_at timestamptz not null default now(),
  constraint guarantee_payment_date_correction_changed check (previous_paid_at <> new_paid_at)
);

create index if not exists guarantee_payment_date_corrections_guarantee_idx
  on public.guarantee_payment_date_corrections (guarantee_id, corrected_at desc);

alter table public.guarantee_payment_date_corrections enable row level security;

create or replace function public.correct_guarantee_payment_date(
  p_guarantee_id uuid,
  p_new_paid_at date,
  p_admin_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.postpaid_guarantees%rowtype;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then
    raise exception 'Acesso negado';
  end if;

  if not exists (
    select 1 from public.user_profiles
    where id = p_admin_id and role = 'admin' and is_active = true
  ) then
    raise exception 'Acesso negado';
  end if;

  if p_new_paid_at is null then
    raise exception 'Data de pagamento inválida';
  end if;

  select * into g
    from public.postpaid_guarantees
   where id = p_guarantee_id
   for update;

  if not found then
    raise exception 'Garantia não encontrada';
  end if;

  if g.paid_at is null or g.expense_id is null or g.paid_amount is null then
    raise exception 'Garantia sem pagamento';
  end if;

  perform 1
    from public.expenses
   where id = g.expense_id
   for update;

  if not found then
    raise exception 'Despesa vinculada não encontrada';
  end if;

  if g.paid_at = p_new_paid_at then
    return jsonb_build_object(
      'guarantee_id', g.id,
      'expense_id', g.expense_id,
      'previous_paid_at', g.paid_at,
      'new_paid_at', p_new_paid_at,
      'changed', false
    );
  end if;

  update public.expenses
     set expense_date = p_new_paid_at,
         updated_at = now()
   where id = g.expense_id;

  update public.postpaid_guarantees
     set paid_at = p_new_paid_at,
         updated_by = p_admin_id
   where id = g.id;

  insert into public.guarantee_payment_date_corrections (
    guarantee_id, expense_id, previous_paid_at, new_paid_at, corrected_by
  ) values (
    g.id, g.expense_id, g.paid_at, p_new_paid_at, p_admin_id
  );

  return jsonb_build_object(
    'guarantee_id', g.id,
    'expense_id', g.expense_id,
    'previous_paid_at', g.paid_at,
    'new_paid_at', p_new_paid_at,
    'changed', true
  );
end
$$;

revoke all on table public.guarantee_payment_date_corrections from public, anon, authenticated;
revoke all on function public.correct_guarantee_payment_date(uuid,date,uuid) from public, anon, authenticated;
grant execute on function public.correct_guarantee_payment_date(uuid,date,uuid) to service_role;

commit;
