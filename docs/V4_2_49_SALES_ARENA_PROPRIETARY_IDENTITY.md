# KAU Commercial OS — v4.2.49
## Sales Arena — Proprietary Identity Refactor

### Conceito escolhido
Entre os três conceitos avaliados mentalmente, a versão implementada escolhe **F1 Performance Wall**.

A direção evita misturar Bloomberg Luxury, Tesla Mission Control e F1. A tela foi reconstruída como uma mesa de operação compacta, intensa e orientada à performance, com leitura rápida de pressão, progresso, disputa e movimento.

### Mudanças principais
- Refatoração radical da Sales Arena em torno de uma identidade proprietária KAU.
- Nova peça dominante: **Meta Pulse** com medidor orbital e barra proprietária **KAU Pulse Rail**.
- Nova atmosfera visual com fundo preto profundo, camadas de grafite, ruído premium e luz respirando conforme o estado emocional da operação.
- Estados operacionais visuais:
  - Cadência parada
  - Meta em risco
  - Operação em movimento
  - Zona de ataque
  - Meta protegida
- Comportamento vivo preservado:
  - atualização por Supabase
  - pulso visual quando venda entra
  - feed animado
  - recalculo de ranking, diferença, cadência e progresso
- Componentização da Sales Arena:
  - `SalesArenaPage`
  - `PressureStrip`
  - `GoalProgressBar`
  - `MetaPulse`
  - `OperationStatus`
  - `SellerContribution`
  - `SellerPerformanceRow`
  - `RankingCompact`
  - `CadenceHeatmap`
  - `LiveMovementFeed`
  - `QuickActionPanel`

### Hierarquia implementada
1. Faltam R$ para bater
2. Progresso da meta
3. Status da operação
4. Vendas mínimas restantes
5. Contribuição das vendedoras
6. Cadência
7. Movimentos recentes

### Regras preservadas
- Supabase continua sendo fonte da verdade.
- Não há dados mockados.
- Rayany: comissão 15%, meta semanal R$ 3.000, meta mensal R$ 12.000.
- Elisangela: comissão 5%, meta semanal R$ 650, meta mensal R$ 2.600.
- Ticket mínimo R$ 570.
- Filtros preservados: Hoje, Semana, Mês, Manhã, Tarde, Noite e Dia inteiro.

### Arquivo principal alterado
- `src/modules/sales-arena/sales-arena-screen.tsx`
