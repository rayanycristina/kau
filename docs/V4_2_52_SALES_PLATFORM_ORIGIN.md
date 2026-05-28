# KAU v4.2.52 - Sales Platform Origin

## Objetivo
Adicionar origem de plataforma na venda para identificar de onde cada venda veio.

## Plataformas
- Payt: origem da venda
- Coinzz: origem da venda
- Logzz: origem da venda

## Alterações
- Criado `src/data/sales-platforms.ts`.
- Adicionados logos em `public/platforms/`.
- Adicionado campo `salePlatform` em `SaleInput` e `SaleRecord`.
- API `/api/sales` mapeia `sale_platform`.
- Formulário de venda ganhou seleção visual de plataforma.
- Selecionar plataforma não força modalidade.
- A modalidade deve ser definida separadamente: PAD, COD ou Pagamento Antecipado.
- Filtro de vendas ganhou filtro por plataforma.
- Tabela de vendas mostra a plataforma de origem.

## Supabase
Executar no Supabase SQL Editor:

```sql
supabase/011_sales_platform.sql
```

Sem essa migration, o app ainda pode funcionar, mas o campo de plataforma precisa existir para persistir corretamente no banco.
