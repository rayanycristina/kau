import { getSaleFinancialState, isPaymentConfirmed } from "@/data/sale-financial-state";

export type DatePeriod = {
  start: string;
  end: string;
};

export type RealNetMarginSale = {
  id: string;
  paymentStatus?: string | null;
  paymentDate?: string | null;
  operationCommissionAmount?: number | string | null;
  orderStatus?: string | null;
  deletedAt?: string | null;
};

export type RealNetMarginExpense = {
  id: string;
  description?: string | null;
  amount?: number | string | null;
  expenseDate?: string | null;
  taxItems?: Array<{ amount?: number | string | null }>;
};

export type RealNetMarginQuality = {
  paidWithoutPaymentDate: number;
  paidWithoutOperationAmount: number;
  expensesWithoutDate: number;
  expensesWithoutAmount: number;
  invalidTaxItems: number;
  potentialDuplicateExpenses: number;
  includedSoftDeletedPayments: number;
};

export type RealNetMarginPeriodResult = {
  period: DatePeriod;
  realizedRevenue: number;
  realExpenses: number;
  realizedNetProfit: number;
  marginPercent: number | null;
  paidSalesCount: number;
  expenseCount: number;
  quality: RealNetMarginQuality;
};

export type RealNetMarginResponse = {
  current: RealNetMarginPeriodResult;
  previous: RealNetMarginPeriodResult;
  comparison: {
    marginDeltaPoints: number | null;
  };
  methodology: {
    revenueBasis: "payment_date";
    revenueValue: "operation_commission_amount";
    expenseBasis: "expenses_plus_tax_items";
    legacyPaymentDateSourceTracked: false;
    withdrawalsDeducted: false;
    guaranteesAddedSeparately: false;
    campaignInvestmentAddedSeparately: false;
  };
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function dateKey(value: unknown) {
  const date = String(value ?? "").slice(0, 10);
  if (!datePattern.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    ? date
    : null;
}

function dayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function dateFromDayNumber(value: number) {
  return new Date(value * 86_400_000).toISOString().slice(0, 10);
}

function moneyToCents(value: unknown, allowZero = true) {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0)) return null;
  return Math.round(amount * 100);
}

function normalizedDescription(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

export function normalizePeriod(period: DatePeriod): DatePeriod | null {
  const start = dateKey(period.start);
  const end = dateKey(period.end);
  return start && end && start <= end ? { start, end } : null;
}

export function previousPeriodFor(period: DatePeriod): DatePeriod {
  const normalized = normalizePeriod(period);
  if (!normalized) throw new Error("Período inválido.");
  const duration = dayNumber(normalized.end) - dayNumber(normalized.start) + 1;
  const previousEnd = dayNumber(normalized.start) - 1;
  return {
    start: dateFromDayNumber(previousEnd - duration + 1),
    end: dateFromDayNumber(previousEnd)
  };
}

export function calculateRealNetMargin(
  sales: RealNetMarginSale[],
  expenses: RealNetMarginExpense[],
  period: DatePeriod
): RealNetMarginPeriodResult {
  const normalized = normalizePeriod(period);
  if (!normalized) throw new Error("Período inválido.");

  const quality: RealNetMarginQuality = {
    paidWithoutPaymentDate: 0,
    paidWithoutOperationAmount: 0,
    expensesWithoutDate: 0,
    expensesWithoutAmount: 0,
    invalidTaxItems: 0,
    potentialDuplicateExpenses: 0,
    includedSoftDeletedPayments: 0
  };

  let realizedRevenueCents = 0;
  let paidSalesCount = 0;

  for (const sale of sales) {
    if (!isPaymentConfirmed({ paymentStatus: sale.paymentStatus })) continue;
    const financialState = getSaleFinancialState({
      orderStatus: sale.orderStatus,
      paymentStatus: sale.paymentStatus
    });
    if (!financialState.countsCash) continue;

    const paymentDate = dateKey(sale.paymentDate);
    if (!paymentDate) {
      quality.paidWithoutPaymentDate += 1;
      continue;
    }
    if (paymentDate < normalized.start || paymentDate > normalized.end) continue;

    const operationAmount = moneyToCents(sale.operationCommissionAmount);
    if (operationAmount === null) {
      quality.paidWithoutOperationAmount += 1;
      continue;
    }

    realizedRevenueCents += operationAmount;
    paidSalesCount += 1;
    if (sale.deletedAt) quality.includedSoftDeletedPayments += 1;
  }

  let realExpensesCents = 0;
  let expenseCount = 0;
  const potentialDuplicates = new Map<string, number>();

  for (const expense of expenses) {
    const expenseDate = dateKey(expense.expenseDate);
    if (!expenseDate) {
      quality.expensesWithoutDate += 1;
      continue;
    }
    if (expenseDate < normalized.start || expenseDate > normalized.end) continue;

    const amount = moneyToCents(expense.amount, false);
    if (amount === null) {
      quality.expensesWithoutAmount += 1;
      continue;
    }

    const duplicateKey = `${expenseDate}|${normalizedDescription(expense.description)}|${amount}`;
    potentialDuplicates.set(duplicateKey, (potentialDuplicates.get(duplicateKey) ?? 0) + 1);

    let taxTotal = 0;
    for (const tax of expense.taxItems ?? []) {
      const taxAmount = moneyToCents(tax.amount);
      if (taxAmount === null) {
        quality.invalidTaxItems += 1;
        continue;
      }
      taxTotal += taxAmount;
    }

    realExpensesCents += amount + taxTotal;
    expenseCount += 1;
  }

  quality.potentialDuplicateExpenses = [...potentialDuplicates.values()]
    .reduce((total, count) => total + Math.max(0, count - 1), 0);

  const realizedNetProfitCents = realizedRevenueCents - realExpensesCents;
  return {
    period: normalized,
    realizedRevenue: realizedRevenueCents / 100,
    realExpenses: realExpensesCents / 100,
    realizedNetProfit: realizedNetProfitCents / 100,
    marginPercent: realizedRevenueCents > 0
      ? (realizedNetProfitCents / realizedRevenueCents) * 100
      : null,
    paidSalesCount,
    expenseCount,
    quality
  };
}

export function createRealNetMarginResponse(
  sales: RealNetMarginSale[],
  expenses: RealNetMarginExpense[],
  currentPeriod: DatePeriod
): RealNetMarginResponse {
  const current = calculateRealNetMargin(sales, expenses, currentPeriod);
  const previous = calculateRealNetMargin(sales, expenses, previousPeriodFor(currentPeriod));
  return {
    current,
    previous,
    comparison: {
      marginDeltaPoints: current.marginPercent !== null && previous.marginPercent !== null
        ? current.marginPercent - previous.marginPercent
        : null
    },
    methodology: {
      revenueBasis: "payment_date",
      revenueValue: "operation_commission_amount",
      expenseBasis: "expenses_plus_tax_items",
      legacyPaymentDateSourceTracked: false,
      withdrawalsDeducted: false,
      guaranteesAddedSeparately: false,
      campaignInvestmentAddedSeparately: false
    }
  };
}
