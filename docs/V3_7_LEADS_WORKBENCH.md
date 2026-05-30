# KAU V3.7 Leads Workbench

## Correções
- A tela `/pipeline` não usa mais o painel lateral da KAU AI, liberando largura operacional.
- A tela `/pipeline` não usa mais o Command Dock fixo, evitando que ele cubra campos e botões.
- A lista de leads foi redesenhada como tabela SaaS simples.
- A ficha do lead agora aparece abaixo da tabela, com seções claras.
- Mantém a tabela `public.leads` existente no Supabase. Não precisa rodar SQL novo.

## Fluxo
1. Cadastrar Lead pelo Command Center.
2. Abrir Leads no menu lateral.
3. Usar Dashboard ou Lista de Leads.
4. Clicar no lead.
5. Editar o arquivo do lead.
6. Salvar no Supabase.
