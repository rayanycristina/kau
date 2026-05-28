# KAU V3.1.2 - Command Dock Actions

Correção focada no Command Dock inferior.

## Problema
Os botões do dock visualmente pareciam clicáveis, mas não executavam nenhuma ação.

## Correção
Agora todos os comandos do dock abrem uma camada de ação tática:

- IA recomenda
- Nova Ligação
- Novo Lead
- Enviar Mensagem
- Agendar Follow-up
- Nova Proposta
- Adicionar

Cada ação abre um modal premium com:

- contexto operacional AlphaSin
- impacto estimado
- campos táticos
- CTA principal
- feedback de conclusão

## Arquivos alterados

- `src/modules/command-center/components/quick-dock.tsx`
- `src/components/ui/tactical-button.tsx`

## Observação
A aparência do cockpit foi preservada. A mudança foi apenas de comportamento/interação.
