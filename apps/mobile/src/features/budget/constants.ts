import type { BudgetRiskLevel } from "./types";

export const BUDGET_API_PREFIX = "/api/v1/daily-budgets";
export const VARIABLE_EXPENSES_API_PREFIX = "/api/v1/variable-expenses";
export const BUDGET_TODAY_PATH = `${BUDGET_API_PREFIX}/today`;
export const BUDGET_RECALCULATE_PATH = `${BUDGET_API_PREFIX}/recalculate`;
export const BUDGET_CHECKED_EVENT_PATH = "/api/v1/growth/events";
export const VARIABLE_EXPENSE_CREATE_PATH = VARIABLE_EXPENSES_API_PREFIX;
export const VARIABLE_EXPENSE_LIST_PATH = VARIABLE_EXPENSES_API_PREFIX;

export const BUDGET_CURRENCY = "KRW" as const;
export const BUDGET_TIMEZONE = "Asia/Seoul" as const;
export const MAX_BUDGET_USAGE_RATE = 999;

export const BUDGET_RISK_THRESHOLDS = Object.freeze({
  watch: 65,
  warning: 85,
  over: 100,
});

export const BUDGET_RISK_LABELS: Readonly<Record<BudgetRiskLevel, string>> =
  Object.freeze({
    SAFE: "안전",
    WATCH: "관찰 필요",
    WARNING: "주의",
    OVER: "예산 초과",
  });

export const BUDGET_SAFE_ERROR_MESSAGE =
  "예산 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
