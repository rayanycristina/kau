"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Download,
  Edit3,
  Radio,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaleRecord } from "@/data/sales-types";
import { getSaleFinancialState } from "@/data/sale-financial-state";

type Period = "today" | "week" | "month";
type Cadence = "morning" | "afternoon" | "night" | "all";
type SellerKey = "rayany" | "elisangela";
type Tone = "rayany" | "elisangela" | "money" | "amber" | "risk" | "slate";
type OperationMood = "cold" | "pressure" | "active" | "attack" | "protected";

type SellerStats = {
  key: SellerKey;
  name: string;
  commissionRate: number;
  commission: number;
  revenue: number;
  sales: number;
  goalCommission: number;
  goalRevenue: number;
  progress: number;
  missingCommission: number;
  missingRevenue: number;
  minimumSalesRemaining: number;
  contributionShare: number;
  status: string;
};

type CadenceStats = {
  id: Cadence | "week" | "month";
  label: string;
  sales: number;
  rayanySales: number;
  elisangelaSales: number;
  revenue: number;
  commission: number;
  strongestSeller: string;
  status: string;
  tone: Tone;
  heat: number;
};

type ArenaMovement = {
  id: string;
  seller: string;
  key: SellerKey;
  amount: number;
  commission: number;
  period: string;
  message: string;
  time: string;
};

type ArenaViewModel = {
  period: Period;
  cadence: Cadence;
  periodRows: SaleRecord[];
  periodRowsAllCadences: SaleRecord[];
  periodName: string;
  selectedCadenceName: string;
  operationRevenue: number;
  operationCommission: number;
  selectedRevenue: number;
  selectedCommission: number;
  goalCommission: number;
  goalRevenue: number;
  progress: number;
  missingCommission: number;
  missingRevenue: number;
  minimumSalesRemaining: number;
  projectedCommission: number;
  paceGap: number;
  mood: OperationMood;
  moodLabel: string;
  moodMessage: string;
  moodTone: Tone;
  isCadenceStopped: boolean;
  latestSaleAt: Date | null;
  minutesSinceLastSale: number | null;
  sellers: SellerStats[];
  leader: SellerStats;
  chaser: SellerStats;
  leadershipGap: number;
  flipSales: number;
  cadenceStats: CadenceStats[];
  bestCadence: CadenceStats;
  weakestCadence: CadenceStats;
  movements: ArenaMovement[];
  latestMovement: ArenaMovement | null;
  nextAction: string;
};

const REFRESH_MS = 3500;
const LOWEST_TICKET = 570;

const SELLERS: Record<SellerKey, { name: string; rate: number; weeklyCommissionGoal: number; monthlyCommissionGoal: number }> = {
  rayany: { name: "Rayany", rate: 0.15, weeklyCommissionGoal: 3000, monthlyCommissionGoal: 12000 },
  elisangela: { name: "Elisangela", rate: 0.05, weeklyCommissionGoal: 650, monthlyCommissionGoal: 2600 }
};

const PERIOD_OPTIONS: Period[] = ["today", "week", "month"];
const CADENCE_OPTIONS: Cadence[] = ["morning", "afternoon", "night", "all"];
const CADENCE_LABELS: Record<Cadence, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  night: "Noite",
  all: "Dia inteiro"
};

const toneStyles: Record<Tone, { text: string; border: string; bg: string; fill: string; shadow: string }> = {
  rayany: {
    text: "text-[#38BDF8]",
    border: "border-[#38BDF8]/30",
    bg: "bg-[#38BDF8]/10",
    fill: "bg-[#38BDF8]",
    shadow: "shadow-[0_0_32px_rgba(56,189,248,.18)]"
  },
  elisangela: {
    text: "text-[#FB7185]",
    border: "border-[#FB7185]/30",
    bg: "bg-[#FB7185]/10",
    fill: "bg-[#FB7185]",
    shadow: "shadow-[0_0_32px_rgba(251,113,133,.16)]"
  },
  money: {
    text: "text-[#22C55E]",
    border: "border-[#22C55E]/28",
    bg: "bg-[#22C55E]/10",
    fill: "bg-[#22C55E]",
    shadow: "shadow-[0_0_32px_rgba(34,197,94,.16)]"
  },
  amber: {
    text: "text-[#F59E0B]",
    border: "border-[#F59E0B]/28",
    bg: "bg-[#F59E0B]/10",
    fill: "bg-[#F59E0B]",
    shadow: "shadow-[0_0_32px_rgba(245,158,11,.14)]"
  },
  risk: {
    text: "text-[#F43F5E]",
    border: "border-[#F43F5E]/28",
    bg: "bg-[#F43F5E]/10",
    fill: "bg-[#F43F5E]",
    shadow: "shadow-[0_0_32px_rgba(244,63,94,.12)]"
  },
  slate: {
    text: "text-[#CBD5E1]",
    border: "border-white/[.09]",
    bg: "bg-white/[.035]",
    fill: "bg-[#64748B]",
    shadow: "shadow-[0_0_24px_rgba(148,163,184,.08)]"
  }
};

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function money(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function periodName(period: Period) {
  if (period === "today") return "Hoje";
  if (period === "month") return "Mês";
  return "Semana";
}

function sellerKeyFromName(name?: string): SellerKey | null {
  const value = String(name || "").toLowerCase();
  if (value.includes("rayany")) return "rayany";
  if (value.includes("elisangela")) return "elisangela";
  return null;
}

function dateFromSale(sale: SaleRecord) {
  const raw = sale.saleDate || sale.createdAt;
  const date = new Date(raw || Date.now());
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function timeFromSale(sale: SaleRecord) {
  if (sale.saleTime && sale.saleDate) {
    const date = new Date(`${sale.saleDate}T${sale.saleTime}:00`);
    if (Number.isFinite(date.getTime())) return date;
  }
  const raw = sale.saleDate?.includes("T") ? sale.saleDate : sale.createdAt || sale.saleDate;
  const date = new Date(raw || Date.now());
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function startOfToday(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(date = new Date()) {
  const copy = startOfToday(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  return copy;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function inRange(date: Date, start: Date, end: Date) {
  return Number.isFinite(date.getTime()) && date >= start && date <= end;
}

function cadenceFromHour(hour: number): Cadence {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "night";
}

function periodRange(period: Period, now = new Date()) {
  if (period === "today") return { start: startOfToday(now), end: now };
  if (period === "month") return { start: startOfMonth(now), end: now };
  return { start: startOfWeek(now), end: now };
}

function weekRange(now = new Date()) {
  return { start: startOfWeek(now), end: now };
}

function monthRange(now = new Date()) {
  return { start: startOfMonth(now), end: now };
}

function isConfirmedSale(sale: SaleRecord) {
  const state = getSaleFinancialState(sale);
  return Number(sale.totalAmount || 0) > 0 && sellerKeyFromName(sale.sellerName) !== null && state.countsRanking;
}

function revenueOf(rows: SaleRecord[]) {
  return money(rows.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0));
}

function commissionOf(rows: SaleRecord[]) {
  return money(
    rows.reduce((sum, sale) => {
      const key = sellerKeyFromName(sale.sellerName);
      return sum + Number(sale.totalAmount || 0) * (key ? SELLERS[key].rate : 0);
    }, 0)
  );
}

function rowsBySeller(rows: SaleRecord[], key: SellerKey) {
  return rows.filter((sale) => sellerKeyFromName(sale.sellerName) === key);
}

function operationMood(progress: number, sales: number, minutesSinceLastSale: number | null, projectedCommission: number, goalCommission: number) {
  const noRecentSale = minutesSinceLastSale === null || minutesSinceLastSale >= 120;
  if (progress >= 100) {
    return { mood: "protected" as OperationMood, label: "Meta protegida", message: "A operação venceu o período. Agora é expansão.", tone: "money" as Tone };
  }
  if (noRecentSale || sales === 0) {
    return { mood: "cold" as OperationMood, label: "Cadência parada", message: "1 venda reativa a operação.", tone: "risk" as Tone };
  }
  if (progress > 70 || sales >= 8) {
    return { mood: "attack" as OperationMood, label: "Zona de ataque", message: "A operação ganhou tração. Continue empurrando.", tone: "money" as Tone };
  }
  if (projectedCommission >= goalCommission * 0.7 || progress >= 30) {
    return { mood: "active" as OperationMood, label: "Operação em movimento", message: "A meta reagiu, mas ainda exige ritmo.", tone: "rayany" as Tone };
  }
  return { mood: "pressure" as OperationMood, label: "Meta em risco", message: "O ritmo atual ainda não protege a meta.", tone: "amber" as Tone };
}

function cadenceStatus(rows: SaleRecord[], id: Cadence | "week" | "month") {
  if (!rows.length) return { label: id === "night" ? "Decisiva" : "Travada", tone: "risk" as Tone, heat: 8 };
  if (rows.length >= 8) return { label: "Excelente", tone: "money" as Tone, heat: 100 };
  if (rows.length >= 5) return { label: "Bom", tone: "rayany" as Tone, heat: 72 };
  if (rows.length >= 3) return { label: "Reagindo", tone: "amber" as Tone, heat: 48 };
  return { label: "Baixo", tone: "amber" as Tone, heat: 26 };
}

function salesArenaModel(sales: SaleRecord[], period: Period, cadence: Cadence): ArenaViewModel {
  const now = new Date();
  const range = periodRange(period, now);
  const selectedGoalRange = period === "month" ? monthRange(now) : weekRange(now);
  const week = weekRange(now);
  const month = monthRange(now);
  const allConfirmed = sales.filter(isConfirmedSale);
  const periodRowsAllCadences = allConfirmed.filter((sale) => inRange(dateFromSale(sale), range.start, range.end));
  const periodRows = cadence === "all" ? periodRowsAllCadences : periodRowsAllCadences.filter((sale) => cadenceFromHour(timeFromSale(sale).getHours()) === cadence);
  const goalRows = allConfirmed.filter((sale) => inRange(dateFromSale(sale), selectedGoalRange.start, selectedGoalRange.end));
  const weekRows = allConfirmed.filter((sale) => inRange(dateFromSale(sale), week.start, week.end));
  const monthRows = allConfirmed.filter((sale) => inRange(dateFromSale(sale), month.start, month.end));
  const goalKey = period === "month" ? "monthlyCommissionGoal" : "weeklyCommissionGoal";

  const goalCommission = money(SELLERS.rayany[goalKey] + SELLERS.elisangela[goalKey]);
  const goalRevenue = money(SELLERS.rayany[goalKey] / SELLERS.rayany.rate + SELLERS.elisangela[goalKey] / SELLERS.elisangela.rate);
  const operationRevenue = revenueOf(goalRows);
  const operationCommission = commissionOf(goalRows);
  const selectedRevenue = revenueOf(periodRows);
  const selectedCommission = commissionOf(periodRows);
  const progress = goalCommission ? Math.min(150, Math.round((operationCommission / goalCommission) * 100)) : 0;
  const missingCommission = Math.max(0, money(goalCommission - operationCommission));
  const missingRevenue = Math.max(0, money(goalRevenue - operationRevenue));
  const minimumSalesRemaining = Math.max(0, Math.ceil(missingRevenue / LOWEST_TICKET));
  const dayOfPeriod = period === "month" ? Math.max(1, now.getDate()) : Math.max(1, Math.ceil((now.getTime() - startOfWeek(now).getTime()) / 86400000));
  const periodLength = period === "month" ? 30 : 7;
  const projectedCommission = money(operationCommission * (periodLength / dayOfPeriod));
  const paceGap = Math.max(0, money(goalCommission - projectedCommission));

  const orderedRows = [...periodRowsAllCadences].sort((a, b) => timeFromSale(b).getTime() - timeFromSale(a).getTime());
  const latestSaleAt = orderedRows[0] ? timeFromSale(orderedRows[0]) : null;
  const minutesSinceLastSale = latestSaleAt ? Math.max(0, Math.floor((now.getTime() - latestSaleAt.getTime()) / 60000)) : null;
  const mood = operationMood(progress, periodRowsAllCadences.length, minutesSinceLastSale, projectedCommission, goalCommission);

  const buildSeller = (key: SellerKey): SellerStats => {
    const selectedRows = rowsBySeller(periodRows, key);
    const goalSellerRows = rowsBySeller(goalRows, key);
    const sellerGoalCommission = SELLERS[key][goalKey];
    const sellerGoalRevenue = money(sellerGoalCommission / SELLERS[key].rate);
    const goalRevenueActual = revenueOf(goalSellerRows);
    const goalCommissionActual = money(goalRevenueActual * SELLERS[key].rate);
    const sellerProgress = sellerGoalCommission ? Math.min(150, Math.round((goalCommissionActual / sellerGoalCommission) * 100)) : 0;
    return {
      key,
      name: SELLERS[key].name,
      commissionRate: SELLERS[key].rate,
      commission: money(revenueOf(selectedRows) * SELLERS[key].rate),
      revenue: revenueOf(selectedRows),
      sales: selectedRows.length,
      goalCommission: sellerGoalCommission,
      goalRevenue: sellerGoalRevenue,
      progress: sellerProgress,
      missingCommission: Math.max(0, money(sellerGoalCommission - goalCommissionActual)),
      missingRevenue: Math.max(0, money(sellerGoalRevenue - goalRevenueActual)),
      minimumSalesRemaining: Math.max(0, Math.ceil(Math.max(0, sellerGoalRevenue - goalRevenueActual) / LOWEST_TICKET)),
      contributionShare: operationCommission > 0 ? Math.round((goalCommissionActual / operationCommission) * 100) : 0,
      status: sellerProgress >= 100 ? "meta protegida" : sellerProgress >= 60 ? "em tração" : selectedRows.length ? "em pressão" : "parada"
    };
  };

  const sellers = [buildSeller("rayany"), buildSeller("elisangela")].sort((a, b) => b.commission - a.commission);
  const leader = sellers[0];
  const chaser = sellers[1];
  const leadershipGap = money(Math.abs(leader.commission - chaser.commission));
  const flipSales = Math.max(1, Math.ceil(leadershipGap / (LOWEST_TICKET * Math.max(0.01, chaser.commissionRate))));

  const cadenceRows = (id: Cadence, source = periodRowsAllCadences) =>
    id === "all" ? source : source.filter((sale) => cadenceFromHour(timeFromSale(sale).getHours()) === id);

  const buildCadence = (id: Cadence | "week" | "month", label: string, source: SaleRecord[]): CadenceStats => {
    const rayanyRows = rowsBySeller(source, "rayany");
    const elisangelaRows = rowsBySeller(source, "elisangela");
    const strongestSeller = rayanyRows.length === elisangelaRows.length ? "Empate" : rayanyRows.length > elisangelaRows.length ? "Rayany" : "Elisangela";
    const status = cadenceStatus(source, id);
    return {
      id,
      label,
      sales: source.length,
      rayanySales: rayanyRows.length,
      elisangelaSales: elisangelaRows.length,
      revenue: revenueOf(source),
      commission: commissionOf(source),
      strongestSeller,
      status: status.label,
      tone: status.tone,
      heat: status.heat
    };
  };

  const cadenceStats = [
    buildCadence("morning", "Manhã", cadenceRows("morning")),
    buildCadence("afternoon", "Tarde", cadenceRows("afternoon")),
    buildCadence("night", "Noite", cadenceRows("night")),
    buildCadence("all", "Dia inteiro", periodRowsAllCadences),
    buildCadence("week", "Semana", weekRows),
    buildCadence("month", "Mês", monthRows)
  ];

  const bestCadence = [...cadenceStats].slice(0, 3).sort((a, b) => b.sales - a.sales)[0];
  const weakestCadence = [...cadenceStats].slice(0, 3).sort((a, b) => a.sales - b.sales)[0];

  const movements = [...periodRows]
    .sort((a, b) => timeFromSale(b).getTime() - timeFromSale(a).getTime())
    .slice(0, 8)
    .map<ArenaMovement>((sale) => {
      const key = sellerKeyFromName(sale.sellerName) || "rayany";
      const amount = money(Number(sale.totalAmount || 0));
      const commission = money(amount * SELLERS[key].rate);
      const cadenceId = cadenceFromHour(timeFromSale(sale).getHours());
      const message = key === leader.key ? `${SELLERS[key].name} puxou o avanço` : leadershipGap <= commission * 2 ? "Diferença caiu" : "Arena reagiu";
      return {
        id: sale.id,
        seller: SELLERS[key].name,
        key,
        amount,
        commission,
        period: CADENCE_LABELS[cadenceId],
        message,
        time: timeFromSale(sale).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
    });

  const nextAction = !movements.length
    ? "1 venda reativa a operação"
    : weakestCadence.sales === 0
      ? `${weakestCadence.label} travada. 1 venda reacende o ritmo.`
      : paceGap > 0
        ? `Recuperar ${brl(paceGap)} de comissão projetada.`
        : `${leader.name} puxa a operação. Manter pressão.`;

  return {
    period,
    cadence,
    periodRows,
    periodRowsAllCadences,
    periodName: periodName(period),
    selectedCadenceName: CADENCE_LABELS[cadence],
    operationRevenue,
    operationCommission,
    selectedRevenue,
    selectedCommission,
    goalCommission,
    goalRevenue,
    progress,
    missingCommission,
    missingRevenue,
    minimumSalesRemaining,
    projectedCommission,
    paceGap,
    mood: mood.mood,
    moodLabel: mood.label,
    moodMessage: mood.message,
    moodTone: mood.tone,
    isCadenceStopped: minutesSinceLastSale === null || minutesSinceLastSale >= 120,
    latestSaleAt,
    minutesSinceLastSale,
    sellers,
    leader,
    chaser,
    leadershipGap,
    flipSales,
    cadenceStats,
    bestCadence,
    weakestCadence,
    movements,
    latestMovement: movements[0] || null,
    nextAction
  };
}

export function SalesArenaScreen() {
  return <SalesArenaPage />;
}

function SalesArenaPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [period, setPeriod] = useState<Period>("week");
  const [cadence, setCadence] = useState<Cadence>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncOnline, setIsSyncOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [isGoalsEditorOpen, setIsGoalsEditorOpen] = useState(false);

  const loadArena = useCallback(async () => {
    try {
      const response = await fetch(`/api/sales?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("sync failed");
      const payload = await response.json().catch(() => ({}));
      const nextSales = (payload.sales ?? []) as SaleRecord[];
      setSales((previous) => {
        const previousSignature = previous.map((sale) => `${sale.id}:${sale.updatedAt || sale.createdAt}:${sale.totalAmount}:${sale.paymentStatus}`).join("|");
        const nextSignature = nextSales.map((sale) => `${sale.id}:${sale.updatedAt || sale.createdAt}:${sale.totalAmount}:${sale.paymentStatus}`).join("|");
        if (previous.length && previousSignature !== nextSignature) setPulseKey((value) => value + 1);
        return nextSales;
      });
      setIsSyncOnline(true);
      setLastSync(new Date());
    } catch {
      setIsSyncOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArena();
    const timer = window.setInterval(() => void loadArena(), REFRESH_MS);
    const onFocus = () => void loadArena();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadArena();
    };
    const onSalesChanged = () => void loadArena();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("kau:sales-changed", onSalesChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("kau:sales-changed", onSalesChanged);
    };
  }, [loadArena]);

  const arena = useMemo(() => salesArenaModel(sales, period, cadence), [sales, period, cadence]);

  return (
    <div className="kau-unicorn-bg kau-enterprise-os relative min-h-full overflow-hidden text-[#F8FAFC]">
      <ArenaAtmosphere mood={arena.mood} />
      <div className="relative mx-auto grid max-w-[1600px] gap-6 px-4 pb-10 pt-4 lg:px-6">
        <ArenaHeader
          period={period}
          cadence={cadence}
          setPeriod={setPeriod}
          setCadence={setCadence}
          isLoading={isLoading}
          isSyncOnline={isSyncOnline}
          lastSync={lastSync}
          onRefresh={loadArena}
          onEditGoals={() => setIsGoalsEditorOpen(true)}
          onExport={() => exportCsv(arena.periodRows)}
        />

        <PressureStrip arena={arena} pulseKey={pulseKey} isSyncOnline={isSyncOnline} />

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7"><MetaPulse arena={arena} pulseKey={pulseKey} /></div>
          <div className="xl:col-span-5"><OperationStatus arena={arena} /></div>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7"><SellerContribution arena={arena} pulseKey={pulseKey} /></div>
          <div className="xl:col-span-5"><RankingCompact arena={arena} pulseKey={pulseKey} /></div>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8"><CadenceHeatmap arena={arena} pulseKey={pulseKey} /></div>
          <div className="xl:col-span-4"><LiveMovementFeed arena={arena} pulseKey={pulseKey} compact /></div>
        </div>

        <QuickActionPanel arena={arena} isSyncOnline={isSyncOnline} lastSync={lastSync} />
      </div>
      <GoalsEditor open={isGoalsEditorOpen} onClose={() => setIsGoalsEditorOpen(false)} />
    </div>
  );
}

function ArenaAtmosphere({ mood }: { mood: OperationMood }) {
  const moodLight = mood === "protected"
    ? "rgba(34,197,94,.18)"
    : mood === "attack"
      ? "rgba(56,189,248,.14)"
      : mood === "pressure"
        ? "rgba(245,158,11,.14)"
        : mood === "cold"
          ? "rgba(100,116,139,.10)"
          : "rgba(56,189,248,.10)";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#030507_0%,#070A0F_48%,#030507_100%)]" />
      <motion.div
        className="absolute left-[-18%] top-[-24%] h-[720px] w-[720px] rounded-full blur-3xl"
        style={{ background: moodLight }}
        animate={{ opacity: [0.34, 0.58, 0.34], scale: [1, 1.06, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 opacity-[.05] [background-image:linear-gradient(rgba(248,250,252,.10)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,.08)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="absolute inset-0 opacity-[.035]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.72'/%3E%3C/svg%3E\")" }} />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(248,250,252,.035),transparent)]" />
    </div>
  );
}

function ArenaHeader({
  period,
  cadence,
  setPeriod,
  setCadence,
  isLoading,
  isSyncOnline,
  lastSync,
  onRefresh,
  onEditGoals,
  onExport
}: {
  period: Period;
  cadence: Cadence;
  setPeriod: (period: Period) => void;
  setCadence: (cadence: Cadence) => void;
  isLoading: boolean;
  isSyncOnline: boolean;
  lastSync: Date | null;
  onRefresh: () => void;
  onEditGoals: () => void;
  onExport: () => void;
}) {
  return (
    <header className="kau-depth-shell kau-motion-in grid gap-5 overflow-hidden rounded-[30px] px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium tracking-[.20em] text-[#64748B]">
          <span className="rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1 text-[#CBD5E1]">KAU SALES ARENA</span>
          <StatusBadge tone={isSyncOnline ? "money" : "risk"}>{isSyncOnline ? "AO VIVO" : "SINCRONIZAÇÃO INTERROMPIDA"}</StatusBadge>
          <span>{lastSync ? `última leitura ${lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "aguardando leitura"}</span>
        </div>
        <h1 className="kau-number-hero mt-3 text-[34px] font-semibold leading-none text-[#F8FAFC] md:text-[50px]">KAU Sales Arena</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#94A3B8]">Cockpit premium de meta, cadência, ranking e movimento comercial em tempo real.</p>
      </div>
      <div className="grid gap-2 lg:justify-items-end">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((item) => <FilterButton key={item} active={period === item} onClick={() => setPeriod(item)}>{periodName(item)}</FilterButton>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {CADENCE_OPTIONS.map((item) => <FilterButton key={item} active={cadence === item} onClick={() => setCadence(item)}>{CADENCE_LABELS[item]}</FilterButton>)}
          <IconButton onClick={onRefresh}><RefreshCw size={14} className={cn(isLoading && "animate-spin")} /> Atualizar</IconButton>
          <IconButton onClick={onEditGoals}><Edit3 size={14} /> Metas</IconButton>
          <IconButton onClick={onExport}><Download size={14} /> Exportar</IconButton>
        </div>
      </div>
    </header>
  );
}

function PressureStrip({ arena, pulseKey, isSyncOnline }: { arena: ArenaViewModel; pulseKey: number; isSyncOnline: boolean }) {
  const progress = Math.max(1, Math.min(100, arena.progress));
  return (
    <section className="kau-depth-shell kau-hero-wow kau-motion-in kau-operational-pulse relative overflow-hidden rounded-[34px] p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(56,189,248,.55),rgba(34,197,94,.32),transparent)]" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-[#67E8F9]">leitura operacional</p>
          <p className="mt-1 text-lg font-semibold tracking-[-.035em] text-white">{arena.moodMessage}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-[11px] font-medium text-[#CBD5E1]">{arena.periodName} · {arena.selectedCadenceName}</span>
          <span className={cn("rounded-full border px-3 py-1.5 text-[11px] font-semibold", isSyncOnline ? "border-[#34D399]/20 bg-[#34D399]/10 text-[#34D399]" : "border-[#FB7185]/20 bg-[#FB7185]/10 text-[#FB7185]")}>{isSyncOnline ? "operação viva" : "sync interrompido"}</span>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1.1fr_.7fr_.8fr] lg:items-end">
        <div>
          <Label>faltam para bater</Label>
          <motion.p key={`missing-${arena.missingCommission}-${pulseKey}`} initial={{ opacity: .55, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 160, damping: 24 }} className="kau-number-hero mt-2 text-[48px] font-semibold leading-none text-[#F8FAFC] md:text-[72px]">
            {brl(arena.missingCommission)}
          </motion.p>
          <p className="mt-2 text-sm text-[#64748B]">{arena.missingRevenue > 0 ? `${brl(arena.missingRevenue)} em faturamento necessário` : "meta protegida no período"}</p>
        </div>
        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div><Label>pulso operacional</Label><p className="mt-1 text-xl font-semibold text-[#CBD5E1]">{arena.progress}% da meta</p></div>
            <StatusBadge tone={arena.moodTone}>{arena.moodLabel}</StatusBadge>
          </div>
          <GoalProgressBar progress={progress} pulseKey={pulseKey} tone={arena.moodTone} />
        </div>
        <div>
          <Label>vendas mínimas</Label>
          <p className="mt-1 text-[36px] font-semibold tracking-[-.06em] text-[#F8FAFC]">{arena.minimumSalesRemaining}</p>
          <p className="text-xs text-[#64748B]">ticket {brl(LOWEST_TICKET)}</p>
        </div>
        <div>
          <Label>ritmo</Label>
          <p className={cn("mt-1 text-2xl font-semibold tracking-[-.05em]", toneStyles[arena.moodTone].text)}>{arena.paceGap > 0 ? `${brl(arena.paceGap)} atrás` : "protegido"}</p>
          <p className="mt-1 text-xs text-[#64748B]">{isSyncOnline ? arena.moodMessage : "Supabase sem resposta agora"}</p>
        </div>
      </div>
    </section>
  );
}

function GoalProgressBar({ progress, pulseKey, tone }: { progress: number; pulseKey: number; tone: Tone }) {
  return (
    <div className="kau-progress-live relative h-14 overflow-hidden rounded-[20px] border border-white/[.10] bg-[#020409] shadow-[inset_0_1px_0_rgba(248,250,252,.08),0_18px_45px_rgba(0,0,0,.36)]">
      <div className="absolute inset-0 flex">
        {Array.from({ length: 24 }).map((_, index) => <span key={index} className="h-full flex-1 border-r border-white/[.035] last:border-r-0" />)}
      </div>
      <motion.div
        key={`bar-${pulseKey}`}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: .75, ease: [0.22, 1, 0.36, 1] }}
        className={cn("absolute inset-y-1 left-1 rounded-[14px]", tone === "risk" ? "bg-[linear-gradient(90deg,#F43F5E,#F59E0B)]" : tone === "amber" ? "bg-[linear-gradient(90deg,#F59E0B,#38BDF8)]" : "bg-[linear-gradient(90deg,#38BDF8,#22C55E)]", toneStyles[tone].shadow)}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(248,250,252,.28),transparent)]" />
      </motion.div>
      <div className="absolute inset-y-0 right-4 grid place-items-center text-[10px] font-medium tracking-[.20em] text-[#CBD5E1]/70">OPERATION PULSE</div>
    </div>
  );
}

function MetaPulse({ arena, pulseKey }: { arena: ArenaViewModel; pulseKey: number }) {
  const circumference = 2 * Math.PI * 82;
  const offset = circumference - (Math.min(arena.progress, 100) / 100) * circumference;
  return (
    <Panel className="min-h-[360px]">
      <PanelHeader eyebrow="META PULSE" title="Coração operacional" icon={<Target size={16} />} />
      <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr] md:items-center">
        <div className="relative mx-auto h-[260px] w-[260px]">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(103,232,249,.22),rgba(13,20,29,.36)_38%,transparent_72%)]" />
          <svg viewBox="0 0 220 220" className="absolute inset-0 h-full w-full rotate-[-90deg]">
            <circle cx="110" cy="110" r="82" fill="none" stroke="rgba(248,250,252,.10)" strokeWidth="16" />
            <circle cx="110" cy="110" r="82" fill="none" stroke="rgba(248,250,252,.05)" strokeWidth="2" strokeDasharray="2 12" />
            <motion.circle
              key={`orbit-${pulseKey}`}
              cx="110"
              cy="110"
              r="82"
              fill="none"
              stroke={arena.moodTone === "risk" ? "#F43F5E" : arena.moodTone === "amber" ? "#F59E0B" : "#38BDF8"}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: .9, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[64px] font-semibold leading-none tracking-[-.08em] text-[#F8FAFC]">{arena.progress}%</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[.22em] text-[#64748B]">da meta</p>
              <motion.p key={`pulse-${arena.operationCommission}-${pulseKey}`} initial={{ scale: .96, opacity: .6 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 text-lg font-semibold text-[#22C55E]">{brl(arena.operationCommission)}</motion.p>
            </div>
          </div>
        </div>
        <div className="grid gap-4">
          <DataLine label="Meta do período" value={brl(arena.goalCommission)} />
          <DataLine label="Comissão atual" value={brl(arena.operationCommission)} tone="money" />
          <DataLine label="Faltam" value={brl(arena.missingCommission)} tone={arena.missingCommission > 0 ? "amber" : "money"} dominant />
          <DataLine label="Faturamento necessário" value={brl(arena.missingRevenue)} />
          <DataLine label="Projeção operacional" value={brl(arena.projectedCommission)} tone={arena.projectedCommission >= arena.goalCommission ? "money" : "risk"} />
        </div>
      </div>
    </Panel>
  );
}

function OperationStatus({ arena }: { arena: ArenaViewModel }) {
  return (
    <Panel className="min-h-[360px]">
      <PanelHeader eyebrow="OPERATION STATUS" title={arena.moodLabel} icon={<Radio size={16} />} tone={arena.moodTone} />
      <div className="mt-6 space-y-5">
        <MissionLine label="Próxima ação" value={arena.nextAction} tone="amber" />
        <MissionLine label="Pressão agora" value={arena.leadershipGap > 0 ? `${arena.leader.name} lidera por ${brl(arena.leadershipGap)}` : "Ranking aberto. 1 venda muda o jogo."} />
        <MissionLine label="Cadência" value={arena.isCadenceStopped ? "Cadência parada há mais de 2h" : `${arena.bestCadence.label} puxa o ritmo. ${arena.weakestCadence.label} pede reação.`} tone={arena.isCadenceStopped ? "risk" : "rayany"} />
        <MissionLine label="Vendas para virar" value={`${arena.flipSales} vendas podem mudar a liderança`} />
      </div>
    </Panel>
  );
}

function SellerContribution({ arena, pulseKey }: { arena: ArenaViewModel; pulseKey: number }) {
  const ordered = [arena.sellers.find((seller) => seller.key === "rayany"), arena.sellers.find((seller) => seller.key === "elisangela")].filter(Boolean) as SellerStats[];
  return (
    <Panel>
      <PanelHeader eyebrow="CONTRIBUIÇÃO" title="Quem move a meta" icon={<Zap size={16} />} />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {ordered.map((seller) => <SellerPerformanceRow key={seller.key} seller={seller} pulseKey={pulseKey} leader={arena.leader.key === seller.key} />)}
      </div>
    </Panel>
  );
}

function SellerPerformanceRow({ seller, pulseKey, leader }: { seller: SellerStats; pulseKey: number; leader: boolean }) {
  const tone: Tone = seller.key === "rayany" ? "rayany" : "elisangela";
  return (
    <motion.div
      key={`${seller.key}-${seller.commission}-${pulseKey}`}
      initial={{ opacity: .62, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: .18, ease: "easeOut" }}
      className={cn("kau-hover-lift relative overflow-hidden rounded-[28px] border bg-[#0B1017]/82 p-5", toneStyles[tone].border, leader && toneStyles[tone].shadow)}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", seller.key === "rayany" ? "bg-[#38BDF8]" : "bg-[#FB7185]")} />
      <div className="flex items-start justify-between gap-4">
        <div><p className={cn("text-[12px] font-medium uppercase tracking-[.22em]", toneStyles[tone].text)}>{seller.name}</p><h3 className="mt-2 text-[34px] font-semibold leading-none tracking-[-.07em] text-[#F8FAFC]">{brl(seller.commission)}</h3></div>
        <StatusBadge tone={leader ? "money" : tone}>{leader ? "lidera" : seller.status}</StatusBadge>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/[.06]"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(3, Math.min(100, seller.progress))}%` }} transition={{ duration: .8 }} className={cn("h-full rounded-full", seller.key === "rayany" ? "bg-[#38BDF8]" : "bg-[#FB7185]")} /></div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[.07] pt-4">
        <SmallMetric label="Vendas" value={String(seller.sales)} />
        <SmallMetric label="Faturamento" value={brl(seller.revenue)} />
        <SmallMetric label="Contrib." value={`${seller.contributionShare}%`} />
        <SmallMetric label="Taxa" value={`${Math.round(seller.commissionRate * 100)}%`} />
        <SmallMetric label="Meta" value={`${seller.progress}%`} />
        <SmallMetric label="Faltam" value={brl(seller.missingCommission)} />
      </div>
    </motion.div>
  );
}

function RankingCompact({ arena, pulseKey }: { arena: ArenaViewModel; pulseKey: number }) {
  return (
    <Panel>
      <PanelHeader eyebrow="RANKING" title="Placar compacto" icon={<TrendingUp size={16} />} />
      <div className="mt-5 divide-y divide-white/[.07] overflow-hidden rounded-[24px] border border-white/[.08]">
        {arena.sellers.map((seller, index) => {
          const tone: Tone = seller.key === "rayany" ? "rayany" : "elisangela";
          return (
            <motion.div key={`${seller.key}-${pulseKey}`} initial={{ opacity: .7, x: 8 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 bg-[#0B1017]/76 px-4 py-4 transition duration-180 hover:bg-white/[.035]">
              <div className={cn("grid h-10 w-10 place-items-center rounded-2xl border font-semibold", toneStyles[tone].border, toneStyles[tone].text)}>{index + 1}</div>
              <div>
                <p className="font-semibold tracking-[-.03em] text-[#F8FAFC]">{seller.name}</p>
                <p className="mt-1 text-xs text-[#64748B]">{seller.progress}% meta · {seller.sales} vendas</p>
              </div>
              <div className="text-right">
                <p className={cn("font-semibold", toneStyles[tone].text)}>{brl(seller.commission)}</p>
                <p className="mt-1 text-[11px] text-[#64748B]">{seller.key === arena.leader.key ? "puxa" : `-${brl(arena.leadershipGap)}`}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#CBD5E1]"><span>Diferença atual</span><strong>{brl(arena.leadershipGap)}</strong></div>
    </Panel>
  );
}

function CadenceHeatmap({ arena, pulseKey }: { arena: ArenaViewModel; pulseKey: number }) {
  return (
    <Panel>
      <PanelHeader eyebrow="CADÊNCIA" title="Mapa de ritmo" icon={<Clock3 size={16} />} />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {arena.cadenceStats.map((item) => <CadenceCell key={`${item.id}-${pulseKey}`} item={item} />)}
      </div>
    </Panel>
  );
}

function CadenceCell({ item }: { item: CadenceStats }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: .18, ease: "easeOut" }} className="kau-hover-lift kau-motion-in relative overflow-hidden rounded-[24px] border border-white/[.08] bg-[#0B1017]/78 p-4">
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: item.tone === "money" ? "#22C55E" : item.tone === "rayany" ? "#38BDF8" : item.tone === "risk" ? "#F43F5E" : "#F59E0B" }} />
      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#F8FAFC]">{item.label}</p><p className="mt-1 text-xs text-[#64748B]">{item.strongestSeller} lidera</p></div><StatusBadge tone={item.tone}>{item.status}</StatusBadge></div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs"><SmallMetric label="Vendas" value={String(item.sales)} /><SmallMetric label="Comissão" value={brl(item.commission)} /><SmallMetric label="Fatur." value={brl(item.revenue)} /></div>
      <div className="mt-4 flex gap-1">{Array.from({ length: 12 }).map((_, index) => <span key={index} className={cn("h-2 flex-1 rounded-full", index < Math.ceil(item.heat / 8.34) ? toneStyles[item.tone].fill : "bg-white/[.06]")} />)}</div>
    </motion.div>
  );
}

function LiveMovementFeed({ arena, pulseKey, compact = false }: { arena: ArenaViewModel; pulseKey: number; compact?: boolean }) {
  return (
    <Panel className={compact ? "h-full" : ""}>
      <PanelHeader eyebrow="AO VIVO" title="Movimentos recentes" icon={<Activity size={16} />} />
      <div className="mt-5 space-y-3">
        <AnimatePresence initial={false}>
          {arena.movements.length ? arena.movements.slice(0, compact ? 5 : 8).map((move) => <MovementItem key={`${move.id}-${pulseKey}`} move={move} />) : <EmptyMovement />}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

function MovementItem({ move }: { move: ArenaMovement }) {
  const tone: Tone = move.key === "rayany" ? "rayany" : "elisangela";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .18, ease: "easeOut" }} className="grid grid-cols-[8px_1fr_auto] gap-3 border-b border-white/[.07] pb-3 transition duration-180 hover:bg-white/[.025] last:border-b-0 last:pb-0">
      <span className={cn("mt-1 h-8 rounded-full", toneStyles[tone].fill)} />
      <div><p className="font-medium text-[#F8FAFC]"><span className={toneStyles[tone].text}>{move.seller}</span> vendeu {brl(move.amount)}</p><p className="mt-1 text-xs text-[#64748B]">+{brl(move.commission)} · {move.period} · {move.message}</p></div>
      <p className="text-xs font-medium text-[#CBD5E1]">{move.time}</p>
    </motion.div>
  );
}

function QuickActionPanel({ arena, isSyncOnline, lastSync }: { arena: ArenaViewModel; isSyncOnline: boolean; lastSync: Date | null }) {
  return (
    <section className="kau-depth-shell kau-motion-in grid gap-4 rounded-[30px] p-5 md:grid-cols-[1.4fr_.6fr_.6fr_.6fr] md:items-center">
      <div className="flex items-start gap-3"><Sparkles className={toneStyles[arena.moodTone].text} size={18} /><div><Label>ação mais importante agora</Label><p className="mt-1 text-lg font-semibold tracking-[-.03em] text-[#F8FAFC]">{arena.nextAction}</p></div></div>
      <SmallMetric label="Filtro" value={`${arena.periodName} · ${arena.selectedCadenceName}`} />
      <SmallMetric label="Sincronização" value={isSyncOnline ? (lastSync ? lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "ativa") : "interrompida"} />
      <SmallMetric label="Ticket mínimo" value={brl(LOWEST_TICKET)} />
    </section>
  );
}

function EmptyMovement() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 rounded-[24px] border border-[#F59E0B]/20 bg-[#F59E0B]/7 p-4">
      <AlertTriangle className="mt-0.5 text-[#F59E0B]" size={18} />
      <div><p className="font-semibold text-[#F8FAFC]">Cadência parada.</p><p className="mt-1 text-sm text-[#64748B]">A primeira venda muda a tela, recalcula a meta e acende o feed.</p></div>
    </motion.div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("kau-panel-pro kau-motion-in kau-hover-lift relative overflow-hidden rounded-[32px] p-5", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(248,250,252,.16),transparent)]" />
      <div className="relative">{children}</div>
    </section>
  );
}

function PanelHeader({ eyebrow, title, icon, tone = "slate" }: { eyebrow: string; title: string; icon: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div><div className={cn("flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.22em]", toneStyles[tone].text)}>{icon}{eyebrow}</div><h2 className="kau-number-hero mt-2 text-2xl font-semibold text-[#F8FAFC]">{title}</h2></div>
    </div>
  );
}

function DataLine({ label, value, tone = "slate", dominant = false }: { label: string; value: string; tone?: Tone; dominant?: boolean }) {
  return <div className="flex items-end justify-between gap-4 border-b border-white/[.07] pb-3 last:border-0"><Label>{label}</Label><p className={cn("text-right font-semibold tracking-[-.04em]", dominant ? "text-3xl" : "text-xl", toneStyles[tone].text)}>{value}</p></div>;
}

function MissionLine({ label, value, tone = "slate" }: { label: string; value: string; tone?: Tone }) {
  return <div className="border-b border-white/[.07] pb-4 last:border-0"><Label>{label}</Label><p className={cn("mt-2 text-xl font-semibold tracking-[-.04em]", toneStyles[tone].text)}>{value}</p></div>;
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-[.17em] text-[#64748B]">{label}</p><p className="mt-1 truncate text-sm font-semibold tracking-[-.03em] text-[#CBD5E1]">{value}</p></div>;
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[.20em] text-[#64748B]">{children}</p>;
}

function StatusBadge({ children, tone }: { children: ReactNode; tone: Tone }) {
  return <span className={cn("kau-live-chip kau-status-breath inline-flex w-fit items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em]", toneStyles[tone].border, toneStyles[tone].bg, toneStyles[tone].text)}>{children}</span>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={cn("kau-filter-control rounded-full border px-3.5 py-2 text-xs font-medium transition duration-180 ease-out", active ? "border-[#38BDF8]/45 bg-[#38BDF8]/10 text-[#F8FAFC] shadow-[0_0_22px_rgba(56,189,248,.10)]" : "border-white/[.08] bg-white/[.025] text-[#94A3B8] hover:border-white/[.15] hover:bg-white/[.05] hover:text-[#F8FAFC]")}>{children}</button>;
}

function IconButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className="kau-filter-control inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.025] px-3.5 py-2 text-xs font-medium text-[#94A3B8] transition duration-180 ease-out hover:border-white/[.15] hover:bg-white/[.05] hover:text-[#F8FAFC]">{children}</button>;
}

function exportCsv(rows: SaleRecord[]) {
  const header = ["cliente", "vendedor", "valor_venda", "data", "status_pagamento"];
  const body = rows.map((sale) => [sale.customerName, sale.sellerName, String(sale.totalAmount || 0).replace(".", ","), sale.saleDate || sale.createdAt || "", sale.paymentStatus || ""]);
  const csv = [header, ...body].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kau-sales-arena-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function GoalsEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-xl rounded-[30px] border border-white/10 bg-[#0D141D] p-6 shadow-[0_40px_120px_rgba(0,0,0,.70)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 text-[#38BDF8]"><Target size={20} /><Label>Metas da Sales Arena</Label></div>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-.05em] text-[#F8FAFC]">Metas fixas da operação AlphaSin</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <GoalMetric label="Rayany semana" value={brl(SELLERS.rayany.weeklyCommissionGoal)} helper="15% sobre faturamento" tone="rayany" />
          <GoalMetric label="Rayany mês" value={brl(SELLERS.rayany.monthlyCommissionGoal)} helper="meta mensal de comissão" tone="rayany" />
          <GoalMetric label="Elisangela semana" value={brl(SELLERS.elisangela.weeklyCommissionGoal)} helper="5% sobre faturamento" tone="elisangela" />
          <GoalMetric label="Elisangela mês" value={brl(SELLERS.elisangela.monthlyCommissionGoal)} helper="meta mensal de comissão" tone="elisangela" />
        </div>
        <button onClick={onClose} className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs font-medium uppercase tracking-[.16em] text-white/70 transition hover:bg-white/[.08]">Fechar</button>
      </motion.div>
    </div>
  );
}

function GoalMetric({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: Tone }) {
  return <div className={cn("rounded-[24px] border p-4", toneStyles[tone].border, toneStyles[tone].bg)}><Label>{label}</Label><p className={cn("mt-2 text-2xl font-semibold tracking-[-.05em]", toneStyles[tone].text)}>{value}</p><p className="mt-1 text-xs text-[#64748B]">{helper}</p></div>;
}
