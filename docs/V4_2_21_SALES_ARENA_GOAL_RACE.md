# KAU v4.2.21 — Sales Arena Goal Race

Refatoração completa da Sales Arena para deixar de parecer dashboard comum e virar uma arena real de meta.

## O que mudou

- Sales Arena reconstruída em torno de 4 blocos: Placar Vivo, Corrida da Meta, Próxima Ação para Mover a Barra e Movimentos da Arena.
- Layout mais compacto, com menos blocos repetidos e menos textos explicativos.
- Foco padrão em Semana.
- Rayany: meta semanal de R$ 3.000 em comissão, meta mensal de R$ 12.000, comissão de 15%, menor ticket R$ 570.
- Elisangela: meta semanal de R$ 650 em comissão, meta mensal de R$ 2.600, comissão de 5%.
- Sempre exibe comissão e faturamento lado a lado.
- Corrida da Meta com pista horizontal para Rayany e Elisangela.
- Cálculo automático de comissão, faturamento necessário, progresso, falta em comissão, falta em faturamento e vendas mínimas restantes.
- Movimentos da Arena usa vendas reais do período selecionado para mostrar os avanços recentes.
- Removidos: Dopamina Premium, Copiloto operacional, IA Recomenda, missões genéricas e textos de pitch.

## Fonte da verdade

A tela continua buscando vendas reais em `/api/sales` e leads em `/api/leads`, sem mocks.
