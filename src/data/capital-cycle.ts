import { isOperationalSale, isPaymentConfirmed, isSaleDelivered } from "@/data/sale-financial-state";

export type CapitalCycleSale = {
  id: string; customerName: string; customerPhone?: string; saleDate?: string; deliveryDate?: string; paymentDate?: string;
  paymentStatus?: string; deliveryStatus?: string; orderStatus?: string; totalAmount: number;
  operationCommissionAmount?: number | null; operationCommissionPercent?: number | null;
  origin?: string; state?: string; seller?: string; campaignId?: string; campaignName?: string;
};

export type CapitalCycleFilters = { start: string; end: string; referenceDate: string; origin?: string; state?: string; seller?: string; campaign?: string; delinquencyDaysAfterDelivery?: number | null };
export type CapitalCycleRow = CapitalCycleSale & { capital: number; daysOpen: number | null; stage: "transit" | "awaiting_payment" | "delinquent" };
export type CapitalCycleGroup = { key: string; label: string; averageDays: number | null; medianDays: number | null; completedCycles: number; generatedCapital: number; returnedCapital: number; openCapital: number; sales: number };
export type CapitalCycleResult = {
  summary: { averageReturnDays: number | null; medianReturnDays: number | null; p90ReturnDays: number | null; completedCycles: number; cohortCapital: number; cohortReturnedCapital: number; cohortReturnRate: number | null; returnedCapitalInPeriod: number };
  current: { referenceDate: string; historicalSnapshotSupported: false; openCapital: number; transitCapital: number; awaitingPaymentCapital: number; agedCapital: number; agedPercent: number | null; delinquentCapital: number | null; delinquentCustomers: number | null; delinquencyRateByValue: number | null; delinquencyRateByOrders: number | null };
  cycle: { purchaseToDelivery: number | null; deliveryToPayment: number | null; total: number | null; logisticsShare: number | null; postDeliveryShare: number | null };
  aging: Array<{ key: string; label: string; capital: number; sales: number; percent: number }>;
  timeline: Array<{ key: string; label: string; averageDays: number; cycles: number }>;
  byOrigin: CapitalCycleGroup[]; byState: CapitalCycleGroup[]; byCampaign: CapitalCycleGroup[]; bySeller: CapitalCycleGroup[];
  openCapital: CapitalCycleRow[];
  dataQuality: { completenessPercent: number | null; completeRecords: number; eligibleRecords: number; reviewCount: number; issues: Array<{ saleId: string; customerName: string; reason: string }> };
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const pureDate = (value?: string) => value && datePattern.test(value.slice(0, 10)) ? value.slice(0, 10) : undefined;
const dayNumber = (value: string) => { const [year, month, day] = value.split("-").map(Number); return Date.UTC(year, month - 1, day) / 86400000; };
export const daysBetween = (start?: string, end?: string) => { const a = pureDate(start); const b = pureDate(end); return a && b ? dayNumber(b) - dayNumber(a) : null; };
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const median = (values: number[]) => { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
const p90 = (values: number[]) => { if (values.length < 10) return null; const sorted = [...values].sort((a, b) => a - b); return sorted[Math.ceil(sorted.length * .9) - 1]; };
export function operationCapital(sale: CapitalCycleSale) { if (sale.operationCommissionAmount != null && Number.isFinite(Number(sale.operationCommissionAmount))) return Math.max(0, Number(sale.operationCommissionAmount)); if (sale.operationCommissionPercent != null && Number.isFinite(Number(sale.operationCommissionPercent))) return Math.max(0, Number(sale.totalAmount || 0) * (Number(sale.operationCommissionPercent) / 100)); return 0; }
const valid = (sale: CapitalCycleSale) => isOperationalSale({ order_status: sale.orderStatus });
const dimensionMatch = (sale: CapitalCycleSale, filters: CapitalCycleFilters) => (!filters.origin || filters.origin === "all" || sale.origin === filters.origin) && (!filters.state || filters.state === "all" || sale.state === filters.state) && (!filters.seller || filters.seller === "all" || sale.seller === filters.seller) && (!filters.campaign || filters.campaign === "all" || (filters.campaign === "none" ? !sale.campaignId : sale.campaignId === filters.campaign));
const stageFor = (sale: CapitalCycleSale, referenceDate: string, delinquencyDays?: number | null): CapitalCycleRow["stage"] => { const afterDelivery = daysBetween(sale.deliveryDate, referenceDate); if (isSaleDelivered(sale) && delinquencyDays != null && afterDelivery != null && afterDelivery > delinquencyDays) return "delinquent"; return isSaleDelivered(sale) ? "awaiting_payment" : "transit"; };
const agingBand = (days: number) => days <= 3 ? "0-3" : days <= 7 ? "4-7" : days <= 15 ? "8-15" : days <= 30 ? "16-30" : "30+";
const agingLabels: Record<string, string> = { "0-3": "0–3 dias", "4-7": "4–7 dias", "8-15": "8–15 dias", "16-30": "16–30 dias", "30+": "30+ dias" };

function groupSales(sales: CapitalCycleSale[], openRows: CapitalCycleRow[], keyOf: (sale: CapitalCycleSale) => string, labelOf: (key: string) => string): CapitalCycleGroup[] {
  const keys = new Set(sales.map(keyOf)); openRows.forEach((sale) => keys.add(keyOf(sale)));
  return Array.from(keys).map((key) => { const rows = sales.filter((sale) => keyOf(sale) === key); const open = openRows.filter((sale) => keyOf(sale) === key); const cycles = rows.map((sale) => isPaymentConfirmed({ payment_status: sale.paymentStatus }) ? daysBetween(sale.saleDate, sale.paymentDate) : null).filter((value): value is number => value != null && value >= 0); return { key, label: labelOf(key), averageDays: mean(cycles), medianDays: median(cycles), completedCycles: cycles.length, generatedCapital: rows.reduce((sum, sale) => sum + operationCapital(sale), 0), returnedCapital: rows.filter((sale) => isPaymentConfirmed({ payment_status: sale.paymentStatus })).reduce((sum, sale) => sum + operationCapital(sale), 0), openCapital: open.reduce((sum, sale) => sum + sale.capital, 0), sales: rows.length }; }).sort((a, b) => (a.averageDays ?? Infinity) - (b.averageDays ?? Infinity));
}

export function calculateCapitalCycle(allSales: CapitalCycleSale[], filters: CapitalCycleFilters): CapitalCycleResult {
  const considered = allSales.filter((sale) => valid(sale) && dimensionMatch(sale, filters));
  const cohort = considered.filter((sale) => { const date = pureDate(sale.saleDate); return date && date >= filters.start && date <= filters.end; });
  const paidCohort = cohort.filter((sale) => isPaymentConfirmed({ payment_status: sale.paymentStatus }));
  const completed = paidCohort.map((sale) => ({ sale, days: daysBetween(sale.saleDate, sale.paymentDate) })).filter((item): item is { sale: CapitalCycleSale; days: number } => item.days != null && item.days >= 0);
  const returnDays = completed.map((item) => item.days);
  const deliveryDays = cohort.map((sale) => daysBetween(sale.saleDate, sale.deliveryDate)).filter((value): value is number => value != null && value >= 0);
  const postDeliveryDays = paidCohort.map((sale) => daysBetween(sale.deliveryDate, sale.paymentDate)).filter((value): value is number => value != null && value >= 0);
  const openCapital = considered.filter((sale) => { const saleDate = pureDate(sale.saleDate); return !isPaymentConfirmed({ payment_status: sale.paymentStatus }) && (!saleDate || saleDate <= filters.referenceDate); }).map((sale) => { const daysOpen = daysBetween(sale.saleDate, filters.referenceDate); return { ...sale, capital: operationCapital(sale), daysOpen: daysOpen == null ? null : Math.max(0, daysOpen), stage: stageFor(sale, filters.referenceDate, filters.delinquencyDaysAfterDelivery) }; }).filter((sale) => sale.capital > 0);
  const openTotal = openCapital.reduce((sum, sale) => sum + sale.capital, 0);
  const delinquent = filters.delinquencyDaysAfterDelivery == null ? null : openCapital.filter((sale) => sale.stage === "delinquent");
  const bands = ["0-3", "4-7", "8-15", "16-30", "30+"].map((key) => { const rows = openCapital.filter((sale) => sale.daysOpen != null && agingBand(sale.daysOpen) === key); const capital = rows.reduce((sum, sale) => sum + sale.capital, 0); return { key, label: agingLabels[key], capital, sales: rows.length, percent: openTotal ? (capital / openTotal) * 100 : 0 }; });
  const undatedOpen = openCapital.filter((sale) => sale.daysOpen == null);
  if (undatedOpen.length) { const capital = undatedOpen.reduce((sum, sale) => sum + sale.capital, 0); bands.push({ key: "unknown", label: "Sem data de compra", capital, sales: undatedOpen.length, percent: openTotal ? (capital / openTotal) * 100 : 0 }); }
  const cohortCapital = cohort.reduce((sum, sale) => sum + operationCapital(sale), 0);
  const cohortReturned = paidCohort.reduce((sum, sale) => sum + operationCapital(sale), 0);
  const totalAverage = mean(returnDays); const logisticsAverage = mean(deliveryDays); const postDeliveryAverage = mean(postDeliveryDays);
  const issues: CapitalCycleResult["dataQuality"]["issues"] = [];
  considered.forEach((sale) => { const saleDate = pureDate(sale.saleDate); if (!saleDate) issues.push({ saleId: sale.id, customerName: sale.customerName, reason: "Venda sem data de compra válida" }); if (!operationCapital(sale)) issues.push({ saleId: sale.id, customerName: sale.customerName, reason: "Venda sem valor líquido operacional" }); if (String(sale.deliveryStatus || "").toLowerCase() === "delivered" && !pureDate(sale.deliveryDate)) issues.push({ saleId: sale.id, customerName: sale.customerName, reason: "Venda entregue sem data de entrega" }); if (pureDate(sale.deliveryDate) && String(sale.deliveryStatus || "").toLowerCase() !== "delivered") issues.push({ saleId: sale.id, customerName: sale.customerName, reason: "Data de entrega preenchida com status logístico divergente" }); if (isPaymentConfirmed({ payment_status: sale.paymentStatus }) && !pureDate(sale.paymentDate)) issues.push({ saleId: sale.id, customerName: sale.customerName, reason: "Venda paga sem data de pagamento" }); if (daysBetween(sale.saleDate, sale.deliveryDate) != null && daysBetween(sale.saleDate, sale.deliveryDate)! < 0) issues.push({ saleId: sale.id, customerName: sale.customerName, reason: "Data de entrega anterior à compra" }); if (daysBetween(sale.saleDate, sale.paymentDate) != null && daysBetween(sale.saleDate, sale.paymentDate)! < 0) issues.push({ saleId: sale.id, customerName: sale.customerName, reason: "Data de pagamento anterior à compra" }); if (daysBetween(sale.deliveryDate, sale.paymentDate) != null && daysBetween(sale.deliveryDate, sale.paymentDate)! < 0) issues.push({ saleId: sale.id, customerName: sale.customerName, reason: "Pagamento anterior à entrega" }); });
  const issueSales = new Set(issues.map((issue) => issue.saleId));
  const timelineMap = new Map<string, number[]>(); completed.forEach(({ sale, days }) => { const key = pureDate(sale.saleDate)!.slice(0, 7); timelineMap.set(key, [...(timelineMap.get(key) || []), days]); });
  const campaignLabel = (key: string) => key === "none" ? "Sem campanha" : considered.find((sale) => sale.campaignId === key)?.campaignName || "Campanha";
  return {
    summary: { averageReturnDays: mean(returnDays), medianReturnDays: median(returnDays), p90ReturnDays: p90(returnDays), completedCycles: completed.length, cohortCapital, cohortReturnedCapital: cohortReturned, cohortReturnRate: cohortCapital ? (cohortReturned / cohortCapital) * 100 : null, returnedCapitalInPeriod: considered.filter((sale) => { const paymentDate = pureDate(sale.paymentDate); return isPaymentConfirmed({ payment_status: sale.paymentStatus }) && Boolean(paymentDate && paymentDate >= filters.start && paymentDate <= filters.end); }).reduce((sum, sale) => sum + operationCapital(sale), 0) },
    current: { referenceDate: filters.referenceDate, historicalSnapshotSupported: false, openCapital: openTotal, transitCapital: openCapital.filter((sale) => sale.stage === "transit").reduce((sum, sale) => sum + sale.capital, 0), awaitingPaymentCapital: openCapital.filter((sale) => sale.stage !== "transit").reduce((sum, sale) => sum + sale.capital, 0), agedCapital: openCapital.filter((sale) => sale.daysOpen != null && sale.daysOpen > 15).reduce((sum, sale) => sum + sale.capital, 0), agedPercent: openTotal ? (openCapital.filter((sale) => sale.daysOpen != null && sale.daysOpen > 15).reduce((sum, sale) => sum + sale.capital, 0) / openTotal) * 100 : null, delinquentCapital: delinquent ? delinquent.reduce((sum, sale) => sum + sale.capital, 0) : null, delinquentCustomers: delinquent?.length ?? null, delinquencyRateByValue: delinquent && openTotal ? (delinquent.reduce((sum, sale) => sum + sale.capital, 0) / openTotal) * 100 : null, delinquencyRateByOrders: delinquent && openCapital.length ? (delinquent.length / openCapital.length) * 100 : null },
    cycle: { purchaseToDelivery: logisticsAverage, deliveryToPayment: postDeliveryAverage, total: totalAverage, logisticsShare: totalAverage && logisticsAverage != null ? (logisticsAverage / totalAverage) * 100 : null, postDeliveryShare: totalAverage && postDeliveryAverage != null ? (postDeliveryAverage / totalAverage) * 100 : null },
    aging: bands,
    timeline: Array.from(timelineMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, values]) => ({ key, label: new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${key}-15T12:00:00Z`)), averageDays: mean(values) || 0, cycles: values.length })),
    byOrigin: groupSales(cohort, openCapital, (sale) => sale.origin || "none", originLabel), byState: groupSales(cohort, openCapital, (sale) => sale.state || "none", (key) => key === "none" ? "Sem UF" : key), byCampaign: groupSales(cohort, openCapital, (sale) => sale.campaignId || "none", campaignLabel), bySeller: groupSales(cohort, openCapital, (sale) => sale.seller || "none", (key) => key === "none" ? "Sem vendedor" : key),
    openCapital: openCapital.sort((a, b) => (b.daysOpen ?? -1) - (a.daysOpen ?? -1)),
    dataQuality: { completenessPercent: considered.length ? ((considered.length - issueSales.size) / considered.length) * 100 : null, completeRecords: considered.length - issueSales.size, eligibleRecords: considered.length, reviewCount: issueSales.size, issues }
  };
}

function originLabel(key: string) { return ({ payt: "Payt", coinzz: "Coinzz", logzz: "Logzz", manual: "Venda Manual", none: "Sem origem" } as Record<string, string>)[key] || key; }
