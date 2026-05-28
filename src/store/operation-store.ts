import { create } from "zustand";
import { activeOpportunities, dailyRevenue, revenueAtRisk, teamConversion } from "@/data/alpha-sin-operation";
import type { SaleRecord, SalesSummary } from "@/data/sales-types";
import { getSaleFinancialState } from "@/data/sale-financial-state";

function isOwnerSeller(name?: string) {
  return String(name || "").toLowerCase().includes("rayany");
}

function ownerCommissionForSale(sale: SaleRecord) {
  const percent = isOwnerSeller(sale.sellerName) ? (sale.commissionRate || 15) : 10;
  return Math.round((sale.totalAmount || 0) * (percent / 100) * 100) / 100;
}

function subCommissionForSale(sale: SaleRecord) {
  return isOwnerSeller(sale.sellerName) ? 0 : sale.commissionAmount;
}

type OperationState = {
  dailyRevenue: number;
  revenueAtRisk: number;
  activeOpportunities: number;
  teamConversion: number;
  salesCount: number;
  totalCommission: number;
  gabrielCommission: number;
  elisangelaCommission: number;
  lastSale?: SaleRecord;
  supabaseConfigured: boolean;
  liveTick: number;
  registerRevenue: (amount: number) => void;
  registerSale: (sale: SaleRecord) => void;
  hydrateSalesSummary: (summary: SalesSummary) => void;
  escalateRisk: (amount: number) => void;
  heartbeat: () => void;
};

export const useOperationStore = create<OperationState>((set) => ({
  dailyRevenue,
  revenueAtRisk,
  activeOpportunities,
  teamConversion,
  salesCount: 0,
  totalCommission: 0,
  gabrielCommission: 0,
  elisangelaCommission: 0,
  lastSale: undefined,
  supabaseConfigured: false,
  liveTick: 0,
  registerRevenue: (amount) => set((s) => ({ dailyRevenue: s.dailyRevenue + amount, revenueAtRisk: Math.max(0, s.revenueAtRisk - amount * .24) })),
  registerSale: (sale) => set((s) => {
    const state = getSaleFinancialState(sale);
    const revenue = state.countsRevenue ? sale.totalAmount : 0;
    return {
      dailyRevenue: s.dailyRevenue + revenue,
      revenueAtRisk: Math.max(0, s.revenueAtRisk - revenue * .24),
      salesCount: s.salesCount + (state.isValidSale ? 1 : 0),
      totalCommission: s.totalCommission + (state.countsCommission ? ownerCommissionForSale(sale) : 0),
      gabrielCommission: s.gabrielCommission + (state.countsCommission && sale.sellerName === "Gabriel Moreira" ? subCommissionForSale(sale) : 0),
      elisangelaCommission: s.elisangelaCommission + (state.countsCommission && sale.sellerName === "Elisangela" ? subCommissionForSale(sale) : 0),
      lastSale: sale,
      supabaseConfigured: true
    };
  }),
  hydrateSalesSummary: (summary) => set((s) => {
    if (!summary.configured) return { supabaseConfigured: false };
    return {
      dailyRevenue: summary.dailyRevenue,
      salesCount: summary.salesCount,
      totalCommission: summary.totalCommission,
      gabrielCommission: summary.gabrielCommission,
      elisangelaCommission: summary.elisangelaCommission,
      lastSale: summary.lastSale,
      supabaseConfigured: true,
      revenueAtRisk: s.revenueAtRisk
    };
  }),
  escalateRisk: (amount) => set((s) => ({ revenueAtRisk: s.revenueAtRisk + amount })),
  heartbeat: () => set((s) => ({ liveTick: s.liveTick + 1 }))
}));
