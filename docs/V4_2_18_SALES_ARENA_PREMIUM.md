# KAU v4.2.18 — Sales Arena Premium

Esta versão recria completamente a página **Sales Arena** como uma central de performance comercial premium.

## O que mudou

- Remove a lateral direita `KAU AI` apenas na página Sales Arena.
- Cria header próprio com `Hoje / Semana / Mês`, indicador `Ao vivo`, `Editar metas` e `Exportar desempenho`.
- Recria o hero principal da Rayany com:
  - meta semanal de comissão de R$ 3.000
  - meta mensal de comissão de R$ 12.000
  - menor ticket R$ 570
  - comissão mínima aproximada por venda de R$ 85,50
  - centro emocional: `Faltam R$ X para bater`
  - progresso semanal e mensal
  - projeção semanal e mensal
  - quantidade estimada de vendas mínimas restantes
- Cria sistema psicológico de status:
  - 0% a 25%: Pressão crítica
  - 25% a 60%: Em recuperação
  - 60% a 90%: Ritmo competitivo
  - 90% a 99%: Zona de fechamento
  - 100%+: Meta destruída
- Cria bloco `Inteligência da meta` sem chatbot, apenas análise operacional.
- Cria card de meta mensal premium.
- Cria cards de performance:
  - vendas hoje
  - ticket médio
  - conversão
  - follow-ups pendentes
- Cria placar premium da arena com ranking mensal dos vendedores.
- Cria missões do dia com impacto estimado em R$.
- Cria card da meta da Elisangela:
  - meta mensal de R$ 2.600 em comissão dela
  - comissão dela baseada em 5% por venda
  - cálculo automático de quanto falta e vendas estimadas
- Usa dados reais das APIs `/api/sales` e `/api/leads`, que vêm do Supabase.
- Adiciona refetch automático a cada 15 segundos e ao voltar para a janela.
- Adiciona `Cache-Control: no-store` na API de leads para reduzir retorno visual de leads excluídos por cache.

## Importante

A Sales Arena não usa mock visual de progresso. Quando não houver venda real, os valores ficam zerados. Quando houver venda no Supabase, a tela recalcula automaticamente.
