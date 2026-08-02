export function normalizeCommissionPercent(value: unknown, fallback = 5) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.round(number * 100) / 100;
}

export function commissionPercentToRate(percent: number) {
  // KAU stores commission_rate as a visible percent in Supabase: 15 means 15%.
  // Older builds used decimal rates; APIs normalize both formats.
  return normalizeCommissionPercent(percent, 5);
}

export function commissionRateToPercent(rate: number) {
  const value = Number(rate || 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round((value <= 1 ? value * 100 : value) * 100) / 100;
}
