# V4.2.77 — Interactive Sales Funnel

## Objetivo
Corrige o Sales Command para entregar o que era esperado: um funil de vendas interativo, vivo e operacional, com movimento visual para estimular avanço de negociação.

## Adicionado
- modo padrão `Funil de vendas` dentro de `/sales-command`
- colunas de funil: Novo lead, Qualificação, Negociação, Follow-up, Proposta, Fechado e Perdido
- cards de lead arrastáveis entre fases
- botão `Avançar` para mover lead sem drag-and-drop
- animação sutil ao mover um lead
- barra operacional do funil com leitura de pressão
- atualização local imediata para sensação de operação viva
- `PATCH /api/leads?id=...` para salvar mudança de status no Supabase quando configurado

## Preservado
- Conversa/timeline existente
- Playbook, objeções, follow-up e Sales AI
- Supabase como fonte de verdade
- lógica de leads existente
- restante do sistema KAU
