import { BUDGET_CURRENCY, BUDGET_TIMEZONE } from "./constants";
import { resolveBudgetRiskLevel } from "./selectors";
import type {
  DailyBudgetRecalculateRequest,
  DailyBudgetSnapshot,
  VariableExpenseCategory,
  VariableExpenseCreateRequest,
  VariableExpenseDeleteRequest,
  VariableExpenseListRequest,
  VariableExpensePaymentMethod,
  VariableExpenseSource,
  VariableExpenseStatus,
  VariableExpenseUpdateRequest,
} from "./types";
import { calculateBudgetMetrics } from "./utils";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const RISK_LEVELS = new Set(["SAFE", "WATCH", "WARNING", "OVER"]);
const VARIABLE_EXPENSE_CATEGORIES = new Set<VariableExpenseCategory>([
  "MEAL",
  "TRANSPORT",
  "CAFE",
  "GROCERIES",
  "SHOPPING",
  "HEALTH",
  "CONTENT",
  "EDUCATION",
  "FAMILY",
  "GIFT",
  "TRAVEL",
  "ETC",
]);
const VARIABLE_EXPENSE_PAYMENT_METHODS = new Set<VariableExpensePaymentMethod>([
  "CASH",
  "CARD",
  "TRANSFER",
  "PAY",
  "ETC",
]);
const VARIABLE_EXPENSE_SOURCES = new Set<VariableExpenseSource>([
  "MANUAL",
  "RECEIPT",
  "IMPORT",
  "SYSTEM",
]);
const VARIABLE_EXPENSE_STATUSES = new Set<VariableExpenseStatus>([
  "POSTED",
  "REFUNDED",
  "VOIDED",
  "DELETED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeKrw(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

export function parseDailyBudgetSnapshot(value: unknown): DailyBudgetSnapshot {
  if (!isRecord(value)) {
    throw new TypeError("일일 예산 응답 형식이 올바르지 않습니다.");
  }

  const {
    date,
    timezone,
    currency,
    dailyLimit,
    spentToday,
    remainingToday,
    overspentAmount,
    usageRate,
    riskLevel,
    fixedExpenseReflected,
    savingsReflected,
    variableExpenseReflected,
    serverCalculatedAt,
    rawFinancialDataExposed,
    rawPersonalDataExposed,
    adsFinancialTargetingUsed,
  } = value;

  if (
    !isValidDate(date) ||
    timezone !== BUDGET_TIMEZONE ||
    currency !== BUDGET_CURRENCY ||
    !isNonNegativeKrw(dailyLimit) ||
    !isNonNegativeKrw(spentToday) ||
    !isNonNegativeKrw(remainingToday) ||
    !isNonNegativeKrw(overspentAmount) ||
    typeof usageRate !== "number" ||
    !Number.isFinite(usageRate) ||
    usageRate < 0 ||
    !RISK_LEVELS.has(String(riskLevel)) ||
    typeof fixedExpenseReflected !== "boolean" ||
    typeof savingsReflected !== "boolean" ||
    typeof variableExpenseReflected !== "boolean" ||
    !isIsoTimestamp(serverCalculatedAt) ||
    rawFinancialDataExposed !== false ||
    rawPersonalDataExposed !== false ||
    adsFinancialTargetingUsed !== false
  ) {
    throw new TypeError("안전하지 않거나 유효하지 않은 일일 예산 응답입니다.");
  }

  const calculated = calculateBudgetMetrics(dailyLimit, spentToday);
  if (
    remainingToday !== calculated.remainingToday ||
    overspentAmount !== calculated.overspentAmount ||
    Math.abs(usageRate - calculated.usageRate) > 0.01 ||
    riskLevel !== resolveBudgetRiskLevel(usageRate)
  ) {
    throw new TypeError("서버 일일 예산 계산 결과가 일관되지 않습니다.");
  }

  return {
    date,
    timezone,
    currency,
    dailyLimit,
    spentToday,
    remainingToday,
    overspentAmount,
    usageRate,
    riskLevel: riskLevel as DailyBudgetSnapshot["riskLevel"],
    fixedExpenseReflected,
    savingsReflected,
    variableExpenseReflected,
    serverCalculatedAt,
    rawFinancialDataExposed,
    rawPersonalDataExposed,
    adsFinancialTargetingUsed,
  };
}

export function validateRecalculateRequest(
  value: unknown,
): value is DailyBudgetRecalculateRequest {
  if (!isRecord(value)) return false;
  if (
    !isValidDate(value.periodStartDate) ||
    !isValidDate(value.periodEndDate) ||
    value.periodStartDate > value.periodEndDate ||
    !isNonNegativeKrw(value.availableAmountMinor) ||
    !isNonNegativeKrw(value.alreadySpentAmountMinor) ||
    !isNonNegativeKrw(value.carryOverAmountMinor) ||
    typeof value.overwriteExisting !== "boolean"
  ) {
    return false;
  }

  return (
    value.memo === null ||
    (typeof value.memo === "string" && value.memo.trim().length <= 500)
  );
}

export function validateVariableExpenseCreateRequest(
  value: unknown,
): value is VariableExpenseCreateRequest {
  if (!isRecord(value)) return false;
  if (
    !isNonNegativeKrw(value.amountMinor) ||
    value.amountMinor < 1 ||
    !VARIABLE_EXPENSE_CATEGORIES.has(
      String(value.category) as VariableExpenseCategory,
    ) ||
    typeof value.title !== "string" ||
    value.title.trim().length < 1 ||
    value.title.trim().length > 100 ||
    !isIsoTimestamp(value.spentAt) ||
    !VARIABLE_EXPENSE_PAYMENT_METHODS.has(
      String(value.paymentMethod) as VariableExpensePaymentMethod,
    ) ||
    !VARIABLE_EXPENSE_SOURCES.has(
      String(value.source) as VariableExpenseSource,
    ) ||
    !Array.isArray(value.tags) ||
    value.tags.some((tag) => typeof tag !== "string" || tag.length > 50)
  ) {
    return false;
  }

  return (
    nullableString(value.merchantName, 100) &&
    nullableString(value.memo, 500) &&
    nullableString(value.receiptAttachmentId, 160) &&
    nullableString(value.dailyBudgetId, 160) &&
    nullableString(value.idempotencyKey, 160)
  );
}

export function validateVariableExpenseListRequest(
  value: unknown,
): value is VariableExpenseListRequest {
  if (!isRecord(value)) return false;
  const { page, pageSize } = value;
  if (
    !isNonNegativeKrw(page) ||
    page < 1 ||
    !isNonNegativeKrw(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    return false;
  }
  if (value.startDate !== undefined && !isValidDate(value.startDate))
    return false;
  if (value.endDate !== undefined && !isValidDate(value.endDate)) return false;
  if (
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    value.startDate > value.endDate
  ) {
    return false;
  }
  if (
    value.category !== undefined &&
    !VARIABLE_EXPENSE_CATEGORIES.has(
      String(value.category) as VariableExpenseCategory,
    )
  ) {
    return false;
  }
  if (
    value.status !== undefined &&
    !VARIABLE_EXPENSE_STATUSES.has(
      String(value.status) as VariableExpenseStatus,
    )
  ) {
    return false;
  }
  return (
    value.q === undefined ||
    (typeof value.q === "string" && value.q.trim().length <= 100)
  );
}

export function validateVariableExpenseUpdateRequest(
  value: unknown,
): value is VariableExpenseUpdateRequest {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length < 1) return false;
  if (
    value.amountMinor !== undefined &&
    (!isNonNegativeKrw(value.amountMinor) || value.amountMinor < 1)
  ) {
    return false;
  }
  if (
    value.category !== undefined &&
    !VARIABLE_EXPENSE_CATEGORIES.has(
      String(value.category) as VariableExpenseCategory,
    )
  ) {
    return false;
  }
  if (
    value.title !== undefined &&
    (typeof value.title !== "string" ||
      value.title.trim().length < 1 ||
      value.title.trim().length > 100)
  ) {
    return false;
  }
  if (value.spentAt !== undefined && !isIsoTimestamp(value.spentAt))
    return false;
  if (
    value.paymentMethod !== undefined &&
    !VARIABLE_EXPENSE_PAYMENT_METHODS.has(
      String(value.paymentMethod) as VariableExpensePaymentMethod,
    )
  ) {
    return false;
  }
  if (
    value.tags !== undefined &&
    (!Array.isArray(value.tags) ||
      value.tags.some((tag) => typeof tag !== "string" || tag.length > 50))
  ) {
    return false;
  }
  return (
    optionalNullableString(value.merchantName, 100) &&
    optionalNullableString(value.memo, 500) &&
    optionalNullableString(value.receiptAttachmentId, 160) &&
    optionalNullableString(value.dailyBudgetId, 160)
  );
}

export function validateVariableExpenseDeleteRequest(
  value: unknown,
): value is VariableExpenseDeleteRequest {
  return (
    isRecord(value) &&
    typeof value.reason === "string" &&
    value.reason.trim().length >= 3 &&
    value.reason.trim().length <= 200
  );
}

function nullableString(value: unknown, maxLength: number): boolean {
  return (
    value === null ||
    (typeof value === "string" && value.trim().length <= maxLength)
  );
}

function optionalNullableString(value: unknown, maxLength: number): boolean {
  return value === undefined || nullableString(value, maxLength);
}
