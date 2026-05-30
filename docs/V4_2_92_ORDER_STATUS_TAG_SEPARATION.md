# KAU v4.2.92 — Order Status + Operational Tags Separation

## Objetivo
Separar definitivamente **Etiquetas comerciais** de **Status do pedido**.

## Etiquetas
Etiquetas agora são apenas leitura comercial/operacional do cliente. Elas **não alteram**:

- faturamento
- comissão
- caixa
- ranking
- vendas válidas

Etiquetas suportadas:

- CLIENTE QUENTE (`hot_customer`)
- CLIENTE FRIO (`cold_customer`)
- REAGENDADO (`rescheduled`)
- FRUSTRADO (`frustrated`)
- GOLPE (`fraud`)
- INADIMPLENTE (`defaulted`)
- PRIORITÁRIO (`priority`)

## Status do pedido
Status do pedido agora é campo separado e é o único responsável por validade financeira/operacional.

Status suportados:

- ATIVO (`active`)
- CANCELADO (`cancelled`)
- DEVOLVIDO (`returned`)
- PERDIDO (`lost`)
- EM ANÁLISE (`review`)

## Regra financeira
Venda válida = `order_status` diferente de:

- `cancelled`
- `returned`
- `lost`

Vendas canceladas, devolvidas ou perdidas continuam visíveis no histórico, mas não entram nos totais financeiros.

## Tabela de vendas
A coluna **Carteira** foi substituída por **Status**.

O status visual exibido é derivado de:

1. status do pedido
2. status do pagamento

Exemplos:

- pedido ativo + pagamento pago = LIBERADO
- pedido ativo + pagamento pendente = PENDENTE
- pedido cancelado = CANCELADO
- pedido devolvido = DEVOLVIDO
- pedido perdido = PERDIDO
- pedido em análise = EM ANÁLISE

## Supabase
Para persistência correta em bases antigas, rodar:

`supabase/016_order_status_tag_separation.sql`

Esse SQL migra valores antigos, recria a constraint de `order_status`, sanitiza `order_tags` e recarrega o schema do PostgREST.
