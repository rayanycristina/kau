# KAU V4.1.3 Sales Cleanup

## Correções
- Removido Login operacional da tela de Vendas.
- Removido Configurar vendedora da tela de Vendas.
- Configuração de vendedores agora deve ficar em uma área própria futura: Equipe / Vendedores.
- Adicionado botão de excluir venda diretamente nas listas.
- Adicionada confirmação antes de apagar venda.
- Criado endpoint `DELETE /api/sales?id=<id>`.
- Mantida a regra de comissão:
  - Rayany = 15%
  - Gabriel = 5%
  - Elisangela = 5%
- Mantidas notificações:
  - Pedido gerado
  - Venda excluída
  - Badge real no sino
- Tela de Vendas mais limpa, mais operacional e menos poluída.

## Supabase
Rode `supabase/004_sales_os_patch.sql` para garantir permissão de delete no MVP.
