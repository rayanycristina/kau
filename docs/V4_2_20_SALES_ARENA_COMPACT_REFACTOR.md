# KAU v4.2.20 — Sales Arena Compact Refactor

Refatoração completa da Sales Arena para uma tela compacta, premium e objetiva.

## Correções principais

- Removido bloco Dopamina Premium.
- Removido Copiloto operacional.
- Removido qualquer dock/IA Recomenda dentro da Sales Arena.
- Removidos textos explicativos longos.
- Removida duplicidade visual de título interno.
- Reduzida drasticamente a altura da tela e dos cards.
- Interface reorganizada por hierarquia, não quantidade.

## Nova estrutura

1. Header compacto com filtros, status ao vivo, editar metas e exportar desempenho.
2. Quatro métricas compactas: Comissão hoje, Comissão semana, Comissão mês e Ticket médio.
3. Três colunas principais: Rayany, Elisangela e Arena.
4. Ranking compacto com Rayany e Elisangela.
5. Missões do dia em lista compacta.

## Regras mantidas

- Rayany: meta semanal R$ 3.000, meta mensal R$ 12.000, menor ticket R$ 570, comissão mínima R$ 85,50.
- Elisangela: meta mensal R$ 2.600, comissão de 5%, venda mínima estimada R$ 28,50 de comissão.
- Fonte da verdade continua sendo Supabase via `/api/sales` e `/api/leads`.
- Atualização automática a cada 15 segundos, com refetch ao focar a janela.
