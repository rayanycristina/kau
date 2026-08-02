function normalizedMoneyText(value: string) {
  const compact = value.replace(/R\$/gi, "").replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  const negative = compact.startsWith("-");
  const unsigned = compact.replace(/-/g, "");
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? "." : ",";
    const normalized = unsigned.replaceAll(groupingSeparator, "").replace(decimalSeparator, ".");
    return `${negative ? "-" : ""}${normalized}`;
  }

  const separator = lastComma >= 0 ? "," : lastDot >= 0 ? "." : "";
  if (!separator) return `${negative ? "-" : ""}${unsigned}`;

  const parts = unsigned.split(separator);
  const fraction = parts.at(-1) || "";
  const isDecimal = parts.length === 2 && fraction.length > 0 && fraction.length <= 2;
  const normalized = isDecimal ? `${parts[0] || "0"}.${fraction}` : parts.join("");
  return `${negative ? "-" : ""}${normalized}`;
}

export function moneyToCents(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) : null;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(normalizedMoneyText(text));
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

export function moneyFromCents(cents: number | null | undefined) {
  return Math.round(Number(cents || 0)) / 100;
}

export function formatMoneyInput(cents: number | null | undefined) {
  return moneyFromCents(cents).toFixed(2).replace(".", ",");
}

export function roundMoney(value: unknown) {
  const cents = moneyToCents(value);
  return cents === null ? null : moneyFromCents(cents);
}
