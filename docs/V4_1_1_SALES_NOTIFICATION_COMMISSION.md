# KAU V4.1.1 - Correção venda/comissão/notificação

- Notificação agora some automaticamente depois de alguns segundos.
- Título da notificação: Pedido gerado.
- Comissão corrigida: Rayany 15% de R$ 570,00 = R$ 85,50.
- API aceita comissão antiga em decimal (0.15) e nova em percentual (15).
- SQL 004 normaliza registros antigos e recria commission_amount como `(total_amount * commission_rate) / 100`.
