# KAU v4.2.22 - Sales Arena Realtime Alignment

Ajustes aplicados na Sales Arena:

- Regras de calculo alinhadas com a tela Vendas.
- Rayany agora usa a mesma logica da operacao:
  - venda da Rayany: 15%
  - venda de vendedor: 10% para Rayany
- Elisangela continua usando comissao dela:
  - 5% sobre as vendas dela
- Placar Vivo agora mostra:
  - Operacao total
  - Minha comissao
  - A pagar vendedores
  - Ticket medio
- Removido o bloco grande "Proxima acao para mover a barra".
- Criado bloco compacto "Pressao agora".
- Cores e tipografia reduzidas para ficar mais consistente com o restante do KAU.
- Fetch com cache no-store e query timestamp para reduzir divergencia visual entre Vendas e Sales Arena.

Observacao operacional:
Se a tela Vendas estiver filtrada em "Ultimos 30 dias" e a Sales Arena estiver em "Semana", os numeros de periodo nao serao iguais por regra de filtro. Dentro do mesmo periodo, a logica de comissao agora esta alinhada.
