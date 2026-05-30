# KAU V4.2.6 - Cash Wallet Logic

Ajuste de regra operacional da tela de Vendas.

## Regra principal

- Volume vendido nao e caixa.
- Caixa e dinheiro no bolso.
- Venda PAD/COD so entra no card Caixa quando for marcada como paga/recebida.
- Pagamento antecipado ja entra como pago.
- Venda propria da Rayany entra no caixa pelo percentual de comissao dela.
- Venda de outros vendedores entra no caixa pela parte da Rayany/gestor configurada em 10%.

## Interface

- Tabela exibe status Pago/Pendente.
- Vendas pendentes mostram botao "Marcar pago".
- Caixa previsto mostra carteira prevista, nao faturamento bruto.
- Card Caixa mostra apenas dinheiro confirmado.

## Supabase

Se usar anon key, execute:

`supabase/006_sales_update_payment_policy.sql`
