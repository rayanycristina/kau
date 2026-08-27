"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Building2, Eye, EyeOff, Plus, ShieldCheck } from "lucide-react";
import type { PlatformCompany } from "@/data/company-types";

const PASSWORD_ERROR = "A senha temporária deve ter pelo menos 8 caracteres, com letra e número.";

function validTemporaryPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function PlatformCompaniesScreen() {
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [details, setDetails] = useState<PlatformCompany | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/platform/companies", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) setError(data.error);
    else {
      setCompanies(data.companies || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreateCompany() {
    setError(null);
    setSuccess(null);
    setShowPassword(false);
    setOpen(true);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const ownerPassword = String(form.get("ownerPassword") || "");

    if (!validTemporaryPassword(ownerPassword)) {
      setError(PASSWORD_ERROR);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/platform/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          ownerName: form.get("ownerName"),
          ownerEmail: form.get("ownerEmail"),
          ownerPassword
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível criar a empresa e o acesso.");
        return;
      }

      formElement.reset();
      setShowPassword(false);
      setOpen(false);
      setSuccess(data.message || "Empresa e acesso criados com sucesso.");
      await load();
    } catch {
      setError("Não foi possível criar a empresa e o acesso.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(company: PlatformCompany) {
    const status = company.status === "active" ? "suspended" : "active";
    const response = await fetch(`/api/platform/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    await load();
  }

  return (
    <main className="min-h-screen bg-[#03080d] p-5 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] border border-cyan/15 bg-[linear-gradient(135deg,#07111b,#071a1e_58%,#09241b)] p-6 shadow-panel">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan">
                <ShieldCheck size={14} /> KAU Admin
              </div>
              <h1 className="mt-3 text-4xl font-black">Empresas</h1>
              <p className="mt-2 text-sm text-white/50">Administração da plataforma sem misturar operações dos clientes.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70">Voltar para minha operação</Link>
              <button onClick={openCreateCompany} className="inline-flex items-center gap-2 rounded-xl bg-money px-4 py-3 text-sm font-black text-[#02130b]"><Plus size={16} /> Nova empresa</button>
            </div>
          </div>
        </header>

        {error ? <p className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm text-danger">{error}</p> : null}
        {success ? <p className="rounded-xl border border-money/25 bg-money/10 p-4 text-sm text-money">{success}</p> : null}

        <section className="overflow-hidden rounded-[26px] border border-white/[.08] bg-[#080f17]">
          <div className="grid grid-cols-[1.3fr_1.2fr_.6fr_.45fr_1fr] gap-4 border-b border-white/[.07] px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-white/35">
            <span>Empresa</span><span>Owner</span><span>Status</span><span>Usuários</span><span>Ações</span>
          </div>
          {loading ? <div className="p-6 text-white/45">Carregando empresas...</div> : companies.map((company) => (
            <div key={company.id} className="grid grid-cols-[1.3fr_1.2fr_.6fr_.45fr_1fr] items-center gap-4 border-b border-white/[.055] px-5 py-4 text-sm last:border-0">
              <div><p className="font-black">{company.name}</p><p className="text-xs text-white/35">{company.slug}</p></div>
              <div><p className="font-bold">{company.ownerName}</p><p className="text-xs text-white/35">{company.ownerEmail}</p></div>
              <span className={company.status === "active" ? "text-money" : "text-danger"}>{company.status === "active" ? "Ativa" : "Suspensa"}</span>
              <span>{company.userCount}</span>
              <div className="flex gap-2">
                <button onClick={() => setDetails(company)} className="w-fit rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/70">Detalhes</button>
                <button onClick={() => changeStatus(company)} className="w-fit rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/70">{company.status === "active" ? "Suspender" : "Ativar"}</button>
              </div>
            </div>
          ))}
        </section>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <form onSubmit={create} className="w-full max-w-lg space-y-4 rounded-[26px] border border-white/10 bg-[#09111a] p-6">
            <div className="flex items-center gap-3">
              <Building2 className="text-money" />
              <div><h2 className="text-xl font-black">Nova empresa</h2><p className="text-sm text-white/45">Crie a empresa e o acesso inicial do responsável.</p></div>
            </div>
            {error ? <p className="rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm text-danger">{error}</p> : null}
            {[["name", "Nome da empresa", "text"], ["ownerName", "Nome do responsável", "text"], ["ownerEmail", "E-mail", "email"]].map(([name, label, type]) => (
              <label key={name} className="block">
                <span className="mb-2 block text-xs font-bold text-white/55">{label}</span>
                <input name={name} type={type} required disabled={saving} className="h-12 w-full rounded-xl border border-white/10 bg-[#071019] px-4 outline-none focus:border-money/45" />
              </label>
            ))}
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-white/55">Senha temporária</span>
              <span className="relative block">
                <input name="ownerPassword" type={showPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" disabled={saving} className="h-12 w-full rounded-xl border border-white/10 bg-[#071019] px-4 pr-12 outline-none focus:border-money/45" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} disabled={saving} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-white/45 hover:text-white">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
              <span className="mt-2 block text-xs text-white/35">Mínimo de 8 caracteres, com letra e número.</span>
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => setOpen(false)} className="px-4 py-3 text-sm font-bold text-white/55">Cancelar</button>
              <button disabled={saving} className="rounded-xl bg-money px-5 py-3 text-sm font-black text-[#02130b] disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Criando..." : "Criar empresa e acesso"}</button>
            </div>
          </form>
        </div>
      ) : null}

      {details ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <section className="w-full max-w-md rounded-[26px] border border-white/10 bg-[#09111a] p-6">
            <div className="flex items-center gap-3"><Building2 className="text-cyan" /><div><h2 className="text-xl font-black">{details.name}</h2><p className="text-xs text-white/40">{details.slug}</p></div></div>
            <dl className="mt-6 space-y-4 text-sm">
              <div><dt className="text-white/40">Owner</dt><dd className="mt-1 font-bold">{details.ownerName} · {details.ownerEmail}</dd></div>
              <div><dt className="text-white/40">Acessos ativos</dt><dd className="mt-1 font-bold">{details.userCount}</dd></div>
              <div><dt className="text-white/40">Criada em</dt><dd className="mt-1 font-bold">{new Date(details.createdAt).toLocaleDateString("pt-BR")}</dd></div>
            </dl>
            <button onClick={() => setDetails(null)} className="mt-7 w-full rounded-xl border border-white/10 py-3 text-sm font-bold text-white/75">Fechar</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
