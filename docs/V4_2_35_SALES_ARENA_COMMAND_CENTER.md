# V4.2.35 — Sales Arena Command Center

Recriação total da Sales Arena seguindo nova direção de produto: central de comando de meta comercial premium, sem estética UFC, sem VS gigante, sem tela de luta, sem simetria forçada e sem linguagem gamer.

## Nova estrutura

A tela agora possui quatro áreas operacionais:

1. **Meta da Operação** — painel principal com meta do período, comissão gerada, faturamento, faltante, vendas mínimas restantes, projeção de fechamento e status.
2. **Ranking Vivo das Vendedoras** — linhas premium estilo trading desk, com comissão, faturamento, % da meta, diferença de liderança e status.
3. **Cadência da Arena** — leitura de manhã, tarde, noite, dia inteiro, semana e mês, com vendas por vendedora, faturamento, comissão, melhor vendedora e ritmo.
4. **Movimentos da Arena** — feed compacto com cada venda confirmada, comissão calculada e consequência operacional.

## Regras preservadas

- Supabase continua sendo a fonte da verdade via `/api/sales`.
- Sem mocks e sem dados fictícios.
- Rayany usa comissão de 15%.
- Elisangela usa comissão de 5%.
- Rayany: meta semanal R$ 3.000 e mensal R$ 12.000.
- Elisangela: meta semanal R$ 650 e mensal R$ 2.600.
- Filtros globais: Hoje, Semana, Mês.
- Filtros de cadência: Manhã, Tarde, Noite, Dia inteiro.

## Experiência visual

A interface foi reposicionada para parecer SaaS executivo de operação comercial: preto premium, grafite, azul petróleo, ciano/verde para progresso, roxo apenas como acento e amarelo apenas para alerta. A hierarquia prioriza entendimento em 5 segundos: quanto falta, quem lidera, quantas vendas faltam, como está a cadência e onde agir agora.
