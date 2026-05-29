"use client";

import type { UserProfile } from "@/data/user-profile-types";

type UsersTableProps = {
  users: UserProfile[];
  onEdit: (user: UserProfile) => void;
};

export function UsersTable({ users, onEdit }: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <div className="grid grid-cols-[1.2fr_1fr_.7fr_.6fr_.5fr] gap-3 border-b border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[.16em] text-white/35">
        <span>Usuário</span>
        <span>E-mail</span>
        <span>Vendedor</span>
        <span>Perfil</span>
        <span>Status</span>
      </div>
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => onEdit(user)}
          className="grid w-full grid-cols-[1.2fr_1fr_.7fr_.6fr_.5fr] gap-3 border-b border-white/8 px-4 py-4 text-left transition last:border-b-0 hover:bg-white/[.025]"
        >
          <span>
            <p className="font-black text-white">{user.fullName}</p>
            <p className="text-xs text-white/42">{user.commissionPercent}% comissão</p>
          </span>
          <span className="truncate text-sm font-semibold text-white/70">{user.email}</span>
          <span className="text-sm font-semibold text-cyan">{user.sellerDisplayName}</span>
          <span className="text-sm font-black uppercase text-money">{user.role}</span>
          <span className={`text-sm font-bold ${user.isActive ? "text-money" : "text-danger"}`}>{user.isActive ? "Ativo" : "Inativo"}</span>
        </button>
      ))}
    </div>
  );
}
