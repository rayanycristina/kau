# Margem Líquida Realizada

O widget **Margem Líquida Real** do Command Center é uma leitura financeira realizada. Ele não usa vendas potenciais, recebíveis pendentes ou capital em giro.

## Receita Líquida Realizada

Uma venda participa somente quando:

- `payment_status = 'paid'`;
- o estado financeiro central permite caixa (`order_status = active`);
- existe `payment_date` real dentro do período;
- existe `operation_commission_amount` exato.

O valor bruto `total_amount`, a subcomissão `commission_amount`, data da venda e data da entrega não substituem esses campos. Vendas soft-deleted permanecem no histórico realizado, como já ocorre no Caixa/Histórico, desde que o fato financeiro continue válido.

### Limitação de proveniência histórica

As migrations 009/010 preencheram `payment_date` de algumas vendas que já estavam pagas usando `expected_payment_date`, `sale_date` ou `created_at`. O schema atual não possui um marcador que diferencie essas datas legadas das datas confirmadas manualmente. O widget usa `payment_date` por ser o campo canônico disponível, mas sinaliza essa limitação e não substitui a data por qualquer outro campo durante o cálculo. Uma trilha de proveniência exigiria decisão de negócio e revisão dos registros legados; nenhum dado é corrigido automaticamente por esta implementação.

## Despesas Reais

O total do período é:

```text
SUM(expenses.amount)
+ SUM(expense_tax_items.amount vinculados às despesas do período)
```

O corte temporal usa `expenses.expense_date`. Uma linha existente em `expenses` é o fato financeiro disponível no modelo atual; não existe status de pagamento ou soft delete nessa tabela.

Garantias pagas já geram uma despesa vinculada por `postpaid_guarantees.expense_id`, portanto não são somadas novamente. Investimento de Campanhas vem das mesmas despesas de Tráfego e também não é adicionado por fora. Saques são movimentações de caixa e não reduzem o resultado.

## Fórmulas

```text
Lucro Líquido Realizado
= Receita Líquida Realizada - Despesas Reais

Margem Líquida Realizada
= Lucro Líquido Realizado / Receita Líquida Realizada × 100
```

Quando a receita realizada é zero, a margem é `null` e a interface mostra `—`; não existe divisão por zero.

## Comparação

O período anterior possui a mesma quantidade inclusiva de dias e termina no dia imediatamente anterior ao início atual. A diferença de margem é exibida em pontos percentuais.

## Qualidade e lacunas conhecidas

- Pagamentos sem `payment_date` ficam fora de cortes temporais e são sinalizados.
- A contagem de pagamentos sem data é global, pois sem uma data real não existe período seguro ao qual atribuí-los; as demais pendências são avaliadas no respectivo período.
- Pagamentos sem `operation_commission_amount` não recebem fallback financeiro e são sinalizados.
- Possíveis despesas repetidas são sinalizadas, mas nunca removidas silenciosamente.
- Subcomissões não são deduzidas em paralelo: o modelo não permite provar se despesas de Equipe já representam esses repasses. Deduzir ambas poderia gerar dupla contagem.
- Exclusão física/estorno de despesas restata períodos históricos porque `expenses` ainda não é um ledger imutável.

Nenhuma meta de margem é inventada. O tanque aceita `targetMargin` futuramente, mas a linha permanece oculta enquanto não existir configuração real.
