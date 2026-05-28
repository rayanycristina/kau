# KAU V3.3 - Lead Operating System

Esta versão adiciona o fluxo operacional que substitui a planilha diária de leads.

## O que entrou

- Botão **Cadastrar Lead** ao lado de **Registrar Venda** no Command Dock.
- Cadastro rápido com nome, telefone, cidade, temperatura e próxima ação.
- Tabela Supabase `public.leads`.
- API `/api/leads` para criar/listar leads.
- API `/api/leads/[id]` para editar o arquivo vivo de cada lead.
- Tela **Leads** com dashboard + lista + ficha detalhada editável.

## Como criar a tabela

Execute no Supabase SQL Editor o arquivo:

```txt
supabase/002_leads.sql
```

## Campos principais do lead

- Nome
- Telefone
- Cidade
- Endereço
- Bairro
- Temperatura: quente, morno, frio
- Status: novo, atendeu, não atendeu, agendado, ligar daqui pouco, retornar amanhã, proposta enviada, vendido, perdido
- Prioridade
- Vendedor
- Próxima ação
- Data/hora da próxima ação
- Valor estimado
- Origem
- Objeções
- Histórico de follow-up
- Observações

## Filosofia

Cada lead vira um arquivo comercial vivo. O vendedor não perde histórico. O gestor vê onde o dinheiro está parado. O sistema permite validação manual agora e automação futura depois.
