# KAU v4.2.95 — Cancelled Save + Financial Fallback Fix

Correção cirúrgica para Status do Pedido:

- Cancelado, Devolvido e Perdido continuam aparecendo no Movimento do dia.
- A coluna Status exibe o estado real do pedido: Cancelado, Devolvido, Perdido, Em análise, Pendente ou Liberado.
- Cancelado, Devolvido e Perdido saem de faturamento, comissão, caixa, ranking e quantidade válida.
- O modal agora mostra prévia financeira zerada quando o status do pedido bloqueia a venda.
- O botão Salvar não fica travado caso o Supabase ainda esteja sem as colunas novas: o sistema usa fallback temporário em notes com marcador interno KAU_ORDER_STATUS.
- Quando a migration estiver aplicada, o sistema usa order_status e order_tags normalmente.

Recomendado aplicar a migration 018/019 no Supabase para persistência limpa em colunas oficiais.
