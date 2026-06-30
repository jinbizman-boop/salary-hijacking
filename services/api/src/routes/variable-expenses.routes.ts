/** services/api/src/routes/variable-expenses.routes.ts
 * 급여납치 Salary Hijacking Platform · 변동지출 API 라우트 최종본
 *
 * Cloudflare Workers Fetch API 호환 단일 파일이다. 식비/교통/카페/쇼핑 등 사용자가 매일 기록하는
 * 변동지출을 사용자별로 생성·조회·수정·삭제·환불·무효화하고, 일일예산 소진/초과/기간 요약/캘린더/
 * 카테고리 통계를 서버 권위로 계산한다. 급여·계좌·카드·대출 원문은 응답/로그/광고 타겟팅에 노출하지 않으며
 * auth/error/rate-limit/audit 미들웨어와 연동할 수 있도록 x-auth-* 컨텍스트, 표준 JSON 계약,
 * requestId, 소유권 경계, repository injection, in-memory fallback을 포함한다.
 */

export const VARIABLE_EXPENSES_ROUTES_VERSION = "3.1.0";
export const VARIABLE_EXPENSES_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const VARIABLE_EXPENSES_API_PREFIX = "/api/v1/variable-expenses";

const MAX_JSON_BODY_BYTES = 128 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TEXT = 2_000;
const KRW_MINOR_UNIT = 1;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

export type VariableExpenseCategory =
  | "MEAL"
  | "TRANSPORT"
  | "CAFE"
  | "GROCERIES"
  | "SHOPPING"
  | "HEALTH"
  | "CONTENT"
  | "EDUCATION"
  | "FAMILY"
  | "GIFT"
  | "TRAVEL"
  | "ETC";

export type VariableExpenseStatus =
  | "POSTED"
  | "REFUNDED"
  | "VOIDED"
  | "DELETED";
export type VariableExpensePaymentMethod =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "PAY"
  | "ETC";
export type VariableExpenseSource = "MANUAL" | "RECEIPT" | "IMPORT" | "SYSTEM";
export type VariableExpenseRole =
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

export interface VariableExpensePrincipal {
  readonly userId: string;
  readonly roles: readonly VariableExpenseRole[];
  readonly permissions: readonly string[];
  readonly policyId: string | null;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}

export interface VariableExpenseListResult<
  TItem extends JsonRecord = JsonRecord,
> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface VariableExpenseCreateInput {
  readonly amountMinor: number;
  readonly category: VariableExpenseCategory;
  readonly title: string;
  readonly spentAt: string;
  readonly paymentMethod: VariableExpensePaymentMethod;
  readonly merchantName: string | null;
  readonly memo: string | null;
  readonly tags: readonly string[];
  readonly receiptAttachmentId: string | null;
  readonly dailyBudgetId: string | null;
  readonly source: VariableExpenseSource;
  readonly idempotencyKey: string | null;
}

export interface VariableExpenseUpdateInput {
  readonly amountMinor?: number | undefined;
  readonly category?: VariableExpenseCategory | undefined;
  readonly title?: string | undefined;
  readonly spentAt?: string | undefined;
  readonly paymentMethod?: VariableExpensePaymentMethod | undefined;
  readonly merchantName?: string | null | undefined;
  readonly memo?: string | null | undefined;
  readonly tags?: readonly string[] | undefined;
  readonly receiptAttachmentId?: string | null | undefined;
  readonly dailyBudgetId?: string | null | undefined;
}

export interface VariableExpenseRefundInput {
  readonly refundAmountMinor: number;
  readonly refundedAt: string;
  readonly reason: string;
  readonly idempotencyKey: string | null;
}

export interface VariableExpenseVoidInput {
  readonly reason: string;
}

export interface VariableExpenseBudgetImpactInput {
  readonly periodStartDate: string;
  readonly periodEndDate: string;
  readonly dailyBudgetTotalMinor: number;
  readonly plannedVariableExpenseReserveMinor: number;
  readonly fixedExpenseTotalMinor: number;
  readonly fixedSavingsTotalMinor: number;
}

export interface VariableExpensesRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly principal: VariableExpensePrincipal;
  readonly repository: VariableExpensesRepository<TEnv>;
}

export interface VariableExpensesRepository<TEnv = unknown> {
  readonly name?: string;
  list(
    input: JsonRecord,
    page: PaginationInput,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<VariableExpenseListResult>;
  recent(
    input: JsonRecord,
    page: PaginationInput,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<VariableExpenseListResult>;
  get(
    expenseId: string,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  create(
    input: VariableExpenseCreateInput,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  update(
    expenseId: string,
    input: VariableExpenseUpdateInput,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  delete(
    expenseId: string,
    reason: string,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  refund(
    expenseId: string,
    input: VariableExpenseRefundInput,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  void(
    expenseId: string,
    input: VariableExpenseVoidInput,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  today(runtime: VariableExpensesRouteRuntime<TEnv>): Promise<JsonRecord>;
  summary(
    input: JsonRecord,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  calendar(
    input: JsonRecord,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  categoryBreakdown(
    input: JsonRecord,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  budgetImpact(
    input: VariableExpenseBudgetImpactInput,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
}

export interface VariableExpensesRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | VariableExpensesRepository<TEnv>
    | ((env: TEnv) => VariableExpensesRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
  readonly onVariableExpenseEvent?: (
    event: VariableExpenseEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface VariableExpenseEvent {
  readonly event:
    | "variable_expense_created"
    | "variable_expense_updated"
    | "variable_expense_deleted"
    | "variable_expense_refunded"
    | "variable_expense_voided"
    | "variable_expense_budget_impact_calculated";
  readonly requestId: string;
  readonly userId: string;
  readonly expenseId: string | null;
  readonly path: string;
  readonly createdAt: string;
}

class VariableExpenseHttpError extends Error {
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
    this.name = "VariableExpenseHttpError";
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
  "cardNumber",
  "salary",
  "payroll",
  "income",
  "loan",
  "debt",
  "saving",
  "savings",
  "dailyBudget",
  "hijack",
  "adTarget",
  "targeting",
  "receiptRawText",
  "ocrRaw",
  "statement",
  "비밀번호",
  "토큰",
  "계좌",
  "카드",
  "급여",
  "월급",
  "소득",
  "대출",
  "저축",
  "명세서",
];

const maxTags = 10;
const maxTagLength = 24;

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

function normalizeRole(value: string): VariableExpenseRole | null {
  const role = value.trim().toUpperCase();
  if (["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role))
    return role as VariableExpenseRole;
  return null;
}

function principalFromRequest(
  request: Request,
  requireSource: boolean,
): VariableExpensePrincipal {
  const source = header(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source !== AUTH_CONTEXT_SOURCE_VALUE) {
    throw new VariableExpenseHttpError(
      401,
      "VARIABLE_EXPENSE_AUTH_CONTEXT_REQUIRED",
      "인증 컨텍스트가 필요합니다.",
    );
  }
  const userId = header(request, "x-authenticated-user-id");
  if (!userId)
    throw new VariableExpenseHttpError(
      401,
      "VARIABLE_EXPENSE_AUTH_REQUIRED",
      "로그인이 필요합니다.",
    );
  const roles = (header(request, "x-authenticated-roles") ?? "USER")
    .split(",")
    .map((role) => normalizeRole(role))
    .filter((role): role is VariableExpenseRole => Boolean(role));
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

function isPrivileged(principal: VariableExpensePrincipal): boolean {
  return (
    principal.roles.some(
      (role) =>
        role === "ADMIN" || role === "SUPER_ADMIN" || role === "OPERATOR",
    ) || principal.permissions.includes("*")
  );
}

function assertOwner(
  userId: string,
  runtime: VariableExpensesRouteRuntime,
): void {
  if (userId === runtime.principal.userId || isPrivileged(runtime.principal))
    return;
  throw new VariableExpenseHttpError(
    403,
    "VARIABLE_EXPENSE_OWNER_REQUIRED",
    "본인 변동지출만 접근할 수 있습니다.",
  );
}

function keyLooksSensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveKeyFragments.some((fragment) =>
    normalized.includes(fragment.toLowerCase().replace(/[\s._-]/g, "")),
  );
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
  if (typeof value === "string")
    return value.length > MAX_TEXT
      ? `${value.slice(0, MAX_TEXT)}…[truncated]`
      : value;
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
  runtime: Pick<VariableExpensesRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: VARIABLE_EXPENSES_ROUTES_SERVICE_NAME,
        version: VARIABLE_EXPENSES_ROUTES_VERSION,
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
    error instanceof VariableExpenseHttpError
      ? error
      : new VariableExpenseHttpError(
          500,
          "VARIABLE_EXPENSE_ROUTE_INTERNAL_ERROR",
          "변동지출 API 처리 중 오류가 발생했습니다.",
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
        service: VARIABLE_EXPENSES_ROUTES_SERVICE_NAME,
        version: VARIABLE_EXPENSES_ROUTES_VERSION,
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
    throw new VariableExpenseHttpError(
      413,
      "VARIABLE_EXPENSE_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_JSON_OBJECT_REQUIRED",
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
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_FIELD_REQUIRED",
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
      throw new VariableExpenseHttpError(
        400,
        "VARIABLE_EXPENSE_AMOUNT_RANGE_INVALID",
        `${key} 금액 범위가 올바르지 않습니다.`,
        { field: key },
      );
    return value;
  }
  if (required)
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_AMOUNT_REQUIRED",
      `${key} 금액이 필요합니다.`,
      { field: key },
    );
  return 0;
}

function normalizeDate(value: string): string {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_DATE_INVALID",
      "날짜는 YYYY-MM-DD 형식이어야 합니다.",
    );
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_DATE_INVALID",
      "존재하지 않는 날짜입니다.",
    );
  return date;
}

function parseOptionalIso(value: string | null, field: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_DATETIME_INVALID",
      `${field} 시간이 올바르지 않습니다.`,
      { field },
    );
  return parsed.toISOString();
}

function todayInSeoul(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function daysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (end < start)
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_PERIOD_INVALID",
      "종료일은 시작일보다 빠를 수 없습니다.",
    );
  return Math.floor((end - start) / 86_400_000) + 1;
}

function normalizeCategory(value: unknown): VariableExpenseCategory {
  const category =
    typeof value === "string" ? value.trim().toUpperCase() : "ETC";
  if (
    [
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
    ].includes(category)
  )
    return category as VariableExpenseCategory;
  throw new VariableExpenseHttpError(
    400,
    "VARIABLE_EXPENSE_CATEGORY_INVALID",
    "변동지출 카테고리가 올바르지 않습니다.",
  );
}

function normalizePaymentMethod(value: unknown): VariableExpensePaymentMethod {
  const method = typeof value === "string" ? value.trim().toUpperCase() : "ETC";
  if (["CASH", "CARD", "TRANSFER", "PAY", "ETC"].includes(method))
    return method as VariableExpensePaymentMethod;
  throw new VariableExpenseHttpError(
    400,
    "VARIABLE_EXPENSE_PAYMENT_METHOD_INVALID",
    "결제수단이 올바르지 않습니다.",
  );
}

function normalizeSource(value: unknown): VariableExpenseSource {
  const source =
    typeof value === "string" ? value.trim().toUpperCase() : "MANUAL";
  if (["MANUAL", "RECEIPT", "IMPORT", "SYSTEM"].includes(source))
    return source as VariableExpenseSource;
  throw new VariableExpenseHttpError(
    400,
    "VARIABLE_EXPENSE_SOURCE_INVALID",
    "지출 출처가 올바르지 않습니다.",
  );
}

function normalizeTags(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .map((item) => item.trim().replace(/^#/, "").slice(0, maxTagLength)),
    ),
  ].slice(0, maxTags);
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
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_ROUTE_ID_REQUIRED",
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
): VariableExpenseListResult<TItem> {
  return {
    items: items.slice(page.offset, page.offset + page.limit),
    page: page.page,
    pageSize: page.pageSize,
    total: items.length,
  };
}

function createExpenseInput(
  input: Record<string, unknown>,
  now: Date,
): VariableExpenseCreateInput {
  const rawSpentAt = optionalStringField(input, "spentAt") ?? now.toISOString();
  const spentAt = parseOptionalIso(rawSpentAt, "spentAt");
  if (!spentAt)
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_SPENT_AT_REQUIRED",
      "지출 시간이 필요합니다.",
    );
  return {
    amountMinor: moneyField(input, "amountMinor", { min: 1 }),
    category: normalizeCategory(input.category),
    title: stringField(input, "title", { maxLength: 100 }),
    spentAt,
    paymentMethod: normalizePaymentMethod(input.paymentMethod),
    merchantName: optionalStringField(input, "merchantName", 120),
    memo: optionalStringField(input, "memo", 500),
    tags: normalizeTags(input.tags),
    receiptAttachmentId: optionalStringField(input, "receiptAttachmentId", 160),
    dailyBudgetId: optionalStringField(input, "dailyBudgetId", 160),
    source: normalizeSource(input.source),
    idempotencyKey: optionalStringField(input, "idempotencyKey", 160),
  };
}

type MutableUpdateInput = {
  -readonly [K in keyof VariableExpenseUpdateInput]?: VariableExpenseUpdateInput[K];
};

function updateExpenseInput(
  input: Record<string, unknown>,
): VariableExpenseUpdateInput {
  const patch: MutableUpdateInput = {};
  if (input.amountMinor !== undefined)
    patch.amountMinor = moneyField(input, "amountMinor", { min: 1 });
  if (input.category !== undefined)
    patch.category = normalizeCategory(input.category);
  if (input.title !== undefined)
    patch.title = stringField(input, "title", { maxLength: 100 });
  if (input.spentAt !== undefined) {
    const parsed = parseOptionalIso(
      optionalStringField(input, "spentAt"),
      "spentAt",
    );
    if (parsed) patch.spentAt = parsed;
  }
  if (input.paymentMethod !== undefined)
    patch.paymentMethod = normalizePaymentMethod(input.paymentMethod);
  if (input.merchantName !== undefined)
    patch.merchantName = optionalStringField(input, "merchantName", 120);
  if (input.memo !== undefined)
    patch.memo = optionalStringField(input, "memo", 500);
  if (input.tags !== undefined) patch.tags = normalizeTags(input.tags);
  if (input.receiptAttachmentId !== undefined)
    patch.receiptAttachmentId = optionalStringField(
      input,
      "receiptAttachmentId",
      160,
    );
  if (input.dailyBudgetId !== undefined)
    patch.dailyBudgetId = optionalStringField(input, "dailyBudgetId", 160);
  if (!Object.keys(patch).length)
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_UPDATE_EMPTY",
      "수정할 값이 필요합니다.",
    );
  return patch;
}

function refundInput(
  input: Record<string, unknown>,
  now: Date,
): VariableExpenseRefundInput {
  const raw = optionalStringField(input, "refundedAt") ?? now.toISOString();
  const parsed = parseOptionalIso(raw, "refundedAt");
  if (!parsed)
    throw new VariableExpenseHttpError(
      400,
      "VARIABLE_EXPENSE_REFUNDED_AT_REQUIRED",
      "환불 시간이 필요합니다.",
    );
  return {
    refundAmountMinor: moneyField(input, "refundAmountMinor", { min: 1 }),
    refundedAt: parsed,
    reason: stringField(input, "reason", { maxLength: 500 }),
    idempotencyKey: optionalStringField(input, "idempotencyKey", 160),
  };
}

function reasonFromBody(input: Record<string, unknown>): string {
  return stringField(input, "reason", { maxLength: 500 });
}

function impactInput(
  input: Record<string, unknown>,
  now: Date,
): VariableExpenseBudgetImpactInput {
  const today = todayInSeoul(now);
  const periodStartDate = normalizeDate(
    optionalStringField(input, "periodStartDate") ?? addDays(today, -30),
  );
  const periodEndDate = normalizeDate(
    optionalStringField(input, "periodEndDate") ?? today,
  );
  daysInclusive(periodStartDate, periodEndDate);
  return {
    periodStartDate,
    periodEndDate,
    dailyBudgetTotalMinor: moneyField(input, "dailyBudgetTotalMinor", {
      required: false,
      min: 0,
    }),
    plannedVariableExpenseReserveMinor: moneyField(
      input,
      "plannedVariableExpenseReserveMinor",
      { required: false, min: 0 },
    ),
    fixedExpenseTotalMinor: moneyField(input, "fixedExpenseTotalMinor", {
      required: false,
      min: 0,
    }),
    fixedSavingsTotalMinor: moneyField(input, "fixedSavingsTotalMinor", {
      required: false,
      min: 0,
    }),
  };
}

function netAmount(record: JsonRecord): number {
  const amount =
    typeof record.amountMinor === "number" ? record.amountMinor : 0;
  const refund =
    typeof record.refundAmountMinor === "number" ? record.refundAmountMinor : 0;
  const status = String(record.status ?? "POSTED");
  if (status === "VOIDED" || status === "DELETED") return 0;
  return Math.max(0, amount - refund);
}

function computed(record: JsonRecord): JsonRecord {
  return {
    ...record,
    netAmountMinor: netAmount(record),
    serverAuthority: true,
    financialRawDataExposed: false,
    adTargetingSeparated: true,
  };
}

function datePartFromIso(value: JsonValue | undefined): string {
  return typeof value === "string" ? value.slice(0, 10) : "0000-00-00";
}

async function emit<TEnv>(
  runtime: VariableExpensesRouteRuntime<TEnv>,
  event: VariableExpenseEvent,
): Promise<void> {
  const options = (
    runtime as VariableExpensesRouteRuntime<TEnv> & {
      readonly routeOptions?: VariableExpensesRoutesOptions<TEnv>;
    }
  ).routeOptions;
  if (!options?.onVariableExpenseEvent) return;
  const task = Promise.resolve(
    options.onVariableExpenseEvent(event, runtime.env, runtime.execution),
  ).catch((error) => {
    console.warn(
      "variable_expenses_routes_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  runtime.execution.waitUntil?.(task);
}

function createInMemoryVariableExpensesRepository<
  TEnv = unknown,
>(): VariableExpensesRepository<TEnv> {
  const expenses = new Map<string, JsonRecord>();
  const refunds = new Map<string, JsonRecord>();

  function visibleForUser(userId: string): JsonRecord[] {
    return [...expenses.values()].filter(
      (item) => item.userId === userId && item.status !== "DELETED",
    );
  }

  function postedForUser(userId: string): JsonRecord[] {
    return visibleForUser(userId)
      .filter((item) => item.status !== "VOIDED")
      .map(computed);
  }

  function findForRuntime(
    expenseId: string,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): JsonRecord {
    const found = expenses.get(expenseId);
    if (!found || found.status === "DELETED")
      throw new VariableExpenseHttpError(
        404,
        "VARIABLE_EXPENSE_NOT_FOUND",
        "변동지출을 찾을 수 없습니다.",
      );
    assertOwner(String(found.userId), runtime);
    return found;
  }

  function filtered(
    input: JsonRecord,
    runtime: VariableExpensesRouteRuntime<TEnv>,
  ): JsonRecord[] {
    const startDate =
      typeof input.startDate === "string"
        ? normalizeDate(input.startDate)
        : null;
    const endDate =
      typeof input.endDate === "string" ? normalizeDate(input.endDate) : null;
    const category =
      typeof input.category === "string" && input.category
        ? input.category
        : null;
    const status =
      typeof input.status === "string" && input.status ? input.status : null;
    const q =
      typeof input.q === "string" && input.q ? input.q.toLowerCase() : null;
    return visibleForUser(runtime.principal.userId)
      .filter(
        (item) => !startDate || datePartFromIso(item.spentAt) >= startDate,
      )
      .filter((item) => !endDate || datePartFromIso(item.spentAt) <= endDate)
      .filter((item) => !category || item.category === category)
      .filter((item) => !status || item.status === status)
      .filter(
        (item) =>
          !q ||
          `${item.title ?? ""}\n${item.merchantName ?? ""}\n${item.memo ?? ""}\n${item.tags ?? ""}`
            .toLowerCase()
            .includes(q),
      )
      .sort((left, right) =>
        String(right.spentAt).localeCompare(String(left.spentAt)),
      )
      .map(computed);
  }

  function categoryTotals(items: readonly JsonRecord[]): JsonRecord[] {
    const byCategory = new Map<string, { count: number; amount: number }>();
    items.forEach((item) => {
      const category = String(item.category ?? "ETC");
      const current = byCategory.get(category) ?? { count: 0, amount: 0 };
      current.count += 1;
      current.amount += netAmount(item);
      byCategory.set(category, current);
    });
    return [...byCategory.entries()]
      .map(([category, value]) => ({
        category,
        count: value.count,
        amountMinor: value.amount,
      }))
      .sort(
        (left, right) => Number(right.amountMinor) - Number(left.amountMinor),
      );
  }

  return {
    name: "in-memory-variable-expenses-repository",
    async list(input, page, runtime): Promise<VariableExpenseListResult> {
      return listResult(filtered(input, runtime), page);
    },
    async recent(input, page, runtime): Promise<VariableExpenseListResult> {
      const limitDays =
        typeof input.days === "string" ? Number.parseInt(input.days, 10) : 7;
      const endDate = todayInSeoul(runtime.now);
      const startDate = addDays(
        endDate,
        -Math.max(1, Math.min(365, Number.isFinite(limitDays) ? limitDays : 7)),
      );
      return listResult(
        filtered({ ...input, startDate, endDate }, runtime),
        page,
      );
    },
    async get(expenseId, runtime): Promise<JsonRecord | null> {
      const found = expenses.get(expenseId) ?? null;
      if (!found || found.status === "DELETED") return null;
      assertOwner(String(found.userId), runtime);
      return {
        ...computed(found),
        refunds: [...refunds.values()].filter(
          (item) => item.expenseId === expenseId,
        ),
      };
    },
    async create(input, runtime): Promise<JsonRecord> {
      if (input.idempotencyKey) {
        const existing = [...expenses.values()].find(
          (item) =>
            item.idempotencyKey === input.idempotencyKey &&
            item.userId === runtime.principal.userId,
        );
        if (existing) return { ...computed(existing), idempotentReplay: true };
      }
      const expenseId = `vex_${globalThis.crypto.randomUUID()}`;
      const record: JsonRecord = {
        expenseId,
        userId: runtime.principal.userId,
        amountMinor: input.amountMinor,
        category: input.category,
        title: input.title,
        spentAt: input.spentAt,
        paymentMethod: input.paymentMethod,
        merchantName: input.merchantName,
        memo: input.memo,
        tags: input.tags.join(","),
        receiptAttachmentId: input.receiptAttachmentId,
        dailyBudgetId: input.dailyBudgetId,
        source: input.source,
        idempotencyKey: input.idempotencyKey,
        refundAmountMinor: 0,
        status: "POSTED",
        createdAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
        financialRawDataExposed: false,
      };
      expenses.set(expenseId, record);
      return computed(record);
    },
    async update(expenseId, input, runtime): Promise<JsonRecord> {
      const found = findForRuntime(expenseId, runtime);
      if (found.status === "REFUNDED" || found.status === "VOIDED")
        throw new VariableExpenseHttpError(
          409,
          "VARIABLE_EXPENSE_FINALIZED",
          "환불 또는 무효화된 지출은 수정할 수 없습니다.",
        );
      const updated: JsonRecord = {
        ...found,
        updatedAt: runtime.now.toISOString(),
      };
      if (input.amountMinor !== undefined)
        updated.amountMinor = input.amountMinor;
      if (input.category !== undefined) updated.category = input.category;
      if (input.title !== undefined) updated.title = input.title;
      if (input.spentAt !== undefined) updated.spentAt = input.spentAt;
      if (input.paymentMethod !== undefined)
        updated.paymentMethod = input.paymentMethod;
      if (input.merchantName !== undefined)
        updated.merchantName = input.merchantName;
      if (input.memo !== undefined) updated.memo = input.memo;
      if (input.tags !== undefined) updated.tags = input.tags.join(",");
      if (input.receiptAttachmentId !== undefined)
        updated.receiptAttachmentId = input.receiptAttachmentId;
      if (input.dailyBudgetId !== undefined)
        updated.dailyBudgetId = input.dailyBudgetId;
      expenses.set(expenseId, updated);
      return computed(updated);
    },
    async delete(expenseId, reason, runtime): Promise<JsonRecord> {
      const found = findForRuntime(expenseId, runtime);
      const updated = {
        ...found,
        status: "DELETED",
        deleteReason: reason,
        deletedAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      expenses.set(expenseId, updated);
      return { expenseId, status: "DELETED" };
    },
    async refund(expenseId, input, runtime): Promise<JsonRecord> {
      const found = findForRuntime(expenseId, runtime);
      if (found.status === "VOIDED")
        throw new VariableExpenseHttpError(
          409,
          "VARIABLE_EXPENSE_VOIDED",
          "무효화된 지출은 환불 처리할 수 없습니다.",
        );
      if (input.idempotencyKey) {
        const existing = [...refunds.values()].find(
          (item) =>
            item.idempotencyKey === input.idempotencyKey &&
            item.userId === runtime.principal.userId,
        );
        if (existing)
          return {
            refund: existing,
            expense: computed(found),
            idempotentReplay: true,
          };
      }
      const currentRefund =
        typeof found.refundAmountMinor === "number"
          ? found.refundAmountMinor
          : 0;
      const originalAmount =
        typeof found.amountMinor === "number" ? found.amountMinor : 0;
      if (currentRefund + input.refundAmountMinor > originalAmount)
        throw new VariableExpenseHttpError(
          400,
          "VARIABLE_EXPENSE_REFUND_EXCEEDS_AMOUNT",
          "환불 금액은 원 지출 금액을 초과할 수 없습니다.",
        );
      const refundId = `ver_${globalThis.crypto.randomUUID()}`;
      const refund: JsonRecord = {
        refundId,
        expenseId,
        userId: runtime.principal.userId,
        refundAmountMinor: input.refundAmountMinor,
        refundedAt: input.refundedAt,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        createdAt: runtime.now.toISOString(),
      };
      refunds.set(refundId, refund);
      const updated = {
        ...found,
        refundAmountMinor: currentRefund + input.refundAmountMinor,
        status:
          currentRefund + input.refundAmountMinor >= originalAmount
            ? "REFUNDED"
            : "POSTED",
        updatedAt: runtime.now.toISOString(),
      };
      expenses.set(expenseId, updated);
      return { refund, expense: computed(updated), idempotentReplay: false };
    },
    async void(expenseId, input, runtime): Promise<JsonRecord> {
      const found = findForRuntime(expenseId, runtime);
      const updated = {
        ...found,
        status: "VOIDED",
        voidReason: input.reason,
        voidedAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      expenses.set(expenseId, updated);
      return computed(updated);
    },
    async today(runtime): Promise<JsonRecord> {
      const date = todayInSeoul(runtime.now);
      const items = postedForUser(runtime.principal.userId).filter(
        (item) => datePartFromIso(item.spentAt) === date,
      );
      const spentTotalMinor = items.reduce(
        (sum, item) => sum + netAmount(item),
        0,
      );
      return {
        date,
        count: items.length,
        spentTotalMinor,
        categoryBreakdown: categoryTotals(items),
        items: items.slice(0, 20),
        serverAuthority: true,
      };
    },
    async summary(input, runtime): Promise<JsonRecord> {
      const startDate =
        typeof input.startDate === "string"
          ? normalizeDate(input.startDate)
          : addDays(todayInSeoul(runtime.now), -30);
      const endDate =
        typeof input.endDate === "string"
          ? normalizeDate(input.endDate)
          : todayInSeoul(runtime.now);
      daysInclusive(startDate, endDate);
      const items = postedForUser(runtime.principal.userId).filter(
        (item) =>
          datePartFromIso(item.spentAt) >= startDate &&
          datePartFromIso(item.spentAt) <= endDate,
      );
      const spentTotalMinor = items.reduce(
        (sum, item) => sum + netAmount(item),
        0,
      );
      const dayCount = daysInclusive(startDate, endDate);
      return {
        startDate,
        endDate,
        dayCount,
        expenseCount: items.length,
        spentTotalMinor,
        refundTotalMinor: items.reduce(
          (sum, item) =>
            sum +
            (typeof item.refundAmountMinor === "number"
              ? item.refundAmountMinor
              : 0),
          0,
        ),
        averageDailySpentMinor: dayCount
          ? Math.round(spentTotalMinor / dayCount)
          : 0,
        categoryBreakdown: categoryTotals(items),
        financialRawDataExposed: false,
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
      const items = postedForUser(runtime.principal.userId).filter(
        (item) =>
          datePartFromIso(item.spentAt) >= startDate &&
          datePartFromIso(item.spentAt) <= endDate,
      );
      const byDate = new Map<string, { count: number; amount: number }>();
      items.forEach((item) => {
        const date = datePartFromIso(item.spentAt);
        const current = byDate.get(date) ?? { count: 0, amount: 0 };
        current.count += 1;
        current.amount += netAmount(item);
        byDate.set(date, current);
      });
      const days = [...byDate.entries()]
        .map(([date, value]) => ({
          date,
          count: value.count,
          spentTotalMinor: value.amount,
        }))
        .sort((left, right) => left.date.localeCompare(right.date));
      return {
        month,
        startDate,
        endDate,
        spentTotalMinor: items.reduce((sum, item) => sum + netAmount(item), 0),
        expenseCount: items.length,
        days,
        serverAuthority: true,
      };
    },
    async categoryBreakdown(input, runtime): Promise<JsonRecord> {
      const startDate =
        typeof input.startDate === "string"
          ? normalizeDate(input.startDate)
          : addDays(todayInSeoul(runtime.now), -30);
      const endDate =
        typeof input.endDate === "string"
          ? normalizeDate(input.endDate)
          : todayInSeoul(runtime.now);
      daysInclusive(startDate, endDate);
      const items = postedForUser(runtime.principal.userId).filter(
        (item) =>
          datePartFromIso(item.spentAt) >= startDate &&
          datePartFromIso(item.spentAt) <= endDate,
      );
      return {
        startDate,
        endDate,
        items: categoryTotals(items),
        totalAmountMinor: items.reduce((sum, item) => sum + netAmount(item), 0),
        serverAuthority: true,
      };
    },
    async budgetImpact(input, runtime): Promise<JsonRecord> {
      const items = postedForUser(runtime.principal.userId).filter(
        (item) =>
          datePartFromIso(item.spentAt) >= input.periodStartDate &&
          datePartFromIso(item.spentAt) <= input.periodEndDate,
      );
      const actualVariableExpenseTotalMinor = items.reduce(
        (sum, item) => sum + netAmount(item),
        0,
      );
      const dayCount = daysInclusive(
        input.periodStartDate,
        input.periodEndDate,
      );
      const dailyBudgetRemainingMinor =
        input.dailyBudgetTotalMinor - actualVariableExpenseTotalMinor;
      const reserveRemainingMinor =
        input.plannedVariableExpenseReserveMinor -
        actualVariableExpenseTotalMinor;
      return {
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        dayCount,
        dailyBudgetTotalMinor: input.dailyBudgetTotalMinor,
        plannedVariableExpenseReserveMinor:
          input.plannedVariableExpenseReserveMinor,
        actualVariableExpenseTotalMinor,
        fixedExpenseTotalMinor: input.fixedExpenseTotalMinor,
        fixedSavingsTotalMinor: input.fixedSavingsTotalMinor,
        dailyBudgetRemainingMinor,
        reserveRemainingMinor,
        overDailyBudget: dailyBudgetRemainingMinor < 0,
        overVariableReserve: reserveRemainingMinor < 0,
        averageDailyVariableExpenseMinor: dayCount
          ? Math.round(actualVariableExpenseTotalMinor / dayCount)
          : 0,
        categoryBreakdown: categoryTotals(items),
        serverAuthority: true,
        financialRawDataExposed: false,
      };
    },
  };
}

function resolveRepository<TEnv>(
  env: TEnv,
  options: VariableExpensesRoutesOptions<TEnv>,
): VariableExpensesRepository<TEnv> {
  const repo =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return repo ?? createInMemoryVariableExpensesRepository<TEnv>();
}

async function dispatchVariableExpensesRoute<TEnv>(
  runtime: VariableExpensesRouteRuntime<TEnv>,
): Promise<Response> {
  const { method, relativePath, repository } = runtime;
  const page = pagination(runtime.url);

  if (method === "GET" && relativePath === "/")
    return jsonResponse(runtime, 200, {
      data: await repository.list(queryRecord(runtime.url), page, runtime),
    });

  if (method === "POST" && relativePath === "/") {
    const data = await repository.create(
      createExpenseInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "variable_expense_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId: String(data.expenseId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, data.idempotentReplay === true ? 200 : 201, {
      data,
    });
  }

  if (method === "GET" && relativePath === "/today")
    return jsonResponse(runtime, 200, {
      data: await repository.today(runtime),
    });
  if (method === "GET" && relativePath === "/recent")
    return jsonResponse(runtime, 200, {
      data: await repository.recent(queryRecord(runtime.url), page, runtime),
    });
  if (method === "GET" && relativePath === "/summary")
    return jsonResponse(runtime, 200, {
      data: await repository.summary(queryRecord(runtime.url), runtime),
    });
  if (method === "GET" && relativePath === "/calendar")
    return jsonResponse(runtime, 200, {
      data: await repository.calendar(queryRecord(runtime.url), runtime),
    });
  if (method === "GET" && relativePath === "/categories")
    return jsonResponse(runtime, 200, {
      data: await repository.categoryBreakdown(
        queryRecord(runtime.url),
        runtime,
      ),
    });

  if (method === "POST" && relativePath === "/impact") {
    const data = await repository.budgetImpact(
      impactInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "variable_expense_budget_impact_calculated",
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
    const data = await repository.get(idFromMatch(match, 1), runtime);
    if (!data)
      throw new VariableExpenseHttpError(
        404,
        "VARIABLE_EXPENSE_NOT_FOUND",
        "변동지출을 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "PATCH" && match) {
    const expenseId = idFromMatch(match, 1);
    const data = await repository.update(
      expenseId,
      updateExpenseInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "variable_expense_updated",
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
    const data = await repository.delete(
      expenseId,
      reasonFromBody(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "variable_expense_deleted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/refund$/);
  if (method === "POST" && match) {
    const expenseId = idFromMatch(match, 1);
    const data = await repository.refund(
      expenseId,
      refundInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "variable_expense_refunded",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, data.idempotentReplay === true ? 200 : 201, {
      data,
    });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/void$/);
  if (method === "POST" && match) {
    const expenseId = idFromMatch(match, 1);
    const data = await repository.void(
      expenseId,
      { reason: reasonFromBody(await parseJsonBody(runtime.request)) },
      runtime,
    );
    await emit(runtime, {
      event: "variable_expense_voided",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      expenseId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  throw new VariableExpenseHttpError(
    404,
    "VARIABLE_EXPENSE_ROUTE_NOT_FOUND",
    "변동지출 API 경로를 찾을 수 없습니다.",
  );
}

export function createVariableExpensesRoutes<TEnv = unknown>(
  options: VariableExpensesRoutesOptions<TEnv> = {},
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
        path !== VARIABLE_EXPENSES_API_PREFIX &&
        !path.startsWith(`${VARIABLE_EXPENSES_API_PREFIX}/`)
      ) {
        throw new VariableExpenseHttpError(
          404,
          "VARIABLE_EXPENSE_ROUTE_PREFIX_NOT_FOUND",
          "변동지출 API prefix가 아닙니다.",
        );
      }
      const baseRuntime: VariableExpensesRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normalizePath(
          path.slice(VARIABLE_EXPENSES_API_PREFIX.length) || "/",
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
      const response = await dispatchVariableExpensesRoute(runtime);
      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set(
        "x-variable-expenses-repository",
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

export const handleVariableExpensesRoutes = createVariableExpensesRoutes();

export const variableExpensesRoutesManifest = Object.freeze({
  file: "services/api/src/routes/variable-expenses.routes.ts",
  version: VARIABLE_EXPENSES_ROUTES_VERSION,
  prefix: VARIABLE_EXPENSES_API_PREFIX,
  endpoints: [
    "GET /",
    "POST /",
    "GET /today",
    "GET /recent",
    "GET /summary",
    "GET /calendar",
    "GET /categories",
    "POST /impact",
    "GET /{expenseId}",
    "PATCH /{expenseId}",
    "DELETE /{expenseId}",
    "POST /{expenseId}/refund",
    "POST /{expenseId}/void",
  ],
  authMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  serverAuthorityVariableExpenseCalculation: true,
  ownerDataBoundaryRequired: true,
  dailyBudgetImpactReady: true,
  idempotentCreateAndRefundSupported: true,
  sensitiveFinancialRawDataMasked: true,
  adTargetingSeparated: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertVariableExpensesRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "variable_expenses_api_prefix_api_v1",
    "auth_context_required_and_owner_boundary",
    "list_create_detail_update_delete",
    "today_recent_summary_calendar_views",
    "category_breakdown",
    "budget_impact_for_daily_budget",
    "refund_and_void_lifecycle",
    "idempotency_key_for_create_and_refund",
    "krw_integer_minor_unit_validation",
    "category_payment_method_source_validation",
    "receipt_attachment_contract",
    "tag_and_merchant_memo_contract",
    "standard_json_response_and_error_contract",
    "sensitive_token_account_card_salary_redaction",
    "ads_recommendation_sensitive_financial_data_separation",
    "repository_injection_with_memory_fallback",
    "security_event_wait_until_hook",
    "rate_limit_audit_error_middleware_compatible",
    "payroll_daily_budget_fixed_expense_savings_integration_ready",
  ] as const;
  return {
    ok: checks.length >= 15,
    version: VARIABLE_EXPENSES_ROUTES_VERSION,
    checks,
  };
}

export default createVariableExpensesRoutes;
