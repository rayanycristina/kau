# KAU v4.2.39 - Payment Date Schema Cache Fix

## Problema corrigido
Quando o app tenta salvar `payment_date`, o Supabase pode retornar:

`Could not find the 'payment_date' column of 'sales' in the schema cache`

Isso acontece quando a migration ainda nao foi executada ou quando o PostgREST/Supabase ainda nao recarregou o cache do schema depois de adicionar a coluna.

## O que esta versao adiciona
- migration `supabase/010_sales_payment_date_schema_cache_fix.sql`
- garante as colunas:
  - `received_date`
  - `payment_date`
  - `sale_time`
- preenche registros antigos pagos com uma data de pagamento provavel
- cria indices
- executa `notify pgrst, 'reload schema';`

## Regra do caixa
Venda marcada como paga entra no caixa pela `payment_date`.
Se uma venda antiga foi feita em 04/05 mas marcada como paga hoje, ela entra no caixa de hoje quando `payment_date` for hoje.
