"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Eye, MessageCircle, Radar, Search, Sparkles, Trash2, TrendingUp, UserPlus, Users, X } from "lucide-react";
import { MetricTile, IntelligenceCard, ScreenGrid, ReactorRing } from "@/modules/shared/module-primitives";
import { TacticalPanel } from "@/components/ui/tactical-panel";
import { pipeline } from "@/data/alpha-sin-operation";
import { cn } from "@/lib/utils";
import type { LeadContactStatus, LeadRecord, LeadTemperature } from "@/data/leads-types";

type ViewMode = "dashboard" | "lista";
type FilterMode = "all" | LeadTemperature | "today" | "overdue";
type DateFilterMode = "created" | "return";

const inputClass = "w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-cyan/40 focus:bg-cyan/[.045] focus:shadow-[0_0_0_3px_rgba(34,211,238,.08)]";
const labelClass = "mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/38";

const initialQuickLead = {
  customerName: "",
  customerPhone: ""
};

const statusLabel: Record<LeadContactStatus, string> = {
  new: "Novo lead",
  answered: "Atendeu",
  not_answered: "Não atendeu",
  called_no_answer: "Liguei sem resposta",
  scheduled: "Pré-agendou",
  call_soon: "Ligar daqui pouco",
  return_tomorrow: "Retornar amanhã",
  proposal_sent: "Proposta enviada",
  sold: "Comprou",
  lost: "Perdido"
};

const tempLabel: Record<LeadTemperature, string> = {
  hot: "Quente",
  warm: "Morno",
  cold: "Frio"
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value || 0);
}

function tempClass(temp: LeadTemperature) {
  if (temp === "hot") return "border-danger/25 bg-danger/10 text-danger";
  if (temp === "warm") return "border-amber/25 bg-amber/10 text-amber";
  return "border-cyan/25 bg-cyan/10 text-cyan";
}

function statusClass(status: LeadContactStatus) {
  if (status === "sold") return "border-money/25 bg-money/10 text-money";
  if (status === "lost") return "border-white/15 bg-white/10 text-white/55";
  if (["return_tomorrow", "call_soon", "scheduled"].includes(status)) return "border-purple/25 bg-purple/10 text-purple";
  if (["answered", "proposal_sent"].includes(status)) return "border-cyan/25 bg-cyan/10 text-cyan";
  return "border-white/10 bg-white/[.05] text-white/70";
}

function nextActionIsToday(lead: LeadRecord) {
  if (!lead.nextActionAt) return false;
  return new Date(lead.nextActionAt).toDateString() === new Date().toDateString();
}

function nextActionIsOverdue(lead: LeadRecord) {
  if (!lead.nextActionAt) return false;
  const date = new Date(lead.nextActionAt);
  return Number.isFinite(date.getTime()) && date.getTime() < Date.now() && !["sold", "lost"].includes(lead.contactStatus);
}

function safeDateLabel(value?: string) {
  if (!value) return "Sem retorno";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Retorno definido";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function sameDay(value: string | undefined, selectedDay: string) {
  if (!value || !selectedDay) return true;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}` === selectedDay;
}

export function ConversationalPipelineScreen() {
  const [view, setView] = useState<ViewMode>("lista");
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");
  const [dateFilterType, setDateFilterType] = useState<DateFilterMode>("return");
  const [dateFilterValue, setDateFilterValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showQuickLead, setShowQuickLead] = useState(false);
  const [quickLead, setQuickLead] = useState(initialQuickLead);
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/leads")
      .then((res) => res.json())
      .then((payload) => {
        if (!alive) return;
        setLeads((payload.leads ?? []) as LeadRecord[]);
      })
      .catch(() => setMessage("Não consegui carregar leads. Verifique a tabela public.leads no Supabase."))
      .finally(() => alive && setIsLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const open = leads.filter((lead) => !["sold", "lost"].includes(lead.contactStatus));
    const hot = open.filter((lead) => lead.temperature === "hot").length;
    const warm = open.filter((lead) => lead.temperature === "warm").length;
    const cold = open.filter((lead) => lead.temperature === "cold").length;
    const today = open.filter(nextActionIsToday).length;
    const overdue = open.filter(nextActionIsOverdue).length;
    const money = open.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);
    return { open: open.length, hot, warm, cold, today, overdue, money };
  }, [leads]);

  async function submitQuickLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeadError(null);
    setIsSavingLead(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quickLead)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Não foi possível cadastrar o lead.");
      if (payload?.lead) {
        const createdLead = payload.lead as LeadRecord;
        setLeads((current) => [createdLead, ...current]);
        window.open(`/pipeline/${createdLead.id}`, "_blank", "noopener,noreferrer");
      }
      setQuickLead(initialQuickLead);
      setShowQuickLead(false);
      setMessage("Lead cadastrado e arquivo aberto em nova guia.");
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : "Erro ao cadastrar lead.");
    } finally {
      setIsSavingLead(false);
    }
  }


  async function deleteLead(lead: LeadRecord) {
    const ok = window.confirm(`Excluir o lead ${lead.customerName}? Essa ação remove o lead da lista.`);
    if (!ok) return;

    setMessage(null);
    setDeletingLeadId(lead.id);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, { method: "DELETE", cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Não foi possível excluir o lead.");
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setMessage("Lead excluído da lista.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao excluir lead.");
    } finally {
      setDeletingLeadId(null);
    }
  }

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (["hot", "warm", "cold"].includes(filter) && lead.temperature !== filter) return false;
      if (filter === "today" && !nextActionIsToday(lead)) return false;
      if (filter === "overdue" && !nextActionIsOverdue(lead)) return false;
      if (dateFilterValue) {
        const valueToCheck = dateFilterType === "created" ? lead.createdAt : lead.nextActionAt;
        if (!sameDay(valueToCheck, dateFilterValue)) return false;
      }
      if (!q) return true;
      return [lead.customerName, lead.customerPhone, lead.city, lead.address, lead.neighborhood, lead.notes, lead.nextAction]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [leads, filter, query, dateFilterType, dateFilterValue]);

  return (
    <div className="space-y-4 pb-10">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[.03] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-money">Leads AlphaSin</p>
            <h1 className="mt-2 text-3xl font-black uppercase text-white">Conversational Pipeline</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
              Lista de leads mais clara e operacional. O arquivo completo abre em outra guia pelo ícone de olho.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <HeaderStat label="Leads" value={String(stats.open)} />
            <HeaderStat label="Quentes" value={String(stats.hot)} tone="danger" />
            <HeaderStat label="Hoje" value={String(stats.today)} tone="purple" />
            <HeaderStat label="Pipeline" value={formatBRL(stats.money)} tone="money" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setView("dashboard")} className={cn(tabClass, view === "dashboard" ? "border-money/40 bg-money/15 text-money" : "border-white/10 bg-white/[.04] text-white/48 hover:text-white")}>
            Dashboard
          </button>
          <button type="button" onClick={() => setView("lista")} className={cn(tabClass, view === "lista" ? "border-cyan/40 bg-cyan/15 text-cyan" : "border-white/10 bg-white/[.04] text-white/48 hover:text-white")}>
            Lista de leads
          </button>
        </div>
        <p className="text-xs text-white/46">Tela de leads separada do cockpit para ficar mais limpa e menos cansativa.</p>
      </div>

      {view === "dashboard" ? (
        <DashboardView stats={stats} leadsCount={leads.length} />
      ) : (
        <TacticalPanel glow="cyan" className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-cyan">Lista de leads</p>
              <p className="mt-1 text-sm leading-5 text-white/52">Use os filtros e abra o arquivo do lead no ícone de olho.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-fit rounded-xl border border-cyan/20 bg-cyan/10 px-3 py-2 text-xs font-black text-cyan">{filteredLeads.length} leads</span>
              <button
                type="button"
                onClick={() => { setLeadError(null); setShowQuickLead(true); }}
                className="group inline-flex items-center gap-2 rounded-xl border border-cyan/25 bg-gradient-to-r from-cyan/15 to-money/10 px-3 py-2 text-xs font-black text-cyan shadow-[0_0_22px_rgba(0,212,255,.10)] transition hover:border-money/35 hover:text-money hover:shadow-[0_0_28px_rgba(0,255,136,.16)]"
              >
                <span className="grid h-6 w-6 place-items-center rounded-lg border border-cyan/20 bg-cyan/10 text-cyan transition group-hover:border-money/25 group-hover:bg-money/10 group-hover:text-money">
                  <UserPlus size={14} />
                </span>
                Cadastrar lead
                <Sparkles size={12} className="text-money/70" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input className={cn(inputClass, "pl-10")} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nome, telefone, cidade..." />
            </div>
            <select className={inputClass} value={dateFilterType} onChange={(e) => setDateFilterType(e.target.value as DateFilterMode)}>
              <option value="return">Data do retorno</option>
              <option value="created">Data de cadastro</option>
            </select>
            <div className="relative min-w-[190px]">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input className={cn(inputClass, "pl-10")} type="date" value={dateFilterValue} onChange={(e) => setDateFilterValue(e.target.value)} />
            </div>
            <button type="button" onClick={() => setDateFilterValue("")} className={cn(tabClass, "border-white/10 bg-white/[.04] text-white/60 hover:text-white")}>Limpar data</button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {[
              ["all", "Todos"],
              ["hot", "Quentes"],
              ["warm", "Retorno"],
              ["cold", "Frios"],
              ["today", "Hoje"],
              ["overdue", "Atrasados"]
            ].map(([value, label]) => (
              <button key={value} onClick={() => setFilter(value as FilterMode)} className={cn(tabClass, filter === value ? "border-cyan/40 bg-cyan/15 text-cyan" : "border-white/10 bg-white/[.04] text-white/45 hover:text-white")}>
                {label}
              </button>
            ))}
          </div>

          {message ? <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">{message}</div> : null}

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/15">
            <div className="grid grid-cols-[1.5fr_.7fr_.9fr_1fr_.9fr_104px] gap-3 border-b border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[.16em] text-white/35">
              <span>Lead</span>
              <span>Temp.</span>
              <span>Status</span>
              <span>Próxima ação</span>
              <span>Retorno</span>
              <span className="text-center">Ações</span>
            </div>
            <div className="max-h-[560px] overflow-y-auto">
              {isLoading ? <p className="p-4 text-sm text-white/52">Carregando leads...</p> : null}
              {!isLoading && filteredLeads.length === 0 ? <p className="p-4 text-sm text-white/52">Nenhum lead encontrado. Use Cadastrar Lead no Command Center.</p> : null}
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="grid grid-cols-[1.5fr_.7fr_.9fr_1fr_.9fr_104px] gap-3 border-b border-white/8 px-4 py-3 last:border-b-0 hover:bg-white/[.025]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{lead.customerName}</p>
                    <p className="mt-1 truncate text-xs text-white/45">{lead.customerPhone} · {lead.city || "Sem cidade"}</p>
                  </div>
                  <div><Tag className={tempClass(lead.temperature)}>{tempLabel[lead.temperature]}</Tag></div>
                  <div><Tag className={statusClass(lead.contactStatus)}>{statusLabel[lead.contactStatus]}</Tag></div>
                  <div className="min-w-0">
                    <p className={cn("truncate text-xs font-bold", nextActionIsOverdue(lead) ? "text-danger" : "text-white/75")}>{lead.nextAction || "Sem próxima ação"}</p>
                    <p className="mt-1 truncate text-[11px] text-white/40">{lead.address || lead.neighborhood || "Sem contexto"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white/82">{safeDateLabel(lead.nextActionAt)}</p>
                    <p className="mt-1 truncate text-[11px] text-white/40">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("pt-BR") : ""}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/pipeline/${lead.id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir arquivo de ${lead.customerName}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan transition hover:bg-cyan/15 hover:text-white"
                    >
                      <Eye size={18} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteLead(lead)}
                      disabled={deletingLeadId === lead.id}
                      aria-label={`Excluir lead ${lead.customerName}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-danger/20 bg-danger/10 text-danger transition hover:bg-danger/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TacticalPanel>
      )}

      {showQuickLead ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-20 md:items-center md:pb-0">
          <form
            onSubmit={submitQuickLead}
            role="dialog"
            aria-modal="true"
            aria-label="Cadastrar lead rápido"
            className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-cyan/20 bg-[#07131c] p-6 shadow-[0_30px_120px_rgba(0,0,0,.78)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,212,255,0.08),transparent_42%)]" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.32em] text-cyan">Cadastro rápido</p>
                <h2 className="mt-2 text-3xl font-black text-white">Cadastrar lead</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/62">
                  Entrada rápida direto da lista. Preencha nome e telefone. Depois você completa o arquivo do lead.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickLead(false)}
                className="rounded-2xl border border-white/10 bg-white/[.04] p-3 text-white/55 transition hover:bg-white/[.08] hover:text-white"
                aria-label="Fechar cadastro de lead"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative mt-7 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Nome</label>
                <input className={inputClass} value={quickLead.customerName} onChange={(e) => setQuickLead((s) => ({ ...s, customerName: e.target.value }))} placeholder="Nome do contato" required />
              </div>
              <div>
                <label className={labelClass}>Telefone / WhatsApp</label>
                <input className={inputClass} value={quickLead.customerPhone} onChange={(e) => setQuickLead((s) => ({ ...s, customerPhone: e.target.value }))} placeholder="DDD + número" required />
              </div>
            </div>

            <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-white/42">Próximo passo</p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                Depois de salvar, use o ícone de <span className="font-black text-cyan">olho</span> na lista para abrir o arquivo do lead e completar cidade, temperatura, status, retorno, endereço e observações.
              </p>
            </div>

            {leadError ? (
              <div className="relative mt-5 rounded-2xl border border-red/30 bg-red/10 px-4 py-3 text-sm font-bold text-red">
                {leadError}
              </div>
            ) : null}

            <div className="relative mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowQuickLead(false)} className="rounded-2xl border border-white/10 bg-white/[.04] px-5 py-3 text-sm font-black text-white/70 transition hover:text-white">Cancelar</button>
              <button type="submit" disabled={isSavingLead} className="rounded-2xl border border-cyan/30 bg-cyan/12 px-5 py-3 text-sm font-black text-cyan transition hover:bg-cyan/18 disabled:opacity-60">
                {isSavingLead ? "Salvando lead..." : "Cadastrar lead"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function DashboardView({ stats, leadsCount }: { stats: { open: number; hot: number; today: number; overdue: number; money: number }; leadsCount: number }) {
  return (
    <ScreenGrid>
      <TacticalPanel glow="green" className="col-span-7 p-5">
        <p className="text-xs font-black uppercase tracking-[.18em] text-money">Funil inteligente AlphaSin</p>
        <div className="mt-5 space-y-3">
          {pipeline.map((stage, index) => (
            <div key={stage.label} className="grid grid-cols-[140px_1fr_120px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-3">
              <div><p className="text-sm font-black text-white">{stage.label}</p><p className="text-xs text-white/45">{stage.count} oportunidades</p></div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className={cn("h-full rounded-full", index < 2 ? "bg-money" : index < 4 ? "bg-amber" : "bg-danger")} style={{ width: `${82 - index * 13}%` }} /></div>
              <p className="text-right text-sm font-black text-money">R$ {stage.value.toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      </TacticalPanel>
      <div className="col-span-5 grid grid-cols-2 gap-4">
        <MetricTile label="Leads salvos" value={String(leadsCount)} delta="arquivo Supabase" tone="cyan" />
        <MetricTile label="Quentes" value={String(stats.hot)} delta="ação imediata" tone="danger" />
        <MetricTile label="Retornos hoje" value={String(stats.today)} delta="agenda manual" tone="purple" />
        <MetricTile label="Risco atrasado" value={String(stats.overdue)} delta="follow-up vencido" tone="danger" />
        <div className="col-span-2"><ReactorRing value={formatBRL(stats.money)} label="valor estimado aberto" tone="money" /></div>
      </div>
      <div className="col-span-12 grid grid-cols-4 gap-4">
        <IntelligenceCard title="Dashboard preservado" description="Funil, momentum, conversão e risco continuam disponíveis." icon={Radar} tone="cyan" />
        <IntelligenceCard title="Lista mais limpa" description="Todos os leads em tabela mais clara, próxima de CRM SaaS." icon={Users} tone="purple" />
        <IntelligenceCard title="Arquivo em outra guia" description="O ícone de olho abre a ficha completa do lead sem poluir a lista." icon={MessageCircle} tone="money" />
        <IntelligenceCard title="Adeus Sheets" description="Cada lead fica salvo no Supabase, com contexto preso ao contato." icon={TrendingUp} tone="amber" />
      </div>
    </ScreenGrid>
  );
}

const tabClass = "whitespace-nowrap rounded-xl border px-3 py-2 text-[11px] font-black uppercase transition";

function HeaderStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" | "purple" | "money" }) {
  const toneClass = tone === "danger" ? "border-danger/20 bg-danger/10 text-danger" : tone === "purple" ? "border-purple/20 bg-purple/10 text-purple" : tone === "money" ? "border-money/20 bg-money/10 text-money" : "border-white/10 bg-white/[.04] text-white";
  return <div className={cn("min-w-[92px] rounded-2xl border px-3 py-3", toneClass)}><p className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>;
}

function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex rounded-lg border px-2 py-1 text-[10px] font-black uppercase", className)}>{children}</span>;
}
