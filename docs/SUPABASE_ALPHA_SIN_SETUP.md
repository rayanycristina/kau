# KAU AlphaSin - Supabase Persistence

Esta versão adiciona persistência real de vendas AlphaSin no Supabase.

## 1. Criar tabela

No Supabase, abra **SQL Editor** e execute:

```sql
-- arquivo do projeto
supabase/001_sales.sql
```

Isso cria a tabela:

```txt
public.sales
```

Campos principais:

```txt
cliente
telefone
cidade
produto AlphaSin
quantidade
valor total
vendedor
comissão 5%
forma/status de pagamento
entrega
previsão de recebimento
observação
created_at
```

## 2. Configurar `.env.local`

Na raiz do projeto, crie:

```txt
.env.local
```

Com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Use a **service role key somente no servidor**. Ela fica no `.env.local` e nunca deve ir para GitHub público.

## 3. Rodar

```bash
npm install
npm run dev
```

Ou modo mais leve:

```bash
npm run build
npm run start
```

## 4. Onde registra venda

No Command Dock inferior:

```txt
Registrar Venda
```

Ao confirmar, o sistema envia `POST /api/sales`, salva no Supabase e atualiza:

```txt
Money Pulse
Faturamento do dia
Comissão do vendedor
Quantidade de vendas
Última venda registrada
```

## 5. Como o cockpit lê os dados

O app consulta:

```txt
GET /api/sales/summary
```

A cada carregamento e depois em intervalos leves. Se Supabase não estiver configurado, o cockpit mantém dados visuais mockados para não quebrar o protótipo.

## 6. Comissão AlphaSin

Regra atual:

```txt
5% sobre o valor total da venda
```

Exemplo:

```txt
Venda R$ 850,00 → Comissão R$ 42,50
```
