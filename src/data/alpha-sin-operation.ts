import type { FollowUpTask, LiveCall, MoneyAlert, PipelineStage, Seller } from "./types";

export const sellers: Seller[] = [
  { id: "gabriel", name: "Gabriel Moreira", role: "Gestor Comercial", avatar: "GM", revenueToday: 7420, commissionToday: 371, score: 9.2, status: "calling", streak: 7, xp: 24850 },
  { id: "elisangela", name: "Elisangela", role: "Vendedora AlphaSin", avatar: "EL", revenueToday: 5980, commissionToday: 299, score: 8.9, status: "available", streak: 5, xp: 21240 },
  { id: "amanda", name: "Amanda Souza", role: "Vendedora AlphaSin", avatar: "AS", revenueToday: 5140, commissionToday: 257, score: 8.7, status: "calling", streak: 4, xp: 18810 }
];

export const liveCalls: LiveCall[] = [
  { id: "c1", sellerId: "gabriel", sellerName: "Gabriel Moreira", leadName: "Mariana Silva", product: "AlphaSin", duration: "02:35", heat: 8.7, sentiment: "interesse alto", spark: [22,26,21,33,29,35,41,38,44,49,46,55,60,58,67] },
  { id: "c2", sellerId: "elisangela", sellerName: "Elisangela", leadName: "Bruno Ferreira", product: "AlphaSin", duration: "01:48", heat: 6.2, sentiment: "negociacao", spark: [18,19,21,20,24,22,25,29,27,31,30,32,35,34,36] },
  { id: "c3", sellerId: "amanda", sellerName: "Amanda Souza", leadName: "Carlos Eduardo", product: "AlphaSin", duration: "03:09", heat: 9.1, sentiment: "interesse alto", spark: [33,36,39,41,43,46,50,56,61,63,68,72,76,82,88] }
];

export const moneyAlerts: MoneyAlert[] = [
  { id: "m1", title: "Follow-up atrasado", amount: 4250, reason: "Lead quente sem resposta", severity: "critical", age: "23m", action: "call" },
  { id: "m2", title: "Pedido COD em risco", amount: 3980, reason: "Falta confirmação", severity: "high", age: "41m", action: "message" },
  { id: "m3", title: "Lead agendado sem contato", amount: 2850, reason: "Janela comercial esfriando", severity: "high", age: "1h 12m", action: "call" },
  { id: "m4", title: "Proposta parada", amount: 1370, reason: "Sem avanço", severity: "medium", age: "2h 03m", action: "reschedule" }
];

export const followUps: FollowUpTask[] = [
  { id: "f1", title: "Ligar para Maria Silva", context: "Lead quente - AlphaSin", value: 12500, state: "overdue", delay: "Atrasado 2h" },
  { id: "f2", title: "Retorno João Santos", context: "Proposta enviada", value: 1800, state: "overdue", delay: "Atrasado 1h" },
  { id: "f3", title: "Follow-up Pedro Costa", context: "Negociação", value: 3200, state: "scheduled", delay: "No horário" },
  { id: "f4", title: "Confirmar entrega Ana Paula", context: "Pedido COD", value: 748, state: "scheduled", delay: "No horário" }
];

export const pipeline: PipelineStage[] = [
  { label: "Novos Leads", count: 342, value: 342000, heat: "warm" },
  { label: "Qualificação", count: 128, value: 215000, heat: "hot" },
  { label: "Proposta", count: 67, value: 128000, heat: "hot" },
  { label: "Negociação", count: 31, value: 78000, heat: "critical" },
  { label: "Fechamento", count: 12, value: 45000, heat: "critical" }
];

export const dailyRevenue = 18540;
export const dailyTarget = 50000;
export const revenueAtRisk = 94280;
export const activeOpportunities = 128;
export const teamConversion = 31;
