# KAU — Commercial Performance Operating System

**Tagline:** The Operating System of Commercial Performance.

Esta é a versão 2 do cockpit KAU para a operação AlphaSin. O projeto foi reestruturado para parecer menos dashboard e mais ambiente operacional vivo: reator de receita, camadas ambientais, IA contextual, alertas psicológicos, command dock inteligente e microinterações táteis.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra:

```txt
http://localhost:3000
```

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- Zustand
- React Query
- Socket.io client
- Radix-ready UI architecture

## O que mudou na V2

- Money Pulse virou um Revenue Reactor animado.
- Money Alert ganhou pressão visual, contagem emocional e ações diretas.
- AI Copilot recebeu diagnóstico operacional e recomendação contextual.
- Command Dock virou camada de execução recomendada pela IA.
- Sidebar agora expõe dinheiro em risco e contexto operacional por módulo.
- Ambiente ganhou partículas, grid tático, varredura e luz volumétrica.
- Realtime fake local simula heartbeat, receita entrando e risco escalando quando não há socket configurado.

## Variável realtime opcional

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

Sem essa variável, o cockpit usa simulação local para manter a sensação viva.


## V3 - Navegacao real

A sidebar agora e clicavel e abre rotas reais do Next.js App Router. As principais areas do KAU foram criadas em `src/app/*/page.tsx`, usando `ModuleShell` para manter a experiencia de sistema operacional: Navigation, Topbar, AI Copilot, ambiente cinematico e Command Dock.

Rotas principais: `/live-calls`, `/pipeline`, `/follow-up`, `/money-alert`, `/cod-pad`, `/sales-arena`, `/coach-ai`, `/ceo-briefing`, `/settings`, `/call-review`, `/revenue-leak`.

## Persistencia real com Supabase

Esta versão inclui registro real de vendas AlphaSin via Supabase.

1. Execute `supabase/001_sales.sql` no SQL Editor do Supabase.
2. Crie `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

3. Rode:

```bash
npm install
npm run dev
```

No Command Dock inferior, use **Registrar Venda**. A venda é salva em `public.sales`, a comissão de 5% é calculada e o cockpit atualiza Money Pulse, faturamento e comissão dos vendedores.

## V4.2.6 - Caixa como dinheiro no bolso

Nesta versao, o card Caixa nao mostra mais faturamento bruto. Ele mostra apenas a carteira confirmada:
- pagamento antecipado entra como pago;
- PAD/COD ficam pendentes ate usar "Marcar pago";
- venda da Rayany entra pelo percentual de comissao dela;
- venda de outros vendedores entra pela parte do gestor/Rayany.

Se o botao "Marcar pago" nao atualizar no Supabase, execute `supabase/006_sales_update_payment_policy.sql`.
