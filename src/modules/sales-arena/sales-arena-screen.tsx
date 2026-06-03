"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Award,
  CalendarDays,
  ChevronUp,
  Crown,
  Flame,
  Gem,
  Medal,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaleRecord } from "@/data/sales-types";
import { isValidSaleForMetrics } from "@/data/sale-financial-state";

type TierLabel = "Sem medalha" | "Bronze" | "Prata" | "Ouro" | "Diamante";
type TierStatus = "bloqueado" | "proximo" | "desbloqueado";
type WarStatus = "Acelerado" | "No ritmo" | "Em alerta" | "Atrasado";

type GoalTier = {
  label: Exclude<TierLabel, "Sem medalha">;
  target: number;
  bonus: number;
};

type MonthRange = {
  monthKey: string;
  label: string;
  start: Date;
  end: Date;
  totalDays: number;
  daysPassed: number;
  daysRemaining: number;
};

type SellerWarStats = {
  sellerName: string;
  revenue: number;
  validSalesCount: number;
  averageTicket: number;
  baseCommission: number;
  unlockedBonus: number;
  projectedTotal: number;
  medal: TierLabel;
  nextTier: GoalTier | null;
  missingToNext: number;
  progressToNext: number;
  standardSalesMissing: number;
  rankingPosition: number;
  gapToAbove: number;
  standardSalesToOvertake: number;
  gapToBelow: number;
  dailyRevenueNeeded: number;
  dailyStandardSalesNeeded: number;
  weeklyRevenueNeeded: number;
  weeklyStandardSalesNeeded: number;
  projectedMonthEnd: number;
  status: WarStatus;
};

type TierWarStats = GoalTier & {
  standardSalesNeeded: number;
  dailyPace: number;
  weeklyPace: number;
  status: TierStatus;
  missing: number;
};

type WarRoomModel = {
  month: MonthRange;
  validSales: SaleRecord[];
  sellers: SellerWarStats[];
  podium: SellerWarStats[];
  totalRevenue: number;
  totalBaseCommission: number;
  totalBonus: number;
  totalProjectedPayout: number;
  totalValidSales: number;
  averageTicket: number;
  dailyAverage: number;
  weeklyAverage: number;
  projectedMonthEnd: number;
  maxGoalProgress: number;
  nextGeneralTier: GoalTier | null;
  missingToNextGeneralTier: number;
  standardSalesToNextGeneralTier: number;
  status: WarStatus;
  tierStats: TierWarStats[];
  missionSeller: SellerWarStats | null;
  recentSales: SaleRecord[];
};

const standardTicket = 570;

const goalTiers: GoalTier[] = [
  { label: "Bronze", target: 25000, bonus: 400 },
  { label: "Prata", target: 30000, bonus: 700 },
  { label: "Ouro", target: 35000, bonus: 1000 },
  { label: "Diamante", target: 40000, bonus: 1400 }
];

const defaultMonthKey = "2026-05";
const baseCommissionRate = 0.05;

const tierTone: Record<TierLabel, { text: string; border: string; bg: string; fill: string; glow: string }> = {
  "Sem medalha": {
    text: "text-slate-300",
    border: "border-slate-300/15",
    bg: "bg-slate-400/[.055]",
    fill: "bg-slate-400",
    glow: "shadow-[0_0_28px_rgba(148,163,184,.08)]"
  },
  Bronze: {
    text: "text-[#D97706]",
    border: "border-[#D97706]/35",
    bg: "bg-[#D97706]/12",
    fill: "bg-[#D97706]",
    glow: "shadow-[0_0_34px_rgba(217,119,6,.18)]"
  },
  Prata: {
    text: "text-[#CBD5E1]",
    border: "border-[#CBD5E1]/30",
    bg: "bg-[#CBD5E1]/10",
    fill: "bg-[#CBD5E1]",
    glow: "shadow-[0_0_34px_rgba(203,213,225,.14)]"
  },
  Ouro: {
    text: "text-[#FBBF24]",
    border: "border-[#FBBF24]/35",
    bg: "bg-[#FBBF24]/12",
    fill: "bg-[#FBBF24]",
    glow: "shadow-[0_0_38px_rgba(251,191,36,.20)]"
  },
  Diamante: {
    text: "text-[#22D3EE]",
    border: "border-[#22D3EE]/40",
    bg: "bg-[#22D3EE]/12",
    fill: "bg-[#22D3EE]",
    glow: "shadow-[0_0_42px_rgba(34,211,238,.22)]"
  }
};

const statusTone: Record<WarStatus, { text: string; border: string; bg: string; fill: string }> = {
  Acelerado: { text: "text-emerald-300", border: "border-emerald-300/25", bg: "bg-emerald-400/10", fill: "bg-emerald-400" },
  "No ritmo": { text: "text-cyan-300", border: "border-cyan-300/25", bg: "bg-cyan-400/10", fill: "bg-cyan-400" },
  "Em alerta": { text: "text-amber-300", border: "border-amber-300/25", bg: "bg-amber-400/10", fill: "bg-amber-400" },
  Atrasado: { text: "text-rose-300", border: "border-rose-300/25", bg: "bg-rose-400/10", fill: "bg-rose-400" }
};

export function SalesArenaScreen() {
  return <WarRoomPage />;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

function money(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function saleDateValue(sale: SaleRecord) {
  const raw = sale.saleDate || sale.createdAt;
  const date = raw ? new Date(String(raw).includes("T") ? raw : `${raw}T12:00:00`) : new Date(0);
  return Number.isFinite(date.getTime()) ? date : new Date(0);
}

function getMonthRange(monthKey: string, now = new Date()): MonthRange {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const totalDays = end.getDate();
  const sameMonth = now.getFullYear() === year && now.getMonth() === month - 1;
  const isPastMonth = end.getTime() < now.getTime() && !sameMonth;
  const daysPassed = sameMonth ? Math.min(now.getDate(), totalDays) : isPastMonth ? totalDays : 0;
  const daysRemaining = Math.max(0, totalDays - daysPassed);
  return {
    monthKey,
    label: start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    start,
    end,
    totalDays,
    daysPassed,
    daysRemaining
  };
}

function isSaleInSelectedMonth(sale: SaleRecord, month: MonthRange) {
  const date = saleDateValue(sale);
  return date >= month.start && date <= month.end;
}

function getValidSalesForMonth(sales: SaleRecord[], month: MonthRange) {
  return sales.filter((sale) => isSaleInSelectedMonth(sale, month) && isValidSaleForMetrics(sale) && Number(sale.totalAmount || 0) > 0);
}

function getUnlockedTier(revenue: number): GoalTier | null {
  return [...goalTiers].reverse().find((tier) => revenue >= tier.target) || null;
}

function getNextTier(revenue: number): GoalTier | null {
  return goalTiers.find((tier) => revenue < tier.target) || null;
}

function calculateProgress(current: number, target: number) {
  if (!target) return 100;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

function calculateStandardSalesMissing(missing: number) {
  return Math.max(0, Math.ceil(missing / standardTicket));
}

function calculateDailyPace(amount: number, days: number) {
  return days <= 0 ? amount : money(amount / Math.max(1, days));
}

function calculateWeeklyPace(amount: number, days: number) {
  const weeks = Math.max(1, days / 7);
  return money(amount / weeks);
}

function calculateProjectedMonthEnd(current: number, daysPassed: number, totalDays: number) {
  if (daysPassed <= 0) return 0;
  return money(current * (totalDays / daysPassed));
}

function getWarRoomStatus(revenue: number, projected: number, nextTier: GoalTier | null, daysRemaining: number): WarStatus {
  const diamond = goalTiers[goalTiers.length - 1];
  if (revenue >= diamond.target || projected >= diamond.target) return "Acelerado";
  if (!nextTier) return "Acelerado";
  const missing = Math.max(0, nextTier.target - revenue);
  if (projected >= nextTier.target) return "No ritmo";
  if (daysRemaining > 0 && missing / daysRemaining <= standardTicket * 2) return "Em alerta";
  return "Atrasado";
}

function sellerMonthRevenue(sales: SaleRecord[]) {
  return money(sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0));
}

function sellerMessage(stats: SellerWarStats) {
  if (!stats.nextTier) return `${stats.sellerName} conquistou Diamante. Agora e defender o topo.`;
  if (stats.medal === "Sem medalha") return `${stats.sellerName}, faltam ${stats.standardSalesMissing} vendas padrao para liberar ${stats.nextTier.label}.`;
  if (stats.status === "Acelerado") return `Ritmo forte: mantendo assim, ${stats.sellerName} chega em ${stats.nextTier.label}.`;
  if (stats.status === "Em alerta") return `Alerta: ${stats.sellerName} precisa de ${stats.dailyStandardSalesNeeded} vendas por dia para seguir viva na meta.`;
  return `${stats.sellerName} destravou ${stats.medal}. Agora caca o ${stats.nextTier.label}.`;
}

function calculateSellerWarStats(sellerName: string, sales: SaleRecord[], month: MonthRange): SellerWarStats {
  const sellerSales = sales.filter((sale) => sale.sellerName === sellerName);
  const revenue = sellerMonthRevenue(sellerSales);
  const validSalesCount = sellerSales.length;
  const averageTicket = validSalesCount ? money(revenue / validSalesCount) : 0;
  const baseCommission = money(revenue * baseCommissionRate);
  const unlockedTier = getUnlockedTier(revenue);
  const nextTier = getNextTier(revenue);
  const unlockedBonus = unlockedTier?.bonus || 0;
  const projectedTotal = money(baseCommission + unlockedBonus);
  const missingToNext = nextTier ? Math.max(0, money(nextTier.target - revenue)) : 0;
  const projectedMonthEnd = calculateProjectedMonthEnd(revenue, Math.max(1, month.daysPassed), month.totalDays);
  const status = getWarRoomStatus(revenue, projectedMonthEnd, nextTier, month.daysRemaining);
  const safeDays = Math.max(1, month.daysRemaining || month.totalDays);
  const dailyRevenueNeeded = calculateDailyPace(missingToNext, safeDays);
  const weeklyRevenueNeeded = calculateWeeklyPace(missingToNext, safeDays);

  return {
    sellerName,
    revenue,
    validSalesCount,
    averageTicket,
    baseCommission,
    unlockedBonus,
    projectedTotal,
    medal: unlockedTier?.label || "Sem medalha",
    nextTier,
    missingToNext,
    progressToNext: nextTier ? calculateProgress(revenue, nextTier.target) : 100,
    standardSalesMissing: calculateStandardSalesMissing(missingToNext),
    rankingPosition: 0,
    gapToAbove: 0,
    standardSalesToOvertake: 0,
    gapToBelow: 0,
    dailyRevenueNeeded,
    dailyStandardSalesNeeded: calculateStandardSalesMissing(dailyRevenueNeeded),
    weeklyRevenueNeeded,
    weeklyStandardSalesNeeded: calculateStandardSalesMissing(weeklyRevenueNeeded),
    projectedMonthEnd,
    status
  };
}

function monthOptions() {
  const options: string[] = [];
  for (let year = 2026; year <= 2027; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      options.push(`${year}-${String(month).padStart(2, "0")}`);
    }
  }
  return options;
}

function buildWarRoomModel(sales: SaleRecord[], selectedMonth: string): WarRoomModel {
  const month = getMonthRange(selectedMonth);
  const validSales = getValidSalesForMonth(sales, month);
  const sellerNames = Array.from(new Set(["Rayany", "Elisangela", ...validSales.map((sale) => sale.sellerName).filter(Boolean)])).sort();
  const sellers = sellerNames
    .map((sellerName) => calculateSellerWarStats(sellerName, validSales, month))
    .sort((a, b) => b.revenue - a.revenue || b.validSalesCount - a.validSalesCount)
    .map((seller, index, list) => {
      const above = list[index - 1];
      const below = list[index + 1];
      const gapToAbove = above ? money(above.revenue - seller.revenue) : 0;
      const gapToBelow = below ? money(seller.revenue - below.revenue) : 0;
      return {
        ...seller,
        rankingPosition: index + 1,
        gapToAbove,
        standardSalesToOvertake: calculateStandardSalesMissing(gapToAbove + 1),
        gapToBelow
      };
    });

  const totalRevenue = money(validSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0));
  const totalBaseCommission = money(totalRevenue * baseCommissionRate);
  const totalBonus = money(sellers.reduce((sum, seller) => sum + seller.unlockedBonus, 0));
  const totalProjectedPayout = money(totalBaseCommission + totalBonus);
  const totalValidSales = validSales.length;
  const averageTicket = totalValidSales ? money(totalRevenue / totalValidSales) : 0;
  const dailyAverage = calculateDailyPace(totalRevenue, Math.max(1, month.daysPassed));
  const weeklyAverage = calculateWeeklyPace(totalRevenue, Math.max(1, month.daysPassed));
  const projectedMonthEnd = calculateProjectedMonthEnd(totalRevenue, Math.max(1, month.daysPassed), month.totalDays);
  const nextGeneralTier = getNextTier(totalRevenue);
  const missingToNextGeneralTier = nextGeneralTier ? Math.max(0, money(nextGeneralTier.target - totalRevenue)) : 0;
  const tierStats = goalTiers.map<TierWarStats>((tier) => {
    const missing = Math.max(0, money(tier.target - totalRevenue));
    const unlocked = totalRevenue >= tier.target;
    const next = nextGeneralTier?.label === tier.label;
    return {
      ...tier,
      standardSalesNeeded: calculateStandardSalesMissing(tier.target),
      dailyPace: calculateDailyPace(tier.target, month.totalDays),
      weeklyPace: calculateWeeklyPace(tier.target, month.totalDays),
      status: unlocked ? "desbloqueado" : next ? "proximo" : "bloqueado",
      missing
    };
  });

  const status = getWarRoomStatus(totalRevenue, projectedMonthEnd, nextGeneralTier, month.daysRemaining);
  const missionSeller = sellers
    .filter((seller) => seller.nextTier)
    .sort((a, b) => a.missingToNext - b.missingToNext)[0] || sellers[0] || null;
  const recentSales = [...validSales].sort((a, b) => saleDateValue(b).getTime() - saleDateValue(a).getTime()).slice(0, 8);

  return {
    month,
    validSales,
    sellers,
    podium: sellers.slice(0, 3),
    totalRevenue,
    totalBaseCommission,
    totalBonus,
    totalProjectedPayout,
    totalValidSales,
    averageTicket,
    dailyAverage,
    weeklyAverage,
    projectedMonthEnd,
    maxGoalProgress: calculateProgress(totalRevenue, goalTiers[goalTiers.length - 1].target),
    nextGeneralTier,
    missingToNextGeneralTier,
    standardSalesToNextGeneralTier: calculateStandardSalesMissing(missingToNextGeneralTier),
    status,
    tierStats,
    missionSeller,
    recentSales
  };
}

function WarRoomPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthKey);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loadSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sales?t=${Date.now()}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar vendas.");
      setSales((payload.sales ?? []) as SaleRecord[]);
      setLastSync(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const model = useMemo(() => buildWarRoomModel(sales, selectedMonth), [sales, selectedMonth]);

  return (
    <div className="relative space-y-5 pb-8">
      <WarRoomAtmosphere />
      <WarHeader model={model} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} onRefresh={loadSales} isLoading={isLoading} lastSync={lastSync} />
      <CentralCommand model={model} />
      <GoalLadder model={model} />
      <Podium model={model} />
      <SellerWarCards model={model} />
      <section className="grid gap-5 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <MissionOfDay model={model} />
        <RankingDuel model={model} />
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <VictoryFeed model={model} />
        <MedalsPanel />
      </section>
    </div>
  );
}

function WarRoomAtmosphere() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,.11),transparent_30%),radial-gradient(circle_at_90%_8%,rgba(168,85,247,.13),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,.08),transparent_34%)]" />
      <div className="absolute inset-0 opacity-[.025] [background-image:linear-gradient(rgba(248,250,252,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,.7)_1px,transparent_1px)] [background-size:42px_42px]" />
    </div>
  );
}

function WarHeader({ model, selectedMonth, onMonthChange, onRefresh, isLoading, lastSync }: { model: WarRoomModel; selectedMonth: string; onMonthChange: (value: string) => void; onRefresh: () => void; isLoading: boolean; lastSync: Date | null }) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#06101A]/88 p-5 shadow-[0_28px_110px_rgba(0,0,0,.36)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(34,211,238,.13),transparent_38%),radial-gradient(circle_at_92%_18%,rgba(251,191,36,.14),transparent_26%)]" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.20em] text-cyan-200">
            <Swords size={14} /> KAU War Room
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-[-.06em] text-white md:text-6xl">KAU War Room</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/78">Sala de Guerra de Metas, Podio e Bonificacoes.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <FieldShell label="Mes selecionado">
            <select value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-black/28 px-3 text-sm font-bold text-white outline-none [color-scheme:dark]">
              {monthOptions().map((monthKey) => <option key={monthKey} value={monthKey}>{getMonthRange(monthKey).label}</option>)}
            </select>
          </FieldShell>
          <button type="button" onClick={onRefresh} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-xs font-black uppercase tracking-[.12em] text-cyan-100 transition hover:bg-cyan-300/15">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Atualizar
          </button>
          <StatusPill status={model.status} />
        </div>
      </div>
      <div className="relative mt-5 flex flex-wrap gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5"><CalendarDays size={13} className="mr-1 inline" /> {model.month.label}</span>
        <span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5">{model.month.daysPassed}/{model.month.totalDays} dias passados</span>
        <span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5">{model.month.daysRemaining} dias restantes</span>
        {lastSync ? <span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5">sync {lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
      </div>
    </section>
  );
}

function CentralCommand({ model }: { model: WarRoomModel }) {
  const diamond = goalTiers[goalTiers.length - 1];
  const dailyToDiamond = calculateDailyPace(Math.max(0, diamond.target - model.totalRevenue), Math.max(1, model.month.daysRemaining || model.month.totalDays));
  const smartText = model.projectedMonthEnd >= diamond.target
    ? `No ritmo atual, a operacao fecha em ${formatCurrency(model.projectedMonthEnd)}: caminho de Diamante.`
    : `No ritmo atual, a operacao fecha em ${formatCurrency(model.projectedMonthEnd)}. Para Diamante, precisa acelerar ${formatCurrency(dailyToDiamond)}/dia.`;
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-cyan-300/15 bg-[#07111D]/90 p-5 shadow-[0_32px_130px_rgba(8,47,73,.20)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(34,211,238,.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,.06),transparent_55%)]" />
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="diamond"><Shield size={14} /> Comando central do mes</Badge>
            <Badge tone={model.status === "Atrasado" ? "risk" : model.status === "Em alerta" ? "gold" : "money"}>{model.status}</Badge>
          </div>
          <p className="mt-5 text-[13px] font-semibold uppercase tracking-[.20em] text-slate-500">Faturamento atual</p>
          <h2 className="mt-2 text-5xl font-black tracking-[-.08em] text-white md:text-7xl">{formatCurrency(model.totalRevenue)}</h2>
          <p className="mt-4 max-w-3xl text-lg font-semibold leading-7 text-slate-200">{smartText}</p>
          <p className="mt-2 text-sm leading-6 text-amber-200/90">War Room em alerta controlado: faltam {model.standardSalesToNextGeneralTier} vendas padrao para destravar {model.nextGeneralTier?.label || "o topo"}.</p>
          <ProgressBar progress={model.maxGoalProgress} tone="diamond" className="mt-6" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Comissao base 5%" value={formatCurrency(model.totalBaseCommission)} tone="money" />
          <Metric label="Bonus destravado" value={formatCurrency(model.totalBonus)} tone="gold" />
          <Metric label="Total previsto" value={formatCurrency(model.totalProjectedPayout)} tone="diamond" />
          <Metric label="Meta maxima" value={formatCurrency(diamond.target)} tone="purple" />
          <Metric label="Media diaria atual" value={formatCurrency(model.dailyAverage)} />
          <Metric label="Media diaria necessaria" value={formatCurrency(dailyToDiamond)} tone="gold" />
          <Metric label="Projecao final" value={formatCurrency(model.projectedMonthEnd)} tone={model.projectedMonthEnd >= diamond.target ? "money" : "risk"} />
          <Metric label="Media semanal" value={formatCurrency(model.weeklyAverage)} />
        </div>
      </div>
    </section>
  );
}

function GoalLadder({ model }: { model: WarRoomModel }) {
  return (
    <Panel>
      <SectionTitle icon={<ChevronUp size={18} />} eyebrow="Escada de metas" title="Degraus de medalha e bonus" />
      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {model.tierStats.map((tier) => <TierStep key={tier.label} tier={tier} />)}
      </div>
    </Panel>
  );
}

function TierStep({ tier }: { tier: TierWarStats }) {
  const tone = tierTone[tier.label];
  const icon = tier.label === "Diamante" ? <Gem size={22} /> : <Medal size={22} />;
  return (
    <div className={cn("relative min-h-[230px] overflow-hidden rounded-[28px] border p-4 transition duration-200", tone.border, tone.bg, tier.status === "proximo" && "animate-pulse", tier.status === "desbloqueado" && tone.glow)}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: tier.status === "bloqueado" ? "rgba(148,163,184,.22)" : undefined }} />
      <div className={cn("grid h-12 w-12 place-items-center rounded-2xl border", tone.border, tone.bg, tone.text)}>{icon}</div>
      <h3 className={cn("mt-4 text-2xl font-black tracking-[-.04em]", tone.text)}>{tier.label}</h3>
      <p className="mt-1 text-sm text-slate-300">{formatCurrency(tier.target)} libera +{formatCurrency(tier.bonus)}</p>
      <div className="mt-4 space-y-2 text-xs text-slate-400">
        <p>{tier.standardSalesNeeded} vendas padrao para a faixa</p>
        <p>{formatCurrency(tier.dailyPace)}/dia no mes</p>
        <p>{formatCurrency(tier.weeklyPace)}/semana</p>
      </div>
      <div className="mt-4">
        {tier.status === "desbloqueado" ? <Badge tone="money">Degrau desbloqueado</Badge> : tier.status === "proximo" ? <Badge tone="gold">Faltam {formatCurrency(tier.missing)} para liberar +{formatCurrency(tier.bonus)}</Badge> : <Badge tone="slate">Bloqueado</Badge>}
      </div>
      {tier.label === "Diamante" && tier.status === "desbloqueado" ? <p className="mt-3 text-xs font-bold text-cyan-100">Diamante conquistado.</p> : null}
    </div>
  );
}

function Podium({ model }: { model: WarRoomModel }) {
  const slots = [model.podium[1], model.podium[0], model.podium[2]];
  const heights = ["min-h-[190px]", "min-h-[250px]", "min-h-[160px]"];
  const places = [2, 1, 3];
  return (
    <Panel>
      <SectionTitle icon={<Trophy size={18} />} eyebrow="Podio dos vendedores" title="Quem esta vencendo agora" />
      <div className="mt-5 grid items-end gap-4 md:grid-cols-3">
        {slots.map((seller, index) => seller ? <PodiumSlot key={seller.sellerName} seller={seller} place={places[index]} height={heights[index]} /> : <EmptyPodium key={index} place={places[index]} height={heights[index]} />)}
      </div>
    </Panel>
  );
}

function PodiumSlot({ seller, place, height }: { seller: SellerWarStats; place: number; height: string }) {
  const tone = tierTone[seller.medal];
  return (
    <div className={cn("relative overflow-hidden rounded-[30px] border p-5 text-center", height, tone.border, tone.bg, place === 1 && "shadow-[0_0_70px_rgba(251,191,36,.16)]")}>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-white/[.06] text-2xl font-black text-white">{place}</div>
      <h3 className="mt-4 text-2xl font-black tracking-[-.04em] text-white">{seller.sellerName}</h3>
      <p className={cn("mt-2 text-sm font-bold", tone.text)}>{seller.medal}</p>
      <div className="mt-4 grid gap-2 text-sm text-slate-300">
        <span>{formatCurrency(seller.revenue)}</span>
        <span>{seller.validSalesCount} vendas validas</span>
        <span>Bonus {formatCurrency(seller.unlockedBonus)}</span>
        <span>Total {formatCurrency(seller.projectedTotal)}</span>
      </div>
      <p className="mt-4 text-xs text-slate-400">{seller.nextTier ? `Faltam ${formatCurrency(seller.missingToNext)} para ${seller.nextTier.label}` : "Topo conquistado"}</p>
    </div>
  );
}

function EmptyPodium({ place, height }: { place: number; height: string }) {
  return <div className={cn("grid place-items-center rounded-[30px] border border-dashed border-white/10 bg-white/[.025] p-5 text-slate-500", height)}>#{place} pronto para novo vendedor</div>;
}

function SellerWarCards({ model }: { model: WarRoomModel }) {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      {model.sellers.map((seller) => <SellerWarCard key={seller.sellerName} seller={seller} month={model.month} />)}
    </section>
  );
}

function SellerWarCard({ seller, month }: { seller: SellerWarStats; month: MonthRange }) {
  const tone = tierTone[seller.medal];
  return (
    <article className={cn("relative overflow-hidden rounded-[34px] border bg-[#07111D]/88 p-5", tone.border, tone.glow)}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.055),transparent_58%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone={seller.medal === "Diamante" ? "diamond" : seller.medal === "Ouro" ? "gold" : "slate"}>#{seller.rankingPosition} no ranking</Badge>
          <h3 className="mt-4 text-3xl font-black tracking-[-.055em] text-white">{seller.sellerName}</h3>
          <p className={cn("mt-1 text-sm font-bold", tone.text)}>{seller.medal}</p>
        </div>
        <StatusPill status={seller.status} />
      </div>
      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Faturamento" value={formatCurrency(seller.revenue)} tone="money" />
        <Metric label="Vendas validas" value={String(seller.validSalesCount)} />
        <Metric label="Ticket medio" value={formatCurrency(seller.averageTicket)} />
        <Metric label="Comissao base" value={formatCurrency(seller.baseCommission)} tone="money" />
        <Metric label="Bonus" value={formatCurrency(seller.unlockedBonus)} tone="gold" />
        <Metric label="Total previsto" value={formatCurrency(seller.projectedTotal)} tone="diamond" />
      </div>
      <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-slate-500">Proxima meta</p>
            <p className="mt-1 text-lg font-black text-white">{seller.nextTier ? seller.nextTier.label : "Diamante defendido"}</p>
          </div>
          <p className="text-right text-sm font-bold text-amber-200">{seller.nextTier ? `${formatCurrency(seller.missingToNext)} faltando` : "Missao completa"}</p>
        </div>
        <ProgressBar progress={seller.progressToNext} tone={seller.medal === "Diamante" ? "diamond" : "gold"} className="mt-4" />
        <div className="mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-3">
          <span>{seller.standardSalesMissing} vendas padrao faltam</span>
          <span>{seller.dailyStandardSalesNeeded} vendas/dia</span>
          <span>{seller.weeklyStandardSalesNeeded} vendas/semana</span>
        </div>
      </div>
      <p className="relative mt-4 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-semibold leading-6 text-slate-200">{sellerMessage(seller)}</p>
      <div className="relative mt-4 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
        <span>{seller.gapToAbove ? `Faltam ${formatCurrency(seller.gapToAbove)} para virar o jogo.` : "Defendendo a lideranca."}</span>
        <span>{seller.gapToBelow ? `Abre ${formatCurrency(seller.gapToBelow)} do vendedor abaixo.` : "Sem ameaca abaixo no momento."}</span>
        <span>{month.daysRemaining} dias restantes no mes</span>
        <span>Projecao: {formatCurrency(seller.projectedMonthEnd)}</span>
      </div>
    </article>
  );
}

function MissionOfDay({ model }: { model: WarRoomModel }) {
  const seller = model.missionSeller;
  const diamond = goalTiers[goalTiers.length - 1];
  const dailyToDiamond = calculateDailyPace(Math.max(0, diamond.target - model.totalRevenue), Math.max(1, model.month.daysRemaining || model.month.totalDays));
  return (
    <Panel>
      <SectionTitle icon={<Target size={18} />} eyebrow="Missao do dia" title="Prioridade operacional" />
      {seller ? (
        <div className="mt-5 rounded-[28px] border border-amber-300/20 bg-amber-300/10 p-5">
          <Badge tone="gold"><Flame size={14} /> Em caca</Badge>
          <h3 className="mt-4 text-2xl font-black tracking-[-.04em] text-white">Foco em {seller.sellerName}</h3>
          <p className="mt-2 text-base font-semibold leading-7 text-slate-200">
            Faltam {formatCurrency(seller.missingToNext)} para liberar {seller.nextTier?.label || "Diamante"}. Com ticket padrao de {formatCurrency(standardTicket)}, faltam {seller.standardSalesMissing} vendas.
          </p>
          <p className="mt-3 text-sm text-amber-100">War Room em alerta: a operacao precisa de {formatCurrency(dailyToDiamond)}/dia para Diamante.</p>
        </div>
      ) : <p className="mt-5 text-slate-400">Sem vendas validas no mes selecionado. A primeira venda acende a missao.</p>}
    </Panel>
  );
}

function RankingDuel({ model }: { model: WarRoomModel }) {
  const [leader, chaser] = model.sellers;
  return (
    <Panel>
      <SectionTitle icon={<Swords size={18} />} eyebrow="Ranking / duelo" title="Placar de virada" />
      <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10">
        {model.sellers.map((seller) => (
          <div key={seller.sellerName} className="grid gap-3 border-b border-white/10 bg-white/[.025] p-4 last:border-b-0 md:grid-cols-[60px_1fr_repeat(5,auto)] md:items-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.045] text-lg font-black text-white">#{seller.rankingPosition}</span>
            <div><p className="font-black text-white">{seller.sellerName}</p><p className="text-xs text-slate-500">{seller.medal}</p></div>
            <Tiny label="Fatur." value={formatCurrency(seller.revenue)} />
            <Tiny label="Vendas" value={String(seller.validSalesCount)} />
            <Tiny label="Comissao" value={formatCurrency(seller.baseCommission)} />
            <Tiny label="Bonus" value={formatCurrency(seller.unlockedBonus)} />
            <Tiny label="Total" value={formatCurrency(seller.projectedTotal)} />
          </div>
        ))}
      </div>
      {leader && chaser ? <p className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100">{leader.sellerName} lidera por {formatCurrency(leader.revenue - chaser.revenue)}. {chaser.sellerName} precisa de {calculateStandardSalesMissing(leader.revenue - chaser.revenue + 1)} vendas padrao para virar. Virada possivel.</p> : null}
    </Panel>
  );
}

function VictoryFeed({ model }: { model: WarRoomModel }) {
  const statsBySeller = new Map(model.sellers.map((seller) => [seller.sellerName, seller]));
  return (
    <Panel>
      <SectionTitle icon={<Activity size={18} />} eyebrow="Feed de vitorias" title="Ultimas vendas validas" />
      <div className="mt-5 space-y-3">
        {model.recentSales.length ? model.recentSales.map((sale) => {
          const amount = Number(sale.totalAmount || 0);
          const stats = statsBySeller.get(sale.sellerName);
          return (
            <div key={sale.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-bold text-white">{sale.customerName || "Cliente"} <span className="text-slate-500">por {sale.sellerName}</span></p>
                <p className="mt-1 text-xs text-slate-400">Venda valida adicionada ao campo de batalha. +{formatCurrency(amount * baseCommissionRate)} de comissao base.</p>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-300">+{formatCurrency(amount)}</p>
                <p className="text-xs text-slate-500">rumo ao {stats?.nextTier?.label || "Diamante"}</p>
              </div>
            </div>
          );
        }) : <p className="rounded-2xl border border-white/10 bg-white/[.025] p-4 text-sm text-slate-400">Nenhuma venda valida no mes selecionado.</p>}
      </div>
    </Panel>
  );
}

function MedalsPanel() {
  const medals: TierLabel[] = ["Sem medalha", "Bronze", "Prata", "Ouro", "Diamante"];
  return (
    <Panel>
      <SectionTitle icon={<Award size={18} />} eyebrow="Medalhas e conquistas" title="Status de performance" />
      <div className="mt-5 grid gap-3">
        {medals.map((medal) => (
          <div key={medal} className={cn("flex items-center justify-between gap-3 rounded-2xl border p-3", tierTone[medal].border, tierTone[medal].bg)}>
            <div className="flex items-center gap-3">
              <span className={cn("grid h-10 w-10 place-items-center rounded-xl border", tierTone[medal].border, tierTone[medal].text)}>{medal === "Diamante" ? <Gem size={18} /> : <Medal size={18} />}</span>
              <div><p className="font-bold text-white">{medal}</p><p className="text-xs text-slate-500">{medal === "Sem medalha" ? "Em caca" : medal === "Diamante" ? "Ritmo de guerra" : "Meta destravada"}</p></div>
            </div>
            <Badge tone={medal === "Diamante" ? "diamond" : medal === "Ouro" ? "gold" : "slate"}>{medal === "Sem medalha" ? "proximo nivel" : "bonus ativo"}</Badge>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#07111D]/82 p-5 shadow-[0_22px_90px_rgba(0,0,0,.24)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.20),transparent)]" />
      <div className="relative">{children}</div>
    </section>
  );
}

function SectionTitle({ icon, eyebrow, title }: { icon: ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.20em] text-cyan-200">{icon}{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-.045em] text-white">{title}</h2>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: string; tone?: "money" | "gold" | "diamond" | "purple" | "risk" | "slate" }) {
  const color = tone === "money" ? "text-emerald-300" : tone === "gold" ? "text-amber-300" : tone === "diamond" ? "text-cyan-200" : tone === "purple" ? "text-violet-300" : tone === "risk" ? "text-rose-300" : "text-white";
  return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{label}</p><p className={cn("mt-2 truncate text-xl font-black tracking-[-.035em]", color)}>{value}</p></div>;
}

function Tiny({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-bold text-slate-200">{value}</p></div>;
}

function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "money" | "gold" | "diamond" | "purple" | "risk" | "slate" }) {
  const classes =
    tone === "money" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" :
    tone === "gold" ? "border-amber-300/25 bg-amber-400/10 text-amber-200" :
    tone === "diamond" ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100" :
    tone === "purple" ? "border-violet-300/25 bg-violet-400/10 text-violet-200" :
    tone === "risk" ? "border-rose-300/25 bg-rose-400/10 text-rose-200" :
    "border-white/10 bg-white/[.04] text-slate-300";
  return <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[.14em]", classes)}>{children}</span>;
}

function StatusPill({ status }: { status: WarStatus }) {
  const tone = statusTone[status];
  return <span className={cn("inline-flex h-12 items-center justify-center rounded-2xl border px-4 text-xs font-black uppercase tracking-[.12em]", tone.border, tone.bg, tone.text)}><Zap size={14} className="mr-2" />{status}</span>;
}

function ProgressBar({ progress, tone = "diamond", className }: { progress: number; tone?: "diamond" | "gold" | "money"; className?: string }) {
  const fill = tone === "gold" ? "bg-[linear-gradient(90deg,#F59E0B,#FBBF24)]" : tone === "money" ? "bg-[linear-gradient(90deg,#10B981,#34D399)]" : "bg-[linear-gradient(90deg,#38BDF8,#22D3EE,#FBBF24)]";
  return <div className={cn("h-3 overflow-hidden rounded-full bg-white/[.07]", className)}><div className={cn("h-full rounded-full transition-all duration-700", fill)} style={{ width: `${Math.max(3, Math.min(100, progress))}%` }} /></div>;
}

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{label}</span>{children}</label>;
}
