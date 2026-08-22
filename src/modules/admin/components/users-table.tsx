"use client";

import { Pencil, ShieldCheck, UserRound } from "lucide-react";
import type { UserProfile } from "@/data/user-profile-types";

type UsersTableProps = {
  users: UserProfile[];
  onEdit: (user: UserProfile) => void;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "KA";
}

export function UsersTable({ users, onEdit }: UsersTableProps) {
  if (!users.length) {
    return (
      <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
        <div>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/[.08] bg-white/[.035] text-white/38"><UserRound size={20} /></div>
          <p className="mt-4 text-sm font-black text-white">Nenhum usuário encontrado</p>
          <p className="mt-1 text-xs text-white/40">Os acessos cadastrados aparecerão aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="hidden grid-cols-[minmax(180px,1.25fr)_minmax(180px,1.25fr)_minmax(150px,.9fr)_110px_100px_44px] gap-4 border-b border-white/[.06] px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-white/30 lg:grid">
        <span>Usuário</span><span>E-mail</span><span>Identificação</span><span>Perfil</span><span>Status</span><span aria-label="Ações" />
      </div>
      <div className="divide-y divide-white/[.06]">
        {users.map((user) => (
          <div key={user.id} className="grid gap-4 px-4 py-4 transition hover:bg-white/[.022] sm:px-5 lg:grid-cols-[minmax(180px,1.25fr)_minmax(180px,1.25fr)_minmax(150px,.9fr)_110px_100px_44px] lg:items-center lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-money/15 bg-money/[.07] text-xs font-black text-money">{getInitials(user.fullName)}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{user.fullName}</p>
                <p className="mt-0.5 text-[11px] text-white/35">{user.role === "seller" ? `${user.commissionPercent}% de comissão` : "Acesso administrativo"}</p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[9px] font-black uppercase tracking-[.12em] text-white/25 lg:hidden">E-mail</p>
              <p className="truncate text-sm font-semibold text-white/62">{user.email}</p>
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[9px] font-black uppercase tracking-[.12em] text-white/25 lg:hidden">Identificação</p>
              <p className="truncate text-sm font-semibold text-white/70">{user.sellerDisplayName}</p>
            </div>
            <div>
              <p className="mb-1 text-[9px] font-black uppercase tracking-[.12em] text-white/25 lg:hidden">Perfil</p>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] ${user.role === "admin" ? "border-purple/25 bg-purple/10 text-purple" : "border-cyan/20 bg-cyan/[.07] text-cyan"}`}>
                {user.role === "admin" ? <ShieldCheck size={11} /> : <UserRound size={11} />}
                {user.role === "admin" ? "Admin" : "Vendedor"}
              </span>
            </div>
            <div>
              <p className="mb-1 text-[9px] font-black uppercase tracking-[.12em] text-white/25 lg:hidden">Status</p>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] ${user.isActive ? "border-money/20 bg-money/[.07] text-money" : "border-danger/20 bg-danger/[.07] text-danger"}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> {user.isActive ? "Ativo" : "Inativo"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onEdit(user)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-white/[.03] text-xs font-bold text-white/55 transition hover:border-money/20 hover:bg-money/[.06] hover:text-money focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-money/50 lg:w-10"
              aria-label={`Editar ${user.fullName}`}
            >
              <Pencil size={15} /><span className="lg:sr-only">Editar</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
