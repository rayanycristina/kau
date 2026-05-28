# KAU v4.2.15 - Pagamento antecipado entra no caixa

Correção aplicada na tela de vendas/operação.

## Ajuste principal

Quando uma venda é registrada como **PAGAMENTO ANTECIPADO** ou com status **PAGO**, ela agora entra automaticamente no card **Caixa / dinheiro no bolso** no período da venda.

## Regra corrigida

- PAD pendente: não entra no caixa até marcar como pago.
- COD pendente: não entra no caixa até marcar como pago.
- Pagamento antecipado: entra no caixa imediatamente.
- Venda marcada como paga: entra no caixa no período selecionado.

## Detalhe técnico

O cálculo do caixa confirmado agora usa a melhor data operacional disponível:

1. data prevista de pagamento, quando existir;
2. data da venda;
3. data de criação apenas como fallback.

Isso evita o bug onde uma venda antecipada aparecia como paga na linha, mas o card de caixa ficava R$ 0,00 ao filtrar pelo dia da venda.
