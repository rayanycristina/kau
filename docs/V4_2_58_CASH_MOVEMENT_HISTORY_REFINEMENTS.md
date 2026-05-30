# V4.2.58 — Cash movement history refinements

## Ajustes aplicados
- setas do agrupamento por data agora expandem e recolhem os registros do dia
- total exibido no cabeçalho do dia prioriza o valor total de saques feitos naquela data
- data das entradas no caixa usa a data real de pagamento/liberação (`payment_date`), com fallback para `received_date`, `expected_payment_date` e `sale_date`
- coluna `Taxa` renomeada para `Comissão`
- nomes dos clientes no histórico receberam tipografia mais limpa e legível, alinhada a SaaS premium

## Objetivo
Melhorar leitura do extrato de caixa e deixar o histórico mais útil para auditoria diária de entradas e retiradas.
