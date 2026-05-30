# V4.2.84 — Performance Stabilization

## Objetivo
Estabilizar o KAU quando o navegador começa a travar após as versões mais recentes do Sales Command.

## Ajustes aplicados
- removido uso de Framer Motion dentro do Sales Command, substituindo por transições CSS simples
- removidas animações contínuas de fundo e pulse do Sales Command
- limitada a fila renderizada a 50 leads mais importantes, mantendo busca para localizar qualquer outro lead
- barras de momentum passaram a usar CSS transition leve
- min-height pesado da mesa foi removido para reduzir custo de layout
- mantida toda a lógica funcional, Supabase, filtros, status e fluxo operacional

## Resultado esperado
Menos travamento, menos custo de renderização e navegação mais estável, especialmente em notebooks com pouco espaço/memória.
