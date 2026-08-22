export type AdPlatform = "Meta Ads" | "Google Ads" | "TikTok Ads" | "Outros";
export type CampaignStatus = "active" | "paused" | "archived";

export type AdAccount = {
  id: string;
  name: string;
  platform: AdPlatform;
  externalAccountId?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type Campaign = {
  id: string;
  name: string;
  adAccountId?: string;
  adAccountName?: string;
  adPlatform: AdPlatform;
  productName?: string;
  status: CampaignStatus;
  externalCampaignId?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CampaignMetrics = {
  investment: number;
  sales: number;
  paidSales: number;
  pendingSales: number;
  deliveredSales: number;
  grossRevenue: number;
  operationRevenue: number;
  realizedGrossRevenue: number;
  realizedOperationRevenue: number;
  sellerCommission: number;
  cpa: number | null;
  paidCpa: number | null;
  grossRoas: number | null;
  operationRoas: number | null;
  resultAfterMedia: number;
  marginAfterMedia: number | null;
  averageTicket: number | null;
  averageOperationRevenue: number | null;
  paymentRate: number | null;
};

export type CampaignPerformanceRow = Campaign & CampaignMetrics;

export type CampaignBreakdownRow = {
  key: string;
  label: string;
  sales: number;
  grossRevenue: number;
  operationRevenue: number;
  sellerCommission?: number;
  averageTicket: number | null;
  sharePercent: number;
};

export type CampaignExpenseAttributionRow = {
  id: string;
  expenseDate: string;
  description: string;
  amount: number;
  category: string;
  source?: string;
  campaignId?: string;
  campaignName?: string;
};

export type CampaignAttributionSummary = {
  totalInvestment: number;
  attributedInvestment: number;
  unattributedInvestment: number;
  attributionPercent: number | null;
  unattributedCount: number;
  unattributedExpenses: CampaignExpenseAttributionRow[];
};

export type CampaignPerformanceResponse = {
  setupRequired?: boolean;
  summary: CampaignMetrics;
  attribution: CampaignAttributionSummary;
  campaigns: CampaignPerformanceRow[];
  byState: CampaignBreakdownRow[];
  byOrigin: CampaignBreakdownRow[];
  bySeller: CampaignBreakdownRow[];
  filters: {
    accounts: AdAccount[];
    campaigns: Campaign[];
    products: string[];
    origins: string[];
    sellers: string[];
    states: string[];
  };
};
