# KAU v4.2.23 - Sales Arena Visual Rescue

Refatoracao da Sales Arena para reduzir poluicao visual, corrigir hierarquia e manter a parte mais forte da experiencia: Movimentos da Arena.

## Correcoes
- Visual da Sales Arena refeito com menos cores agressivas e menos texto.
- Corrida da Meta redesenhada em lanes compactas.
- Removido excesso de numeros duplicados na leitura principal.
- Mantida a logica de dados reais via `/api/sales` e `/api/leads`.
- Atualizacao automatica mais rapida: polling a cada 4 segundos, foco da janela e retorno de visibilidade.
- Adicionado botao Atualizar manual.
- Movimentos da Arena preservado e melhorado com microanimacao.
- Placar superior alinhado com a regra da tela Vendas:
  - Operacao = Minha comissao + A pagar vendedores
  - Minha comissao = Rayany 15% nas proprias + 10% nas vendas da equipe
  - A pagar vendedores = comissao do vendedor, ex: Elisangela 5%

## Metas
- Rayany semanal: R$ 3.000 de comissao
- Rayany mensal: R$ 12.000 de comissao
- Elisangela semanal: R$ 650 de comissao
- Elisangela mensal: R$ 2.600 de comissao
- Menor ticket: R$ 570
