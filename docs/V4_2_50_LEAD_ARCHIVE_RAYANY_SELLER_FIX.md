# KAU v4.2.50 — Lead Archive Rayany Seller Fix

## Ajuste aplicado
Corrigida a tela **Arquivo do Lead** para exibir Rayany Cristina no campo **Vendedor**.

## Arquivos alterados
- `src/data/lead-sellers.ts`
- `src/app/api/leads/route.ts`
- `src/modules/conversational-pipeline/lead-archive-screen.tsx`
- `src/data/sellers.ts`

## Regras preservadas
- Supabase continua como fonte da verdade.
- Rayany/Rayany Cristina continua sendo identificada pela regra de dona/vendedora principal por conter `rayany` no nome.
- Comissão da Rayany permanece 15%.
- Elisangela permanece 5%.

## Opções de vendedor no Arquivo do Lead
- Gabriel Moreira
- Rayany Cristina
- Elisangela
