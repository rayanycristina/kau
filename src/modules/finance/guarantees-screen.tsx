"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, CalendarDays, Check, CheckCircle2, ChevronDown,
  CircleDollarSign, Clock3, CreditCard, Eye, Layers3, RefreshCw, RotateCcw, Search, Settings2,
  ShieldCheck, ShieldQuestion, SlidersHorizontal, TrendingUp, X
} from "lucide-react";
import {
  guaranteeStatusLabels, guaranteeTypeLabels, type GuaranteeSetting, type GuaranteeStatus,
  type GuaranteeType, type PostpaidGuarantee
} from "@/data/guarantee-types";
import { cn } from "@/lib/utils";

type ViewMode = "period" | "exposure" | "payments";
type StatusFilter = GuaranteeStatus | "all";
type Tone = "money" | "cyan" | "purple" | "amber" | "danger" | "neutral";
type Feedback = { tone: "success" | "error"; text: string } | null;
type GuaranteeMetrics = {
  riskItems: PostpaidGuarantee[];
  dueItems: PostpaidGuarantee[];
  paidItems: PostpaidGuarantee[];
  releasedItems: PostpaidGuarantee[];
  exposureTotal: number;
  conditional: number;
  mandatory: number;
  paid: number;
  releasedValue: number;
  openCount: number;
  average: number;
  predominant: string;
};

const inputClass = "w-full rounded-2xl border border-slate-400/[.115] bg-[#060A11]/88 px-3.5 py-3 text-sm font-medium tracking-[-.012em] text-slate-100 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition duration-[180ms] ease-out placeholder:text-slate-500 hover:border-slate-300/[.16] hover:bg-[#090F18]/92 focus:border-cyan/35 focus:bg-cyan/[.025] focus:shadow-[0_0_0_3px_rgba(24,215,255,.055),inset_0_1px_0_rgba(255,255,255,.05)] disabled:cursor-not-allowed disabled:opacity-45 [color-scheme:dark] [&_option]:bg-[#050912] [&_option]:text-slate-100";
const labelClass = "mb-2 block text-[10px] font-medium uppercase tracking-[.14em] text-slate-400/68";
const setupMessage = "A migration 024 precisa ser aplicada para ativar Garantias pós-pagas. O restante do KAU continua disponível.";

const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = () => localDateKey();
const monthStart = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`; };
const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "—";
const formatDateTime = (value?: string) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
const plural = (count: number, singular: string, multiple: string) => `${count} ${count === 1 ? singular : multiple}`;

async function readJson(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) as Record<string, unknown> : {}; }
  catch { return { error: "O servidor retornou uma resposta inválida." }; }
}

export function GuaranteesScreen() {
  const [items, setItems] = useState<PostpaidGuarantee[]>([]);
  const [settings, setSettings] = useState<GuaranteeSetting[]>([]);
  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(today());
  const [type, setType] = useState<GuaranteeType | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("period");
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [paying, setPaying] = useState<PostpaidGuarantee | null>(null);
  const [details, setDetails] = useState<PostpaidGuarantee | null>(null);
  const [reversing, setReversing] = useState<PostpaidGuarantee | null>(null);
  const [reversalError, setReversalError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/guarantees", { cache: "no-store", credentials: "include" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(String(payload.error || "Não foi possível carregar as garantias."));
      const needsSetup = Boolean(payload.setupRequired);
      setItems(Array.isArray(payload.guarantees) ? payload.guarantees : []);
      setSettings(Array.isArray(payload.settings) ? payload.settings : []);
      setSetupRequired(needsSetup);
      if (!needsSetup && payload.message) setFeedback({ tone: "error", text: String(payload.message) });
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível carregar as garantias." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const periodLabel = `${formatDate(start)} — ${formatDate(end)}`;
  const activeSetting = settings.find((setting) => setting.isActive) || settings[0];
  const filtersChanged = view !== "period" || start !== monthStart() || end !== today() || type !== "all" || status !== "all" || Boolean(search.trim());

  const viewItems = useMemo(() => items.filter((item) => {
    const operationalDate = item.paidAt || item.sale.saleDate;
    if (view === "period" && (operationalDate < start || operationalDate > end)) return false;
    if (view === "exposure" && !(["risk", "due"] as GuaranteeStatus[]).includes(item.status)) return false;
    if (view === "payments" && (item.status !== "paid" || !item.paidAt || item.paidAt < start || item.paidAt > end)) return false;
    if (type !== "all" && item.guaranteeType !== type) return false;
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return !term || item.sale.customerName.toLocaleLowerCase("pt-BR").includes(term) || item.saleId.toLocaleLowerCase("pt-BR").includes(term);
  }), [items, view, start, end, type, search]);

  const statusCounts = useMemo(() => viewItems.reduce<Record<GuaranteeStatus, number>>((counts, item) => {
    counts[item.status] += 1;
    return counts;
  }, { risk: 0, due: 0, paid: 0, released: 0, inactive: 0 }), [viewItems]);

  const visibleItems = useMemo(() => viewItems.filter((item) => status === "all" || item.status === status), [viewItems, status]);

  const metrics = useMemo(() => {
    const riskItems = items.filter((item) => item.status === "risk");
    const dueItems = items.filter((item) => item.status === "due");
    const paidItems = items.filter((item) => item.status === "paid" && item.paidAt && item.paidAt >= start && item.paidAt <= end);
    const releasedItems = items.filter((item) => item.status === "released");
    const exposure = [...riskItems, ...dueItems];
    const exposureTotal = exposure.reduce((sum, item) => sum + item.guaranteeAmount, 0);
    const conditional = riskItems.reduce((sum, item) => sum + item.guaranteeAmount, 0);
    const mandatory = dueItems.reduce((sum, item) => sum + item.guaranteeAmount, 0);
    const paid = paidItems.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
    const releasedValue = releasedItems.reduce((sum, item) => sum + item.guaranteeAmount, 0);
    const predominant = riskItems.length === dueItems.length ? (exposure.length ? "Carteira equilibrada" : "Sem exposição aberta") : riskItems.length > dueItems.length ? "Maioria condicional" : "Maioria obrigatória";
    return { riskItems, dueItems, paidItems, releasedItems, exposureTotal, conditional, mandatory, paid, releasedValue, openCount: exposure.length, average: exposure.length ? exposureTotal / exposure.length : 0, predominant };
  }, [items, start, end]);

  function clearFilters() {
    setView("period"); setStart(monthStart()); setEnd(today()); setType("all"); setStatus("all"); setSearch("");
  }

  function openReversal(item: PostpaidGuarantee) {
    setReversalError(null);
    setReversing(item);
  }

  async function reversePayment() {
    if (!reversing) return;
    setSaving(true); setFeedback(null); setReversalError(null);
    const response = await fetch(`/api/guarantees/${reversing.id}/reversal`, { method: "POST", credentials: "include" });
    const payload = await readJson(response);
    setSaving(false);
    if (!response.ok) { setReversalError(String(payload.error || "Não foi possível estornar o pagamento.")); return; }
    await load();
    setReversing(null);
    setReversalError(null);
    setFeedback({ tone: "success", text: "Pagamento estornado e despesa removida com segurança." });
  }

  return (
    <div className="kau-billion-sales guarantees-command space-y-4 pb-0">
      <CommandHeader periodLabel={periodLabel} setupRequired={setupRequired || !activeSetting} onConfigure={() => setConfigOpen(true)} />
      {setupRequired ? <SetupNotice /> : null}
      {feedback ? <FeedbackBanner feedback={feedback} onRetry={feedback.tone === "error" ? load : undefined} onClose={() => setFeedback(null)} /> : null}

      <KpiGrid metrics={metrics} loading={loading} />

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
        <main className="luxury-surface kau-surgical-surface min-w-0 overflow-hidden rounded-[28px] self-start">
          <QueueHeader count={visibleItems.length} />
          <StatusTabs value={status} counts={statusCounts} total={viewItems.length} onChange={setStatus} />
          <CommandFilters view={view} start={start} end={end} type={type} search={search} resultCount={visibleItems.length} filtersChanged={filtersChanged} onView={setView} onStart={setStart} onEnd={setEnd} onType={setType} onSearch={setSearch} onClear={clearFilters} />
          {loading ? <QueueSkeleton /> : visibleItems.length ? <GuaranteeQueue items={visibleItems} saving={saving} onView={setDetails} onPay={setPaying} onReverse={openReversal} /> : <GuaranteeEmptyState baseEmpty={!items.length && !filtersChanged} setupRequired={setupRequired} onClear={clearFilters} onConfigure={() => setConfigOpen(true)} />}
        </main>

        <OperationalInsights metrics={metrics} items={items} setting={activeSetting} />
      </div>

      <IntelligenceStrip metrics={metrics} />

      {details ? <GuaranteeDetailsDrawer item={details} saving={saving} onClose={() => setDetails(null)} onPay={(item) => { setDetails(null); setPaying(item); }} onReverse={(item) => { setDetails(null); openReversal(item); }} onDateCorrected={(paidAt) => { const updated = { ...details, paidAt }; setDetails(updated); setItems((current) => current.map((item) => item.id === updated.id ? updated : item)); setFeedback({ tone: "success", text: "Data do pagamento e da despesa vinculada corrigidas com segurança." }); }} setSaving={setSaving} /> : null}
      {paying ? <PaymentDrawer item={paying} saving={saving} onClose={() => setPaying(null)} onSaved={async () => { await load(); setPaying(null); setFeedback({ tone: "success", text: "Pagamento e despesa registrados atomicamente." }); }} setSaving={setSaving} /> : null}
      {configOpen && activeSetting ? <ConfigDrawer setting={activeSetting} saving={saving} onClose={() => setConfigOpen(false)} onSaved={async () => { await load(); setConfigOpen(false); setFeedback({ tone: "success", text: "Configuração atualizada para os próximos lançamentos." }); }} setSaving={setSaving} /> : null}
      {reversing ? <ReversalDialog item={reversing} saving={saving} error={reversalError} onCancel={() => { setReversing(null); setReversalError(null); }} onConfirm={reversePayment} /> : null}
    </div>
  );
}

function CommandHeader({ periodLabel, setupRequired, onConfigure }: { periodLabel: string; setupRequired: boolean; onConfigure: () => void }) {
  return <header className="luxury-surface kau-surgical-surface relative overflow-hidden rounded-[30px] px-5 py-4"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,.15),transparent_34%),radial-gradient(circle_at_88%_4%,rgba(124,58,237,.14),transparent_30%),linear-gradient(120deg,rgba(255,255,255,.045),transparent_56%)]" /><div className="relative flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between"><div className="max-w-2xl"><h1 className="text-4xl font-semibold tracking-[-.055em] text-white md:text-5xl">Garantias pós-pagas</h1><p className="mt-2 text-[14px] font-normal leading-6 text-white/68">Controle de exposição, repasses ao produtor e garantias liberadas.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div><span className={labelClass}>Período ativo</span><span className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-300/[.115] bg-[#060A11]/88 px-4 text-sm font-medium text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]"><CalendarDays size={16} className="text-cyan" aria-hidden /><strong className="font-semibold text-white/88">{periodLabel}</strong></span></div><button type="button" onClick={onConfigure} disabled={setupRequired} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-money/35 bg-money px-5 text-sm font-semibold tracking-[-.01em] text-[#02130b] shadow-[0_0_44px_rgba(16,185,129,.20)] transition duration-[180ms] ease-out hover:-translate-y-0.5 hover:bg-[#22e59b] disabled:cursor-not-allowed disabled:opacity-40"><Settings2 size={17} aria-hidden />Configurar garantia</button></div></div></header>;
}

function IntelligenceStrip({ metrics }: { metrics: GuaranteeMetrics }) {
  const cells = [
    { label: "Exposição total atual", value: brl(metrics.exposureTotal), tone: "amber" as Tone },
    { label: "Garantias em aberto", value: plural(metrics.openCount, "garantia", "garantias"), tone: "danger" as Tone },
    { label: "Clientes aguardando pagamento", value: String(metrics.riskItems.length), tone: "cyan" as Tone },
    { label: "Situação da carteira", value: metrics.predominant, tone: "money" as Tone }
  ];
  return <section aria-label="Resumo executivo da carteira" className="luxury-surface kau-surgical-surface relative overflow-hidden rounded-[28px] p-4"><PanelHeader icon={<Activity size={18} />} title="Resumo da carteira" description="Visão rápida da exposição e das garantias que exigem acompanhamento." /><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cells.map((cell) => <SummaryMetric key={cell.label} {...cell} />)}</div></section>;
}

function KpiGrid({ metrics, loading }: { metrics: GuaranteeMetrics; loading: boolean }) {
  const cards = [
    { label: "Exposição condicional", value: brl(metrics.conditional), subtext: "risco potencial atual", helper: metrics.riskItems.length ? plural(metrics.riskItems.length, "venda aguardando", "vendas aguardando") : "Nenhuma venda exposta", comparison: "Pagamento do cliente pendente", icon: AlertTriangle, tone: "amber" as Tone },
    { label: "Obrigatórias a pagar", value: brl(metrics.mandatory), subtext: "repasses obrigatórios", helper: metrics.dueItems.length ? plural(metrics.dueItems.length, "garantia exige ação", "garantias exigem ação") : "Nenhuma pendência", comparison: "Independe do pagamento do cliente", icon: CircleDollarSign, tone: "danger" as Tone },
    { label: "Garantias pagas", value: brl(metrics.paid), subtext: "pago no período", helper: metrics.paidItems.length ? plural(metrics.paidItems.length, "repasse registrado", "repasses registrados") : "Nenhum repasse", comparison: "Despesa vinculada automaticamente", icon: CheckCircle2, tone: "money" as Tone },
    { label: "Garantias liberadas", value: String(metrics.releasedItems.length), subtext: "pagamento confirmado", helper: metrics.releasedItems.length ? brl(metrics.releasedValue) : "Nenhuma liberação", comparison: "Sem repasse ao produtor", icon: ShieldCheck, tone: "cyan" as Tone }
  ];
  if (loading) return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="h-[196px] animate-pulse rounded-[26px] border border-white/10 bg-white/[.035]" />)}</section>;
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <KpiCard key={card.label} {...card} />)}</section>;
}

function KpiCard({ label, value, subtext, helper, comparison, icon: Icon, tone }: { label: string; value: string; subtext: string; helper: string; comparison: string; icon: typeof AlertTriangle; tone: Tone }) {
  return <article className={cn("executive-card kau-surgical-card group relative min-h-[196px] overflow-hidden rounded-[26px] border p-4 transition duration-[180ms] ease-out hover:-translate-y-0.5", toneColor(tone))}><div className="pointer-events-none absolute inset-0 opacity-65 [background:radial-gradient(circle_at_84%_16%,rgba(255,255,255,.10),transparent_20%),linear-gradient(135deg,rgba(255,255,255,.052),transparent_54%)]" /><div className="relative flex items-start justify-between gap-3"><div><p className="text-[14px] font-semibold tracking-[-.018em] text-white">{label}</p><p className="mt-1 text-[11px] font-medium text-white/60">{subtext}</p></div><div className={cn("rounded-2xl border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.045)]", toneColor(tone))}><Icon size={21} aria-hidden /></div></div><p className="relative mt-5 truncate text-3xl font-semibold tabular-nums tracking-[-.055em]">{value}</p><div className="relative mt-4 flex items-end justify-between gap-4"><div><p className="text-[11px] font-semibold text-white/80">{helper}</p><p className="mt-1 text-[11px] font-medium text-white/52">{comparison}</p></div><MiniSignal tone={tone} /></div></article>;
}

function PanelHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="relative z-10 flex items-start gap-3 border-b border-slate-300/[.07] pb-4"><div className="mt-1 rounded-xl border border-white/10 bg-white/[.045] p-2 text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">{icon}</div><div><h2 className="text-[20px] font-semibold tracking-[-.035em] text-white">{title}</h2><p className="mt-1 text-[13px] leading-5 text-white/62">{description}</p></div></div>;
}

function SummaryMetric({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return <div className="relative overflow-hidden rounded-2xl border border-slate-300/[.075] bg-[rgba(15,23,42,.68)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]"><div className={cn("absolute left-0 top-0 h-full w-1", tone === "amber" ? "bg-amber/60" : tone === "danger" ? "bg-danger/55" : tone === "cyan" ? "bg-cyan/55" : "bg-money/60")} /><p className="text-[10px] font-medium uppercase tracking-[.12em] text-slate-400/65">{label}</p><p className="mt-2 truncate text-[22px] font-semibold tabular-nums tracking-[-.035em] text-slate-50">{value}</p></div>;
}

function MiniSignal({ tone }: { tone: Tone }) {
  return <div className="flex h-12 items-end gap-1 opacity-70 transition duration-[180ms] group-hover:opacity-100">{[30, 54, 42, 68, 48].map((height, index) => <span key={index} className={cn("w-1.5 rounded-full", tone === "cyan" ? "bg-cyan" : tone === "amber" ? "bg-amber" : tone === "danger" ? "bg-danger" : "bg-money")} style={{ height }} />)}</div>;
}

function toneColor(tone: Tone) {
  if (tone === "money") return "border-money/24 bg-money/[.115] text-money";
  if (tone === "cyan") return "border-cyan/24 bg-cyan/[.105] text-cyan";
  if (tone === "purple") return "border-purple/24 bg-purple/[.105] text-purple";
  if (tone === "amber") return "border-amber/28 bg-amber/[.12] text-amber";
  if (tone === "danger") return "border-danger/24 bg-danger/[.105] text-danger";
  return "border-white/10 bg-white/[.035] text-white";
}

function QueueHeader({ count }: { count: number }) {
  return <div className="flex flex-col gap-3 border-b border-slate-300/[.07] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="mt-1 rounded-xl border border-white/10 bg-white/[.045] p-2 text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"><Layers3 size={18} aria-hidden /></span><div><h2 className="text-[20px] font-semibold tracking-[-.035em] text-white">Fila de garantias</h2><p className="mt-1 text-[13px] leading-5 text-white/62">Analise riscos, repasses obrigatórios e garantias concluídas.</p></div></div><span className="w-fit rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/65">{plural(count, "resultado", "resultados")}</span></div>;
}

function StatusTabs({ value, counts, total, onChange }: { value: StatusFilter; counts: Record<GuaranteeStatus, number>; total: number; onChange: (value: StatusFilter) => void }) {
  const tabs: Array<{ value: StatusFilter; label: string; count: number }> = [{ value: "all", label: "Todas", count: total }, { value: "risk", label: "Em risco", count: counts.risk }, { value: "due", label: "A pagar", count: counts.due }, { value: "paid", label: "Pagas", count: counts.paid }, { value: "released", label: "Liberadas", count: counts.released }];
  return <div className="premium-scrollbar overflow-x-auto border-b border-white/[.07] px-4"><div role="tablist" aria-label="Status da garantia" className="flex min-w-max gap-1 rounded-2xl py-3">{tabs.map((tab) => <button key={tab.value} type="button" role="tab" aria-selected={value === tab.value} onClick={() => onChange(tab.value)} className={cn("inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-[11px] font-medium uppercase tracking-[.08em] transition duration-[180ms] ease-out focus:outline-none focus:ring-2 focus:ring-cyan/20", value === tab.value ? "bg-white/[.07] text-slate-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" : "text-slate-400/72 hover:bg-white/[.035] hover:text-slate-100")}><span>{tab.label}</span><span className={cn("rounded-md px-1.5 py-0.5 text-[10px] tabular-nums", value === tab.value ? "bg-cyan/10 text-cyan" : "bg-white/[.035] text-white/40")}>{tab.count}</span></button>)}</div></div>;
}

function CommandFilters(props: { view: ViewMode; start: string; end: string; type: GuaranteeType | "all"; search: string; resultCount: number; filtersChanged: boolean; onView: (value: ViewMode) => void; onStart: (value: string) => void; onEnd: (value: string) => void; onType: (value: GuaranteeType | "all") => void; onSearch: (value: string) => void; onClear: () => void }) {
  return <section aria-label="Filtros da fila" className="border-b border-white/[.07] bg-black/10 p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400/68"><SlidersHorizontal size={13} aria-hidden />Filtros da fila</div>{props.filtersChanged ? <button type="button" onClick={props.onClear} className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.035] px-3 text-[11px] font-semibold text-white/60 transition duration-[180ms] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan/20"><RotateCcw size={12} aria-hidden />Limpar</button> : null}</div><div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-[1.15fr_.85fr_.85fr_.9fr_1.35fr]"><FilterField label="Período"><select className={inputClass} value={props.view} onChange={(event) => props.onView(event.target.value as ViewMode)}><option value="period">Período selecionado</option><option value="exposure">Toda a exposição atual</option><option value="payments">Histórico de pagamentos</option></select></FilterField><FilterField label="Data inicial"><input className={inputClass} type="date" value={props.start} onChange={(event) => props.onStart(event.target.value)} /></FilterField><FilterField label="Data final"><input className={inputClass} type="date" value={props.end} onChange={(event) => props.onEnd(event.target.value)} /></FilterField><FilterField label="Tipo"><select className={inputClass} value={props.type} onChange={(event) => props.onType(event.target.value as GuaranteeType | "all")}><option value="all">Todos os tipos</option><option value="conditional">Condicional</option><option value="mandatory">Obrigatória</option></select></FilterField><FilterField label="Cliente ou pedido"><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-4 text-slate-500" size={14} aria-hidden /><input className={cn(inputClass, "pl-10")} value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="Pesquisar na fila" /></div></FilterField></div></section>;
}

function FilterField({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className={labelClass}>{label}</span>{children}</label>; }

function GuaranteeQueue({ items, saving, onView, onPay, onReverse }: { items: PostpaidGuarantee[]; saving: boolean; onView: (item: PostpaidGuarantee) => void; onPay: (item: PostpaidGuarantee) => void; onReverse: (item: PostpaidGuarantee) => void }) {
  return <div className="m-4 overflow-hidden rounded-[24px] border border-slate-300/[.075] bg-[#07111b]/72 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_14px_46px_rgba(0,0,0,.22)]"><div className="hidden overflow-x-auto xl:block"><table className="w-full min-w-[980px] text-left"><thead className="sticky top-0 z-10 bg-[#08131e] text-[9px] font-semibold uppercase tracking-[.12em] text-white/42"><tr><th className="px-4 py-3.5">Cliente / pedido</th><th className="px-3 py-3.5">Venda</th><th className="px-3 py-3.5">Modalidade</th><th className="px-3 py-3.5">Garantia</th><th className="px-3 py-3.5">Status</th><th className="px-3 py-3.5">Pagamento da garantia</th><th className="px-4 py-3.5 text-right">Ação</th></tr></thead><tbody>{items.map((item) => <GuaranteeRow key={item.id} item={item} saving={saving} onView={onView} onPay={onPay} onReverse={onReverse} />)}</tbody></table></div><div className="divide-y divide-white/[.07] xl:hidden">{items.map((item) => <GuaranteeMobileCard key={item.id} item={item} saving={saving} onView={onView} onPay={onPay} onReverse={onReverse} />)}</div></div>;
}

function GuaranteeRow({ item, saving, onView, onPay, onReverse }: { item: PostpaidGuarantee; saving: boolean; onView: (item: PostpaidGuarantee) => void; onPay: (item: PostpaidGuarantee) => void; onReverse: (item: PostpaidGuarantee) => void }) {
  return <tr className="group border-t border-white/[.05] text-xs transition duration-200 hover:bg-white/[.022]"><td className="px-4 py-4"><p className="max-w-[190px] truncate text-[13px] font-semibold text-slate-100">{item.sale.customerName}</p><p className="mt-1 font-mono text-[10px] tracking-[.06em] text-slate-600">#{item.saleId.slice(0, 8).toUpperCase()}</p></td><td className="px-3 py-4"><p className="max-w-[150px] truncate font-medium text-slate-300">{item.sale.productName}</p><p className="mt-1 text-[10px] text-slate-600">{formatDate(item.sale.saleDate)} · {brl(item.sale.totalAmount)}</p></td><td className="px-3 py-4"><span className="rounded-lg border border-white/[.07] bg-white/[.025] px-2 py-1 text-[10px] font-semibold text-slate-400">PAD</span><p className="mt-2 text-[10px] text-slate-600">Cliente: {customerPaymentLabel(item)}</p></td><td className="px-3 py-4"><p className="font-medium text-slate-300">{guaranteeTypeLabels[item.guaranteeType]}</p><p className="mt-1 text-[13px] font-semibold tabular-nums text-white">{brl(item.guaranteeAmount)}</p></td><td className="px-3 py-4"><StatusBadge status={item.status} /></td><td className="px-3 py-4">{item.paidAt ? <><p className="font-semibold tabular-nums text-money">{brl(item.paidAmount || 0)}</p><p className="mt-1 text-[10px] text-slate-600">{formatDate(item.paidAt)}</p></> : <span className="text-slate-600">Não registrado</span>}</td><td className="px-4 py-4 text-right"><GuaranteeActions item={item} saving={saving} onView={onView} onPay={onPay} onReverse={onReverse} /></td></tr>;
}

function GuaranteeMobileCard({ item, saving, onView, onPay, onReverse }: { item: PostpaidGuarantee; saving: boolean; onView: (item: PostpaidGuarantee) => void; onPay: (item: PostpaidGuarantee) => void; onReverse: (item: PostpaidGuarantee) => void }) {
  const [expanded, setExpanded] = useState(false);
  return <article className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[15px] font-semibold text-white">{item.sale.customerName}</p><p className="mt-1 font-mono text-[10px] tracking-[.06em] text-slate-600">#{item.saleId.slice(0, 8).toUpperCase()} · {formatDate(item.sale.saleDate)}</p></div><StatusBadge status={item.status} /></div><div className="mt-4 grid grid-cols-2 gap-2"><MiniDetail label="Valor da garantia" value={brl(item.guaranteeAmount)} featured /><MiniDetail label="Tipo" value={guaranteeTypeLabels[item.guaranteeType]} /><MiniDetail label="Pagamento do cliente" value={customerPaymentLabel(item)} /><MiniDetail label="Modalidade" value="Coinzz · PAD" /></div><button type="button" onClick={() => setExpanded((current) => !current)} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-slate-500" aria-expanded={expanded}><ChevronDown size={14} className={cn("transition", expanded && "rotate-180")} aria-hidden />{expanded ? "Ocultar detalhes" : "Ver detalhes da venda"}</button>{expanded ? <div className="mt-2 rounded-xl border border-white/[.06] bg-white/[.015] p-3 text-xs text-slate-500"><div className="flex justify-between gap-4"><span>Produto</span><strong className="max-w-[190px] truncate font-medium text-slate-300">{item.sale.productName}</strong></div><div className="mt-2 flex justify-between gap-4"><span>Valor da venda</span><strong className="font-medium tabular-nums text-slate-300">{brl(item.sale.totalAmount)}</strong></div>{item.paidAt ? <div className="mt-2 flex justify-between gap-4"><span>Pagamento da garantia</span><strong className="font-medium text-money">{brl(item.paidAmount || 0)} · {formatDate(item.paidAt)}</strong></div> : null}</div> : null}<div className="mt-4"><GuaranteeActions item={item} saving={saving} onView={onView} onPay={onPay} onReverse={onReverse} full /></div></article>;
}

function MiniDetail({ label, value, featured }: { label: string; value: string; featured?: boolean }) { return <div className={cn("rounded-xl border border-white/[.06] bg-white/[.015] p-3", featured && "border-amber/12 bg-amber/[.025]")}><p className="text-[9px] uppercase tracking-[.1em] text-slate-600">{label}</p><p className={cn("mt-1.5 truncate text-xs font-semibold text-slate-300", featured && "text-amber")}>{value}</p></div>; }

function GuaranteeAction({ item, saving, onPay, onReverse, full }: { item: PostpaidGuarantee; saving: boolean; onPay: (item: PostpaidGuarantee) => void; onReverse: (item: PostpaidGuarantee) => void; full?: boolean }) {
  if (item.status === "risk" || item.status === "due") return <button type="button" onClick={() => onPay(item)} disabled={saving} className={cn("inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-money/20 bg-money/[.075] px-3 text-[11px] font-semibold text-money transition hover:border-money/35 hover:bg-money/[.11] focus:outline-none focus:ring-2 focus:ring-money/20 disabled:opacity-40", full && "w-full min-h-11")}><CreditCard size={13} aria-hidden />Registrar pagamento</button>;
  if (item.status === "paid") return <button type="button" onClick={() => onReverse(item)} disabled={saving} className={cn("inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-danger/15 bg-danger/[.04] px-3 text-[11px] font-medium text-danger/80 transition duration-[180ms] hover:border-danger/30 hover:bg-danger/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-danger/15 disabled:opacity-40", full && "w-full min-h-11")}><RotateCcw size={13} aria-hidden />Estornar</button>;
  return <span className="text-[10px] text-slate-600">Sem ação pendente</span>;
}

function GuaranteeActions({ item, saving, onView, onPay, onReverse, full }: { item: PostpaidGuarantee; saving: boolean; onView: (item: PostpaidGuarantee) => void; onPay: (item: PostpaidGuarantee) => void; onReverse: (item: PostpaidGuarantee) => void; full?: boolean }) {
  return <div className={cn("inline-flex items-center justify-end gap-2", full && "flex w-full")}><button type="button" onClick={() => onView(item)} className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan/15 bg-cyan/[.045] text-cyan/75 transition hover:border-cyan/30 hover:bg-cyan/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan/15", full && "h-11 w-11")} aria-label={`Visualizar garantia de ${item.sale.customerName}`} title="Visualizar detalhes"><Eye size={14} aria-hidden /></button><div className={cn(full && "min-w-0 flex-1")}><GuaranteeAction item={item} saving={saving} onPay={onPay} onReverse={onReverse} full={full} /></div></div>;
}

function StatusBadge({ status }: { status: GuaranteeStatus }) {
  const style = { risk: "border-amber/25 bg-amber/10 text-amber", due: "border-danger/25 bg-danger/10 text-danger", paid: "border-money/25 bg-money/10 text-money", released: "border-cyan/25 bg-cyan/10 text-cyan", inactive: "border-white/10 bg-white/[.035] text-white/45" }[status];
  const Icon = status === "risk" ? AlertTriangle : status === "due" ? Clock3 : status === "paid" ? CheckCircle2 : status === "released" ? ShieldCheck : X;
  return <span className={cn("inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] font-semibold", style)}><Icon size={11} aria-hidden />{guaranteeStatusLabels[status]}</span>;
}

function customerPaymentLabel(item: PostpaidGuarantee) { return String(item.sale.paymentStatus || "").toLowerCase() === "paid" ? "Confirmado" : "Pendente"; }

function OperationalInsights({ metrics, items, setting }: { metrics: GuaranteeMetrics; items: PostpaidGuarantee[]; setting?: GuaranteeSetting }) {
  const composition = [{ label: "Em risco", count: metrics.riskItems.length, color: "bg-amber" }, { label: "A pagar", count: metrics.dueItems.length, color: "bg-danger" }, { label: "Pagas", count: items.filter((item) => item.status === "paid").length, color: "bg-money" }, { label: "Liberadas", count: metrics.releasedItems.length, color: "bg-cyan" }];
  const total = composition.reduce((sum, item) => sum + item.count, 0);
  const priority = metrics.dueItems.length ? `${plural(metrics.dueItems.length, "garantia obrigatória aguarda", "garantias obrigatórias aguardam")} repasse.` : metrics.riskItems.length ? "A maior parte da exposição depende do pagamento dos clientes." : "Não existem garantias exigindo ação financeira agora.";
  const recommendation = metrics.dueItems.length ? "Priorize as garantias obrigatórias antes de revisar os casos condicionais." : metrics.riskItems.length ? "Não há repasses obrigatórios pendentes. Acompanhe as vendas em risco." : "Carteira sem pendências financeiras no momento.";
  return <aside className="luxury-surface kau-surgical-surface self-start rounded-[28px] p-4 2xl:sticky 2xl:top-4"><PanelHeader icon={<BarChart3 size={18} />} title="Leitura operacional" description="Prioridades e composição da carteira atual." /><div className="mt-4"><InsightLabel>Prioridade atual</InsightLabel><p className="mt-2 text-[14px] font-semibold leading-5 text-white/82">{priority}</p></div><div className="mt-4 border-t border-white/[.08] pt-4"><InsightLabel>Composição da carteira</InsightLabel><div className="mt-3 flex h-2 overflow-hidden rounded-full bg-black/25">{composition.map((item) => <span key={item.label} className={item.color} style={{ width: `${total ? (item.count / total) * 100 : 0}%` }} />)}</div><div className="mt-3 space-y-2.5">{composition.map((item) => <div key={item.label} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-white/56"><span className={cn("h-1.5 w-1.5 rounded-full", item.color)} />{item.label}</span><span className="font-semibold tabular-nums text-white/78">{item.count}{total ? <span className="ml-1.5 font-normal text-white/40">{((item.count / total) * 100).toFixed(0)}%</span> : null}</span></div>)}</div></div><div className="mt-4 border-t border-white/[.08] pt-4"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.13em] text-cyan"><TrendingUp size={13} aria-hidden />Próxima ação</div><p className="mt-2 text-xs leading-5 text-white/58">{recommendation}</p></div>{setting ? <div className="mt-4 border-t border-white/[.08] pt-4"><div className="flex items-center justify-between"><InsightLabel>Configuração ativa</InsightLabel><span className={cn("rounded-full border px-2 py-1 text-[9px] font-semibold uppercase", setting.isActive ? "border-money/25 bg-money/10 text-money" : "border-white/10 bg-white/[.035] text-white/45")}>{setting.isActive ? "Ativa" : "Inativa"}</span></div><div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3"><ConfigLine label="Plataforma" value={setting.platform === "coinzz" ? "Coinzz" : setting.platform} /><ConfigLine label="Modalidade" value={setting.paymentMode} /><ConfigLine label="Valor padrão" value={brl(setting.defaultAmount)} /><ConfigLine label="Vigência" value={formatDate(setting.effectiveFrom)} /></div><p className="mt-3 text-[10px] leading-4 text-white/40">Alterações futuras não modificam garantias existentes.</p></div> : null}</aside>;
}

function InsightLabel({ children }: { children: ReactNode }) { return <p className="text-[10px] font-medium uppercase tracking-[.14em] text-slate-400/68">{children}</p>; }
function ConfigLine({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] uppercase tracking-[.1em] text-white/38">{label}</p><p className="mt-1 truncate text-xs font-semibold text-white/76">{value}</p></div>; }

function GuaranteeEmptyState({ baseEmpty, setupRequired, onClear, onConfigure }: { baseEmpty: boolean; setupRequired: boolean; onClear: () => void; onConfigure: () => void }) {
  if (!baseEmpty) return <div className="m-4 grid min-h-[220px] place-items-center rounded-[24px] border border-slate-300/[.075] bg-[#07111b]/72 p-6 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan/20 bg-cyan/10 text-cyan"><Search size={22} aria-hidden /></span><h3 className="mt-4 text-sm font-semibold text-white">Nenhuma garantia corresponde aos filtros</h3><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/52">Ajuste o período, o tipo ou o status para ampliar os resultados.</p><button type="button" onClick={onClear} className="mt-4 inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-xs font-semibold text-white/68 transition hover:text-white"><RotateCcw size={14} aria-hidden />Limpar filtros</button></div></div>;
  return <div className="m-4 grid min-h-[240px] place-items-center rounded-[24px] border border-slate-300/[.075] bg-[#07111b]/72 p-6 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan/20 bg-cyan/10 text-cyan"><ShieldQuestion size={22} aria-hidden /></span><h3 className="mt-4 text-base font-semibold text-white">Nenhuma garantia registrada ainda</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/58">As vendas Coinzz na modalidade PAD aparecerão aqui automaticamente após serem cadastradas.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Link href="/sales" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-money/35 bg-money px-4 text-xs font-semibold text-[#02130b] transition hover:bg-[#22e59b]">Abrir Vendas<ArrowRight size={14} aria-hidden /></Link><button type="button" onClick={onConfigure} disabled={setupRequired} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-xs font-semibold text-white/68 transition hover:text-white disabled:opacity-40"><Settings2 size={14} aria-hidden />Configurar garantia</button></div></div></div>;
}

function QueueSkeleton() { return <div className="space-y-px p-4" aria-label="Carregando garantias">{[1, 2, 3, 4, 5].map((row) => <div key={row} className="grid h-[72px] animate-pulse grid-cols-[1.1fr_1fr_.7fr_.8fr_.65fr] gap-3 rounded-xl border border-white/[.035] bg-white/[.018] p-3"><span className="rounded-lg bg-white/[.035]" /><span className="rounded-lg bg-white/[.025]" /><span className="rounded-lg bg-white/[.025]" /><span className="rounded-lg bg-white/[.025]" /><span className="rounded-lg bg-white/[.025]" /></div>)}</div>; }

function SetupNotice() { return <div role="status" className="flex max-w-4xl items-start gap-2.5 rounded-xl border border-amber/18 bg-amber/[.045] px-3.5 py-2.5 text-xs leading-5 text-slate-300"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber" aria-hidden /><span>{setupMessage}</span></div>; }

function FeedbackBanner({ feedback, onRetry, onClose }: { feedback: NonNullable<Feedback>; onRetry?: () => void | Promise<void>; onClose: () => void }) { return <div role={feedback.tone === "error" ? "alert" : "status"} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold", feedback.tone === "error" ? "border-danger/25 bg-danger/10 text-danger" : "border-money/25 bg-money/10 text-money")}><span className="shrink-0">{feedback.tone === "error" ? <AlertTriangle size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}</span><span className="min-w-0 flex-1">{feedback.text}</span>{onRetry ? <button type="button" onClick={() => void onRetry()} className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-current/20 bg-black/10 px-3 text-xs font-semibold transition hover:bg-white/[.04]"><RefreshCw size={12} aria-hidden />Tentar novamente</button> : null}<button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl opacity-60 hover:opacity-100" aria-label="Fechar mensagem"><X size={14} aria-hidden /></button></div>; }

function DrawerShell({ eyebrow, title, description, onClose, children, footer }: { eyebrow: string; title: string; description: string; onClose: () => void; children: ReactNode; footer: ReactNode }) { return <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"><button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Fechar painel" /><aside role="dialog" aria-modal="true" aria-labelledby="guarantee-drawer-title" className="relative flex h-full w-full max-w-lg animate-[slideIn_.2s_ease-out] flex-col border-l border-white/[.09] bg-[#070b12] shadow-[-35px_0_100px_rgba(0,0,0,.58)]"><header className="border-b border-white/[.065] px-5 py-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-money">{eyebrow}</p><h2 id="guarantee-drawer-title" className="mt-1.5 text-xl font-semibold tracking-[-.03em] text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.075] text-slate-500 transition hover:bg-white/[.035] hover:text-white" aria-label="Fechar"><X size={16} aria-hidden /></button></div></header><div className="min-h-0 flex-1 overflow-y-auto p-5 premium-scrollbar">{children}</div><footer className="border-t border-white/[.07] bg-[#080c13]/95 px-5 py-4">{footer}</footer></aside></div>; }

function GuaranteeDetailsDrawer({ item, saving, onClose, onPay, onReverse, onDateCorrected, setSaving }: { item: PostpaidGuarantee; saving: boolean; onClose: () => void; onPay: (item: PostpaidGuarantee) => void; onReverse: (item: PostpaidGuarantee) => void; onDateCorrected: (paidAt: string) => void; setSaving: (value: boolean) => void }) {
  const [correctingDate, setCorrectingDate] = useState(false);
  const [paidAt, setPaidAt] = useState(item.paidAt || "");
  const [error, setError] = useState<string | null>(null);

  async function correctDate(event: FormEvent) {
    event.preventDefault();
    if (!item.paidAt || !paidAt) { setError("Informe uma data de pagamento válida."); return; }
    if (paidAt === item.paidAt) { setCorrectingDate(false); return; }
    if (!window.confirm(`Confirma a alteração da data do pagamento da garantia de ${formatDate(item.paidAt)} para ${formatDate(paidAt)}?`)) return;
    setSaving(true); setError(null);
    const response = await fetch(`/api/guarantees/${item.id}/payment-date`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ paidAt }) });
    const payload = await readJson(response);
    setSaving(false);
    if (!response.ok) { setError(String(payload.error || "Não foi possível corrigir a data do pagamento.")); return; }
    setCorrectingDate(false);
    onDateCorrected(paidAt);
  }

  const canPay = item.status === "risk" || item.status === "due";
  const footer = item.status === "paid"
    ? <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setCorrectingDate(true)} disabled={saving} className="h-10 rounded-xl border border-cyan/20 bg-cyan/[.055] px-4 text-sm font-semibold text-cyan transition hover:bg-cyan/10 disabled:opacity-40"><CalendarDays size={14} className="mr-2 inline" />Corrigir data do pagamento</button><button type="button" onClick={() => onReverse(item)} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-danger/20 bg-danger/[.055] px-4 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-40"><RotateCcw size={14} />Estornar pagamento</button></div>
    : canPay
      ? <div className="flex justify-end"><button type="button" onClick={() => onPay(item)} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-money px-4 text-sm font-semibold text-[#02130b] disabled:opacity-40"><CreditCard size={14} />Registrar pagamento</button></div>
      : <p className="text-right text-xs text-slate-500">Nenhuma ação financeira disponível.</p>;

  return <DrawerShell eyebrow="Detalhes da garantia" title={item.sale.customerName} description={`Pedido #${item.saleId.slice(0, 8).toUpperCase()}`} onClose={onClose} footer={footer}><div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[.07] bg-white/[.018] p-4"><div><p className="text-[10px] uppercase tracking-[.12em] text-slate-600">Status atual</p><div className="mt-2"><StatusBadge status={item.status} /></div></div><p className="text-xl font-semibold tabular-nums text-white">{brl(item.guaranteeAmount)}</p></div><section className="mt-5 grid grid-cols-2 gap-3"><DetailLine label="Cliente" value={item.sale.customerName} /><DetailLine label="Código do pedido" value={`#${item.saleId.slice(0, 8).toUpperCase()}`} /><DetailLine label="Produto" value={item.sale.productName} /><DetailLine label="Plataforma" value={item.sale.salePlatform || "Coinzz"} /><DetailLine label="Modalidade" value={item.sale.paymentMethod || item.sale.deliveryType || "PAD"} /><DetailLine label="Data da venda" value={formatDate(item.sale.saleDate)} /><DetailLine label="Valor da venda" value={brl(item.sale.totalAmount)} /><DetailLine label="Pagamento do cliente" value={customerPaymentLabel(item)} /><DetailLine label="Tipo da garantia" value={guaranteeTypeLabels[item.guaranteeType]} /><DetailLine label="Valor da garantia" value={brl(item.guaranteeAmount)} /><DetailLine label="Status da garantia" value={guaranteeStatusLabels[item.status]} /><DetailLine label="Data do pagamento" value={formatDate(item.paidAt)} /><DetailLine label="Criada em" value={formatDateTime(item.createdAt)} /><DetailLine label="Última atualização" value={formatDateTime(item.updatedAt)} /></section>{item.notes ? <section className="mt-4 rounded-2xl border border-white/[.07] bg-white/[.018] p-4"><p className="text-[10px] uppercase tracking-[.12em] text-slate-600">Observação ou justificativa</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.notes}</p></section> : null}{correctingDate ? <form onSubmit={correctDate} className="mt-5 rounded-2xl border border-cyan/15 bg-cyan/[.035] p-4"><p className="text-sm font-semibold text-white">Corrigir data do pagamento</p><p className="mt-1 text-xs text-slate-500">Atual: {formatDate(item.paidAt)}. O valor, o status e o vínculo da despesa não serão alterados.</p><div className="mt-4"><DrawerField label="Nova data"><input type="date" className={inputClass} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} required /></DrawerField></div>{error ? <InlineActionError message={error} /> : null}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setCorrectingDate(false); setPaidAt(item.paidAt || ""); setError(null); }} disabled={saving} className="h-9 rounded-xl border border-white/[.08] px-3 text-xs font-medium text-slate-400">Cancelar</button><button type="submit" disabled={saving || !paidAt} className="h-9 rounded-xl bg-cyan px-3 text-xs font-semibold text-[#02131a] disabled:opacity-40">{saving ? "Salvando..." : "Revisar e confirmar"}</button></div></form> : error ? <InlineActionError message={error} /> : null}</DrawerShell>;
}

function DetailLine({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl border border-white/[.06] bg-white/[.014] p-3"><p className="text-[9px] uppercase tracking-[.1em] text-slate-600">{label}</p><p className="mt-1.5 break-words text-xs font-semibold text-slate-300">{value || "—"}</p></div>; }

function PaymentDrawer({ item, saving, onClose, onSaved, setSaving }: { item: PostpaidGuarantee; saving: boolean; onClose: () => void; onSaved: () => void | Promise<void>; setSaving: (value: boolean) => void }) {
  const [amount, setAmount] = useState(String(item.guaranteeAmount)); const [date, setDate] = useState(today()); const [notes, setNotes] = useState(""); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(null); const response = await fetch(`/api/guarantees/${item.id}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ paidAmount: Number(amount.replace(",", ".")), paidAt: date, notes }) }); const payload = await readJson(response); setSaving(false); if (!response.ok) { setError(String(payload.error || "Não foi possível registrar o pagamento.")); return; } await onSaved(); }
  const paidValue = Number(amount.replace(",", ".")) || 0;
  return <form onSubmit={submit}><DrawerShell eyebrow="Garantias pós-pagas" title="Registrar pagamento" description="Confirme o repasse ao produtor. A despesa será criada na mesma transação." onClose={onClose} footer={<div className="flex items-center justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-xl border border-white/[.08] px-4 text-sm font-medium text-slate-400 hover:text-white">Cancelar</button><button type="submit" disabled={saving || paidValue <= 0} className="inline-flex h-10 min-w-44 items-center justify-center gap-2 rounded-xl bg-money px-4 text-sm font-semibold text-[#02130b] transition hover:bg-[#22e59b] disabled:cursor-not-allowed disabled:opacity-45">{saving ? <><RefreshCw size={14} className="animate-spin" />Registrando...</> : <><Check size={15} />Confirmar pagamento</>}</button></div>}><SaleContext item={item} />{error ? <InlineActionError message={error} /> : null}<div className="mt-6 space-y-4"><DrawerField label="Valor efetivamente pago"><div className="relative"><span className="absolute left-3 top-3 text-sm text-slate-600">R$</span><input className={cn(inputClass, "pl-10 tabular-nums")} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required autoFocus /></div></DrawerField><DrawerField label="Data do pagamento"><input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} required /></DrawerField><DrawerField label="Observações (opcional)"><textarea className={cn(inputClass, "h-auto min-h-28 resize-none py-3")} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Referência ou contexto deste repasse" /></DrawerField></div><div className="mt-6 rounded-2xl border border-money/12 bg-money/[.035] p-4"><div className="flex items-center justify-between gap-4"><span className="text-xs text-slate-500">Total que será registrado em Despesas</span><strong className="text-lg font-semibold tabular-nums text-money">{brl(paidValue)}</strong></div><p className="mt-2 text-[10px] leading-4 text-slate-600">Categoria Garantias · Origem Coinzz · vínculo protegido contra edição direta.</p></div></DrawerShell></form>;
}

function ConfigDrawer({ setting, saving, onClose, onSaved, setSaving }: { setting: GuaranteeSetting; saving: boolean; onClose: () => void; onSaved: () => void | Promise<void>; setSaving: (value: boolean) => void }) {
  const [amount, setAmount] = useState(String(setting.defaultAmount)); const [active, setActive] = useState(setting.isActive); const [date, setDate] = useState(setting.effectiveFrom); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(null); const response = await fetch("/api/guarantees", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: setting.id, defaultAmount: Number(amount.replace(",", ".")), isActive: active, effectiveFrom: date }) }); const payload = await readJson(response); setSaving(false); if (!response.ok) { setError(String(payload.error || "Não foi possível atualizar a configuração.")); return; } await onSaved(); }
  return <form onSubmit={submit}><DrawerShell eyebrow="Política de garantia" title="Configurar garantia" description="Defina o padrão usado em novos lançamentos Coinzz PAD." onClose={onClose} footer={<div className="flex items-center justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-xl border border-white/[.08] px-4 text-sm font-medium text-slate-400 hover:text-white">Cancelar</button><button type="submit" disabled={saving} className="inline-flex h-10 min-w-40 items-center justify-center gap-2 rounded-xl bg-money px-4 text-sm font-semibold text-[#02130b] disabled:opacity-45">{saving ? <RefreshCw size={14} className="animate-spin" /> : <Settings2 size={14} />}Salvar configuração</button></div>}>{error ? <InlineActionError message={error} /> : null}<div className="grid gap-3 sm:grid-cols-2"><DrawerField label="Plataforma"><input className={inputClass} value="Coinzz" readOnly /></DrawerField><DrawerField label="Modalidade"><input className={inputClass} value="PAD" readOnly /></DrawerField><DrawerField label="Valor padrão"><div className="relative"><span className="absolute left-3 top-3 text-sm text-slate-600">R$</span><input className={cn(inputClass, "pl-10")} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" /></div></DrawerField><DrawerField label="Início da vigência"><input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} /></DrawerField></div><label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl border border-white/[.07] bg-white/[.018] p-4"><span><span className="block text-sm font-semibold text-slate-200">Configuração ativa</span><span className="mt-1 block text-xs text-slate-500">Permite criar garantias para novas vendas elegíveis.</span></span><span className={cn("relative h-6 w-11 rounded-full transition", active ? "bg-money" : "bg-white/[.1]")}><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="peer sr-only" /><span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white transition", active ? "left-6" : "left-1")} /></span></label><div className="mt-5 rounded-2xl border border-cyan/10 bg-cyan/[.025] p-4 text-xs leading-5 text-slate-400"><strong className="font-semibold text-cyan">Impacto futuro.</strong> O novo valor será copiado somente para garantias criadas depois da mudança. Garantias existentes preservam o valor original.</div></DrawerShell></form>;
}

function SaleContext({ item }: { item: PostpaidGuarantee }) { return <section className="rounded-2xl border border-white/[.07] bg-white/[.018] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.12em] text-slate-600">Venda vinculada</p><p className="mt-1.5 text-base font-semibold text-white">{item.sale.customerName}</p><p className="mt-1 font-mono text-[10px] tracking-[.06em] text-slate-600">#{item.saleId.slice(0, 8).toUpperCase()}</p></div><StatusBadge status={item.status} /></div><div className="mt-4 grid grid-cols-2 gap-2"><MiniDetail label="Tipo" value={guaranteeTypeLabels[item.guaranteeType]} /><MiniDetail label="Valor previsto" value={brl(item.guaranteeAmount)} featured /></div></section>; }
function DrawerField({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-medium text-slate-400">{label}</span>{children}</label>; }
function InlineActionError({ message }: { message: string }) { return <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-300/18 bg-rose-400/[.045] p-3 text-xs leading-5 text-rose-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden /><span>{message}</span></div>; }

function ReversalDialog({ item, saving, error, onCancel, onConfirm }: { item: PostpaidGuarantee; saving: boolean; error: string | null; onCancel: () => void; onConfirm: () => void }) { return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><div role="alertdialog" aria-modal="true" aria-labelledby="reversal-title" className="w-full max-w-md rounded-[24px] border border-white/[.1] bg-[#090e16] p-5 shadow-[0_30px_100px_rgba(0,0,0,.65)]"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-300/15 bg-rose-400/[.055] text-rose-300"><RotateCcw size={18} aria-hidden /></span><h2 id="reversal-title" className="mt-4 text-lg font-semibold text-white">Estornar pagamento?</h2><p className="mt-2 text-sm leading-6 text-slate-400">A garantia de <strong className="font-semibold text-slate-200">{item.sale.customerName}</strong> voltará ao status derivado e a despesa vinculada será removida na mesma transação.</p><div className="mt-4 rounded-xl border border-white/[.06] bg-white/[.018] px-3 py-2.5 text-xs text-slate-500"><span>Valor pago</span><strong className="float-right font-semibold tabular-nums text-white">{brl(item.paidAmount || 0)}</strong></div>{error ? <InlineActionError message={error} /> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} disabled={saving} className="h-10 rounded-xl border border-white/[.08] px-4 text-sm font-medium text-slate-400 hover:text-white">Cancelar</button><button type="button" onClick={onConfirm} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-400/[.08] px-4 text-sm font-semibold text-rose-200 hover:bg-rose-400/[.12] disabled:opacity-45">{saving ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}Confirmar estorno</button></div></div></div>; }
