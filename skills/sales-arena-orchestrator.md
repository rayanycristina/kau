# Sales Arena Orchestrator

## Função
Orquestrar as skills internas da KAU para qualquer pedido relacionado à Sales Arena ou melhoria de tela no SaaS.

Este arquivo define qual módulo consultar conforme o tipo de pedido e como combinar visual, lógica e copy para entregar uma experiência operacional consistente.

## Skills disponíveis
- UI/UX SaaS Architect: `/skills/ui-ux-saas-architect.md`
- Product Systems Architect: `/skills/product-systems-architect.md`
- Commercial Performance Copy: `/skills/commercial-performance-copy.md`

## Roteamento
### Pedido de design, layout ou aparência
Usar UI/UX SaaS Architect.
Exemplos:
- “ficou feio”
- “melhore o visual”
- “quero mais premium”
- “refatore a tela”
- “mude o layout”
- “parece dashboard comum”

### Pedido de cálculo, Supabase, filtros ou regra de negócio
Usar Product Systems Architect.
Exemplos:
- “os números não batem”
- “corrija a comissão”
- “data de pagamento não entra no caixa”
- “cadência não está atualizando”
- “filtro semana/mês está errado”
- “Supabase offline”

### Pedido de textos, nomes, status ou pressão psicológica
Usar Commercial Performance Copy.
Exemplos:
- “melhore os textos”
- “quero frases de pressão”
- “mude o nome dos módulos”
- “crie status melhores”
- “CTA mais forte”

### Pedido completo de Sales Arena
Usar as três juntas, nesta ordem:
1. Product Systems Architect define dados, regras e estados.
2. UI/UX SaaS Architect define estrutura, hierarquia e componentes.
3. Commercial Performance Copy define microcopy, status e CTAs.

## Processo obrigatório para Sales Arena
1. Identificar o problema dominante: visual, lógica, copy ou completo.
2. Confirmar regras que não podem quebrar:
   - Next.js
   - Supabase
   - vendas reais
   - metas Rayany e Elisangela
   - comissão Rayany 15%
   - comissão Elisangela 5%
   - filtros Hoje, Semana, Mês, Manhã, Tarde, Noite, Dia inteiro
3. Aplicar a estrutura operacional correta.
4. Verificar primeira dobra:
   - quanto falta para bater
   - progresso da meta
   - Rayany
   - Elisangela
   - quem lidera
   - vendas mínimas restantes
   - último movimento
5. Evitar card dentro de card.
6. Evitar dashboard administrativo.
7. Entregar ZIP completo quando houver alteração no projeto.

## Wireframe base recomendado
[HEADER FULL WIDTH]

[ZONA DE PRESSÃO FULL WIDTH]
Meta atual | Faltam | Barra gigante | Vendas mínimas | Status

[ZONA DE DISPUTA]
Rayany 50% largura | Elisangela 50% largura

[CENTRO ENTRE ELAS]
Diferença atual | Quem lidera | Vendas para virar

[ZONA INFERIOR]
Cadência 65% largura | Feed ao vivo 35% largura

## Proibido
- card dentro de card
- caixa dentro de caixa
- mini blocos repetidos sem necessidade
- layout empilhado vertical comum
- aparência de formulário
- painel de CRM
- relatório financeiro comum
- página de cards
- animação gamer
- neon exagerado
- texto motivacional genérico

## Resultado esperado
A Sales Arena deve parecer:
- mesa de comando de trader
- cockpit executivo
- central de pressão comercial
- produto proprietário premium
- ferramenta operacional para ficar aberta o dia inteiro
