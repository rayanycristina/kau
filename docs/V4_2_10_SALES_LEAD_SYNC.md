# KAU V4.2.10 — Sales Lead Sync

Ajustes operacionais na pagina de Vendas:

- Botao de recebimento pendente mudou de "Pago" para "Receber" para nao parecer status pago.
- A linha da venda agora mostra a data da venda ao lado da cidade, em vez de horario solto.
- Campo Telefone agora e obrigatorio no lancamento para gerar lead melhor.
- Toda venda nova cria automaticamente um lead operacional em `public.leads`.
- O lead criado entra como quente, vendido e com observacao de acompanhamento.
- Edicao da venda continua pelo icone de olho.
- Nao altera regras de comissao, caixa, pagamento ou calculo.

Observacao: para o lead automatico funcionar, a tabela `leads` precisa existir e ter policy de insert liberada, como no SQL `supabase/002_leads.sql`.
