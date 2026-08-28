"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  HelpCircle,
  Layers3,
  Link2,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  ReceiptText,
  SlidersHorizontal,
  Target,
  UsersRound,
  X
} from "lucide-react";
import type {
  AdAccount,
  AdPlatform,
  CampaignBreakdownRow,
  CampaignExpenseAttributionRow,
  CampaignPerformanceResponse,
  CampaignPerformanceRow
} from "@/data/campaign-types";
import type { SaleRecord } from "@/data/sales-types";
import { cn } from "@/lib/utils";

const platforms: AdPlatform[] = ["Meta Ads", "Google Ads", "TikTok Ads", "Outros"];
const inputClass = "h-10 w-full rounded-xl border border-white/[.09] bg-[#091019] px-3 text-xs font-medium text-slate-200 outline-none transition hover:border-white/[.15] focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 [color-scheme:dark] [&_option]:bg-[#070b12]";
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const monthStart = () => `${today().slice(0, 7)}-01`;
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const ratio = (value: number | null) => value == null ? "—" : `${value.toFixed(2)}x`;
const percent = (value: number | null, digits = 1) => value == null ? "—" : `${value.toFixed(digits)}%`;
const dateLabel = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));

const emptyPerformance = (): CampaignPerformanceResponse => ({
  summary: { investment: 0, sales: 0, paidSales: 0, pendingSales: 0, deliveredSales: 0, grossRevenue: 0, operationRevenue: 0, realizedGrossRevenue: 0, realizedOperationRevenue: 0, sellerCommission: 0, cpa: null, paidCpa: null, grossRoas: null, operationRoas: null, resultAfterMedia: 0, marginAfterMedia: null, averageTicket: null, averageOperationRevenue: null, paymentRate: null },
  attribution: { totalInvestment: 0, attributedInvestment: 0, unattributedInvestment: 0, attributionPercent: null, unattributedCount: 0, unattributedExpenses: [] },
  campaigns: [], byState: [], byOrigin: [], bySeller: [],
  filters: { accounts: [], campaigns: [], products: [], origins: [], sellers: [], states: [] }
});

type Filters = { start: string; end: string; account: string; campaign: string; platform: string; product: string; origin: string; seller: string; state: string };
const initialFilters: Filters = { start: monthStart(), end: today(), account: "all", campaign: "all", platform: "all", product: "all", origin: "all", seller: "all", state: "all" };

export function CampaignsScreen() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<CampaignPerformanceResponse>(emptyPerformance());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<keyof CampaignPerformanceRow>("investment");
  const [dialog, setDialog] = useState<"campaign" | "account" | null>(null);
  const [selected, setSelected] = useState<CampaignPerformanceRow | null>(null);
  const [selectedSales, setSelectedSales] = useState<SaleRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);
  const [attributionOpen, setAttributionOpen] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assigningExpenseId, setAssigningExpenseId] = useState<string | null>(null);
  const [campaignByExpense, setCampaignByExpense] = useState<Record<string, string>>({});
  const [editingCampaign, setEditingCampaign] = useState<CampaignPerformanceRow | null>(null);
  const [editingAccount, setEditingAccount] = useState<AdAccount | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [preferredAccountId, setPreferredAccountId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/campaigns/performance?${new URLSearchParams(filters)}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a performance.");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a performance.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!selected) { setSelectedSales([]); return; }
    fetch("/api/sales", { cache: "no-store", credentials: "include" })
      .then((response) => response.json())
      .then((payload) => setSelectedSales((payload.sales || []).filter((sale: SaleRecord) => sale.campaignId === selected.id)))
      .catch(() => setSelectedSales([]));
  }, [selected]);

  const rows = useMemo(() => [...data.campaigns].sort((a, b) => Number(b[sort] || 0) - Number(a[sort] || 0)), [data.campaigns, sort]);
  const setFilter = (key: keyof Filters, value: string) => setFilters((current) => ({ ...current, [key]: value, ...(key === "account" ? { campaign: "all" } : {}) }));
  const campaignsForAccount = data.filters.campaigns.filter((campaign) => filters.account === "all" || campaign.adAccountId === filters.account);
  const context = `${dateLabel(filters.start)} → ${dateLabel(filters.end)} · ${filters.campaign === "all" ? "Todas as campanhas" : campaignsForAccount.find((item) => item.id === filters.campaign)?.name || "Campanha"} · ${filters.platform === "all" ? "Todas as plataformas" : filters.platform}`;
  const secondaryCount = [filters.origin, filters.seller, filters.state].filter((value) => value !== "all").length;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => current === message ? null : current), 2800);
  }

  function applyCampaignUpdate(campaign: CampaignPerformanceResponse["filters"]["campaigns"][number]) {
    setData((current) => ({
      ...current,
      campaigns: current.campaigns.map((row) => row.id === campaign.id ? { ...row, ...campaign } : row),
      filters: { ...current.filters, campaigns: current.filters.campaigns.map((row) => row.id === campaign.id ? campaign : row) }
    }));
    setSelected((current) => current?.id === campaign.id ? { ...current, ...campaign } : current);
  }

  function applyAccountUpdate(account: AdAccount) {
    setData((current) => ({
      ...current,
      campaigns: current.campaigns.map((row) => row.adAccountId === account.id ? { ...row, adAccountName: account.name, adPlatform: account.platform } : row),
      filters: {
        ...current.filters,
        accounts: current.filters.accounts.some((row) => row.id === account.id) ? current.filters.accounts.map((row) => row.id === account.id ? account : row) : [...current.filters.accounts, account].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        campaigns: current.filters.campaigns.map((row) => row.adAccountId === account.id ? { ...row, adAccountName: account.name, adPlatform: account.platform } : row)
      }
    }));
  }

  async function assignExpense(expenseId: string) {
    const campaignId = campaignByExpense[expenseId];
    if (!campaignId) return;
    setAssignmentError(null);
    setAssigningExpenseId(expenseId);
    try {
      const response = await fetch("/api/campaigns/attribution", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ expenseId, campaignId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível atribuir a despesa.");
      setCampaignByExpense((current) => { const next = { ...current }; delete next[expenseId]; return next; });
      await load();
    } catch (assignError) {
      setAssignmentError(assignError instanceof Error ? assignError.message : "Não foi possível atribuir a despesa.");
    } finally {
      setAssigningExpenseId(null);
    }
  }

  return (
    <div className="space-y-5 pb-10 pt-1">
      <div className="luxury-surface kau-surgical-surface relative overflow-hidden rounded-[30px] border border-white/[.085] bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,.11),transparent_34%),radial-gradient(circle_at_88%_4%,rgba(124,58,237,.08),transparent_30%),linear-gradient(120deg,rgba(255,255,255,.025),transparent_56%)] shadow-[0_26px_70px_rgba(0,0,0,.2)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/25 to-transparent" />
        <CampaignHeader context={context} onAccounts={() => setAccountsOpen(true)} onCampaign={() => setDialog("campaign")} />
        <FilterToolbar filters={filters} accounts={data.filters.accounts} campaigns={campaignsForAccount} products={data.filters.products} origins={data.filters.origins} sellers={data.filters.sellers} states={data.filters.states} moreFilters={moreFilters} secondaryCount={secondaryCount} onToggleMore={() => setMoreFilters((current) => !current)} onChange={setFilter} />
      </div>
      {data.setupRequired ? <CompactNotice text="Campanhas estão temporariamente indisponíveis. Tente novamente em instantes." /> : null}
      {error ? <CompactNotice text={error} error /> : null}

      <AnalyticHero data={data} loading={loading} />
      {!loading && data.attribution.unattributedInvestment > 0 ? <UnattributedCallout attribution={data.attribution} onOpen={() => { setAssignmentError(null); setAttributionOpen(true); }} /> : null}
      <ReturnStrip metrics={data.summary} loading={loading} />

      <CampaignTable rows={rows} loading={loading} sort={sort} onSort={setSort} onSelect={setSelected} onEdit={setEditingCampaign} onCreate={() => setDialog("campaign")} />

      <IntelligenceSurface summary={data.summary} byState={data.byState} byOrigin={data.byOrigin} bySeller={data.bySeller} loading={loading} />

      {dialog ? <CreateDialog kind={dialog} accounts={data.filters.accounts} saving={saving} onClose={() => setDialog(null)} onSaved={async (created) => { setDialog(null); if (created.account) { applyAccountUpdate(created.account); if (editingCampaign) setPreferredAccountId(created.account.id); } else await load(); }} setSaving={setSaving} /> : null}
      {selected ? <CampaignDetail campaign={selected} sales={selectedSales} onEdit={() => { setEditingCampaign(selected); setSelected(null); }} onClose={() => setSelected(null)} /> : null}
      {editingCampaign ? <EditCampaignDrawer campaign={editingCampaign} accounts={data.filters.accounts} preferredAccountId={preferredAccountId} onNewAccount={() => { setPreferredAccountId(null); setDialog("account"); }} onSaved={(campaign) => { applyCampaignUpdate(campaign); setEditingCampaign(null); setPreferredAccountId(null); showToast("Campanha atualizada"); void load(true); }} onClose={() => { setEditingCampaign(null); setPreferredAccountId(null); }} /> : null}
      {accountsOpen ? <AccountsDrawer accounts={data.filters.accounts} onNew={() => setDialog("account")} onEdit={setEditingAccount} onClose={() => setAccountsOpen(false)} /> : null}
      {editingAccount ? <EditAccountDrawer account={editingAccount} onSaved={(account) => { applyAccountUpdate(account); setEditingAccount(null); showToast("Conta atualizada"); void load(true); }} onClose={() => setEditingAccount(null)} /> : null}
      {attributionOpen ? <AttributionDrawer expenses={data.attribution.unattributedExpenses} campaigns={data.filters.campaigns} selected={campaignByExpense} assigningExpenseId={assigningExpenseId} error={assignmentError} setupRequired={Boolean(data.setupRequired)} onSelect={(expenseId, campaignId) => setCampaignByExpense((current) => ({ ...current, [expenseId]: campaignId }))} onAssign={assignExpense} onClose={() => setAttributionOpen(false)} /> : null}
      {toast ? <div className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-xl bg-[#0b1514] px-4 py-3 text-xs font-semibold text-money shadow-panel ring-1 ring-inset ring-money/20"><Check size={14} />{toast}</div> : null}
    </div>
  );
}

function CampaignHeader({ context, onAccounts, onCampaign }: { context: string; onAccounts: () => void; onCampaign: () => void }) {
  return (
    <header className="relative flex flex-col gap-5 px-5 pb-5 pt-6 sm:px-7 sm:pt-7 md:flex-row md:items-end md:justify-between xl:px-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.18em] text-money">Aquisição</p>
        <h1 className="mt-1.5 text-3xl font-black tracking-[-.045em] text-white sm:text-[42px] sm:leading-none">Campanhas</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300/80">Investimento, vendas geradas e retorno financeiro em uma única leitura.</p>
        <p className="mt-2.5 text-xs font-semibold text-slate-500">{context}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onAccounts} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[.11] bg-[#12202c]/80 px-4 text-xs font-bold text-slate-300 shadow-sm transition hover:border-white/[.2] hover:bg-[#172936] hover:text-white"><Layers3 size={14} /> Contas</button>
        <button onClick={onCampaign} className="inline-flex h-11 items-center gap-2 rounded-xl border border-money/30 bg-money px-4 text-xs font-black text-[#02130b] shadow-[0_12px_34px_rgba(44,255,136,.12)] transition hover:brightness-110"><Plus size={14} /> Nova campanha</button>
      </div>
    </header>
  );
}

function FilterToolbar(props: { filters: Filters; accounts: AdAccount[]; campaigns: CampaignPerformanceResponse["filters"]["campaigns"]; products: string[]; origins: string[]; sellers: string[]; states: string[]; moreFilters: boolean; secondaryCount: number; onToggleMore: () => void; onChange: (key: keyof Filters, value: string) => void }) {
  return (
    <section className="relative mx-3 mb-3 rounded-[22px] border border-slate-300/[.075] bg-[#07111b]/72 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_14px_46px_rgba(0,0,0,.2)] sm:mx-4 sm:mb-4 sm:px-5">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500"><SlidersHorizontal size={12} className="text-cyan/80" /> Central de filtros</div>
      <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1.35fr)_repeat(4,minmax(120px,1fr))_auto]">
        <div className="min-w-0">
          <span className="mb-2 block text-[11px] font-bold tracking-[.02em] text-slate-400">Período</span>
          <div className="flex items-center rounded-xl border border-white/[.08] bg-[#071019] px-2.5 shadow-inner transition focus-within:border-cyan/35 focus-within:ring-2 focus-within:ring-cyan/10">
            <CalendarDays size={13} className="shrink-0 text-cyan" />
            <input className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[13px] font-medium text-slate-200 outline-none [color-scheme:dark]" type="date" value={props.filters.start} onChange={(event) => props.onChange("start", event.target.value)} />
            <span className="text-slate-700">→</span>
            <input className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[13px] font-medium text-slate-200 outline-none [color-scheme:dark]" type="date" value={props.filters.end} onChange={(event) => props.onChange("end", event.target.value)} />
          </div>
        </div>
        <CompactFilter label="Conta" value={props.filters.account} options={props.accounts.map((item) => [item.id, item.name])} onChange={(value) => props.onChange("account", value)} fluid />
        <CompactFilter label="Campanha" value={props.filters.campaign} options={props.campaigns.map((item) => [item.id, item.name])} onChange={(value) => props.onChange("campaign", value)} fluid />
        <CompactFilter label="Plataforma" value={props.filters.platform} options={platforms.map((item) => [item, item])} onChange={(value) => props.onChange("platform", value)} fluid />
        <CompactFilter label="Produto" value={props.filters.product} options={props.products.map((item) => [item, item])} onChange={(value) => props.onChange("product", value)} fluid />
        <button type="button" onClick={props.onToggleMore} className={cn("inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition", props.moreFilters || props.secondaryCount ? "border-purple/25 bg-purple/[.09] text-purple" : "border-white/[.08] bg-[#0b151e] text-slate-400 hover:border-white/[.15] hover:bg-[#101c27] hover:text-white")}>
          <SlidersHorizontal size={13} /> + Filtros
          {props.secondaryCount ? <span className="grid h-4 min-w-4 place-items-center rounded-full bg-purple/20 px-1 text-[9px]">{props.secondaryCount}</span> : null}
          <ChevronDown size={12} className={cn("transition", props.moreFilters && "rotate-180")} />
        </button>
      </div>
      {props.moreFilters ? <div className="mt-4 grid gap-3 border-t border-white/[.065] pt-4 sm:grid-cols-3"><CompactFilter label="Origem da venda" value={props.filters.origin} options={props.origins.map((item) => [item, originLabel(item)])} onChange={(value) => props.onChange("origin", value)} fluid /><CompactFilter label="Vendedor" value={props.filters.seller} options={props.sellers.map((item) => [item, item])} onChange={(value) => props.onChange("seller", value)} fluid /><CompactFilter label="UF" value={props.filters.state} options={props.states.map((item) => [item, item])} onChange={(value) => props.onChange("state", value)} fluid /></div> : null}
    </section>
  );
}

function AnalyticHero({ data, loading }: { data: CampaignPerformanceResponse; loading: boolean }) {
  const { summary, attribution } = data;
  const resultTone = summary.resultAfterMedia < 0 ? "text-danger" : "text-money";
  return (
    <section className="luxury-surface kau-surgical-surface relative overflow-hidden rounded-[30px] border border-white/[.085] bg-[#07111b]/72 shadow-[0_24px_80px_rgba(0,0,0,.24)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-money/45 to-transparent" />
      <div className="p-5 sm:p-7 xl:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[.19em] text-cyan">Performance do período</p>
          <span className="rounded-full border border-white/[.07] bg-white/[.035] px-3 py-1.5 text-[11px] font-medium text-slate-400">Dados atribuídos · sem estimativas</span>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(470px,.95fr)] xl:items-end">
          <div>
            {loading ? <div className="h-16 w-72 animate-pulse rounded-xl bg-white/[.055]" /> : <p className={cn("text-5xl font-black tracking-[-.06em] tabular-nums sm:text-6xl", resultTone)}>{money(summary.resultAfterMedia)}</p>}
            <p className="mt-2 text-base font-bold text-slate-200">Resultado atribuído após mídia</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Receita líquida atribuída menos investimento atribuído.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HeroMetric label="Investimento atribuído" value={money(summary.investment)} loading={loading} tone="text-white" />
            <HeroMetric label="Receita líquida atribuída" value={money(summary.operationRevenue)} loading={loading} tone="text-cyan" />
            <HeroMetric label="ROAS da operação" tooltip="Receita líquida atribuída dividida pelo investimento atribuído." value={ratio(summary.operationRoas)} loading={loading} tone="text-purple" />
          </div>
        </div>

        <div className="mt-7 grid gap-3 border-t border-white/[.07] pt-5 lg:grid-cols-[1fr_1fr_1.15fr]">
          <CpaCard label="CPA Gerado" tooltip="Investimento atribuído dividido pelas vendas atribuídas geradas." value={summary.cpa} count={summary.sales} countLabel="vendas geradas" loading={loading} tone="purple" />
          <CpaCard label="CPA Pago" tooltip="Investimento atribuído dividido pelas vendas atribuídas com pagamento confirmado." value={summary.paidCpa} count={summary.paidSales} countLabel="vendas pagas" loading={loading} tone="money" empty="Nenhuma venda paga no período." />
          <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-[.13em] text-slate-400">Cobertura do investimento</p><span className="text-sm font-black tabular-nums text-purple">{loading ? "—" : percent(attribution.attributionPercent)}</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber/[.12]"><div className="h-full rounded-full bg-purple transition-all duration-500" style={{ width: `${Math.min(100, attribution.attributionPercent || 0)}%` }} /></div>
            {!loading ? <div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] text-slate-500"><span><b className="font-bold text-purple">{money(attribution.attributedInvestment)}</b> atribuído</span><span><b className="font-bold text-amber">{money(attribution.unattributedInvestment)}</b> sem atribuição</span></div> : <div className="mt-3 h-4 w-48 animate-pulse rounded bg-white/[.04]" />}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricLabel({ label, tooltip }: { label: string; tooltip?: string }) {
  return <span className="inline-flex items-center gap-1.5" title={tooltip}>{label}{tooltip ? <HelpCircle size={12} className="text-slate-600" aria-label={tooltip} /> : null}</span>;
}

function HeroMetric({ label, tooltip, value, loading, tone }: { label: string; tooltip?: string; value: string; loading: boolean; tone: string }) {
  return <div className="rounded-2xl border border-white/[.07] bg-white/[.027] p-4"><p className="text-[10px] font-bold uppercase tracking-[.11em] text-slate-500"><MetricLabel label={label} tooltip={tooltip} /></p>{loading ? <div className="mt-3 h-7 w-28 animate-pulse rounded bg-white/[.045]" /> : <p className={cn("mt-2 text-xl font-black tracking-[-.035em] tabular-nums sm:text-2xl", tone)}>{value}</p>}</div>;
}

function CpaCard({ label, tooltip, value, count, countLabel, loading, tone, empty }: { label: string; tooltip: string; value: number | null; count: number; countLabel: string; loading: boolean; tone: "purple" | "money"; empty?: string }) {
  const toneClass = tone === "purple" ? "text-purple" : "text-money";
  return <div className={cn("rounded-2xl border p-4 sm:p-5", tone === "purple" ? "border-purple/15 bg-purple/[.045]" : "border-money/15 bg-money/[.04]")}><div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-400"><MetricLabel label={label} tooltip={tooltip} /></p><CircleDollarSign size={17} className={toneClass} /></div>{loading ? <div className="mt-4 h-9 w-36 animate-pulse rounded bg-white/[.05]" /> : <p className={cn("mt-3 text-3xl font-black tracking-[-.045em] tabular-nums", toneClass)}>{value == null ? "—" : money(value)}</p>}{!loading ? <p className="mt-1.5 text-xs text-slate-500">{count > 0 ? `${count} ${countLabel}` : empty || `Nenhuma ${countLabel}`}</p> : null}</div>;
}

function UnattributedCallout({ attribution, onOpen }: { attribution: CampaignPerformanceResponse["attribution"]; onOpen: () => void }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-amber/[.045] px-4 py-3 ring-1 ring-inset ring-amber/15 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber/[.09] text-amber"><Layers3 size={16} /></span>
        <div><p className="text-sm font-semibold text-amber">{money(attribution.unattributedInvestment)} sem atribuição</p><p className="mt-0.5 text-[11px] text-slate-500">{attribution.unattributedCount} {attribution.unattributedCount === 1 ? "despesa de tráfego ainda não está ligada" : "despesas de tráfego ainda não estão ligadas"} a uma campanha.</p></div>
      </div>
      <button onClick={onOpen} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-amber/[.1] px-3 text-[11px] font-semibold text-amber ring-1 ring-inset ring-amber/20 transition hover:bg-amber/[.15]"><Link2 size={12} /> Atribuir gastos</button>
    </section>
  );
}

function ReturnStrip({ metrics, loading }: { metrics: CampaignPerformanceResponse["summary"]; loading: boolean }) {
  const items = [
    ["Faturamento bruto", money(metrics.grossRevenue), "text-white"],
    ["Receita realizada", money(metrics.realizedOperationRevenue), "text-cyan"],
    ["ROAS bruto", ratio(metrics.grossRoas), "text-purple"],
    ["Ticket médio", metrics.averageTicket == null ? "—" : money(metrics.averageTicket), "text-white"],
    ["Taxa de pagamento", percent(metrics.paymentRate), "text-money"]
  ];
  return <section className="luxury-surface kau-surgical-surface relative overflow-hidden rounded-[28px] border border-white/[.08] bg-[#07111b]/72 shadow-[0_20px_55px_rgba(0,0,0,.2)]"><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/22 to-transparent" /><div className="grid grid-cols-2 md:grid-cols-5">{items.map(([label, value, tone], index) => <div key={label} className={cn("relative min-h-[116px] px-5 py-5", index && "md:border-l md:border-white/[.07]", index === items.length - 1 && "col-span-2 md:col-span-1")}><p className="text-[11px] font-bold uppercase tracking-[.11em] text-slate-300/72" title={label === "Taxa de pagamento" ? "Vendas pagas divididas pelas vendas geradas." : undefined}>{label}</p>{loading ? <div className="mt-3 h-7 w-28 animate-pulse rounded bg-white/[.05]" /> : <p className={cn("mt-2 text-xl font-black tracking-[-.035em] tabular-nums xl:text-2xl", tone)}>{value}</p>}{label === "Taxa de pagamento" && !loading ? <p className="mt-1.5 text-[11px] font-medium text-slate-400/72">{metrics.paidSales} de {metrics.sales} vendas</p> : null}</div>)}</div></section>;
}

function CampaignTable({ rows, loading, sort, onSort, onSelect, onEdit, onCreate }: { rows: CampaignPerformanceRow[]; loading: boolean; sort: keyof CampaignPerformanceRow; onSort: (key: keyof CampaignPerformanceRow) => void; onSelect: (row: CampaignPerformanceRow) => void; onEdit: (row: CampaignPerformanceRow) => void; onCreate: () => void }) {
  const heads: Array<[string, keyof CampaignPerformanceRow, string?]> = [
    ["Investimento", "investment"],
    ["Vendas", "sales"],
    ["Pagas", "paidSales"],
    ["CPA Gerado", "cpa", "Investimento atribuído dividido pelas vendas atribuídas geradas."],
    ["CPA Pago", "paidCpa", "Investimento atribuído dividido pelas vendas atribuídas com pagamento confirmado."],
    ["Faturamento", "grossRevenue"],
    ["Receita líquida", "operationRevenue"],
    ["ROAS operação", "operationRoas", "Receita líquida atribuída dividida pelo investimento atribuído."],
    ["Resultado", "resultAfterMedia", "Receita líquida atribuída menos investimento atribuído."]
  ];
  return (
    <section className="luxury-surface kau-surgical-surface overflow-hidden rounded-[30px] border border-white/[.085] bg-[#07111b]/76 shadow-[0_26px_72px_rgba(0,0,0,.24)]">
      <div className="flex flex-col gap-4 border-b border-white/[.065] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
        <div className="flex items-center gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan/15 bg-cyan/[.065] text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,.035)]"><BarChart3 size={18} /></span>
          <h2 className="text-xl font-bold tracking-[-.025em] text-slate-100 sm:text-[22px]">Performance por campanha</h2>
        </div>
        <label className="flex items-center gap-2.5 self-start text-xs font-semibold text-slate-400 sm:self-auto">
          <span>Ordenar por</span>
          <select aria-label="Ordenar campanhas" value={String(sort)} onChange={(event) => onSort(event.target.value as keyof CampaignPerformanceRow)} className="h-10 rounded-xl border border-white/[.1] bg-[#09141e] px-3.5 text-xs font-semibold text-slate-200 outline-none transition hover:border-white/[.16] focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 [color-scheme:dark]">
            {heads.map(([label, key]) => <option key={key} value={String(key)}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="space-y-4 p-4 sm:p-5 lg:p-6">
        {loading ? <TableSkeleton /> : rows.length ? rows.map((row) => <CampaignPerformanceCard key={row.id} row={row} onSelect={onSelect} onEdit={onEdit} />) : <CompactCampaignEmpty onCreate={onCreate} />}
      </div>
    </section>
  );
}

function CampaignPerformanceCard({ row, onSelect, onEdit }: { row: CampaignPerformanceRow; onSelect: (row: CampaignPerformanceRow) => void; onEdit: (row: CampaignPerformanceRow) => void }) {
  const openCampaign = () => onSelect(row);
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Abrir detalhes da campanha ${row.name}`}
      onClick={openCampaign}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openCampaign(); } }}
      className="group relative cursor-pointer overflow-hidden rounded-[24px] border border-white/[.085] bg-[linear-gradient(135deg,rgba(14,29,40,.96),rgba(8,19,29,.96))] shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_16px_42px_rgba(0,0,0,.18)] outline-none transition duration-200 hover:-translate-y-0.5 hover:border-cyan/20 hover:shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_20px_50px_rgba(0,0,0,.24)] focus-visible:border-cyan/35 focus-visible:ring-2 focus-visible:ring-cyan/15"
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan/20 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="grid lg:grid-cols-3 xl:grid-cols-[minmax(230px,1.12fr)_minmax(370px,1.72fr)_minmax(190px,.9fr)_minmax(205px,.95fr)_52px] xl:items-stretch">
        <CampaignIdentity row={row} />
        <CampaignAcquisition row={row} />
        <CampaignRevenue row={row} />
        <CampaignReturn row={row} />
        <div className="absolute right-4 top-4 sm:right-5 sm:top-5 xl:static xl:flex xl:items-center xl:justify-center xl:border-l xl:border-white/[.065]">
          <button type="button" title="Editar campanha" aria-label={`Editar campanha ${row.name}`} onClick={(event) => { event.stopPropagation(); onEdit(row); }} className="grid h-11 w-11 place-items-center rounded-xl border border-white/[.09] bg-white/[.025] text-slate-400 transition hover:border-cyan/30 hover:bg-cyan/[.08] hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/25"><Pencil size={16} /></button>
        </div>
      </div>
    </article>
  );
}

function CampaignIdentity({ row }: { row: CampaignPerformanceRow }) {
  return (
    <section className="min-w-0 px-5 pb-5 pt-20 sm:px-6 sm:pb-6 sm:pt-6 lg:col-span-3 lg:pr-20 xl:col-span-1 xl:pr-6">
      <CampaignStatus status={row.status} />
      <h3 title={row.name} className="mt-4 truncate text-xl font-extrabold tracking-[-.035em] text-white xl:text-[21px]">{row.name}</h3>
      <p className="mt-2.5 line-clamp-2 text-[13px] font-medium leading-5 text-slate-400">{row.adPlatform} · {row.adAccountName || "Sem conta"}{row.productName ? ` · ${row.productName}` : ""}</p>
    </section>
  );
}

function CampaignAcquisition({ row }: { row: CampaignPerformanceRow }) {
  return (
    <PerformanceBlock title="Aquisição" tone="purple" className="lg:border-r-0 xl:border-l">
      <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
        <PerformanceMetric label="Investimento" value={money(row.investment)} className="col-span-2 sm:col-span-1" />
        <PerformanceMetric label="Vendas" value={String(row.sales)} />
        <PerformanceMetric label="Pagas" value={String(row.paidSales)} tone="money" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-5 border-t border-white/[.065] pt-5">
        <PerformanceMetric label="CPA Gerado" value={row.cpa == null ? "—" : money(row.cpa)} tone="purple" tooltip="Investimento atribuído dividido pelas vendas atribuídas geradas." />
        <PerformanceMetric label="CPA Pago" value={row.paidCpa == null ? "—" : money(row.paidCpa)} tone="money" tooltip="Investimento atribuído dividido pelas vendas atribuídas com pagamento confirmado." />
      </div>
    </PerformanceBlock>
  );
}

function CampaignRevenue({ row }: { row: CampaignPerformanceRow }) {
  return (
    <PerformanceBlock title="Receita" tone="cyan" className="lg:border-l xl:border-l">
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-1">
        <PerformanceMetric label="Faturamento" value={money(row.grossRevenue)} />
        <PerformanceMetric label="Receita líquida" value={money(row.operationRevenue)} tone="cyan" />
      </div>
    </PerformanceBlock>
  );
}

function CampaignReturn({ row }: { row: CampaignPerformanceRow }) {
  const resultTone = row.resultAfterMedia < 0 ? "danger" : "money";
  return (
    <PerformanceBlock title="Retorno" tone={resultTone} className="lg:border-l xl:border-l">
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-1">
        <PerformanceMetric label="ROAS operação" value={ratio(row.operationRoas)} tooltip="Receita líquida atribuída dividida pelo investimento atribuído." />
        <PerformanceMetric label="Resultado" value={money(row.resultAfterMedia)} tone={resultTone} strong tooltip="Receita líquida atribuída menos investimento atribuído." />
      </div>
    </PerformanceBlock>
  );
}

function PerformanceBlock({ title, tone, className, children }: { title: string; tone: "purple" | "cyan" | "money" | "danger"; className?: string; children: ReactNode }) {
  return (
    <section className={cn("min-w-0 border-t border-white/[.065] px-5 py-5 sm:px-6 sm:py-6 lg:border-t lg:first:border-t-0 xl:border-t-0", className)}>
      <div className="mb-5 flex items-center gap-2.5">
        <span className={cn("h-2 w-2 rounded-full", tone === "purple" ? "bg-purple shadow-[0_0_14px_rgba(148,104,255,.45)]" : tone === "cyan" ? "bg-cyan shadow-[0_0_14px_rgba(34,211,238,.4)]" : tone === "danger" ? "bg-danger shadow-[0_0_14px_rgba(248,113,113,.35)]" : "bg-money shadow-[0_0_14px_rgba(55,230,153,.4)]")} />
        <h4 className={cn("text-xs font-extrabold uppercase tracking-[.14em]", tone === "purple" ? "text-purple/90" : tone === "cyan" ? "text-cyan/90" : tone === "danger" ? "text-danger/90" : "text-money/90")}>{title}</h4>
      </div>
      {children}
    </section>
  );
}

function PerformanceMetric({ label, value, tone, strong, tooltip, className }: { label: string; value: string; tone?: "cyan" | "money" | "danger" | "purple"; strong?: boolean; tooltip?: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)} title={tooltip}>
      <p className="flex min-h-4 items-center gap-1.5 text-[11px] font-semibold uppercase leading-4 tracking-[.07em] text-slate-400">
        <span>{label}</span>{tooltip ? <HelpCircle size={12} className="shrink-0 text-slate-500" /> : null}
      </p>
      <p className={cn("mt-2 whitespace-nowrap text-lg font-extrabold leading-none tracking-[-.025em] tabular-nums text-slate-100 2xl:text-xl", strong && "text-xl 2xl:text-[22px]", tone === "cyan" && "text-cyan", tone === "money" && "text-money", tone === "danger" && "text-danger", tone === "purple" && "text-purple")}>{value}</p>
    </div>
  );
}

function IntelligenceSurface({ summary, byState, byOrigin, bySeller, loading }: { summary: CampaignPerformanceResponse["summary"]; byState: CampaignBreakdownRow[]; byOrigin: CampaignBreakdownRow[]; bySeller: CampaignBreakdownRow[]; loading: boolean }) {
  return (
    <section className="luxury-surface kau-surgical-surface overflow-hidden rounded-[28px] border border-white/[.08] bg-[#07111b]/72 shadow-[0_22px_65px_rgba(0,0,0,.22)]">
      <div className="flex items-center gap-3 border-b border-white/[.065] px-5 py-5 sm:px-6"><span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan/15 bg-cyan/[.06] text-cyan"><Activity size={17} /></span><div><h2 className="text-lg font-bold text-slate-100">Leitura operacional</h2><p className="mt-1 text-xs text-slate-500">Conversão, geografia, origem e performance comercial.</p></div></div>
      <ConversionFunnel sales={summary.sales} delivered={summary.deliveredSales} paid={summary.paidSales} loading={loading} />
      <div className="grid gap-3 border-t border-white/[.06] p-4 lg:grid-cols-3 sm:p-5">
        <RankingSection icon={<MapPin size={14} />} title="Onde você vende mais" rows={byState} accent="money" />
        <RankingSection icon={<Target size={14} />} title="Origem das vendas" rows={byOrigin.map((row) => ({ ...row, label: originLabel(row.label) }))} accent="cyan" />
        <SellerRanking rows={bySeller} />
      </div>
    </section>
  );
}

function ConversionFunnel({ sales, delivered, paid, loading }: { sales: number; delivered: number; paid: number; loading: boolean }) {
  const stages = [
    { label: "Geradas", value: sales, rate: "Base atribuída", tone: "text-cyan", bar: "bg-cyan" },
    { label: "Entregues", value: delivered, rate: sales ? `${percent((delivered / sales) * 100)} das registradas` : "—", tone: "text-purple", bar: "bg-purple" },
    { label: "Pagas", value: paid, rate: sales ? `${percent((paid / sales) * 100)} das geradas` : "—", tone: "text-money", bar: "bg-money" }
  ];
  return (
    <div className="grid gap-3 px-4 py-5 sm:grid-cols-3 sm:px-6 sm:py-6">
      {stages.map((stage, index) => (
        <div key={stage.label} className="relative rounded-2xl border border-white/[.07] bg-white/[.025] p-4 sm:p-5">
          {index < stages.length - 1 ? <span className="absolute -right-[15px] top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-white/[.08] bg-[#0d1720] text-slate-600 sm:grid"><ChevronRight size={14} /></span> : null}
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">{stage.label}</p>
          <div className="mt-3 flex items-end justify-between gap-2">
            {loading ? <div className="h-10 w-16 animate-pulse rounded bg-white/[.05]" /> : <p className={cn("text-4xl font-black tracking-[-.05em] tabular-nums", stage.tone)}>{stage.value}</p>}
            <span className="pb-1 text-[11px] font-semibold text-slate-500">{stage.rate}</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[.06]">
            <div className={cn("h-full rounded-full", stage.bar)} style={{ width: `${sales ? Math.min(100, (stage.value / sales) * 100) : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RankingSection({ icon, title, rows, accent }: { icon: ReactNode; title: string; rows: CampaignBreakdownRow[]; accent: "money" | "cyan" }) {
  return <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4 sm:p-5"><div className="flex items-center gap-2.5"><span className={cn("grid h-8 w-8 place-items-center rounded-lg", accent === "money" ? "bg-money/[.07] text-money" : "bg-cyan/[.07] text-cyan")}>{icon}</span><h3 className="text-sm font-bold text-slate-100">{title}</h3></div><div className="mt-5 space-y-4">{rows.slice(0, 5).map((row, index) => <div key={row.key}><div className="flex items-center gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/[.045] text-[10px] font-bold text-slate-500">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-200">{row.label}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.sales} {row.sales === 1 ? "venda" : "vendas"}</p></div><p className="text-sm font-bold tabular-nums text-slate-200">{percent(row.sharePercent)}</p></div><div className="ml-9 mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.055]"><div className={cn("h-full rounded-full", accent === "money" ? "bg-money/65" : "bg-cyan/65")} style={{ width: `${Math.min(100, row.sharePercent)}%` }} /></div></div>)}{!rows.length ? <InsightEmpty /> : null}</div></div>;
}

function SellerRanking({ rows }: { rows: CampaignBreakdownRow[] }) {
  return <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4 sm:p-5"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-purple/[.08] text-purple"><UsersRound size={14} /></span><div><h3 className="text-sm font-bold text-slate-100">Performance comercial</h3><p className="mt-0.5 text-[10px] text-slate-500">Receita da operação ≠ subcomissão</p></div></div><div className="mt-4 space-y-2">{rows.slice(0, 5).map((row, index) => <div key={row.key} className="flex items-center gap-3 rounded-xl border border-white/[.055] bg-black/10 px-3 py-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple/[.09] text-xs font-bold text-purple">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-200">{row.label}</p><p className="mt-1 text-[10px] text-slate-500">{row.sales} vendas · subcomissão {money(row.sellerCommission || 0)}</p></div><div className="text-right"><p className="text-[9px] font-bold uppercase tracking-[.08em] text-slate-600">Receita</p><p className="mt-1 text-sm font-bold tabular-nums text-cyan">{money(row.operationRevenue)}</p></div></div>)}{!rows.length ? <InsightEmpty /> : null}</div></div>;
}

function AttributionDrawer({ expenses, campaigns, selected, assigningExpenseId, error, setupRequired, onSelect, onAssign, onClose }: { expenses: CampaignExpenseAttributionRow[]; campaigns: CampaignPerformanceResponse["filters"]["campaigns"]; selected: Record<string, string>; assigningExpenseId: string | null; error: string | null; setupRequired: boolean; onSelect: (expenseId: string, campaignId: string) => void; onAssign: (expenseId: string) => void; onClose: () => void }) {
  const availableCampaigns = campaigns.filter((campaign) => campaign.status !== "archived");
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <button className="absolute inset-0" onClick={onClose} aria-label="Fechar gastos sem atribuição" />
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-white/[.08] bg-[#070b12] shadow-[-30px_0_90px_rgba(0,0,0,.55)]">
        <header className="flex items-start justify-between border-b border-white/[.065] px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-amber">Cobertura de investimento</p><h2 className="mt-1 text-xl font-semibold tracking-[-.035em] text-white">Gastos sem atribuição</h2><p className="mt-1 text-xs text-slate-500">Vincule cada despesa existente sem alterar o lançamento financeiro.</p></div><CloseButton onClick={onClose} /></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {setupRequired ? <CompactNotice text="A vinculação de campanhas está temporariamente indisponível. Tente novamente em instantes." /> : null}
          {error ? <div className="mb-3"><CompactNotice text={error} error /></div> : null}
          <div className="space-y-2.5">{expenses.map((expense) => <article key={expense.id} className="rounded-xl bg-white/[.018] p-3.5 ring-1 ring-inset ring-white/[.065]"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><ReceiptText size={13} className="text-amber" /><p className="truncate text-xs font-semibold text-slate-200">{expense.description}</p></div><p className="mt-1.5 text-[10px] text-slate-600">{dateLabel(expense.expenseDate)} · Tráfego{expense.source ? ` · ${expense.source}` : ""}</p></div><p className="text-sm font-semibold tabular-nums text-white">{money(expense.amount)}</p></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select className={cn(inputClass, "flex-1")} value={selected[expense.id] || ""} disabled={setupRequired || !availableCampaigns.length || assigningExpenseId === expense.id} onChange={(event) => onSelect(expense.id, event.target.value)}><option value="">Selecionar campanha</option>{availableCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.adPlatform}</option>)}</select><button type="button" disabled={setupRequired || !selected[expense.id] || assigningExpenseId === expense.id} onClick={() => onAssign(expense.id)} className="inline-flex h-9 min-w-28 items-center justify-center gap-1.5 rounded-lg bg-purple/[.12] px-3 text-[11px] font-semibold text-purple ring-1 ring-inset ring-purple/20 transition hover:bg-purple/[.18] disabled:cursor-not-allowed disabled:opacity-40">{assigningExpenseId === expense.id ? "Atribuindo..." : <><Link2 size={12} /> Atribuir</>}</button></div></article>)}{!expenses.length ? <div className="py-14 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-money/[.08] text-money"><Check size={17} /></span><p className="mt-3 text-sm font-semibold text-white">Todo investimento está atribuído</p><p className="mt-1 text-xs text-slate-600">Não há despesas de Tráfego pendentes neste período.</p></div> : null}</div>
        </div>
      </aside>
    </div>
  );
}

function EditCampaignDrawer({ campaign, accounts, preferredAccountId, onNewAccount, onSaved, onClose }: { campaign: CampaignPerformanceRow; accounts: AdAccount[]; preferredAccountId: string | null; onNewAccount: () => void; onSaved: (campaign: CampaignPerformanceResponse["filters"]["campaigns"][number]) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: campaign.name, adAccountId: campaign.adAccountId || "", platform: campaign.adPlatform, productName: campaign.productName || "", startDate: campaign.startDate || "", endDate: campaign.endDate || "", status: campaign.status, externalId: campaign.externalCampaignId || "", notes: campaign.notes || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedAccount = accounts.find((account) => account.id === form.adAccountId);

  useEffect(() => {
    if (!preferredAccountId) return;
    const account = accounts.find((item) => item.id === preferredAccountId);
    if (account) setForm((current) => ({ ...current, adAccountId: account.id, platform: account.platform }));
  }, [accounts, preferredAccountId]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await fetch("/api/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ kind: "campaign", id: campaign.id, name: form.name, adAccountId: form.adAccountId || null, adPlatform: form.platform, productName: form.productName, startDate: form.startDate, endDate: form.endDate, status: form.status, externalCampaignId: form.externalId, notes: form.notes }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a campanha.");
      onSaved(payload.campaign);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Não foi possível atualizar a campanha."); }
    finally { setSaving(false); }
  }

  return <DrawerFrame eyebrow="Financeiro · Campanhas" title="Editar campanha" subtitle="Atualize os metadados sem alterar vendas ou despesas vinculadas." onClose={onClose}><form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5"><Field label="Nome da campanha"><input className={inputClass} value={form.name} onChange={(event) => set("name", event.target.value)} required /></Field><AccountPicker accounts={accounts} value={form.adAccountId} searchKey={campaign.id} onChange={(accountId) => { const account = accounts.find((item) => item.id === accountId); setForm((current) => ({ ...current, adAccountId: accountId, platform: account?.platform || current.platform })); }} onNew={onNewAccount} /><div className="grid gap-3 sm:grid-cols-2"><Field label="Plataforma de anúncio"><select className={cn(inputClass, selectedAccount && "cursor-not-allowed opacity-70")} value={form.platform} disabled={Boolean(selectedAccount)} onChange={(event) => set("platform", event.target.value)}>{platforms.map((item) => <option key={item} value={item}>{item}</option>)}</select>{selectedAccount ? <p className="mt-1.5 text-[10px] text-slate-600">Sincronizada com a conta selecionada.</p> : null}</Field><Field label="Produto"><input className={inputClass} value={form.productName} onChange={(event) => set("productName", event.target.value)} /></Field><Field label="Data inicial"><input className={inputClass} type="date" value={form.startDate} onChange={(event) => set("startDate", event.target.value)} /></Field><Field label="Data final"><input className={inputClass} type="date" value={form.endDate} onChange={(event) => set("endDate", event.target.value)} /></Field><FilterSelect label="Status" value={form.status} onChange={(value) => set("status", value)} allowAll={false} options={[["active", "Ativa"], ["paused", "Pausada"], ["archived", "Arquivada"]]} /><Field label="ID externo"><input className={inputClass} value={form.externalId} onChange={(event) => set("externalId", event.target.value)} /></Field></div><Field label="Observações"><textarea className={cn(inputClass, "h-24 resize-none py-2.5")} value={form.notes} onChange={(event) => set("notes", event.target.value)} /></Field>{error ? <CompactNotice text={error} error /> : null}<div className="rounded-lg bg-white/[.018] px-3 py-2 text-[10px] leading-5 text-slate-600 ring-1 ring-inset ring-white/[.05]">A campanha mantém o mesmo ID. Vendas e despesas vinculadas não são alteradas por esta edição.</div></div><DrawerFooter saving={saving} onCancel={onClose} label="Salvar alterações" /></form></DrawerFrame>;
}

function AccountPicker({ accounts, value, searchKey, onChange, onNew }: { accounts: AdAccount[]; value: string; searchKey: string; onChange: (value: string) => void; onNew: () => void }) {
  const [search, setSearch] = useState("");
  const normalized = search.trim().toLocaleLowerCase("pt-BR");
  const visible = accounts.filter((account) => account.id === value || (account.status === "active" && (!normalized || `${account.name} ${account.platform} ${account.externalAccountId || ""}`.toLocaleLowerCase("pt-BR").includes(normalized))));
  return <div key={searchKey}><Field label="Conta de anúncio"><div className="rounded-xl bg-white/[.015] p-2.5 ring-1 ring-inset ring-white/[.065]"><input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conta" aria-label="Buscar conta de anúncio" /><select className={cn(inputClass, "mt-2")} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Sem conta</option>{visible.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.platform}{account.status === "inactive" ? " · Inativa" : ""}</option>)}</select><button type="button" onClick={onNew} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-cyan transition hover:bg-cyan/[.06]"><Plus size={12} /> Nova conta</button></div></Field></div>;
}

function AccountsDrawer({ accounts, onNew, onEdit, onClose }: { accounts: AdAccount[]; onNew: () => void; onEdit: (account: AdAccount) => void; onClose: () => void }) {
  return <DrawerFrame eyebrow="Financeiro · Campanhas" title="Contas de anúncio" subtitle="Gerencie cadastro e status sem exclusão física." onClose={onClose}><div className="min-h-0 flex-1 overflow-y-auto p-5"><button type="button" onClick={onNew} className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-money px-3 text-xs font-semibold text-[#02130b]"><Plus size={13} /> Nova conta</button><div className="space-y-2">{accounts.map((account) => <article key={account.id} className="flex items-center gap-3 rounded-xl bg-white/[.018] p-3.5 ring-1 ring-inset ring-white/[.06]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan/[.06] text-cyan"><Megaphone size={15} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-200">{account.name}</p><p className="mt-1 text-[10px] text-slate-600">{account.platform}{account.externalAccountId ? ` · ${account.externalAccountId}` : ""}</p></div><span className={cn("rounded-md px-2 py-1 text-[9px] font-semibold uppercase ring-1 ring-inset", account.status === "active" ? "bg-money/[.05] text-money ring-money/15" : "text-slate-500 ring-white/[.08]")}>{account.status === "active" ? "Ativa" : "Inativa"}</span><button type="button" onClick={() => onEdit(account)} title="Editar conta" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[.05] hover:text-white"><Pencil size={13} /></button></article>)}{!accounts.length ? <p className="py-12 text-center text-xs text-slate-600">Nenhuma conta cadastrada.</p> : null}</div></div></DrawerFrame>;
}

function EditAccountDrawer({ account, onSaved, onClose }: { account: AdAccount; onSaved: (account: AdAccount) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: account.name, platform: account.platform, externalId: account.externalAccountId || "", status: account.status });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await fetch("/api/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ kind: "account", id: account.id, name: form.name, platform: form.platform, externalAccountId: form.externalId, status: form.status }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a conta.");
      onSaved(payload.account);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Não foi possível atualizar a conta."); }
    finally { setSaving(false); }
  }
  return <DrawerFrame eyebrow="Financeiro · Campanhas" title="Editar conta" subtitle="Atualize o cadastro ou desative a conta pelo status." onClose={onClose}><form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5"><Field label="Nome"><input className={inputClass} value={form.name} onChange={(event) => set("name", event.target.value)} required /></Field><FilterSelect label="Plataforma" value={form.platform} onChange={(value) => set("platform", value)} allowAll={false} options={platforms.map((item) => [item, item])} /><Field label="ID externo"><input className={inputClass} value={form.externalId} onChange={(event) => set("externalId", event.target.value)} /></Field><FilterSelect label="Status" value={form.status} onChange={(value) => set("status", value)} allowAll={false} options={[["active", "Ativa"], ["inactive", "Inativa"]]} />{error ? <CompactNotice text={error} error /> : null}<div className="rounded-lg bg-amber/[.035] px-3 py-2 text-[10px] leading-5 text-slate-500 ring-1 ring-inset ring-amber/10">Contas não são excluídas. Se houver campanhas vinculadas, a API impede a troca de plataforma para preservar a consistência histórica.</div></div><DrawerFooter saving={saving} onCancel={onClose} label="Salvar alterações" /></form></DrawerFrame>;
}

function DrawerFrame({ eyebrow, title, subtitle, onClose, children }: { eyebrow: string; title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-40 flex justify-end bg-black/70 backdrop-blur-sm"><button className="absolute inset-0" onClick={onClose} aria-label={`Fechar ${title}`} /><aside role="dialog" aria-modal="true" className="relative flex h-full w-full max-w-xl flex-col border-l border-white/[.08] bg-[#070b12] shadow-[-30px_0_90px_rgba(0,0,0,.55)]"><header className="flex items-start justify-between border-b border-white/[.065] px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-money">{eyebrow}</p><h2 className="mt-1 text-xl font-semibold tracking-[-.035em] text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><CloseButton onClick={onClose} /></header>{children}</aside></div>;
}

function DrawerFooter({ saving, onCancel, label }: { saving: boolean; onCancel: () => void; label: string }) {
  return <footer className="flex justify-end gap-2 border-t border-white/[.065] bg-[#080d14]/95 px-5 py-4"><button type="button" onClick={onCancel} disabled={saving} className="h-9 rounded-lg px-4 text-xs font-medium text-slate-400 ring-1 ring-inset ring-white/[.08] disabled:opacity-50">Cancelar</button><button disabled={saving} className="h-9 min-w-36 rounded-lg bg-money px-4 text-xs font-semibold text-[#02130b] disabled:cursor-wait disabled:opacity-50">{saving ? "Salvando..." : label}</button></footer>;
}

function CreateDialog({ kind, accounts, saving, onClose, onSaved, setSaving }: { kind: "campaign" | "account"; accounts: AdAccount[]; saving: boolean; onClose: () => void; onSaved: (created: { account?: AdAccount }) => void; setSaving: (value: boolean) => void }) {
  const [form, setForm] = useState({ name: "", platform: "Meta Ads", adAccountId: "", productName: "", startDate: "", endDate: "", status: "active", externalId: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const body = kind === "account" ? { kind, name: form.name, platform: form.platform, externalAccountId: form.externalId } : { kind, name: form.name, adAccountId: form.adAccountId || null, adPlatform: form.platform, productName: form.productName, startDate: form.startDate, endDate: form.endDate, status: form.status, externalCampaignId: form.externalId, notes: form.notes };
      const response = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar.");
      onSaved({ account: payload.account });
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-white/[.1] bg-[#080d14] p-5 shadow-panel"><div className="flex justify-between"><div><p className="text-[10px] uppercase tracking-[.13em] text-money">Financeiro · Campanhas</p><h2 className="mt-1 text-xl font-semibold text-white">{kind === "account" ? "Nova conta de anúncio" : "Nova campanha"}</h2></div><CloseButton onClick={onClose} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Nome"><input className={inputClass} value={form.name} onChange={(event) => set("name", event.target.value)} required /></Field><FilterSelect label="Plataforma" value={form.platform} onChange={(value) => set("platform", value)} allowAll={false} options={platforms.map((item) => [item, item])} />{kind === "campaign" ? <><FilterSelect label="Conta de anúncio" value={form.adAccountId} onChange={(value) => { set("adAccountId", value); const account = accounts.find((item) => item.id === value); if (account) set("platform", account.platform); }} allowAll={false} emptyLabel="Sem conta" options={accounts.filter((item) => item.status === "active").map((item) => [item.id, item.name])} /><Field label="Produto"><input className={inputClass} value={form.productName} onChange={(event) => set("productName", event.target.value)} /></Field><Field label="Data inicial"><input className={inputClass} type="date" value={form.startDate} onChange={(event) => set("startDate", event.target.value)} /></Field><Field label="Data final (opcional)"><input className={inputClass} type="date" value={form.endDate} onChange={(event) => set("endDate", event.target.value)} /></Field><FilterSelect label="Status" value={form.status} onChange={(value) => set("status", value)} allowAll={false} options={[["active", "Ativa"], ["paused", "Pausada"], ["archived", "Arquivada"]]} /></> : null}<Field label="ID externo (opcional)"><input className={inputClass} value={form.externalId} onChange={(event) => set("externalId", event.target.value)} /></Field>{kind === "campaign" ? <div className="sm:col-span-2"><Field label="Observações"><textarea className={cn(inputClass, "h-20 py-2")} value={form.notes} onChange={(event) => set("notes", event.target.value)} /></Field></div> : null}</div>{error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-white/[.1] px-4 py-2 text-xs text-slate-400">Cancelar</button><button disabled={saving} className="rounded-lg bg-money px-4 py-2 text-xs font-semibold text-[#02130b] disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button></div></form></div>;
}

function CampaignDetail({ campaign, sales, onEdit, onClose }: { campaign: CampaignPerformanceRow; sales: SaleRecord[]; onEdit: () => void; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"><button className="absolute inset-0" onClick={onClose} aria-label="Fechar" /><aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/[.09] bg-[#070b12] p-5"><div className="flex justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.13em] text-money">Detalhe da campanha</p><h2 className="mt-1 text-xl font-semibold text-white">{campaign.name}</h2><p className="mt-1 text-xs text-slate-500">{campaign.adAccountName || "Sem conta"} · {campaign.adPlatform}{campaign.productName ? ` · ${campaign.productName}` : ""}</p></div><div className="flex gap-2"><button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/[.04] px-3 text-[11px] font-semibold text-slate-300 ring-1 ring-inset ring-white/[.08] transition hover:text-white"><Pencil size={12} /> Editar campanha</button><CloseButton onClick={onClose} /></div></div><div className="mt-5 grid grid-cols-2 gap-2"><Mini label="Investimento" value={money(campaign.investment)} /><Mini label="Vendas geradas" value={String(campaign.sales)} /><Mini label="Vendas pagas" value={String(campaign.paidSales)} /><Mini label="CPA Gerado" value={campaign.cpa == null ? "—" : money(campaign.cpa)} /><Mini label="CPA Pago" value={campaign.paidCpa == null ? "—" : money(campaign.paidCpa)} /><Mini label="ROAS operação" value={ratio(campaign.operationRoas)} /><Mini label="Receita líquida" value={money(campaign.operationRevenue)} /><Mini label="Resultado após mídia" value={money(campaign.resultAfterMedia)} danger={campaign.resultAfterMedia < 0} /></div><h3 className="mt-6 text-sm font-semibold text-white">Vendas vinculadas</h3><div className="mt-3 space-y-2">{sales.map((sale) => <div key={sale.id} className="rounded-xl border border-white/[.07] p-3"><div className="flex justify-between"><div><p className="text-sm font-semibold text-slate-200">{sale.customerName}</p><p className="mt-1 text-[10px] text-slate-500">{sale.state || "Sem UF"} · {sale.sellerName} · {originLabel(String(sale.salePlatform || ""))}</p></div><div className="text-right"><p className="text-xs font-semibold text-white">{money(sale.totalAmount)}</p><p className={cn("mt-1 text-[10px]", sale.paymentStatus === "paid" ? "text-money" : "text-amber")}>{sale.paymentStatus === "paid" ? "Pago" : "Pendente"}</p></div></div></div>)}{!sales.length ? <p className="rounded-xl border border-dashed border-white/[.08] py-8 text-center text-xs text-slate-600">Nenhuma venda vinculada no histórico carregado.</p> : null}</div></aside></div>;
}

function CompactFilter({ label, value, options, onChange, wide, fluid }: { label: string; value: string; options: string[][]; onChange: (value: string) => void; wide?: boolean; fluid?: boolean }) { return <label className={cn("block shrink-0", fluid ? "w-full" : wide ? "w-52" : "w-40")}><span className="mb-2 block text-[11px] font-bold tracking-[.02em] text-slate-400">{label}</span><select className="h-11 w-full rounded-xl border border-white/[.08] bg-[#071019] px-3 text-[13px] font-medium text-slate-200 outline-none transition hover:border-white/[.15] focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 [color-scheme:dark] [&_option]:bg-[#070b12]" value={value} onChange={(event) => onChange(event.target.value)}><option value="all">Todos</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function FilterSelect({ label, value, onChange, options, allowAll = true, emptyLabel = "Todos" }: { label: string; value: string; onChange: (value: string) => void; options: string[][]; allowAll?: boolean; emptyLabel?: string }) { return <Field label={label}><select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{allowAll ? <option value="all">Todos</option> : <option value="">{emptyLabel}</option>}{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></Field>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[.1em] text-slate-500">{label}</span>{children}</label>; }
function CampaignStatus({ status }: { status: CampaignPerformanceRow["status"] }) {
  const active = status === "active";
  const label = active ? "Ativa" : status === "paused" ? "Pausada" : "Arquivada";
  return (
    <span className={cn("inline-flex h-8 items-center gap-2.5 rounded-full border px-2.5 pr-3 text-[11px] font-bold uppercase tracking-[.07em]", active ? "border-money/20 bg-money/[.075] text-money" : status === "paused" ? "border-amber/20 bg-amber/[.06] text-amber" : "border-white/[.09] bg-white/[.025] text-slate-400")}>
      <span aria-hidden="true" className={cn("relative h-4 w-7 rounded-full border transition", active ? "border-money/30 bg-money/20" : status === "paused" ? "border-amber/25 bg-amber/10" : "border-white/10 bg-black/20")}>
        <span className={cn("absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full shadow-sm transition", active ? "right-0.5 bg-money shadow-[0_0_8px_rgba(55,230,153,.7)]" : "left-0.5 bg-slate-500")} />
      </span>
      {label}
    </span>
  );
}
function TableSkeleton() { return <div className="space-y-2 p-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-white/[.03]" />)}</div>; }
function CompactCampaignEmpty({ onCreate }: { onCreate: () => void }) { return <div className="flex min-h-[180px] items-center justify-center p-6 text-center"><div><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white/[.025] text-slate-600 ring-1 ring-inset ring-white/[.07]"><Megaphone size={18} /></span><h3 className="mt-3 text-sm font-semibold text-white">Nenhuma campanha criada</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-600">Crie uma campanha para conectar investimento e vendas. Os gastos de Tráfego existentes já estão consolidados acima.</p><button onClick={onCreate} className="mt-3 rounded-lg bg-money px-3 py-2 text-xs font-semibold text-[#02130b]">+ Nova campanha</button></div></div>; }
function InsightEmpty() { return <p className="py-7 text-center text-[10px] text-slate-700">Sem dados no período selecionado.</p>; }
function Mini({ label, value, danger }: { label: string; value: string; danger?: boolean }) { return <div className="rounded-xl border border-white/[.07] p-3"><p className="text-[9px] uppercase tracking-[.1em] text-slate-500">{label}</p><p className={cn("mt-1 text-sm font-semibold", danger ? "text-danger" : "text-white")}>{value}</p></div>; }
function CloseButton({ onClick }: { onClick: () => void }) { return <button type="button" onClick={onClick} className="h-9 w-9 rounded-lg border border-white/[.08] text-slate-500 transition hover:text-white"><X className="mx-auto" size={15} /></button>; }
function CompactNotice({ text, error }: { text: string; error?: boolean }) { return <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] ring-1 ring-inset", error ? "bg-danger/[.05] text-rose-200 ring-danger/20" : "bg-amber/[.04] text-amber ring-amber/15")}><AlertTriangle size={13} />{text}</div>; }
function originLabel(value: string) { return ({ payt: "Payt", coinzz: "Coinzz", logzz: "Logzz", manual: "Venda Manual" } as Record<string, string>)[value] || value || "Sem origem"; }
