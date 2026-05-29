"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ShieldCheck, UsersRound } from "lucide-react";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import type { UserProfile, UserProfileInput } from "@/data/user-profile-types";
import { UserForm } from "@/modules/admin/components/user-form";
import { UsersTable } from "@/modules/admin/components/users-table";

export function UsersAdminScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store", credentials: "include" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar usuários.");
      setUsers(payload.users ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function createUser(payload: UserProfileInput) {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Não foi possível criar o usuário.");
    setIsCreating(false);
    await loadUsers();
  }

  async function updateUser(payload: UserProfileInput) {
    if (!editingUser) return;
    const response = await fetch(`/api/admin/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Não foi possível atualizar o usuário.");
    setEditingUser(null);
    await loadUsers();
  }

  return (
    <div className="space-y-5 pb-10">
      <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(4,9,16,.96),rgba(9,18,28,.9)_48%,rgba(40,16,71,.62))] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-money/20 bg-money/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-money">
              <ShieldCheck size={13} /> Administração
            </div>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white">Usuários do sistema</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">Somente a administradora pode criar, editar e ativar ou desativar usuários.</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingUser(null); setIsCreating(true); }}
            className="inline-flex items-center gap-2 rounded-2xl border border-money/30 bg-money px-5 py-3 text-sm font-black text-[#02130b]"
          >
            <Plus size={16} /> Novo usuário
          </button>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">{error}</div> : null}

      <TacticalPanel glow="purple" className="p-5">
        <div className="mb-4 flex items-center gap-2 text-purple">
          <UsersRound size={18} />
          <p className="text-xs font-black uppercase tracking-[.18em]">Equipe cadastrada</p>
        </div>
        {isLoading ? <p className="text-sm text-white/50">Carregando usuários...</p> : <UsersTable users={users} onEdit={setEditingUser} />}
      </TacticalPanel>

      {isCreating ? (
        <TacticalPanel glow="green" className="p-5">
          <h2 className="mb-4 text-xl font-black text-white">Novo usuário</h2>
          <UserForm onSubmit={createUser} onCancel={() => setIsCreating(false)} />
        </TacticalPanel>
      ) : null}

      {editingUser ? (
        <TacticalPanel glow="cyan" className="p-5">
          <h2 className="mb-4 text-xl font-black text-white">Editar {editingUser.fullName}</h2>
          <UserForm initial={editingUser} onSubmit={updateUser} onCancel={() => setEditingUser(null)} />
        </TacticalPanel>
      ) : null}
    </div>
  );
}
