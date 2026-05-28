# KAU v4.2.98 — Operational Financial State Source of Truth

Esta versão consolida a camada operacional do KAU para separar definitivamente:

- **Etiquetas**: leitura comercial/operacional do cliente. Não alteram dinheiro.
- **Status do pedido**: estado financeiro/operacional da venda. Decide se a venda conta ou não.

## Fonte única de verdade

Criado o helper central:

`src/data/sale-financial-state.ts`

Função principal:

`getSaleFinancialState(sale)`

Retorna:

- `isValidSale`
- `countsRevenue`
- `countsCommission`
- `countsCash`
- `countsRanking`
- `visualStatus`
- `badgeVariant`

## Regras aplicadas

- `active`: conta em faturamento, comissão, ranking e caixa se pagamento confirmado.
- `cancelled`: visível no histórico, mas não conta em faturamento, comissão, caixa ou ranking.
- `returned`: visível no histórico, mas não conta como receita/comissão/caixa/ranking.
- `lost`: visível no histórico, mas não conta em métricas financeiras.
- `review`: visível, mas não tratado como venda finalizada.

## Telas conectadas ao helper

- Movimento do dia
- Caixa
- Resumo da operação
- Rodapé financeiro da tabela
- Sales Arena
- Operation Store
- API de resumo `/api/sales/summary`

## Persistência

Migration adicionada:

`supabase/020_sale_financial_state_source_of_truth.sql`

Ela garante as colunas oficiais:

- `order_status`
- `order_tags`
- `order_status_note`

No código, `order_status` é o campo técnico usado como **Status do Pedido**.
