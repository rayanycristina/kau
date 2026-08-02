import type { OrderStatus, SaleRecord } from "@/data/sales-types";

export type SaleVisualStatus = "LIBERADO" | "PENDENTE" | "CANCELADO" | "DEVOLVIDO" | "PERDIDO" | "EM ANÁLISE";
export type SaleBadgeVariant = "released" | "pending" | "cancelled" | "returned" | "lost" | "review";

export type SaleFinancialState = {
  orderStatus: OrderStatus;
  isValidSale: boolean;
  countsRevenue: boolean;
  countsCommission: boolean;
  countsCash: boolean;
  countsRanking: boolean;
  isPaymentConfirmed: boolean;
  visualStatus: SaleVisualStatus;
  badgeVariant: SaleBadgeVariant;
};

type SaleStateInput = Partial<Pick<SaleRecord, "orderStatus" | "paymentStatus" | "deliveryStatus" | "deliveryType" | "paymentMethod">> & {
  order_status?: string | null;
  status_pedido?: string | null;
  payment_status?: string | null;
  delivery_status?: string | null;
  delivery_type?: string | null;
  payment_method?: string | null;
  notes?: string | null;
};

export function normalizeOrderStatus(status?: OrderStatus | string | null): OrderStatus {
  const value = String(status || "active").toLowerCase().trim();
  if (["cancelled", "canceled", "cancelado", "cancelada"].includes(value)) return "cancelled";
  if (["returned", "devolvido", "devolvida", "devolução", "devolucao"].includes(value)) return "returned";
  if (["lost", "perdido", "perdida"].includes(value)) return "lost";
  if (["review", "em análise", "em analise", "analise", "análise", "em_analise", "em-analise"].includes(value)) return "review";
  return "active";
}

export function readOrderStatusMarker(value: unknown): OrderStatus | undefined {
  const match = String(value || "").match(/\[KAU_ORDER_STATUS:([^\]]+)\]/i);
  return match ? normalizeOrderStatus(match[1]) : undefined;
}

export function getOrderStatusFromSale(sale: SaleStateInput): OrderStatus {
  return normalizeOrderStatus(sale.orderStatus || sale.order_status || sale.status_pedido || readOrderStatusMarker(sale.notes) || "active");
}

export function isPaymentConfirmed(sale: SaleStateInput): boolean {
  return String(sale.paymentStatus || sale.payment_status || "").trim().toLowerCase() === "paid";
}

export function getSaleFinancialState(sale: SaleStateInput): SaleFinancialState {
  const orderStatus = getOrderStatusFromSale(sale);
  const isValidSale = orderStatus === "active";
  const paymentConfirmed = isPaymentConfirmed(sale);

  if (orderStatus === "cancelled") {
    return { orderStatus, isValidSale: false, countsRevenue: false, countsCommission: false, countsCash: false, countsRanking: false, isPaymentConfirmed: paymentConfirmed, visualStatus: "CANCELADO", badgeVariant: "cancelled" };
  }
  if (orderStatus === "returned") {
    return { orderStatus, isValidSale: false, countsRevenue: false, countsCommission: false, countsCash: false, countsRanking: false, isPaymentConfirmed: paymentConfirmed, visualStatus: "DEVOLVIDO", badgeVariant: "returned" };
  }
  if (orderStatus === "lost") {
    return { orderStatus, isValidSale: false, countsRevenue: false, countsCommission: false, countsCash: false, countsRanking: false, isPaymentConfirmed: paymentConfirmed, visualStatus: "PERDIDO", badgeVariant: "lost" };
  }
  if (orderStatus === "review") {
    return { orderStatus, isValidSale: false, countsRevenue: false, countsCommission: false, countsCash: false, countsRanking: false, isPaymentConfirmed: paymentConfirmed, visualStatus: "EM ANÁLISE", badgeVariant: "review" };
  }

  return {
    orderStatus,
    isValidSale,
    countsRevenue: true,
    countsCommission: true,
    countsCash: paymentConfirmed,
    countsRanking: true,
    isPaymentConfirmed: paymentConfirmed,
    visualStatus: paymentConfirmed ? "LIBERADO" : "PENDENTE",
    badgeVariant: paymentConfirmed ? "released" : "pending"
  };
}

export function isValidSaleForMetrics(sale: SaleStateInput): boolean {
  return getSaleFinancialState(sale).isValidSale;
}

export function saleVisualStatusLabel(sale: SaleStateInput): SaleVisualStatus {
  return getSaleFinancialState(sale).visualStatus;
}
