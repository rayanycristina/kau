export type RealtimeEvent =
  | { type: "revenue.closed"; companyId: string; payload: { amount: number; sellerId: string } }
  | { type: "risk.escalated"; companyId: string; payload: { amount: number; reason: string } }
  | { type: "followup.overdue"; companyId: string; payload: { leadId: string; amount: number } }
  | { type: "seller.inactive"; companyId: string; payload: { sellerId: string; minutes: number } }
  | { type: "heartbeat"; companyId: string };
