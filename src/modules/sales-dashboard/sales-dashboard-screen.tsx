"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  WalletCards,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/store/notification-store";
import { commissionPercentToRate, defaultSellers, normalizeCommissionPercent } from "@/data/sellers";
import { getSalesPlatform, salesPlatforms, type SalesPlatformId } from "@/data/sales-platforms";
import type { DeliveryStatus, OrderStatus, OrderTag, PaymentStatus, SaleInput, SaleRecord, SellerProfile } from "@/data/sales-types";
import { getSaleFinancialState, isValidSaleForMetrics, normalizeOrderStatus as normalizeOrderStatusCentral, saleVisualStatusLabel } from "@/data/sale-financial-state";

const inputClass = "w-full rounded-2xl border border-slate-400/[.115] bg-[#060A11]/88 px-3.5 py-3 text-sm font-medium tracking-[-.012em] text-slate-100 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition duration-[180ms] ease-out placeholder:text-slate-500 hover:border-slate-300/[.16] hover:bg-[#090F18]/92 focus:border-cyan/35 focus:bg-cyan/[.025] focus:shadow-[0_0_0_3px_rgba(24,215,255,.055),inset_0_1px_0_rgba(255,255,255,.05)] [color-scheme:dark] [&_option]:bg-[#050912] [&_option]:text-slate-100";
const labelClass = "mb-2 block text-[10px] font-medium uppercase tracking-[.14em] text-slate-400/68";
const sellerStorageKey = "kau:sellers:v1";
const ownerCommissionPercent = 10;
const ownerSellerName = "Rayany";

type SaleType = "pad" | "cod" | "advance";
type Tone = "money" | "cyan" | "purple" | "amber" | "danger" | "neutral";
type CashTab = "today" | "future";
type MovementView = "registered" | "cash";
type DrawerMode = "create" | "edit";
type PeriodMode = "today" | "3d" | "7d" | "30d" | "custom";

type SaleForm = Omit<SaleInput, "productName" | "quantity" | "totalAmount"> & {
  quantity: string;
  totalAmount: string;
  commissionPercent: string;
  saleType: SaleType;
  salePlatform: SalesPlatformId | "";
};

type ToastState = {
  title: string;
  message: string;
  tone: Exclude<Tone, "neutral">;
};

type CashWithdrawal = {
  id: string;
  amount: number;
  withdrawnAt: string;
  note?: string;
  saleIds?: string[];
  createdAt?: string;
};

type WithdrawalForm = {
  amount: string;
  withdrawnAt: string;
  note: string;
};

type CashMovementRow = {
  id: string;
  date: string;
  kind: "entry" | "withdrawal";
  description: string;
  order: string;
  movement: string;
  amount: number;
  fee: number;
  net: number;
  status: string;
  sale?: SaleRecord;
  withdrawal?: CashWithdrawal;
  linkedSales?: SaleRecord[];
};

const initialSaleForm: SaleForm = {
  customerName: "",
  customerPhone: "",
  city: "",
  quantity: "1",
  totalAmount: "",
  sellerName: "Gabriel Moreira",
  commissionPercent: "5",
  saleType: "pad",
  salePlatform: "",
  paymentMethod: "PAD",
  paymentStatus: "pending",
  saleDate: todayKey(),
  saleTime: new Date().toTimeString().slice(0, 5),
  receivedDate: "",
  paymentDate: "",
  deliveryType: "PAD - Correios",
  deliveryStatus: "scheduled",
  orderStatus: "active",
  orderTags: [],
  orderStatusNote: "",
  expectedPaymentDate: "",
  notes: ""
};

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}

function parseMoney(value: string | number | undefined) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/R\$|\s/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return todayKey(date);
}

function addBusinessDaysFromKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return todayKey(date);
}

function addBusinessDays(days: number) {
  return addBusinessDaysFromKey(todayKey(), days);
}

function saleTypeLabel(deliveryType?: string, paymentStatus?: PaymentStatus) {
  const type = String(deliveryType || "").toUpperCase();
  const payment = String(paymentStatus || "").toUpperCase();
  if (type.includes("PAD")) return "PAD";
  if (type.includes("COD") || payment === "COD") return "COD";
  return "ANTECIPADO";
}
function platformFromRecord(item: SaleRecord) {
  return getSalesPlatform(item.salePlatform);
}

function platformLabel(item: SaleRecord) {
  return platformFromRecord(item)?.name || "Sem plataforma";
}


function saleTypeFromRecord(item: SaleRecord): SaleType {
  const label = saleTypeLabel(item.deliveryType, item.paymentStatus as PaymentStatus);
  if (label === "PAD") return "pad";
  if (label === "COD") return "cod";
  return "advance";
}

function formatDate(date?: string) {
  if (!date) return "Sem data";
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatShortDate(date?: string) {
  if (!date) return "Sem data";
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isDateInRange(dateKey: string | undefined, start: string, end: string) {
  if (!dateKey) return false;
  const key = String(dateKey).slice(0, 10);
  return key >= start && key <= end;
}

function periodRange(mode: PeriodMode, anchorDate: string, customStart: string, customEnd: string) {
  if (mode === "custom") {
    const start = customStart || anchorDate;
    const end = customEnd || start;
    return start <= end ? { start, end } : { start: end, end: start };
  }
  if (mode === "3d") return { start: addDaysToKey(anchorDate, -2), end: anchorDate };
  if (mode === "7d") return { start: addDaysToKey(anchorDate, -6), end: anchorDate };
  if (mode === "30d") return { start: addDaysToKey(anchorDate, -29), end: anchorDate };
  return { start: anchorDate, end: anchorDate };
}

function periodLabel(mode: PeriodMode, start: string, end: string) {
  if (start === end) return formatDate(end);
  const prefix = mode === "3d" ? "Últimos 3 dias" : mode === "7d" ? "Últimos 7 dias" : mode === "30d" ? "Últimos 30 dias" : "Período personalizado";
  return `${prefix} · ${formatShortDate(start)} até ${formatShortDate(end)}`;
}

function plural(count: number, singular: string, pluralText?: string) {
  return `${count} ${count === 1 ? singular : pluralText ?? `${singular}s`}`;
}

function loadSellers() {
  if (typeof window === "undefined") return defaultSellers;
  const stored = localStorage.getItem(sellerStorageKey);
  if (!stored) {
    localStorage.setItem(sellerStorageKey, JSON.stringify(defaultSellers));
    return defaultSellers;
  }
  try {
    const parsed = JSON.parse(stored) as SellerProfile[];
    return parsed.length ? parsed : defaultSellers;
  } catch {
    return defaultSellers;
  }
}

function isOwnerSeller(name?: string) {
  return String(name || "").toLowerCase().includes(ownerSellerName.toLowerCase());
}

function ownerCommissionForSale(item: SaleRecord) {
  if (isFinanciallyBlocked(item)) return 0;
  const base = item.totalAmount || 0;
  const percent = isOwnerSeller(item.sellerName) ? (item.commissionRate || 15) : ownerCommissionPercent;
  return Math.round(base * (percent / 100) * 100) / 100;
}

function subCommissionForSale(item: SaleRecord) {
  if (isFinanciallyBlocked(item)) return 0;
  if (isOwnerSeller(item.sellerName)) return 0;
  const base = item.totalAmount || 0;
  // Regra operacional fixa: venda feita por vendedora gera 5% a repassar.
  // Não usar item.commissionAmount como fonte única porque vendas antigas podem ter sido gravadas com taxa diferente.
  return Math.round(base * 0.05 * 100) / 100;
}

function isPaidSale(item: SaleRecord) {
  return getSaleFinancialState(item).countsCash;
}

function operationCashValueForSale(item: SaleRecord) {
  if (isFinanciallyBlocked(item)) return 0;
  const base = item.totalAmount || 0;
  // REGRA CRÍTICA: o caixa/carteira/líquido representa a comissão TOTAL da operação.
  // Mesmo em venda da Elisangela, Rayany recebe 15% no caixa e depois separa 5% para repassar.
  // Por isso vendas antigas e novas devem sempre calcular entrada de caixa como 15% do valor da venda.
  return Math.round(base * 0.15 * 100) / 100;
}

function ownerWalletValueForSale(item: SaleRecord) {
  return operationCashValueForSale(item);
}

function ownerCashForSale(item: SaleRecord) {
  return isPaidSale(item) ? ownerWalletValueForSale(item) : 0;
}

function cashDateForSale(item: SaleRecord) {
  if (!isPaidSale(item)) return undefined;
  return item.paymentDate || item.receivedDate || item.expectedPaymentDate || item.saleDate || String(item.createdAt || "").slice(0, 10);
}

function saleOrderNumber(item: SaleRecord) {
  return String(item.id || "").slice(0, 8).toUpperCase();
}

function operationCommissionForSale(item: SaleRecord) {
  return ownerCommissionForSale(item);
}

function isReceivable(item: SaleRecord) {
  const type = saleTypeLabel(item.deliveryType, item.paymentStatus as PaymentStatus);
  return !isPaidSale(item) && (type === "PAD" || type === "COD" || item.paymentStatus !== "paid");
}

function formFromSaleRecord(item: SaleRecord): SaleForm {
  const saleType = saleTypeFromRecord(item);
  return {
    customerName: item.customerName,
    customerPhone: item.customerPhone || "",
    city: item.city || "",
    quantity: String(item.quantity || 1),
    totalAmount: String(item.totalAmount || ""),
    sellerName: item.sellerName,
    commissionPercent: String(item.commissionRate || (isOwnerSeller(item.sellerName) ? 15 : 5)),
    saleType,
    salePlatform: (item.salePlatform as SalesPlatformId) || "",
    paymentMethod: item.paymentMethod || (saleType === "advance" ? "PAGAMENTO ANTECIPADO" : saleType.toUpperCase()),
    saleDate: item.saleDate || String(item.createdAt || "").slice(0, 10) || todayKey(),
    saleTime: item.saleTime || (String(item.createdAt || "").includes("T") ? String(item.createdAt).slice(11, 16) : ""),
    receivedDate: item.receivedDate || item.expectedPaymentDate || "",
    paymentDate: item.paymentDate || (item.paymentStatus === "paid" ? item.expectedPaymentDate || item.saleDate || String(item.createdAt || "").slice(0, 10) : ""),
    paymentStatus: item.paymentStatus,
    deliveryType: item.deliveryType || (saleType === "pad" ? "PAD - Correios" : saleType === "cod" ? "COD - Motoboy" : "PAGAMENTO ANTECIPADO"),
    deliveryStatus: item.deliveryStatus,
    orderStatus: normalizeOrderStatus(item.orderStatus),
    orderTags: item.orderTags || [],
    orderStatusNote: item.orderStatusNote || "",
    expectedPaymentDate: item.expectedPaymentDate || "",
    notes: item.notes || ""
  };
}

function normalizeOrderStatus(status?: OrderStatus | string): OrderStatus {
  return normalizeOrderStatusCentral(status);
}

function orderStatusLabel(status?: OrderStatus | string) {
  const map: Record<string, string> = {
    active: "Ativo",
    cancelled: "Cancelado",
    returned: "Devolvido",
    lost: "Perdido",
    review: "Em análise"
  };
  return map[normalizeOrderStatus(status)] || "Ativo";
}

function orderStatusTone(status?: OrderStatus | string) {
  const value = normalizeOrderStatus(status);
  if (value === "cancelled" || value === "lost") return "danger" as Tone;
  if (value === "returned") return "purple" as Tone;
  if (value === "review") return "cyan" as Tone;
  return "money" as Tone;
}

function orderTagLabel(tag?: OrderTag | string) {
  const map: Record<string, string> = {
    hot_customer: "Cliente quente",
    cold_customer: "Cliente frio",
    rescheduled: "Reagendado",
    frustrated: "Frustrado",
    fraud: "Golpe",
    defaulted: "Inadimplente",
    priority: "Prioritário"
  };
  return map[String(tag || "")] || "Etiqueta";
}

const invalidOrderStatuses = new Set(["cancelled", "returned", "lost", "review"]);

function isFinanciallyBlocked(item: Partial<SaleRecord>) {
  return !getSaleFinancialState(item).isValidSale;
}

function isInvalidForMetrics(item: Partial<SaleRecord>) {
  return !isValidSaleForMetrics(item);
}

const orderTagOptions: Array<{ value: OrderTag; label: string; hint: string; tone: Tone; level: "positivo" | "atenção" | "crítico" | "neutro"; pulse?: boolean }> = [
  { value: "hot_customer", label: "Cliente quente", hint: "Priorize abordagem e acelere fechamento", tone: "money", level: "positivo", pulse: true },
  { value: "priority", label: "Prioritário", hint: "Subir prioridade operacional e acompanhar de perto", tone: "purple", level: "atenção", pulse: true },
  { value: "rescheduled", label: "Reagendado", hint: "Cliente mudou a janela; combine próximo passo claro", tone: "amber", level: "atenção" },
  { value: "cold_customer", label: "Cliente frio", hint: "Baixo engajamento; precisa nova abordagem", tone: "amber", level: "atenção" },
  { value: "frustrated", label: "Frustrado", hint: "Pedido perdeu força; registre motivo e qualidade do lead", tone: "danger", level: "crítico" },
  { value: "defaulted", label: "Inadimplente", hint: "Alerta comercial: acompanhar cobrança sem alterar caixa sozinho", tone: "danger", level: "crítico", pulse: true },
  { value: "fraud", label: "Golpe", hint: "Sinal operacional crítico para auditoria e cuidado no atendimento", tone: "danger", level: "crítico", pulse: true }
];

function normalizeOrderTags(tags?: Array<OrderTag | string>) {
  const allowed = new Set(orderTagOptions.map((item) => item.value));
  const values = (tags || []).filter((tag): tag is OrderTag => allowed.has(tag as OrderTag));
  return Array.from(new Set(values));
}

function orderTagSummary(tags?: Array<OrderTag | string>) {
  const normalized = normalizeOrderTags(tags);
  if (!normalized.length) return "Pedido sem etiqueta comercial. Use etiquetas para leitura do cliente; status do pedido controla os cálculos.";
  if (normalized.includes("fraud")) return "Etiqueta crítica: possível golpe. Use como alerta comercial, sem alterar financeiro automaticamente.";
  if (normalized.includes("defaulted")) return "Cliente com sinal de inadimplência. A etiqueta orienta acompanhamento; o status do pedido decide os totais.";
  if (normalized.includes("frustrated")) return "Venda com fricção/frustração registrada. Preserve histórico para leitura futura da operação.";
  if (normalized.includes("hot_customer") && normalized.includes("priority")) return "Cliente quente e prioritário. Próximo movimento deve ser rápido e direto.";
  if (normalized.includes("rescheduled")) return "Cliente reagendou. Combine horário claro e evite deixar a negociação esfriar.";
  if (normalized.includes("cold_customer")) return "Cliente frio. Use abordagem curta, objetiva e com próximo passo definido.";
  if (normalized.includes("priority")) return "Pedido prioritário. Suba na fila operacional e acompanhe até resolver.";
  return "Etiquetas comerciais ativas. Elas não alteram caixa, comissão, faturamento ou ranking.";
}

function saleStatusLabel(item: SaleRecord) {
  return saleVisualStatusLabel(item);
}

function saleStatusTone(item: SaleRecord): Tone {
  const status = saleStatusLabel(item);
  if (status === "LIBERADO") return "money";
  if (status === "PENDENTE") return "amber";
  if (status === "CANCELADO") return "danger";
  if (status === "DEVOLVIDO") return "purple";
  if (status === "EM ANÁLISE") return "cyan";
  return "neutral";
}

function shouldShowOrderStatusBadge(status?: OrderStatus | string) {
  return normalizeOrderStatus(status) !== "active";
}

export function SalesDashboardScreen() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [cashWithdrawals, setCashWithdrawals] = useState<CashWithdrawal[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>(defaultSellers);
  const [sale, setSale] = useState<SaleForm>({ ...initialSaleForm, expectedPaymentDate: addBusinessDays(7) });
  const [dashboardDate, setDashboardDate] = useState(todayKey());
  const [periodMode, setPeriodMode] = useState<PeriodMode>("today");
  const [customStartDate, setCustomStartDate] = useState(todayKey());
  const [customEndDate, setCustomEndDate] = useState(todayKey());
  const [dashboardSeller, setDashboardSeller] = useState("all");
  const [dashboardType, setDashboardType] = useState("all");
  const [dashboardPlatform, setDashboardPlatform] = useState("all");
  const [cashTab, setCashTab] = useState<CashTab>("today");
  const [movementView, setMovementView] = useState<MovementView>("registered");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [isSaleDrawerOpen, setIsSaleDrawerOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<SaleRecord | null>(null);
  const [isWithdrawalDrawerOpen, setIsWithdrawalDrawerOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState<WithdrawalForm>({ amount: "", withdrawnAt: todayKey(), note: "" });
  const [isWithdrawalSaving, setIsWithdrawalSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    const loaded = loadSellers();
    setSellers(loaded);
    const gabriel = loaded.find((seller) => seller.name === "Gabriel Moreira") ?? loaded[0];
    if (gabriel) {
      setSale((current) => ({ ...current, sellerName: gabriel.name, commissionPercent: String(gabriel.commissionPercent) }));
    }
    refresh();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const saleTotal = useMemo(() => parseMoney(sale.totalAmount), [sale.totalAmount]);
  const isSaleFormFinanciallyBlocked = useMemo(() => !getSaleFinancialState(sale).isValidSale, [sale]);
  const financialPreviewTotal = isSaleFormFinanciallyBlocked ? 0 : saleTotal;
  const commissionPercent = useMemo(() => normalizeCommissionPercent(sale.commissionPercent, 0), [sale.commissionPercent]);
  const sellerCommissionPreview = useMemo(() => Math.round(financialPreviewTotal * (commissionPercent / 100) * 100) / 100, [financialPreviewTotal, commissionPercent]);
  const ownerCommissionPreview = useMemo(() => {
    return isOwnerSeller(sale.sellerName) ? sellerCommissionPreview : Math.round(financialPreviewTotal * (ownerCommissionPercent / 100) * 100) / 100;
  }, [sale.sellerName, financialPreviewTotal, sellerCommissionPreview]);

  const sellersForFilter = useMemo(() => Array.from(new Set([...sellers.map((seller) => seller.name), ...sales.map((item) => item.sellerName).filter(Boolean)])).sort(), [sales, sellers]);

  const activePeriod = useMemo(() => periodRange(periodMode, dashboardDate, customStartDate, customEndDate), [periodMode, dashboardDate, customStartDate, customEndDate]);
  const activePeriodLabel = useMemo(() => periodLabel(periodMode, activePeriod.start, activePeriod.end), [periodMode, activePeriod.start, activePeriod.end]);

  const registeredMovementRows = useMemo(() => {
    return sales.filter((item) => {
      const saleDateMatch = isDateInRange(item.saleDate || String(item.createdAt || "").slice(0, 10), activePeriod.start, activePeriod.end);
      if (!saleDateMatch) return false;
      if (dashboardSeller !== "all" && item.sellerName !== dashboardSeller) return false;
      if (dashboardType !== "all" && saleTypeLabel(item.deliveryType, item.paymentStatus as PaymentStatus) !== dashboardType) return false;
      if (dashboardPlatform !== "all" && platformFromRecord(item)?.id !== dashboardPlatform) return false;
      return true;
    });
  }, [sales, activePeriod.start, activePeriod.end, dashboardSeller, dashboardType, dashboardPlatform]);

  const filteredByDate = useMemo(() => {
    // Base financeira: somente vendas válidas entram em faturamento, comissão, caixa, ranking e metas.
    // Cancelado/Devolvido/Perdido continuam visíveis no movimento, mas saem dos totais.
    return registeredMovementRows.filter((item) => getSaleFinancialState(item).countsRevenue);
  }, [registeredMovementRows]);

  const confirmedCashRows = useMemo(() => {
    return sales.filter((item) => {
      // Vendas canceladas/devolvidas/perdidas continuam visíveis em Movimento do dia,
      // mas NUNCA entram na visão Caixa nem nos totais financeiros.
      if (!getSaleFinancialState(item).countsCash) return false;
      const cashDate = cashDateForSale(item);
      if (!isDateInRange(cashDate, activePeriod.start, activePeriod.end)) return false;
      if (dashboardSeller !== "all" && item.sellerName !== dashboardSeller) return false;
      if (dashboardType !== "all" && saleTypeLabel(item.deliveryType, item.paymentStatus as PaymentStatus) !== dashboardType) return false;
      if (dashboardPlatform !== "all" && platformFromRecord(item)?.id !== dashboardPlatform) return false;
      return true;
    }).sort((a, b) => String(cashDateForSale(b) || "").localeCompare(String(cashDateForSale(a) || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }, [sales, activePeriod.start, activePeriod.end, dashboardSeller, dashboardType, dashboardPlatform]);

  const movementItems = movementView === "cash" ? confirmedCashRows : registeredMovementRows;
  const movementDescription = movementView === "cash"
    ? `Vendas que entraram no caixa em ${activePeriodLabel}. Usa data de pagamento/caixa, não data da venda.`
    : `Vendas registradas em ${activePeriodLabel}. Abra no olho para editar. Ao lançar venda, o cliente também entra automaticamente em Leads.`;
  const movementTitle = movementView === "cash" ? "Entradas no caixa" : "Movimento do dia";
  const movementAction = movementView === "cash"
    ? `${plural(confirmedCashRows.length, "entrada")} · caixa ${activePeriodLabel}`
    : `${plural(registeredMovementRows.length, "registro")} · ${activePeriodLabel}`;

  const yesterdaySales = useMemo(() => {
    const days = Math.max(1, Math.round((new Date(`${activePeriod.end}T00:00:00`).getTime() - new Date(`${activePeriod.start}T00:00:00`).getTime()) / 86400000) + 1);
    const previousEnd = addDaysToKey(activePeriod.start, -1);
    const previousStart = addDaysToKey(previousEnd, -(days - 1));
    return sales.filter((item) => getSaleFinancialState(item).countsRevenue && isDateInRange(item.saleDate || String(item.createdAt || "").slice(0, 10), previousStart, previousEnd));
  }, [sales, activePeriod.start, activePeriod.end]);

  const receivableToday = useMemo(() => {
    return sales.filter((item) => {
      if (!getSaleFinancialState(item).isValidSale) return false;
      if (!isReceivable(item)) return false;
      if (!isDateInRange(item.expectedPaymentDate, activePeriod.start, activePeriod.end)) return false;
      if (dashboardSeller !== "all" && item.sellerName !== dashboardSeller) return false;
      if (dashboardType !== "all" && saleTypeLabel(item.deliveryType, item.paymentStatus as PaymentStatus) !== dashboardType) return false;
      if (dashboardPlatform !== "all" && platformFromRecord(item)?.id !== dashboardPlatform) return false;
      return true;
    });
  }, [sales, activePeriod.start, activePeriod.end, dashboardSeller, dashboardType, dashboardPlatform]);

  const futureReceivables = useMemo(() => {
    return sales.filter((item) => {
      if (!getSaleFinancialState(item).isValidSale) return false;
      if (!isReceivable(item)) return false;
      if (!item.expectedPaymentDate || item.expectedPaymentDate <= activePeriod.end) return false;
      if (dashboardSeller !== "all" && item.sellerName !== dashboardSeller) return false;
      if (dashboardType !== "all" && saleTypeLabel(item.deliveryType, item.paymentStatus as PaymentStatus) !== dashboardType) return false;
      if (dashboardPlatform !== "all" && platformFromRecord(item)?.id !== dashboardPlatform) return false;
      return true;
    }).sort((a, b) => String(a.expectedPaymentDate).localeCompare(String(b.expectedPaymentDate)));
  }, [sales, activePeriod.end, dashboardSeller, dashboardType, dashboardPlatform]);

  const activeWithdrawals = useMemo(() => {
    return cashWithdrawals
      .filter((item) => isDateInRange(item.withdrawnAt, activePeriod.start, activePeriod.end))
      .sort((a, b) => String(b.withdrawnAt || "").localeCompare(String(a.withdrawnAt || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }, [cashWithdrawals, activePeriod.start, activePeriod.end]);

  const withdrawnSaleIds = useMemo(() => {
    const ids = new Set<string>();
    cashWithdrawals.forEach((withdrawal) => (withdrawal.saleIds || []).forEach((id) => ids.add(id)));
    return ids;
  }, [cashWithdrawals]);

  const availableCashRowsForWithdrawal = useMemo(() => {
    return confirmedCashRows.filter((item) => !withdrawnSaleIds.has(item.id));
  }, [confirmedCashRows, withdrawnSaleIds]);

  const withdrawalSalesById = useMemo(() => {
    return new Map(sales.map((item) => [item.id, item]));
  }, [sales]);

  const cashMovementRows = useMemo(() => {
    const rows: CashMovementRow[] = [];
    confirmedCashRows.forEach((sale) => {
      rows.push({
        id: `cash-${sale.id}`,
        date: cashDateForSale(sale) || todayKey(),
        kind: "entry",
        description: sale.customerName,
        order: saleOrderNumber(sale),
        movement: `Entrada no caixa · ${saleTypeLabel(sale.deliveryType, sale.paymentStatus as PaymentStatus)}`,
        amount: ownerWalletValueForSale(sale),
        fee: subCommissionForSale(sale),
        net: ownerWalletValueForSale(sale),
        status: withdrawnSaleIds.has(sale.id) ? "Sacada" : "Disponível",
        sale
      });
    });
    const withdrawalsInSequence = [...activeWithdrawals].sort((a, b) => {
      const aTime = new Date(a.createdAt || a.withdrawnAt || "").getTime();
      const bTime = new Date(b.createdAt || b.withdrawnAt || "").getTime();
      return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
    });
    withdrawalsInSequence.forEach((withdrawal, index) => {
      const linkedSales = (withdrawal.saleIds || []).map((id) => withdrawalSalesById.get(id)).filter(Boolean) as SaleRecord[];
      const withdrawalNumber = `Saque ${String(index + 1).padStart(3, "0")}`;
      rows.push({
        id: `withdrawal-${withdrawal.id}`,
        date: withdrawal.withdrawnAt,
        kind: "withdrawal",
        description: `${withdrawalNumber} · ${withdrawal.note || "Saque do caixa"}`,
        order: withdrawalNumber,
        movement: "Saque registrado",
        amount: -withdrawal.amount,
        fee: 0,
        net: -withdrawal.amount,
        status: linkedSales.length ? "Vendas sacadas" : "Saque manual",
        withdrawal,
        linkedSales
      });
    });
    return rows.sort((a, b) => {
      const dateDiff = String(b.date).localeCompare(String(a.date));
      if (dateDiff) return dateDiff;
      if (a.kind !== b.kind) return a.kind === "withdrawal" ? -1 : 1;
      return a.id.localeCompare(b.id);
    });
  }, [activeWithdrawals, confirmedCashRows, withdrawalSalesById, withdrawnSaleIds]);

  const summary = useMemo(() => {
    const revenue = filteredByDate.reduce((sum, item) => sum + item.totalAmount, 0);
    const sellerCommission = filteredByDate.reduce((sum, item) => sum + item.commissionAmount, 0);
    const teamSellerCommission = filteredByDate.reduce((sum, item) => sum + subCommissionForSale(item), 0);
    const operationCommission = filteredByDate.reduce((sum, item) => sum + ownerCommissionForSale(item), 0);
    const totalCommission = operationCommission + teamSellerCommission;
    const ownerPotential = filteredByDate.reduce((sum, item) => sum + ownerWalletValueForSale(item), 0);
    const ownerCommission = confirmedCashRows.reduce((sum, item) => sum + ownerCashForSale(item), 0);
    const receivableTodayRevenue = receivableToday.reduce((sum, item) => sum + ownerWalletValueForSale(item), 0);
    const futureReceivableRevenue = futureReceivables.reduce((sum, item) => sum + ownerWalletValueForSale(item), 0);
    const cashWithdrawn = activeWithdrawals.reduce((sum, item) => sum + item.amount, 0);
    const cashBalance = Math.max(0, ownerCommission - cashWithdrawn);
    const yesterdayRevenue = yesterdaySales.reduce((sum, item) => sum + item.totalAmount, 0);
    return {
      revenue,
      sellerCommission,
      teamSellerCommission,
      operationCommission,
      totalCommission,
      ownerCommission,
      cashWithdrawn,
      cashBalance,
      salesCount: filteredByDate.length,
      averageTicket: filteredByDate.length ? revenue / filteredByDate.length : 0,
      ownerPotential,
      programmedCash: cashBalance,
      receivableTodayCount: receivableToday.length,
      receivableTodayRevenue,
      futureReceivableCount: futureReceivables.length,
      futureReceivableRevenue,
      yesterdayRevenue,
      yesterdayCount: yesterdaySales.length
    };
  }, [activeWithdrawals, confirmedCashRows, filteredByDate, futureReceivables, receivableToday, yesterdaySales]);

  async function refresh() {
    setIsLoading(true);
    try {
      const [salesResponse, withdrawalsResponse] = await Promise.all([
        fetch(`/api/sales?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/cash-withdrawals?t=${Date.now()}`, { cache: "no-store" })
      ]);
      const payload = await salesResponse.json();
      const withdrawalsPayload = await withdrawalsResponse.json().catch(() => ({}));
      if (!salesResponse.ok) throw new Error(payload?.error || "Erro ao carregar vendas.");
      if (!withdrawalsResponse.ok) throw new Error(withdrawalsPayload?.error || "Erro ao carregar saques.");
      setSales((payload.sales ?? []) as SaleRecord[]);
      setCashWithdrawals((withdrawalsPayload.withdrawals ?? []) as CashWithdrawal[]);
      setError(null);
      setLastUpdatedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar vendas.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateSale<K extends keyof SaleForm>(field: K, value: SaleForm[K]) {
    setSale((current) => ({ ...current, [field]: value }));
  }

  function updateSaleDate(value: string) {
    setSale((current) => {
      const next: SaleForm = { ...current, saleDate: value };
      if (current.saleType === "pad") next.expectedPaymentDate = addBusinessDaysFromKey(value || todayKey(), 7);
      if (current.saleType === "advance") {
        next.expectedPaymentDate = value || todayKey();
        next.receivedDate = value || todayKey();
        next.paymentDate = current.paymentDate || value || todayKey();
      }
      return next;
    });
  }

  function updateSaleType(type: SaleType) {
    if (type === "pad") {
      setSale((current) => ({ ...current, saleType: type, paymentStatus: "pending", paymentMethod: "PAD", deliveryType: "PAD - Correios", deliveryStatus: "scheduled", expectedPaymentDate: current.expectedPaymentDate || addBusinessDaysFromKey(current.saleDate || todayKey(), 7), receivedDate: current.receivedDate || "", paymentDate: current.paymentDate || "" }));
    } else if (type === "cod") {
      setSale((current) => ({ ...current, saleType: type, paymentStatus: "cod", paymentMethod: "COD", deliveryType: "COD - Motoboy", deliveryStatus: "scheduled", expectedPaymentDate: current.expectedPaymentDate || "", receivedDate: current.receivedDate || "", paymentDate: current.paymentDate || "" }));
    } else {
      setSale((current) => ({ ...current, saleType: type, paymentStatus: "paid", paymentMethod: "PAGAMENTO ANTECIPADO", deliveryType: "PAGAMENTO ANTECIPADO", deliveryStatus: "delivered", expectedPaymentDate: current.saleDate || todayKey(), receivedDate: current.receivedDate || current.saleDate || todayKey(), paymentDate: current.paymentDate || current.saleDate || todayKey() }));
    }
  }

  function selectPlatform(platformId: SalesPlatformId) {
    const platform = getSalesPlatform(platformId);
    if (!platform) return;
    setSale((current) => ({
      ...current,
      salePlatform: platformId
    }));
  }

  function selectSellerByName(name: string) {
    const seller = sellers.find((item) => item.name === name);
    setSale((current) => ({ ...current, sellerName: name, commissionPercent: seller ? String(seller.commissionPercent) : current.commissionPercent }));
  }

  function openCreateDrawer() {
    setEditingSale(null);
    setDrawerMode("create");
    setSale((current) => ({ ...initialSaleForm, sellerName: current.sellerName, commissionPercent: current.commissionPercent, saleDate: activePeriod.end, saleTime: new Date().toTimeString().slice(0, 5), expectedPaymentDate: addBusinessDaysFromKey(activePeriod.end, 7), receivedDate: "", paymentDate: "", salePlatform: "" }));
    setIsSaleDrawerOpen(true);
  }

  function openEditDrawer(item: SaleRecord) {
    setEditingSale(item);
    setDrawerMode("edit");
    setSale(formFromSaleRecord(item));
    setIsSaleDrawerOpen(true);
  }

  function closeDrawer() {
    setIsSaleDrawerOpen(false);
    setEditingSale(null);
    setDrawerMode("create");
  }

  function salePayload(): SaleInput {
    const quantity = Number(sale.quantity || 1);
    return {
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      city: sale.city,
      productName: "Produto",
      saleDate: sale.saleDate || dashboardDate,
      quantity,
      totalAmount: saleTotal,
      sellerName: sale.sellerName,
      salePlatform: sale.salePlatform || undefined,
      commissionRate: commissionPercentToRate(commissionPercent || 5),
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      deliveryType: sale.deliveryType,
      deliveryStatus: sale.deliveryStatus,
      orderStatus: normalizeOrderStatus(sale.orderStatus),
      orderTags: sale.orderTags || [],
      orderStatusNote: sale.orderStatusNote || undefined,
      expectedPaymentDate: sale.expectedPaymentDate || undefined,
      receivedDate: sale.receivedDate || undefined,
      paymentDate: sale.paymentStatus === "paid" || sale.saleType === "advance" ? (sale.paymentDate || todayKey()) : (sale.paymentDate || undefined),
      saleTime: sale.saleTime || undefined,
      notes: sale.notes
    };
  }

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setToast(null);
    try {
      const payload = salePayload();
      const isEditing = drawerMode === "edit" && editingSale;
      const response = await fetch(isEditing ? `/api/sales?id=${editingSale.id}` : "/api/sales", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || (isEditing ? "Não foi possível atualizar a venda." : "Não foi possível lançar a venda."));

      if (isEditing) {
        const updated = result.sale as SaleRecord;
        setSales((current) => current.map((item) => item.id === updated.id ? updated : item));
        setToast({ title: "Venda atualizada", message: `${updated.customerName} · status ${saleStatusLabel(updated)}. Totais recalculados automaticamente.`, tone: isInvalidForMetrics(updated) ? "danger" : "cyan" });
      } else {
        const created = result.sale as SaleRecord;
        const ownerShare = ownerCommissionForSale(created);
        const operationCash = ownerWalletValueForSale(created);
        const notificationMessage = isOwnerSeller(created.sellerName)
          ? `Venda lançada: ${brl(created.totalAmount)} · minha comissão ${brl(ownerShare)} · caixa ${brl(operationCash)}.`
          : `Venda lançada: ${brl(created.totalAmount)} · minha comissão ${brl(ownerShare)} · subcomissão ${brl(subCommissionForSale(created))} · caixa ${brl(operationCash)}.`;
        setToast({ title: "Pedido gerado", message: notificationMessage, tone: "money" });
        addNotification({ title: "Pedido gerado", message: notificationMessage, tone: "money" });
      }

      closeDrawer();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar venda.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeleteSale() {
    if (!deleteCandidate) return;
    setError(null);
    setToast(null);
    try {
      const response = await fetch(`/api/sales?id=${deleteCandidate.id}`, { method: "DELETE", cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Não foi possível excluir a venda.");
      setSales((current) => current.filter((item) => item.id !== deleteCandidate.id));
      setDeleteCandidate(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir venda.");
    }
  }

  async function markSaleAsPaid(item: SaleRecord) {
    setError(null);
    setToast(null);
    try {
      const response = await fetch(`/api/sales?id=${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ paymentStatus: "paid", deliveryStatus: "delivered", paymentDate: todayKey() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Não foi possível confirmar o pagamento.");
      const updated = result.sale as SaleRecord;
      setSales((current) => current.map((saleItem) => saleItem.id === updated.id ? updated : saleItem));
      setToast({ title: "Pagamento confirmado", message: `${brl(ownerWalletValueForSale(updated))} entrou no caixa.`, tone: "money" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar pagamento.");
    }
  }

  function openWithdrawalDrawer() {
    setWithdrawalForm({ amount: summary.programmedCash ? String(summary.programmedCash.toFixed(2)).replace(".", ",") : "", withdrawnAt: activePeriod.end || todayKey(), note: "Saque do caixa" });
    setIsWithdrawalDrawerOpen(true);
  }

  async function submitWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseMoney(withdrawalForm.amount);
    if (!amount) {
      setError("Informe o valor sacado.");
      return;
    }
    setIsWithdrawalSaving(true);
    setError(null);
    setToast(null);
    try {
      let remaining = amount;
      const selectedSaleIds: string[] = [];
      for (const cashSale of availableCashRowsForWithdrawal) {
        if (remaining <= 0) break;
        selectedSaleIds.push(cashSale.id);
        remaining -= ownerWalletValueForSale(cashSale);
      }
      const response = await fetch("/api/cash-withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ amount, withdrawnAt: withdrawalForm.withdrawnAt || todayKey(), note: withdrawalForm.note, saleIds: selectedSaleIds })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Não foi possível registrar o saque.");
      setToast({ title: "Saque registrado", message: `${brl(amount)} saiu do caixa.`, tone: "amber" });
      setIsWithdrawalDrawerOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar saque.");
    } finally {
      setIsWithdrawalSaving(false);
    }
  }

  const revenueComparison = summary.yesterdayRevenue > 0
    ? `${summary.revenue >= summary.yesterdayRevenue ? "+" : "-"}${Math.abs(((summary.revenue - summary.yesterdayRevenue) / summary.yesterdayRevenue) * 100).toFixed(0)}% vs ontem`
    : "Comparativo pronto para histórico";

  const activeCashItems = cashTab === "today" ? receivableToday : futureReceivables;
  const activeCashTotal = activeCashItems.reduce((sum, item) => sum + ownerWalletValueForSale(item), 0);

  return (
    <div className="kau-billion-sales space-y-4 pb-0">
      {toast ? <SaleToast title={toast.title} message={toast.message} tone={toast.tone} /> : null}

      <section className="luxury-surface kau-surgical-surface relative overflow-hidden rounded-[30px] p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,.15),transparent_34%),radial-gradient(circle_at_88%_4%,rgba(124,58,237,.14),transparent_30%),linear-gradient(120deg,rgba(255,255,255,.045),transparent_56%)]" />
        <div className="relative flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-cyan shadow-[0_0_28px_rgba(24,215,255,.08)]">
              <span className="h-1.5 w-1.5 rounded-full bg-money shadow-[0_0_14px_rgba(16,185,129,.9)]" /> Sales Command Dashboard
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-.055em] text-white md:text-5xl">Vendas</h1>
            <p className="mt-2 text-[14px] font-normal leading-6 text-white/68">Controle diário de vendas, pagamentos e entradas de caixa.</p>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="grid gap-3 md:grid-cols-5 xl:w-[980px]">
              <Field label="Período"><select className={inputClass} value={periodMode} onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}><option value="today">Hoje</option><option value="3d">Últimos 3 dias</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="custom">Personalizado</option></select></Field>
              {periodMode === "custom" ? <Field label="De"><input className={inputClass} type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value || todayKey())} /></Field> : <Field label="Até"><input className={inputClass} type="date" value={dashboardDate} onChange={(e) => setDashboardDate(e.target.value || todayKey())} /></Field>}
              {periodMode === "custom" ? <Field label="Até"><input className={inputClass} type="date" value={customEndDate} onChange={(e) => { const value = e.target.value || todayKey(); setCustomEndDate(value); setDashboardDate(value); }} /></Field> : null}
              <Field label="Vendedor"><select className={inputClass} value={dashboardSeller} onChange={(e) => setDashboardSeller(e.target.value)}><option value="all">Todos</option>{sellersForFilter.map((seller) => <option key={seller} value={seller}>{seller}</option>)}</select></Field>
              <Field label="Pagamento"><select className={inputClass} value={dashboardType} onChange={(e) => setDashboardType(e.target.value)}><option value="all">Todos</option><option value="PAD">PAD</option><option value="COD">COD</option><option value="ANTECIPADO">Antecipado</option></select></Field>
              <Field label="Plataforma"><select className={inputClass} value={dashboardPlatform} onChange={(e) => setDashboardPlatform(e.target.value)}><option value="all">Todas</option>{salesPlatforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select></Field>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => refresh()} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-slate-300/[.12] bg-white/[.045] px-4 text-xs font-semibold uppercase tracking-[.05em] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition duration-[180ms] ease-out hover:-translate-y-0.5 hover:border-cyan/25 hover:bg-cyan/10 hover:text-cyan">
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Mais filtros
              </button>
              <button type="button" onClick={openCreateDrawer} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-money/35 bg-money px-5 text-sm font-semibold tracking-[-.01em] text-[#02130b] shadow-[0_0_44px_rgba(16,185,129,.20)] transition duration-[180ms] ease-out hover:-translate-y-0.5 hover:bg-[#22e59b]">
                <Plus size={18} /> Nova venda
              </button>
            </div>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-2 text-xs text-white/56">
          <button type="button" onClick={() => { setPeriodMode("today"); setDashboardDate(todayKey()); setCustomStartDate(todayKey()); setCustomEndDate(todayKey()); }} className={cn("rounded-full border px-3 py-1.5 font-black uppercase transition", periodMode === "today" && dashboardDate === todayKey() ? "border-money/30 bg-money/12 text-money" : "border-white/10 bg-white/[.035] text-white/62 hover:text-white")}>Hoje</button>
          <span>Período: <strong className="text-white/82">{activePeriodLabel}</strong></span>
          {lastUpdatedAt ? <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-1">Atualizado às {lastUpdatedAt}</span> : null}
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <CommandCard title="Hoje" value={brl(summary.revenue)} subtext={plural(summary.salesCount, "venda registrada", "vendas registradas")} helper={`Média ${brl(summary.averageTicket)}`} comparison={revenueComparison} tone="money" icon={<BarChart3 size={21} />} featured />
        <CommandCard title="Operação" value={brl(summary.totalCommission)} subtext="comissão total no período" helper={`Minha comissão ${brl(summary.operationCommission)}`} comparison={summary.salesCount ? `A pagar para vendedores ${brl(summary.teamSellerCommission)}` : "Aguardando lançamentos"} tone="cyan" icon={<Activity size={21} />} />
        <CommandCard title="Caixa" value={brl(summary.programmedCash)} subtext="saldo disponível" helper={`Entrou ${brl(summary.ownerCommission)}`} comparison={summary.cashWithdrawn ? `Saldo depois dos saques do período` : (summary.futureReceivableCount ? `${brl(summary.futureReceivableRevenue)} pendente nos próximos dias` : "Sem próximos recebimentos")} tone="purple" icon={<WalletCards size={21} />} />
        <CommandCard title="Saques" value={brl(summary.cashWithdrawn)} subtext="retirado do caixa" helper={activeWithdrawals.length ? `${activeWithdrawals.length} saque${activeWithdrawals.length === 1 ? "" : "s"} no período` : "Nenhum saque registrado"} comparison={summary.programmedCash ? `Ainda disponível ${brl(summary.programmedCash)}` : "Caixa zerado após retiradas"} tone="amber" icon={<WalletCards size={21} />} action={<button type="button" onClick={openWithdrawalDrawer} className="rounded-xl border border-amber/30 bg-amber px-3 py-2 text-xs font-black text-[#160c02] shadow-[0_0_28px_rgba(245,158,11,.18)] transition duration-[180ms] ease-out hover:bg-[#ffb82e]">Registrar saque</button>} />
      </section>

      <CashMovementHistory rows={cashMovementRows} />

      <section className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <PremiumPanel glow="cyan" className="self-start">
          <PanelHeader
            icon={movementView === "cash" ? <WalletCards size={18} /> : <ClipboardList size={18} />}
            title={movementTitle}
            description={movementDescription}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
                  <ViewToggleButton active={movementView === "registered"} onClick={() => setMovementView("registered")}>Vendas</ViewToggleButton>
                  <ViewToggleButton active={movementView === "cash"} onClick={() => setMovementView("cash")}>Caixa</ViewToggleButton>
                </div>
                <span className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-black text-white/65">{movementAction}</span>
              </div>
            }
          />
          <MovementTable items={movementItems} view={movementView} onEdit={openEditDrawer} onDelete={(item) => setDeleteCandidate(item)} onMarkPaid={markSaleAsPaid} />
          <MovementFooter items={movementItems} view={movementView} />
        </PremiumPanel>

        <PremiumPanel glow="purple">
          <PanelHeader icon={<Clock3 size={18} />} title="Caixa previsto" description="Carteira prevista. Só entra no caixa quando você marcar como pago." action={<button type="button" onClick={() => setCashTab("future")} className="rounded-xl border border-purple/25 bg-purple/10 px-3 py-2 text-xs font-semibold text-purple transition duration-[180ms] ease-out hover:bg-purple/15 hover:text-white">Ver próximos dias</button>} />
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/18 p-1.5"><TabButton active={cashTab === "today"} onClick={() => setCashTab("today")}>Período</TabButton><TabButton active={cashTab === "future"} onClick={() => setCashTab("future")}>Próximos dias</TabButton></div>
          <div className="mt-4">{activeCashItems.length === 0 ? <EmptyCashState futureCount={futureReceivables.length} onViewFuture={() => setCashTab("future")} /> : <CashList items={activeCashItems.slice(0, 9)} onEdit={openEditDrawer} onDelete={(item) => setDeleteCandidate(item)} onMarkPaid={markSaleAsPaid} />}</div>
          {activeWithdrawals.length ? <WithdrawalList withdrawals={activeWithdrawals.slice(0, 5)} /> : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/48">Total {cashTab === "today" ? "no período" : "próximos dias"}</p><p className="mt-2 text-3xl font-black text-white">{brl(activeCashTotal)}</p><p className="mt-1 text-xs font-semibold text-white/45">valor que entra na carteira ao confirmar pagamento</p></div>
            <div className="rounded-2xl border border-amber/20 bg-amber/10 p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/48">Saques no período</p><p className="mt-2 text-3xl font-black text-amber">{brl(summary.cashWithdrawn)}</p><p className="mt-1 text-xs font-semibold text-white/45">valor retirado do caixa</p></div>
          </div>
        </PremiumPanel>
      </section>

      <PremiumPanel glow="none" className="p-5">
        <PanelHeader icon={<ArrowUpRight size={18} />} title="Resumo da operação" description={`Visão rápida do que aconteceu em ${activePeriodLabel}.`} />
        <div className="mt-4 grid gap-3 md:grid-cols-3"><MiniIndicator label="Vendas registradas" value={String(summary.salesCount)} tone="cyan" /><MiniIndicator label="Minha comissão" value={brl(summary.operationCommission)} tone="purple" /><MiniIndicator label="Saldo no caixa" value={brl(summary.programmedCash)} tone="money" /></div>
      </PremiumPanel>

      {isSaleDrawerOpen ? (
        <SaleDrawer onClose={closeDrawer}>
          <SaleFormPanel mode={drawerMode} sale={sale} sellers={sellers} saleTotal={financialPreviewTotal} rawSaleTotal={saleTotal} sellerCommissionPreview={sellerCommissionPreview} ownerCommissionPreview={ownerCommissionPreview} isSaving={isSaving} onSubmit={submitSale} onUpdate={updateSale} onSaleDateChange={updateSaleDate} onTypeChange={updateSaleType} onPlatformChange={selectPlatform} onSellerChange={selectSellerByName} />
        </SaleDrawer>
      ) : null}

      {isWithdrawalDrawerOpen ? (
        <WithdrawalDrawer
          form={withdrawalForm}
          balance={summary.programmedCash}
          cashRows={availableCashRowsForWithdrawal}
          isSaving={isWithdrawalSaving}
          onClose={() => setIsWithdrawalDrawerOpen(false)}
          onSubmit={submitWithdrawal}
          onUpdate={(field, value) => setWithdrawalForm((current) => ({ ...current, [field]: value }))}
        />
      ) : null}

      {deleteCandidate ? <ConfirmDeleteModal sale={deleteCandidate} onCancel={() => setDeleteCandidate(null)} onConfirm={confirmDeleteSale} /> : null}
    </div>
  );
}

function SaleFormPanel({ mode, sale, sellers, saleTotal, rawSaleTotal, sellerCommissionPreview, ownerCommissionPreview, isSaving, onSubmit, onUpdate, onSaleDateChange, onTypeChange, onPlatformChange, onSellerChange }: {
  mode: DrawerMode;
  sale: SaleForm;
  sellers: SellerProfile[];
  saleTotal: number;
  rawSaleTotal: number;
  sellerCommissionPreview: number;
  ownerCommissionPreview: number;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <K extends keyof SaleForm>(field: K, value: SaleForm[K]) => void;
  onSaleDateChange: (value: string) => void;
  onTypeChange: (type: SaleType) => void;
  onPlatformChange: (platformId: SalesPlatformId) => void;
  onSellerChange: (name: string) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PanelHeader icon={mode === "edit" ? <Save size={18} /> : <PanelRightOpen size={18} />} title={mode === "edit" ? "Editar venda" : "Lançar nova venda"} description={mode === "edit" ? "Altere valor, pagamento, vendedor, observações e previsão. Tudo salva em tempo real no painel." : "Registre o pedido aqui. Recebimentos e comissões entram nos painéis corretos."} />
      <div className="grid gap-3">
        <SaleTypeButton active={sale.saleType === "pad"} title="PAD" description="Correios. Recebimento previsto em 7 dias úteis." onClick={() => onTypeChange("pad")} />
        <SaleTypeButton active={sale.saleType === "cod"} title="COD" description="Motoboy. Defina a data de recebimento manualmente." onClick={() => onTypeChange("cod")} />
        <SaleTypeButton active={sale.saleType === "advance"} title="PAGAMENTO ANTECIPADO" description="Pix, boleto ou cartão. Sem recebimento pendente." onClick={() => onTypeChange("advance")} />
      </div>

      <div className="space-y-2">
        <p className={labelClass}>Plataforma da venda</p>
        <div className="grid gap-2 md:grid-cols-3">
          {salesPlatforms.map((platform) => <PlatformButton key={platform.id} platformId={platform.id} active={sale.salePlatform === platform.id} onClick={() => onPlatformChange(platform.id)} />)}
        </div>
        <p className="text-[11px] font-semibold text-white/42">A plataforma mostra a origem da venda. A modalidade continua sendo definida acima: PAD, COD ou Pagamento Antecipado.</p>
      </div>

      <OrderTagSelector
        selected={sale.orderTags || []}
        onChange={(nextTags) => {
          onUpdate("orderTags", nextTags as SaleForm["orderTags"]);
        }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Cliente"><input className={inputClass} value={sale.customerName} onChange={(e) => onUpdate("customerName", e.target.value)} placeholder="Nome do cliente" required /></Field>
        <Field label="Telefone"><input className={inputClass} value={sale.customerPhone || ""} onChange={(e) => onUpdate("customerPhone", e.target.value)} placeholder="WhatsApp" required /></Field>
        <Field label="Cidade"><input className={inputClass} value={sale.city} onChange={(e) => onUpdate("city", e.target.value)} placeholder="Cidade" required /></Field>
        <Field label="Vendedor"><select className={inputClass} value={sale.sellerName} onChange={(e) => onSellerChange(e.target.value)}>{sellers.map((seller) => <option key={seller.login}>{seller.name}</option>)}</select></Field>
        <Field label="Valor da venda"><input className={inputClass} inputMode="decimal" value={sale.totalAmount} onChange={(e) => onUpdate("totalAmount", e.target.value)} placeholder="R$ 197,00" required /></Field>
        <Field label="Comissão %"><input className={inputClass} inputMode="decimal" value={sale.commissionPercent} onChange={(e) => onUpdate("commissionPercent", e.target.value)} /></Field>
        <Field label="Quantidade"><input className={inputClass} type="number" min={1} step="1" value={sale.quantity} onChange={(e) => onUpdate("quantity", e.target.value)} /></Field>
        <Field label="Data da venda"><input className={inputClass} type="date" value={sale.saleDate || todayKey()} onChange={(e) => onSaleDateChange(e.target.value)} /></Field>
        <Field label="Hora da venda"><input className={inputClass} type="time" value={sale.saleTime || ""} onChange={(e) => onUpdate("saleTime", e.target.value)} /></Field>
        <Field label="Data de recebimento"><input className={inputClass} type="date" value={sale.receivedDate || ""} onChange={(e) => { onUpdate("receivedDate", e.target.value); onUpdate("expectedPaymentDate", e.target.value); }} /></Field>
        <Field label="Data de pagamento"><input className={inputClass} type="date" value={sale.paymentDate || ""} onChange={(e) => onUpdate("paymentDate", e.target.value)} /></Field>
        <Field label="Status do pagamento"><select className={inputClass} value={sale.paymentStatus} onChange={(e) => { const status = e.target.value as PaymentStatus; onUpdate("paymentStatus", status); if (status === "paid" && !sale.paymentDate) onUpdate("paymentDate", todayKey()); }}><option value="pending">Pendente</option><option value="paid">Pago</option><option value="cod">COD</option></select></Field>
        <Field label="Status do pedido"><select className={inputClass} value={normalizeOrderStatus(sale.orderStatus)} onChange={(e) => onUpdate("orderStatus", e.target.value as OrderStatus)}><option value="active">Ativo</option><option value="cancelled">Cancelado</option><option value="returned">Devolvido</option><option value="lost">Perdido</option><option value="review">Em análise</option></select></Field>
        <Field label="Status da entrega"><select className={inputClass} value={sale.deliveryStatus} onChange={(e) => onUpdate("deliveryStatus", e.target.value as DeliveryStatus)}><option value="scheduled">Agendado</option><option value="pending">Pendente</option><option value="delivered">Entregue</option><option value="risk">Risco</option><option value="rescheduled">Reagendado</option></select></Field>
        <div className="md:col-span-2"><Field label="Observação"><textarea className={cn(inputClass, "min-h-24 resize-none")} value={sale.notes || ""} onChange={(e) => { onUpdate("notes", e.target.value); onUpdate("orderStatusNote", e.target.value); }} placeholder="Endereço, confirmação, retorno, ajuste de pagamento ou observação do pedido..." /></Field></div>
      </div>

      {invalidOrderStatuses.has(normalizeOrderStatus(sale.orderStatus)) ? (
        <div className="rounded-2xl border border-rose-300/[.22] bg-rose-500/[.075] px-4 py-3 text-xs font-semibold leading-relaxed text-rose-100/90">
          Status do pedido: {orderStatusLabel(sale.orderStatus)}. Esta venda permanece no histórico, mas entra como R$ 0,00 em faturamento, comissão, caixa e ranking após salvar. Valor original: {brl(rawSaleTotal)}.
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3"><Preview label="Valor contabilizado" value={brl(saleTotal)} tone="money" /><Preview label="Minha comissão" value={brl(ownerCommissionPreview)} tone="cyan" /><Preview label="Subcomissão" value={brl(isOwnerSeller(sale.sellerName) ? 0 : sellerCommissionPreview)} tone="purple" /></div>
      <button disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-money/30 bg-money px-6 py-3 text-sm font-black text-[#02130b] shadow-[0_0_44px_rgba(16,185,129,.2)] transition hover:bg-[#22e59b] disabled:opacity-60"><Plus size={17} /> {isSaving ? "Salvando..." : mode === "edit" ? "Salvar alterações" : "Lançar venda agora"}</button>
    </form>
  );
}


function CashMovementHistory({ rows }: { rows: CashMovementRow[] }) {
  const grouped = rows.reduce<Record<string, CashMovementRow[]>>((acc, row) => {
    const key = row.date || todayKey();
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

  function toggleDate(date: string) {
    setCollapsedDates((current) => ({ ...current, [date]: !(current[date] ?? true) }));
  }

  return (
    <section className="luxury-surface kau-surgical-surface finance-shell enterprise-finance-quiet kau-history-visual-match relative overflow-hidden rounded-[28px] p-4">
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,.045),transparent_26%),radial-gradient(circle_at_92%_0%,rgba(168,85,247,.05),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.014]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E\")" }} />

      <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-slate-300/[.07] pb-3.5">
        <div className="flex gap-4">
          <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl border border-slate-300/[.08] bg-white/[.032] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,.045)]">
            <WalletCards size={16} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[.12em] text-slate-500">Financeiro</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-.035em] text-slate-50">Histórico de movimentação</h2>
            <p className="mt-1.5 max-w-3xl text-[13px] font-normal leading-5 text-slate-400/78">Entradas no caixa, saques e vendas vinculadas em uma leitura limpa de extrato operacional.</p>
          </div>
        </div>
        <span className="rounded-full border border-slate-300/[.08] bg-white/[.032] px-3.5 py-2 text-[12px] font-medium text-slate-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">{rows.length} movimentações</span>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[24px] border border-slate-300/[.075] bg-[#07111b]/72 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_14px_46px_rgba(0,0,0,.22)] kau-history-inner-surface">
        <div className="premium-scrollbar">
          <div className="w-full">
            <div className="cash-history-header grid gap-5 border-b border-slate-400/[.05] bg-white/[.010] px-6 py-3.5 text-[10px] font-medium uppercase tracking-[.12em] text-slate-400/55">
              <span>Data</span><span>Descrição</span><span>Pedido</span><span>Movimentação</span><span className="text-right">Valor</span><span className="text-right">Comissão</span><span className="text-right">Líquido</span><span>Status</span>
            </div>
            {dates.length === 0 ? (
              <TableEmpty message="Nenhuma movimentação de caixa neste período." />
            ) : (
              <div className="max-h-[360px] overflow-y-auto premium-scrollbar">
                {dates.map((date) => {
                  const dailyRows = [...grouped[date]].sort((a, b) => {
                    if (a.kind !== b.kind) return a.kind === "withdrawal" ? -1 : 1;
                    return a.id.localeCompare(b.id);
                  });
                  const isCollapsed = collapsedDates[date] ?? true;
                  const dailyEntries = dailyRows.filter((row) => row.kind === "entry").reduce((sum, row) => sum + row.net, 0);
                  const dailyWithdrawals = dailyRows.filter((row) => row.kind === "withdrawal").reduce((sum, row) => sum + Math.abs(row.net), 0);
                  return (
                    <div key={date} className="border-b border-slate-300/[.06] last:border-b-0">
                      <button type="button" onClick={() => toggleDate(date)} className="group grid w-full grid-cols-[1fr_auto] items-center gap-5 bg-white/[.008] px-6 py-4 text-left transition duration-[180ms] ease-out hover:bg-white/[.022]">
                        <div className="flex min-w-0 items-center gap-3.5">
                          <ChevronRight size={15} className={cn("shrink-0 text-slate-500 transition-transform duration-200 ease-out", !isCollapsed && "rotate-90")} />
                          <p className="text-[15px] font-semibold tracking-[-.02em] text-[#F8FAFC]">{formatDate(date)}</p>
                          <span className="rounded-full border border-slate-300/[.065] bg-white/[.022] px-2.5 py-1 text-[11px] font-normal text-slate-400/75">{dailyRows.length} registro{dailyRows.length === 1 ? "" : "s"}</span>
                        </div>
                        <div className="flex items-center gap-4 tabular-nums">
                          <p className={cn("text-[15px] font-semibold tracking-[-.02em]", dailyWithdrawals > 0 ? "text-[#FB7185]" : "text-white/92")}>{dailyWithdrawals > 0 ? `-${brl(dailyWithdrawals)}` : `+${brl(dailyEntries)}`}</p>
                        </div>
                      </button>
                      {!isCollapsed ? <div className="cash-accordion-panel">{dailyRows.map((row) => <CashMovementLine key={row.id} row={row} />)}</div> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CashMovementLine({ row }: { row: CashMovementRow }) {
  const isWithdrawal = row.kind === "withdrawal";
  const statusTone = isWithdrawal ? "withdrawal" : row.status === "Sacada" ? "neutral" : "positive";
  return (
    <div className="finance-movement-row cash-history-row grid items-center gap-5 border-t border-slate-300/[.035] px-6 py-[15px] text-[13px] font-normal text-slate-400/82 transition duration-[180ms] ease-out hover:bg-white/[.022]">
      <p className="text-[13px] font-normal tabular-nums text-slate-400/68">{formatShortDate(row.date)}</p>
      <div className="min-w-0">
        <p className={cn("truncate text-[14px] font-medium tracking-[-.01em]", isWithdrawal ? "text-[#F59E0B]" : "text-white/[.92]")}>{row.description}</p>
        {isWithdrawal && row.linkedSales?.length ? (
          <p className="mt-1.5 truncate text-[12px] font-normal text-slate-400/70">Sacou: {row.linkedSales.map((sale) => sale.customerName).join(", ")}</p>
        ) : row.sale ? (
          <p className="mt-1.5 truncate text-[12px] font-normal text-slate-400/70">{row.sale.sellerName} · {platformLabel(row.sale)}</p>
        ) : null}
      </div>
      <p className="truncate text-[13px] font-normal text-slate-400/72">{row.order}</p>
      <p className={cn("truncate text-[13px] font-medium", isWithdrawal ? "text-[#F59E0B]" : "text-[#38BDF8]")}>{row.movement}</p>
      <p className={cn("text-right text-[15px] font-semibold tabular-nums tracking-[-.02em]", row.amount >= 0 ? "text-[#34D399]" : "text-[#FB7185]")}>{row.amount >= 0 ? "+" : "-"}{brl(Math.abs(row.amount))}</p>
      <p className="text-right text-[13px] font-normal tabular-nums text-slate-400/72">{row.fee ? brl(row.fee) : "—"}</p>
      <p className={cn("text-right text-[15px] font-semibold tabular-nums tracking-[-.02em]", row.net >= 0 ? "text-[#34D399]" : "text-[#FB7185]")}>{row.net >= 0 ? "+" : "-"}{brl(Math.abs(row.net))}</p>
      <CashStatusBadge tone={statusTone}>{row.status}</CashStatusBadge>
    </div>
  );
}

function CashStatusBadge({ tone, children }: { tone: "positive" | "negative" | "neutral" | "withdrawal"; children: ReactNode }) {
  const className =
    tone === "positive"
      ? "border-emerald-400/[.18] bg-emerald-500/[.08] text-emerald-300/90"
      : tone === "negative"
        ? "border-rose-400/[.18] bg-rose-500/[.08] text-rose-300/90"
        : tone === "withdrawal"
          ? "border-slate-400/[.14] bg-slate-400/[.075] text-slate-300/86"
          : "border-slate-400/[.14] bg-slate-400/[.075] text-slate-300/82";
  return <span className={cn("w-fit rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none shadow-none", className)}>{children}</span>;
}

function MovementTable({ items, view, onEdit, onDelete, onMarkPaid }: { items: SaleRecord[]; view: MovementView; onEdit: (item: SaleRecord) => void; onDelete: (item: SaleRecord) => void; onMarkPaid: (item: SaleRecord) => void }) {
  const emptyMessage = view === "cash" ? "Nenhuma venda entrou no caixa neste período." : "Nenhuma venda registrada no período selecionado.";
  return (
    <div className="mt-5 overflow-hidden rounded-[28px] border border-cyan/10 bg-[#07111b]/78 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_16px_54px_rgba(0,0,0,.20)]">
      <div className="w-full">
        <div className="w-full">
          <div className="sales-movement-header grid items-center gap-3 border-b border-white/10 bg-white/[.018] px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[.10em] text-white/50">
            <span>Cliente</span>
            <span className="text-left">Plataforma</span>
            <span>Vendedor</span>
            <span className="text-center">Valor</span>
            <span className="text-center">Comissão</span>
            <span className="text-center">Subcomissão</span>
            <span className="text-center">Status</span>
            <span className="text-center">Ação</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto premium-scrollbar">
            {items.length === 0 ? <TableEmpty message={emptyMessage} /> : items.map((item) => {
              const paid = isPaidSale(item);
              const blocked = isInvalidForMetrics(item);
              const cashDate = cashDateForSale(item);
              return (
                <div key={item.id} className={cn("sales-movement-row grid items-center gap-3 border-b border-slate-300/[.055] px-4 py-[17px] transition duration-[180ms] ease-out last:border-b-0 hover:bg-white/[.032]", blocked && "bg-rose-950/[.055] opacity-[.92]")}>
                  <div className="min-w-0"><p className={cn("truncate text-[14px] font-semibold tracking-[-.01em] text-white", blocked && "text-white/72 line-through decoration-rose-300/35")}>{item.customerName}</p><p className="mt-1 truncate text-[12px] font-normal text-white/58">{item.city || "Sem cidade"} · {view === "cash" ? `caixa em ${formatDate(cashDate)}` : `venda em ${formatDate(item.saleDate || String(item.createdAt || "").slice(0, 10))}`}</p></div>
                  <div className="flex justify-start"><PlatformTag platformId={item.salePlatform} fallback={saleTypeLabel(item.deliveryType, item.paymentStatus as PaymentStatus)} /></div>
                  <p className="truncate text-[13px] font-medium text-white/76">{item.sellerName}</p>
                  <p className={cn("text-center text-[14px] font-semibold tabular-nums tracking-[-.02em]", blocked ? "text-white/38 line-through decoration-rose-300/35" : "text-[#34D399]")}>{blocked ? "—" : brl(item.totalAmount)}</p>
                  <p className={cn("text-center text-[14px] font-semibold tabular-nums tracking-[-.02em]", blocked ? "text-white/38" : "text-[#38BDF8]")}>{blocked ? "—" : brl(ownerCommissionForSale(item))}</p>
                  <p className={cn("text-center text-[14px] font-semibold tabular-nums tracking-[-.02em]", blocked ? "text-white/38" : "text-[#A78BFA]")}>{blocked ? "—" : (subCommissionForSale(item) ? brl(subCommissionForSale(item)) : "—")}</p>
                  <div className="flex justify-center"><SaleStatusBadge item={item} /></div>
                  <div className="flex items-center justify-center gap-1.5">
                    <button type="button" onClick={() => onEdit(item)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cyan/12 bg-cyan/[.075] text-cyan/90 transition duration-[180ms] ease-out hover:border-cyan/28 hover:bg-cyan/12 hover:text-white" aria-label={`Abrir venda de ${item.customerName}`} title="Abrir e editar venda"><Eye size={13} /></button>
                    {!paid && !blocked ? <button type="button" onClick={() => onMarkPaid(item)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-money/20 bg-money/[.075] text-money/90 shadow-none transition duration-[180ms] ease-out hover:border-money/36 hover:bg-money/12 hover:text-white" aria-label={`Registrar caixa da venda de ${item.customerName}`} title="Registrar caixa / marcar venda como paga"><WalletCards size={13} /></button> : null}
                    <button type="button" onClick={() => onDelete(item)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/[.075] bg-white/[.026] text-white/42 transition duration-[180ms] ease-out hover:border-danger/22 hover:bg-danger/9 hover:text-danger" aria-label={`Excluir venda de ${item.customerName}`} title="Excluir venda"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MovementFooter({ items, view }: { items: SaleRecord[]; view: MovementView }) {
  const validItems = items.filter((item) => !isInvalidForMetrics(item));
  const total = validItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const commissions = validItems.reduce((sum, item) => sum + ownerCommissionForSale(item), 0);
  const teamSellerCommission = validItems.reduce((sum, item) => sum + subCommissionForSale(item), 0);
  const cashTotal = validItems.reduce((sum, item) => sum + ownerCashForSale(item), 0);
  return <div className="mt-4 grid gap-3 md:grid-cols-4"><FooterMetric label="Quantidade válida" value={view === "cash" ? plural(validItems.length, "entrada") : plural(validItems.length, "venda", "vendas")} /><FooterMetric label={view === "cash" ? "Total que entrou" : "Total vendido"} value={brl(view === "cash" ? cashTotal : total)} tone="money" /><FooterMetric label="Comissão" value={brl(commissions)} tone="purple" /><FooterMetric label="A pagar para vendedores" value={brl(teamSellerCommission)} tone="cyan" /></div>;
}

function ViewToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("rounded-xl px-3.5 py-2 text-[11px] font-medium uppercase tracking-[.08em] transition duration-[180ms] ease-out", active ? "bg-sky-300/[.09] text-sky-200 shadow-[inset_0_0_0_1px_rgba(125,211,252,.16)]" : "text-slate-400/72 hover:bg-white/[.035] hover:text-slate-100")}>{children}</button>;
}

function CashList({ items, onEdit, onDelete, onMarkPaid }: { items: SaleRecord[]; onEdit: (item: SaleRecord) => void; onDelete: (item: SaleRecord) => void; onMarkPaid: (item: SaleRecord) => void }) {
  return <div className="space-y-2.5">{items.map((item) => <div key={item.id} className="group flex items-center justify-between gap-4 rounded-2xl border border-purple/15 bg-purple/[.035] p-3.5 transition duration-[180ms] ease-out hover:bg-purple/[.065]"><div className="min-w-0"><div className="flex items-center gap-2.5"><Tag tone={saleTypeLabel(item.deliveryType, item.paymentStatus as PaymentStatus)} /><PlatformMini platformId={item.salePlatform} /><p className="truncate text-[14px] font-semibold tracking-[-.01em] text-white">{item.customerName}</p></div><p className="mt-1.5 text-[12px] font-normal text-white/58">{formatDate(item.expectedPaymentDate)} · {item.sellerName}</p></div><div className="flex items-center gap-2.5"><div className="text-right"><p className="whitespace-nowrap text-[14px] font-semibold tabular-nums tracking-[-.02em] text-[#F59E0B]">{brl(ownerWalletValueForSale(item))}</p><p className="text-[10px] font-medium uppercase tracking-[.08em] text-slate-500">previsto</p></div><button type="button" onClick={() => onEdit(item)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/15 bg-cyan/10 text-cyan transition duration-[180ms] ease-out hover:border-cyan/35 hover:bg-cyan/15 hover:text-white" title="Abrir e editar venda"><Eye size={14} /></button><button type="button" onClick={() => onMarkPaid(item)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-money/25 bg-money/10 text-money shadow-[0_0_20px_rgba(16,185,129,.08)] transition duration-[180ms] ease-out hover:border-money/45 hover:bg-money/15 hover:text-white" aria-label={`Registrar caixa da venda de ${item.customerName}`} title="Registrar caixa / marcar venda como paga"><WalletCards size={14} /></button><button type="button" onClick={() => onDelete(item)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[.035] text-white/42 transition duration-[180ms] ease-out hover:border-danger/25 hover:bg-danger/10 hover:text-danger" title="Excluir venda"><Trash2 size={14} /></button></div></div>)}</div>;
}

function SaleDrawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-sm"><button type="button" aria-label="Fechar" className="absolute inset-0 cursor-default" onClick={onClose} /><aside className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#070b12] p-5 shadow-[0_30px_120px_rgba(0,0,0,.65)]"><button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-xl border border-white/10 bg-white/[.04] p-2 text-white/60 transition hover:text-white"><X size={18} /></button><div className="pr-12">{children}</div></aside></div>;
}

function ConfirmDeleteModal({ sale, onCancel, onConfirm }: { sale: SaleRecord; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[26px] border border-danger/25 bg-[#090d14] p-5 shadow-[0_30px_100px_rgba(0,0,0,.7)]"><div className="flex gap-3"><div className="h-fit rounded-2xl border border-danger/20 bg-danger/10 p-3 text-danger"><AlertTriangle size={20} /></div><div><h3 className="text-xl font-black text-white">Tem certeza que deseja excluir esta venda?</h3><p className="mt-2 text-sm leading-6 text-white/64">Essa ação remove o lançamento do painel. Ela não dispara notificação de pedido.</p><p className="mt-3 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-sm font-bold text-white/80">{sale.customerName} · {brl(sale.totalAmount)}</p></div></div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-black text-white/72 hover:text-white">Cancelar</button><button type="button" onClick={onConfirm} className="rounded-xl border border-danger/25 bg-danger/15 px-4 py-2 text-sm font-black text-danger hover:bg-danger/20 hover:text-white">Excluir venda</button></div></div></div>;
}

function SaleToast({ title, message, tone }: ToastState) {
  return <div className={cn("fixed right-5 top-5 z-50 flex max-w-md items-start gap-3 rounded-2xl border bg-[#07131c]/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,.55)]", toneBorder(tone))}><div className={cn("rounded-xl border p-2", toneColor(tone))}><CheckCircle2 size={18} /></div><div><p className="text-sm font-black text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/68">{message}</p></div></div>;
}

function WithdrawalList({ withdrawals }: { withdrawals: CashWithdrawal[] }) {
  const withdrawalNumberById = new Map(
    [...withdrawals]
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || a.withdrawnAt || "").getTime();
        const bTime = new Date(b.createdAt || b.withdrawnAt || "").getTime();
        return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
      })
      .map((item, index) => [item.id, `Saque ${String(index + 1).padStart(3, "0")}`])
  );

  return (
    <div className="mt-5 rounded-2xl border border-amber/20 bg-amber/[.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[.12em] text-slate-400/70">Saques registrados</p>
        <p className="text-[12px] font-medium text-slate-400/72">{withdrawals.length} no período</p>
      </div>
      <div className="mt-3 space-y-2.5">
        {withdrawals.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-300/[.06] bg-[#080D16]/72 px-3.5 py-3 transition duration-[180ms] ease-out hover:bg-white/[.035]">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-[-.01em] text-slate-100">{withdrawalNumberById.get(item.id) || "Saque"}</p>
              <p className="mt-0.5 truncate text-[12px] font-normal text-slate-400/70">{item.note || "Saque do caixa"} · {formatDate(item.withdrawnAt)}</p>
            </div>
            <p className="text-[14px] font-semibold tabular-nums tracking-[-.02em] text-[#FB7185]">-{brl(item.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WithdrawalDrawer({ form, balance, cashRows, isSaving, onClose, onSubmit, onUpdate }: { form: WithdrawalForm; balance: number; cashRows: SaleRecord[]; isSaving: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onUpdate: <K extends keyof WithdrawalForm>(field: K, value: WithdrawalForm[K]) => void }) {
  return (
    <SaleDrawer onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-5">
        <PanelHeader icon={<WalletCards size={18} />} title="Registrar saque" description="Use quando você retirar dinheiro que já entrou no caixa. O saldo diminui, mas as vendas continuam registradas." />
        <div className="rounded-2xl border border-money/20 bg-money/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">Saldo disponível no caixa</p>
          <p className="mt-2 text-3xl font-black text-money">{brl(balance)}</p>
        </div>
        <Field label="Valor sacado"><input className={inputClass} inputMode="decimal" value={form.amount} onChange={(event) => onUpdate("amount", event.target.value)} placeholder="R$ 1.678,69" required /></Field>
        <Field label="Data do saque"><input className={inputClass} type="date" value={form.withdrawnAt} onChange={(event) => onUpdate("withdrawnAt", event.target.value || todayKey())} required /></Field>
        <Field label="Observação"><textarea className={cn(inputClass, "min-h-24 resize-none")} value={form.note} onChange={(event) => onUpdate("note", event.target.value)} placeholder="Ex: saque para minha conta, pix recebido, retirada parcial..." /></Field>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">Vendas que serão vinculadas ao saque</p>
            <p className="text-xs font-black text-white/46">{cashRows.length} disponíveis</p>
          </div>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
            {cashRows.length ? cashRows.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/18 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-white">{item.customerName}</p>
                  <p className="text-[11px] font-semibold text-white/45">{formatDate(cashDateForSale(item))} · {platformLabel(item)}</p>
                </div>
                <p className="text-sm font-black text-money">{brl(ownerWalletValueForSale(item))}</p>
              </div>
            )) : <p className="text-xs font-bold text-white/45">Nenhuma venda disponível para vincular neste período.</p>}
          </div>
          <p className="mt-3 text-[11px] font-semibold text-white/40">Ao confirmar, o histórico mostra quais vendas foram retiradas do caixa.</p>
        </div>
        <button disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber/30 bg-amber px-6 py-3 text-sm font-black text-[#160c02] shadow-[0_0_44px_rgba(245,158,11,.18)] transition hover:bg-[#ffb82e] disabled:opacity-60"><WalletCards size={17} /> {isSaving ? "Registrando..." : "Confirmar saque"}</button>
      </form>
    </SaleDrawer>
  );
}

function CommandCard({ title, value, subtext, helper, comparison, tone, icon, featured = false, action }: { title: string; value: string; subtext: string; helper: string; comparison: string; tone: Tone; icon: ReactNode; featured?: boolean; action?: ReactNode }) {
  return <div className={cn("executive-card kau-surgical-card group relative overflow-hidden rounded-[26px] border p-4 transition duration-[180ms] ease-out hover:-translate-y-0.5", toneColor(tone), featured ? "min-h-[196px] shadow-[0_18px_58px_rgba(16,185,129,.09)]" : "min-h-[196px]")}><div className="pointer-events-none absolute inset-0 opacity-65 [background:radial-gradient(circle_at_84%_16%,rgba(255,255,255,.10),transparent_20%),linear-gradient(135deg,rgba(255,255,255,.052),transparent_54%)]" /><div className="relative flex items-start justify-between gap-3"><div><p className="text-[14px] font-semibold tracking-[-.018em] text-white">{title}</p><p className="mt-1 text-[11px] font-medium text-white/60">{subtext}</p></div><div className={cn("rounded-2xl border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.045)]", toneColor(tone))}>{icon}</div></div><p className={cn("relative mt-5 truncate font-semibold tabular-nums tracking-[-.055em]", featured ? "text-4xl md:text-[42px]" : "text-3xl")}>{value}</p><div className="relative mt-4 flex items-end justify-between gap-4"><div><p className="text-[11px] font-semibold text-white/80">{helper}</p><p className="mt-1 text-[11px] font-medium text-white/52">{comparison}</p></div><MiniSignal tone={tone} /></div>{action ? <div className="relative mt-3">{action}</div> : null}</div>;
}


function PremiumPanel({ children, className, glow = "none" }: { children: ReactNode; className?: string; glow?: "cyan" | "purple" | "none" }) {
  return <section className={cn("luxury-surface kau-surgical-surface relative overflow-hidden rounded-[28px] p-4 self-start", glow === "cyan" && "shadow-[0_24px_90px_rgba(24,215,255,.07)] after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_8%_0%,rgba(24,215,255,.10),transparent_28%)]", glow === "purple" && "shadow-[0_24px_90px_rgba(168,85,247,.085)] after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_92%_0%,rgba(168,85,247,.12),transparent_30%)]", className)}>{children}</section>;
}


function PanelHeader({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-slate-300/[.07] pb-4"><div className="flex gap-3"><div className="mt-1 rounded-xl border border-white/10 bg-white/[.045] p-2 text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">{icon}</div><div><h2 className="text-[20px] font-semibold tracking-[-.035em] text-white">{title}</h2><p className="mt-1 max-w-2xl text-[13px] leading-5 text-white/62">{description}</p></div></div>{typeof action === "string" ? <span className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/65">{action}</span> : action}</div>;
}


function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("rounded-xl px-3.5 py-2 text-[11px] font-medium uppercase tracking-[.08em] transition duration-[180ms] ease-out", active ? "bg-white/[.07] text-slate-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" : "text-slate-400/72 hover:bg-white/[.035] hover:text-slate-100")}>{children}</button>;
}

function EmptyCashState({ futureCount, onViewFuture }: { futureCount: number; onViewFuture: () => void }) {
  return <div className="rounded-[26px] border border-white/10 bg-white/[.025] p-6 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-purple/20 bg-purple/10 text-purple"><WalletCards size={23} /></div><p className="mt-4 text-base font-black text-white">Nenhum valor previsto para entrar neste período.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/58">Acompanhe as próximas entradas na aba ao lado.</p>{futureCount > 0 ? <button type="button" onClick={onViewFuture} className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-purple/25 bg-purple/10 px-4 py-2 text-xs font-black text-purple transition hover:bg-purple/15 hover:text-white">Ver próximos dias <ChevronRight size={14} /></button> : null}</div>;
}

function TableEmpty({ message }: { message: string }) {
  return <div className="grid min-h-[260px] place-items-center p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan/20 bg-cyan/10 text-cyan"><Search size={22} /></div><p className="mt-4 text-sm font-black text-white">{message}</p><p className="mt-2 text-xs text-white/52">Os lançamentos aparecem aqui assim que forem registrados. Cada nova venda também cria um lead operacional.</p></div></div>;
}

function PlatformButton({ platformId, active, onClick }: { platformId: SalesPlatformId; active: boolean; onClick: () => void }) {
  const platform = getSalesPlatform(platformId);
  if (!platform) return null;
  return <button type="button" onClick={onClick} className={cn("group flex min-h-[72px] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5", active ? platform.accentClass + " shadow-[0_0_35px_rgba(255,255,255,.04)]" : "border-white/10 bg-white/[.03] text-white/72 hover:bg-white/[.055] hover:text-white")}>
    <span className="grid h-11 w-16 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/95 px-2"><img src={platform.logoSrc} alt={platform.name} className="max-h-8 max-w-full object-contain" /></span>
    <span className="min-w-0"><span className="block text-sm font-black">{platform.name}</span><span className="mt-0.5 block text-[11px] font-semibold text-white/55">{platform.description}</span></span>
  </button>;
}

function PlatformTag({ platformId, fallback }: { platformId?: string; fallback?: string }) {
  const platform = getSalesPlatform(platformId);
  if (!platform) return <span className="inline-flex w-fit rounded-lg border border-white/10 bg-white/[.035] px-2 py-1 text-[10px] font-semibold uppercase text-white/45">—</span>;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-xl border px-2 py-1.5 text-[10px] font-semibold uppercase shadow-[inset_0_1px_0_rgba(255,255,255,.04)]",
        platform.accentClass
      )}
      title={platform.name}
    >
      <span className="grid h-6 w-10 shrink-0 place-items-center rounded-md border border-white/10 bg-white/95 px-1.5 shadow-[0_6px_18px_rgba(0,0,0,.22)]">
        <img src={platform.logoSrc} alt={platform.name} className="max-h-4 max-w-full object-contain" />
      </span>
      <span className="hidden sm:inline">{platform.name}</span>
    </span>
  );
}


function PlatformMini({ platformId }: { platformId?: string }) {
  const platform = getSalesPlatform(platformId);
  if (!platform) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-1.5 py-1 text-[9px] font-semibold uppercase", platform.accentClass)} title={platform.name}>
      <span className="grid h-5 w-8 shrink-0 place-items-center rounded-md bg-white/95 px-1">
        <img src={platform.logoSrc} alt={platform.name} className="max-h-3.5 max-w-full object-contain" />
      </span>
      <span className="hidden sm:inline">{platform.name}</span>
    </span>
  );
}


function SaleTypeButton({ title, description, active, onClick }: { title: string; description: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("rounded-2xl border px-4 py-4 text-left transition", active ? "border-money/35 bg-money/10 text-money shadow-[0_0_35px_rgba(16,185,129,.08)]" : "border-white/10 bg-white/[.03] text-white/72 hover:bg-white/[.055] hover:text-white")}><p className="text-sm font-black">{title}</p><p className="mt-1 text-xs text-white/58">{description}</p></button>;
}

function Preview({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return <div className={cn("rounded-2xl border p-4", toneColor(tone))}><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">{label}</p><p className="mt-2 truncate text-xl font-black">{value}</p></div>;
}

function MiniIndicator({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return <div className="relative overflow-hidden rounded-2xl border border-slate-300/[.075] bg-[rgba(15,23,42,.68)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]"><div className={cn("absolute left-0 top-0 h-full w-1", tone === "money" ? "bg-emerald-400/60" : tone === "cyan" ? "bg-sky-300/55" : tone === "purple" ? "bg-violet-300/45" : "bg-slate-300/25")} /><p className="text-[10px] font-medium uppercase tracking-[.12em] text-slate-400/65">{label}</p><p className="mt-2 truncate text-[22px] font-semibold tabular-nums tracking-[-.035em] text-slate-50">{value}</p></div>;
}

function FooterMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: Tone }) {
  return <div className={cn("relative overflow-hidden rounded-2xl border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]", toneColor(tone))}><div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.055),transparent_60%)]" /><p className="relative text-[10px] font-semibold uppercase tracking-[.13em] text-white/56">{label}</p><p className="relative mt-1 truncate text-sm font-semibold tracking-[-.025em]">{value}</p></div>;
}


function MiniSignal({ tone }: { tone: Tone }) {
  return <div className="flex h-12 items-end gap-1 opacity-70 transition duration-[180ms] group-hover:opacity-100">{[30, 54, 42, 68, 48].map((height, index) => <span key={index} className={cn("w-1.5 rounded-full", tone === "purple" ? "bg-purple" : tone === "cyan" ? "bg-cyan" : tone === "amber" ? "bg-amber" : "bg-money")} style={{ height }} />)}</div>;
}


function PaymentState({ paid }: { paid: boolean }) {
  return (
    <span className={cn(
      "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[.055em]",
      paid
        ? "border-[rgba(0,255,140,0.92)] bg-[linear-gradient(180deg,rgba(7,255,150,0.28),rgba(0,255,140,0.12))] text-[#72FFB8] shadow-[0_0_0_1px_rgba(0,255,140,0.08),0_0_8px_rgba(0,255,140,0.24),0_0_16px_rgba(0,255,140,0.18),inset_0_1px_0_rgba(255,255,255,.22),inset_0_0_0_1px_rgba(255,255,255,.06),inset_0_-10px_18px_rgba(0,255,140,.16)] backdrop-blur-[2px] saturate-[1.28]"
        : "border-[rgba(255,196,26,0.92)] bg-[linear-gradient(180deg,rgba(255,191,0,0.24),rgba(255,170,0,0.10))] text-[#FFD54A] shadow-[0_0_0_1px_rgba(255,196,26,0.06),0_0_5px_rgba(255,196,26,0.16),0_0_10px_rgba(255,196,26,0.10),inset_0_1px_0_rgba(255,248,214,.18),inset_0_0_0_1px_rgba(255,255,255,.04),inset_0_-10px_18px_rgba(255,186,0,.12)] backdrop-blur-[2px] saturate-[1.22]"
    )}>{paid ? "Pago" : "Pendente"}</span>
  );
}

function orderStatusBadgeClass(status?: OrderStatus | string) {
  const value = normalizeOrderStatus(status);
  if (value === "active") return "border-[rgba(0,255,140,0.92)] bg-[linear-gradient(180deg,rgba(7,255,150,0.28),rgba(0,255,140,0.12))] text-[#72FFB8] shadow-[0_0_0_1px_rgba(0,255,140,0.08),0_0_8px_rgba(0,255,140,0.24),0_0_16px_rgba(0,255,140,0.18),inset_0_1px_0_rgba(255,255,255,.22),inset_0_0_0_1px_rgba(255,255,255,.06),inset_0_-10px_18px_rgba(0,255,140,.16)] backdrop-blur-[2px] saturate-[1.28]";
  if (value === "cancelled") return "border-[rgba(255,88,88,0.90)] bg-[linear-gradient(180deg,rgba(255,74,74,0.26),rgba(255,59,59,0.11))] text-[#FF8A8A] shadow-[0_0_0_1px_rgba(255,88,88,0.08),0_0_6px_rgba(255,88,88,0.20),0_0_12px_rgba(255,88,88,0.12),inset_0_1px_0_rgba(255,244,244,.16),inset_0_0_0_1px_rgba(255,255,255,.04),inset_0_-10px_18px_rgba(255,74,74,.14)] backdrop-blur-[2px] saturate-[1.2]";
  if (value === "returned") return "border-[rgba(179,136,255,0.84)] bg-[linear-gradient(180deg,rgba(179,136,255,0.24),rgba(179,136,255,0.11))] text-[#C7A4FF] shadow-[0_0_0_1px_rgba(179,136,255,0.05),0_0_5px_rgba(179,136,255,0.16),0_0_10px_rgba(179,136,255,0.10),inset_0_1px_0_rgba(255,255,255,.15),inset_0_0_0_1px_rgba(255,255,255,.03),inset_0_-10px_18px_rgba(179,136,255,.10)] backdrop-blur-[2px] saturate-[1.18]";
  if (value === "review") return "border-[rgba(51,214,255,0.86)] bg-[linear-gradient(180deg,rgba(51,214,255,0.24),rgba(51,214,255,0.10))] text-[#7DE7FF] shadow-[0_0_0_1px_rgba(51,214,255,0.05),0_0_5px_rgba(51,214,255,0.16),0_0_11px_rgba(51,214,255,0.11),inset_0_1px_0_rgba(255,255,255,.16),inset_0_0_0_1px_rgba(255,255,255,.03),inset_0_-10px_18px_rgba(51,214,255,.10)] backdrop-blur-[2px] saturate-[1.18]";
  return "border-slate-300/[.42] bg-[linear-gradient(180deg,rgba(148,163,184,0.18),rgba(100,116,139,0.10))] text-slate-200 shadow-[0_0_0_1px_rgba(148,163,184,0.04),inset_0_1px_0_rgba(255,255,255,.12),inset_0_0_0_1px_rgba(255,255,255,.03),inset_0_-10px_18px_rgba(15,23,42,.20)] backdrop-blur-[2px]";
}

function OrderStatusBadge({ status }: { status?: OrderStatus | string }) {
  return <span className={cn("inline-flex w-fit rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase transition-[box-shadow,background-color,border-color,filter] duration-200 ease-out", orderStatusBadgeClass(status))}>{orderStatusLabel(status)}</span>;
}

function saleStatusBadgeClass(item: SaleRecord) {
  const status = saleStatusLabel(item);
  if (status === "LIBERADO") return "border-[rgba(0,255,140,0.92)] bg-[linear-gradient(180deg,rgba(7,255,150,0.28),rgba(0,255,140,0.12))] text-[#72FFB8] shadow-[0_0_0_1px_rgba(0,255,140,0.08),0_0_8px_rgba(0,255,140,0.24),0_0_16px_rgba(0,255,140,0.18),inset_0_1px_0_rgba(255,255,255,.22),inset_0_0_0_1px_rgba(255,255,255,.06),inset_0_-10px_18px_rgba(0,255,140,.16)] backdrop-blur-[2px] saturate-[1.28]";
  if (status === "PENDENTE") return "border-[rgba(255,196,26,0.92)] bg-[linear-gradient(180deg,rgba(255,191,0,0.24),rgba(255,170,0,0.10))] text-[#FFD54A] shadow-[0_0_0_1px_rgba(255,196,26,0.06),0_0_5px_rgba(255,196,26,0.16),0_0_10px_rgba(255,196,26,0.10),inset_0_1px_0_rgba(255,248,214,.18),inset_0_0_0_1px_rgba(255,255,255,.04),inset_0_-10px_18px_rgba(255,186,0,.12)] backdrop-blur-[2px] saturate-[1.22]";
  if (status === "CANCELADO") return "border-[rgba(255,88,88,0.90)] bg-[linear-gradient(180deg,rgba(255,74,74,0.26),rgba(255,59,59,0.11))] text-[#FF8A8A] shadow-[0_0_0_1px_rgba(255,88,88,0.08),0_0_6px_rgba(255,88,88,0.20),0_0_12px_rgba(255,88,88,0.12),inset_0_1px_0_rgba(255,244,244,.16),inset_0_0_0_1px_rgba(255,255,255,.04),inset_0_-10px_18px_rgba(255,74,74,.14)] backdrop-blur-[2px] saturate-[1.2]";
  if (status === "DEVOLVIDO") return "border-[rgba(179,136,255,0.84)] bg-[linear-gradient(180deg,rgba(179,136,255,0.24),rgba(179,136,255,0.11))] text-[#C7A4FF] shadow-[0_0_0_1px_rgba(179,136,255,0.05),0_0_5px_rgba(179,136,255,0.16),0_0_10px_rgba(179,136,255,0.10),inset_0_1px_0_rgba(255,255,255,.15),inset_0_0_0_1px_rgba(255,255,255,.03),inset_0_-10px_18px_rgba(179,136,255,.10)] backdrop-blur-[2px] saturate-[1.18]";
  if (status === "EM ANÁLISE") return "border-[rgba(51,214,255,0.86)] bg-[linear-gradient(180deg,rgba(51,214,255,0.24),rgba(51,214,255,0.10))] text-[#7DE7FF] shadow-[0_0_0_1px_rgba(51,214,255,0.05),0_0_5px_rgba(51,214,255,0.16),0_0_11px_rgba(51,214,255,0.11),inset_0_1px_0_rgba(255,255,255,.16),inset_0_0_0_1px_rgba(255,255,255,.03),inset_0_-10px_18px_rgba(51,214,255,.10)] backdrop-blur-[2px] saturate-[1.18]";
  return "border-slate-300/[.42] bg-[linear-gradient(180deg,rgba(148,163,184,0.18),rgba(100,116,139,0.10))] text-slate-200 shadow-[0_0_0_1px_rgba(148,163,184,0.04),inset_0_1px_0_rgba(255,255,255,.12),inset_0_0_0_1px_rgba(255,255,255,.03),inset_0_-10px_18px_rgba(15,23,42,.20)] backdrop-blur-[2px]";
}

function SaleStatusBadge({ item }: { item: SaleRecord }) {
  return (
    <span className={cn("inline-flex w-fit min-w-[74px] items-center justify-center gap-1 rounded-full border px-2 py-[5px] text-[8.5px] font-semibold uppercase leading-none tracking-[.045em] transition-[box-shadow,background-color,border-color,filter] duration-200 ease-out", saleStatusBadgeClass(item))}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {saleStatusLabel(item)}
    </span>
  );
}


function Tag({ tone }: { tone: string }) {
  const color = tone === "PAD" ? "border-cyan/25 bg-cyan/10 text-cyan" : tone === "COD" ? "border-amber/25 bg-amber/10 text-amber" : "border-money/25 bg-money/10 text-money";
  return <span className={cn("inline-flex w-fit rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase", color)}>{tone}</span>;
}


function OrderTagSelector({ selected, onChange }: { selected: OrderTag[]; onChange: (tags: OrderTag[]) => void }) {
  const normalized = normalizeOrderTags(selected);
  const selectedSet = new Set(normalized);
  const activeOptions = normalized
    .map((tag) => orderTagOptions.find((option) => option.value === tag))
    .filter(Boolean) as typeof orderTagOptions;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function closeMenu() {
      setIsOpen(false);
      setQuery("");
    }
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) closeMenu();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);
  const filteredOptions = orderTagOptions.filter((option) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return `${option.label} ${option.hint} ${option.value}`.toLowerCase().includes(term);
  });

  function toggle(tag: OrderTag) {
    const next = selectedSet.has(tag)
      ? normalized.filter((item) => item !== tag)
      : [...normalized, tag];
    onChange(next);
  }

  return (
    <div ref={menuRef} className="relative rounded-2xl border border-white/[.075] bg-white/[.022] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-[.14em] text-slate-400/70">Etiquetas</span>
        {activeOptions.length ? activeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn(
              "group/tag inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.075em] transition duration-[180ms] ease-out hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(0,0,0,.18)]",
              nativeTagTone(option.tone, option.level)
            )}
            title={`Remover ${option.label}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 transition group-hover/tag:opacity-100" />
            {option.label}
            <X size={11} className="opacity-35 transition group-hover/tag:opacity-80" />
          </button>
        )) : (
          <span className="rounded-full border border-white/[.07] bg-white/[.025] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.07em] text-white/38">Sem etiqueta</span>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan/18 bg-cyan/[.055] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.075em] text-cyan transition duration-[180ms] ease-out hover:-translate-y-px hover:border-cyan/30 hover:bg-cyan/[.09]"
        >
          <Plus size={12} /> adicionar
        </button>
      </div>

      <p className="mt-2 text-[11px] font-medium leading-4 text-slate-400/72">{orderTagSummary(normalized)}</p>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/[.10] bg-[#070B12]/[.98] p-2 shadow-[0_28px_90px_rgba(0,0,0,.48),inset_0_1px_0_rgba(255,255,255,.055)] backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.035] px-3 py-2">
            <Search size={14} className="text-white/35" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar etiqueta operacional..."
              className="min-w-0 flex-1 bg-transparent text-xs font-medium text-white outline-none placeholder:text-white/32"
            />
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto pr-1">
            {filteredOptions.map((option) => {
              const active = selectedSet.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { toggle(option.value); setIsOpen(false); setQuery(""); }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition duration-[160ms] ease-out hover:bg-white/[.055]",
                    active ? "bg-white/[.055]" : ""
                  )}
                >
                  <span className="min-w-0">
                    <span className={cn("inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.08em]", active ? "text-white" : "text-white/76")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", menuDotTone(option.tone, option.level))} />
                      {option.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-white/38">{option.hint}</span>
                  </span>
                  <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border transition", active ? "border-cyan/35 bg-cyan/15 text-cyan" : "border-white/10 text-white/22")}>
                    {active ? <CheckCircle2 size={13} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function nativeTagTone(tone: Tone, level?: string) {
  if (level === "crítico" || tone === "danger") return "border-danger/24 bg-danger/[.075] text-danger shadow-[0_0_18px_rgba(244,63,94,.055)]";
  if (tone === "money") return "border-money/22 bg-money/[.075] text-money shadow-[0_0_18px_rgba(34,197,94,.05)]";
  if (tone === "cyan") return "border-cyan/22 bg-cyan/[.07] text-cyan";
  if (tone === "amber") return "border-amber/22 bg-amber/[.075] text-amber";
  if (tone === "purple") return "border-purple/22 bg-purple/[.07] text-purple";
  return "border-white/[.095] bg-white/[.035] text-white/66";
}

function menuDotTone(tone: Tone, level?: string) {
  if (level === "crítico" || tone === "danger") return "bg-danger shadow-[0_0_14px_rgba(244,63,94,.45)]";
  if (tone === "money") return "bg-money shadow-[0_0_14px_rgba(34,197,94,.35)]";
  if (tone === "cyan") return "bg-cyan shadow-[0_0_14px_rgba(56,189,248,.35)]";
  if (tone === "amber") return "bg-amber shadow-[0_0_14px_rgba(245,158,11,.32)]";
  if (tone === "purple") return "bg-purple shadow-[0_0_14px_rgba(167,139,250,.30)]";
  return "bg-white/45";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className={labelClass}>{label}</label>{children}</div>;
}

function toneColor(tone: Tone) {
  if (tone === "money") return "border-money/24 bg-money/[.115] text-money";
  if (tone === "cyan") return "border-cyan/24 bg-cyan/[.105] text-cyan";
  if (tone === "purple") return "border-purple/24 bg-purple/[.105] text-purple";
  if (tone === "amber") return "border-amber/28 bg-amber/[.12] text-amber";
  if (tone === "danger") return "border-danger/24 bg-danger/[.105] text-danger";
  return "border-white/10 bg-white/[.035] text-white";
}


function toneBorder(tone: Exclude<Tone, "neutral">) {
  if (tone === "money") return "border-money/25";
  if (tone === "cyan") return "border-cyan/25";
  if (tone === "purple") return "border-purple/25";
  if (tone === "amber") return "border-amber/25";
  return "border-danger/25";
}
