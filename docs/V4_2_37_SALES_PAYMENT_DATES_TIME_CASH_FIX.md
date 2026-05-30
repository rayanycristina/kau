# KAU v4.2.37 — Datas de pagamento, recebimento e hora da venda

## O que foi adicionado
- Campo **Data de recebimento** para representar quando o cliente recebeu o produto.
- Campo **Data de pagamento** para registrar quando o cliente efetuou o pagamento.
- Campo **Hora da venda** para alimentar corretamente a cadência da Sales Arena por Manhã / Tarde / Noite.

## Correção de caixa
- O caixa agora usa `paymentDate` quando a venda está paga.
- Ao marcar uma venda antiga como paga hoje, ela entra no caixa de hoje, não no dia antigo da venda.

## Banco de dados
Execute `supabase/009_sales_payment_time_fields.sql` no Supabase para criar os novos campos.
