# V4.2.82 — Sales Command Guided Closing Room

## Objetivo
Reconstruir completamente a aba Sales Command como uma tela de atendimento guiado, priorizando a mesa central de fechamento, scripts operacionais, objeções rápidas, follow-up com hora marcada e leitura de IA comercial.

## Mudanças principais
- novo subtítulo do módulo: Sistema operacional de fechamento guiado
- layout principal em 3 áreas: fila viva de leads, mesa de fechamento e IA/objeções/próxima ação
- remoção da experiência principal de kanban/pipeline
- jornada visual com 10 etapas: abertura, diagnóstico, resumo da dor, explicação, indicação do kit, objeção, fechamento, dados do pedido, confirmação final e follow-up
- script base Alphasin integrado às etapas
- botões de resposta do lead que avançam etapa, recalculam momentum/chance e atualizam status local/Supabase
- modo fechamento quando o lead está pronto para confirmação
- lateral com IA de fechamento, objeções rápidas e regras de follow-up

## Preservado
- Supabase como fonte dos leads
- PATCH de status dos leads
- navegação existente
- restante do KAU sem alterações funcionais
