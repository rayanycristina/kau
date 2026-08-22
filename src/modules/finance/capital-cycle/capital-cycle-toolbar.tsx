import { useMemo, useState } from "react";
import { CalendarRange, ChevronDown, Filter, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CapitalCycleFilters, CapitalCycleResponse } from "./types";
import { dateLabel, originLabel } from "./types";

type FilterKey = keyof CapitalCycleFilters;

export function CapitalCommandBar({ filters, options, loading, onChange, onRefresh }: {
  filters: CapitalCycleFilters;
  options: CapitalCycleResponse["filters"];
  loading: boolean;
  onChange: (key: FilterKey, value: string) => void;
  onRefresh: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const activeFilters = useMemo(() => [filters.origin, filters.campaign, filters.state, filters.seller].filter((value) => value !== "all").length, [filters]);

  return (
    <section aria-label="Filtros de Capital em Giro" className="relative border-y border-white/[.07] bg-[#08101a]/62 backdrop-blur-xl">
      <div className="flex min-h-14 items-stretch overflow-x-auto scrollbar-none">
        <div className="flex shrink-0 items-center gap-2 px-3 sm:px-4">
          <CalendarRange size={15} className="text-purple" aria-hidden />
          <label className="sr-only" htmlFor="capital-start">Início da coorte</label>
          <input id="capital-start" type="date" value={filters.start} onChange={(event) => onChange("start", event.target.value)} className="w-[112px] bg-transparent text-[12px] font-medium text-white/76 [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/45" />
          <span aria-hidden className="text-white/28">→</span>
          <label className="sr-only" htmlFor="capital-end">Fim da coorte</label>
          <input id="capital-end" type="date" value={filters.end} onChange={(event) => onChange("end", event.target.value)} className="w-[112px] bg-transparent text-[12px] font-medium text-white/76 [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/45" />
        </div>

        <CommandSelect label="Origem" value={filters.origin} options={options.origins.map((value) => [value, originLabel(value)])} onChange={(value) => onChange("origin", value)} />
        <CommandSelect label="Campanha" value={filters.campaign} options={[["none", "Sem campanha"], ...options.campaigns.map((item) => [item.id, item.name] as [string, string])]} onChange={(value) => onChange("campaign", value)} wide />

        <button type="button" onClick={() => setMoreOpen((current) => !current)} aria-expanded={moreOpen} aria-controls="capital-more-filters" className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 border-l border-white/[.06] px-4 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple/50", moreOpen || filters.state !== "all" || filters.seller !== "all" ? "bg-purple/[.07] text-purple-100" : "text-white/55 hover:bg-white/[.025] hover:text-white") }>
          <Filter size={13} />Mais filtros
          {activeFilters ? <span className="grid h-5 min-w-5 place-items-center bg-purple/15 px-1.5 text-[10px] text-purple-100">{activeFilters}</span> : null}
          <ChevronDown size={12} className={cn("transition-transform duration-200", moreOpen && "rotate-180")} />
        </button>

        <button type="button" onClick={onRefresh} disabled={loading} className="ml-auto grid min-h-11 min-w-12 shrink-0 place-items-center border-l border-white/[.06] text-white/45 transition hover:bg-white/[.03] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan/45 disabled:opacity-40" aria-label="Atualizar Capital em Giro" title="Atualizar dados">
          <RefreshCw size={14} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      <div id="capital-more-filters" hidden={!moreOpen} className="border-t border-white/[.06] bg-black/[.12] px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-end gap-3">
          <CommandSelect label="UF" value={filters.state} options={options.states.map((value) => [value, value])} onChange={(value) => onChange("state", value)} detached />
          <CommandSelect label="Vendedor" value={filters.seller} options={options.sellers.map((value) => [value, value])} onChange={(value) => onChange("seller", value)} wide detached />
          <p className="ml-auto pb-2 text-[11px] text-white/42">Coorte por compra · {dateLabel(filters.start)} a {dateLabel(filters.end)}</p>
        </div>
      </div>

      {activeFilters ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[.055] px-3 py-2.5 sm:px-4">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[.12em] text-white/45">Lente ativa</span>
          {filters.origin !== "all" ? <ActiveChip text={originLabel(filters.origin)} onClear={() => onChange("origin", "all")} /> : null}
          {filters.campaign !== "all" ? <ActiveChip text={filters.campaign === "none" ? "Sem campanha" : options.campaigns.find((item) => item.id === filters.campaign)?.name || "Campanha selecionada"} onClear={() => onChange("campaign", "all")} /> : null}
          {filters.state !== "all" ? <ActiveChip text={`UF ${filters.state}`} onClear={() => onChange("state", "all")} /> : null}
          {filters.seller !== "all" ? <ActiveChip text={filters.seller} onClear={() => onChange("seller", "all")} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function CommandSelect({ label, value, options, onChange, wide, detached }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void; wide?: boolean; detached?: boolean }) {
  return (
    <label className={cn("relative flex min-h-11 shrink-0 flex-col justify-center", detached ? "min-w-[150px] bg-white/[.025] px-3 ring-1 ring-inset ring-white/[.07]" : "border-l border-white/[.06] px-4", wide ? "min-w-[210px]" : "min-w-[150px]") }>
      <span className="text-[10px] font-semibold uppercase tracking-[.13em] text-white/45">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-0.5 w-full appearance-none bg-transparent pr-5 text-[12px] font-semibold text-white/74 focus-visible:outline-none">
        <option value="all">Todos</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
      <ChevronDown size={11} className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-white/35" />
    </label>
  );
}

function ActiveChip({ text, onClear }: { text: string; onClear: () => void }) {
  return <button type="button" onClick={onClear} title={`Remover ${text}`} className="inline-flex h-8 max-w-[240px] items-center gap-2 bg-white/[.035] px-3 text-[11px] font-semibold text-white/62 ring-1 ring-inset ring-white/[.07] transition hover:bg-white/[.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/50"><span className="truncate">{text}</span><X size={11} /></button>;
}
