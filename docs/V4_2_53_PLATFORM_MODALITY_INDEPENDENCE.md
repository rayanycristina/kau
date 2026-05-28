# KAU Commercial OS — v4.2.53
## Plataforma independente da modalidade de pagamento

### Motivo
Na v4.2.52, ao selecionar Payt ou Coinzz, o formulário forçava a venda para PAD. Isso estava incorreto, porque a mesma plataforma também pode receber vendas com pagamento antecipado.

### Ajuste aplicado
A plataforma agora representa somente a **origem da venda**:

- Payt
- Coinzz
- Logzz

A modalidade continua sendo escolhida separadamente no topo do formulário:

- PAD
- COD
- Pagamento antecipado

### Nova regra
Selecionar uma plataforma **não altera mais**:

- modalidade da venda
- status do pagamento
- método de pagamento
- tipo de entrega
- data prevista de recebimento
- data de pagamento

### Exemplo correto
- Payt + PAD
- Payt + Pagamento antecipado
- Coinzz + PAD
- Coinzz + Pagamento antecipado
- Logzz + COD
- Logzz + Pagamento antecipado, se a operação usar dessa forma

### Arquivos alterados
- `src/data/sales-platforms.ts`
- `src/modules/sales-dashboard/sales-dashboard-screen.tsx`

### Observação
A coluna `sale_platform` continua sendo usada no Supabase. Nenhuma nova migration é necessária se a migration da v4.2.52 já foi executada.
