# KAU V4.2.2 Sales OS Pro Cleanup

Correções:
- Removeu texto "Vendas AlphaSin" da rota de vendas.
- KAU tratado como plataforma independente, sem produto fixo na tela de vendas.
- Pagamento antecipado em caixa alta: PAGAMENTO ANTECIPADO.
- Labels de previsão agora explicam recebimento: Recebimentos previstos / Previsão de recebimento.
- Botão Atualizar força recarga com cache-buster e feedback visual.
- Exclusão de venda agora verifica se o Supabase realmente deletou o registro.
- Se a venda voltar no F5, rode `supabase/005_sales_delete_policy.sql`.
- Visual da tela de vendas simplificado para parecer mais profissional e menos template/IA.
- Rayany: 15% nas próprias vendas, sem adicional de 10%.
- Vendas de outros vendedores: comissão do vendedor + 10% de ganho para Rayany.

- WorkbenchShell em Vendas agora não exibe subtítulo legado.
- Topbar não renderiza subtítulo vazio.
- Defaults SQL removem AlphaSin da tabela sales para novos registros.
