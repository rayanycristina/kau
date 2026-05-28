# KAU V4.2.8 - Sales Date + Operation Ready

Correcoes desta versao:

- Campo **Data da venda** adicionado no drawer de lancamento e edicao.
- Nova venda usa a data filtrada do dashboard como data padrao.
- Editar uma venda permite alterar a data da venda.
- A data da venda atualiza o `created_at` da venda no Supabase para manter os filtros do dashboard funcionando.
- PAD recalcula a previsao com base na data da venda quando o tipo e selecionado.
- Pagamento antecipado usa a data da venda como data de recebimento quando nao houver data manual.
- O drawer agora serve tanto para lancar quanto para editar a venda completa.

Observacao:
Para editar data, pagamento e status pelo app, mantenha executado no Supabase o SQL:
`supabase/006_sales_update_payment_policy.sql`.
