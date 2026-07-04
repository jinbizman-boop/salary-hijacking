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
  PlanFixedExpenseUpdateRequest,
  PlanSavingsDepositRequest,
  PlanSavingsGoalCreateRequest,
  PlanSavingsGoalCommitment,
  PlanSavingsGoalUpdateRequest,
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

const SERVER_FIXED_EXPENSE_CATEGORIES = Object.freeze([
  "HOUSING",
  "TELECOM",
  "UTILITY",
  "INSURANCE",
  "SUBSCRIPTION",
  "LOAN_REPAYMENT",
  "TRANSPORT",
  "EDUCATION",
  "HEALTHCARE",
  "FAMILY",
  "TAX",
  "ETC",
]);

function normalizeFixedExpenseCategory(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return SERVER_FIXED_EXPENSE_CATEGORIES.includes(normalized)
    ? normalized
    : null;
}

function isSafeCommitmentId(value: string): boolean {
  return /^[A-Za-z0-9_-]{3,160}$/u.test(value.trim());
}

const RAW_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const RAW_PHONE_PATTERN = /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/u;
const RAW_CARD_PATTERN = /\b(?:\d{4}[-\s]?){3}\d{4}\b/u;
const RAW_ACCOUNT_PATTERN =
  /(?:계좌|account)\s*(?:번호)?\s*[:：-]?\s*\d{2,6}(?:[-\s]\d{2,6}){1,4}/iu;
const RAW_TOKEN_PATTERN =
  /\b(token|authorization|bearer|session|refresh|push|fcm)\b\s*[:=]?\s*[A-Z0-9._~+/=-]{8,}/iu;
const RAW_JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u;
const RAW_KRW_PATTERN = /\d[\d,]*(?:원|KRW|₩)/iu;
const RAW_PLAN_TEXT_PATTERN =
  /급여|월급|급여명세|소득|연봉|계좌|카드|대출|주민등록|전화번호|비밀번호|인증토큰/u;
const RAW_PLAN_VALUE_PATTERNS = [
  RAW_EMAIL_PATTERN,
  RAW_PHONE_PATTERN,
  RAW_CARD_PATTERN,
  RAW_ACCOUNT_PATTERN,
  RAW_TOKEN_PATTERN,
  RAW_JWT_PATTERN,
  RAW_KRW_PATTERN,
] as const;

function containsRawSensitivePlanText(value: string): boolean {
  return (
    RAW_PLAN_TEXT_PATTERN.test(value) ||
    RAW_PLAN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function normalizeCommitmentId(value: unknown): string {
  if (typeof value !== "string" || !isSafeCommitmentId(value)) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_INVALID_RESPONSE",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }
  return value.trim();
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

  if (url.username || url.password) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_INVALID_BASE_URL",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }

  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "10.0.2.2";
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
    id: normalizeCommitmentId(value.expenseId),
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
    id: normalizeCommitmentId(value.goalId),
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
  const record = value as Record<string, unknown>;
  return (
    hasOnlyKeys(record, ["amountMinor", "category", "paymentDay", "title"]) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.length <= 100 &&
    !containsRawSensitivePlanText(value.title) &&
    typeof value.category === "string" &&
    normalizeFixedExpenseCategory(value.category) !== null &&
    !containsRawSensitivePlanText(value.category) &&
    isPositiveMoney(value.amountMinor) &&
    isPositiveDay(value.paymentDay)
  );
}

function validSavingsGoalCreate(value: PlanSavingsGoalCreateRequest): boolean {
  const record = value as Record<string, unknown>;
  return (
    hasOnlyKeys(record, [
      "fixedSaveAmountMinor",
      "goalType",
      "targetAmountMinor",
      "title",
    ]) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.length <= 100 &&
    !containsRawSensitivePlanText(value.title) &&
    typeof value.goalType === "string" &&
    value.goalType.trim().length > 0 &&
    !containsRawSensitivePlanText(value.goalType) &&
    isPositiveMoney(value.targetAmountMinor) &&
    isNonNegativeInteger(value.fixedSaveAmountMinor) &&
    value.fixedSaveAmountMinor <= value.targetAmountMinor
  );
}

function hasDefinedValue(value: Record<string, unknown>): boolean {
  return Object.values(value).some((item) => item !== undefined);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function validFixedExpenseUpdate(
  value: PlanFixedExpenseUpdateRequest,
): boolean {
  const record = value as Record<string, unknown>;
  return (
    hasOnlyKeys(record, ["amountMinor", "category", "paymentDay", "title"]) &&
    hasDefinedValue(record) &&
    (value.title === undefined ||
      (typeof value.title === "string" &&
        value.title.trim().length > 0 &&
        value.title.length <= 100 &&
        !containsRawSensitivePlanText(value.title))) &&
    (value.category === undefined ||
      (typeof value.category === "string" &&
        normalizeFixedExpenseCategory(value.category) !== null &&
        !containsRawSensitivePlanText(value.category))) &&
    (value.amountMinor === undefined || isPositiveMoney(value.amountMinor)) &&
    (value.paymentDay === undefined || isPositiveDay(value.paymentDay))
  );
}

function validSavingsGoalUpdate(value: PlanSavingsGoalUpdateRequest): boolean {
  const record = value as Record<string, unknown>;
  const targetAmountMinor = value.targetAmountMinor;
  const fixedSaveAmountMinor = value.fixedSaveAmountMinor;
  return (
    hasOnlyKeys(record, [
      "fixedSaveAmountMinor",
      "goalType",
      "targetAmountMinor",
      "title",
    ]) &&
    hasDefinedValue(record) &&
    (value.title === undefined ||
      (typeof value.title === "string" &&
        value.title.trim().length > 0 &&
        value.title.length <= 100 &&
        !containsRawSensitivePlanText(value.title))) &&
    (value.goalType === undefined ||
      (typeof value.goalType === "string" &&
        value.goalType.trim().length > 0 &&
        !containsRawSensitivePlanText(value.goalType))) &&
    (targetAmountMinor === undefined || isPositiveMoney(targetAmountMinor)) &&
    (fixedSaveAmountMinor === undefined ||
      isNonNegativeInteger(fixedSaveAmountMinor)) &&
    !(
      targetAmountMinor !== undefined &&
      fixedSaveAmountMinor !== undefined &&
      fixedSaveAmountMinor > targetAmountMinor
    )
  );
}

function validFixedExpensePayment(
  expenseId: string,
  value: PlanFixedExpensePaymentRequest,
): boolean {
  const record = value as Record<string, unknown>;
  return (
    typeof expenseId === "string" &&
    isSafeCommitmentId(expenseId) &&
    hasOnlyKeys(record, ["amountMinor", "idempotencyKey", "memo", "paidAt"]) &&
    isPositiveMoney(value.amountMinor) &&
    typeof value.idempotencyKey === "string" &&
    value.idempotencyKey.trim().length > 0 &&
    value.idempotencyKey.length <= 160 &&
    (value.memo === undefined ||
      value.memo === null ||
      (typeof value.memo === "string" &&
        value.memo.length <= 500 &&
        !containsRawSensitivePlanText(value.memo))) &&
    (value.paidAt === undefined ||
      (typeof value.paidAt === "string" &&
        !Number.isNaN(new Date(value.paidAt).getTime())))
  );
}

function validSavingsDeposit(
  goalId: string,
  value: PlanSavingsDepositRequest,
): boolean {
  const record = value as Record<string, unknown>;
  return (
    typeof goalId === "string" &&
    isSafeCommitmentId(goalId) &&
    hasOnlyKeys(record, [
      "amountMinor",
      "idempotencyKey",
      "memo",
      "occurredAt",
    ]) &&
    isPositiveMoney(value.amountMinor) &&
    typeof value.idempotencyKey === "string" &&
    value.idempotencyKey.trim().length > 0 &&
    value.idempotencyKey.length <= 160 &&
    (value.memo === undefined ||
      value.memo === null ||
      (typeof value.memo === "string" &&
        value.memo.length <= 500 &&
        !containsRawSensitivePlanText(value.memo))) &&
    (value.occurredAt === undefined ||
      (typeof value.occurredAt === "string" &&
        !Number.isNaN(new Date(value.occurredAt).getTime())))
  );
}

function validDeleteId(value: string): boolean {
  return typeof value === "string" && isSafeCommitmentId(value);
}

function normalizeDeleteResult(
  value: unknown,
  idKey: "expenseId" | "goalId",
): PlanDeleteResult {
  if (
    !isRecord(value) ||
    !isRecord(value.data) ||
    value.data.status !== "DELETED"
  ) {
    throw new PlanCommitmentsApiError(
      0,
      "PLAN_INVALID_RESPONSE",
      PLAN_SAFE_ERROR_MESSAGE,
    );
  }
  return {
    id: normalizeCommitmentId(value.data[idKey]),
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
          category: normalizeFixedExpenseCategory(createRequest.category),
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

    async updateFixedExpense(
      expenseId: string,
      updateRequest: PlanFixedExpenseUpdateRequest,
    ): Promise<PlanFixedExpenseCommitment> {
      if (
        !validDeleteId(expenseId) ||
        !validFixedExpenseUpdate(updateRequest)
      ) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_UPDATE_REQUEST",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      const response = await request(
        `${PLAN_FIXED_EXPENSES_PATH}/${encodeURIComponent(expenseId.trim())}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...updateRequest,
            ...(updateRequest.title !== undefined
              ? { title: updateRequest.title.trim() }
              : {}),
            ...(updateRequest.category !== undefined
              ? {
                  category: normalizeFixedExpenseCategory(
                    updateRequest.category,
                  ),
                }
              : {}),
          }),
        },
      );
      if (!isRecord(response) || !("data" in response)) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_RESPONSE",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeFixedExpense(response.data);
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

    async recordSavingsDeposit(
      goalId: string,
      depositRequest: PlanSavingsDepositRequest,
    ): Promise<PlanSavingsGoalCommitment> {
      if (!validSavingsDeposit(goalId, depositRequest)) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_SAVINGS_DEPOSIT_REQUEST",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      const response = await request(
        `${PLAN_SAVINGS_PATH}/${encodeURIComponent(goalId.trim())}/deposit`,
        {
          method: "POST",
          body: JSON.stringify({
            amountMinor: depositRequest.amountMinor,
            idempotencyKey: depositRequest.idempotencyKey.trim(),
            memo: depositRequest.memo ?? null,
            ...(depositRequest.occurredAt !== undefined
              ? { occurredAt: depositRequest.occurredAt }
              : {}),
            reason: "mobile plan savings deposit",
            transactionType: "DEPOSIT",
          }),
        },
      );
      if (
        !isRecord(response) ||
        !isRecord(response.data) ||
        !("goal" in response.data)
      ) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_RESPONSE",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeSavingsGoal(response.data.goal);
    },

    async updateSavingsGoal(
      goalId: string,
      updateRequest: PlanSavingsGoalUpdateRequest,
    ): Promise<PlanSavingsGoalCommitment> {
      if (!validDeleteId(goalId) || !validSavingsGoalUpdate(updateRequest)) {
        throw new PlanCommitmentsApiError(
          0,
          "PLAN_INVALID_UPDATE_REQUEST",
          PLAN_SAFE_ERROR_MESSAGE,
        );
      }
      const response = await request(
        `${PLAN_SAVINGS_PATH}/${encodeURIComponent(goalId.trim())}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...updateRequest,
            ...(updateRequest.title !== undefined
              ? { title: updateRequest.title.trim() }
              : {}),
            ...(updateRequest.goalType !== undefined
              ? { goalType: updateRequest.goalType.trim() }
              : {}),
          }),
        },
      );
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
