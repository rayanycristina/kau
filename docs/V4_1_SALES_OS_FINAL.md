# KAU V4.1 Sales OS Final

## Ajustes finais
- PAD usa 7 dias úteis como padrão, mas a previsão pode ser alterada manualmente no campo `Previsão`.
- COD não preenche previsão automaticamente. O operador informa manualmente.
- PIX foi substituído por `Pagamento antecipado`, que cobre boleto, Pix ou cartão.
- Dashboard possui filtros por data, vendedor e tipo de venda.
- Métricas filtradas: faturamento, vendas, comissão, previstas na data e valor previsto.
- Listas filtradas: vendas do filtro e previstas na data filtrada.
- Registro de venda não envia `commission_amount` no insert.
- Dinheiro é exibido em formato brasileiro, por exemplo `R$ 1.194,00`.

## Observação
Se o banco antigo ainda calcular comissão errado, execute `supabase/004_sales_os_patch.sql` uma vez.
