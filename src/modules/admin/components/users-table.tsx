'use client';

import type { UserProfile } from "@/data/user-profile-types";

type UsersTableProps = {
  users: UserProfile[];
  onEdit: (user: UserProfile) => void;
};

export function UsersTable({ users, onEdit }: UsersTableProps) {
  if (!users.length) {
    return <div className="p-6 text-sm font-semibold text-white/50">Nenhum usuário encontrado.</div>;
  }

  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-[1.2fr_1fr_.7fr_.6fr_.5fr] gap-3 border-b border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[.16em] text-white/35">
        <span>Usuário</span>
        <span>E-mail</span>
        <span>Vendedor</span>
        <span>Perfil</span>
        <span>Status</span>
      </div>
      {users.map((user) => (
        <button key={user.id} onClick={() => onEdit(user)} className="grid w-full grid-cols-[1.2fr_1fr_.7fr_.6fr_.5fr] gap-3 border-b border-white/5 px-4 py-4 text-left text-sm transition hover:bg-white/[.035]">
          <span className="font-bold text-white">{user.fullName}</span>
          <span className="text-white/55">{user.email}</span>
          <span className="font-semibold text-money">{user.sellerDisplayName}</span>
          <span className="uppercase text-white/55">{user.role}</span>
          <span className={user.isActive ? "text-money" : "text-danger"}>{user.isActive ? "Ativo" : "Inativo"}</span>
        </button>
      ))}
    </div>
  );
}
