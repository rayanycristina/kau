# V4.2.85 — Cash Operation Commission Fix

Correção emergencial da regra financeira do caixa/carteira.

## Regra corrigida

O caixa agora considera o valor total que entra na operação:

```txt
caixaEntrada = minhaComissao + subcomissao
```

Isso corrige vendas de vendedoras, onde Rayany recebe o valor total da operação primeiro e depois repassa a subcomissão.

## Exemplos validados

Venda Rayany de R$ 570,00:
- Minha comissão: R$ 85,50
- Subcomissão: R$ 0,00
- Caixa/Carteira/Líquido: R$ 85,50

Venda Elisangela de R$ 570,00:
- Minha comissão Rayany: R$ 57,00
- Subcomissão Elisangela: R$ 28,50
- Caixa/Carteira/Líquido: R$ 85,50

Venda Elisangela de R$ 997,00:
- Minha comissão Rayany: R$ 99,70
- Subcomissão Elisangela: R$ 49,85
- Caixa/Carteira/Líquido: R$ 149,55

## Arquivo alterado

- `src/modules/sales-dashboard/sales-dashboard-screen.tsx`

## O que não foi alterado

- Supabase schema
- Sales Arena
- Sales Command
- Lista de Leads
- filtros
- modais
- layout visual
