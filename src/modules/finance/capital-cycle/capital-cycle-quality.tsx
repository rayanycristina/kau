import { Check, Database, SearchCheck } from "lucide-react";
import type { CapitalCycleResponse } from "./types";
import { percent } from "./types";
import { Skeleton } from "./capital-cycle-ui";

export function DataTrustDock({ data, loading, onReview }: { data: CapitalCycleResponse["dataQuality"]; loading: boolean; onReview: () => void }) {
  const completeness = Math.max(0, Math.min(100, data.completenessPercent || 0));
  return (
    <section aria-label="Qualidade dos dados" aria-busy={loading} className="mb-2 mt-2 border-y border-white/[.065] bg-black/[.10] px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Database size={14} className="shrink-0 text-white/38" />
          {loading ? <Skeleton className="h-4 w-72 max-w-full" /> : data.eligibleRecords ? (
            <p className="min-w-0 text-[11px] text-white/48"><strong className="font-semibold text-white/72">Qualidade {percent(data.completenessPercent)}</strong><span className="mx-2 text-white/20">·</span>{data.completeRecords} de {data.eligibleRecords} registros completos{data.reviewCount ? <><span className="mx-2 text-white/20">·</span><span className="text-amber">{data.reviewCount} precisam de revisão</span></> : null}</p>
          ) : <p className="text-[11px] text-white/48">Qualidade indisponível · ainda não há base elegível para auditar.</p>}
        </div>

        <div className="h-1 w-full overflow-hidden bg-white/[.055] sm:w-36" role="progressbar" aria-label="Completude da base" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loading ? undefined : completeness}><span className="block h-full bg-gradient-to-r from-cyan/65 to-money/75 transition-[width] duration-200" style={{ width: loading ? "0%" : `${completeness}%` }} /></div>

        {loading ? <Skeleton className="h-8 w-32" /> : data.reviewCount ? (
          <button type="button" onClick={onReview} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 px-3 text-[11px] font-semibold text-amber ring-1 ring-inset ring-amber/14 transition hover:bg-amber/[.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/40"><SearchCheck size={13} />Revisar base</button>
        ) : data.eligibleRecords ? <span className="inline-flex shrink-0 items-center gap-2 text-[11px] font-semibold text-money/75"><Check size={13} />Sem pendências</span> : null}
      </div>
      <p className="mt-2 text-[11px] text-white/42">Esta área apenas sinaliza inconsistências; nenhum dado é corrigido automaticamente.</p>
    </section>
  );
}
