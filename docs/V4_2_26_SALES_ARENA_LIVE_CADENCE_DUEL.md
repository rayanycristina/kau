# KAU v4.2.26 — Sales Arena Live Cadence Duel

Refatoração completa da Sales Arena para uma central viva de disputa, cadência e meta.

## O que mudou

- A página foi refeita em 5 blocos principais:
  1. Header da Arena
  2. Hero de Disputa: Rayany VS Elisangela
  3. Cadência da Arena
  4. Meta e Pressão
  5. Movimentos da Arena
- Adicionados subfiltros de cadência:
  - Manhã: 06:00–11:59
  - Tarde: 12:00–17:59
  - Noite: 18:00–23:59
  - Dia inteiro: 00:00–23:59
- Filtro padrão segue em Semana, com Hoje/Semana/Mês.
- Dados continuam vindos de `/api/sales` com `cache: no-store`.
- Atualização automática a cada 3,5 segundos.

## Regras preservadas

Rayany:
- 15% sobre vendas próprias.
- Meta semanal de comissão: R$ 3.000.
- Meta mensal de comissão: R$ 12.000.
- Menor ticket: R$ 570.

Elisangela:
- 5% sobre vendas próprias.
- Meta semanal de comissão: R$ 650.
- Meta mensal de comissão: R$ 2.600.
- Menor ticket para estimativa: R$ 570.

## Experiência

- Competição Rayany VS Elisangela.
- Medidores circulares de energia para meta.
- Cadência por manhã, tarde, noite e dia inteiro.
- Comparação com período anterior equivalente.
- Feed de movimentos reais da arena.
- Microcopy mais direta: liderança, perseguição, falta, vendas mínimas, diferença atual.
