# Product Systems Architect

## Função
Atuar como arquiteto de produto, lógica operacional e sistemas de dados do KAU. Esta skill organiza regras de negócio, métricas, estados, filtros, Supabase, cálculos e comportamento operacional.

Use esta skill quando o pedido envolver:
- regras de venda
- comissão
- subcomissão
- caixa
- data de pagamento
- data de recebimento
- filtros
- métricas
- Supabase
- cálculos
- estados da interface
- comportamento em tempo real
- arquitetura modular
- fluxos operacionais

## Regras preservadas
- Next.js deve ser preservado.
- Supabase é a fonte da verdade.
- Não usar dados fake quando existir dado real.
- Rayany recebe 15% nas próprias vendas.
- Elisangela recebe 5% sobre as vendas dela.
- Subcomissão é o valor pago ao vendedor, não ganho da dona.
- Metas Rayany:
  - semanal: R$ 3.000 de comissão
  - mensal: R$ 12.000 de comissão
- Metas Elisangela:
  - semanal: R$ 650 de comissão
  - mensal: R$ 2.600 de comissão
- Ticket mínimo operacional: R$ 570.
- Filtros obrigatórios:
  - Hoje
  - Semana
  - Mês
  - Manhã
  - Tarde
  - Noite
  - Dia inteiro

## Campos importantes de venda
Sempre preservar e considerar, quando existirem:
- `sale_date`: data da venda
- `sale_time`: hora da venda
- `received_date`: data em que o cliente recebeu o produto
- `payment_date`: data em que o cliente pagou
- `payment_status`: status do pagamento
- `delivery_status`: status da entrega
- `sellerName`: vendedor
- `totalAmount`: valor da venda

## Regra de caixa
Venda antiga marcada como paga hoje deve entrar no caixa pela data de pagamento, não pela data original da venda.

## Sales Arena: cálculos obrigatórios
Calcular automaticamente:
- comissão total do período
- faturamento total do período
- vendas totais
- progresso da meta
- faltam R$
- vendas mínimas restantes
- faturamento necessário
- ranking Rayany x Elisangela
- diferença entre vendedoras
- vendas para virar
- cadência por manhã, tarde, noite, dia, semana e mês
- movimentos recentes
- status operacional

## Estados operacionais
- Se meta < 30%: PRESSÃO
- Se meta entre 30% e 70%: RECUPERAÇÃO
- Se meta > 70%: ACELERAÇÃO
- Se meta batida: META PROTEGIDA
- Se sem vendas por 2h: CADÊNCIA PARADA
- Se Supabase offline: SINCRONIZAÇÃO INTERROMPIDA

## Arquitetura recomendada
Separar lógica e visual em componentes reutilizáveis:
- SalesArenaPage
- PressureStrip
- GoalProgressBar
- SellerBattlePanel
- SellerPerformanceRow
- CadenceHeatmap
- LiveMovementFeed
- OperationStatus
- QuickActionPanel

## Checklist antes de entregar
- Os números batem com a tela de vendas?
- Filtros usam a mesma fonte de verdade?
- O caixa usa payment_date?
- A cadência usa sale_time quando disponível?
- Não houve alteração indevida nas regras fora da Sales Arena?
- Supabase continua preservado?
