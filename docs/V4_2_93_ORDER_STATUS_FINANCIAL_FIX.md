# KAU v4.2.93 — Order Status Financial Recalculation Fix

Correções cirúrgicas:

- Status do pedido agora é tratado como fonte real de validade financeira.
- Vendas CANCELADAS, DEVOLVIDAS e PERDIDAS continuam visíveis no Movimento do dia, mas não entram em faturamento, comissão, caixa, ranking ou totais.
- Movimento do dia mostra a venda cancelada com badge de status real, sem sumir do histórico.
- Footer da tabela calcula somente vendas válidas.
- Ação de marcar pagamento é bloqueada para vendas canceladas/devolvidas/perdidas.
- Badge STATUS foi refinado para visual premium discreto:
  - LIBERADO verde
  - PENDENTE âmbar
  - CANCELADO vermelho
  - DEVOLVIDO violeta premium
  - PERDIDO cinza
  - EM ANÁLISE ciano
- API não faz mais fallback silencioso removendo order_status/order_tags. Se o Supabase não tiver as colunas, retorna erro claro pedindo a migration.

Regra preservada:

- Etiquetas são apenas leitura comercial/operacional.
- Etiquetas não alteram faturamento, comissão, caixa ou ranking.
- Status do pedido é quem altera os cálculos.
