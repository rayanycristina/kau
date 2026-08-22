"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  Info,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import type { DatePeriod, RealNetMarginResponse } from "@/data/real-net-margin";
import { getMarginVisualState } from "@/data/real-net-margin-visual";
import { cn } from "@/lib/utils";
import { LiquidMarginTank } from "./liquid-margin-tank";
import styles from "./real-net-margin.module.css";

export type NetMarginPayload = RealNetMarginResponse & {
  generatedAt: string;
  targetMargin: number | null;
};

type ExperienceStyle = CSSProperties & {
  "--margin-liquid-glow": string;
  "--margin-accent": string;
};

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function defaultPeriod(): DatePeriod {
  const end = localDateKey();
  return { start: `${end.slice(0, 7)}-01`, end };
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function percent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1).replace(".", ",")}%`;
}

function points(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")} p.p.`;
}

function dateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

function responseError(payload: unknown) {
  if (payload && typeof payload === "object" && "error" in payload) return String(payload.error);
  return "Não foi possível atualizar a Margem Líquida Real.";
}

export function RealNetMargin() {
  const initialPeriod = useMemo(defaultPeriod, []);
  const [draft, setDraft] = useState<DatePeriod>(initialPeriod);
  const [period, setPeriod] = useState<DatePeriod>(initialPeriod);
  const [data, setData] = useState<NetMarginPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ start: period.start, end: period.end });
      const response = await fetch(`/api/command-center/net-margin?${query}`, {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(responseError(payload));
      if (sequence === requestSequence.current) setData(payload as NetMarginPayload);
    } catch (caught) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      setData(null);
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar a Margem Líquida Real.");
    } finally {
      if (!controller.signal.aborted && sequence === requestSequence.current) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  }, [period]);

  useEffect(() => {
    load();
    return () => activeRequest.current?.abort();
  }, [load]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("kau:financial-data-changed", refreshWhenVisible);
    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("kau:financial-data-changed", refreshWhenVisible);
    };
  }, [load]);

  if (loading && !data) return <MarginLoading period={period} />;
  if (error || !data) return <MarginError message={error || "Dados indisponíveis."} onRetry={() => load()} />;

  return (
    <RealNetMarginView
      data={data}
      draft={draft}
      loading={loading}
      onDraftChange={setDraft}
      onApply={() => {
        if (draft.start && draft.end && draft.start <= draft.end) setPeriod(draft);
      }}
      onRefresh={() => load()}
    />
  );
}

export function RealNetMarginView({
  data,
  draft,
  loading,
  onDraftChange,
  onApply,
  onRefresh
}: {
  data: NetMarginPayload;
  draft: DatePeriod;
  loading: boolean;
  onDraftChange: (period: DatePeriod) => void;
  onApply: () => void;
  onRefresh: () => void;
}) {

  const visual = getMarginVisualState(data.current.marginPercent);
  const negative = data.current.marginPercent !== null && data.current.marginPercent < 0;
  const noRevenue = data.current.marginPercent === null;
  const delta = data.comparison.marginDeltaPoints;
  const deltaPositive = delta !== null && delta > 0;
  const criticalIssues = data.current.quality.paidWithoutPaymentDate
    + data.current.quality.paidWithoutOperationAmount
    + data.current.quality.expensesWithoutDate
    + data.current.quality.expensesWithoutAmount
    + data.current.quality.invalidTaxItems
    + data.current.quality.potentialDuplicateExpenses;
  const experienceStyle: ExperienceStyle = {
    "--margin-liquid-glow": visual.glow,
    "--margin-accent": visual.accent
  };

  return (
    <section className={styles.experience} style={experienceStyle} aria-labelledby="real-net-margin-title" aria-busy={loading}>
      <p className="sr-only" role="status" aria-live="polite">
        {loading ? "Atualizando Margem Líquida Real." : `Margem Líquida Real atual: ${percent(data.current.marginPercent)}.`}
      </p>
      <div className="flex flex-col gap-4 border-b border-white/[.065] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: visual.accent }}>Command Center financeiro</p>
            <button type="button" title="Calculada somente sobre valores efetivamente pagos e despesas reais do período." aria-label="Como a Margem Líquida Real é calculada" className="grid h-6 w-6 place-items-center rounded-lg text-white/35 outline-none transition hover:bg-white/[.05] hover:text-white/65 focus-visible:ring-2 focus-visible:ring-money/30">
              <Info size={13} aria-hidden />
            </button>
          </div>
          <h2 id="real-net-margin-title" className="mt-1 text-xl font-black tracking-[-.035em] text-white">Margem Líquida Real</h2>
        </div>
        <PeriodControls
          draft={draft}
          disabled={loading}
          loading={loading}
          onChange={onDraftChange}
          onApply={onApply}
          onRefresh={onRefresh}
        />
      </div>

      <div className={styles.heroGrid}>
        <div className={styles.contentColumn}>
          <p className="max-w-xl text-sm leading-6 text-white/52">
            Quanto da receita efetivamente recebida permaneceu após todas as despesas reais.
          </p>

          <div className="mt-6">
            <p className={cn("whitespace-nowrap text-[clamp(3.7rem,7.4vw,6.8rem)] font-black leading-[.86] tracking-[-.075em] tabular-nums", negative ? "text-rose-400" : noRevenue ? "text-white/35" : undefined)}
              style={!negative && !noRevenue ? { color: visual.accent, textShadow: `0 0 18px ${visual.glow}` } : undefined}
            >
              {percent(data.current.marginPercent)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {delta !== null ? (
                <span className={cn("inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-black tabular-nums", deltaPositive ? "border-money/25 bg-money/10 text-money" : delta < 0 ? "border-rose-400/25 bg-rose-400/10 text-rose-300" : "border-white/10 bg-white/[.04] text-white/58")}>
                  {deltaPositive ? <TrendingUp size={14} /> : delta < 0 ? <TrendingDown size={14} /> : null}
                  {points(delta)}
                </span>
              ) : null}
              <span className="text-xs text-white/42">
                vs. período anterior {data.previous.marginPercent === null ? "sem margem calculável" : `(${percent(data.previous.marginPercent)})`}
              </span>
            </div>
          </div>

          <div className="mt-7">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/38">Lucro líquido realizado</p>
            <p className={cn("mt-2 text-[clamp(1.8rem,3.8vw,3.15rem)] font-black tracking-[-.055em] tabular-nums", data.current.realizedNetProfit < 0 ? "text-rose-400" : "text-white")}>
              {money(data.current.realizedNetProfit)}
            </p>
            <p className={cn("mt-2 text-xs font-semibold", negative ? "text-rose-300/80" : noRevenue ? "text-amber/80" : "text-white/42")}>
              {negative
                ? "Prejuízo realizado no período."
                : noRevenue
                  ? "Sem receita realizada suficiente para calcular a margem."
                  : `${data.current.paidSalesCount} pagamentos com valor líquido exato no período.`}
            </p>
          </div>

          <div className="mt-auto grid gap-3 pt-7 sm:grid-cols-2">
            <MetricSummary
              icon={<CircleDollarSign size={17} />}
              label="Receita líquida realizada"
              value={money(data.current.realizedRevenue)}
              tone="revenue"
            />
            <MetricSummary
              icon={<ReceiptText size={17} />}
              label="Despesas reais deduzidas"
              value={money(data.current.realExpenses)}
              tone="expense"
            />
          </div>
        </div>

        <div className={styles.tankColumn}>
          <LiquidMarginTank marginPercent={data.current.marginPercent} targetMargin={data.targetMargin} />
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t border-white/[.06] bg-black/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-start gap-2.5 text-xs leading-5 text-white/48">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: visual.accent }} />
          <p>Receita considerada apenas quando <code className="text-white/70">payment_status = paid</code> e existe data real de pagamento. Entrega não realiza receita.</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className={cn("text-[10px] font-bold uppercase tracking-[.12em]", criticalIssues ? "text-amber" : "text-money")}>{criticalIssues ? `${criticalIssues} pendências na base` : "Base sem pendências críticas"}</p>
          <p className="mt-1 text-[10px] text-white/34">Datas legadas não possuem marcador de origem.</p>
          <p className="mt-1 text-[10px] text-white/30">Atualizado {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(data.generatedAt))}</p>
        </div>
      </footer>
    </section>
  );
}

function PeriodControls({ draft, disabled, loading, onChange, onApply, onRefresh }: { draft: DatePeriod; disabled: boolean; loading: boolean; onChange: (period: DatePeriod) => void; onApply: () => void; onRefresh: () => void }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
        <span className="hidden text-white/32 sm:block"><CalendarDays size={15} /></span>
        <label className="sr-only" htmlFor="margin-start">Início do período</label>
        <input id="margin-start" type="date" value={draft.start} max={draft.end} onChange={(event) => onChange({ ...draft, start: event.target.value })} className="h-9 min-w-0 w-full rounded-xl border border-white/[.08] bg-white/[.035] px-2 text-[10px] font-semibold text-white/70 outline-none transition focus:border-money/35 sm:w-auto sm:px-2.5 sm:text-[11px]" />
        <span className="text-[10px] text-white/28">até</span>
        <label className="sr-only" htmlFor="margin-end">Fim do período</label>
        <input id="margin-end" type="date" value={draft.end} min={draft.start} onChange={(event) => onChange({ ...draft, end: event.target.value })} className="h-9 min-w-0 w-full rounded-xl border border-white/[.08] bg-white/[.035] px-2 text-[10px] font-semibold text-white/70 outline-none transition focus:border-money/35 sm:w-auto sm:px-2.5 sm:text-[11px]" />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={disabled || !draft.start || !draft.end || draft.start > draft.end} onClick={onApply} className="h-9 flex-1 rounded-xl border border-money/20 bg-money/10 px-3 text-[10px] font-black uppercase tracking-[.1em] text-money outline-none transition hover:bg-money/15 focus-visible:ring-2 focus-visible:ring-money/25 disabled:opacity-40 sm:flex-none">Aplicar</button>
        <button type="button" disabled={disabled} onClick={onRefresh} aria-label={loading ? "Atualizando Margem Líquida Real" : "Atualizar Margem Líquida Real"} title={loading ? "Atualizando" : "Atualizar"} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.08] bg-white/[.035] text-white/48 outline-none transition hover:text-white focus-visible:border-money/40 focus-visible:ring-2 focus-visible:ring-money/20 disabled:opacity-40"><RefreshCw size={14} className={cn(loading && "animate-spin motion-reduce:animate-none")} /></button>
      </div>
    </div>
  );
}

function MetricSummary({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "revenue" | "expense" }) {
  return (
    <div className={cn(styles.summaryCard, "flex items-center gap-3 p-3.5")}>
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border", tone === "revenue" ? "border-cyan/20 bg-cyan/10 text-cyan" : "border-rose-400/20 bg-rose-400/10 text-rose-300")}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[.11em] text-white/38">{label}</p>
        <p className="mt-1 truncate text-base font-black tabular-nums text-white">{value}</p>
      </div>
    </div>
  );
}

function MarginLoading({ period }: { period: DatePeriod }) {
  return (
    <section className={cn(styles.experience, "min-h-[610px] p-6")} aria-busy="true" aria-label="Carregando Margem Líquida Real">
      <div className="flex items-center justify-between gap-4">
        <div><div className={cn(styles.skeleton, "h-3 w-36 rounded")} /><div className={cn(styles.skeleton, "mt-3 h-7 w-56 rounded-lg")} /></div>
        <p className="text-xs text-white/32">{dateLabel(period.start)} — {dateLabel(period.end)}</p>
      </div>
      <div className={styles.heroGrid}>
        <div className={styles.contentColumn}><div className={cn(styles.skeleton, "h-5 w-4/5 rounded")} /><div className={cn(styles.skeleton, "mt-8 h-24 w-72 max-w-full rounded-2xl")} /><div className={cn(styles.skeleton, "mt-8 h-16 w-64 rounded-xl")} /><div className="mt-auto grid gap-3 pt-10 sm:grid-cols-2"><div className={cn(styles.skeleton, "h-20 rounded-2xl")} /><div className={cn(styles.skeleton, "h-20 rounded-2xl")} /></div></div>
        <div className={styles.tankColumn}><div className={cn(styles.skeleton, "mx-auto h-[360px] w-[250px] max-w-full rounded-[45%]")} /></div>
      </div>
    </section>
  );
}

function MarginError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className={cn(styles.experience, "grid min-h-[360px] place-items-center p-6 text-center")} role="alert">
      <div className="max-w-md">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-rose-400/20 bg-rose-400/10 text-rose-300"><TrendingDown size={20} /></span>
        <h2 className="mt-4 text-lg font-black text-white">Margem Líquida Real indisponível</h2>
        <p className="mt-2 text-sm leading-6 text-white/52">{message}</p>
        <button type="button" onClick={onRetry} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-4 text-xs font-black text-white/70 transition hover:text-white"><RefreshCw size={14} /> Tentar novamente</button>
      </div>
    </section>
  );
}
