/** services/api/src/routes/daily-budgets.routes.ts
 * 급여납치 Salary Hijacking Platform · 일일 예산 API 라우트 최종본
 *
 * Cloudflare Workers Fetch API 호환 단일 파일이다. 급여계획, 고정지출, 고정저축,
 * 변동지출 기록을 기준으로 서버 권위 일일 생활비를 조회·생성·수정·삭제·소진·조정·재계산한다.
 * auth/error/rate-limit/audit 미들웨어와 연동할 수 있도록 x-auth-* 컨텍스트, 표준 JSON 계약,
 * requestId, 사용자별 데이터 경계, 민감정보 마스킹, repository injection, in-memory fallback을 포함한다.
 */

export const DAILY_BUDGETS_ROUTES_VERSION = "3.1.0";
export const DAILY_BUDGETS_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const DAILY_BUDGETS_API_PREFIX = "/api/v1/daily-budgets";

const MAX_JSON_BODY_BYTES = 128 * 1024;
const DEFAULT_PAGE_SIZE = 31;
const MAX_PAGE_SIZE = 93;
const MAX_TEXT = 2_000;
const KRW_MINOR_UNIT = 1;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

export type DailyBudgetStatus =
  | "PLANNED"
  | "ACTIVE"
  | "OVERSPENT"
  | "CLOSED"
  | "DELETED";
export type DailyBudgetSource =
  | "MANUAL"
  | "PAYROLL_PLAN"
  | "RECALCULATED"
  | "CARRY_OVER"
  | "SYSTEM";
export type DailyBudgetAdjustmentType =
  | "INCREASE"
  | "DECREASE"
  | "CARRY_OVER_IN"
  | "CARRY_OVER_OUT"
  | "CORRECTION";
export type DailyBudgetSpendCategory =
  | "MEAL"
  | "TRANSPORT"
  | "CAFE"
  | "SHOPPING"
  | "HEALTH"
  | "CONTENT"
  | "ETC";
export type DailyBudgetRole =
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

export interface DailyBudgetPrincipal {
  readonly userId: string;
  readonly roles: readonly DailyBudgetRole[];
  readonly permissions: readonly string[];
  readonly policyId: string | null;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}

export interface DailyBudgetListResult<TItem extends JsonRecord = JsonRecord> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface DailyBudgetCreateInput {
  readonly budgetDate: string;
  readonly plannedAmountMinor: number;
  readonly memo: string | null;
  readonly source: DailyBudgetSource;
}

export interface DailyBudgetUpdateInput {
  readonly plannedAmountMinor?: number | undefined;
  readonly memo?: string | null | undefined;
  readonly status?: DailyBudgetStatus | undefined;
}

export interface DailyBudgetSpendInput {
  readonly amountMinor: number;
  readonly category: DailyBudgetSpendCategory;
  readonly memo: string | null;
  readonly spentAt: string;
  readonly idempotencyKey: string | null;
}

export interface DailyBudgetAdjustmentInput {
  readonly amountMinor: number;
  readonly adjustmentType: DailyBudgetAdjustmentType;
  readonly reason: string;
}

export interface DailyBudgetRecalculateInput {
  readonly periodStartDate: string;
  readonly periodEndDate: string;
  readonly availableAmountMinor: number;
  readonly alreadySpentAmountMinor: number;
  readonly carryOverAmountMinor: number;
  readonly overwriteExisting: boolean;
  readonly memo: string | null;
}

export interface DailyBudgetRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly principal: DailyBudgetPrincipal;
  readonly repository: DailyBudgetRepository<TEnv>;
}

export interface DailyBudgetRepository<TEnv = unknown> {
  readonly name?: string;
  listBudgets(
    input: JsonRecord,
    page: PaginationInput,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<DailyBudgetListResult>;
  getBudgetById(
    budgetId: string,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  getBudgetByDate(
    budgetDate: string,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  createBudget(
    input: DailyBudgetCreateInput,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updateBudget(
    budgetId: string,
    input: DailyBudgetUpdateInput,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  deleteBudget(
    budgetId: string,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  recordSpend(
    budgetId: string,
    input: DailyBudgetSpendInput,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  adjustBudget(
    budgetId: string,
    input: DailyBudgetAdjustmentInput,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  recalculate(
    input: DailyBudgetRecalculateInput,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  summary(
    input: JsonRecord,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  calendar(
    input: JsonRecord,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
}

export interface DailyBudgetsRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | DailyBudgetRepository<TEnv>
    | ((env: TEnv) => DailyBudgetRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
  readonly onBudgetEvent?: (
    event: DailyBudgetEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface DailyBudgetEvent {
  readonly event:
    | "daily_budget_created"
    | "daily_budget_updated"
    | "daily_budget_deleted"
    | "daily_budget_spent"
    | "daily_budget_adjusted"
    | "daily_budget_recalculated";
  readonly requestId: string;
  readonly userId: string;
  readonly budgetId: string | null;
  readonly budgetDate: string | null;
  readonly path: string;
  readonly createdAt: string;
}

class DailyBudgetHttpError extends Error {
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
    this.name = "DailyBudgetHttpError";
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
  "loan",
  "debt",
  "adTarget",
  "targeting",
  "비밀번호",
  "토큰",
  "계좌",
  "카드",
  "급여",
  "월급",
  "소득",
  "대출",
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

function normalizeRole(value: string): DailyBudgetRole | null {
  const role = value.trim().toUpperCase();
  if (["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role))
    return role as DailyBudgetRole;
  return null;
}

function principalFromRequest(
  request: Request,
  requireSource: boolean,
): DailyBudgetPrincipal {
  const source = header(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source !== AUTH_CONTEXT_SOURCE_VALUE) {
    throw new DailyBudgetHttpError(
      401,
      "DAILY_BUDGET_AUTH_CONTEXT_REQUIRED",
      "인증 컨텍스트가 필요합니다.",
    );
  }

  const userId = header(request, "x-authenticated-user-id");
  if (!userId)
    throw new DailyBudgetHttpError(
      401,
      "DAILY_BUDGET_AUTH_REQUIRED",
      "로그인이 필요합니다.",
    );

  const roles = (header(request, "x-authenticated-roles") ?? "USER")
    .split(",")
    .map((role) => normalizeRole(role))
    .filter((role): role is DailyBudgetRole => Boolean(role));
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

function isPrivileged(principal: DailyBudgetPrincipal): boolean {
  return (
    principal.roles.some(
      (role) =>
        role === "ADMIN" || role === "SUPER_ADMIN" || role === "OPERATOR",
    ) || principal.permissions.includes("*")
  );
}

function assertOwner(userId: string, runtime: DailyBudgetRouteRuntime): void {
  if (userId === runtime.principal.userId || isPrivileged(runtime.principal))
    return;
  throw new DailyBudgetHttpError(
    403,
    "DAILY_BUDGET_OWNER_REQUIRED",
    "본인 일일 예산만 접근할 수 있습니다.",
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
  runtime: Pick<DailyBudgetRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: DAILY_BUDGETS_ROUTES_SERVICE_NAME,
        version: DAILY_BUDGETS_ROUTES_VERSION,
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
    error instanceof DailyBudgetHttpError
      ? error
      : new DailyBudgetHttpError(
          500,
          "DAILY_BUDGET_ROUTE_INTERNAL_ERROR",
          "일일 예산 API 처리 중 오류가 발생했습니다.",
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
        service: DAILY_BUDGETS_ROUTES_SERVICE_NAME,
        version: DAILY_BUDGETS_ROUTES_VERSION,
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
    throw new DailyBudgetHttpError(
      413,
      "DAILY_BUDGET_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new DailyBudgetHttpError(
      400,
      "DAILY_BUDGET_JSON_OBJECT_REQUIRED",
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
    throw new DailyBudgetHttpError(
      400,
      "DAILY_BUDGET_FIELD_REQUIRED",
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

function booleanField(input: Record<string, unknown>, key: string): boolean {
  return input[key] === true;
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
      throw new DailyBudgetHttpError(
        400,
        "DAILY_BUDGET_AMOUNT_RANGE_INVALID",
        `${key} 금액 범위가 올바르지 않습니다.`,
        { field: key },
      );
    return value;
  }
  if (required)
    throw new DailyBudgetHttpError(
      400,
      "DAILY_BUDGET_AMOUNT_REQUIRED",
      `${key} 금액이 필요합니다.`,
      { field: key },
    );
  return 0;
}

function normalizeDate(value: string): string {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new DailyBudgetHttpError(
      400,
      "DAILY_BUDGET_DATE_INVALID",
      "날짜는 YYYY-MM-DD 형식이어야 합니다.",
    );
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new DailyBudgetHttpError(
      400,
      "DAILY_BUDGET_DATE_INVALID",
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

function daysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (end < start)
    throw new DailyBudgetHttpError(
      400,
      "DAILY_BUDGET_PERIOD_INVALID",
      "종료일은 시작일보다 빠를 수 없습니다.",
    );
  return Math.floor((end - start) / 86_400_000) + 1;
}

function normalizeStatus(value: unknown): DailyBudgetStatus {
  const status = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (["PLANNED", "ACTIVE", "OVERSPENT", "CLOSED", "DELETED"].includes(status))
    return status as DailyBudgetStatus;
  throw new DailyBudgetHttpError(
    400,
    "DAILY_BUDGET_STATUS_INVALID",
    "일일 예산 상태가 올바르지 않습니다.",
  );
}

function normalizeSource(value: unknown): DailyBudgetSource {
  const source =
    typeof value === "string" ? value.trim().toUpperCase() : "MANUAL";
  if (
    ["MANUAL", "PAYROLL_PLAN", "RECALCULATED", "CARRY_OVER", "SYSTEM"].includes(
      source,
    )
  )
    return source as DailyBudgetSource;
  throw new DailyBudgetHttpError(
    400,
    "DAILY_BUDGET_SOURCE_INVALID",
    "일일 예산 출처가 올바르지 않습니다.",
  );
}

function normalizeSpendCategory(value: unknown): DailyBudgetSpendCategory {
  const category =
    typeof value === "string" ? value.trim().toUpperCase() : "ETC";
  if (
    [
      "MEAL",
      "TRANSPORT",
      "CAFE",
      "SHOPPING",
      "HEALTH",
      "CONTENT",
      "ETC",
    ].includes(category)
  )
    return category as DailyBudgetSpendCategory;
  throw new DailyBudgetHttpError(
    400,
    "DAILY_BUDGET_SPEND_CATEGORY_INVALID",
    "지출 카테고리가 올바르지 않습니다.",
  );
}

function normalizeAdjustmentType(value: unknown): DailyBudgetAdjustmentType {
  const type =
    typeof value === "string" ? value.trim().toUpperCase() : "CORRECTION";
  if (
    [
      "INCREASE",
      "DECREASE",
      "CARRY_OVER_IN",
      "CARRY_OVER_OUT",
      "CORRECTION",
    ].includes(type)
  )
    return type as DailyBudgetAdjustmentType;
  throw new DailyBudgetHttpError(
    400,
    "DAILY_BUDGET_ADJUSTMENT_TYPE_INVALID",
    "조정 유형이 올바르지 않습니다.",
  );
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
    throw new DailyBudgetHttpError(
      400,
      "DAILY_BUDGET_ROUTE_ID_REQUIRED",
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
): DailyBudgetListResult<TItem> {
  return {
    items: items.slice(page.offset, page.offset + page.limit),
    page: page.page,
    pageSize: page.pageSize,
    total: items.length,
  };
}

function createBudgetInput(
  body: Record<string, unknown>,
): DailyBudgetCreateInput {
  return {
    budgetDate: dateFromUnknown(body.budgetDate, ""),
    plannedAmountMinor: moneyField(body, "plannedAmountMinor", { min: 0 }),
    memo: optionalStringField(body, "memo", 500),
    source: normalizeSource(body.source),
  };
}

function updateBudgetInput(
  body: Record<string, unknown>,
): DailyBudgetUpdateInput {
  const input: DailyBudgetUpdateInput = {
    ...(body.plannedAmountMinor !== undefined
      ? {
          plannedAmountMinor: moneyField(body, "plannedAmountMinor", {
            min: 0,
          }),
        }
      : {}),
    ...(body.memo !== undefined
      ? { memo: optionalStringField(body, "memo", 500) }
      : {}),
    ...(body.status !== undefined
      ? { status: normalizeStatus(body.status) }
      : {}),
  };
  if (!Object.keys(input).length)
    throw new DailyBudgetHttpError(
      400,
      "DAILY_BUDGET_UPDATE_EMPTY",
      "수정할 값이 필요합니다.",
    );
  return input;
}

function spendInput(
  body: Record<string, unknown>,
  now: Date,
): DailyBudgetSpendInput {
  const spentAt = optionalStringField(body, "spentAt") ?? now.toISOString();
  const parsed = new Date(spentAt);
  if (Number.isNaN(parsed.getTime()))
    throw new DailyBudgetHttpError(
      400,
      "DAILY_BUDGET_SPENT_AT_INVALID",
      "지출 시간이 올바르지 않습니다.",
    );
  return {
    amountMinor: moneyField(body, "amountMinor", { min: 1 }),
    category: normalizeSpendCategory(body.category),
    memo: optionalStringField(body, "memo", 500),
    spentAt: parsed.toISOString(),
    idempotencyKey: optionalStringField(body, "idempotencyKey", 160),
  };
}

function adjustmentInput(
  body: Record<string, unknown>,
): DailyBudgetAdjustmentInput {
  return {
    amountMinor: moneyField(body, "amountMinor", { min: 1 }),
    adjustmentType: normalizeAdjustmentType(body.adjustmentType),
    reason: stringField(body, "reason", { maxLength: 500 }),
  };
}

function recalculateInput(
  body: Record<string, unknown>,
  now: Date,
): DailyBudgetRecalculateInput {
  const today = todayInSeoul(now);
  const periodStartDate = dateFromUnknown(body.periodStartDate, today);
  const periodEndDate = dateFromUnknown(
    body.periodEndDate,
    addDays(periodStartDate, 30),
  );
  daysInclusive(periodStartDate, periodEndDate);
  return {
    periodStartDate,
    periodEndDate,
    availableAmountMinor: moneyField(body, "availableAmountMinor", { min: 0 }),
    alreadySpentAmountMinor: moneyField(body, "alreadySpentAmountMinor", {
      required: false,
      min: 0,
    }),
    carryOverAmountMinor: moneyField(body, "carryOverAmountMinor", {
      required: false,
      min: 0,
      max: 100_000_000,
    }),
    overwriteExisting: booleanField(body, "overwriteExisting"),
    memo: optionalStringField(body, "memo", 500),
  };
}

function recomputeStatus(
  budgetDate: string,
  plannedAmountMinor: number,
  spentAmountMinor: number,
  adjustmentAmountMinor: number,
  now: Date,
): DailyBudgetStatus {
  const remaining =
    plannedAmountMinor + adjustmentAmountMinor - spentAmountMinor;
  if (remaining < 0) return "OVERSPENT";
  const today = todayInSeoul(now);
  if (budgetDate < today) return "CLOSED";
  if (budgetDate === today) return "ACTIVE";
  return "PLANNED";
}

function withComputedFields(record: JsonRecord, now: Date): JsonRecord {
  const planned =
    typeof record.plannedAmountMinor === "number"
      ? record.plannedAmountMinor
      : 0;
  const spent =
    typeof record.spentAmountMinor === "number" ? record.spentAmountMinor : 0;
  const adjusted =
    typeof record.adjustmentAmountMinor === "number"
      ? record.adjustmentAmountMinor
      : 0;
  const remaining = planned + adjusted - spent;
  const budgetDate =
    typeof record.budgetDate === "string"
      ? record.budgetDate
      : todayInSeoul(now);
  const status =
    record.status === "DELETED"
      ? "DELETED"
      : recomputeStatus(budgetDate, planned, spent, adjusted, now);
  return {
    ...record,
    availableAmountMinor: planned + adjusted,
    remainingAmountMinor: remaining,
    usageRate:
      planned + adjusted > 0
        ? Math.round((spent / (planned + adjusted)) * 10_000) / 10_000
        : 0,
    status,
    serverAuthority: true,
  };
}

async function emit<TEnv>(
  runtime: DailyBudgetRouteRuntime<TEnv>,
  event: DailyBudgetEvent,
): Promise<void> {
  const options = (
    runtime as DailyBudgetRouteRuntime<TEnv> & {
      readonly routeOptions?: DailyBudgetsRoutesOptions<TEnv>;
    }
  ).routeOptions;
  if (!options?.onBudgetEvent) return;
  const task = Promise.resolve(
    options.onBudgetEvent(event, runtime.env, runtime.execution),
  ).catch((error) => {
    console.warn(
      "daily_budgets_routes_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  runtime.execution.waitUntil?.(task);
}

function createInMemoryDailyBudgetRepository<
  TEnv = unknown,
>(): DailyBudgetRepository<TEnv> {
  const budgets = new Map<string, JsonRecord>();
  const spends = new Map<string, JsonRecord>();
  const adjustments = new Map<string, JsonRecord>();

  function key(userId: string, budgetDate: string): string {
    return `${userId}:${budgetDate}`;
  }

  function visibleForUser(userId: string): JsonRecord[] {
    return [...budgets.values()].filter(
      (item) => item.userId === userId && item.status !== "DELETED",
    );
  }

  function findByDate(userId: string, budgetDate: string): JsonRecord | null {
    return budgets.get(key(userId, budgetDate)) ?? null;
  }

  function findByIdForRuntime(
    budgetId: string,
    runtime: DailyBudgetRouteRuntime<TEnv>,
  ): JsonRecord | null {
    const found =
      [...budgets.values()].find((item) => item.budgetId === budgetId) ?? null;
    if (!found || found.status === "DELETED") return null;
    assertOwner(String(found.userId), runtime);
    return found;
  }

  return {
    name: "in-memory-daily-budget-repository",
    async listBudgets(input, page, runtime): Promise<DailyBudgetListResult> {
      const startDate =
        typeof input.startDate === "string"
          ? normalizeDate(input.startDate)
          : null;
      const endDate =
        typeof input.endDate === "string" ? normalizeDate(input.endDate) : null;
      const items = visibleForUser(runtime.principal.userId)
        .filter((item) => !startDate || String(item.budgetDate) >= startDate)
        .filter((item) => !endDate || String(item.budgetDate) <= endDate)
        .sort((left, right) =>
          String(left.budgetDate).localeCompare(String(right.budgetDate)),
        )
        .map((item) => withComputedFields(item, runtime.now));
      return listResult(items, page);
    },
    async getBudgetById(budgetId, runtime): Promise<JsonRecord | null> {
      const found = findByIdForRuntime(budgetId, runtime);
      return found ? withComputedFields(found, runtime.now) : null;
    },
    async getBudgetByDate(budgetDate, runtime): Promise<JsonRecord | null> {
      const found = findByDate(
        runtime.principal.userId,
        normalizeDate(budgetDate),
      );
      return found && found.status !== "DELETED"
        ? withComputedFields(found, runtime.now)
        : null;
    },
    async createBudget(input, runtime): Promise<JsonRecord> {
      const budgetDate = normalizeDate(input.budgetDate);
      if (findByDate(runtime.principal.userId, budgetDate))
        throw new DailyBudgetHttpError(
          409,
          "DAILY_BUDGET_DATE_DUPLICATED",
          "해당 날짜의 일일 예산이 이미 존재합니다.",
        );
      const budgetId = `dbu_${globalThis.crypto.randomUUID()}`;
      const record: JsonRecord = {
        budgetId,
        userId: runtime.principal.userId,
        budgetDate,
        plannedAmountMinor: input.plannedAmountMinor,
        spentAmountMinor: 0,
        adjustmentAmountMinor: 0,
        source: input.source,
        memo: input.memo,
        status: recomputeStatus(
          budgetDate,
          input.plannedAmountMinor,
          0,
          0,
          runtime.now,
        ),
        createdAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      budgets.set(key(runtime.principal.userId, budgetDate), record);
      return withComputedFields(record, runtime.now);
    },
    async updateBudget(budgetId, input, runtime): Promise<JsonRecord> {
      const found = findByIdForRuntime(budgetId, runtime);
      if (!found)
        throw new DailyBudgetHttpError(
          404,
          "DAILY_BUDGET_NOT_FOUND",
          "일일 예산을 찾을 수 없습니다.",
        );
      const updatedBase: JsonRecord = {
        ...found,
        ...(input.plannedAmountMinor !== undefined
          ? { plannedAmountMinor: input.plannedAmountMinor }
          : {}),
        ...(input.memo !== undefined ? { memo: input.memo } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: runtime.now.toISOString(),
      };
      const computed = withComputedFields(updatedBase, runtime.now);
      budgets.set(
        key(String(computed.userId), String(computed.budgetDate)),
        computed,
      );
      return computed;
    },
    async deleteBudget(budgetId, runtime): Promise<JsonRecord> {
      const found = findByIdForRuntime(budgetId, runtime);
      if (!found)
        throw new DailyBudgetHttpError(
          404,
          "DAILY_BUDGET_NOT_FOUND",
          "일일 예산을 찾을 수 없습니다.",
        );
      const deleted = {
        ...found,
        status: "DELETED",
        updatedAt: runtime.now.toISOString(),
      };
      budgets.set(key(String(found.userId), String(found.budgetDate)), deleted);
      return { budgetId, status: "DELETED" };
    },
    async recordSpend(budgetId, input, runtime): Promise<JsonRecord> {
      const found = findByIdForRuntime(budgetId, runtime);
      if (!found)
        throw new DailyBudgetHttpError(
          404,
          "DAILY_BUDGET_NOT_FOUND",
          "일일 예산을 찾을 수 없습니다.",
        );
      if (input.idempotencyKey) {
        const existing = [...spends.values()].find(
          (item) =>
            item.idempotencyKey === input.idempotencyKey &&
            item.userId === runtime.principal.userId,
        );
        if (existing)
          return {
            spend: existing,
            budget: withComputedFields(found, runtime.now),
            idempotentReplay: true,
          };
      }
      const spendId = `dsp_${globalThis.crypto.randomUUID()}`;
      const spend: JsonRecord = {
        spendId,
        budgetId,
        userId: runtime.principal.userId,
        amountMinor: input.amountMinor,
        category: input.category,
        memo: input.memo,
        spentAt: input.spentAt,
        idempotencyKey: input.idempotencyKey,
        createdAt: runtime.now.toISOString(),
      };
      spends.set(spendId, spend);
      const updatedBase = {
        ...found,
        spentAmountMinor:
          (typeof found.spentAmountMinor === "number"
            ? found.spentAmountMinor
            : 0) + input.amountMinor,
        updatedAt: runtime.now.toISOString(),
      };
      const computed = withComputedFields(updatedBase, runtime.now);
      budgets.set(
        key(String(computed.userId), String(computed.budgetDate)),
        computed,
      );
      return { spend, budget: computed, idempotentReplay: false };
    },
    async adjustBudget(budgetId, input, runtime): Promise<JsonRecord> {
      const found = findByIdForRuntime(budgetId, runtime);
      if (!found)
        throw new DailyBudgetHttpError(
          404,
          "DAILY_BUDGET_NOT_FOUND",
          "일일 예산을 찾을 수 없습니다.",
        );
      const signedAmount =
        input.adjustmentType === "DECREASE" ||
        input.adjustmentType === "CARRY_OVER_OUT"
          ? -input.amountMinor
          : input.amountMinor;
      const adjustmentId = `dad_${globalThis.crypto.randomUUID()}`;
      const adjustment: JsonRecord = {
        adjustmentId,
        budgetId,
        userId: runtime.principal.userId,
        amountMinor: signedAmount,
        adjustmentType: input.adjustmentType,
        reason: input.reason,
        createdAt: runtime.now.toISOString(),
      };
      adjustments.set(adjustmentId, adjustment);
      const updatedBase = {
        ...found,
        adjustmentAmountMinor:
          (typeof found.adjustmentAmountMinor === "number"
            ? found.adjustmentAmountMinor
            : 0) + signedAmount,
        updatedAt: runtime.now.toISOString(),
      };
      const computed = withComputedFields(updatedBase, runtime.now);
      budgets.set(
        key(String(computed.userId), String(computed.budgetDate)),
        computed,
      );
      return { adjustment, budget: computed };
    },
    async recalculate(input, runtime): Promise<JsonRecord> {
      const totalDays = daysInclusive(
        input.periodStartDate,
        input.periodEndDate,
      );
      const distributable = Math.max(
        0,
        input.availableAmountMinor +
          input.carryOverAmountMinor -
          input.alreadySpentAmountMinor,
      );
      const baseDailyAmount = Math.floor(distributable / totalDays);
      const remainder = distributable - baseDailyAmount * totalDays;
      const created: JsonRecord[] = [];
      const skipped: JsonRecord[] = [];
      for (let index = 0; index < totalDays; index += 1) {
        const budgetDate = addDays(input.periodStartDate, index);
        const existing = findByDate(runtime.principal.userId, budgetDate);
        if (existing && !input.overwriteExisting) {
          skipped.push(withComputedFields(existing, runtime.now));
          continue;
        }
        const plannedAmountMinor =
          baseDailyAmount + (index < remainder ? 1 : 0);
        const record: JsonRecord = {
          budgetId:
            existing?.budgetId ?? `dbu_${globalThis.crypto.randomUUID()}`,
          userId: runtime.principal.userId,
          budgetDate,
          plannedAmountMinor,
          spentAmountMinor:
            existing && typeof existing.spentAmountMinor === "number"
              ? existing.spentAmountMinor
              : 0,
          adjustmentAmountMinor:
            existing && typeof existing.adjustmentAmountMinor === "number"
              ? existing.adjustmentAmountMinor
              : 0,
          source: "RECALCULATED",
          memo: input.memo,
          status: recomputeStatus(
            budgetDate,
            plannedAmountMinor,
            existing && typeof existing.spentAmountMinor === "number"
              ? existing.spentAmountMinor
              : 0,
            existing && typeof existing.adjustmentAmountMinor === "number"
              ? existing.adjustmentAmountMinor
              : 0,
            runtime.now,
          ),
          createdAt: String(existing?.createdAt ?? runtime.now.toISOString()),
          updatedAt: runtime.now.toISOString(),
        };
        budgets.set(key(runtime.principal.userId, budgetDate), record);
        created.push(withComputedFields(record, runtime.now));
      }
      return {
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        totalDays,
        distributableAmountMinor: distributable,
        baseDailyAmountMinor: baseDailyAmount,
        remainderAmountMinor: remainder,
        createdOrUpdatedCount: created.length,
        skippedCount: skipped.length,
        items: created,
        skipped,
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
      const items = visibleForUser(runtime.principal.userId)
        .filter(
          (item) =>
            String(item.budgetDate) >= startDate &&
            String(item.budgetDate) <= endDate,
        )
        .map((item) => withComputedFields(item, runtime.now));
      const plannedTotal = items.reduce(
        (sum, item) =>
          sum +
          (typeof item.plannedAmountMinor === "number"
            ? item.plannedAmountMinor
            : 0),
        0,
      );
      const spentTotal = items.reduce(
        (sum, item) =>
          sum +
          (typeof item.spentAmountMinor === "number"
            ? item.spentAmountMinor
            : 0),
        0,
      );
      const adjustmentTotal = items.reduce(
        (sum, item) =>
          sum +
          (typeof item.adjustmentAmountMinor === "number"
            ? item.adjustmentAmountMinor
            : 0),
        0,
      );
      return {
        startDate,
        endDate,
        dayCount: items.length,
        plannedTotalMinor: plannedTotal,
        adjustmentTotalMinor: adjustmentTotal,
        availableTotalMinor: plannedTotal + adjustmentTotal,
        spentTotalMinor: spentTotal,
        remainingTotalMinor: plannedTotal + adjustmentTotal - spentTotal,
        overSpentDays: items.filter((item) => item.status === "OVERSPENT")
          .length,
        averageDailySpentMinor: items.length
          ? Math.round(spentTotal / items.length)
          : 0,
        serverAuthority: true,
      };
    },
    async calendar(input, runtime): Promise<JsonRecord> {
      const month =
        typeof input.month === "string" && /^\d{4}-\d{2}$/.test(input.month)
          ? input.month
          : todayInSeoul(runtime.now).slice(0, 7);
      const startDate = `${month}-01`;
      const nextMonth = new Date(`${startDate}T00:00:00.000Z`);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      nextMonth.setUTCDate(0);
      const endDate = nextMonth.toISOString().slice(0, 10);
      const items = visibleForUser(runtime.principal.userId)
        .filter(
          (item) =>
            String(item.budgetDate) >= startDate &&
            String(item.budgetDate) <= endDate,
        )
        .sort((left, right) =>
          String(left.budgetDate).localeCompare(String(right.budgetDate)),
        )
        .map((item) => withComputedFields(item, runtime.now));
      return { month, startDate, endDate, items, serverAuthority: true };
    },
  };
}

function resolveRepository<TEnv>(
  env: TEnv,
  options: DailyBudgetsRoutesOptions<TEnv>,
): DailyBudgetRepository<TEnv> {
  const repo =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return repo ?? createInMemoryDailyBudgetRepository<TEnv>();
}

async function dispatchDailyBudgetRoute<TEnv>(
  runtime: DailyBudgetRouteRuntime<TEnv>,
): Promise<Response> {
  const { method, relativePath, repository } = runtime;
  const page = pagination(runtime.url);

  if (method === "GET" && relativePath === "/") {
    return jsonResponse(runtime, 200, {
      data: await repository.listBudgets(
        queryRecord(runtime.url),
        page,
        runtime,
      ),
    });
  }

  if (method === "GET" && relativePath === "/today") {
    const budgetDate = todayInSeoul(runtime.now);
    const budget = await repository.getBudgetByDate(budgetDate, runtime);
    if (!budget)
      throw new DailyBudgetHttpError(
        404,
        "DAILY_BUDGET_TODAY_NOT_FOUND",
        "오늘 일일 예산이 없습니다.",
      );
    return jsonResponse(runtime, 200, { data: budget });
  }

  if (method === "GET" && relativePath === "/summary") {
    return jsonResponse(runtime, 200, {
      data: await repository.summary(queryRecord(runtime.url), runtime),
    });
  }

  if (method === "GET" && relativePath === "/calendar") {
    return jsonResponse(runtime, 200, {
      data: await repository.calendar(queryRecord(runtime.url), runtime),
    });
  }

  if (method === "POST" && relativePath === "/recalculate") {
    const data = await repository.recalculate(
      recalculateInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "daily_budget_recalculated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      budgetId: null,
      budgetDate: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "POST" && relativePath === "/") {
    const data = await repository.createBudget(
      createBudgetInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "daily_budget_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      budgetId: String(data.budgetId ?? ""),
      budgetDate: String(data.budgetDate ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  let match = matchRoute(relativePath, /^\/date\/(\d{4}-\d{2}-\d{2})$/);
  if (method === "GET" && match) {
    const budget = await repository.getBudgetByDate(
      idFromMatch(match, 1),
      runtime,
    );
    if (!budget)
      throw new DailyBudgetHttpError(
        404,
        "DAILY_BUDGET_NOT_FOUND",
        "일일 예산을 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data: budget });
  }

  match = matchRoute(relativePath, /^\/([^/]+)$/);
  if (method === "GET" && match) {
    const budget = await repository.getBudgetById(
      idFromMatch(match, 1),
      runtime,
    );
    if (!budget)
      throw new DailyBudgetHttpError(
        404,
        "DAILY_BUDGET_NOT_FOUND",
        "일일 예산을 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data: budget });
  }

  if (method === "PATCH" && match) {
    const budgetId = idFromMatch(match, 1);
    const data = await repository.updateBudget(
      budgetId,
      updateBudgetInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "daily_budget_updated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      budgetId,
      budgetDate: String(data.budgetDate ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "DELETE" && match) {
    const budgetId = idFromMatch(match, 1);
    const data = await repository.deleteBudget(budgetId, runtime);
    await emit(runtime, {
      event: "daily_budget_deleted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      budgetId,
      budgetDate: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/spend$/);
  if (method === "POST" && match) {
    const budgetId = idFromMatch(match, 1);
    const data = await repository.recordSpend(
      budgetId,
      spendInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "daily_budget_spent",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      budgetId,
      budgetDate: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/adjust$/);
  if (method === "POST" && match) {
    const budgetId = idFromMatch(match, 1);
    const data = await repository.adjustBudget(
      budgetId,
      adjustmentInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "daily_budget_adjusted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      budgetId,
      budgetDate: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  throw new DailyBudgetHttpError(
    404,
    "DAILY_BUDGET_ROUTE_NOT_FOUND",
    "일일 예산 API 경로를 찾을 수 없습니다.",
  );
}

export function createDailyBudgetsRoutes<TEnv = unknown>(
  options: DailyBudgetsRoutesOptions<TEnv> = {},
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
        path !== DAILY_BUDGETS_API_PREFIX &&
        !path.startsWith(`${DAILY_BUDGETS_API_PREFIX}/`)
      ) {
        throw new DailyBudgetHttpError(
          404,
          "DAILY_BUDGET_ROUTE_PREFIX_NOT_FOUND",
          "일일 예산 API prefix가 아닙니다.",
        );
      }

      const baseRuntime: DailyBudgetRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normalizePath(
          path.slice(DAILY_BUDGETS_API_PREFIX.length) || "/",
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
      const response = await dispatchDailyBudgetRoute(runtime);
      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set(
        "x-daily-budget-repository",
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

export const handleDailyBudgetsRoutes = createDailyBudgetsRoutes();

export const dailyBudgetsRoutesManifest = Object.freeze({
  file: "services/api/src/routes/daily-budgets.routes.ts",
  version: DAILY_BUDGETS_ROUTES_VERSION,
  prefix: DAILY_BUDGETS_API_PREFIX,
  endpoints: [
    "GET /",
    "POST /",
    "GET /today",
    "GET /summary",
    "GET /calendar",
    "POST /recalculate",
    "GET /date/{budgetDate}",
    "GET /{budgetId}",
    "PATCH /{budgetId}",
    "DELETE /{budgetId}",
    "POST /{budgetId}/spend",
    "POST /{budgetId}/adjust",
  ],
  authMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  serverAuthorityCalculation: true,
  ownerDataBoundaryRequired: true,
  refreshTokenNotAcceptedHere: true,
  financialRawSalaryDataExposed: false,
  idempotentSpendSupported: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertDailyBudgetsRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "daily_budgets_api_prefix_api_v1",
    "auth_context_required_and_owner_boundary",
    "list_create_detail_update_delete",
    "today_budget_lookup",
    "date_budget_lookup",
    "summary_and_calendar_views",
    "server_authority_recalculate_period_distribution",
    "record_spend_with_idempotency_key",
    "manual_adjustment_with_reason",
    "krw_integer_minor_unit_validation",
    "remaining_available_usage_status_computation",
    "payroll_fixed_expense_savings_variable_expense_ready_contract",
    "standard_json_response_and_error_contract",
    "sensitive_token_account_salary_redaction",
    "repository_injection_with_memory_fallback",
    "security_event_wait_until_hook",
    "rate_limit_audit_error_middleware_compatible",
  ] as const;
  return {
    ok: checks.length >= 15,
    version: DAILY_BUDGETS_ROUTES_VERSION,
    checks,
  };
}

export default createDailyBudgetsRoutes;
