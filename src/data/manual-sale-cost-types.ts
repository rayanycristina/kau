export type ManualSaleCostKind = "product" | "shipping";
export type ManualSaleCostStatus = "pending" | "paid" | "cancelled";

export type ManualSaleCostObligation = {
  id: string;
  saleId: string;
  costKind: ManualSaleCostKind;
  productId?: string;
  description: string;
  amount: number;
  status: ManualSaleCostStatus;
  expenseId?: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
  sale: {
    customerName: string;
    productName: string;
    saleDate: string;
    salePlatform?: string;
    deletedAt?: string;
  };
};
