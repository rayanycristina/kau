# KAU V4.2.13 — Owner Commission Fix

## Regra corrigida

A visão da Rayany como dona agora separa claramente dois conceitos:

- **Minha comissão**: valor que a Rayany ganha na venda.
- **Subcomissão**: valor que a Rayany paga ao vendedor.

## Venda feita pela Rayany

Exemplo: venda de R$ 570,00.

- Minha comissão: 15% = R$ 85,50
- Subcomissão: R$ 0,00
- Carteira: entra R$ 85,50 quando a venda for marcada como paga.

## Venda feita por vendedor

Exemplo: venda de R$ 570,00 feita pela Elisangela.

- Minha comissão da Rayany: 10% = R$ 57,00
- Subcomissão da Elisangela: 5% = R$ 28,50
- Carteira: entra R$ 57,00 quando a venda for marcada como paga.

## Ajustes implementados

- A tabela de movimento agora tem as colunas **Minha comissão** e **Subcomissão**.
- A subcomissão não entra na soma da comissão da Rayany.
- O card **Operação** mostra a comissão da Rayany no período.
- O helper do card **Operação** mostra a subcomissão a pagar aos vendedores.
- O preview do formulário mostra valor, minha comissão e subcomissão.
- O filtro do movimento usa a data da venda, não apenas a data técnica de criação.
- A notificação de pedido gerado diferencia comissão da Rayany e subcomissão do vendedor.
- Painel de performance troca a leitura para carteira real, comissão da Rayany e subcomissões da equipe.

## Não alterado

- Não mexe em Supabase URL/chaves.
- Não altera estrutura das tabelas.
- Não altera sidebar.
- Não muda fluxo de marcar pagamento.
