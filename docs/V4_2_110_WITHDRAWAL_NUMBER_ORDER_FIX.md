# V4.2.110 — Withdrawal Number Order Fix

## Objetivo
Corrigir apenas a numeração visual dos saques registrados.

## Ajuste
A lista continua exibindo os saques na ordem atual, mas a numeração `Saque 001`, `Saque 002` passa a ser calculada pela ordem real de criação do saque, do mais antigo para o mais novo.

## Preservado
- valores dos saques
- datas
- notas
- Supabase
- lógica financeira
- layout
- visual dos cards
- status badges da v4.2.108
