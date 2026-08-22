"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Plus, ShieldCheck, UserCheck, UsersRound, X } from "lucide-react";
import type { UserProfile, UserProfileInput } from "@/data/user-profile-types";
import { UserForm } from "@/modules/admin/components/user-form";
import { UsersTable } from "@/modules/admin/components/users-table";

type UserDrawerProps = {
  open: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onSubmit: (payload: UserProfileInput) => Promise<void>;
};

function UserDrawer({ open, user, onClose, onSubmit }: UserDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  const title = user ? `Editar ${user.fullName}` : "Novo usuário";

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button type="button" className="absolute inset-0 bg-[#02060b]/78 backdrop-blur-sm" onClick={onClose} aria-label="Fechar formulário" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-drawer-title"
        aria-describedby="user-drawer-description"
        className="relative flex h-full w-full max-w-[620px] flex-col border-l border-white/10 bg-[linear-gradient(160deg,#0b111a_0%,#070b12_62%,#07120f_100%)] shadow-[-30px_0_90px_rgba(0,0,0,.55)]"
      >
        <header className="flex items-start justify-between gap-5 border-b border-white/[.08] px-5 py-5 sm:px-7">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-money">
              <ShieldCheck size={13} /> Gestão de acesso
            </div>
            <h2 id="user-drawer-title" className="text-2xl font-black tracking-tight text-white">{title}</h2>
            <p id="user-drawer-description" className="mt-1 text-sm leading-6 text-white/48">
              {user ? "Atualize o perfil sem alterar os demais usuários." : "Crie um acesso interno com perfil e permissões existentes."}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-white/55 transition hover:bg-white/[.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-money/60"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>
        <UserForm key={user?.id ?? "new"} initial={user} onSubmit={onSubmit} onCancel={onClose} />
      </aside>
    </div>,
    document.body
  );
}

export function UsersAdminScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
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

  const counts = useMemo(
    () => ({
      active: users.filter((user) => user.isActive).length,
      admins: users.filter((user) => user.role === "admin").length,
      sellers: users.filter((user) => user.role === "seller").length
    }),
    [users]
  );

  const closeDrawer = useCallback(() => {
    setIsCreating(false);
    setEditingUser(null);
  }, []);

  async function createUser(payload: UserProfileInput) {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Não foi possível criar o usuário.");
    closeDrawer();
    setFeedback("Usuário criado com sucesso.");
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
    closeDrawer();
    setFeedback("Usuário atualizado com sucesso.");
    await loadUsers();
  }

  function openCreate() {
    setFeedback(null);
    setEditingUser(null);
    setIsCreating(true);
  }

  function openEdit(user: UserProfile) {
    setFeedback(null);
    setIsCreating(false);
    setEditingUser(user);
  }

  return (
    <div className="space-y-5 pb-10">
      <header className="relative overflow-hidden rounded-[28px] border border-white/[.09] bg-[linear-gradient(135deg,rgba(7,14,23,.98),rgba(8,20,25,.94)_55%,rgba(8,37,28,.64))] p-5 shadow-[0_28px_80px_rgba(0,0,0,.24)] sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-money/[.08] blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-money">
              <ShieldCheck size={13} /> Administração
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Usuários</h1>
            <p className="mt-2 text-sm leading-6 text-white/55">Gestão segura de acessos, perfis administrativos e vendedores da operação.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-money/35 bg-money px-5 text-sm font-black text-[#02130b] shadow-[0_12px_40px_rgba(31,255,128,.16)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-money/60"
          >
            <Plus size={17} /> Novo usuário
          </button>
        </div>

        <div className="relative mt-6 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Ativos", value: counts.active, icon: UserCheck },
            { label: "Administradores", value: counts.admins, icon: ShieldCheck },
            { label: "Vendedores", value: counts.sellers, icon: UsersRound }
          ].map((metric) => (
            <div key={metric.label} className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-black/20 px-4 py-3 backdrop-blur-sm">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-money/15 bg-money/[.07] text-money"><metric.icon size={16} /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.13em] text-white/36">{metric.label}</p>
                <p className="mt-0.5 text-xl font-black text-white">{isLoading ? "—" : metric.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      {feedback ? (
        <div className="flex items-center gap-2 rounded-2xl border border-money/20 bg-money/[.07] px-4 py-3 text-sm font-semibold text-money" role="status">
          <CheckCircle2 size={16} /> {feedback}
        </div>
      ) : null}

      {error ? <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-bold text-danger" role="alert">{error}</div> : null}

      <section className="overflow-hidden rounded-[26px] border border-white/[.09] bg-[linear-gradient(160deg,rgba(11,17,25,.94),rgba(6,10,16,.92))] shadow-[0_24px_70px_rgba(0,0,0,.22)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/[.07] px-5 py-4 sm:px-6">
          <div>
            <p className="text-sm font-black text-white">Gestão de acessos</p>
            <p className="mt-1 text-xs text-white/40">Perfis internos autorizados a utilizar o KAU.</p>
          </div>
          <span className="rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-white/45">
            {isLoading ? "Carregando" : `${users.length} ${users.length === 1 ? "usuário" : "usuários"}`}
          </span>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4 sm:p-5" aria-label="Carregando usuários">
            {[0, 1, 2].map((item) => <div key={item} className="h-[78px] animate-pulse rounded-2xl bg-white/[.035]" />)}
          </div>
        ) : (
          <UsersTable users={users} onEdit={openEdit} />
        )}
      </section>

      <UserDrawer open={isCreating || Boolean(editingUser)} user={editingUser} onClose={closeDrawer} onSubmit={editingUser ? updateUser : createUser} />
    </div>
  );
}
