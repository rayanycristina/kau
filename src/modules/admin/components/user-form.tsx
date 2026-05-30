'use client';

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
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    await onSubmit({
      email,
      password: password || undefined,
      fullName,
      sellerDisplayName,
      role,
      commissionPercent: Number(commissionPercent || 5),
      isActive
    });
    setIsSaving(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-white/10 bg-white/[.035] p-5 xl:grid-cols-2">
      <div>
        <label className="mb-2 block text-xs font-black uppercase tracking-[.16em] text-white/40">Nome completo</label>
        <input className={inputClass} value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      </div>
      <div>
        <label className="mb-2 block text-xs font-black uppercase tracking-[.16em] text-white/40">E-mail</label>
        <input className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </div>
      {!initial ? (
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-[.16em] text-white/40">Senha inicial</label>
          <input className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </div>
      ) : null}
      <div>
        <label className="mb-2 block text-xs font-black uppercase tracking-[.16em] text-white/40">Nome de vendedor exato</label>
        <input className={inputClass} value={sellerDisplayName} onChange={(event) => setSellerDisplayName(event.target.value)} required />
      </div>
      <div>
        <label className="mb-2 block text-xs font-black uppercase tracking-[.16em] text-white/40">Perfil</label>
        <select className={inputClass} value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
          <option value="seller">Seller</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div>
        <label className="mb-2 block text-xs font-black uppercase tracking-[.16em] text-white/40">Comissão (%)</label>
        <input className={inputClass} value={commissionPercent} onChange={(event) => setCommissionPercent(event.target.value)} type="number" min="0" max="100" step="0.01" />
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white/70">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Usuário ativo
      </label>
      <div className="flex items-end justify-end gap-3 xl:col-span-2">
        <button type="button" onClick={onCancel} className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase text-white/65">Cancelar</button>
        <button disabled={isSaving} className="rounded-2xl bg-money px-4 py-3 text-xs font-black uppercase text-black disabled:opacity-60">{isSaving ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}
