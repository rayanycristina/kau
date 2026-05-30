# KAU V3 - Navegacao real e modulos clicaveis

Esta versao corrige a falha da V2: a sidebar agora usa rotas reais do Next.js App Router e cada area lateral abre uma tela propria dentro do shell operacional da KAU.

## Rotas criadas

- `/` - Command Center
- `/live-calls` - Live Call Copilot
- `/pipeline` - Conversational Pipeline
- `/follow-up` - Follow-up Machine
- `/money-alert` - Money Alert Center
- `/cod-pad` - COD/PAD Intelligence
- `/sales-arena` - Sales Arena
- `/coach-ai` - Coach AI
- `/ceo-briefing` - CEO Briefing / Relatorios
- `/settings` - Configuracoes
- `/call-review` - Call Review
- `/revenue-leak` - Revenue Leak Detector

## O que mudou

- `src/shell/navigation.tsx` agora usa `next/link` e `usePathname`.
- `src/shell/module-shell.tsx` criou um shell reutilizavel com sidebar, topbar, AI Copilot, ambiente e dock.
- Cada rota em `src/app/*/page.tsx` renderiza seu modulo real.
- As telas deixaram de ser placeholders genericos e ganharam experiencias especificas:
  - ligacao ao vivo com waveform, transcript e coach IA;
  - money alert com fila de dano e timer psicologico;
  - follow-up com fila de pressao;
  - pipeline com funil inteligente;
  - COD/PAD com risco logistico;
  - Sales Arena com podio, XP e prestigo;
  - Coach AI com heatmap de habilidades;
  - CEO Briefing com prioridades executivas.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` e clique nos itens da lateral.
