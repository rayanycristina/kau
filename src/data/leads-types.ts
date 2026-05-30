export type LeadTemperature = "hot" | "warm" | "cold";
export type LeadContactStatus = "new" | "answered" | "not_answered" | "called_no_answer" | "scheduled" | "call_soon" | "return_tomorrow" | "proposal_sent" | "sold" | "lost";
export type LeadPriority = "critical" | "high" | "normal" | "low";

export type LeadRecord = {
  id: string;
  customerName: string;
  customerPhone: string;
  city?: string;
  address?: string;
  neighborhood?: string;
  productName: string;
  temperature: LeadTemperature;
  contactStatus: LeadContactStatus;
  priority: LeadPriority;
  sellerName: string;
  nextAction?: string;
  nextActionAt?: string;
  lastContactAt?: string;
  estimatedValue: number;
  source?: string;
  notes?: string;
  objections?: string;
  followUpHistory?: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadInput = {
  customerName: string;
  customerPhone: string;
  city?: string;
  address?: string;
  neighborhood?: string;
  productName?: string;
  temperature?: LeadTemperature;
  contactStatus?: LeadContactStatus;
  priority?: LeadPriority;
  sellerName?: string;
  nextAction?: string;
  nextActionAt?: string;
  lastContactAt?: string;
  estimatedValue?: number;
  source?: string;
  notes?: string;
  objections?: string;
  followUpHistory?: string;
};

export type LeadsSummary = {
  configured: boolean;
  leadsCount: number;
  hotLeadsCount: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  leads: LeadRecord[];
  lastLead?: LeadRecord;
};
