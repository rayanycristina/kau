# Correções aplicadas

Esta versão remove o erro inicial de build em `next/font`/PostCSS e deixa o projeto mais estável no Windows.

## O que foi corrigido

1. `postcss.config.js` foi convertido para `postcss.config.cjs` para evitar o erro:
   `ReferenceError: module is not defined in ES module scope`.

2. O campo `"type": "module"` foi removido do `package.json` para evitar conflito entre configs CommonJS e ES Modules.

3. `next/font/google` foi removido do `layout.tsx` para evitar falhas de fonte durante o build/dev em ambientes com rede instável ou cache frio.

4. A fonte base agora é definida diretamente em `globals.css` com stack premium de sistema.

5. Script de lint atualizado para ESLint direto.

6. `.env.example` adicionado para realtime opcional.

## Rodar

```bash
npm install
npm run dev
```

Abra:

```txt
http://localhost:3000
```

## V4.2.7
- Botão olho para abrir e editar venda.
- Edição completa de venda em drawer.
- Troca de PAD/COD/Pagamento Antecipado em venda existente.
- PATCH completo em `/api/sales`.
- Card Operação ajustado para comissões operacionais do dia.

## v4.2.18 — Sales Arena Premium

- Sales Arena recriada como central de performance comercial premium.
- Página usa dados reais do Supabase via `/api/sales` e `/api/leads`.
- Lateral direita KAU AI removida da Sales Arena.
- Metas Rayany: R$ 3.000 semanal e R$ 12.000 mensal.
- Meta Elisangela: R$ 2.600 mensal em comissão dela.
- Status psicológico, inteligência da meta, ranking, missões do dia e exportação CSV adicionados.
- API de leads com cabeçalho `Cache-Control: no-store` para evitar leitura visual cacheada após exclusão.

## v4.2.19 — Sales Arena Refinement

- Removido título duplicado dentro da Sales Arena.
- Removido bloco “Copiloto operacional / Inteligência da meta” da tela principal.
- Removido Quick Dock/IA Recomenda da Sales Arena.
- Botão “Editar metas” agora abre modal de metas.
- Hero principal da Rayany ajustado para largura total, com menos sensação de tela vazia.

## v4.2.32 — Sales Arena Safe Visual Reset

- Volta a Sales Arena para a base visual mais estável e aprovada.
- Remove a direção experimental que deixou a arena visualmente ruim.
- Mantém os cálculos reais e Supabase como fonte de verdade.
