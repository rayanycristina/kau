import { useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Megaphone, RefreshCw, UsersRound } from "lucide-react";
import type { CapitalCycleGroup } from "@/data/capital-cycle";
import type { CapitalCycleResponse } from "./types";
import { decimal, money } from "./types";
import { EmptyState, SectionHeading, Skeleton } from "./capital-cycle-ui";

type RankingTab = "origin" | "state" | "campaign" | "seller";

const tabMeta: Array<{ key: RankingTab; label: string; icon: typeof RefreshCw }> = [
  { key: "origin", label: "Origem", icon: RefreshCw },
  { key: "state", label: "UF", icon: MapPin },
  { key: "campaign", label: "Campanha", icon: Megaphone },
  { key: "seller", label: "Vendedor", icon: UsersRound },
];

export function VelocityExplorer({ data, loading }: { data: CapitalCycleResponse; loading: boolean }) {
  const [activeTab, setActiveTab] = useState<RankingTab>("origin");
  const [expanded, setExpanded] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const rows = useMemo(() => ({ origin: data.byOrigin, state: data.byState, campaign: data.byCampaign, seller: data.bySeller })[activeTab], [activeTab, data]);
  const observed = useMemo(() => rows.filter((row) => row.averageDays != null && row.completedCycles > 0), [rows]);
  const visibleRows = expanded ? observed : observed.slice(0, 6);
  const maxDays = Math.max(1, ...observed.map((row) => row.averageDays || 0));

  function moveTab(current: number, direction: number) {
    const next = (current + direction + tabMeta.length) % tabMeta.length;
    setActiveTab(tabMeta[next].key);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="border-b border-white/[.075] bg-[#07101a]/42 py-10 sm:py-12">
      <div className="grid gap-8 px-0 2xl:grid-cols-[330px_minmax(0,1fr)] 2xl:gap-12">
        <div>
          <SectionHeading eyebrow="Velocidade" title="Onde seu dinheiro gira mais rápido?" description="Compare o tempo observado sem transformar amostras pequenas em recomendação automática." />
          <div role="tablist" aria-label="Dimensão do ranking" className="mt-6 flex max-w-full overflow-x-auto border-b border-white/[.075] scrollbar-none">
            {tabMeta.map((tab, index) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.key;
              return (
                <button key={tab.key} ref={(element) => { tabRefs.current[index] = element; }} id={`velocity-tab-${tab.key}`} type="button" role="tab" aria-selected={selected} aria-controls="velocity-panel" tabIndex={selected ? 0 : -1} onClick={() => { setActiveTab(tab.key); setExpanded(false); }} onKeyDown={(event) => {
                  if (event.key === "ArrowRight") { event.preventDefault(); moveTab(index, 1); }
                  if (event.key === "ArrowLeft") { event.preventDefault(); moveTab(index, -1); }
                  if (event.key === "Home") { event.preventDefault(); setActiveTab(tabMeta[0].key); tabRefs.current[0]?.focus(); }
                  if (event.key === "End") { event.preventDefault(); const last = tabMeta.length - 1; setActiveTab(tabMeta[last].key); tabRefs.current[last]?.focus(); }
                }} className={selected ? "flex h-11 shrink-0 items-center gap-2 border-b-2 border-purple px-3 text-[11px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/45" : "flex h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-[11px] font-semibold text-white/45 transition hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/45"}>
                  <Icon size={13} />{tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div id="velocity-panel" role="tabpanel" aria-labelledby={`velocity-tab-${activeTab}`} tabIndex={0} className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/40">
          {loading ? <RankingSkeleton /> : visibleRows.length ? (
            <>
              <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[.12em] text-white/44"><span>Menos dias</span><span>Mais dias</span></div>
              <div className="divide-y divide-white/[.06] border-y border-white/[.075]">
                {visibleRows.map((row, index) => <VelocityRow key={row.key} row={row} index={index} maxDays={maxDays} fastest={observed.length > 1 && index === 0} slowest={observed.length > 1 && index === observed.length - 1} />)}
              </div>
              {observed.length > 6 ? <button type="button" onClick={() => setExpanded((current) => !current)} className="mt-4 inline-flex h-10 items-center gap-2 text-[11px] font-semibold text-white/52 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/45">{expanded ? "Mostrar menos" : `Ver todos (${observed.length})`}<ChevronDown size={13} className={expanded ? "rotate-180" : ""} /></button> : null}
            </>
          ) : <EmptyState title="Ainda não há comparação confiável" description="O ranking aparecerá quando houver ciclos completos nessa dimensão." />}
        </div>
      </div>
    </section>
  );
}

function VelocityRow({ row, index, maxDays, fastest, slowest }: { row: CapitalCycleGroup; index: number; maxDays: number; fastest: boolean; slowest: boolean }) {
  const position = Math.max(2, Math.min(100, ((row.averageDays || 0) / maxDays) * 100));
  return (
    <div className="grid gap-4 py-4 sm:grid-cols-[minmax(0,.65fr)_minmax(0,1.35fr)_minmax(0,.7fr)] sm:items-center">
      <div className="flex min-w-0 items-center gap-3"><span className="text-[12px] font-semibold text-white/40 tabular-nums">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-white/78" title={row.label}>{row.label}</p><p className="mt-1 text-[11px] text-white/45">{row.completedCycles} ciclos observados{fastest ? " · mais rápido" : slowest ? " · mais lento" : ""}</p></div></div>
      <div className="relative h-8">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/[.09]" />
        <div className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-purple/65 to-cyan/65" style={{ width: `${position}%` }} />
        <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 border-2 border-[#07101a] bg-purple-200 shadow-[0_0_0_1px_rgba(196,181,253,.45)]" style={{ left: `${position}%` }} />
        <strong className={position > 78 ? "absolute top-1/2 -translate-y-1/2 pr-3 text-[12px] font-semibold text-purple-100 tabular-nums" : "absolute top-1/2 -translate-y-1/2 pl-3 text-[12px] font-semibold text-purple-100 tabular-nums"} style={position > 78 ? { right: `${100 - position}%` } : { left: `${position}%` }}>{decimal(row.averageDays)}d</strong>
      </div>
      <div className="grid grid-cols-2 gap-4 text-right sm:justify-self-end"><div><p className="text-[10px] font-semibold uppercase tracking-[.11em] text-white/44">Retornou na coorte</p><p className="mt-1 text-[12px] font-semibold text-money/85 tabular-nums">{money(row.returnedCapital)}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-[.11em] text-white/44">Em aberto hoje</p><p className="mt-1 text-[12px] font-semibold text-cyan/85 tabular-nums">{money(row.openCapital)}</p></div></div>
    </div>
  );
}

function RankingSkeleton() {
  return <div className="space-y-px border-y border-white/[.075]">{[1, 2, 3, 4].map((item) => <div key={item} className="grid gap-4 py-4 sm:grid-cols-[.65fr_1.35fr_.7fr]"><Skeleton className="h-9 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>)}</div>;
}
