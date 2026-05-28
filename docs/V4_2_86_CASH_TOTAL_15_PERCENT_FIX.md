# V4.2.86 — Correção definitiva do caixa 15%

Correção emergencial da regra financeira do caixa/carteira/histórico.

## Regra corrigida

- Caixa / Carteira / Líquido = comissão total da operação = 15% da venda paga/liberada.
- Venda Rayany: 15% entra no caixa, 15% é comissão Rayany, 0% subcomissão.
- Venda Elisangela: 15% entra no caixa, sendo 10% comissão Rayany e 5% subcomissão a repassar.

## Importante

A subcomissão entra no caixa porque Rayany recebe a comissão total da operação primeiro e depois repassa a parte da vendedora.

## Exemplos validados

- Rayany R$ 570,00: caixa R$ 85,50, comissão R$ 85,50, subcomissão R$ 0,00.
- Elisangela R$ 570,00: caixa R$ 85,50, comissão R$ 57,00, subcomissão R$ 28,50.
- Elisangela R$ 997,00: caixa R$ 149,55, comissão R$ 99,70, subcomissão R$ 49,85.

## Arquivo alterado

- `src/modules/sales-dashboard/sales-dashboard-screen.tsx`

Não altera Supabase, layout, Sales Arena ou Sales Command.
