# KAU v4.2.17 - Goals Arena + Lead Delete Fix

## Metas / Sales Arena

A tela Sales Arena foi refeita para virar uma Arena de Metas operacional, não um dashboard genérico.

### Regras configuradas

- Meta Rayany semanal: R$ 3.000,00 em comissão própria.
- Meta Rayany mensal: R$ 12.000,00 em comissão própria.
- Menor ticket Rayany: R$ 570,00.
- Comissão Rayany em venda própria: 15%.
- Meta Elisangela mensal: R$ 2.600,00 de comissão dela.
- Comissão Elisangela: 5% por venda.

### Experiência criada

- Progresso semanal Rayany com barra viva.
- Status da meta: Pressão ativa, Em ritmo, Zona de ataque, Meta dominada.
- Cálculo de quanto falta para bater a meta.
- Cálculo de quantas vendas mínimas faltam com base no ticket R$ 570,00.
- Placar mensal Rayany e Elisangela.
- Operação da dona: comissão Rayany no mês incluindo venda própria e 10% sobre vendas de equipe.
- Missões de hoje com linguagem de performance.

## Leads

A exclusão de leads foi reforçada.

Antes, em alguns Supabase com RLS, o delete podia retornar sem erro mas não apagar a linha. Agora a API confirma se o Supabase realmente deletou a linha.

Se retornar erro de policy, execute uma vez no SQL Editor:

- supabase/008_leads_delete_hardening.sql

