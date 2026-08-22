import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { CapitalCycleRow } from "@/data/capital-cycle";
import { cn } from "@/lib/utils";
import type { TableAgeFilter, TableStageFilter } from "./types";
import { dateLabel, money, originLabel, stageLabel } from "./types";
import { EmptyState, SectionHeading, Skeleton } from "./capital-cycle-ui";

type SortMode = "days" | "value" | "recent" | "oldest";
const INITIAL_VISIBLE_ROWS = 24;
const VISIBLE_ROWS_STEP = 24;

export function ReceivablesLedger({ rows, totalCapital, loading, stageFilter, ageFilter, reviewSaleIds, onStageFilter, onAgeFilter, onSelect }: {
  rows: CapitalCycleRow[];
  totalCapital: number;
  loading: boolean;
  stageFilter: TableStageFilter;
  ageFilter: TableAgeFilter;
  reviewSaleIds: Set<string>;
  onStageFilter: (value: TableStageFilter) => void;
  onAgeFilter: (value: TableAgeFilter) => void;
  onSelect: (row: CapitalCycleRow) => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("days");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROWS);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return rows
      .filter((row) => !term || `${row.customerName} ${row.customerPhone || ""}`.toLocaleLowerCase("pt-BR").includes(term))
      .filter((row) => stageMatches(row, stageFilter))
      .filter((row) => ageMatches(row, ageFilter))
      .sort((a, b) => sort === "value"
        ? b.capital - a.capital
        : sort === "recent"
          ? compareSaleDates(a, b, "recent")
          : sort === "oldest"
            ? compareSaleDates(a, b, "oldest")
            : (b.daysOpen ?? -1) - (a.daysOpen ?? -1));
  }, [ageFilter, rows, search, sort, stageFilter]);

  useEffect(() => { setVisibleCount(INITIAL_VISIBLE_ROWS); }, [ageFilter, rows.length, search, sort, stageFilter]);

  const visibleRows = filteredRows.slice(0, visibleCount);
  const hasDerivedFilter = stageFilter !== "all" || ageFilter !== "all";

  return (
    <section className="py-10 sm:py-12">
      <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeading eyebrow="Operação" title="Dinheiro atualmente na rua" description={loading ? "Carregando recebíveis atuais." : `${money(totalCapital)} distribuídos em ${rows.length} recebíveis líquidos.`} />

        <div className="flex max-w-full flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 sm:w-64">
            <Search size={14} className="pointer-events-none absolute left-0 top-3.5 text-white/38" />
            <span className="sr-only">Buscar cliente ou telefone</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente ou telefone" className="h-11 w-full border-b border-white/[.11] bg-transparent pl-6 pr-2 text-[12px] text-white/76 placeholder:text-white/36 focus-visible:border-cyan/45 focus-visible:outline-none" />
          </label>
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            <LedgerSelect label="Etapa" value={stageFilter} onChange={(value) => onStageFilter(value as TableStageFilter)} options={[["all", "Todas"], ["transit", "Em trânsito"], ["delivered", "Entregue aguardando"], ["delinquent", "Inadimplente"]]} />
            <LedgerSelect label="Idade" value={ageFilter} onChange={(value) => onAgeFilter(value as TableAgeFilter)} options={[["all", "Todas"], ["0-3", "0–3 dias"], ["4-7", "4–7 dias"], ["8-15", "8–15 dias"], ["15+", "Mais de 15 dias"], ["16-30", "16–30 dias"], ["30+", "30+ dias"], ["unknown", "Sem data"]]} />
            <LedgerSelect label="Ordem" value={sort} onChange={(value) => setSort(value as SortMode)} options={[["days", "Mais tempo"], ["value", "Maior valor"], ["recent", "Mais recente"], ["oldest", "Mais antigo"]]} />
          </div>
        </div>
      </div>

      {hasDerivedFilter ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-l-2 border-cyan/45 bg-cyan/[.025] px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-white/48"><SlidersHorizontal size={12} />Lente operacional</span>
          {stageFilter !== "all" ? <ContextChip text={`Etapa: ${stageFilter === "delivered" ? "Entregue aguardando" : stageLabel(stageFilter)}`} onClear={() => onStageFilter("all")} /> : null}
          {ageFilter !== "all" ? <ContextChip text={`Idade: ${ageFilter === "15+" ? "Mais de 15 dias" : ageFilter === "unknown" ? "Sem data" : `${ageFilter} dias`}`} onClear={() => onAgeFilter("all")} /> : null}
          <span className="ml-auto text-[11px] text-white/45">{filteredRows.length} de {rows.length}</span>
        </div>
      ) : null}

      <div className="mt-6 border-y border-white/[.08]">
        <div className="hidden min-h-10 grid-cols-[minmax(0,1.45fr)_minmax(130px,.55fr)_minmax(120px,.45fr)_minmax(170px,.65fr)] items-center gap-4 bg-white/[.018] px-4 text-[11px] font-semibold uppercase tracking-[.12em] text-white/44 md:grid xl:px-5"><span>Cliente e contexto</span><span>Valor líquido</span><span>Tempo</span><span>Estado</span></div>

        {loading ? <LedgerSkeleton /> : filteredRows.length ? (
          <ul className="divide-y divide-white/[.06]">
            {visibleRows.map((row) => {
              const needsReview = reviewSaleIds.has(row.id);
              return (
                <li key={row.id}>
                  <button type="button" onClick={() => onSelect(row)} aria-label={rowAriaLabel(row, needsReview)} className="group grid w-full gap-4 px-4 py-4 text-left transition duration-150 hover:bg-white/[.028] focus-visible:bg-white/[.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan/35 md:grid-cols-[minmax(0,1.45fr)_minmax(130px,.55fr)_minmax(120px,.45fr)_minmax(170px,.65fr)] md:items-center xl:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center border border-white/[.085] bg-white/[.025] text-[11px] font-semibold text-white/52">{initials(row.customerName)}</span>
                      <span className="min-w-0"><span className="flex min-w-0 items-center gap-2"><strong className="truncate text-[13px] font-semibold text-white/82" title={row.customerName}>{row.customerName}</strong>{needsReview ? <span className="h-1.5 w-1.5 shrink-0 bg-amber" title="Revisão de dados necessária" /> : null}</span><span className="mt-1 block truncate text-[11px] text-white/48">{originLabel(row.origin || "")} · {row.state || "Sem UF"} · {row.campaignName || "Sem campanha"}</span></span>
                    </div>
                    <div><span className="md:hidden text-[10px] font-semibold uppercase tracking-[.1em] text-white/44">Valor líquido</span><strong className="mt-1 block text-[17px] font-semibold tracking-[-.025em] text-cyan-100 tabular-nums md:mt-0">{money(row.capital)}</strong></div>
                    <div><span className="md:hidden text-[10px] font-semibold uppercase tracking-[.1em] text-white/44">Tempo na rua</span><DaysSignal row={row} /></div>
                    <div className="flex items-center justify-between gap-3 md:block"><StageSignal stage={row.stage} /><span className="text-[11px] text-white/42 md:hidden">Compra {dateLabel(row.saleDate)}</span></div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState title="Nenhum capital encontrado" description={hasDerivedFilter || search ? "Remova alguma lente para ampliar a busca." : "Não há recebíveis líquidos em aberto neste recorte."} />}
      </div>

      {!loading && filteredRows.length ? (
        <div className="flex flex-col gap-3 border-b border-white/[.06] px-1 py-4 text-[11px] text-white/42 sm:flex-row sm:items-center sm:justify-between">
          <span aria-live="polite">Mostrando {visibleRows.length} de {filteredRows.length} recebíveis</span>
          {visibleRows.length < filteredRows.length ? <button type="button" onClick={() => setVisibleCount((current) => Math.min(current + VISIBLE_ROWS_STEP, filteredRows.length))} className="inline-flex h-11 items-center justify-center gap-2 self-start px-3 font-semibold text-white/58 ring-1 ring-inset ring-white/[.08] transition hover:bg-white/[.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40 sm:self-auto">Mostrar mais <ChevronDown size={13} /></button> : null}
        </div>
      ) : null}
    </section>
  );
}

function stageMatches(row: CapitalCycleRow, filter: TableStageFilter) {
  if (filter === "all") return true;
  if (filter === "delivered") return row.stage === "awaiting_payment" || row.stage === "delinquent";
  return row.stage === filter;
}

function ageMatches(row: CapitalCycleRow, filter: TableAgeFilter) {
  if (filter === "all") return true;
  if (filter === "unknown") return row.daysOpen == null;
  if (row.daysOpen == null) return false;
  if (filter === "0-3") return row.daysOpen <= 3;
  if (filter === "4-7") return row.daysOpen >= 4 && row.daysOpen <= 7;
  if (filter === "8-15") return row.daysOpen >= 8 && row.daysOpen <= 15;
  if (filter === "15+") return row.daysOpen > 15;
  if (filter === "16-30") return row.daysOpen >= 16 && row.daysOpen <= 30;
  return row.daysOpen > 30;
}

function DaysSignal({ row }: { row: CapitalCycleRow }) {
  const tone = row.stage === "delinquent" ? "text-rose-100" : row.daysOpen != null && row.daysOpen > 15 ? "text-amber" : "text-white/82";
  return <span className={cn("mt-1 block text-[22px] font-semibold leading-none tracking-[-.04em] tabular-nums md:mt-0", tone)}>{row.daysOpen == null ? "—" : row.daysOpen}<span className="ml-1 text-[11px] font-medium tracking-normal text-white/45">dias</span></span>;
}

function StageSignal({ stage }: { stage: CapitalCycleRow["stage"] }) {
  const tone = stage === "delinquent" ? "border-rose-300/22 bg-rose-400/[.055] text-rose-100" : stage === "awaiting_payment" ? "border-purple/20 bg-purple/[.055] text-purple-100" : "border-cyan/20 bg-cyan/[.045] text-cyan-100";
  return <span className={cn("inline-flex min-h-8 items-center border-l-2 px-2.5 text-[11px] font-semibold", tone)}>{stageLabel(stage)}</span>;
}

function LedgerSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="relative flex h-11 min-w-[132px] shrink-0 flex-col justify-center border-b border-white/[.11] px-2 pr-6"><span className="text-[10px] font-semibold uppercase tracking-[.11em] text-white/44">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-0.5 appearance-none bg-transparent text-[11px] font-semibold text-white/68 focus-visible:outline-none">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select><ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 mt-1 -translate-y-1/2 text-white/38" /></label>;
}

function ContextChip({ text, onClear }: { text: string; onClear: () => void }) {
  return <button type="button" onClick={onClear} className="inline-flex h-8 items-center gap-2 bg-cyan/[.045] px-3 text-[11px] font-semibold text-cyan-100 ring-1 ring-inset ring-cyan/12 transition hover:bg-cyan/[.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/35"><span>{text}</span><X size={11} /></button>;
}

function LedgerSkeleton() {
  return <div className="divide-y divide-white/[.06]">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="grid gap-4 px-4 py-4 md:grid-cols-[1.45fr_.55fr_.45fr_.65fr]"><Skeleton className="h-10 w-full" /><Skeleton className="h-7 w-28" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-32" /></div>)}</div>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "KA";
}

function compareSaleDates(a: CapitalCycleRow, b: CapitalCycleRow, direction: "recent" | "oldest") {
  if (!a.saleDate && !b.saleDate) return 0;
  if (!a.saleDate) return 1;
  if (!b.saleDate) return -1;
  return direction === "recent" ? b.saleDate.localeCompare(a.saleDate) : a.saleDate.localeCompare(b.saleDate);
}

function rowAriaLabel(row: CapitalCycleRow, needsReview: boolean) {
  return `${row.customerName}. Valor líquido ${money(row.capital)}. ${row.daysOpen == null ? "Dias na rua não informados" : `${row.daysOpen} dias na rua`}. Etapa ${stageLabel(row.stage)}. Origem ${originLabel(row.origin || "")}. UF ${row.state || "não informada"}. Campanha ${row.campaignName || "não informada"}.${needsReview ? " Revisão de dados necessária." : ""}`;
}
