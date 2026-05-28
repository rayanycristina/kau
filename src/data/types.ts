export type Seller = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  revenueToday: number;
  commissionToday: number;
  score: number;
  status: "calling" | "available" | "inactive";
  streak: number;
  xp: number;
};

export type LiveCall = {
  id: string;
  sellerId: string;
  sellerName: string;
  leadName: string;
  product: "AlphaSin";
  duration: string;
  heat: number;
  sentiment: "interesse alto" | "negociacao" | "objeção";
  spark: number[];
};

export type MoneyAlert = {
  id: string;
  title: string;
  amount: number;
  reason: string;
  severity: "critical" | "high" | "medium";
  age: string;
  action: "call" | "message" | "reschedule";
};

export type FollowUpTask = {
  id: string;
  title: string;
  context: string;
  value: number;
  state: "overdue" | "urgent" | "scheduled";
  delay: string;
};

export type PipelineStage = {
  label: string;
  count: number;
  value: number;
  heat: "cold" | "warm" | "hot" | "critical";
};
