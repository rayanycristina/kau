'use client';

import { useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { Gauge, LockKeyhole } from "lucide-react";

const inputClass = "w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-money/40";

export function LoginForm() {
  const [email, setEmail] = useState("rayanycristina@icloud.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error("Supabase não configurado no ambiente.");
      }

      const supabase = createClient(supabaseUrl, anonKey);
      const { data, error: signError } = await supabase.auth.signInWithPassword({ email, password });

      if (signError || !data.session) {
        throw new Error(signError?.message || "Login inválido.");
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token
        })
      });

      if (!sessionResponse.ok) {
        const payload = await sessionResponse.json().catch(() => ({}));
        throw new Error(payload.error || "Não foi possível iniciar a sessão.");
      }

      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="kau-shell noise relative grid min-h-screen place-items-center overflow-hidden bg-black px-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(71,255,151,.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,.16),transparent_34%)]" />
      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-black/55 p-8 shadow-panel backdrop-blur-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Gauge className="h-10 w-10 text-money" />
          <div>
            <p className="text-4xl font-black tracking-tight text-money money-text">KAU</p>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-white/40">Acesso operacional</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-money/20 bg-money/10 p-4">
          <div className="flex items-center gap-2 text-sm font-black uppercase text-money">
            <LockKeyhole size={16} />
            Login protegido
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/58">
            Entre com seu usuário para acessar clientes, vendas, caixa e operação.
          </p>
        </div>

        <label className="mb-2 block text-xs font-black uppercase tracking-[.16em] text-white/45">E-mail</label>
        <input className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />

        <label className="mb-2 mt-4 block text-xs font-black uppercase tracking-[.16em] text-white/45">Senha</label>
        <input className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />

        {error ? <p className="mt-4 rounded-2xl border border-danger/25 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p> : null}

        <button disabled={isLoading} className="mt-6 w-full rounded-2xl bg-money px-5 py-3 text-sm font-black uppercase tracking-[.12em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
