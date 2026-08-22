import type { CampaignMetrics } from "@/data/campaign-types";
import { isSaleDelivered, isSalePaid } from "@/data/sale-financial-state";

export type CampaignMetricSale = {
  totalAmount: number;
  operationCommissionAmount?: number | null;
  operationCommissionPercent?: number | null;
  commissionAmount?: number | null;
  paymentStatus?: string | null;
  deliveryStatus?: string | null;
  receivedDate?: string | null;
};

export function operationRevenueForCampaignSale(sale: CampaignMetricSale) {
  if (sale.operationCommissionAmount != null && Number.isFinite(Number(sale.operationCommissionAmount))) return Number(sale.operationCommissionAmount);
  if (sale.operationCommissionPercent != null && Number.isFinite(Number(sale.operationCommissionPercent))) return Number(sale.totalAmount || 0) * (Number(sale.operationCommissionPercent) / 100);
  return 0;
}

export function calculateCampaignMetrics(investment: number, sales: CampaignMetricSale[]): CampaignMetrics {
  const validInvestment = Math.max(0, Number(investment || 0));
  const grossRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const operationRevenue = sales.reduce((sum, sale) => sum + operationRevenueForCampaignSale(sale), 0);
  const sellerCommission = sales.reduce((sum, sale) => sum + Number(sale.commissionAmount || 0), 0);
  const paidSales = sales.filter(isSalePaid).length;
  const paidRows = sales.filter(isSalePaid);
  const realizedGrossRevenue = paidRows.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const realizedOperationRevenue = paidRows.reduce((sum, sale) => sum + operationRevenueForCampaignSale(sale), 0);
  const deliveredSales = sales.filter(isSaleDelivered).length;
  const count = sales.length;
  const resultAfterMedia = operationRevenue - validInvestment;
  return {
    investment: validInvestment,
    sales: count,
    paidSales,
    pendingSales: count - paidSales,
    deliveredSales,
    grossRevenue,
    operationRevenue,
    realizedGrossRevenue,
    realizedOperationRevenue,
    sellerCommission,
    cpa: count > 0 ? validInvestment / count : null,
    paidCpa: paidSales > 0 ? validInvestment / paidSales : null,
    grossRoas: validInvestment > 0 ? grossRevenue / validInvestment : null,
    operationRoas: validInvestment > 0 ? operationRevenue / validInvestment : null,
    resultAfterMedia,
    marginAfterMedia: operationRevenue > 0 ? (resultAfterMedia / operationRevenue) * 100 : null,
    averageTicket: count > 0 ? grossRevenue / count : null,
    averageOperationRevenue: count > 0 ? operationRevenue / count : null,
    paymentRate: count > 0 ? (paidSales / count) * 100 : null
  };
}
