# KAU v4.2.89 - Operational Order Tags

Implementa uma camada premium de etiquetas operacionais inteligentes no módulo de Vendas.

## O que muda
- Cada pedido pode ter múltiplas etiquetas simultâneas.
- A seção no modal agora se chama **Leitura operacional**.
- As etiquetas deixam de ser apenas status visuais e passam a atuar como sinais de operação.
- A leitura humana abaixo das etiquetas conversa com o vendedor sobre risco, caixa, fechamento e qualidade do cliente.

## Etiquetas suportadas
- Confirmado
- Pago
- Reagendado
- Frustrado
- Cancelado
- Inadimplente
- Golpe
- Em análise
- Devolvido
- Prioritário
- Cliente frio
- Cliente quente
- Perdido

## Impacto operacional aplicado
- Cancelado, Golpe, Devolvido e Perdido saem das métricas válidas de faturamento/commissionamento local do módulo de Vendas.
- Frustrado, Inadimplente, Cancelado, Golpe, Devolvido e Perdido bloqueiam entrada no caixa/carteira.
- Prioritário e Cliente quente elevam leitura operacional sem quebrar finanças.
- Cliente frio sinaliza baixa tração operacional.

## Banco
- A coluna `order_tags` continua como `text[]`, permitindo múltiplas etiquetas.
- Não remove dados antigos.
- O status principal (`order_status`) continua sendo derivado da primeira etiqueta que também seja status de pedido.
