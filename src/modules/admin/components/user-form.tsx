"use client";

import { useState, type FormEvent } from "react";
import type { UserProfile, UserProfileInput, UserRole } from "@/data/user-profile-types";

type UserFormProps = {
  initial?: UserProfile | null;
  onSubmit: (payload: UserProfileInput) => Promise<void>;
  onCancel: () => void;
};

const inputClass = "w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-money/40";

export function UserForm({ initial, onSubmit, onCancel }: UserFormProps) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [sellerDisplayName, setSellerDisplayName] = useState(initial?.sellerDisplayName ?? "");
  const [role, setRole] = useState<UserRole>(initial?.role ?? "seller");
  const [commissionPercent, setCommissionPercent] = useState(String(initial?.commissionPercent ?? 5));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await onSubmit({
        email: email.trim(),
        password: password || undefined,
        fullName: fullName.trim(),
        sellerDisplayName: sellerDisplayName.trim(),
        role,
        commissionPercent: Number(commissionPercent),
        isActive
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/40">E-mail</span>
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={Boolean(initial)} />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/40">{initial ? "Nova senha (opcional)" : "Senha"}</span>
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!initial} minLength={6} />
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/40">Nome completo</span>
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/40">Nome de vendedor</span>
          <input className={inputClass} value={sellerDisplayName} onChange={(e) => setSellerDisplayName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/40">Perfil</span>
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="seller">Vendedor</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/40">Comissão %</span>
          <input className={inputClass} type="number" min={0} max={100} step="0.01" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} required />
        </label>
      </div>

      {initial ? (
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm font-semibold text-white/80">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Usuário ativo
        </label>
      ) : null}

      {error ? <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70">
          Cancelar
        </button>
        <button type="submit" disabled={isSaving} className="rounded-2xl border border-money/30 bg-money px-5 py-3 text-sm font-black text-[#02130b] disabled:opacity-60">
          {isSaving ? "Salvando..." : initial ? "Salvar alterações" : "Criar usuário"}
        </button>
      </div>
    </form>
  );
}
