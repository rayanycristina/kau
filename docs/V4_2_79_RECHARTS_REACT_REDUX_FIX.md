# V4.2.79 — Recharts React Redux Fix

## Correção

Adicionada a dependência `react-redux` ao `package.json` para resolver o erro de build:

```txt
Module not found: Can't resolve 'react-redux'
```

## Contexto

O erro vinha do pacote `recharts`, que tenta importar `react-redux` internamente em versões recentes.

## O que não foi alterado

- Supabase
- lógica de vendas
- funil de vendas
- Sales Command
- filtros
- cálculos
- layout principal
