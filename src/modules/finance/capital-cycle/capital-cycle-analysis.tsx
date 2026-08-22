import { Activity, ArrowDown, ArrowRight, CheckCircle2, ShoppingBag, Truck, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CapitalCycleResponse } from "./types";
import { decimal } from "./types";
import { EmptyState, MetricHint, SectionHeading, Skeleton } from "./capital-cycle-ui";

type StageTone = "green" | "blue" | "purple";

export function MoneyMotionFlow({ data, loading }: { data: CapitalCycleResponse; loading: boolean }) {
  const { cycle, timeline } = data;
  const hasCycle = cycle.total != null || cycle.purchaseToDelivery != null || cycle.deliveryToPayment != null;

  return (
    <section className="border-b border-white/[.075] py-10 sm:py-12">
      <SectionHeading eyebrow="Mapa do ciclo do dinheiro" title="Onde o tempo fica?" description="O percurso real da compra até o pagamento confirmado, sem confundir entrega com dinheiro recebido." />

      <div className="mt-8 overflow-hidden rounded-[28px] border border-white/[.09] bg-[linear-gradient(145deg,rgba(8,20,31,.92),rgba(4,9,16,.97))] shadow-[0_30px_100px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.035)]">
        <div className="relative px-5 py-7 sm:px-7 sm:py-8 xl:px-9">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_16%_15%,rgba(34,197,94,.08),transparent_27%),radial-gradient(circle_at_50%_15%,rgba(14,165,233,.08),transparent_28%),radial-gradient(circle_at_84%_15%,rgba(139,92,246,.09),transparent_28%)]" />

          {loading ? <CycleSkeleton /> : hasCycle ? (
            <div className="relative grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
              <CycleStage order="01" label="Compra" value={cycle.purchaseToDelivery} helper="média até a entrega" icon={<ShoppingBag size={21} />} tone="green" />
              <CycleConnector from="green" to="blue" />
              <CycleStage order="02" label="Entrega" value={cycle.deliveryToPayment} helper="média até o pagamento" icon={<Truck size={22} />} tone="blue" />
              <CycleConnector from="blue" to="purple" />
              <CycleStage order="03" label="Pagamento" value={cycle.total} helper="ciclo completo médio" icon={<WalletCards size={22} />} tone="purple" />
            </div>
          ) : <EmptyState title="Ainda não há ciclo completo" description="O mapa aparecerá quando compra, entrega e pagamento estiverem registrados de forma consistente." />}

          <div className="relative mt-6 flex flex-col gap-3 border-t border-white/[.075] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-[11px] leading-5 text-white/45"><CheckCircle2 size={14} className="shrink-0 text-[#62f6a8]" />Pagamento só conclui o ciclo quando existe confirmação financeira.</div>
            <div className="flex items-center gap-2 text-[11px] text-white/40">As etapas usam as amostras disponíveis em cada trecho.<MetricHint label="Sobre as médias do mapa">Os trechos podem usar subconjuntos diferentes conforme a disponibilidade das datas e não devem ser somados como uma composição de 100%.</MetricHint></div>
          </div>
        </div>

        <AdaptiveReturnTrend rows={timeline} loading={loading} />
      </div>
    </section>
  );
}

function CycleStage({ order, label, value, helper, icon, tone }: { order: string; label: string; value: number | null; helper: string; icon: React.ReactNode; tone: StageTone }) {
  const styles = stageTone(tone);
  return (
    <div className={cn("group relative min-h-[170px] overflow-hidden rounded-2xl border p-5 transition duration-200 hover:-translate-y-0.5", styles.surface)}>
      <div aria-hidden className={cn("absolute -right-10 -top-10 h-32 w-32 rounded-full blur-[58px]", styles.glow)} />
      <div className="relative flex items-start justify-between gap-4">
        <span className={cn("grid h-11 w-11 place-items-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,.05)]", styles.icon)}>{icon}</span>
        <span className="text-[10px] font-semibold tracking-[.15em] text-white/25">{order}</span>
      </div>
      <div className="relative mt-7">
        <p className={cn("text-[11px] font-semibold uppercase tracking-[.15em]", styles.accent)}>{label}</p>
        <div className="mt-2 flex items-baseline gap-2"><strong className="text-[34px] font-semibold leading-none tracking-[-.055em] text-white tabular-nums">{value == null ? "—" : decimal(value)}</strong><span className="text-[12px] font-medium text-white/42">dias</span></div>
        <p className="mt-2 text-[11px] text-white/40">{helper}</p>
      </div>
    </div>
  );
}

function CycleConnector({ from, to }: { from: StageTone; to: StageTone }) {
  const gradient = from === "green" && to === "blue" ? "from-[#45ef9d]/55 to-[#48c8ff]/55" : "from-[#48c8ff]/55 to-[#a776ff]/55";
  return (
    <div aria-hidden className="flex items-center justify-center py-1 md:w-8 md:py-0">
      <div className={cn("relative h-9 w-px bg-gradient-to-b md:h-px md:w-full md:bg-gradient-to-r", gradient)}><ArrowDown size={14} className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-white/35 md:hidden" /><ArrowRight size={14} className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-white/35 md:block" /></div>
    </div>
  );
}

function stageTone(tone: StageTone) {
  if (tone === "green") return { surface: "border-emerald-300/[.13] bg-[#071b18]/72", glow: "bg-[#32e68b]/16", icon: "border-emerald-300/20 bg-emerald-300/[.07] text-[#62f6a8]", accent: "text-[#62f6a8]" };
  if (tone === "blue") return { surface: "border-cyan-300/[.13] bg-[#071827]/72", glow: "bg-[#269cff]/16", icon: "border-cyan-300/20 bg-cyan-300/[.07] text-[#72d8ff]", accent: "text-[#72d8ff]" };
  return { surface: "border-violet-300/[.13] bg-[#160f27]/72", glow: "bg-[#9c5cff]/16", icon: "border-violet-300/20 bg-violet-300/[.07] text-[#c7a6ff]", accent: "text-[#c7a6ff]" };
}

function AdaptiveReturnTrend({ rows, loading }: { rows: CapitalCycleResponse["timeline"]; loading: boolean }) {
  if (loading) return <div className="border-t border-white/[.075] bg-black/10 px-5 py-6 sm:px-7"><Skeleton className="h-4 w-44" /><Skeleton className="mt-5 h-24 w-full" /></div>;
  if (!rows.length) return <div className="border-t border-white/[.075] bg-black/10 px-5 py-6 sm:px-7"><p className="text-sm font-semibold text-white/75">Evolução do retorno</p><p className="mt-2 text-[12px] text-white/42">A tendência aparecerá após os primeiros ciclos concluídos.</p></div>;
  if (rows.length === 1) {
    const row = rows[0];
    return <div className="flex flex-col gap-3 border-t border-white/[.075] bg-black/10 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-white/38">Primeiro sinal da série</p><p className="mt-2 text-[12px] text-white/48">{row.label} · {row.cycles} ciclos concluídos</p></div><p className="text-3xl font-semibold tracking-[-.055em] text-[#c7a6ff] tabular-nums">{decimal(row.averageDays)} dias</p></div>;
  }

  const values = rows.map((row) => row.averageDays);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coordinates = values.map((value, index) => ({ x: 3 + (index / (rows.length - 1)) * 94, y: 60 - ((value - min) / range) * 44 }));
  const points = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="grid gap-5 border-t border-white/[.075] bg-black/10 px-5 py-6 sm:px-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
      <div><div className="flex items-center gap-2"><Activity size={14} className="text-[#c7a6ff]" /><p className="text-sm font-semibold text-white/78">Evolução do retorno</p></div><p className="mt-2 text-[11px] leading-5 text-white/42">Tempo médio por mês da compra.</p></div>
      <div className="min-w-0">
        <svg viewBox="0 0 100 66" className="h-24 w-full overflow-visible" role="img" aria-label="Evolução do tempo médio de retorno">
          <defs><linearGradient id="cycleTrend" x1="0" x2="1"><stop offset="0" stopColor="#62f6a8" /><stop offset=".5" stopColor="#72d8ff" /><stop offset="1" stopColor="#c7a6ff" /></linearGradient></defs>
          {[16, 38, 60].map((y) => <line key={y} x1="1" x2="99" y1={y} y2={y} stroke="rgba(255,255,255,.055)" strokeWidth=".5" />)}
          <polyline points={points} fill="none" stroke="url(#cycleTrend)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          {coordinates.map((point, index) => <circle key={rows[index].key} cx={point.x} cy={point.y} r="1.9" fill="#07101a" stroke="#d8c8ff" strokeWidth="1"><title>{`${rows[index].label}: ${decimal(rows[index].averageDays)} dias · ${rows[index].cycles} ciclos`}</title></circle>)}
        </svg>
        <div className="flex justify-between text-[10px] text-white/38"><span>{rows[0].label}</span><span>{rows.at(-1)?.label}</span></div>
        <ul className="sr-only">{rows.map((row) => <li key={row.key}>{row.label}: {decimal(row.averageDays)} dias em {row.cycles} ciclos.</li>)}</ul>
      </div>
    </div>
  );
}

function CycleSkeleton() {
  return <div className="grid gap-3 md:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-[170px] w-full rounded-2xl" />)}</div>;
}
