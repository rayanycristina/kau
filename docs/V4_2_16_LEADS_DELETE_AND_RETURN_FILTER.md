# KAU v4.2.16 - Leads Delete + Retorno Filter

Correções aplicadas na Lista de Leads:

- Adicionado botão de lixeira ao lado do olho em cada lead.
- A lixeira chama `DELETE /api/leads/:id` e remove o lead da lista em tempo real no frontend.
- Adicionada rota DELETE para leads no Next.js.
- Criada migration `supabase/007_leads_delete_policy.sql` para permitir delete na tabela `public.leads` quando o projeto estiver usando chave anon.
- O filtro visual que antes aparecia como `Mornos` agora aparece como `Retorno`, mantendo a mesma lógica interna de temperatura `warm` para não quebrar os dados existentes.

Observação operacional: se o Supabase estiver usando apenas a anon key, rode a migration `007_leads_delete_policy.sql` no SQL Editor para liberar exclusão de leads.
