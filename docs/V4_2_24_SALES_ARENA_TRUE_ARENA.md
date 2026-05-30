# KAU v4.2.24 — Sales Arena True Arena

Refatoração total da Sales Arena para remover aparência de dashboard comum e transformar a tela em uma disputa visual premium entre Rayany e Elisangela.

## Alterações

- Removido painel genérico de Operação / Minha comissão / A pagar vendedores / Ticket médio.
- Criada experiência central **Corrida da Arena**.
- Mantidos apenas 4 blocos conceituais: cabeçalho, corrida, placar da disputa e movimentos.
- Regras reais por vendedora:
  - Rayany: 15% sobre vendas próprias, meta semanal R$ 3.000, meta mensal R$ 12.000.
  - Elisangela: 5% sobre vendas próprias, meta semanal R$ 650, meta mensal R$ 2.600.
- Barras de progresso maiores, com trilha, linha final e microanimação.
- Placar da disputa com líder, perseguidora, diferença atual e vendas mínimas para mudar a liderança.
- Movimentos da Arena preservado e reforçado como feed vivo.
- Atualização automática a cada 4 segundos, no focus da janela e no evento `kau:sales-changed`.

## Fonte de dados

A tela continua usando dados reais de `/api/sales`, sem mocks.
