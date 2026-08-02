export type GuaranteeType = "conditional" | "mandatory";
export type GuaranteeStatus = "risk" | "due" | "paid" | "released" | "inactive";

export type GuaranteeSetting = {
  id: string; platform: string; paymentMode: string; defaultAmount: number;
  isActive: boolean; effectiveFrom: string; createdAt?: string; updatedAt?: string;
};

export type PostpaidGuarantee = {
  id: string; saleId: string; guaranteeType: GuaranteeType; guaranteeAmount: number;
  isActive: boolean; paidAmount?: number; paidAt?: string; expenseId?: string;
  notes?: string; createdAt?: string; updatedAt?: string; status: GuaranteeStatus;
  sale: { customerName: string; productName: string; totalAmount: number; saleDate: string;
    salePlatform?: string; paymentMethod?: string; paymentStatus?: string; deliveryType?: string;
    deliveryStatus?: string; orderStatus?: string };
};

export const guaranteeTypeLabels: Record<GuaranteeType, string> = { conditional: "Condicional", mandatory: "Obrigatória" };
export const guaranteeStatusLabels: Record<GuaranteeStatus, string> = { risk: "Em risco", due: "A pagar", paid: "Paga", released: "Liberada", inactive: "Inativa" };

type GuaranteeSaleState = {
  paymentStatus?: unknown;
  payment_status?: unknown;
  orderStatus?: unknown;
  order_status?: unknown;
};

// Garantias Coinzz PAD usam exclusivamente a confirmação financeira explícita.
// Estados de entrega são deliberadamente ignorados: entrega não significa pagamento.
export function isGuaranteeCustomerPaymentConfirmed(sale: GuaranteeSaleState) {
  return String(sale.paymentStatus ?? sale.payment_status ?? "").trim().toLowerCase() === "paid";
}

export function isGuaranteeSaleFinanciallyValid(sale: GuaranteeSaleState) {
  return String(sale.orderStatus ?? sale.order_status ?? "active").trim().toLowerCase() === "active";
}
