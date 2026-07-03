import {
  PLAN_FIXED_EXPENSES_PATH,
  PLAN_SAFE_ERROR_MESSAGE,
  PLAN_SAVINGS_PATH,
} from "./constants";
import type {
  PlanCommitmentsApiClient,
  PlanCommitmentsSnapshot,
  PlanDeleteResult,
  PlanFixedExpenseCreateRequest,
  PlanFixedExpenseCommitment,
  PlanFixedExpensePaymentRequest,
  PlanSavingsGoalCreateRequest,
  PlanSavingsGoalCommitment,
} from "./types";

export type PlanCommitmentsApiOptions = Readonly<{
  baseUrl: string;
  platform: "ios" | "android" | "web";
  fetcher?: typeof fetch;
  createCorrelationId?: () => string;
}>;

export class PlanCommitmentsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "PlanCommitmentsApiError";
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

function isPositiveDay(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 31
  );
}

function isPositiveMoney(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function defaultCorrelationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `plan-${Date.now().toString(36)}`;
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized) return "";

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_INVALID_BASE_URL",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }

  const localHost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_INSECURE_BASE_URL",
      PLAN_SAFE_ERROR_MESSAGE,
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
    return "PLAN_REQUEST_FAILED";
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

function dataItems(value: unknown): readonly unknown[] {
  if (
    !isRecord(value) ||
    !isRecord(value.data) ||
    !Array.isArray(value.data.items)
  ) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_INVALID_RESPONSE",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }
  return value.data.items;
}

function requireSafeMoney(
  value: unknown,
  code = "PLAN_INVALID_RESPONSE",
): number {
  if (!isNonNegativeInteger(value)) {
    throw new PlanCommitmentsApiError(0, code, PLAN_SAFE_ERROR_MESSAGE);
  }
  return value;
}

function normalizeFixedExpense(value: unknown): PlanFixedExpenseCommitment {
  if (
    !isRecord(value) ||
    typeof value.expenseId !== "string" ||
    !value.expenseId ||
    typeof value.title !== "string" ||
    !value.title ||
    typeof value.status !== "string" ||
    value.serverAuthority !== true
  ) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_INVALID_RESPONSE",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }
  if (value.financialRawDataExposed !== false) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_UNSAFE_FINANCIAL_EXPOSURE",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }

  const dueDay = isPositiveDay(value.paymentDay) ? value.paymentDay : null;
  return {
    amountMinor: requireSafeMoney(value.amountMinor),
    category: typeof value.category === "string" ? value.category : null,
    dueDay,
    dueLabel: dueDay === null ? "매월 자동 납부" : `매월 ${dueDay}일`,
    financialRawDataExposed: false,
    id: value.expenseId,
    lastPaidAt: typeof value.lastPaidAt === "string" ? value.lastPaidAt : null,
    paidTotalMinor: isNonNegativeInteger(value.paidTotalMinor)
      ? value.paidTotalMinor
      : 0,
    serverAuthority: true,
    status: value.status,
    title: value.title,
  };
}

function normalizeSavingsGoal(value: unknown): PlanSavingsGoalCommitment {
  if (
    !isRecord(value) ||
    typeof value.goalId !== "string" ||
    !value.goalId ||
    typeof value.title !== "string" ||
    !value.title ||
    typeof value.status !== "string" ||
    value.serverAuthority !== true
  ) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_INVALID_RESPONSE",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }
  if (value.financialRawAccountDataExposed !== false) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_UNSAFE_FINANCIAL_EXPOSURE",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }

  return {
    currentAmountMinor: requireSafeMoney(value.currentAmountMinor),
    financialRawAccountDataExposed: false,
    fixedSaveAmountMinor: requireSafeMoney(value.fixedSaveAmountMinor),
    goalType: typeof value.goalType === "string" ? value.goalType : null,
    id: value.goalId,
    serverAuthority: true,
    status: value.status,
    targetAmountMinor: requireSafeMoney(value.targetAmountMinor),
    title: value.title,
  };
}

function sumSafe(values: readonly number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_INVALID_TOTAL",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }
  return total;
}

function validFixedExpenseCreate(
  value: PlanFixedExpenseCreateRequest,
): boolean {
  return (
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.length <= 100 &&
    typeof value.category === "string" &&
    value.category.trim().length > 0 &&
    isPositiveMoney(value.amountMinor) &&
    isPositiveDay(value.paymentDay)
  );
}

function validSavingsGoalCreate(value: PlanSavingsGoalCreateRequest): boolean {
  return (
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.length <= 100 &&
    typeof value.goalType === "string" &&
    value.goalType.trim().length > 0 &&
    isPositiveMoney(value.targetAmountMinor) &&
    isNonNegativeInteger(value.fixedSaveAmountMinor) &&
    value.fixedSaveAmountMinor <= value.targetAmountMinor
  );
}

function validFixedExpensePayment(
  expenseId: string,
  value: PlanFixedExpensePaymentRequest,
): boolean {
  return (
    typeof expenseId === "string" &&
    expenseId.trim().length > 0 &&
    isPositiveMoney(value.amountMinor) &&
    typeof value.idempotencyKey === "string" &&
    value.idempotencyKey.trim().length > 0 &&
    value.idempotencyKey.length <= 160 &&
    (value.memo === undefined ||
      value.memo === null ||
      (typeof value.memo === "string" && value.memo.length <= 500)) &&
    (value.paidAt === undefined ||
      (typeof value.paidAt === "string" &&
        !Number.isNaN(new Date(value.paidAt).getTime())))
  );
}

function validDeleteId(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeDeleteResult(
  value: unknown,
  idKey: "expenseId" | "goalId",
): PlanDeleteResult {
  if (
    !isRecord(value) ||
    !isRecord(value.data) ||
    typeof value.data[idKey] !== "string" ||
    !value.data[idKey] ||
    value.data.status !== "DELETED"
  ) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_INVALID_RESPONSE",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }
  return {
    id: value.data[idKey],
    rawFinancialDataExposed: false,
    serverAuthority: true,
    status: "DELETED",
  };
}

export function createPlanCommitmentsApi(
  options: PlanCommitmentsApiOptions,
): PlanCommitmentsApiClient {
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
          credentials: "include",
          headers,
          method: init.method ?? "GET",
        }),
      );
    } catch {
      throw new PlanCommitmentsApiError(
        0,
        "PLAN_NETWORK_ERROR",
        PLAN_SAFE_ERROR_MESSAGE,
      );
    }

    const parsed = await parseJson(response);
    if (!response.ok) {
      throw new PlanCommitmentsApiError(
        response.status,
        errorCode(parsed),
        PLAN_SAFE_ERROR_MESSAGE,
      );
    }
    return parsed;
  }

  return {
    async getCommitments(): Promise<PlanCommitmentsSnapshot> {
      const [fixedExpenseResponse, savingsResponse] = await Promise.all([
        request(PLAN_FIXED_EXPENSES_PATH),
        request(PLAN_SAVINGS_PATH),
      ]);
      const fixedExpenses = dataItems(fixedExpenseResponse).map(
        normalizeFixedExpense,
      );
      const savingsGoals = dataItems(savingsResponse).map(normalizeSavingsGoal);

      return {
        adsFinancialTargetingUsed: false,
        fixedExpenseTotalMinor: sumSafe(
          fixedExpenses.map((item) => item.amountMinor),
        ),
        fixedExpenses,
        fixedSavingsTotalMinor: sumSafe(
          savingsGoals.map((item) => item.fixedSaveAmountMinor),
        ),
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        savingsGoals,
        serverAuthority: true,
      };
    },

    async createFixedExpense(
      createRequest: PlanFixedExpenseCreateRequest,
    ): Promise<PlanFixedExpenseCommitment> {
      if (!validFixedExpenseCreate(createRequest)) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_CREATE_REQUEST",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      const response = await request(PLAN_FIXED_EXPENSES_PATH, {
        method: "POST",
        body: JSON.stringify({
          affectsDailyBudget: true,
          amountMinor: createRequest.amountMinor,
          autoPay: true,
          category: createRequest.category,
          frequency: "MONTHLY",
          paymentDay: createRequest.paymentDay,
          title: createRequest.title.trim(),
        }),
      });
      if (!isRecord(response) || !("data" in response)) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_RESPONSE",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeFixedExpense(response.data);
    },

    async recordFixedExpensePayment(
      expenseId: string,
      paymentRequest: PlanFixedExpensePaymentRequest,
    ): Promise<PlanFixedExpenseCommitment> {
      if (!validFixedExpensePayment(expenseId, paymentRequest)) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_PAYMENT_REQUEST",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      const response = await request(
        `${PLAN_FIXED_EXPENSES_PATH}/${encodeURIComponent(expenseId.trim())}/pay`,
        {
          method: "POST",
          body: JSON.stringify({
            idempotencyKey: paymentRequest.idempotencyKey.trim(),
            memo: paymentRequest.memo ?? null,
            paidAmountMinor: paymentRequest.amountMinor,
            ...(paymentRequest.paidAt !== undefined
              ? { paidAt: paymentRequest.paidAt }
              : {}),
            paymentStatus: "PAID",
          }),
        },
      );
      if (
        !isRecord(response) ||
        !isRecord(response.data) ||
        !("expense" in response.data)
      ) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_RESPONSE",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeFixedExpense(response.data.expense);
    },

    async createSavingsGoal(
      createRequest: PlanSavingsGoalCreateRequest,
    ): Promise<PlanSavingsGoalCommitment> {
      if (!validSavingsGoalCreate(createRequest)) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_CREATE_REQUEST",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      const response = await request(PLAN_SAVINGS_PATH, {
        method: "POST",
        body: JSON.stringify({
          accountAlias: null,
          affectsDailyBudget: true,
          autoSave: true,
          currentAmountMinor: 0,
          fixedSaveAmountMinor: createRequest.fixedSaveAmountMinor,
          frequency: "MONTHLY",
          goalType: createRequest.goalType,
          memo: null,
          saveDay: 25,
          targetAmountMinor: createRequest.targetAmountMinor,
          title: createRequest.title.trim(),
        }),
      });
      if (!isRecord(response) || !("data" in response)) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_RESPONSE",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeSavingsGoal(response.data);
    },

    async deleteFixedExpense(expenseId: string): Promise<PlanDeleteResult> {
      if (!validDeleteId(expenseId)) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_DELETE_REQUEST",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeDeleteResult(
        await request(
          `${PLAN_FIXED_EXPENSES_PATH}/${encodeURIComponent(expenseId.trim())}`,
          { method: "DELETE" },
        ),
        "expenseId",
      );
    },

    async deleteSavingsGoal(goalId: string): Promise<PlanDeleteResult> {
      if (!validDeleteId(goalId)) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_DELETE_REQUEST",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeDeleteResult(
        await request(
          `${PLAN_SAVINGS_PATH}/${encodeURIComponent(goalId.trim())}`,
          {
            method: "DELETE",
          },
        ),
        "goalId",
      );
    },
  };
}
