# Supabase already configured

This package already includes `.env.local` with the Supabase project URL and publishable anon key provided by the user.

Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://kkxthaofwoxtfvcoechi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mSV34S2wyKev2nr3v6wEBA_yDujyEtz
```

The `public.sales` table must exist in Supabase. The SQL migration is available at:

```txt
supabase/001_sales.sql
```

After extracting this project, run:

```bash
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000
```

Use the Command Dock action `Registrar Venda` to save AlphaSin sales into Supabase.
