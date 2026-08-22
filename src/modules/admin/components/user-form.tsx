"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BriefcaseBusiness, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, UserRound } from "lucide-react";
import type { UserProfile, UserProfileInput, UserRole } from "@/data/user-profile-types";

type UserFormProps = {
  initial?: UserProfile | null;
  onSubmit: (payload: UserProfileInput) => Promise<void>;
  onCancel: () => void;
};

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/24 focus:border-money/45 focus:bg-black/35 focus:ring-2 focus:ring-money/10 disabled:cursor-not-allowed disabled:opacity-55";
const labelClass = "mb-2 block text-[10px] font-black uppercase tracking-[.15em] text-white/42";

function FormSection({ icon: Icon, title, description, children }: { icon: typeof UserRound; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-white/[.07] bg-white/[.025] p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-white/[.035] text-money"><Icon size={16} /></div>
        <div>
          <h3 className="text-sm font-black text-white">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-white/38">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function UserForm({ initial, onSubmit, onCancel }: UserFormProps) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [sellerDisplayName, setSellerDisplayName] = useState(initial?.sellerDisplayName ?? "");
  const [role, setRole] = useState<UserRole>(initial?.role ?? "seller");
  const [commissionPercent, setCommissionPercent] = useState(String(initial?.commissionPercent ?? 5));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const commission = Number(String(commissionPercent).replace(",", "."));
  const canSubmit = useMemo(
    () =>
      Boolean(email.trim() && fullName.trim() && sellerDisplayName.trim()) &&
      (Boolean(initial) || password.length >= 6) &&
      (role === "admin" || (Number.isFinite(commission) && commission >= 0 && commission <= 100)),
    [commission, email, fullName, initial, password.length, role, sellerDisplayName]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isSaving) return;
    setError(null);
    setIsSaving(true);

    try {
      await onSubmit({
        email: email.trim(),
        password: password || undefined,
        fullName: fullName.trim(),
        sellerDisplayName: sellerDisplayName.trim(),
        role,
        commissionPercent: role === "seller" ? commission : initial?.commissionPercent ?? 0,
        isActive
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
        <FormSection icon={UserRound} title="Identidade" description="Informações usadas para identificar este acesso.">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelClass}>Nome completo</span>
              <input autoFocus className={inputClass} value={fullName} onChange={(event) => setFullName(event.target.value)} required disabled={isSaving} autoComplete="name" />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>E-mail</span>
              <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={Boolean(initial) || isSaving} autoComplete="email" />
            </label>
          </div>
        </FormSection>

        <FormSection icon={ShieldCheck} title="Acesso" description="Use somente os perfis já suportados pelo KAU.">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["seller", "admin"] as UserRole[]).map((option) => {
              const selected = role === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  disabled={isSaving}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-money/30 bg-money/[.09] text-money" : "border-white/[.08] bg-black/20 text-white/58 hover:bg-white/[.04]"}`}
                  aria-pressed={selected}
                >
                  <span className="block text-xs font-black uppercase tracking-[.1em]">{option === "admin" ? "Administrador" : "Vendedor"}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-white/38">{option === "admin" ? "Gestão e operação administrativa" : "Acesso comercial vinculado"}</span>
                </button>
              );
            })}
          </div>
        </FormSection>

        <FormSection icon={BriefcaseBusiness} title={role === "seller" ? "Vendas" : "Identificação operacional"} description={role === "seller" ? "Nome de exibição e comissão do vendedor." : "Nome exibido nas áreas internas do sistema."}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`block ${role === "admin" ? "sm:col-span-2" : ""}`}>
              <span className={labelClass}>{role === "seller" ? "Nome de vendedor" : "Nome de exibição"}</span>
              <input className={inputClass} value={sellerDisplayName} onChange={(event) => setSellerDisplayName(event.target.value)} required disabled={isSaving} />
            </label>
            {role === "seller" ? (
              <label className="block">
                <span className={labelClass}>Comissão %</span>
                <input className={inputClass} type="number" min={0} max={100} step="0.01" value={commissionPercent} onChange={(event) => setCommissionPercent(event.target.value)} required disabled={isSaving} inputMode="decimal" />
              </label>
            ) : null}
          </div>
        </FormSection>

        <FormSection icon={KeyRound} title="Segurança" description={initial ? "Preencha somente se desejar substituir a senha atual." : "Defina uma senha inicial segura para este acesso."}>
          <label className="block">
            <span className={labelClass}>{initial ? "Nova senha (opcional)" : "Senha inicial"}</span>
            <div className="relative">
              <input
                className={`${inputClass} pr-12`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required={!initial}
                minLength={6}
                disabled={isSaving}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-white/40 transition hover:bg-white/[.05] hover:text-white"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-white/34">Mínimo de 6 caracteres. A senha não será exibida após o salvamento.</p>
          </label>
        </FormSection>

        {initial ? (
          <label className="flex items-center justify-between gap-4 rounded-[22px] border border-white/[.07] bg-white/[.025] px-5 py-4">
            <span>
              <span className="block text-sm font-black text-white">Usuário ativo</span>
              <span className="mt-1 block text-xs text-white/38">Usuários inativos não devem acessar a operação.</span>
            </span>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={isSaving} className="h-5 w-5 accent-[#2cff88]" />
          </label>
        ) : null}

        {error ? <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger" role="alert">{error}</div> : null}
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-white/[.08] bg-black/20 px-5 py-4 sm:px-7">
        <button type="button" onClick={onCancel} disabled={isSaving} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/65 transition hover:bg-white/[.04] hover:text-white disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={!canSubmit || isSaving} className="inline-flex min-w-[148px] items-center justify-center gap-2 rounded-2xl border border-money/30 bg-money px-5 py-3 text-sm font-black text-[#02130b] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
          {isSaving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : initial ? "Salvar alterações" : "Criar usuário"}
        </button>
      </footer>
    </form>
  );
}
