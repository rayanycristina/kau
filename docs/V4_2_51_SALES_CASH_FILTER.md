# KAU Commercial OS - v4.2.51
## Sales Cash Filter

### Objetivo
Adicionar uma forma clara de ver quais vendas realmente entraram no caixa no período selecionado.

### Problema corrigido
Antes a tela de Vendas mostrava o total do card **Caixa**, mas a tabela principal continuava exibindo vendas pela **data da venda**. Isso causava confusão quando uma venda antiga era marcada como paga hoje: ela entrava no caixa de hoje, mas não aparecia na lista do dia.

### O que foi adicionado
Na seção principal de movimento foi criado um seletor:

- **Vendas**: mostra vendas registradas pela data da venda.
- **Caixa**: mostra vendas que entraram no caixa pela data de pagamento/caixa.

### Regra de dados
A visão **Caixa** usa a mesma regra do card Caixa:

1. venda precisa estar paga/entregue ou ser pagamento antecipado;
2. a data considerada é `paymentDate`;
3. se `paymentDate` não existir, usa `expectedPaymentDate`, `saleDate` ou `createdAt` como fallback;
4. respeita os filtros atuais de período, vendedor e pagamento.

### Arquivo alterado
- `src/modules/sales-dashboard/sales-dashboard-screen.tsx`

### Preservado
- Next.js
- Supabase
- tela de cadastro/edição de venda
- filtros de período, vendedor e tipo de pagamento
- regras de comissão da Rayany e vendedores
- regra de subcomissão como valor pago ao vendedor
