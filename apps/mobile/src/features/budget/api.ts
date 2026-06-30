import {
  BUDGET_CHECKED_EVENT_PATH,
  BUDGET_RECALCULATE_PATH,
  BUDGET_SAFE_ERROR_MESSAGE,
  BUDGET_TODAY_PATH,
} from "./constants";
import {
  createBudgetActionHints,
  createBudgetCheckedEvent,
  resolveBudgetRiskLevel,
} from "./selectors";
import type {
  BudgetApiClient,
  BudgetApiResponse,
  BudgetRecalculateResult,
  DailyBudgetRecalculateRequest,
  DailyBudgetSnapshot,
} from "./types";
import { redactBudgetError } from "./utils";
import {
  parseDailyBudgetSnapshot,
  validateRecalculateRequest,
} from "./validation";

export type BudgetApiOptions = Readonly<{
  baseUrl: string;
  platform: "ios" | "android" | "web";
  fetcher?: typeof fetch;
  createCorrelationId?: () => string;
}>;

export class BudgetApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "BudgetApiError";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function defaultCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `budget-${Date.now().toString(36)}`
  );
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized) return "";

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_BASE_URL",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }

  const localHost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new BudgetApiError(
      0,
      "BUDGET_INSECURE_BASE_URL",
      BUDGET_SAFE_ERROR_MESSAGE,
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
    return "BUDGET_REQUEST_FAILED";
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

function normalizedServerSnapshot(value: unknown): DailyBudgetSnapshot {
  if (!isRecord(value) || value.serverAuthority !== true) {
    throw new BudgetApiError(
      0,
      "BUDGET_SERVER_AUTHORITY_REQUIRED",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }

  const available = value.availableAmountMinor;
  const spent = value.spentAmountMinor;
  const remaining = value.remainingAmountMinor;
  const ratio = value.usageRate;
  const date = value.budgetDate;
  const serverCalculatedAt = value.updatedAt ?? value.createdAt;
  if (
    typeof date !== "string" ||
    !isNonNegativeInteger(available) ||
    !isNonNegativeInteger(spent) ||
    !isInteger(remaining) ||
    typeof ratio !== "number" ||
    !Number.isFinite(ratio) ||
    ratio < 0 ||
    !isIsoTimestamp(serverCalculatedAt)
  ) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  if (remaining !== available - spent) {
    throw new BudgetApiError(
      0,
      "BUDGET_INCONSISTENT_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }

  const usageRate = Math.round(ratio * 10_000) / 100;
  const snapshot: DailyBudgetSnapshot = {
    date,
    timezone: "Asia/Seoul",
    currency: "KRW",
    dailyLimit: available,
    spentToday: spent,
    remainingToday: Math.max(0, remaining),
    overspentAmount: Math.max(0, -remaining),
    usageRate,
    riskLevel: resolveBudgetRiskLevel(usageRate),
    fixedExpenseReflected: false,
    savingsReflected: false,
    variableExpenseReflected: true,
    serverCalculatedAt,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
  return parseDailyBudgetSnapshot(snapshot);
}

function normalizeTodayResponse(value: unknown): BudgetApiResponse | null {
  if (!isRecord(value) || !("data" in value)) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  if (value.data === null) return null;

  const data = value.data;
  const snapshot =
    isRecord(data) && "snapshot" in data
      ? parseDailyBudgetSnapshot(data.snapshot)
      : normalizedServerSnapshot(data);
  return {
    data: {
      snapshot,
      hints: createBudgetActionHints(snapshot),
    },
  };
}

function normalizeRecalculateResult(value: unknown): BudgetRecalculateResult {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  const data = value.data;
  if (
    typeof data.periodStartDate !== "string" ||
    typeof data.periodEndDate !== "string" ||
    !isNonNegativeInteger(data.totalDays) ||
    !isNonNegativeInteger(data.createdOrUpdatedCount) ||
    !isNonNegativeInteger(data.skippedCount) ||
    data.serverAuthority !== true
  ) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  return {
    periodStartDate: data.periodStartDate,
    periodEndDate: data.periodEndDate,
    totalDays: data.totalDays,
    createdOrUpdatedCount: data.createdOrUpdatedCount,
    skippedCount: data.skippedCount,
    serverAuthority: true,
  };
}

export function createBudgetApi(options: BudgetApiOptions): BudgetApiClient {
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
      response = await fetcher(`${baseUrl}${path}`, {
        ...init,
        headers,
        credentials: "include",
      });
    } catch (error) {
      throw new BudgetApiError(
        0,
        "BUDGET_NETWORK_ERROR",
        redactBudgetError(error),
      );
    }
    const parsed = await parseJson(response);
    if (!response.ok) {
      throw new BudgetApiError(
        response.status,
        errorCode(parsed),
        redactBudgetError({ status: response.status }),
      );
    }
    return parsed;
  }

  return {
    async getToday(): Promise<BudgetApiResponse | null> {
      return normalizeTodayResponse(await request(BUDGET_TODAY_PATH));
    },

    async recalculate(
      recalculateRequest: DailyBudgetRecalculateRequest,
    ): Promise<BudgetRecalculateResult> {
      if (!validateRecalculateRequest(recalculateRequest)) {
        throw new BudgetApiError(
          0,
          "BUDGET_INVALID_RECALCULATE_REQUEST",
          "예산 재계산 요청을 확인해 주세요.",
        );
      }
      const result = await request(BUDGET_RECALCULATE_PATH, {
        method: "POST",
        body: JSON.stringify(recalculateRequest),
      });
      return normalizeRecalculateResult(result);
    },

    async recordChecked(): Promise<void> {
      await request(BUDGET_CHECKED_EVENT_PATH, {
        method: "POST",
        body: JSON.stringify(createBudgetCheckedEvent()),
      });
    },
  };
}
