"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Crown, Pencil, Plus, Power, ShieldCheck, UsersRound, X } from "lucide-react";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import type { SellerProfile } from "@/data/sales-types";

const inputClass = "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-money/40";
const emptyForm = { fullName: "", displayName: "", username: "", email: "", phone: "", commissionPercent: "", active: true };

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export function TeamSellersScreen() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SellerProfile | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sellers", { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Erro ao carregar vendedores.");
      setSellers(payload.sellers || []);
      setSetupRequired(Boolean(payload.setupRequired));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar vendedores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const owner = useMemo(() => sellers.find((seller) => seller.isOwner), [sellers]);
  const activeCount = useMemo(() => sellers.filter((seller) => seller.active !== false).length, [sellers]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(seller: SellerProfile) {
    setEditing(seller);
    setForm({ fullName: seller.fullName || seller.name, displayName: seller.displayName || "", username: seller.login || "", email: seller.email || "", phone: seller.phone || "", commissionPercent: String(seller.commissionPercent), active: seller.active !== false });
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/sellers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: editing?.id, ...form, commissionPercent: Number(form.commissionPercent.replace(",", ".")) })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar o vendedor.");
      setOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o vendedor.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(seller: SellerProfile) {
    if (seller.isOwner) return;
    setError(null);
    const response = await fetch("/api/sellers", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: seller.id, active: seller.active === false }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return setError(payload.error || "Não foi possível alterar o status.");
    await load();
  }

  return (
    <div className="space-y-5 pb-10">
      <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(4,9,16,.96),rgba(9,18,28,.9)_48%,rgba(40,16,71,.62))] p-6 shadow-[0_24px_90px_rgba(0,0,0,.4)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full border border-purple/20 bg-purple/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-purple"><UsersRound size={13} /> Equipe / Vendedores</div><h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white">Configuração comercial</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">Cadastre vendedores e preserve a comissão vigente em cada venda.</p></div><button type="button" onClick={openCreate} disabled={setupRequired} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-money px-5 text-sm font-black text-[#02130b] disabled:opacity-50"><Plus size={18} /> Cadastrar vendedor</button></div>
      </header>

      {setupRequired ? <div className="rounded-2xl border border-amber/25 bg-amber/10 px-4 py-3 text-sm font-semibold text-amber">A migration 026 precisa ser aplicada para ativar a gestão de vendedores. Nenhum SQL foi executado.</div> : null}
      {error ? <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <TacticalPanel glow="green" className="p-5"><Crown className="text-money" size={24} /><p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-money">Dona da operação</p><h2 className="mt-2 text-2xl font-black text-white">{loading ? "Carregando..." : owner?.fullName || "Rayany Cristina Feitosa da Silva"}</h2><p className="mt-2 text-sm leading-6 text-white/58">Vendas próprias da dona registram comissão de vendedor em 0%.</p></TacticalPanel>
        <TacticalPanel glow="purple" className="p-5"><ShieldCheck className="text-purple" size={24} /><p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-purple">Comissão da equipe</p><h2 className="mt-2 text-2xl font-black text-white">Individual por vendedor</h2><p className="mt-2 text-sm leading-6 text-white/58">O percentual é copiado para a venda e alterações futuras não reescrevem o histórico.</p></TacticalPanel>
        <TacticalPanel glow="cyan" className="p-5"><UsersRound className="text-cyan" size={24} /><p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-cyan">Vendedores ativos</p><h2 className="mt-2 text-2xl font-black text-white">{loading ? "—" : activeCount}</h2><p className="mt-2 text-sm leading-6 text-white/58">Somente ativos ficam disponíveis em novas vendas.</p></TacticalPanel>
      </section>

      <TacticalPanel glow="green" className="p-5">
        <div className="border-b border-white/10 pb-4"><p className="text-xs font-black uppercase tracking-[.18em] text-money">Tabela de vendedores</p><p className="mt-1 text-sm text-white/52">Dados operacionais e resultados vinculados pelo ID do vendedor.</p></div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/20"><div className="min-w-[900px]"><div className="grid grid-cols-[1.5fr_.8fr_.7fr_.65fr_.6fr_.8fr_.8fr] gap-3 border-b border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white/35"><span>Vendedor</span><span>Login</span><span>Comissão</span><span>Status</span><span>Vendas</span><span>Valor vendido</span><span>Ações</span></div>{!loading && sellers.length === 0 ? <p className="px-4 py-10 text-center text-sm text-white/45">Nenhum vendedor cadastrado.</p> : sellers.map((seller) => <div key={seller.id || seller.name} className="grid grid-cols-[1.5fr_.8fr_.7fr_.65fr_.6fr_.8fr_.8fr] items-center gap-3 border-b border-white/8 px-4 py-4 last:border-b-0"><div><p className="font-black text-white">{seller.fullName || seller.name}</p><p className="text-xs text-white/42">{seller.displayName || (seller.isOwner ? "Dona da operação" : "—")}</p></div><p className="text-sm text-white/62">{seller.login || "—"}</p><p className="text-sm font-black text-money">{seller.isOwner ? "0%" : `${seller.commissionPercent}%`}</p><span className={seller.active === false ? "text-danger" : "text-money"}>{seller.active === false ? "Inativo" : "Ativo"}</span><p>{seller.salesCount || 0}</p><p>{brl(seller.salesTotal || 0)}</p><div className="flex gap-2"><button type="button" onClick={() => openEdit(seller)} className="rounded-xl border border-white/10 p-2 text-cyan" title="Editar"><Pencil size={15} /></button><button type="button" onClick={() => toggle(seller)} disabled={seller.isOwner} className="rounded-xl border border-white/10 p-2 text-amber disabled:cursor-not-allowed disabled:opacity-30" title={seller.isOwner ? "A dona não pode ser desativada" : seller.active === false ? "Ativar" : "Desativar"}><Power size={15} /></button></div></div>)}</div></div>
      </TacticalPanel>

      {open ? <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"><div className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#07101a] p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-money">Equipe</p><h2 className="mt-2 text-2xl font-black text-white">{editing ? "Editar vendedor" : "Cadastrar vendedor"}</h2></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 p-2 text-white/60"><X /></button></div><form onSubmit={save} className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Nome completo"><input className={inputClass} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></Field><Field label="Nome de exibição"><input className={inputClass} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></Field><Field label="Login ou identificador"><input className={inputClass} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></Field><Field label="E-mail"><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field><Field label="Telefone"><input className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field><Field label="Comissão do vendedor %"><input className={inputClass} inputMode="decimal" value={form.commissionPercent} disabled={Boolean(editing?.isOwner)} onChange={(event) => setForm({ ...form, commissionPercent: event.target.value })} required /></Field><label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-sm text-white/70"><input type="checkbox" checked={form.active} disabled={Boolean(editing?.isOwner)} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Vendedor ativo</label><p className="md:col-span-2 text-xs leading-5 text-white/45">Este cadastro é operacional e não cria usuário, senha ou acesso ao Supabase Auth.</p><button disabled={saving} className="md:col-span-2 rounded-2xl bg-money px-5 py-3 font-black text-[#02130b] disabled:opacity-50">{saving ? "Salvando..." : "Salvar vendedor"}</button></form></div></div> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-white/45">{label}</span>{children}</label>;
}
