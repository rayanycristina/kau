# KAU Commercial OS — v4.2.56
## Cash Withdrawal Card

### Ajuste
A tela de Vendas agora separa visualmente o saldo de caixa dos saques.

### Antes
O botão de saque ficava dentro do card Caixa, o que deixava a leitura confusa quando o saldo disponível era zero depois de uma retirada.

### Agora
A linha principal possui quatro cards:

1. **Hoje** — total vendido no período.
2. **Operação** — comissão total, minha comissão e subcomissão a pagar.
3. **Caixa** — saldo disponível após descontar saques.
4. **Saques** — total retirado do caixa no período, com botão **Registrar saque**.

### Regra preservada
- Venda paga entra no caixa.
- Saque reduz o saldo disponível.
- Saque não apaga venda.
- Saque não altera comissão.
- Saque fica registrado em `cash_withdrawals`.

### Observação operacional
Se o card Caixa mostra R$ 0,00 e o card Saques mostra o mesmo valor que entrou no caixa, significa que o dinheiro entrou e foi totalmente retirado naquele período.
