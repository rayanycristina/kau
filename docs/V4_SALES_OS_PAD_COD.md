# KAU V4 Sales OS PAD/COD

## Correções
- API de vendas não envia mais `commission_amount` no insert, porque essa coluna pode ser gerada pelo Supabase.
- Registro de venda recalcula comissão por percentual informado.
- Rayany começa com 15%, mas o percentual é alterável por venda e por cadastro de vendedor.
- PAD e COD são tratados como tipos operacionais diferentes.

## Regras operacionais
- PAD: Correios, previsão automática para 7 dias úteis.
- COD: motoboy, previsão automática para o dia seguinte.
- PIX: venda direta, pago agora.

## Dashboard
- Faturamento de hoje.
- Vendas de hoje.
- Comissão de hoje.
- Entregas/recebimentos previstos para hoje.
- Vendas previstas para hoje.
- Comissão por vendedor.

## SQL opcional
Se a tabela antiga ainda der erro de `commission_amount`, rode:

```sql
supabase/004_sales_os_patch.sql
```
