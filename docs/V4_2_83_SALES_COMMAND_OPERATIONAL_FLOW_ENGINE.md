# V4.2.83 - Sales Command Operational Flow Engine

## O que mudou
- Sales Command deixou de ser apenas visual e passou a ter motor de condução.
- Botões de resposta do lead agora alteram etapa, script, tom, status emocional, chance, momentum, risco e próxima ação.
- Objeções rápidas agora mudam o fluxo para etapa de Objeção, atualizam risco e exibem resposta/próximo passo.
- Avançar etapa atualiza script, status operacional e histórico contextual.
- Confirmar pedido ativa confirmação final e marca lead como vendido na tela.
- Copiar script registra preparo da fala.
- Follow-up força controle de próxima ação para não deixar lead solto.
- Adicionada jornada real com 12 etapas: Abertura, Conexão, Diagnóstico, Dor, Desejo, Explicação, Oferta, Objeção, Fechamento, Dados do pedido, Confirmação e Follow-up.

## Preservado
- Supabase como fonte dos leads.
- API `/api/leads` e PATCH de status.
- Restante do KAU sem alterações.
