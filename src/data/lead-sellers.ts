export const leadSellerOptions = ["Gabriel Moreira", "Rayany Cristina", "Elisangela"] as const;

export type LeadSellerName = (typeof leadSellerOptions)[number];

export const defaultLeadSeller: LeadSellerName = "Rayany Cristina";

export function normalizeLeadSeller(value: unknown): LeadSellerName {
  return leadSellerOptions.includes(value as LeadSellerName) ? (value as LeadSellerName) : defaultLeadSeller;
}
