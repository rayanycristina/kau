# KAU V2 — Cinematic Operational Cockpit

## Direção

A V2 converte o Command Center em um ambiente vivo. O centro não é mais um KPI: é um reator operacional. A interface pulsa, varre, respira e pressiona ação.

## Princípios aplicados

1. **Centro dominante:** Revenue Reactor com barras vivas, anéis orbitais e dinheiro em movimento.
2. **Pressão psicológica:** Money Alert mostra dinheiro esfriando e tempo até perda provável.
3. **Execução imediata:** Command Dock apresenta a recomendação da IA como primeira camada de ação.
4. **Ambiente vivo:** partículas, glows, tactical grid e scan line criam sensação de sistema operacional.
5. **IA como supervisor:** KAU AI diagnostica operação, estima impacto e propõe próxima ação.

## Componentes principais

- `OperationalEnvironment`
- `RevenueReactor`
- `MissionPriorityStrip`
- `TacticalButton`
- `LiveCallsPanel`
- `MoneyAlertPanel`
- `FollowUpPanel`
- `QuickDock`
- `AiCopilot`

## Realtime behavior

`RealtimeBoot` conecta Socket.io se `NEXT_PUBLIC_SOCKET_URL` existir. Sem socket, simula:

- heartbeat a cada 1.8s
- receita fechada a cada ciclo probabilístico
- risco escalando se nenhuma ação acontece

## Próximas camadas

- navegação real entre módulos
- live transcript no Live Call Copilot
- sound design premium
- protótipo mobile companion
- WebSocket server de eventos comerciais
