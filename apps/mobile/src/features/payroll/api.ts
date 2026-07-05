import {
  PAYROLL_CURRENT_PATH,
  PAYROLL_PLAN_PATH,
  PAYROLL_RECALCULATE_PATH,
  PAYROLL_SAFE_ERROR_MESSAGE,
} from "./constants";
import type {
  PayrollApiClient,
  PayrollCalculation,
  PayrollCycle,
  PayrollIncomeType,
  PayrollPlanSnapshot,
  PayrollPlanSaveRequest,
  PayrollPlanStatus,
  PayrollRecalculateRequest,
  PayrollRecalculateResult,
  PayrollReservePolicy,
} from "./types";

export type PayrollApiOptions = Readonly<{
  baseUrl: string;
  platform: "ios" | "android" | "web";
  fetcher?: typeof fetch;
  createCorrelationId?: () => string;
}>;

export class PayrollApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "PayrollApiError";
    this.status = status;
    this.code = code;
  }
}

const PRIVACY_HEADERS = Object.freeze({
  "x-raw-financial-data-exposed": "false",
  "x-raw-personal-data-exposed": "false",
  "x-raw-push-token-exposed": "false",
  "x-ad-financial-targeting-used": "false",
});
const RAW_SENSITIVE_TEXT_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/u,
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/u,
  /(?:account|계좌)\s*(?:number|번호)?\s*[:：]?\s*\d{2,6}(?:[-\s]\d{2,6}){1,4}/iu,
  /\b(?:authorization|bearer|session|refresh|push|fcm|token)\b\s*[:=]?\s*[A-Z0-9._~+/=-]{8,}/iu,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u,
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function containsRawSensitiveText(value: string): boolean {
  return RAW_SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function isSafePlanId(value: string): boolean {
  return /^[A-Za-z0-9_-]{3,160}$/u.test(value.trim());
}

function invalidResponse(): never {
  throw new PayrollApiError(
    0,
    "PAYROLL_INVALID_RESPONSE",
    PAYROLL_SAFE_ERROR_MESSAGE,
  );
}

function normalizeResponseTitle(value: unknown): string {
  if (typeof value !== "string") return invalidResponse();
  const title = value.trim();
  if (
    title.length === 0 ||
    title.length > 100 ||
    containsRawSensitiveText(title)
  ) {
    return invalidResponse();
  }
  return title;
}

function normalizeNullableResponseText(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return invalidResponse();
  const text = value.trim();
  if (text.length > maxLength || containsRawSensitiveText(text)) {
    return invalidResponse();
  }
  return text;
}

function defaultCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `payroll-${Date.now().toString(36)}`
  );
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized) return "";

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new PayrollApiError(
      0,
      "PAYROLL_INVALID_BASE_URL",
      PAYROLL_SAFE_ERROR_MESSAGE,
    );
  }

  if (url.username || url.password) {
    throw new PayrollApiError(
      0,
      "PAYROLL_INVALID_BASE_URL",
      PAYROLL_SAFE_ERROR_MESSAGE,
    );
  }

  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "10.0.2.2";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new PayrollApiError(
      0,
      "PAYROLL_INSECURE_BASE_URL",
      PAYROLL_SAFE_ERROR_MESSAGE,
    );
  }
  return normalized;
}

function errorCode(value: unknown): string {
  if (
    !isRecord(value) ||
    !isRecord(value.error) ||
    typeof value.error.code !== "string"
  ) {
    return "PAYROLL_REQUEST_FAILED";
  }
  return value.error.code;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function normalizeCalculation(value: unknown): PayrollCalculation {
  if (!isRecord(value)) {
    throw new PayrollApiError(
      0,
      "PAYROLL_INVALID_RESPONSE",
      PAYROLL_SAFE_ERROR_MESSAGE,
    );
  }

  if (
    !isDateOnly(value.periodStartDate) ||
    !isDateOnly(value.periodEndDate) ||
    !isNonNegativeInteger(value.dayCount) ||
    !isPositiveInteger(value.payrollAmountMinor) ||
    !isNonNegativeInteger(value.fixedExpenseTotalMinor) ||
    !isNonNegativeInteger(value.fixedSavingsTotalMinor) ||
    !isNonNegativeInteger(value.variableExpenseReserveMinor) ||
    !isNonNegativeInteger(value.emergencyBufferMinor) ||
    !isNonNegativeInteger(value.carryOverAmountMinor) ||
    !isNonNegativeInteger(value.alreadySpentAmountMinor) ||
    !isNonNegativeInteger(value.totalDeductionsMinor) ||
    typeof value.availableBeforeSpentMinor !== "number" ||
    !Number.isSafeInteger(value.availableBeforeSpentMinor) ||
    !isNonNegativeInteger(value.availableForDailyBudgetMinor) ||
    !isNonNegativeInteger(value.recommendedDailyBudgetMinor) ||
    !isNonNegativeInteger(value.remainderMinor) ||
    typeof value.hijackRate !== "number" ||
    !Number.isFinite(value.hijackRate) ||
    value.hijackRate < 0 ||
    value.serverAuthority !== true ||
    value.financialRawDataExposed !== false
  ) {
    throw new PayrollApiError(
      0,
      "PAYROLL_INVALID_RESPONSE",
      PAYROLL_SAFE_ERROR_MESSAGE,
    );
  }

  return {
    periodStartDate: value.periodStartDate,
    periodEndDate: value.periodEndDate,
    dayCount: value.dayCount,
    payrollAmountMinor: value.payrollAmountMinor,
    fixedExpenseTotalMinor: value.fixedExpenseTotalMinor,
    fixedSavingsTotalMinor: value.fixedSavingsTotalMinor,
    variableExpenseReserveMinor: value.variableExpenseReserveMinor,
    emergencyBufferMinor: value.emergencyBufferMinor,
    carryOverAmountMinor: value.carryOverAmountMinor,
    alreadySpentAmountMinor: value.alreadySpentAmountMinor,
    totalDeductionsMinor: value.totalDeductionsMinor,
    availableBeforeSpentMinor: value.availableBeforeSpentMinor,
    availableForDailyBudgetMinor: value.availableForDailyBudgetMinor,
    recommendedDailyBudgetMinor: value.recommendedDailyBudgetMinor,
    remainderMinor: value.remainderMinor,
    hijackRate: value.hijackRate,
    serverAuthority: true,
    financialRawDataExposed: false,
  };
}

function normalizePlan(value: unknown): PayrollPlanSnapshot {
  if (!isRecord(value)) {
    throw new PayrollApiError(
      0,
      "PAYROLL_INVALID_RESPONSE",
      PAYROLL_SAFE_ERROR_MESSAGE,
    );
  }

  if (
    typeof value.planId !== "string" ||
    !isSafePlanId(value.planId) ||
    typeof value.incomeType !== "string" ||
    typeof value.payrollCycle !== "string" ||
    !isPositiveInteger(value.payrollAmountMinor) ||
    !(
      value.payday === null ||
      (isNonNegativeInteger(value.payday) &&
        value.payday >= 1 &&
        value.payday <= 31)
    ) ||
    !isDateOnly(value.firstPayrollDate) ||
    !isDateOnly(value.periodStartDate) ||
    !isDateOnly(value.periodEndDate) ||
    !isNonNegativeInteger(value.fixedExpenseTotalMinor) ||
    !isNonNegativeInteger(value.fixedSavingsTotalMinor) ||
    !isNonNegativeInteger(value.variableExpenseReserveMinor) ||
    !isNonNegativeInteger(value.emergencyBufferMinor) ||
    !isNonNegativeInteger(value.carryOverAmountMinor) ||
    typeof value.reservePolicy !== "string" ||
    typeof value.status !== "string" ||
    value.serverAuthority !== true ||
    value.financialRawDataExposed !== false ||
    value.adTargetingSeparated !== true
  ) {
    throw new PayrollApiError(
      0,
      "PAYROLL_INVALID_RESPONSE",
      PAYROLL_SAFE_ERROR_MESSAGE,
    );
  }

  return {
    planId: value.planId,
    title: normalizeResponseTitle(value.title),
    incomeType: value.incomeType as PayrollIncomeType,
    payrollCycle: value.payrollCycle as PayrollCycle,
    payrollAmountMinor: value.payrollAmountMinor,
    payday: value.payday,
    firstPayrollDate: value.firstPayrollDate,
    periodStartDate: value.periodStartDate,
    periodEndDate: value.periodEndDate,
    fixedExpenseTotalMinor: value.fixedExpenseTotalMinor,
    fixedSavingsTotalMinor: value.fixedSavingsTotalMinor,
    variableExpenseReserveMinor: value.variableExpenseReserveMinor,
    emergencyBufferMinor: value.emergencyBufferMinor,
    carryOverAmountMinor: value.carryOverAmountMinor,
    reservePolicy: value.reservePolicy as PayrollReservePolicy,
    memo: normalizeNullableResponseText(value.memo, 500),
    status: value.status as PayrollPlanStatus,
    calculation: normalizeCalculation(value.calculation),
    serverAuthority: true,
    financialRawDataExposed: false,
    adTargetingSeparated: true,
  };
}

function normalizeCurrentPlan(value: unknown): PayrollPlanSnapshot {
  if (!isRecord(value) || !("data" in value)) {
    throw new PayrollApiError(
      0,
      "PAYROLL_INVALID_RESPONSE",
      PAYROLL_SAFE_ERROR_MESSAGE,
    );
  }
  return normalizePlan(value.data);
}

function validRecalculateRequest(value: PayrollRecalculateRequest): boolean {
  const record = value as Record<string, unknown>;
  return (
    hasOnlyKeys(record, [
      "alreadySpentAmountMinor",
      "carryOverAmountMinor",
      "emergencyBufferMinor",
      "fixedExpenseTotalMinor",
      "fixedSavingsTotalMinor",
      "overwritePlan",
      "payrollAmountMinor",
      "periodEndDate",
      "periodStartDate",
      "planId",
      "reason",
      "variableExpenseReserveMinor",
    ]) &&
    (value.planId === null ||
      (typeof value.planId === "string" && isSafePlanId(value.planId))) &&
    isDateOnly(value.periodStartDate) &&
    isDateOnly(value.periodEndDate) &&
    isPositiveInteger(value.payrollAmountMinor) &&
    isNonNegativeInteger(value.fixedExpenseTotalMinor) &&
    isNonNegativeInteger(value.fixedSavingsTotalMinor) &&
    isNonNegativeInteger(value.variableExpenseReserveMinor) &&
    isNonNegativeInteger(value.emergencyBufferMinor) &&
    isNonNegativeInteger(value.carryOverAmountMinor) &&
    isNonNegativeInteger(value.alreadySpentAmountMinor) &&
    typeof value.overwritePlan === "boolean" &&
    (value.reason === null ||
      (typeof value.reason === "string" &&
        !containsRawSensitiveText(value.reason)))
  );
}

function validPayday(value: unknown): value is number | null {
  return (
    value === null || (isNonNegativeInteger(value) && value >= 1 && value <= 31)
  );
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function validSaveRequest(value: PayrollPlanSaveRequest): boolean {
  const record = value as Record<string, unknown>;
  return (
    hasOnlyKeys(record, [
      "carryOverAmountMinor",
      "emergencyBufferMinor",
      "firstPayrollDate",
      "fixedExpenseTotalMinor",
      "fixedSavingsTotalMinor",
      "incomeType",
      "memo",
      "payday",
      "payrollAmountMinor",
      "payrollCycle",
      "periodEndDate",
      "periodStartDate",
      "planId",
      "reservePolicy",
      "title",
      "variableExpenseReserveMinor",
    ]) &&
    (value.planId === null ||
      (typeof value.planId === "string" && isSafePlanId(value.planId))) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.length <= 100 &&
    (value.incomeType === "NET" || value.incomeType === "GROSS") &&
    ["MONTHLY", "BIWEEKLY", "WEEKLY", "CUSTOM"].includes(value.payrollCycle) &&
    isPositiveInteger(value.payrollAmountMinor) &&
    validPayday(value.payday) &&
    isDateOnly(value.firstPayrollDate) &&
    isDateOnly(value.periodStartDate) &&
    isDateOnly(value.periodEndDate) &&
    value.periodStartDate <= value.periodEndDate &&
    isNonNegativeInteger(value.fixedExpenseTotalMinor) &&
    isNonNegativeInteger(value.fixedSavingsTotalMinor) &&
    isNonNegativeInteger(value.variableExpenseReserveMinor) &&
    isNonNegativeInteger(value.emergencyBufferMinor) &&
    isNonNegativeInteger(value.carryOverAmountMinor) &&
    ["ZERO_BASE", "CARRY_OVER", "FIXED_BUFFER"].includes(value.reservePolicy) &&
    !containsRawSensitiveText(value.title) &&
    (value.memo === null ||
      (typeof value.memo === "string" &&
        value.memo.length <= 500 &&
        !containsRawSensitiveText(value.memo)))
  );
}

function normalizeRecalculateResult(value: unknown): PayrollRecalculateResult {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new PayrollApiError(
      0,
      "PAYROLL_INVALID_RESPONSE",
      PAYROLL_SAFE_ERROR_MESSAGE,
    );
  }
  const data = value.data;
  if (
    typeof data.overwritePlan !== "boolean" ||
    !(data.reason === null || typeof data.reason === "string") ||
    data.serverAuthority !== true
  ) {
    throw new PayrollApiError(
      0,
      "PAYROLL_INVALID_RESPONSE",
      PAYROLL_SAFE_ERROR_MESSAGE,
    );
  }
  return {
    calculation: normalizeCalculation(data.calculation),
    updatedPlan:
      data.updatedPlan === null ? null : normalizePlan(data.updatedPlan),
    overwritePlan: data.overwritePlan,
    reason: data.reason,
    serverAuthority: true,
  };
}

export function createPayrollApi(options: PayrollApiOptions): PayrollApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetcher = options.fetcher ?? fetch;
  const createCorrelationId =
    options.createCorrelationId ?? defaultCorrelationId;

  async function request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const headers = new Headers({
      accept: "application/json",
      "x-client-platform": options.platform,
      "x-correlation-id": createCorrelationId(),
      ...PRIVACY_HEADERS,
    });
    if (init.body !== undefined)
      headers.set("content-type", "application/json");

    let response: Response;
    try {
      response = await fetcher(
        new Request(`${baseUrl}${path}`, {
          ...init,
          headers,
          credentials: "include",
        }),
      );
    } catch {
      throw new PayrollApiError(
        0,
        "PAYROLL_NETWORK_ERROR",
        PAYROLL_SAFE_ERROR_MESSAGE,
      );
    }

    const parsed = await parseJson(response);
    if (!response.ok) {
      throw new PayrollApiError(
        response.status,
        errorCode(parsed),
        PAYROLL_SAFE_ERROR_MESSAGE,
      );
    }
    return parsed;
  }

  return {
    async getCurrent(): Promise<PayrollPlanSnapshot | null> {
      try {
        return normalizeCurrentPlan(await request(PAYROLL_CURRENT_PATH));
      } catch (error) {
        if (
          error instanceof PayrollApiError &&
          error.status === 404 &&
          error.code === "PAYROLL_CURRENT_PLAN_NOT_FOUND"
        ) {
          return null;
        }
        throw error;
      }
    },

    async savePlan(
      saveRequest: PayrollPlanSaveRequest,
    ): Promise<PayrollPlanSnapshot> {
      if (!validSaveRequest(saveRequest)) {
        throw new PayrollApiError(
          0,
          "PAYROLL_INVALID_SAVE_REQUEST",
          PAYROLL_SAFE_ERROR_MESSAGE,
        );
      }
      const { planId, ...body } = saveRequest;
      const path =
        planId === null
          ? PAYROLL_PLAN_PATH
          : `${PAYROLL_PLAN_PATH}/${encodeURIComponent(planId.trim())}`;
      const result = await request(path, {
        method: planId === null ? "POST" : "PATCH",
        body: JSON.stringify({ ...body, title: body.title.trim() }),
      });
      if (!isRecord(result) || !("data" in result)) {
        throw new PayrollApiError(
          0,
          "PAYROLL_INVALID_RESPONSE",
          PAYROLL_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizePlan(result.data);
    },

    async recalculate(
      recalculateRequest: PayrollRecalculateRequest,
    ): Promise<PayrollRecalculateResult> {
      if (!validRecalculateRequest(recalculateRequest)) {
        throw new PayrollApiError(
          0,
          "PAYROLL_INVALID_RECALCULATE_REQUEST",
          PAYROLL_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeRecalculateResult(
        await request(PAYROLL_RECALCULATE_PATH, {
          method: "POST",
          body: JSON.stringify(recalculateRequest),
        }),
      );
    },
  };
}
