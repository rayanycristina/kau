"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  Factory,
  Layers3,
  ListFilter,
  PackageSearch,
  RefreshCw,
  Search,
  Truck,
  WalletCards,
  X
} from "lucide-react";
import type {
  ManualSaleCostKind,
  ManualSaleCostObligation,
  ManualSaleCostStatus
} from "@/data/manual-sale-cost-types";
import {
  PayManualSaleCostModal,
  ProductMessage,
  brl
} from "@/modules/finance/components/expense-workspace";
import { cn } from "@/lib/utils";

type View = "pending" | "paid" | "all";
type KindFilter = "all" | ManualSaleCostKind;

const inputClass = "w-full rounded-2xl border border-white/[.115] bg-[#060A11]/88 px-3.5 py-3 text-sm font-medium tracking-[-.012em] text-white/88 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition duration-[180ms] ease-out placeholder:text-white/38 hover:border-white/[.16] hover:bg-[#090F18]/92 focus:border-cyan/35 focus:bg-cyan/[.025] focus:shadow-[0_0_0_3px_rgba(24,215,255,.055),inset_0_1px_0_rgba(255,255,255,.05)] disabled:cursor-not-allowed disabled:opacity-45 [color-scheme:dark]";
const labelClass = "mb-2 block text-[10px] font-medium uppercase tracking-[.14em] text-white/52";

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const localToday = () => localDate(new Date());

const localTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const localMonthStart = () => {
  const now = new Date();
  return localDate(new Date(now.getFullYear(), now.getMonth(), 1));
};

async function readJson(response: Response) {
  const responseText = await response.text();
  try {
    return responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function formatSaleDate(value: string) {
  if (!value) return "Data não informada";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "Data não informada";
}

function formatPaymentMoment(value: string) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatSaleDate(value);
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(instant).replace(",", " às");
}

export function ExpeditionScreen() {
  const [view, setView] = useState<View>("pending");
  const [kind, setKind] = useState<KindFilter>("all");
  const [startDate, setStartDate] = useState(localMonthStart);
  const [endDate, setEndDate] = useState(localToday);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ManualSaleCostObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [paying, setPaying] = useState<ManualSaleCostObligation | null>(null);
  const [quickPayRows, setQuickPayRows] = useState<ManualSaleCostObligation[] | null>(null);
  const [details, setDetails] = useState<ManualSaleCostObligation[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = view === "all" ? "" : `?status=${view}`;
      const response = await fetch(`/api/manual-sale-costs${query}`, {
        cache: "no-store",
        credentials: "include"
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(String(payload.error || "Não foi possível carregar a Expedição."));
      }
      setItems(
        Array.isArray(payload.obligations)
          ? (payload.obligations as ManualSaleCostObligation[])
          : []
      );
      setSetupRequired(Boolean(payload.setupRequired));
    } catch (cause) {
      setItems([]);
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar a Expedição.");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => {
      const saleDate = item.sale.saleDate.slice(0, 10);
      const inPeriod = (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate);
      const matchesKind = kind === "all" || item.costKind === kind;
      const matchesSearch =
        !term ||
        [item.sale.customerName, item.sale.productName, item.description, item.saleId].some((value) =>
          value.toLocaleLowerCase("pt-BR").includes(term)
        );
      return inPeriod && matchesKind && matchesSearch;
    });
  }, [endDate, items, kind, search, startDate]);

  const groups = useMemo(
    () =>
      Array.from(
        filtered
          .reduce((map, item) => {
            const rows = map.get(item.saleId) || [];
            rows.push(item);
            map.set(item.saleId, rows);
            return map;
          }, new Map<string, ManualSaleCostObligation[]>())
          .values()
      ),
    [filtered]
  );

  const pending = filtered.filter((item) => item.status === "pending");
  const productTotal = pending
    .filter((item) => item.costKind === "product")
    .reduce((sum, item) => sum + item.amount, 0);
  const shippingTotal = pending
    .filter((item) => item.costKind === "shipping")
    .reduce((sum, item) => sum + item.amount, 0);
  const total = pending.reduce((sum, item) => sum + item.amount, 0);

  async function confirmPayment(values: { confirmedAmount: number; paidAt: string; paidDate: string }) {
    if (!paying) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/manual-sale-costs/${paying.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values)
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(String(payload.error || "Não foi possível registrar o pagamento."));
      }
      setPaying(null);
      const timePersisted = payload.paymentTimePersisted !== false;
      setSuccess(timePersisted
        ? "Pagamento confirmado. Data e hora foram preservadas."
        : "Pagamento confirmado com a data informada. A hora não foi persistida porque a migration 038 ainda não está aplicada.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar o pagamento.");
    } finally {
      setSaving(false);
    }
  }

  function openQuickPayment(rows: ManualSaleCostObligation[]) {
    const pendingRows = rows.filter((item) => item.status === "pending" && !item.sale.deletedAt);
    setError(null);
    if (pendingRows.length === 1) {
      setPaying(pendingRows[0]);
      return;
    }
    if (pendingRows.length > 1) setQuickPayRows(pendingRows);
  }

  return (
    <div className="kau-billion-sales expedition-command space-y-4 pb-0">
      <header className="luxury-surface kau-surgical-surface relative overflow-hidden rounded-[30px] px-5 py-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,.15),transparent_34%),radial-gradient(circle_at_88%_4%,rgba(124,58,237,.14),transparent_30%),linear-gradient(120deg,rgba(255,255,255,.045),transparent_56%)]" />
        <div className="relative max-w-3xl py-1">
          <h1 className="text-4xl font-semibold tracking-[-.055em] text-white md:text-5xl">Expedição</h1>
          <p className="mt-2 text-[14px] font-normal leading-6 text-white/68">Acompanhe e confirme os custos de produto e frete antes da integração financeira.</p>
        </div>
      </header>

      <section aria-label="Filtros da Expedição" className="luxury-surface kau-surgical-surface relative z-10 rounded-[28px] p-4">
        <div className="grid items-end gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(280px,.9fr)_minmax(220px,1fr)_minmax(270px,auto)_auto]">
          <div className="min-w-0">
            <span className={cn(labelClass, "inline-flex items-center gap-1.5")}><CalendarDays size={12} className="text-cyan" aria-hidden />Período da venda</span>
            <div className="grid grid-cols-2 gap-2"><DateField label="De" value={startDate} onChange={setStartDate} /><DateField label="Até" value={endDate} onChange={setEndDate} /></div>
          </div>
          <label className="block min-w-0">
            <span className={labelClass}>Busca</span>
            <span className="relative block"><Search size={14} className="pointer-events-none absolute left-3.5 top-4 text-white/42" aria-hidden /><input value={search} onChange={(event) => setSearch(event.target.value)} className={cn(inputClass, "min-h-[48px] pl-10")} placeholder="Cliente, pedido ou produto" /></span>
          </label>
          <div className="min-w-0">
            <span className={labelClass}>Status</span>
            <div role="tablist" aria-label="Status dos custos" className="grid min-h-[48px] grid-cols-3 rounded-2xl border border-white/[.07] bg-black/10 p-1">
              <StatusTab active={view === "pending"} onClick={() => setView("pending")} label="Aguardando" />
              <StatusTab active={view === "paid"} onClick={() => setView("paid")} label="Concluídos" />
              <StatusTab active={view === "all"} onClick={() => setView("all")} label="Todos" />
            </div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-money/35 bg-money px-5 text-sm font-semibold tracking-[-.01em] text-[#02130b] shadow-[0_0_44px_rgba(16,185,129,.20)] transition duration-[180ms] ease-out hover:-translate-y-0.5 hover:bg-[#22e59b] disabled:opacity-45"><RefreshCw size={16} className={cn(loading && "animate-spin")} aria-hidden />Atualizar</button>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-white/[.07] pt-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-white/52"><ListFilter size={12} className="text-cyan" aria-hidden />Tipo de custo</span>
            <FilterChip active={kind === "all"} onClick={() => setKind("all")}>Todos</FilterChip>
            <FilterChip active={kind === "product"} onClick={() => setKind("product")}><Factory size={12} aria-hidden />Fornecedor / Fábrica</FilterChip>
            <FilterChip active={kind === "shipping"} onClick={() => setKind("shipping")}><Truck size={12} aria-hidden />Logística / Frete</FilterChip>
          </div>
          <span className="shrink-0 text-[10px] font-medium text-white/38">Período baseado na data da venda</span>
        </div>
      </section>

      <section aria-label="Resumo operacional" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Aguardando confirmação" value={loading ? "—" : String(pending.length)} caption="itens que exigem revisão" icon={<WalletCards size={17} />} tone="danger" />
        <Kpi label="Fornecedor / Fábrica" value={loading ? "—" : brl(productTotal)} caption="custos de produto pendentes" icon={<Layers3 size={17} />} tone="violet" />
        <Kpi label="Logística / Frete" value={loading ? "—" : brl(shippingTotal)} caption="custos logísticos pendentes" icon={<Truck size={17} />} tone="cyan" />
        <Kpi label="Total da Expedição" value={loading ? "—" : brl(total)} caption="valor aguardando confirmação" icon={<CircleDollarSign size={17} />} tone="money" featured />
      </section>

      <div className="space-y-3">
        {setupRequired ? <ProductMessage tone="error" message="A migration 034 precisa ser aplicada para ativar a Expedição." /> : null}
        {error ? <ProductMessage tone="error" message={error} /> : null}
        {success ? <ProductMessage tone="success" message={success} /> : null}
      </div>

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <section className="luxury-surface kau-surgical-surface min-w-0 overflow-hidden rounded-[28px] self-start">
        <div className="flex flex-col gap-3 border-b border-white/[.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-start gap-3"><span className="mt-1 rounded-xl border border-white/10 bg-white/[.045] p-2 text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"><Layers3 size={18} aria-hidden /></span><div><h2 className="text-[20px] font-semibold tracking-[-.035em] text-white">Fila de expedição</h2><p className="mt-1 text-[13px] leading-5 text-white/62">Revise produto, frete e custos concluídos por venda.</p></div></div>
          </div>
          <span className="w-fit rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/65">{loading ? "Carregando…" : `${groups.length} ${groups.length === 1 ? "venda" : "vendas"}`}</span>
        </div>
        <div className="mx-4 mt-4 hidden grid-cols-[minmax(190px,1.25fr)_92px_120px_120px_92px_110px_120px] gap-3 rounded-t-[24px] border border-b-0 border-white/[.075] bg-[#08131e] px-4 py-3.5 text-[9px] font-semibold uppercase tracking-[.12em] text-white/42 xl:grid">
          <span>Cliente / pedido</span><span>Data</span><span>Produto / fábrica</span><span>Frete / logística</span><span>Total</span><span>Status</span><span className="text-right">Ação</span>
        </div>
        <div className="m-4 overflow-hidden rounded-[24px] border border-white/[.075] bg-[#07111b]/72 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_14px_46px_rgba(0,0,0,.22)] xl:mt-0 xl:rounded-t-none xl:border-t-0">{loading ? <LoadingRows /> : groups.length ? <div className="divide-y divide-white/[.055]">{groups.map((rows) => <ExpeditionRow key={rows[0].saleId} rows={rows} onView={setDetails} onPay={openQuickPayment} />)}</div> : <EmptyState view={view} />}</div>
      </section>

      <OperationalReading pending={pending} productTotal={productTotal} shippingTotal={shippingTotal} total={total} loading={loading} />
      </div>

      {paying ? <PayManualSaleCostModal key={paying.id} obligation={paying} isSaving={saving} error={error} initialDate={localToday()} initialTime={localTime()} onClose={() => { if (!saving) setPaying(null); }} onConfirm={confirmPayment} /> : null}
      {quickPayRows ? <QuickPaymentSelector rows={quickPayRows} onClose={() => setQuickPayRows(null)} onSelect={(item) => { setQuickPayRows(null); setPaying(item); }} /> : null}
      {details ? <ExpeditionDetailsDrawer rows={details} onClose={() => setDetails(null)} onPay={(item) => { setDetails(null); setPaying(item); }} /> : null}
    </div>
  );
}

function OperationalReading({ pending, productTotal, shippingTotal, total, loading }: { pending: ManualSaleCostObligation[]; productTotal: number; shippingTotal: number; total: number; loading: boolean }) {
  return <aside className="luxury-surface kau-surgical-surface self-start rounded-[28px] p-4 2xl:sticky 2xl:top-4"><PanelHeader icon={<ListFilter size={18} />} title="Leitura operacional" description="Prioridades e composição da expedição atual." /><div className="mt-4"><InsightLabel>Prioridade atual</InsightLabel><p className="mt-2 text-[14px] font-semibold leading-5 text-white/82">{loading ? "Carregando custos…" : pending.length ? `${pending.length} ${pending.length === 1 ? "custo aguarda" : "custos aguardam"} confirmação.` : "Não existem custos aguardando confirmação."}</p></div><div className="mt-4 border-t border-white/[.08] pt-4"><InsightLabel>Composição</InsightLabel><div className="mt-3 space-y-3"><InsightLine label="Fornecedor / Fábrica" value={loading ? "—" : brl(productTotal)} tone="violet" /><InsightLine label="Logística / Frete" value={loading ? "—" : brl(shippingTotal)} tone="cyan" /><InsightLine label="Total" value={loading ? "—" : brl(total)} tone="money" strong /></div></div><div className="mt-4 border-t border-white/[.08] pt-4"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.13em] text-cyan"><CircleDollarSign size={13} aria-hidden />Próxima ação</div><p className="mt-2 text-xs leading-5 text-white/58">Revise os custos pendentes antes de registrá-los como despesas.</p></div></aside>;
}

function PanelHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="relative z-10 flex items-start gap-3 border-b border-white/[.07] pb-4"><div className="mt-1 rounded-xl border border-white/10 bg-white/[.045] p-2 text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">{icon}</div><div><h2 className="text-[20px] font-semibold tracking-[-.035em] text-white">{title}</h2><p className="mt-1 text-[13px] leading-5 text-white/62">{description}</p></div></div>;
}

function InsightLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-white/42">{children}</p>;
}

function InsightLine({ label, value, tone, strong }: { label: string; value: string; tone: "violet" | "cyan" | "money"; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className={cn("h-1.5 w-1.5 rounded-full", tone === "violet" ? "bg-violet-300" : tone === "cyan" ? "bg-cyan" : "bg-money")} /><span className="truncate text-xs text-white/60">{label}</span></div><strong className={cn("shrink-0 tabular-nums", strong ? "text-base text-white" : "text-sm text-white/82")}>{value}</strong></div>;
}

function QuickPaymentSelector({ rows, onClose, onSelect }: { rows: ManualSaleCostObligation[]; onClose: () => void; onSelect: (item: ManualSaleCostObligation) => void }) {
  const first = rows[0];
  return <div className="fixed inset-0 z-[75] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Fechar pagamento rápido" /><section role="dialog" aria-modal="true" aria-labelledby="quick-payment-title" className="luxury-surface kau-surgical-surface relative w-full max-w-lg rounded-[26px] p-5 shadow-[0_28px_90px_rgba(0,0,0,.6)]"><header className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-money">Pagamento rápido</p><h2 id="quick-payment-title" className="mt-1 text-xl font-semibold tracking-[-.03em] text-white">Registrar pagamento</h2><p className="mt-1 text-xs leading-5 text-white/52">Selecione o custo que foi pago e confirme os dados.</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.08] text-white/42 transition hover:bg-white/[.04] hover:text-white" aria-label="Fechar"><X size={16} aria-hidden /></button></header><div className="mt-5 grid grid-cols-3 gap-2"><QuickMeta label="Cliente" value={first.sale.customerName} /><QuickMeta label="Pedido" value={`#${first.saleId.slice(0, 8).toUpperCase()}`} /><QuickMeta label="Produto" value={first.sale.productName} /></div><div className="mt-5 space-y-2.5">{rows.map((item) => { const product = item.costKind === "product"; return <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-white/[.075] bg-[#07111b]/72 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl border", product ? "border-violet-300/16 bg-violet-300/[.07] text-violet-200" : "border-cyan/16 bg-cyan/[.07] text-cyan")}>{product ? <Factory size={15} aria-hidden /> : <Truck size={15} aria-hidden />}</span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-white">{product ? "Produto / Fábrica" : "Frete / Logística"}</h3><div className="mt-1 flex items-center gap-2"><strong className="text-base font-semibold tabular-nums text-white">{brl(item.amount)}</strong><span className="rounded-lg border border-danger/20 bg-danger/[.07] px-2 py-0.5 text-[9px] font-semibold text-danger">Aguardando</span></div></div></div><button type="button" onClick={() => onSelect(item)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-money px-3.5 text-xs font-semibold text-[#02130b] transition hover:bg-[#22e59b] focus:outline-none focus:ring-2 focus:ring-money/25"><CircleDollarSign size={13} aria-hidden />Registrar pagamento</button></article>; })}</div></section></div>;
}

function QuickMeta({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-white/[.06] bg-white/[.018] p-3"><p className="text-[9px] font-semibold uppercase tracking-[.1em] text-white/38">{label}</p><p className="mt-1.5 truncate text-xs font-semibold text-white/82">{value}</p></div>;
}

function ExpeditionDetailsDrawer({ rows, onClose, onPay }: { rows: ManualSaleCostObligation[]; onClose: () => void; onPay: (item: ManualSaleCostObligation) => void }) {
  const first = rows[0];
  const total = rows.reduce((sum, item) => sum + item.amount, 0);
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"><button type="button" onClick={onClose} className="absolute inset-0 cursor-default" aria-label="Fechar detalhes da expedição" /><aside role="dialog" aria-modal="true" aria-labelledby="expedition-drawer-title" className="relative flex h-full w-full max-w-lg flex-col border-l border-white/[.09] bg-[#070d15] shadow-[-35px_0_100px_rgba(0,0,0,.58)]"><header className="border-b border-white/[.07] px-5 py-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-money">Expedição</p><h2 id="expedition-drawer-title" className="mt-1.5 text-xl font-semibold tracking-[-.03em] text-white">Detalhes da expedição</h2><p className="mt-1 text-xs leading-5 text-white/50">{first.sale.customerName} · #{first.saleId.slice(0, 8).toUpperCase()}</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.08] text-white/42 transition hover:bg-white/[.04] hover:text-white" aria-label="Fechar"><X size={16} aria-hidden /></button></div></header><div className="min-h-0 flex-1 overflow-y-auto p-5 premium-scrollbar"><div className="grid grid-cols-2 gap-2"><DrawerDetail label="Cliente" value={first.sale.customerName} /><DrawerDetail label="Pedido" value={`#${first.saleId.slice(0, 8).toUpperCase()}`} /><DrawerDetail label="Produto" value={first.sale.productName} /><DrawerDetail label="Data da venda" value={formatSaleDate(first.sale.saleDate)} /><DrawerDetail label="Total da expedição" value={brl(total)} featured /></div><div className="mt-6"><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-white/42">Itens da expedição</p><div className="mt-3 space-y-3">{rows.map((item) => <DrawerCost key={item.id} item={item} onPay={onPay} />)}</div></div></div></aside></div>;
}

function DrawerDetail({ label, value, featured }: { label: string; value: string; featured?: boolean }) {
  return <div className={cn("rounded-xl border border-white/[.06] bg-white/[.018] p-3", featured && "border-money/15 bg-money/[.035]")}><p className="text-[9px] uppercase tracking-[.1em] text-white/38">{label}</p><p className={cn("mt-1.5 truncate text-xs font-semibold", featured ? "text-money" : "text-white/82")}>{value}</p></div>;
}

function DrawerCost({ item, onPay }: { item: ManualSaleCostObligation; onPay: (item: ManualSaleCostObligation) => void }) {
  const product = item.costKind === "product";
  const paidMoment = item.paidAt ? formatPaymentMoment(item.paidAt) : null;
  const status = item.status === "paid" ? <span className="text-money">{paidMoment ? `Pago em ${paidMoment}` : "Pago"}</span> : item.status === "cancelled" ? <span className="text-white/42">Cancelado</span> : <span className="text-danger">Aguardando confirmação</span>;
  return <section className="rounded-2xl border border-white/[.07] bg-white/[.018] p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border", product ? "border-violet-300/16 bg-violet-300/[.07] text-violet-200" : "border-cyan/16 bg-cyan/[.07] text-cyan")}>{product ? <Factory size={14} aria-hidden /> : <Truck size={14} aria-hidden />}</span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-white">{product ? "Produto / Fábrica" : "Frete / Logística"}</h3><p className="mt-1 truncate text-[10px] text-white/42">{item.description}</p></div></div><strong className="shrink-0 text-lg font-semibold tabular-nums text-white">{brl(item.amount)}</strong></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[.06] pt-3"><span className="text-xs font-semibold">{status}</span>{item.status === "pending" && !item.sale.deletedAt ? <button type="button" onClick={() => onPay(item)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-money px-3.5 text-xs font-semibold text-[#02130b] transition hover:bg-[#22e59b]"><CircleDollarSign size={13} aria-hidden />Confirmar pagamento</button> : null}</div></section>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="relative block min-w-0"><span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[.1em] text-white/42">{label}</span><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, "min-h-[48px] pl-9 pr-2 text-[11px]")} /></label>;
}

function StatusTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn("inline-flex h-10 items-center justify-center rounded-xl px-3.5 text-[11px] font-medium uppercase tracking-[.08em] transition duration-[180ms] ease-out focus:outline-none focus:ring-2 focus:ring-cyan/20", active ? "bg-white/[.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" : "text-white/52 hover:bg-white/[.035] hover:text-white")}>{label}</button>;
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-medium transition duration-[180ms] ease-out focus:outline-none focus:ring-2 focus:ring-cyan/20", active ? "border-white/[.08] bg-white/[.07] text-white" : "border-transparent text-white/52 hover:bg-white/[.035] hover:text-white")}>{children}</button>;
}

function Kpi({ label, value, caption, icon, tone, featured }: { label: string; value: string; caption: string; icon: ReactNode; tone: "danger" | "violet" | "cyan" | "money"; featured?: boolean }) {
  const tones = { danger: "border-danger/20 bg-danger/[.07] text-danger", violet: "border-violet-300/18 bg-violet-300/[.07] text-violet-200", cyan: "border-cyan/18 bg-cyan/[.07] text-cyan", money: "border-money/20 bg-money/[.08] text-money" };
  return <article className={cn("executive-card kau-surgical-card group relative min-h-[196px] overflow-hidden rounded-[26px] border border-white/10 p-4 transition duration-[180ms] ease-out hover:-translate-y-0.5", featured && "border-money/24")}><div className="pointer-events-none absolute inset-0 opacity-65 [background:radial-gradient(circle_at_84%_16%,rgba(255,255,255,.10),transparent_20%),linear-gradient(135deg,rgba(255,255,255,.052),transparent_54%)]" /><div className="relative flex items-start justify-between gap-3"><div><p className="text-[14px] font-semibold tracking-[-.018em] text-white">{label}</p><p className="mt-1 text-[11px] font-medium text-white/60">{caption}</p></div><span className={cn("rounded-2xl border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.045)]", tones[tone])}>{icon}</span></div><p className="relative mt-5 truncate text-3xl font-semibold tabular-nums tracking-[-.055em] text-white">{value}</p></article>;
}

function ExpeditionRow({ rows, onView, onPay }: { rows: ManualSaleCostObligation[]; onView: (rows: ManualSaleCostObligation[]) => void; onPay: (rows: ManualSaleCostObligation[]) => void }) {
  const first = rows[0];
  const product = rows.find((item) => item.costKind === "product");
  const shipping = rows.find((item) => item.costKind === "shipping");
  const total = rows.reduce((sum, item) => sum + item.amount, 0);
  const pendingCount = rows.filter((item) => item.status === "pending").length;
  const paidCount = rows.filter((item) => item.status === "paid").length;
  const cancelledCount = rows.filter((item) => item.status === "cancelled").length;
  const status: ManualSaleCostStatus = pendingCount ? "pending" : paidCount ? "paid" : "cancelled";

  return <article role="button" tabIndex={0} onClick={() => onView(rows)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onView(rows); } }} className="group grid cursor-pointer gap-3 px-4 py-4 transition duration-200 hover:bg-white/[.022] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan/20 xl:grid-cols-[minmax(190px,1.25fr)_92px_120px_120px_92px_110px_120px] xl:items-center xl:gap-3 xl:px-4">
    <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan/15 bg-cyan/[.045] text-cyan/75"><PackageSearch size={15} aria-hidden /></span><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-white/92">{first.sale.customerName}</p><p className="mt-1 truncate font-mono text-[10px] tracking-[.05em] text-white/34">{first.sale.productName} · #{first.saleId.slice(0, 8).toUpperCase()}</p></div></div>
    <p className="hidden text-[11px] font-medium text-white/62 xl:block">{formatSaleDate(first.sale.saleDate)}</p>
    <RowCost item={product} />
    <RowCost item={shipping} />
    <p className="flex items-center justify-between text-sm font-semibold tabular-nums text-white xl:block"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/42 xl:hidden">Total</span>{brl(total)}</p>
    <div className="flex items-center justify-between xl:block"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/42 xl:hidden">Status</span><StatusSummary status={status} pending={pendingCount} paid={paidCount} cancelled={cancelledCount} /></div>
    <div className="flex justify-end gap-1.5"><button type="button" aria-label="Visualizar detalhes da expedição" title="Ver detalhes" onClick={(event) => { event.stopPropagation(); onView(rows); }} className="grid h-8 w-8 place-items-center rounded-lg border border-cyan/15 bg-cyan/[.045] text-cyan/75 transition hover:border-cyan/30 hover:bg-cyan/10 hover:text-white"><Eye size={14} aria-hidden /></button>{pendingCount ? <button type="button" onClick={(event) => { event.stopPropagation(); onPay(rows); }} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-money px-3 text-[10px] font-semibold text-[#02130b] transition hover:bg-[#22e59b] focus:outline-none focus:ring-2 focus:ring-money/25"><CircleDollarSign size={12} aria-hidden />Pagar</button> : null}</div>
  </article>;
}

function RowCost({ item }: { item?: ManualSaleCostObligation }) {
  if (!item) return <span className="hidden text-[11px] text-white/34 xl:block">—</span>;
  return <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[.06] bg-white/[.018] px-2.5 py-2 xl:border-transparent xl:bg-transparent xl:px-0"><span className="truncate text-[10px] text-white/42 xl:hidden">{item.costKind === "product" ? "Produto / Fábrica" : "Frete / Logística"}</span><strong className="text-[12px] font-semibold tabular-nums text-white">{brl(item.amount)}</strong></div>;
}

function StatusSummary({ status, pending, paid, cancelled }: { status: ManualSaleCostStatus; pending: number; paid: number; cancelled: number }) {
  if (status === "paid") return <span className="inline-flex items-center gap-1.5 rounded-lg border border-money/15 bg-money/[.065] px-2 py-1 text-[10px] font-semibold text-money"><CheckCircle2 size={11} aria-hidden />Concluído</span>;
  if (status === "cancelled") return <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[.08] bg-white/[.035] px-2 py-1 text-[10px] font-semibold text-white/42">Cancelado{cancelled > 1 ? ` · ${cancelled}` : ""}</span>;
  return <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-lg border border-danger/25 bg-danger/10 px-2 py-1 text-[10px] font-semibold text-danger"><WalletCards size={11} aria-hidden />{pending} {pending === 1 ? "pendência" : "pendências"}{paid ? ` · ${paid} pago` : ""}</span>;
}

function LoadingRows() {
  return <div className="divide-y divide-white/[.05]" aria-label="Carregando fila de expedição">{[1, 2, 3, 4].map((row) => <div key={row} className="grid h-[68px] animate-pulse grid-cols-[1.5fr_.6fr_.6fr_.7fr] gap-5 px-6 py-3"><span className="rounded-xl bg-white/[.045]" /><span className="rounded-xl bg-white/[.03]" /><span className="rounded-xl bg-white/[.03]" /><span className="rounded-xl bg-white/[.03]" /></div>)}</div>;
}

function EmptyState({ view }: { view: View }) {
  return <div className="px-5 py-16 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-money/16 bg-money/[.065] text-money"><Check size={20} aria-hidden /></span><h3 className="mt-4 text-sm font-semibold text-white">{view === "pending" ? "Nenhuma pendência no período" : view === "paid" ? "Nenhum custo concluído no período" : "Nenhum registro encontrado"}</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-white/42">Ajuste o período ou os filtros para consultar outros custos da Expedição.</p></div>;
}
