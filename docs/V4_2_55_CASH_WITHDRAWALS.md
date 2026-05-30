# KAU v4.2.55 — Cash Withdrawals

## Objetivo
Adicionar controle de saque/retirada para o valor que já entrou no caixa.

## O que mudou
- Novo botão **Registrar saque** no card **Caixa**.
- Novo modal para informar:
  - valor sacado
  - data do saque
  - observação
- O card **Caixa** agora mostra o saldo disponível:
  - entradas confirmadas no caixa
  - menos saques registrados no período
- A lista de caixa previsto passa a exibir também saques recentes do período.
- Vendas continuam preservadas; o saque não apaga nem altera venda.

## Banco de dados
Execute no Supabase SQL Editor:

```sql
supabase/012_cash_withdrawals.sql
```

Esse SQL cria a tabela `cash_withdrawals`.
