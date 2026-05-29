"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gauge, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (signInError) {
        throw new Error(signInError.message === "Invalid login credentials" ? "E-mail ou senha inválidos." : signInError.message);
      }

      const next = searchParams.get("next") || "/";
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#02060d] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,.16),transparent_30%)]" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-black/45 p-8 shadow-[0_30px_120px_rgba(0,0,0,.55)] backdrop-blur-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Gauge className="h-10 w-10 text-money" />
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-money">KAU Commercial OS</p>
            <h1 className="text-3xl font-black text-white">Entrar</h1>
          </div>
        </div>

        <p className="mb-6 text-sm leading-6 text-white/58">Acesso restrito. Usuários são criados somente pela administradora do sistema.</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-white/40">
              <Mail size={14} /> E-mail
            </span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-money/40 focus:shadow-[0_0_0_3px_rgba(16,185,129,.08)]"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-white/40">
              <LockKeyhole size={14} /> Senha
            </span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-money/40 focus:shadow-[0_0_0_3px_rgba(16,185,129,.08)]"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error ? <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-money/30 bg-money px-5 py-3 text-sm font-black text-[#02130b] shadow-[0_0_44px_rgba(16,185,129,.2)] transition hover:bg-[#22e59b] disabled:opacity-60"
          >
            {isSubmitting ? "Entrando..." : "Acessar KAU"}
          </button>
        </form>
      </div>
    </div>
  );
}
