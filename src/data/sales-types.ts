export type PaymentStatus = "paid" | "pending" | "cod";
export type DeliveryStatus = "pending" | "scheduled" | "delivered" | "risk" | "rescheduled";
export type OrderStatus = "active" | "cancelled" | "returned" | "lost" | "review";
export type OrderTag = "hot_customer" | "cold_customer" | "rescheduled" | "frustrated" | "fraud" | "defaulted" | "priority";
export type SalesPlatformId = "payt" | "coinzz" | "logzz";

export type SellerProfile = {
  id?: string;
  userId?: string | null;
  fullName?: string;
  displayName?: string | null;
  name: string;
  login: string;
  email?: string | null;
  phone?: string | null;
  commissionPercent: number;
  active?: boolean;
  isOwner?: boolean;
  salesCount?: number;
  salesTotal?: number;
};

export type SaleInput = {
  customerName: string;
  customerPhone?: string;
  city: string;
  state?: string;
  productName: string;
  saleDate?: string;
  saleTime?: string;
  receivedDate?: string;
  paymentDate?: string;
  quantity: number;
  kitQuantity?: number | null;
  bottleQuantity?: number | null;
  totalAmount: number;
  operationCommissionAmount?: number | null;
  operationCommissionPercent?: number | null;
  sellerName: string;
  sellerId?: string | null;
  salePlatform?: SalesPlatformId | string;
  commissionRate?: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  deliveryType: string;
  deliveryStatus: DeliveryStatus;
  orderStatus?: OrderStatus;
  orderTags?: OrderTag[];
  orderStatusNote?: string;
  expectedPaymentDate?: string;
  notes?: string;
};

export type SaleRecord = SaleInput & {
  id: string;
  commissionRate: number;
  commissionAmount: number;
  saleDate?: string;
  createdAt: string;
  updatedAt?: string;
};

export type SalesSummary = {
  configured: boolean;
  salesCount: number;
  dailyRevenue: number;
  totalCommission: number;
  averageTicket: number;
  sellerSummaries: Array<{
    sellerName: string;
    salesCount: number;
    revenue: number;
    commission: number;
    commissionRate: number;
  }>;
  gabrielCommission: number;
  elisangelaCommission: number;
  scheduledTodayCount?: number;
  scheduledTodayRevenue?: number;
  scheduledTodaySales?: SaleRecord[];
  lastSale?: SaleRecord;
};
