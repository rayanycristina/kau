# KAU v4.2.88 — Order Tags Unicorn Interaction

## Objetivo
Transformar o campo Status do pedido em um sistema de etiquetas múltiplas, visualmente premium e operacionalmente útil para leitura do cliente.

## Mudanças
- `orderTags` permite múltiplas etiquetas por venda/cliente.
- O modal de venda ganhou o componente **Etiquetas inteligentes do pedido**.
- Cada etiqueta possui microcopy operacional para orientar o vendedor.
- A tabela mantém leitura compacta, mostrando no máximo duas etiquetas críticas e contador adicional.
- O SQL `015_order_status_and_history.sql` agora inclui `order_tags text[]` e índice GIN.

## Regra de produto
Um cliente/pedido pode ter várias etiquetas ao mesmo tempo, por exemplo:
- Pago
- Reagendado
- Frustrado
- Em análise

`orderStatus` continua existindo como status principal/compatibilidade, usando a primeira etiqueta selecionada quando houver múltiplas.

## Observação técnica
Para persistir `orderTags` no Supabase, rode a migration atualizada `supabase/015_order_status_and_history.sql`.
