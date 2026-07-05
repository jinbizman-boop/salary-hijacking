import {
  BUDGET_CHECKED_EVENT_PATH,
  BUDGET_DAILY_BUDGET_PATH,
  BUDGET_RECALCULATE_PATH,
  BUDGET_SAFE_ERROR_MESSAGE,
  BUDGET_TODAY_PATH,
  VARIABLE_EXPENSE_CREATE_PATH,
  VARIABLE_EXPENSE_LIST_PATH,
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
  DailyBudgetSaveRequest,
  DailyBudgetSnapshot,
  VariableExpenseCategory,
  VariableExpenseCreateRequest,
  VariableExpenseCreateResult,
  VariableExpenseDeleteRequest,
  VariableExpenseDeleteResult,
  VariableExpenseListRequest,
  VariableExpenseListResult,
  VariableExpensePaymentMethod,
  VariableExpenseRecord,
  VariableExpenseSource,
  VariableExpenseStatus,
  VariableExpenseUpdateRequest,
} from "./types";
import { redactBudgetError } from "./utils";
import {
  containsRawSensitiveText,
  parseDailyBudgetSnapshot,
  validateRecalculateRequest,
  validateVariableExpenseCreateRequest,
  validateVariableExpenseDeleteRequest,
  validateVariableExpenseListRequest,
  validateVariableExpenseUpdateRequest,
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

function isSafeEntityId(value: string): boolean {
  return /^[A-Za-z0-9_-]{3,160}$/u.test(value.trim());
}

const SERVER_VARIABLE_EXPENSE_CATEGORIES = [
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
] as const;
const SERVER_VARIABLE_EXPENSE_PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "TRANSFER",
  "PAY",
  "ETC",
] as const;
const SERVER_VARIABLE_EXPENSE_SOURCES = [
  "MANUAL",
  "RECEIPT",
  "IMPORT",
  "SYSTEM",
] as const;

function normalizeServerEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return allowed.includes(normalized as T) ? (normalized as T) : null;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function normalizeVariableExpenseCreateRequest(
  request: VariableExpenseCreateRequest,
): VariableExpenseCreateRequest | null {
  if (
    !hasOnlyKeys(request as Record<string, unknown>, [
      "amountMinor",
      "category",
      "dailyBudgetId",
      "idempotencyKey",
      "memo",
      "merchantName",
      "paymentMethod",
      "receiptAttachmentId",
      "source",
      "spentAt",
      "tags",
      "title",
    ])
  ) {
    return null;
  }
  const category = normalizeServerEnum(
    request.category,
    SERVER_VARIABLE_EXPENSE_CATEGORIES,
  );
  const paymentMethod = normalizeServerEnum(
    request.paymentMethod,
    SERVER_VARIABLE_EXPENSE_PAYMENT_METHODS,
  );
  const source = normalizeServerEnum(
    request.source,
    SERVER_VARIABLE_EXPENSE_SOURCES,
  );
  if (!category || !paymentMethod || !source) return null;
  return {
    amountMinor: request.amountMinor,
    category,
    dailyBudgetId: request.dailyBudgetId,
    idempotencyKey: request.idempotencyKey,
    memo: request.memo,
    merchantName: request.merchantName,
    paymentMethod,
    receiptAttachmentId: request.receiptAttachmentId,
    source,
    spentAt: request.spentAt,
    tags: request.tags,
    title: request.title,
  };
}

function normalizeVariableExpenseUpdateRequest(
  request: VariableExpenseUpdateRequest,
): VariableExpenseUpdateRequest | null {
  if (
    !hasOnlyKeys(request as Record<string, unknown>, [
      "amountMinor",
      "category",
      "dailyBudgetId",
      "memo",
      "merchantName",
      "paymentMethod",
      "receiptAttachmentId",
      "spentAt",
      "tags",
      "title",
    ])
  ) {
    return null;
  }
  const category =
    request.category === undefined
      ? undefined
      : normalizeServerEnum(
          request.category,
          SERVER_VARIABLE_EXPENSE_CATEGORIES,
        );
  const paymentMethod =
    request.paymentMethod === undefined
      ? undefined
      : normalizeServerEnum(
          request.paymentMethod,
          SERVER_VARIABLE_EXPENSE_PAYMENT_METHODS,
        );
  if (category === null || paymentMethod === null) return null;
  return {
    ...(request.amountMinor !== undefined
      ? { amountMinor: request.amountMinor }
      : {}),
    ...(category !== undefined ? { category } : {}),
    ...(request.dailyBudgetId !== undefined
      ? { dailyBudgetId: request.dailyBudgetId }
      : {}),
    ...(request.memo !== undefined ? { memo: request.memo } : {}),
    ...(request.merchantName !== undefined
      ? { merchantName: request.merchantName }
      : {}),
    ...(paymentMethod !== undefined ? { paymentMethod } : {}),
    ...(request.receiptAttachmentId !== undefined
      ? { receiptAttachmentId: request.receiptAttachmentId }
      : {}),
    ...(request.spentAt !== undefined ? { spentAt: request.spentAt } : {}),
    ...(request.tags !== undefined ? { tags: request.tags } : {}),
    ...(request.title !== undefined ? { title: request.title } : {}),
  };
}

function normalizeResponseEntityId(value: unknown): string {
  if (typeof value !== "string" || !isSafeEntityId(value)) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  return value.trim();
}

function normalizeResponseTitle(value: unknown): string {
  if (typeof value !== "string") {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  const title = value.trim();
  if (
    title.length === 0 ||
    title.length > 100 ||
    containsRawSensitiveText(title)
  ) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  return title;
}

function normalizeNullableResponseText(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  const text = value.trim();
  if (text.length > maxLength || containsRawSensitiveText(text)) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  return text;
}

function defaultCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `budget-${Date.now().toString(36)}`
  );
}

function safeIdempotencyPart(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^A-Za-z0-9_-]/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 80);
  return normalized || "request";
}

function budgetIdempotencyKey(correlationId: string, method: string): string {
  const entropy =
    globalThis.crypto?.randomUUID?.().replace(/-/gu, "") ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return [
    "mobile-budget",
    safeIdempotencyPart(correlationId),
    safeIdempotencyPart(method.toLowerCase()),
    entropy,
  ].join("-");
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

  if (url.username || url.password) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_BASE_URL",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }

  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "10.0.2.2";
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
  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new BudgetApiError(
      response.status,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
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
    budgetId:
      typeof value.budgetId === "string" && value.budgetId.length > 0
        ? value.budgetId
        : null,
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

function normalizeVariableExpenseCreateResult(
  value: unknown,
): VariableExpenseCreateResult {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  const data = value.data;
  if (
    !isNonNegativeInteger(data.amountMinor) ||
    data.amountMinor < 1 ||
    typeof data.category !== "string" ||
    !isIsoTimestamp(data.spentAt) ||
    typeof data.paymentMethod !== "string" ||
    typeof data.source !== "string" ||
    typeof data.status !== "string" ||
    !isNonNegativeInteger(data.netAmountMinor) ||
    data.serverAuthority !== true ||
    data.financialRawDataExposed !== false ||
    data.adTargetingSeparated !== true
  ) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  const expenseId = normalizeResponseEntityId(data.expenseId);
  return {
    expenseId,
    amountMinor: data.amountMinor,
    category: data.category as VariableExpenseCategory,
    title: normalizeResponseTitle(data.title),
    spentAt: data.spentAt,
    paymentMethod: data.paymentMethod as VariableExpensePaymentMethod,
    merchantName: normalizeNullableResponseText(data.merchantName, 100),
    memo: normalizeNullableResponseText(data.memo, 500),
    dailyBudgetId:
      typeof data.dailyBudgetId === "string" ? data.dailyBudgetId : null,
    source: data.source as VariableExpenseSource,
    status: data.status as VariableExpenseStatus,
    netAmountMinor: data.netAmountMinor,
    serverAuthority: true,
    financialRawDataExposed: false,
    adTargetingSeparated: true,
  };
}

function normalizeVariableExpenseRecord(value: unknown): VariableExpenseRecord {
  return normalizeVariableExpenseCreateResult({ data: value });
}

function normalizeVariableExpenseListResult(
  value: unknown,
): VariableExpenseListResult {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  const data = value.data;
  if (
    !Array.isArray(data.items) ||
    !isNonNegativeInteger(data.page) ||
    data.page < 1 ||
    !isNonNegativeInteger(data.pageSize) ||
    data.pageSize < 1 ||
    !isNonNegativeInteger(data.total)
  ) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  return {
    items: data.items.map(normalizeVariableExpenseRecord),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
  };
}

function normalizeVariableExpenseDeleteResult(
  value: unknown,
): VariableExpenseDeleteResult {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  const data = value.data;
  if (
    data.status !== "DELETED" ||
    data.serverAuthority !== true ||
    data.financialRawDataExposed !== false ||
    data.adTargetingSeparated !== true
  ) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_RESPONSE",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  return {
    expenseId: normalizeResponseEntityId(data.expenseId),
    status: "DELETED",
    serverAuthority: true,
    financialRawDataExposed: false,
    adTargetingSeparated: true,
  };
}

function variableExpensePath(expenseId: string): string {
  const id = expenseId.trim();
  if (!isSafeEntityId(id)) {
    throw new BudgetApiError(
      0,
      "BUDGET_INVALID_VARIABLE_EXPENSE_ID",
      BUDGET_SAFE_ERROR_MESSAGE,
    );
  }
  return `${VARIABLE_EXPENSE_LIST_PATH}/${encodeURIComponent(id)}`;
}

function listVariableExpensePath(request: VariableExpenseListRequest): string {
  const params = new URLSearchParams({
    page: String(request.page),
    pageSize: String(request.pageSize),
  });
  if (request.startDate) params.set("startDate", request.startDate);
  if (request.endDate) params.set("endDate", request.endDate);
  if (request.category) params.set("category", request.category);
  if (request.status) params.set("status", request.status);
  if (request.q?.trim()) params.set("q", request.q.trim());
  return `${VARIABLE_EXPENSE_LIST_PATH}?${params.toString()}`;
}

function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function validDailyBudgetSaveRequest(value: DailyBudgetSaveRequest): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === 4 &&
    keys.every((key) =>
      ["budgetDate", "budgetId", "memo", "plannedAmountMinor"].includes(key),
    ) &&
    isDateOnly(value.budgetDate) &&
    (value.budgetId === null ||
      (typeof value.budgetId === "string" &&
        value.budgetId.trim().length > 0)) &&
    isNonNegativeInteger(value.plannedAmountMinor) &&
    (value.memo === null ||
      (typeof value.memo === "string" &&
        value.memo.trim().length <= 500 &&
        !containsRawSensitiveText(value.memo)))
  );
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
    const method = init.method ?? "GET";
    const correlationId = createCorrelationId();
    const headers = new Headers({
      accept: "application/json",
      "x-client-platform": options.platform,
      "x-correlation-id": correlationId,
      ...PRIVACY_HEADERS,
    });
    if (method.toUpperCase() !== "GET") {
      headers.set(
        "x-idempotency-key",
        budgetIdempotencyKey(correlationId, method),
      );
    }
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

    async saveDailyBudget(
      saveRequest: DailyBudgetSaveRequest,
    ): Promise<BudgetApiResponse> {
      if (!validDailyBudgetSaveRequest(saveRequest)) {
        throw new BudgetApiError(
          0,
          "BUDGET_INVALID_DAILY_BUDGET_SAVE",
          BUDGET_SAFE_ERROR_MESSAGE,
        );
      }
      const budgetId = saveRequest.budgetId?.trim() ?? null;
      const result = await request(
        budgetId === null
          ? BUDGET_DAILY_BUDGET_PATH
          : `${BUDGET_DAILY_BUDGET_PATH}/${encodeURIComponent(budgetId)}`,
        {
          method: budgetId === null ? "POST" : "PATCH",
          body: JSON.stringify(
            budgetId === null
              ? {
                  budgetDate: saveRequest.budgetDate,
                  memo: saveRequest.memo,
                  plannedAmountMinor: saveRequest.plannedAmountMinor,
                  source: "MANUAL",
                }
              : {
                  memo: saveRequest.memo,
                  plannedAmountMinor: saveRequest.plannedAmountMinor,
                },
          ),
        },
      );
      const normalized = normalizeTodayResponse(result);
      if (normalized === null) {
        throw new BudgetApiError(
          0,
          "BUDGET_INVALID_RESPONSE",
          BUDGET_SAFE_ERROR_MESSAGE,
        );
      }
      return normalized;
    },

    async listVariableExpenses(
      listRequest: VariableExpenseListRequest,
    ): Promise<VariableExpenseListResult> {
      if (!validateVariableExpenseListRequest(listRequest)) {
        throw new BudgetApiError(
          0,
          "BUDGET_INVALID_VARIABLE_EXPENSE_LIST",
          BUDGET_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeVariableExpenseListResult(
        await request(listVariableExpensePath(listRequest)),
      );
    },

    async createVariableExpense(
      variableExpenseRequest: VariableExpenseCreateRequest,
    ): Promise<VariableExpenseCreateResult> {
      const normalizedRequest = normalizeVariableExpenseCreateRequest(
        variableExpenseRequest,
      );
      if (
        normalizedRequest === null ||
        !validateVariableExpenseCreateRequest(normalizedRequest)
      ) {
        throw new BudgetApiError(
          0,
          "BUDGET_INVALID_VARIABLE_EXPENSE",
          "지출 추가 요청을 확인해 주세요.",
        );
      }
      const result = await request(VARIABLE_EXPENSE_CREATE_PATH, {
        method: "POST",
        body: JSON.stringify(normalizedRequest),
      });
      return normalizeVariableExpenseCreateResult(result);
    },

    async updateVariableExpense(
      expenseId: string,
      updateRequest: VariableExpenseUpdateRequest,
    ): Promise<VariableExpenseRecord> {
      const normalizedRequest =
        normalizeVariableExpenseUpdateRequest(updateRequest);
      if (
        normalizedRequest === null ||
        !validateVariableExpenseUpdateRequest(normalizedRequest)
      ) {
        throw new BudgetApiError(
          0,
          "BUDGET_INVALID_VARIABLE_EXPENSE_UPDATE",
          BUDGET_SAFE_ERROR_MESSAGE,
        );
      }
      const result = await request(variableExpensePath(expenseId), {
        method: "PATCH",
        body: JSON.stringify(normalizedRequest),
      });
      return normalizeVariableExpenseCreateResult(result);
    },

    async deleteVariableExpense(
      expenseId: string,
      deleteRequest: VariableExpenseDeleteRequest,
    ): Promise<VariableExpenseDeleteResult> {
      if (!validateVariableExpenseDeleteRequest(deleteRequest)) {
        throw new BudgetApiError(
          0,
          "BUDGET_INVALID_VARIABLE_EXPENSE_DELETE",
          BUDGET_SAFE_ERROR_MESSAGE,
        );
      }
      const result = await request(variableExpensePath(expenseId), {
        method: "DELETE",
        body: JSON.stringify({ reason: deleteRequest.reason.trim() }),
      });
      return normalizeVariableExpenseDeleteResult(result);
    },

    async recordChecked(): Promise<void> {
      await request(BUDGET_CHECKED_EVENT_PATH, {
        method: "POST",
        body: JSON.stringify(createBudgetCheckedEvent()),
      });
    },
  };
}
