export type PaymentStatus = "paid" | "pending" | "cod";
export type DeliveryStatus = "pending" | "scheduled" | "delivered" | "risk" | "rescheduled";
export type OrderStatus = "active" | "cancelled" | "returned" | "lost" | "review";
export type OrderTag = "hot_customer" | "cold_customer" | "rescheduled" | "frustrated" | "fraud" | "defaulted" | "priority";
export type SalesPlatformId = "payt" | "coinzz" | "logzz";

export type SellerProfile = {
  name: string;
  login: string;
  password?: string;
  commissionPercent: number;
  active?: boolean;
};

export type SaleInput = {
  customerName: string;
  customerPhone?: string;
  city: string;
  productName: string;
  saleDate?: string;
  saleTime?: string;
  receivedDate?: string;
  paymentDate?: string;
  quantity: number;
  totalAmount: number;
  sellerName: string;
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
