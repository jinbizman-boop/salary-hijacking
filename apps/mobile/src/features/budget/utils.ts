import { BUDGET_SAFE_ERROR_MESSAGE, MAX_BUDGET_USAGE_RATE } from "./constants";
import type { BudgetMetrics } from "./types";

const KRW_FORMATTER = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const SENSITIVE_ERROR_PATTERN =
  /\b(password|token|secret|authorization|cookie|email|phone|account|card|salary|payroll|income|expense|savings|amount|hijack|loan|debt|push|fcm)\b|비밀번호|토큰|이메일|전화|계좌|카드|급여|월급|지출|저축|금액|납치|대출|부채|푸시/iu;

type OfflineDailyBudgetPreviewInput = Readonly<{
  addedExpenseAmounts?: readonly unknown[];
  baseMonthHijack: unknown;
  baseMonthlyExpense: unknown;
  baseSpentToday: unknown;
  dailyLimit: unknown;
}>;

type OfflineDailyBudgetPreview = Readonly<{
  addedExpenseTotal: number;
  dailyLimit: number;
  monthHijack: number;
  monthlyExpense: number;
  overspentAmount: number;
  remainingToday: number;
  spentToday: number;
  usageRate: number;
}>;

export function normalizeKrwAmount(value: unknown): number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    Number.isFinite(value) &&
    value >= 0
    ? value
    : 0;
}

export function parseKrwInputAmount(value: string): number | null {
  const trimmed = value.trim();
  const validFormat = /^[0-9]+$/u.test(trimmed)
    ? true
    : /^[0-9]{1,3}(?:,[0-9]{3})+$/u.test(trimmed);
  if (!validFormat) return null;

  const normalized = trimmed.replace(/,/g, "");
  if (!/^[0-9]+$/u.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function sanitizeKrwIntegerInput(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  return /^[0-9]+$/u.test(trimmed) ? trimmed : null;
}

export function calculateBudgetMetrics(
  dailyLimitInput: unknown,
  spentTodayInput: unknown,
): BudgetMetrics {
  const dailyLimit = normalizeKrwAmount(dailyLimitInput);
  const spentToday = normalizeKrwAmount(spentTodayInput);
  const usageRate =
    dailyLimit > 0
      ? Math.min(
          MAX_BUDGET_USAGE_RATE,
          Math.round(((spentToday / dailyLimit) * 100 + Number.EPSILON) * 100) /
            100,
        )
      : 0;

  return {
    remainingToday: Math.max(0, dailyLimit - spentToday),
    overspentAmount: Math.max(0, spentToday - dailyLimit),
    usageRate,
  };
}

export function calculateOfflineDailyBudgetPreview(
  input: OfflineDailyBudgetPreviewInput,
): OfflineDailyBudgetPreview {
  const dailyLimit = normalizeKrwAmount(input.dailyLimit);
  const baseSpentToday = normalizeKrwAmount(input.baseSpentToday);
  const baseMonthlyExpense = normalizeKrwAmount(input.baseMonthlyExpense);
  const baseMonthHijack = normalizeKrwAmount(input.baseMonthHijack);
  const addedExpenseTotal = (input.addedExpenseAmounts ?? []).reduce<number>(
    (total, value) => total + normalizeKrwAmount(value),
    0,
  );
  const spentToday = baseSpentToday + addedExpenseTotal;
  const remainingToday = dailyLimit - spentToday;
  const usageRate =
    dailyLimit > 0
      ? Math.min(
          MAX_BUDGET_USAGE_RATE,
          Math.round(((spentToday / dailyLimit) * 100 + Number.EPSILON) * 100) /
            100,
        )
      : 0;

  return {
    addedExpenseTotal,
    dailyLimit,
    monthHijack: Math.max(0, baseMonthHijack - addedExpenseTotal),
    monthlyExpense: baseMonthlyExpense + addedExpenseTotal,
    overspentAmount: Math.max(0, spentToday - dailyLimit),
    remainingToday,
    spentToday,
    usageRate,
  };
}

export function formatKrw(value: unknown): string {
  return KRW_FORMATTER.format(normalizeKrwAmount(value));
}

export function formatBudgetSyncTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return "동기화 시간 확인 필요";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function redactBudgetError(error: unknown): string {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { readonly status?: unknown }).status)
      : 0;
  if (status === 401) return "로그인이 필요합니다.";
  if (status === 409) return "예산 상태가 변경되었습니다. 새로고침해 주세요.";

  const message = error instanceof Error ? error.message : String(error ?? "");
  if (
    !message ||
    SENSITIVE_ERROR_PATTERN.test(message) ||
    /\d{4,}/u.test(message)
  ) {
    return BUDGET_SAFE_ERROR_MESSAGE;
  }

  const safeMessages = new Set([
    "로그인이 필요합니다.",
    "예산 상태가 변경되었습니다. 새로고침해 주세요.",
    "예산 재계산 요청을 확인해 주세요.",
    BUDGET_SAFE_ERROR_MESSAGE,
  ]);
  return safeMessages.has(message) ? message : BUDGET_SAFE_ERROR_MESSAGE;
}
