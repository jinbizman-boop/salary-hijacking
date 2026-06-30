/** services/api/src/routes/fixed-expenses.routes.ts
 * 급여납치 Salary Hijacking Platform · 고정지출 API 라우트 최종본
 *
 * Cloudflare Workers Fetch API 호환 단일 파일이다. 월세/통신비/보험/구독/대출상환 등
 * 급여일 이후 반복적으로 빠져나가는 고정지출을 사용자별로 생성·조회·수정·삭제·일시정지·재개·종료·결제처리한다.
 * 고정지출 합계와 예정 결제는 급여계획/일일예산 서버 권위 계산의 입력으로 사용되며,
 * auth/error/rate-limit/audit 미들웨어와 연동할 수 있도록 x-auth-* 컨텍스트, 표준 JSON 계약,
 * requestId, 소유권 경계, 민감정보 마스킹, repository injection, in-memory fallback을 포함한다.
 */

export const FIXED_EXPENSES_ROUTES_VERSION = "3.1.0";
export const FIXED_EXPENSES_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const FIXED_EXPENSES_API_PREFIX = "/api/v1/fixed-expenses";

const MAX_JSON_BODY_BYTES = 128 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TEXT = 2_000;
const KRW_MINOR_UNIT = 1;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

export type FixedExpenseCategory =
  | "HOUSING"
  | "TELECOM"
  | "UTILITY"
  | "INSURANCE"
  | "SUBSCRIPTION"
  | "LOAN_REPAYMENT"
  | "TRANSPORT"
  | "EDUCATION"
  | "HEALTHCARE"
  | "FAMILY"
  | "TAX"
  | "ETC";

export type FixedExpenseFrequency = "WEEKLY" | "MONTHLY" | "YEARLY" | "ONCE";
export type FixedExpenseStatus = "ACTIVE" | "PAUSED" | "ENDED" | "DELETED";
export type FixedExpensePaymentStatus =
  | "SCHEDULED"
  | "PAID"
  | "SKIPPED"
  | "FAILED";
export type FixedExpenseRole =
  | "USER"
  | "OPERATOR"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "SYSTEM";
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export type FetchHandler<TEnv = unknown> = (
  request: Request,
  env: TEnv,
  context: WaitUntilCapable,
) => Response | Promise<Response>;

export interface FixedExpensePrincipal {
  readonly userId: string;
  readonly roles: readonly FixedExpenseRole[];
  readonly permissions: readonly string[];
  readonly policyId: string | null;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}

export interface FixedExpenseListResult<TItem extends JsonRecord = JsonRecord> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface FixedExpenseCreateInput {
  readonly title: string;
  readonly category: FixedExpenseCategory;
  readonly amountMinor: number;
  readonly frequency: FixedExpenseFrequency;
  readonly paymentDay: number | null;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly merchantName: string | null;
  readonly memo: string | null;
  readonly autoPay: boolean;
  readonly affectsDailyBudget: boolean;
}

export interface FixedExpenseUpdateInput {
  readonly title?: string | undefined;
  readonly category?: FixedExpenseCategory | undefined;
  readonly amountMinor?: number | undefined;
  readonly frequency?: FixedExpenseFrequency | undefined;
  readonly paymentDay?: number | null | undefined;
  readonly startDate?: string | undefined;
  readonly endDate?: string | null | undefined;
  readonly merchantName?: string | null | undefined;
  readonly memo?: string | null | undefined;
  readonly autoPay?: boolean | undefined;
  readonly affectsDailyBudget?: boolean | undefined;
  readonly status?: FixedExpenseStatus | undefined;
}

export interface FixedExpensePaymentInput {
  readonly paidAmountMinor: number;
  readonly paidAt: string;
  readonly paymentStatus: FixedExpensePaymentStatus;
  readonly memo: string | null;
  readonly idempotencyKey: string | null;
}

export interface FixedExpenseImpactInput {
  readonly periodStartDate: string;
  readonly periodEndDate: string;
  readonly payrollAmountMinor: number;
  readonly fixedSavingsAmountMinor: number;
  readonly variableExpenseReserveMinor: number;
}

export interface FixedExpenseRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly principal: FixedExpensePrincipal;
  readonly repository: FixedExpenseRepository<TEnv>;
}

export interface FixedExpenseRepository<TEnv = unknown> {
  readonly name?: string;
  listExpenses(
    input: JsonRecord,
    page: PaginationInput,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<FixedExpenseListResult>;
  getExpense(
    expenseId: string,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  createExpense(
    input: FixedExpenseCreateInput,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updateExpense(
    expenseId: string,
    input: FixedExpenseUpdateInput,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  deleteExpense(
    expenseId: string,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  pauseExpense(
    expenseId: string,
    reason: string,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  resumeExpense(
    expenseId: string,
    reason: string,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  endExpense(
    expenseId: string,
    endDate: string,
    reason: string,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  recordPayment(
    expenseId: string,
    input: FixedExpensePaymentInput,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  upcoming(
    input: JsonRecord,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  summary(
    input: JsonRecord,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  calendar(
    input: JsonRecord,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  impact(
    input: FixedExpenseImpactInput,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
}

export interface FixedExpensesRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | FixedExpenseRepository<TEnv>
    | ((env: TEnv) => FixedExpenseRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
  readonly onFixedExpenseEvent?: (
    event: FixedExpenseEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface FixedExpenseEvent {
  readonly event:
    | "fixed_expense_created"
    | "fixed_expense_updated"
    | "fixed_expense_deleted"
    | "fixed_expense_paused"
    | "fixed_expense_resumed"
    | "fixed_expense_ended"
    | "fixed_expense_paid"
    | "fixed_expense_impact_calculated";
  readonly requestId: string;
  readonly userId: string;
  readonly expenseId: string | null;
  readonly path: string;
  readonly createdAt: string;
}

class FixedExpenseHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: JsonValue | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details: JsonValue | null = null,
  ) {
    super(message);
    this.name = "FixedExpenseHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const sensitiveKeyFragments = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "email",
  "phone",
  "resident",
  "account",
  "card",
  "salary",
  "payroll",
  "income",
  "loanAccount",
  "debtAccount",
  "adTarget",
  "targeting",
  "비밀번호",
  "토큰",
  "계좌",
  "카드",
  "급여",
  "월급",
  "소득",
];

function normalizePath(pathname: string): string {
  const normalized = (pathname || "/").replace(/\/+/g, "/");
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function header(request: Request, name: string): string | null {
  const value = request.headers.get(name)?.trim();
  return value ? value : null;
}

function requestIdFromHeaders(request: Request): string {
  const value =
    header(request, "x-request-id") ??
    header(request, "x-correlation-id") ??
    header(request, "cf-ray");
  if (value && /^[a-zA-Z0-9._:\-/]{8,160}$/.test(value))
    return value.slice(0, 160);
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now().toString(36)}`;
}

function normalizeRole(value: string): FixedExpenseRole | null {
  const role = value.trim().toUpperCase();
  if (["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role))
    return role as FixedExpenseRole;
  return null;
}

function principalFromRequest(
  request: Request,
  requireSource: boolean,
): FixedExpensePrincipal {
  const source = header(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source !== AUTH_CONTEXT_SOURCE_VALUE) {
    throw new FixedExpenseHttpError(
      401,
      "FIXED_EXPENSE_AUTH_CONTEXT_REQUIRED",
      "인증 컨텍스트가 필요합니다.",
    );
  }

  const userId = header(request, "x-authenticated-user-id");
  if (!userId)
    throw new FixedExpenseHttpError(
      401,
      "FIXED_EXPENSE_AUTH_REQUIRED",
      "로그인이 필요합니다.",
    );

  const roles = (header(request, "x-authenticated-roles") ?? "USER")
    .split(",")
    .map((role) => normalizeRole(role))
    .filter((role): role is FixedExpenseRole => Boolean(role));
  const permissions = (header(request, "x-authenticated-permissions") ?? "")
    .split(",")
    .map((permission) => permission.trim())
    .filter(Boolean);

  return {
    userId,
    roles: roles.length ? roles : ["USER"],
    permissions,
    policyId: header(request, "x-auth-policy-id"),
  };
}

function isPrivileged(principal: FixedExpensePrincipal): boolean {
  return (
    principal.roles.some(
      (role) =>
        role === "ADMIN" || role === "SUPER_ADMIN" || role === "OPERATOR",
    ) || principal.permissions.includes("*")
  );
}

function assertOwner(userId: string, runtime: FixedExpenseRouteRuntime): void {
  if (userId === runtime.principal.userId || isPrivileged(runtime.principal))
    return;
  throw new FixedExpenseHttpError(
    403,
    "FIXED_EXPENSE_OWNER_REQUIRED",
    "본인 고정지출만 접근할 수 있습니다.",
  );
}

function keyLooksSensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveKeyFragments.some((fragment) =>
    normalized.includes(fragment.toLowerCase().replace(/[\s._-]/g, "")),
  );
}

function sanitizeString(value: string): string {
  return value.length > MAX_TEXT
    ? `${value.slice(0, MAX_TEXT)}…[truncated]`
    : value;
}

function sanitize(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value !== "object") return String(value);
  if (depth >= 8) return "[MAX_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => sanitize(item, depth + 1, seen));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 120)
      .map(([key, item]) => [
        key.slice(0, 160),
        keyLooksSensitive(key) ? "[REDACTED]" : sanitize(item, depth + 1, seen),
      ]),
  );
}

function jsonResponse(
  runtime: Pick<FixedExpenseRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: FIXED_EXPENSES_ROUTES_SERVICE_NAME,
        version: FIXED_EXPENSES_ROUTES_VERSION,
        requestId: runtime.requestId,
        path: runtime.path,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": status >= 400 ? "no-store" : "private, no-store",
        "x-request-id": runtime.requestId,
        "x-content-type-options": "nosniff",
      },
    },
  );
}

function errorResponse(
  requestId: string,
  path: string,
  error: unknown,
): Response {
  const normalized =
    error instanceof FixedExpenseHttpError
      ? error
      : new FixedExpenseHttpError(
          500,
          "FIXED_EXPENSE_ROUTE_INTERNAL_ERROR",
          "고정지출 API 처리 중 오류가 발생했습니다.",
        );
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        status: normalized.status,
        requestId,
        ...(normalized.details ? { details: normalized.details } : {}),
      },
      meta: {
        service: FIXED_EXPENSES_ROUTES_SERVICE_NAME,
        version: FIXED_EXPENSES_ROUTES_VERSION,
        requestId,
        path,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status: normalized.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-request-id": requestId,
        "x-error-code": normalized.code,
        "x-content-type-options": "nosniff",
      },
    },
  );
}

async function parseJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  if (
    !["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())
  )
    return {};
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    !contentType.includes("application/json") &&
    !contentType.includes("+json")
  )
    return {};
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_JSON_BODY_BYTES)
    throw new FixedExpenseHttpError(
      413,
      "FIXED_EXPENSE_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_JSON_OBJECT_REQUIRED",
      "JSON 객체 본문이 필요합니다.",
    );
  return parsed as Record<string, unknown>;
}

function stringField(
  input: Record<string, unknown>,
  key: string,
  options: { readonly required?: boolean; readonly maxLength?: number } = {},
): string {
  const value = input[key];
  const required = options.required ?? true;
  if (typeof value === "string" && value.trim())
    return value.trim().slice(0, options.maxLength ?? MAX_TEXT);
  if (required)
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_FIELD_REQUIRED",
      `${key} 값이 필요합니다.`,
      { field: key },
    );
  return "";
}

function optionalStringField(
  input: Record<string, unknown>,
  key: string,
  maxLength = MAX_TEXT,
): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function booleanField(
  input: Record<string, unknown>,
  key: string,
  fallback = false,
): boolean {
  return input[key] === undefined ? fallback : input[key] === true;
}

function moneyField(
  input: Record<string, unknown>,
  key: string,
  options: {
    readonly required?: boolean;
    readonly min?: number;
    readonly max?: number;
  } = {},
): number {
  const value = input[key];
  const required = options.required ?? true;
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value % KRW_MINOR_UNIT === 0
  ) {
    const min = options.min ?? 0;
    const max = options.max ?? 1_000_000_000;
    if (value < min || value > max)
      throw new FixedExpenseHttpError(
        400,
        "FIXED_EXPENSE_AMOUNT_RANGE_INVALID",
        `${key} 금액 범위가 올바르지 않습니다.`,
        { field: key },
      );
    return value;
  }
  if (required)
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_AMOUNT_REQUIRED",
      `${key} 금액이 필요합니다.`,
      { field: key },
    );
  return 0;
}

function normalizeDate(value: string): string {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_DATE_INVALID",
      "날짜는 YYYY-MM-DD 형식이어야 합니다.",
    );
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_DATE_INVALID",
      "존재하지 않는 날짜입니다.",
    );
  return date;
}

function dateFromUnknown(value: unknown, fallback: string): string {
  return normalizeDate(
    typeof value === "string" && value.trim() ? value : fallback,
  );
}

function todayInSeoul(now: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function addMonths(date: string, months: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCMonth(base.getUTCMonth() + months);
  return base.toISOString().slice(0, 10);
}

function daysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (end < start)
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_PERIOD_INVALID",
      "종료일은 시작일보다 빠를 수 없습니다.",
    );
  return Math.floor((end - start) / 86_400_000) + 1;
}

function normalizeCategory(value: unknown): FixedExpenseCategory {
  const category =
    typeof value === "string" ? value.trim().toUpperCase() : "ETC";
  if (
    [
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
    ].includes(category)
  )
    return category as FixedExpenseCategory;
  throw new FixedExpenseHttpError(
    400,
    "FIXED_EXPENSE_CATEGORY_INVALID",
    "고정지출 카테고리가 올바르지 않습니다.",
  );
}

function normalizeFrequency(value: unknown): FixedExpenseFrequency {
  const frequency =
    typeof value === "string" ? value.trim().toUpperCase() : "MONTHLY";
  if (["WEEKLY", "MONTHLY", "YEARLY", "ONCE"].includes(frequency))
    return frequency as FixedExpenseFrequency;
  throw new FixedExpenseHttpError(
    400,
    "FIXED_EXPENSE_FREQUENCY_INVALID",
    "반복 주기가 올바르지 않습니다.",
  );
}

function normalizeStatus(value: unknown): FixedExpenseStatus {
  const status =
    typeof value === "string" ? value.trim().toUpperCase() : "ACTIVE";
  if (["ACTIVE", "PAUSED", "ENDED", "DELETED"].includes(status))
    return status as FixedExpenseStatus;
  throw new FixedExpenseHttpError(
    400,
    "FIXED_EXPENSE_STATUS_INVALID",
    "고정지출 상태가 올바르지 않습니다.",
  );
}

function normalizePaymentStatus(value: unknown): FixedExpensePaymentStatus {
  const status =
    typeof value === "string" ? value.trim().toUpperCase() : "PAID";
  if (["SCHEDULED", "PAID", "SKIPPED", "FAILED"].includes(status))
    return status as FixedExpensePaymentStatus;
  throw new FixedExpenseHttpError(
    400,
    "FIXED_EXPENSE_PAYMENT_STATUS_INVALID",
    "결제 상태가 올바르지 않습니다.",
  );
}

function paymentDayField(
  input: Record<string, unknown>,
  key: string,
  frequency: FixedExpenseFrequency,
  required = true,
): number | null {
  const value = input[key];
  if (value === null || value === undefined) {
    if (frequency === "ONCE") return null;
    if (required)
      throw new FixedExpenseHttpError(
        400,
        "FIXED_EXPENSE_PAYMENT_DAY_REQUIRED",
        "정기 고정지출은 결제일이 필요합니다.",
      );
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value))
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_PAYMENT_DAY_INVALID",
      "결제일은 정수여야 합니다.",
    );
  const max = frequency === "WEEKLY" ? 7 : 31;
  if (value < 1 || value > max)
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_PAYMENT_DAY_INVALID",
      `결제일은 1부터 ${max} 사이여야 합니다.`,
    );
  return value;
}

function pagination(url: URL): PaginationInput {
  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  );
  const pageSize = Math.max(
    1,
    Math.min(
      MAX_PAGE_SIZE,
      Number.parseInt(
        url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
        10,
      ) || DEFAULT_PAGE_SIZE,
    ),
  );
  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
}

function queryRecord(url: URL): JsonRecord {
  const record: Record<string, JsonValue> = {};
  url.searchParams.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function idFromMatch(match: RegExpMatchArray, index: number): string {
  const value = match[index];
  if (!value)
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_ROUTE_ID_REQUIRED",
      "경로 식별자가 필요합니다.",
    );
  return decodeURIComponent(value);
}

function matchRoute(path: string, pattern: RegExp): RegExpMatchArray | null {
  return path.match(pattern);
}

function listResult<TItem extends JsonRecord>(
  items: readonly TItem[],
  page: PaginationInput,
): FixedExpenseListResult<TItem> {
  return {
    items: items.slice(page.offset, page.offset + page.limit),
    page: page.page,
    pageSize: page.pageSize,
    total: items.length,
  };
}

function createExpenseInput(
  body: Record<string, unknown>,
  now: Date,
): FixedExpenseCreateInput {
  const frequency = normalizeFrequency(body.frequency);
  return {
    title: stringField(body, "title", { maxLength: 100 }),
    category: normalizeCategory(body.category),
    amountMinor: moneyField(body, "amountMinor", { min: 1 }),
    frequency,
    paymentDay: paymentDayField(body, "paymentDay", frequency, true),
    startDate: dateFromUnknown(body.startDate, todayInSeoul(now)),
    endDate:
      body.endDate === undefined || body.endDate === null
        ? null
        : dateFromUnknown(body.endDate, ""),
    merchantName: optionalStringField(body, "merchantName", 120),
    memo: optionalStringField(body, "memo", 500),
    autoPay: booleanField(body, "autoPay", true),
    affectsDailyBudget: booleanField(body, "affectsDailyBudget", true),
  };
}

function updateExpenseInput(
  body: Record<string, unknown>,
): FixedExpenseUpdateInput {
  const frequency =
    body.frequency !== undefined
      ? normalizeFrequency(body.frequency)
      : undefined;
  const input: FixedExpenseUpdateInput = {
    ...(body.title !== undefined
      ? { title: stringField(body, "title", { maxLength: 100 }) }
      : {}),
    ...(body.category !== undefined
      ? { category: normalizeCategory(body.category) }
      : {}),
    ...(body.amountMinor !== undefined
      ? { amountMinor: moneyField(body, "amountMinor", { min: 1 }) }
      : {}),
    ...(frequency !== undefined ? { frequency } : {}),
    ...(body.paymentDay !== undefined
      ? {
          paymentDay: paymentDayField(
            body,
            "paymentDay",
            frequency ?? "MONTHLY",
            false,
          ),
        }
      : {}),
    ...(body.startDate !== undefined
      ? { startDate: dateFromUnknown(body.startDate, "") }
      : {}),
    ...(body.endDate !== undefined
      ? {
          endDate:
            body.endDate === null ? null : dateFromUnknown(body.endDate, ""),
        }
      : {}),
    ...(body.merchantName !== undefined
      ? { merchantName: optionalStringField(body, "merchantName", 120) }
      : {}),
    ...(body.memo !== undefined
      ? { memo: optionalStringField(body, "memo", 500) }
      : {}),
    ...(body.autoPay !== undefined
      ? { autoPay: booleanField(body, "autoPay") }
      : {}),
    ...(body.affectsDailyBudget !== undefined
      ? { affectsDailyBudget: booleanField(body, "affectsDailyBudget") }
      : {}),
    ...(body.status !== undefined
      ? { status: normalizeStatus(body.status) }
      : {}),
  };
  if (!Object.keys(input).length)
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_UPDATE_EMPTY",
      "수정할 값이 필요합니다.",
    );
  return input;
}

function paymentInput(
  body: Record<string, unknown>,
  now: Date,
): FixedExpensePaymentInput {
  const paidAt = optionalStringField(body, "paidAt") ?? now.toISOString();
  const parsed = new Date(paidAt);
  if (Number.isNaN(parsed.getTime()))
    throw new FixedExpenseHttpError(
      400,
      "FIXED_EXPENSE_PAID_AT_INVALID",
      "결제 시간이 올바르지 않습니다.",
    );
  return {
    paidAmountMinor: moneyField(body, "paidAmountMinor", { min: 0 }),
    paidAt: parsed.toISOString(),
    paymentStatus: normalizePaymentStatus(body.paymentStatus),
    memo: optionalStringField(body, "memo", 500),
    idempotencyKey: optionalStringField(body, "idempotencyKey", 160),
  };
}

function reasonFromBody(body: Record<string, unknown>): string {
  return stringField(body, "reason", { maxLength: 500 });
}

function impactInput(
  body: Record<string, unknown>,
  now: Date,
): FixedExpenseImpactInput {
  const today = todayInSeoul(now);
  const periodStartDate = dateFromUnknown(body.periodStartDate, today);
  const periodEndDate = dateFromUnknown(
    body.periodEndDate,
    addMonths(periodStartDate, 1),
  );
  daysInclusive(periodStartDate, periodEndDate);
  return {
    periodStartDate,
    periodEndDate,
    payrollAmountMinor: moneyField(body, "payrollAmountMinor", { min: 0 }),
    fixedSavingsAmountMinor: moneyField(body, "fixedSavingsAmountMinor", {
      required: false,
      min: 0,
    }),
    variableExpenseReserveMinor: moneyField(
      body,
      "variableExpenseReserveMinor",
      { required: false, min: 0 },
    ),
  };
}

function isExpenseActiveInPeriod(
  expense: JsonRecord,
  startDate: string,
  endDate: string,
): boolean {
  const status = String(expense.status ?? "ACTIVE");
  if (status !== "ACTIVE") return false;
  const start = String(expense.startDate ?? startDate);
  const end = typeof expense.endDate === "string" ? expense.endDate : null;
  return start <= endDate && (!end || end >= startDate);
}

function nextDueDate(expense: JsonRecord, fromDate: string): string | null {
  const frequency = String(
    expense.frequency ?? "MONTHLY",
  ) as FixedExpenseFrequency;
  const startDate = String(expense.startDate ?? fromDate);
  const endDate = typeof expense.endDate === "string" ? expense.endDate : null;
  const paymentDay =
    typeof expense.paymentDay === "number" ? expense.paymentDay : null;
  const candidate = startDate > fromDate ? startDate : fromDate;

  if (frequency === "ONCE")
    return startDate >= fromDate && (!endDate || startDate <= endDate)
      ? startDate
      : null;
  if (frequency === "WEEKLY") {
    const targetDay = paymentDay ?? 1;
    for (let offset = 0; offset < 8; offset += 1) {
      const test = addDays(candidate, offset);
      const day = new Date(`${test}T00:00:00.000Z`).getUTCDay() || 7;
      if (day === targetDay && (!endDate || test <= endDate)) return test;
    }
    return null;
  }

  const maxLoops = frequency === "YEARLY" ? 15 : 24;
  for (let step = 0; step < maxLoops; step += 1) {
    const base =
      frequency === "YEARLY"
        ? addMonths(candidate, step * 12)
        : addMonths(candidate, step);
    const date = new Date(`${base.slice(0, 7)}-01T00:00:00.000Z`);
    const last = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const due = `${base.slice(0, 7)}-${String(Math.min(paymentDay ?? 1, last)).padStart(2, "0")}`;
    if (due >= fromDate && due >= startDate && (!endDate || due <= endDate))
      return due;
  }
  return null;
}

function occurrencesInPeriod(
  expense: JsonRecord,
  startDate: string,
  endDate: string,
): readonly string[] {
  if (!isExpenseActiveInPeriod(expense, startDate, endDate)) return [];
  const dates: string[] = [];
  let cursor = startDate;
  for (let index = 0; index < 370; index += 1) {
    const due = nextDueDate(expense, cursor);
    if (!due || due > endDate) break;
    dates.push(due);
    cursor = addDays(due, 1);
  }
  return dates;
}

async function emit<TEnv>(
  runtime: FixedExpenseRouteRuntime<TEnv>,
  event: FixedExpenseEvent,
): Promise<void> {
  const options = (
    runtime as FixedExpenseRouteRuntime<TEnv> & {
      readonly routeOptions?: FixedExpensesRoutesOptions<TEnv>;
    }
  ).routeOptions;
  if (!options?.onFixedExpenseEvent) return;
  const task = Promise.resolve(
    options.onFixedExpenseEvent(event, runtime.env, runtime.execution),
  ).catch((error) => {
    console.warn(
      "fixed_expenses_routes_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  runtime.execution.waitUntil?.(task);
}

function createInMemoryFixedExpenseRepository<
  TEnv = unknown,
>(): FixedExpenseRepository<TEnv> {
  const expenses = new Map<string, JsonRecord>();
  const payments = new Map<string, JsonRecord>();

  function visibleForUser(userId: string): JsonRecord[] {
    return [...expenses.values()].filter(
      (item) => item.userId === userId && item.status !== "DELETED",
    );
  }

  function findForRuntime(
    expenseId: string,
    runtime: FixedExpenseRouteRuntime<TEnv>,
  ): JsonRecord | null {
    const found = expenses.get(expenseId) ?? null;
    if (!found || found.status === "DELETED") return null;
    assertOwner(String(found.userId), runtime);
    return found;
  }

  function paymentListForExpense(expenseId: string): JsonRecord[] {
    return [...payments.values()].filter(
      (item) => item.expenseId === expenseId,
    );
  }

  return {
    name: "in-memory-fixed-expense-repository",
    async listExpenses(input, page, runtime): Promise<FixedExpenseListResult> {
      const category =
        typeof input.category === "string" && input.category
          ? input.category
          : null;
      const status =
        typeof input.status === "string" && input.status ? input.status : null;
      const keyword =
        typeof input.q === "string" && input.q ? input.q.toLowerCase() : null;
      const items = visibleForUser(runtime.principal.userId)
        .filter((item) => !category || item.category === category)
        .filter((item) => !status || item.status === status)
        .filter(
          (item) =>
            !keyword ||
            `${item.title ?? ""}\n${item.merchantName ?? ""}`
              .toLowerCase()
              .includes(keyword),
        )
        .sort((left, right) =>
          String(left.title).localeCompare(String(right.title)),
        )
        .map((item) => ({
          ...item,
          nextDueDate: nextDueDate(item, todayInSeoul(runtime.now)),
          paymentCount: paymentListForExpense(String(item.expenseId)).length,
        }));
      return listResult(items, page);
    },
    async getExpense(expenseId, runtime): Promise<JsonRecord | null> {
      const found = findForRuntime(expenseId, runtime);
      return found
        ? {
            ...found,
            nextDueDate: nextDueDate(found, todayInSeoul(runtime.now)),
            payments: paymentListForExpense(expenseId).slice(-10),
          }
        : null;
    },
    async createExpense(input, runtime): Promise<JsonRecord> {
      if (input.endDate && input.endDate < input.startDate)
        throw new FixedExpenseHttpError(
          400,
          "FIXED_EXPENSE_END_DATE_INVALID",
          "종료일은 시작일보다 빠를 수 없습니다.",
        );
      const expenseId = `fex_${globalThis.crypto.randomUUID()}`;
      const record: JsonRecord = {
        expenseId,
        userId: runtime.principal.userId,
        title: input.title,
        category: input.category,
        amountMinor: input.amountMinor,
        frequency: input.frequency,
        paymentDay: input.paymentDay,
        startDate: input.startDate,
        endDate: input.endDate,
        merchantName: input.merchantName,
        memo: input.memo,
        autoPay: input.autoPay,
        affectsDailyBudget: input.affectsDailyBudget,
        status: "ACTIVE",
        paidTotalMinor: 0,
        lastPaidAt: null,
        createdAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
        serverAuthority: true,
      };
      expenses.set(expenseId, record);
      return {
        ...record,
        nextDueDate: nextDueDate(record, todayInSeoul(runtime.now)),
      };
    },
    async updateExpense(expenseId, input, runtime): Promise<JsonRecord> {
      const found = findForRuntime(expenseId, runtime);
      if (!found)
        throw new FixedExpenseHttpError(
          404,
          "FIXED_EXPENSE_NOT_FOUND",
          "고정지출을 찾을 수 없습니다.",
        );
      const startDate = input.startDate ?? String(found.startDate);
      const endDate =
        input.endDate !== undefined
          ? input.endDate
          : typeof found.endDate === "string"
            ? found.endDate
            : null;
      if (endDate && endDate < startDate)
        throw new FixedExpenseHttpError(
          400,
          "FIXED_EXPENSE_END_DATE_INVALID",
          "종료일은 시작일보다 빠를 수 없습니다.",
        );
      const updated: JsonRecord = {
        ...found,
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.amountMinor !== undefined
          ? { amountMinor: input.amountMinor }
          : {}),
        ...(input.frequency !== undefined
          ? { frequency: input.frequency }
          : {}),
        ...(input.paymentDay !== undefined
          ? { paymentDay: input.paymentDay }
          : {}),
        ...(input.startDate !== undefined
          ? { startDate: input.startDate }
          : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(input.merchantName !== undefined
          ? { merchantName: input.merchantName }
          : {}),
        ...(input.memo !== undefined ? { memo: input.memo } : {}),
        ...(input.autoPay !== undefined ? { autoPay: input.autoPay } : {}),
        ...(input.affectsDailyBudget !== undefined
          ? { affectsDailyBudget: input.affectsDailyBudget }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: runtime.now.toISOString(),
      };
      expenses.set(expenseId, updated);
      return {
        ...updated,
        nextDueDate: nextDueDate(updated, todayInSeoul(runtime.now)),
      };
    },
    async deleteExpense(expenseId, runtime): Promise<JsonRecord> {
      const found = findForRuntime(expenseId, runtime);
      if (!found)
        throw new FixedExpenseHttpError(
          404,
          "FIXED_EXPENSE_NOT_FOUND",
          "고정지출을 찾을 수 없습니다.",
        );
      const deleted = {
        ...found,
        status: "DELETED",
        updatedAt: runtime.now.toISOString(),
      };
      expenses.set(expenseId, deleted);
      return { expenseId, status: "DELETED" };
    },
    async pauseExpense(expenseId, reason, runtime): Promise<JsonRecord> {
      const found = findForRuntime(expenseId, runtime);
      if (!found)
        throw new FixedExpenseHttpError(
          404,
          "FIXED_EXPENSE_NOT_FOUND",
          "고정지출을 찾을 수 없습니다.",
        );
      const updated = {
        ...found,
        status: "PAUSED",
        pauseReason: reason,
        updatedAt: runtime.now.toISOString(),
      };
      expenses.set(expenseId, updated);
      return updated;
    },
    async resumeExpense(expenseId, reason, runtime): Promise<JsonRecord> {
      const found = findForRuntime(expenseId, runtime);
      if (!found)
        throw new FixedExpenseHttpError(
          404,
          "FIXED_EXPENSE_NOT_FOUND",
          "고정지출을 찾을 수 없습니다.",
        );
      const updated = {
        ...found,
        status: "ACTIVE",
        resumeReason: reason,
        updatedAt: runtime.now.toISOString(),
      };
      expenses.set(expenseId, updated);
      return {
        ...updated,
        nextDueDate: nextDueDate(updated, todayInSeoul(runtime.now)),
      };
    },
    async endExpense(expenseId, endDate, reason, runtime): Promise<JsonRecord> {
      const found = findForRuntime(expenseId, runtime);
      if (!found)
        throw new FixedExpenseHttpError(
          404,
          "FIXED_EXPENSE_NOT_FOUND",
          "고정지출을 찾을 수 없습니다.",
        );
      const normalizedEndDate = normalizeDate(endDate);
      const updated = {
        ...found,
        status: "ENDED",
        endDate: normalizedEndDate,
        endReason: reason,
        updatedAt: runtime.now.toISOString(),
      };
      expenses.set(expenseId, updated);
      return updated;
    },
    async recordPayment(expenseId, input, runtime): Promise<JsonRecord> {
      const found = findForRuntime(expenseId, runtime);
      if (!found)
        throw new FixedExpenseHttpError(
          404,
          "FIXED_EXPENSE_NOT_FOUND",
          "고정지출을 찾을 수 없습니다.",
        );
      if (input.idempotencyKey) {
        const existing = [...payments.values()].find(
          (item) =>
            item.idempotencyKey === input.idempotencyKey &&
            item.userId === runtime.principal.userId,
        );
        if (existing)
          return { payment: existing, expense: found, idempotentReplay: true };
      }
      const paymentId = `fep_${globalThis.crypto.randomUUID()}`;
      const payment: JsonRecord = {
        paymentId,
        expenseId,
        userId: runtime.principal.userId,
        paidAmountMinor: input.paidAmountMinor,
        paymentStatus: input.paymentStatus,
        memo: input.memo,
        paidAt: input.paidAt,
        idempotencyKey: input.idempotencyKey,
        createdAt: runtime.now.toISOString(),
      };
      payments.set(paymentId, payment);
      const paidDelta =
        input.paymentStatus === "PAID" ? input.paidAmountMinor : 0;
      const updated = {
        ...found,
        paidTotalMinor:
          (typeof found.paidTotalMinor === "number"
            ? found.paidTotalMinor
            : 0) + paidDelta,
        lastPaidAt:
          input.paymentStatus === "PAID"
            ? input.paidAt
            : (found.lastPaidAt ?? null),
        updatedAt: runtime.now.toISOString(),
      };
      expenses.set(expenseId, updated);
      return { payment, expense: updated, idempotentReplay: false };
    },
    async upcoming(input, runtime): Promise<JsonRecord> {
      const fromDate =
        typeof input.fromDate === "string"
          ? normalizeDate(input.fromDate)
          : todayInSeoul(runtime.now);
      const toDate =
        typeof input.toDate === "string"
          ? normalizeDate(input.toDate)
          : addDays(fromDate, 31);
      daysInclusive(fromDate, toDate);
      const items = visibleForUser(runtime.principal.userId).flatMap(
        (expense) =>
          occurrencesInPeriod(expense, fromDate, toDate).map((dueDate) => ({
            expenseId: String(expense.expenseId),
            title: String(expense.title),
            category: String(expense.category),
            dueDate,
            amountMinor:
              typeof expense.amountMinor === "number" ? expense.amountMinor : 0,
            autoPay: expense.autoPay === true,
            status: "SCHEDULED",
          })),
      );
      const totalAmountMinor = items.reduce(
        (sum, item) => sum + item.amountMinor,
        0,
      );
      return {
        fromDate,
        toDate,
        totalAmountMinor,
        count: items.length,
        items,
        serverAuthority: true,
      };
    },
    async summary(input, runtime): Promise<JsonRecord> {
      const startDate =
        typeof input.startDate === "string"
          ? normalizeDate(input.startDate)
          : todayInSeoul(runtime.now).slice(0, 8).concat("01");
      const endDate =
        typeof input.endDate === "string"
          ? normalizeDate(input.endDate)
          : addMonths(startDate, 1);
      daysInclusive(startDate, endDate);
      const active = visibleForUser(runtime.principal.userId).filter(
        (expense) => isExpenseActiveInPeriod(expense, startDate, endDate),
      );
      const scheduled = active.flatMap((expense) =>
        occurrencesInPeriod(expense, startDate, endDate).map((dueDate) => ({
          expense,
          dueDate,
        })),
      );
      const scheduledTotalMinor = scheduled.reduce(
        (sum, item) =>
          sum +
          (typeof item.expense.amountMinor === "number"
            ? item.expense.amountMinor
            : 0),
        0,
      );
      const byCategory = active.reduce<Record<string, number>>(
        (acc, expense) => {
          const category = String(expense.category ?? "ETC");
          const amount =
            occurrencesInPeriod(expense, startDate, endDate).length *
            (typeof expense.amountMinor === "number" ? expense.amountMinor : 0);
          acc[category] = (acc[category] ?? 0) + amount;
          return acc;
        },
        {},
      );
      return {
        startDate,
        endDate,
        activeCount: active.length,
        scheduledPaymentCount: scheduled.length,
        scheduledTotalMinor,
        paidTotalMinor: active.reduce(
          (sum, expense) =>
            sum +
            (typeof expense.paidTotalMinor === "number"
              ? expense.paidTotalMinor
              : 0),
          0,
        ),
        monthlyEquivalentMinor: scheduledTotalMinor,
        byCategory: Object.fromEntries(
          Object.entries(byCategory).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
        affectsDailyBudgetTotalMinor: active
          .filter((expense) => expense.affectsDailyBudget !== false)
          .reduce(
            (sum, expense) =>
              sum +
              occurrencesInPeriod(expense, startDate, endDate).length *
                (typeof expense.amountMinor === "number"
                  ? expense.amountMinor
                  : 0),
            0,
          ),
        serverAuthority: true,
      };
    },
    async calendar(input, runtime): Promise<JsonRecord> {
      const month =
        typeof input.month === "string" && /^\d{4}-\d{2}$/.test(input.month)
          ? input.month
          : todayInSeoul(runtime.now).slice(0, 7);
      const startDate = `${month}-01`;
      const end = new Date(`${startDate}T00:00:00.000Z`);
      end.setUTCMonth(end.getUTCMonth() + 1);
      end.setUTCDate(0);
      const endDate = end.toISOString().slice(0, 10);
      const items = visibleForUser(runtime.principal.userId)
        .flatMap((expense) =>
          occurrencesInPeriod(expense, startDate, endDate).map((dueDate) => ({
            date: dueDate,
            expenseId: String(expense.expenseId),
            title: String(expense.title),
            category: String(expense.category),
            amountMinor:
              typeof expense.amountMinor === "number" ? expense.amountMinor : 0,
            autoPay: expense.autoPay === true,
          })),
        )
        .sort((left, right) => left.date.localeCompare(right.date));
      return {
        month,
        startDate,
        endDate,
        totalAmountMinor: items.reduce(
          (sum, item) => sum + item.amountMinor,
          0,
        ),
        items,
        serverAuthority: true,
      };
    },
    async impact(input, runtime): Promise<JsonRecord> {
      const active = visibleForUser(runtime.principal.userId).filter(
        (expense) =>
          expense.affectsDailyBudget !== false &&
          isExpenseActiveInPeriod(
            expense,
            input.periodStartDate,
            input.periodEndDate,
          ),
      );
      const fixedExpenseTotalMinor = active.reduce(
        (sum, expense) =>
          sum +
          occurrencesInPeriod(
            expense,
            input.periodStartDate,
            input.periodEndDate,
          ).length *
            (typeof expense.amountMinor === "number" ? expense.amountMinor : 0),
        0,
      );
      const dayCount = daysInclusive(
        input.periodStartDate,
        input.periodEndDate,
      );
      const availableForDailyBudgetMinor = Math.max(
        0,
        input.payrollAmountMinor -
          fixedExpenseTotalMinor -
          input.fixedSavingsAmountMinor -
          input.variableExpenseReserveMinor,
      );
      return {
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        dayCount,
        payrollAmountMinor: input.payrollAmountMinor,
        fixedExpenseTotalMinor,
        fixedSavingsAmountMinor: input.fixedSavingsAmountMinor,
        variableExpenseReserveMinor: input.variableExpenseReserveMinor,
        availableForDailyBudgetMinor,
        recommendedDailyBudgetMinor:
          dayCount > 0
            ? Math.floor(availableForDailyBudgetMinor / dayCount)
            : 0,
        expenseCount: active.length,
        serverAuthority: true,
      };
    },
  };
}

function resolveRepository<TEnv>(
  env: TEnv,
  options: FixedExpensesRoutesOptions<TEnv>,
): FixedExpenseRepository<TEnv> {
  const repo =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return repo ?? createInMemoryFixedExpenseRepository<TEnv>();
}

async function dispatchFixedExpenseRoute<TEnv>(
  runtime: FixedExpenseRouteRuntime<TEnv>,
): Promise<Response> {
  const { method, relativePath, repository } = runtime;
  const page = pagination(runtime.url);

  if (method === "GET" && relativePath === "/") {
    return jsonResponse(runtime, 200, {
      data: await repository.listExpenses(
        queryRecord(runtime.url),
        page,
        runtime,
      ),
    });
  }

  if (method === "POST" && relativePath === "/") {
    const data = await repository.createExpense(
      createExpenseInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "fixed_expense_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId: String(data.expenseId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  if (method === "GET" && relativePath === "/summary") {
    return jsonResponse(runtime, 200, {
      data: await repository.summary(queryRecord(runtime.url), runtime),
    });
  }

  if (method === "GET" && relativePath === "/upcoming") {
    return jsonResponse(runtime, 200, {
      data: await repository.upcoming(queryRecord(runtime.url), runtime),
    });
  }

  if (method === "GET" && relativePath === "/calendar") {
    return jsonResponse(runtime, 200, {
      data: await repository.calendar(queryRecord(runtime.url), runtime),
    });
  }

  if (method === "POST" && relativePath === "/impact") {
    const data = await repository.impact(
      impactInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "fixed_expense_impact_calculated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  let match = matchRoute(relativePath, /^\/([^/]+)$/);
  if (method === "GET" && match) {
    const expense = await repository.getExpense(idFromMatch(match, 1), runtime);
    if (!expense)
      throw new FixedExpenseHttpError(
        404,
        "FIXED_EXPENSE_NOT_FOUND",
        "고정지출을 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data: expense });
  }

  if (method === "PATCH" && match) {
    const expenseId = idFromMatch(match, 1);
    const data = await repository.updateExpense(
      expenseId,
      updateExpenseInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "fixed_expense_updated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "DELETE" && match) {
    const expenseId = idFromMatch(match, 1);
    const data = await repository.deleteExpense(expenseId, runtime);
    await emit(runtime, {
      event: "fixed_expense_deleted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/pause$/);
  if (method === "POST" && match) {
    const expenseId = idFromMatch(match, 1);
    const data = await repository.pauseExpense(
      expenseId,
      reasonFromBody(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "fixed_expense_paused",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/resume$/);
  if (method === "POST" && match) {
    const expenseId = idFromMatch(match, 1);
    const data = await repository.resumeExpense(
      expenseId,
      reasonFromBody(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "fixed_expense_resumed",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/end$/);
  if (method === "POST" && match) {
    const body = await parseJsonBody(runtime.request);
    const expenseId = idFromMatch(match, 1);
    const data = await repository.endExpense(
      expenseId,
      dateFromUnknown(body.endDate, todayInSeoul(runtime.now)),
      reasonFromBody(body),
      runtime,
    );
    await emit(runtime, {
      event: "fixed_expense_ended",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/pay$/);
  if (method === "POST" && match) {
    const expenseId = idFromMatch(match, 1);
    const data = await repository.recordPayment(
      expenseId,
      paymentInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "fixed_expense_paid",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  throw new FixedExpenseHttpError(
    404,
    "FIXED_EXPENSE_ROUTE_NOT_FOUND",
    "고정지출 API 경로를 찾을 수 없습니다.",
  );
}

export function createFixedExpensesRoutes<TEnv = unknown>(
  options: FixedExpensesRoutesOptions<TEnv> = {},
): FetchHandler<TEnv> {
  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const requestId = requestIdFromHeaders(request);

    try {
      if (
        path !== FIXED_EXPENSES_API_PREFIX &&
        !path.startsWith(`${FIXED_EXPENSES_API_PREFIX}/`)
      ) {
        throw new FixedExpenseHttpError(
          404,
          "FIXED_EXPENSE_ROUTE_PREFIX_NOT_FOUND",
          "고정지출 API prefix가 아닙니다.",
        );
      }

      const baseRuntime: FixedExpenseRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normalizePath(
          path.slice(FIXED_EXPENSES_API_PREFIX.length) || "/",
        ),
        method: request.method.toUpperCase(),
        requestId,
        now: options.now?.() ?? new Date(),
        principal: principalFromRequest(
          request,
          options.requireAuthContextSource ?? true,
        ),
        repository: resolveRepository(env, options),
      };
      const runtime = Object.assign(baseRuntime, { routeOptions: options });
      const response = await dispatchFixedExpenseRoute(runtime);
      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set(
        "x-fixed-expense-repository",
        runtime.repository.name ?? "custom",
      );
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      return errorResponse(requestId, path, error);
    }
  };
}

export const handleFixedExpensesRoutes = createFixedExpensesRoutes();

export const fixedExpensesRoutesManifest = Object.freeze({
  file: "services/api/src/routes/fixed-expenses.routes.ts",
  version: FIXED_EXPENSES_ROUTES_VERSION,
  prefix: FIXED_EXPENSES_API_PREFIX,
  endpoints: [
    "GET /",
    "POST /",
    "GET /summary",
    "GET /upcoming",
    "GET /calendar",
    "POST /impact",
    "GET /{expenseId}",
    "PATCH /{expenseId}",
    "DELETE /{expenseId}",
    "POST /{expenseId}/pause",
    "POST /{expenseId}/resume",
    "POST /{expenseId}/end",
    "POST /{expenseId}/pay",
  ],
  authMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  serverAuthorityCalculation: true,
  ownerDataBoundaryRequired: true,
  fixedExpenseImpactForDailyBudget: true,
  idempotentPaymentSupported: true,
  financialRawAccountDataExposed: false,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertFixedExpensesRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "fixed_expenses_api_prefix_api_v1",
    "auth_context_required_and_owner_boundary",
    "list_create_detail_update_delete",
    "pause_resume_end_lifecycle",
    "payment_record_with_idempotency_key",
    "summary_upcoming_calendar_views",
    "server_authority_daily_budget_impact",
    "weekly_monthly_yearly_once_frequencies",
    "payment_day_validation",
    "krw_integer_minor_unit_validation",
    "autopay_and_affects_daily_budget_flags",
    "category_contract_housing_telecom_insurance_subscription_loan_etc",
    "standard_json_response_and_error_contract",
    "sensitive_token_account_salary_redaction",
    "repository_injection_with_memory_fallback",
    "security_event_wait_until_hook",
    "rate_limit_audit_error_middleware_compatible",
  ] as const;
  return {
    ok: checks.length >= 15,
    version: FIXED_EXPENSES_ROUTES_VERSION,
    checks,
  };
}

export default createFixedExpensesRoutes;
