"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatabaseZap, Settings2, ShieldCheck } from "lucide-react";
import type { CapitalCycleRow } from "@/data/capital-cycle";
import { CapitalCommandBar } from "./capital-cycle/capital-cycle-toolbar";
import { CapitalLeadStatement } from "./capital-cycle/capital-cycle-hero";
import { MoneyMotionFlow } from "./capital-cycle/capital-cycle-analysis";
import { VelocityExplorer } from "./capital-cycle/capital-cycle-ranking";
import { ReceivablesLedger } from "./capital-cycle/open-capital-table";
import { DataTrustDock } from "./capital-cycle/capital-cycle-quality";
import { QualityReviewDrawer, SaleTimelineDrawer, SettingsDrawer } from "./capital-cycle/capital-cycle-overlays";
import { EmptyState, InlineNotice, Skeleton } from "./capital-cycle/capital-cycle-ui";
import type { CapitalCycleFilters, CapitalCycleResponse, TableAgeFilter, TableStageFilter } from "./capital-cycle/types";
import { dateLabel, emptyCapitalData, initialCapitalFilters, percent } from "./capital-cycle/types";

export function WorkingCapitalScreen() {
  const [filters, setFilters] = useState<CapitalCycleFilters>(initialCapitalFilters);
  const [appliedFilters, setAppliedFilters] = useState<CapitalCycleFilters>(initialCapitalFilters);
  const [data, setData] = useState<CapitalCycleResponse>(emptyCapitalData());
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<CapitalCycleRow | null>(null);
  const [ledgerStage, setLedgerStage] = useState<TableStageFilter>("all");
  const [ledgerAge, setLedgerAge] = useState<TableAgeFilter>("all");
  const ledgerRef = useRef<HTMLElement | null>(null);
  const qualityRef = useRef<HTMLElement | null>(null);
  const hasLoadedRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    const requestId = ++requestSequenceRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/finance/capital-cycle?${new URLSearchParams(filters)}`, {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o ciclo do capital.");
      if (requestId !== requestSequenceRef.current) return;
      setData(payload);
      setAppliedFilters({ ...filters });
      hasLoadedRef.current = true;
      setHasLoadedOnce(true);
    } catch (loadError) {
      if (controller.signal.aborted || requestId !== requestSequenceRef.current) return;
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o ciclo do capital.");
    } finally {
      if (requestId === requestSequenceRef.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
    return () => abortControllerRef.current?.abort();
  }, [load]);

  const reviewSaleIds = useMemo(() => new Set(data.dataQuality.issues.map((issue) => issue.saleId)), [data.dataQuality.issues]);
  const hasSales = data.dataQuality.eligibleRecords > 0;
  const showExperience = loading || hasLoadedOnce;

  const changeFilter = useCallback((key: keyof CapitalCycleFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const focusLedger = useCallback((stage: TableStageFilter, age: TableAgeFilter) => {
    setLedgerStage(stage);
    setLedgerAge(age);
    window.requestAnimationFrame(() => ledgerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const focusQuality = useCallback(() => {
    qualityRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (data.dataQuality.reviewCount) setQualityOpen(true);
  }, [data.dataQuality.reviewCount]);

  return (
    <div className="relative isolate mx-auto max-w-[1540px] pb-12 pt-1">
      <CapitalPageBackdrop />
      <PageStatusDock data={data} filters={appliedFilters} loading={loading} onSettings={() => setSettingsOpen(true)} onQuality={focusQuality} />

      <CapitalCommandBar filters={filters} options={data.filters} loading={loading} onChange={changeFilter} onRefresh={() => { void load(); }} />

      {error ? <div className="mt-4"><InlineNotice error text={hasLoadedRef.current ? `Não foi possível atualizar. Exibindo o último resultado carregado. ${error}` : error} onRetry={() => { void load(); }} /></div> : null}

      {showExperience ? (
        <>
          <CapitalLeadStatement data={data} filters={appliedFilters} loading={loading} onStageFilter={(stage) => focusLedger(stage, "all")} onAgeFilter={(age) => focusLedger("all", age)} />

          {!loading && !hasSales ? <div className="py-10"><EmptyState title="Ainda não há capital para analisar neste recorte." description="A experiência será preenchida quando existirem vendas elegíveis com valor líquido operacional." /></div> : null}
          {!loading && hasSales && !data.summary.completedCycles ? <div className="mt-5"><InlineNotice text="O capital na rua já pode ser acompanhado. O tempo de retorno aparecerá após os primeiros ciclos concluídos." /></div> : null}

          {loading || hasSales ? (
            <>
              <MoneyMotionFlow data={data} loading={loading} />
              <VelocityExplorer data={data} loading={loading} />

              <section ref={ledgerRef} className="scroll-mt-4">
                <ReceivablesLedger rows={data.openCapital} totalCapital={data.current.openCapital} loading={loading} stageFilter={ledgerStage} ageFilter={ledgerAge} reviewSaleIds={reviewSaleIds} onStageFilter={setLedgerStage} onAgeFilter={setLedgerAge} onSelect={setSelectedSale} />
              </section>
            </>
          ) : null}

          <section ref={qualityRef} className="scroll-mt-4">
            <DataTrustDock data={data.dataQuality} loading={loading} onReview={() => setQualityOpen(true)} />
          </section>
        </>
      ) : null}

      {settingsOpen ? <SettingsDrawer settings={data.settings} onSaved={() => { setSettingsOpen(false); void load(); }} onClose={() => setSettingsOpen(false)} /> : null}
      {qualityOpen ? <QualityReviewDrawer data={data.dataQuality} onClose={() => setQualityOpen(false)} /> : null}
      {selectedSale ? <SaleTimelineDrawer sale={selectedSale} onClose={() => setSelectedSale(null)} /> : null}
    </div>
  );
}

function CapitalPageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-x-5 -bottom-12 -top-16 -z-10 overflow-hidden bg-[#040811]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_4%,rgba(21,148,121,.12),transparent_34%),radial-gradient(ellipse_at_52%_10%,rgba(14,116,184,.105),transparent_36%),radial-gradient(ellipse_at_92%_20%,rgba(105,56,190,.10),transparent_36%),linear-gradient(180deg,#06121d_0%,#040a12_38%,#03070d_100%)]" />
      <div className="absolute -left-[24rem] top-[10rem] h-[60rem] w-[60rem] rounded-full bg-emerald-400/[.025] blur-[165px]" />
      <div className="absolute left-[28%] top-[28rem] h-[54rem] w-[54rem] rounded-full bg-cyan/[.022] blur-[175px]" />
      <div className="absolute -right-[26rem] top-[48rem] h-[68rem] w-[68rem] rounded-full bg-purple/[.026] blur-[185px]" />
      <div className="absolute inset-0 opacity-[.032]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='.72'/%3E%3C/svg%3E\")" }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_32%,rgba(1,3,8,.44)_100%)]" />
    </div>
  );
}

function PageStatusDock({ data, filters, loading, onSettings, onQuality }: { data: CapitalCycleResponse; filters: CapitalCycleFilters; loading: boolean; onSettings: () => void; onQuality: () => void }) {
  return (
    <header className="flex flex-col gap-4 pb-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="flex items-center gap-2 text-[11px] text-white/45"><DatabaseZap size={13} className="text-cyan/75" />Dados reais · valor líquido da operação</p>
        <p className="mt-1.5 text-[11px] text-white/42">A coorte usa compras de {dateLabel(filters.start)} a {dateLabel(filters.end)}; a fotografia do capital mostra a posição atual.</p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" disabled={loading} onClick={onQuality} className="inline-flex h-11 items-center gap-2 px-3 text-[11px] font-semibold text-white/52 transition hover:bg-white/[.03] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/45 disabled:opacity-45"><ShieldCheck size={14} className={data.dataQuality.reviewCount ? "text-amber" : "text-money"} />{loading ? <Skeleton className="h-3 w-24" /> : <>Qualidade {percent(data.dataQuality.completenessPercent)}{data.dataQuality.reviewCount ? ` · ${data.dataQuality.reviewCount} revisões` : ""}</>}</button>
        <button type="button" disabled={loading} onClick={onSettings} className="inline-flex h-11 items-center gap-2 px-3 text-[11px] font-semibold text-white/52 transition hover:bg-white/[.03] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/50 disabled:opacity-45"><Settings2 size={14} className="text-purple-200/75" />Regra de inadimplência</button>
      </div>
    </header>
  );
}
