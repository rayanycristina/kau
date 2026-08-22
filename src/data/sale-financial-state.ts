import type { OrderStatus } from "@/data/sales-types";

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

type SaleStateInput = {
  orderStatus?: OrderStatus | string | null;
  paymentStatus?: string | null;
  deliveryStatus?: string | null;
  deliveryType?: string | null;
  paymentMethod?: string | null;
  receivedDate?: string | null;
  deletedAt?: string | null;
  order_status?: string | null;
  status_pedido?: string | null;
  payment_status?: string | null;
  delivery_status?: string | null;
  received_date?: string | null;
  deliveryDate?: string | null;
  delivery_date?: string | null;
  deleted_at?: string | null;
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

export const isSalePaid = isPaymentConfirmed;

export function isSaleDelivered(sale: SaleStateInput): boolean {
  const deliveryStatus = String(sale.deliveryStatus || sale.delivery_status || "").trim().toLowerCase();
  const deliveryDate = String(sale.receivedDate || sale.received_date || sale.deliveryDate || sale.delivery_date || "").trim();
  return deliveryStatus === "delivered" || /^\d{4}-\d{2}-\d{2}/.test(deliveryDate);
}

export function isOperationalSale(sale: SaleStateInput): boolean {
  const deletedAt = String(sale.deletedAt || sale.deleted_at || "").trim();
  return !deletedAt && getOrderStatusFromSale(sale) === "active";
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
