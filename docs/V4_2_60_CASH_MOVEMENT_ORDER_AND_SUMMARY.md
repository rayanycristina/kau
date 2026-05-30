# V4.2.60 — Cash movement order and withdrawal summary

## Ajustes aplicados
- Saques agora recebem numeração operacional sequencial: `Saque 001`, `Saque 002`, etc.
- O número do saque aparece na coluna `Pedido` e também no início da descrição da movimentação.
- Dentro de cada data, os saques aparecem antes das vendas daquele dia.
- O resumo no cabeçalho da data foi simplificado para evitar valor duplicado na última coluna da direita.
- Quando existe saque no dia, o valor destacado no cabeçalho mostra o total sacado daquele dia.
- As entradas continuam mostrando data de caixa baseada em pagamento/liberação.

## Objetivo
Deixar o extrato financeiro mais parecido com histórico real de movimentações: primeiro a retirada consolidada, depois as vendas que compõem o caixa daquele dia.
