'use client';

import { useEffect, useState } from "react";
import { Plus, ShieldCheck, UsersRound } from "lucide-react";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import type { UserProfile, UserProfileInput } from "@/data/user-profile-types";
import { UserForm } from "@/modules/admin/components/user-form";
import { UsersTable } from "@/modules/admin/components/users-table";

export function UsersAdminScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  async function loadUsers() {
    setIsLoading(true);
    setError(null);
    const response = await fetch("/api/admin/users", { credentials: "include" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error || "Erro ao carregar usuários.");
    else setUsers(payload.users || []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSubmit(input: UserProfileInput) {
    const isEdit = Boolean(editingUser);
    const url = isEdit ? `/api/admin/users/${editingUser?.id}` : "/api/admin/users";
    const response = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Erro ao salvar usuário.");
      return;
    }

    setIsCreating(false);
    setEditingUser(null);
    await loadUsers();
  }

  return (
    <div className="space-y-5 pt-5">
      <section className="grid gap-4 xl:grid-cols-3">
        <TacticalPanel glow="money" className="p-5">
          <ShieldCheck className="text-money" size={24} />
          <p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-money">Acesso protegido</p>
          <h2 className="mt-2 text-2xl font-black text-white">Usuários e permissões</h2>
          <p className="mt-2 text-sm text-white/55">Admin vê tudo. Vendedora vê apenas o próprio seller_name.</p>
        </TacticalPanel>

        <TacticalPanel glow="cyan" className="p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-cyan">Controle de equipe</p>
              <h3 className="mt-2 text-xl font-black text-white">Criar e desativar vendedores</h3>
            </div>
            <button onClick={() => { setIsCreating(true); setEditingUser(null); }} className="inline-flex items-center gap-2 rounded-2xl bg-money px-4 py-3 text-xs font-black uppercase text-black">
              <Plus size={16} />
              Novo usuário
            </button>
          </div>
        </TacticalPanel>
      </section>

      {error ? <div className="rounded-2xl border border-danger/25 bg-danger/10 p-4 text-sm font-bold text-danger">{error}</div> : null}

      {(isCreating || editingUser) ? (
        <UserForm
          initial={editingUser}
          onSubmit={handleSubmit}
          onCancel={() => { setIsCreating(false); setEditingUser(null); }}
        />
      ) : null}

      <TacticalPanel className="p-0">
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <UsersRound className="text-money" size={20} />
          <p className="text-sm font-black uppercase tracking-[.16em] text-white/65">{isLoading ? "Carregando..." : `${users.length} usuários`}</p>
        </div>
        <UsersTable users={users} onEdit={setEditingUser} />
      </TacticalPanel>
    </div>
  );
}
