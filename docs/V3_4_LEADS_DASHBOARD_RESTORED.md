# KAU V3.4 - Leads Dashboard Restored + Lightweight Lead File

Correção solicitada:

- A tela antiga de Leads / Conversational Pipeline foi restaurada como aba **Dashboard dos leads**.
- A nova área de cadastro e manutenção manual de leads foi mantida como aba **Lista de leads**.
- A interface da lista foi aliviada: menos hero, menos animação, menos painéis pesados e formulário direto.
- O fluxo continua salvando no Supabase na tabela `public.leads`.
- O botão **Cadastrar Lead** permanece ao lado de **Registrar Venda** no Command Dock.

Comportamento correto agora:

1. Sidebar > Leads abre a tela com o dashboard/pipeline antigo preservado.
2. Clique em **Lista de leads** para ver todos os leads salvos.
3. Clique em um lead para abrir o arquivo individual.
4. Atualize telefone, endereço, temperatura, status, retorno, vendedor, objeções, histórico e observações.
5. Clique em **Salvar arquivo do lead**.
6. Quando o lead comprar, marque como `Comprou` e use **Registrar Venda** para entrar no faturamento.

O objetivo desta versão é manter a aparência premium, mas reduzir peso na parte operacional de preenchimento diário.
