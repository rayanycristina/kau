export type RealtimeEvent =
  | { type: "revenue.closed"; payload: { amount: number; sellerId: string } }
  | { type: "risk.escalated"; payload: { amount: number; reason: string } }
  | { type: "followup.overdue"; payload: { leadId: string; amount: number } }
  | { type: "seller.inactive"; payload: { sellerId: string; minutes: number } }
  | { type: "heartbeat" };
