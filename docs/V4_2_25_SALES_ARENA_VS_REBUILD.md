# KAU v4.2.25 — Sales Arena VS Rebuild

Refatoração completa da Sales Arena com nova direção visual: duelo Rayany VS Elisangela.

## Mudanças principais

- Layout anterior de corrida horizontal removido.
- Nova experiência central: HERO DO DUELO.
- Cards das competidoras com identidade de fighter card premium.
- Medidores circulares de energia substituem barras horizontais comuns.
- Centro com VS, líder, diferença atual e vendas mínimas para virar.
- Placar da Disputa refeito como confronto direto.
- Movimentos da Arena mantido e elevado como feed de impacto.
- Sem painel genérico de Operação / Minha comissão / A pagar vendedores / Ticket médio.
- Sem textos burocráticos e sem estrutura de dashboard comum.

## Regras de cálculo

Fonte da verdade: `/api/sales` com cache `no-store` e atualização a cada 4 segundos.

- Rayany: vendas próprias x 15%.
- Elisangela: vendas próprias x 5%.
- Rayany semanal: R$ 3.000 comissão.
- Rayany mensal: R$ 12.000 comissão.
- Elisangela semanal: R$ 650 comissão.
- Elisangela mensal: R$ 2.600 comissão.
- Ticket mínimo usado para estimativa: R$ 570.

## Experiência

A página agora deve comunicar rapidamente:

- quem está liderando;
- quem está perseguindo;
- diferença atual;
- quanto falta para meta;
- quantas vendas mínimas mudam o jogo;
- o que acabou de mover a arena.
