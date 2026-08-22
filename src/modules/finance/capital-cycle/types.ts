import type { CapitalCycleResult } from "@/data/capital-cycle";

export type CapitalCycleResponse = CapitalCycleResult & {
  settings: {
    delinquencyDaysAfterDelivery: number | null;
    setupRequired: boolean;
  };
  filters: {
    origins: string[];
    states: string[];
    sellers: string[];
    campaigns: Array<{ id: string; name: string; status: string }>;
  };
};

export type CapitalCycleFilters = {
  start: string;
  end: string;
  origin: string;
  campaign: string;
  state: string;
  seller: string;
};

export type TableStageFilter = "all" | "transit" | "delivered" | "delinquent";
export type TableAgeFilter = "all" | "0-3" | "4-7" | "8-15" | "15+" | "16-30" | "30+" | "unknown";

export const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const initialCapitalFilters = (): CapitalCycleFilters => {
  const end = localDate();
  return { start: `${end.slice(0, 7)}-01`, end, origin: "all", campaign: "all", state: "all", seller: "all" };
};

export const emptyCapitalData = (): CapitalCycleResponse => ({
  summary: {
    averageReturnDays: null,
    medianReturnDays: null,
    p90ReturnDays: null,
    completedCycles: 0,
    cohortCapital: 0,
    cohortReturnedCapital: 0,
    cohortReturnRate: null,
    returnedCapitalInPeriod: 0
  },
  current: {
    referenceDate: localDate(),
    historicalSnapshotSupported: false,
    openCapital: 0,
    transitCapital: 0,
    awaitingPaymentCapital: 0,
    agedCapital: 0,
    agedPercent: null,
    delinquentCapital: null,
    delinquentCustomers: null,
    delinquencyRateByValue: null,
    delinquencyRateByOrders: null
  },
  cycle: {
    purchaseToDelivery: null,
    deliveryToPayment: null,
    total: null,
    logisticsShare: null,
    postDeliveryShare: null
  },
  aging: [],
  timeline: [],
  byOrigin: [],
  byState: [],
  byCampaign: [],
  bySeller: [],
  openCapital: [],
  dataQuality: {
    completenessPercent: null,
    completeRecords: 0,
    eligibleRecords: 0,
    reviewCount: 0,
    issues: []
  },
  settings: { delinquencyDaysAfterDelivery: null, setupRequired: false },
  filters: { origins: [], states: [], sellers: [], campaigns: [] }
});

export const money = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
}).format(value || 0);

export const decimal = (value: number | null, digits = 1) => value == null
  ? "—"
  : value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const percent = (value: number | null) => value == null ? "—" : `${decimal(value)}%`;

export const dateLabel = (value?: string) => value
  ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
  : "—";

export function originLabel(value: string) {
  return ({ payt: "Payt", coinzz: "Coinzz", logzz: "Logzz", manual: "Venda Manual", none: "Sem origem" } as Record<string, string>)[value] || value || "Sem origem";
}
export function stageLabel(value: string) {
  if (value === "delinquent") return "Inadimplente";
  if (value === "awaiting_payment") return "Aguardando pagamento";
  return "Em trânsito";
}
