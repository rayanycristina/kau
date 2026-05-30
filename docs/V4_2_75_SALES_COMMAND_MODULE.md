# V4.2.75 — Sales Command Module

## Objetivo
Criar a nova aba Sales Command como uma central operacional de fechamento, follow-up e inteligência comercial.

## Entregas
- Nova rota `/sales-command`.
- Novo módulo `src/modules/sales-command/sales-command-screen.tsx`.
- Novo item de navegação `Sales Command`.
- Layout inspirado em operação conversacional premium: lista de leads, conversa, playbook, objeções, follow-up e IA comercial.

## Preservação técnica
- Nenhuma alteração em Supabase.
- Nenhuma alteração nas tabelas existentes.
- Nenhuma alteração nos módulos de Vendas, Sales Arena, Leads ou financeiro.
- A tela consome `/api/leads` existente e usa estados vazios quando não houver dados.
