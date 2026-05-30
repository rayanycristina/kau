# Frontend Architecture

## Layers
- app: Next.js App Router and route composition.
- shell: operating system chrome, navigation, copilot, topbar, quick dock.
- modules: business domains with screens and local components.
- components: shared tactical primitives.
- design-system: tokens, theme contracts and semantic rules.
- motion: animation variants and timing contracts.
- realtime: socket event contracts and bootstrapping.
- store: Zustand operational state.
- data: typed mock data, later replaced by API contracts.

## Realtime Contract
Socket event namespace: `kau:event`.
Critical event classes: revenue.closed, risk.escalated, followup.overdue, seller.inactive, heartbeat.

## Data Fetching
React Query owns server state. Zustand owns ephemeral UI/operational state. Socket events update caches and live store.
