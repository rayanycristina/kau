import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowDown, Clock3, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CapitalCycleFilters, CapitalCycleResponse, TableAgeFilter, TableStageFilter } from "./types";
import { dateLabel, decimal, money, percent } from "./types";
import { MetricHint, Skeleton } from "./capital-cycle-ui";

type CardTone = "green" | "blue" | "purple";

const cardTone: Record<CardTone, { surface: string; accent: string; glow: string; line: string }> = {
  green: {
    surface: "border-emerald-300/[.16] bg-[linear-gradient(145deg,rgba(9,31,28,.96),rgba(5,13,18,.94)_62%,rgba(4,10,15,.98))] shadow-[0_24px_80px_rgba(2,18,15,.34),inset_0_1px_0_rgba(255,255,255,.035)]",
    accent: "text-[#62f6a8]",
    glow: "bg-[#27e98b]/20",
    line: "bg-[#42f09b]",
  },
  blue: {
    surface: "border-cyan-300/[.16] bg-[linear-gradient(145deg,rgba(8,26,43,.97),rgba(5,13,23,.94)_62%,rgba(4,9,16,.98))] shadow-[0_24px_80px_rgba(1,17,35,.38),inset_0_1px_0_rgba(255,255,255,.035)]",
    accent: "text-[#72d8ff]",
    glow: "bg-[#1a8dff]/20",
    line: "bg-[#39b9ff]",
  },
  purple: {
    surface: "border-violet-300/[.16] bg-[linear-gradient(145deg,rgba(28,18,48,.97),rgba(12,10,25,.95)_62%,rgba(6,8,16,.98))] shadow-[0_24px_80px_rgba(20,8,43,.38),inset_0_1px_0_rgba(255,255,255,.035)]",
    accent: "text-[#c7a6ff]",
    glow: "bg-[#8d4cff]/20",
    line: "bg-[#9c64ff]",
  },
};

export function CapitalLeadStatement({ data, filters, loading, onStageFilter, onAgeFilter }: {
  data: CapitalCycleResponse;
  filters: CapitalCycleFilters;
  loading: boolean;
  onStageFilter: (value: TableStageFilter) => void;
  onAgeFilter: (value: TableAgeFilter) => void;
}) {
  const { summary, current } = data;
  const roundedAverage = summary.averageReturnDays == null ? null : Math.round(summary.averageReturnDays);

  return (
    <section aria-busy={loading} className="border-b border-white/[.075] pb-10 pt-6 sm:pb-12 sm:pt-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-white/42">Visão executiva</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.045em] text-white sm:text-[28px]">O ciclo real do seu dinheiro</h2>
        </div>
        <p className="max-w-lg text-[12px] leading-5 text-white/45 sm:text-right">Compra, exposição e retorno conectados com o valor líquido da operação.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ExecutiveCard tone="green" asset="/finance/working-capital/capital-clock.png" assetAlt="" assetClassName="-right-10 -top-5 w-[235px] sm:w-[255px] xl:-right-12 xl:w-[230px]">
          <CardHeader eyebrow="Ritmo do capital" title="Tempo médio de retorno" description="Do dia da compra até o dinheiro efetivamente voltar." tone="green">
            <MetricHint label="Como o tempo médio é calculado">Média de dias corridos entre compra e pagamento confirmado nas vendas com ciclo completo da coorte.</MetricHint>
          </CardHeader>

          <div className="relative z-10 mt-8">
            {loading ? <Skeleton className="h-16 w-44" /> : (
              <div className="flex items-end gap-2">
                <strong className="text-[clamp(3.6rem,5.8vw,5.6rem)] font-semibold leading-[.84] tracking-[-.075em] text-white tabular-nums">{roundedAverage ?? "—"}</strong>
                <span className="mb-1 text-xl font-semibold tracking-[-.035em] text-[#62f6a8]/80">dias</span>
              </div>
            )}
            <p className="mt-3 text-[12px] text-white/48">{loading || summary.averageReturnDays == null ? "Média exata ainda não disponível" : `Média exata: ${decimal(summary.averageReturnDays)} dias`}</p>
          </div>

          <CardFooter>
            <MiniMetric label="Mediana" value={summary.medianReturnDays == null ? "—" : `${decimal(summary.medianReturnDays)}d`} loading={loading} />
            <MiniMetric label="P90" value={summary.p90ReturnDays == null ? "—" : `${decimal(summary.p90ReturnDays, 0)}d`} loading={loading} />
            <MiniMetric label="Ciclos" value={String(summary.completedCycles)} loading={loading} />
          </CardFooter>
        </ExecutiveCard>

        <ExecutiveCard tone="blue" asset="/finance/working-capital/capital-money.png" assetAlt="" assetClassName="-right-6 top-4 w-[225px] sm:w-[250px] xl:-right-8 xl:w-[225px]">
          <CardHeader eyebrow={`Posição atual · ${dateLabel(current.referenceDate)}`} title="Capital na rua hoje" description="Valor líquido ainda fora do caixa." tone="blue">
            <MetricHint label="O que significa capital na rua">Capital líquido de vendas válidas que ainda não possuem pagamento confirmado.</MetricHint>
          </CardHeader>

          <div className="relative z-10 mt-8">
            {loading ? <Skeleton className="h-12 w-56" /> : <strong className="block max-w-full whitespace-nowrap text-[clamp(2.1rem,3.45vw,3.6rem)] font-semibold leading-none tracking-[-.065em] text-white tabular-nums">{money(current.openCapital)}</strong>}
            <p className="mt-3 text-[12px] text-white/48">Dinheiro em circulação, entregue ou aguardando retorno.</p>
          </div>

          <CardFooter className="grid-cols-1 gap-1.5">
            <ExposureAction icon={<Truck size={13} />} label="Em trânsito" value={current.transitCapital} loading={loading} tone="blue" onClick={() => onStageFilter("transit")} />
            <ExposureAction icon={<Clock3 size={13} />} label="Entregue, aguardando" value={current.awaitingPaymentCapital} loading={loading} tone="purple" onClick={() => onStageFilter("delivered")} />
            <ExposureAction icon={<ArrowDown size={13} />} label="Mais de 15 dias" value={current.agedCapital} loading={loading} tone="amber" helper={percent(current.agedPercent)} onClick={() => onAgeFilter("15+")} />
          </CardFooter>
        </ExecutiveCard>

        <ExecutiveCard tone="purple" asset="/finance/working-capital/capital-wallet.png" assetAlt="" assetClassName="-right-7 top-1 w-[218px] sm:w-[240px] xl:-right-9 xl:w-[220px]">
          <CardHeader eyebrow={`Corte · ${dateLabel(filters.start)} a ${dateLabel(filters.end)}`} title="Capital retornado" description="Pagamentos confirmados que voltaram ao caixa no período." tone="purple" />

          <div className="relative z-10 mt-8">
            {loading ? <Skeleton className="h-12 w-56" /> : <strong className="block max-w-full whitespace-nowrap text-[clamp(2.1rem,3.45vw,3.6rem)] font-semibold leading-none tracking-[-.065em] text-white tabular-nums">{money(summary.returnedCapitalInPeriod)}</strong>}
            <p className="mt-3 text-[12px] text-white/48">Já retornaram ao caixa dentro das datas selecionadas.</p>
          </div>

          <CardFooter>
            <MiniMetric label="Retorno da coorte" value={money(summary.cohortReturnedCapital)} loading={loading} />
            <MiniMetric label="Taxa de retorno" value={percent(summary.cohortReturnRate)} loading={loading} />
            <MiniMetric label="Capital do corte" value={money(summary.cohortCapital)} loading={loading} />
            <div className="col-span-full mt-1 h-1 overflow-hidden rounded-full bg-white/[.065]" role="progressbar" aria-label="Taxa de retorno do capital da coorte" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loading ? undefined : Math.max(0, Math.min(100, summary.cohortReturnRate || 0))}>
              <span className="block h-full rounded-full bg-gradient-to-r from-[#8058ff] to-[#d19cff] transition-[width] duration-200" style={{ width: loading ? "0%" : `${Math.max(0, Math.min(100, summary.cohortReturnRate || 0))}%` }} />
            </div>
          </CardFooter>
        </ExecutiveCard>
      </div>
    </section>
  );
}

function ExecutiveCard({ tone, asset, assetAlt, assetClassName, children }: { tone: CardTone; asset: string; assetAlt: string; assetClassName: string; children: ReactNode }) {
  const styles = cardTone[tone];
  return (
    <article className={cn("group relative isolate min-h-[390px] overflow-hidden rounded-[26px] border p-5 transition duration-200 hover:-translate-y-0.5 sm:p-6 xl:min-h-[410px]", styles.surface)}>
      <div aria-hidden className={cn("absolute -right-16 -top-20 h-64 w-64 rounded-full blur-[86px] transition-opacity duration-200 group-hover:opacity-90", styles.glow)} />
      <div aria-hidden className="absolute inset-0 opacity-[.28] [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] [background-size:34px_34px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
      <div aria-hidden className={cn("absolute left-6 right-6 top-0 h-px opacity-80", styles.line)} />
      <Image src={asset} alt={assetAlt} width={768} height={768} priority className={cn("pointer-events-none absolute z-0 h-auto select-none object-contain opacity-[.72] drop-shadow-[0_20px_28px_rgba(0,0,0,.35)] transition duration-300 group-hover:scale-[1.025] group-hover:opacity-[.82]", assetClassName)} />
      <div className="relative z-10 flex h-full min-h-[342px] flex-col">{children}</div>
    </article>
  );
}

function CardHeader({ eyebrow, title, description, tone, children }: { eyebrow: string; title: string; description: string; tone: CardTone; children?: ReactNode }) {
  const styles = cardTone[tone];
  return (
    <div className="relative z-10 max-w-[72%]">
      <div className={cn("flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em]", styles.accent)}><span className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_12px_currentColor]", styles.line)} />{eyebrow}{children}</div>
      <h3 className="mt-3 text-[17px] font-semibold tracking-[-.025em] text-white/90">{title}</h3>
      <p className="mt-2 text-[11px] leading-[1.55] text-white/45">{description}</p>
    </div>
  );
}

function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("relative z-10 mt-auto grid grid-cols-3 gap-2 border-t border-white/[.08] pt-4", className)}>{children}</div>;
}

function MiniMetric({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase leading-4 tracking-[.1em] text-white/42">{label}</p>
      {loading ? <Skeleton className="mt-1.5 h-4 w-16" /> : <p className="mt-1 truncate text-[12px] font-semibold text-white/75 tabular-nums" title={value}>{value}</p>}
    </div>
  );
}

function ExposureAction({ icon, label, value, helper, loading, tone, onClick }: { icon: ReactNode; label: string; value: number; helper?: string; loading: boolean; tone: "blue" | "purple" | "amber"; onClick: () => void }) {
  const toneClass = tone === "blue" ? "text-[#72d8ff]" : tone === "purple" ? "text-[#c7a6ff]" : "text-amber";
  return (
    <button type="button" onClick={onClick} className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-left transition hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">
      <span className={toneClass}>{icon}</span>
      <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-white/52">{label}</span>
      {loading ? <Skeleton className="h-3.5 w-14" /> : <strong className={cn("text-[11px] font-semibold tabular-nums", toneClass)}>{money(value)}{helper ? <span className="ml-1 text-[9px] text-white/35">{helper}</span> : null}</strong>}
    </button>
  );
}
