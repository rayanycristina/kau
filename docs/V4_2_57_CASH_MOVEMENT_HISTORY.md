# KAU Commercial OS — v4.2.57
## Histórico de movimentação do caixa

### Objetivo
Criar um histórico parecido com extrato financeiro para a operação AlphaSin, permitindo ver quais vendas entraram no caixa e quais vendas foram vinculadas a cada saque.

### O que mudou
- Novo painel **Histórico de movimentação** na tela de Vendas.
- Lista agrupada por data, mostrando:
  - entradas no caixa
  - saques registrados
  - valor bruto
  - taxa/subcomissão
  - líquido
  - status: disponível, sacada, saque manual ou vendas sacadas
- Ao registrar um saque, o KAU vincula automaticamente as vendas disponíveis no caixa ao saque.
- O modal de saque agora mostra quais vendas estão disponíveis para serem vinculadas ao saque.
- Saques antigos que não possuem vínculo aparecem como **Saque manual**.

### Nova coluna Supabase
A tabela `cash_withdrawals` agora usa a coluna:

```sql
sale_ids text[] not null default '{}'
```

Essa coluna guarda os IDs das vendas sacadas naquele lançamento.

### Migration
Execute no Supabase SQL Editor:

```txt
supabase/013_cash_withdrawal_sales_link.sql
```

### Regra operacional
- Venda paga entra no caixa pela data de pagamento/caixa.
- Saque reduz saldo disponível.
- Saque não apaga a venda.
- Saque passa a guardar quais vendas foram retiradas do caixa.
