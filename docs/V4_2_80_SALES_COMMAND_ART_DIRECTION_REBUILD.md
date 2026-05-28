# V4.2.80 — Sales Command Art Direction Rebuild

## Escopo
Reconstrução visual do Sales Command sem alterar Supabase, lógica de leads, status, drag/drop, filtros ou ações existentes.

## Mudanças principais
- nova direção visual para o Sales Command, menos template dark e mais ambiente operacional premium
- hero reconstruído como centro de comando
- funil compactado em mesa operacional com colunas de altura controlada
- cada etapa possui rolagem própria para evitar página infinita
- lead cards mais densos, táteis e com hierarquia de negociação viva
- materialidade obsidian/graphite/black titanium via CSS global
- menos glow, menos bordas duras, mais profundidade por contraste e material
- motion mais silencioso com hover, breathing e transições leves

## Preservado
- rota /sales-command
- drag and drop
- botão avançar/voltar
- PATCH /api/leads
- Supabase
- módulos de conversa, playbook, objeções, follow-up e Sales AI
