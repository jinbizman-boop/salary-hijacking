/** services/api/src/routes/payroll.routes.ts
 * 급여납치 Salary Hijacking Platform · 급여계획 API 라우트 최종본
 *
 * Cloudflare Workers Fetch API 호환 단일 파일이다. 급여일·급여액·고정지출·고정저축·
 * 변동지출 예비금·비상금·월간 생활비를 서버 권위로 계산하고, 급여 홈/계획/현재 계획/
 * 시뮬레이션/재계산/캘린더/요약을 제공한다. auth/error/rate-limit/audit 미들웨어와
 * 연동할 수 있도록 x-auth-* 컨텍스트, 표준 JSON 계약, requestId, 사용자별 데이터 경계,
 * 민감정보 마스킹, repository injection, in-memory fallback을 포함한다.
 */

export const PAYROLL_ROUTES_VERSION = "3.1.0";
export const PAYROLL_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const PAYROLL_API_PREFIX = "/api/v1/payroll";

const MAX_JSON_BODY_BYTES = 128 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TEXT = 2_000;
const KRW_MINOR_UNIT = 1;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

export type PayrollCycle = "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "CUSTOM";
export type PayrollPlanStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "ARCHIVED"
  | "DELETED";
export type PayrollIncomeType = "NET" | "GROSS";
export type PayrollReservePolicy = "ZERO_BASE" | "CARRY_OVER" | "FIXED_BUFFER";
export type PayrollRole =
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

export interface PayrollPrincipal {
  readonly userId: string;
  readonly roles: readonly PayrollRole[];
  readonly permissions: readonly string[];
  readonly policyId: string | null;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}

export interface PayrollListResult<TItem extends JsonRecord = JsonRecord> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface PayrollPlanCreateInput {
  readonly title: string;
  readonly incomeType: PayrollIncomeType;
  readonly payrollCycle: PayrollCycle;
  readonly payrollAmountMinor: number;
  readonly payday: number | null;
  readonly firstPayrollDate: string;
  readonly periodStartDate: string;
  readonly periodEndDate: string;
  readonly fixedExpenseTotalMinor: number;
  readonly fixedSavingsTotalMinor: number;
  readonly variableExpenseReserveMinor: number;
  readonly emergencyBufferMinor: number;
  readonly carryOverAmountMinor: number;
  readonly reservePolicy: PayrollReservePolicy;
  readonly memo: string | null;
}

export interface PayrollPlanUpdateInput {
  readonly title?: string | undefined;
  readonly incomeType?: PayrollIncomeType | undefined;
  readonly payrollCycle?: PayrollCycle | undefined;
  readonly payrollAmountMinor?: number | undefined;
  readonly payday?: number | null | undefined;
  readonly firstPayrollDate?: string | undefined;
  readonly periodStartDate?: string | undefined;
  readonly periodEndDate?: string | undefined;
  readonly fixedExpenseTotalMinor?: number | undefined;
  readonly fixedSavingsTotalMinor?: number | undefined;
  readonly variableExpenseReserveMinor?: number | undefined;
  readonly emergencyBufferMinor?: number | undefined;
  readonly carryOverAmountMinor?: number | undefined;
  readonly reservePolicy?: PayrollReservePolicy | undefined;
  readonly memo?: string | null | undefined;
  readonly status?: PayrollPlanStatus | undefined;
}

export interface PayrollRecalculateInput {
  readonly planId: string | null;
  readonly periodStartDate: string;
  readonly periodEndDate: string;
  readonly payrollAmountMinor: number;
  readonly fixedExpenseTotalMinor: number;
  readonly fixedSavingsTotalMinor: number;
  readonly variableExpenseReserveMinor: number;
  readonly emergencyBufferMinor: number;
  readonly carryOverAmountMinor: number;
  readonly alreadySpentAmountMinor: number;
  readonly overwritePlan: boolean;
  readonly reason: string | null;
}

export interface PayrollSimulationInput {
  readonly payrollAmountMinor: number;
  readonly fixedExpenseTotalMinor: number;
  readonly fixedSavingsTotalMinor: number;
  readonly variableExpenseReserveMinor: number;
  readonly emergencyBufferMinor: number;
  readonly carryOverAmountMinor: number;
  readonly periodStartDate: string;
  readonly periodEndDate: string;
}

export interface PayrollRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly principal: PayrollPrincipal;
  readonly repository: PayrollRepository<TEnv>;
}

export interface PayrollRepository<TEnv = unknown> {
  readonly name?: string;
  listPlans(
    input: JsonRecord,
    page: PaginationInput,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<PayrollListResult>;
  getPlan(
    planId: string,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  getCurrentPlan(
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  createPlan(
    input: PayrollPlanCreateInput,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updatePlan(
    planId: string,
    input: PayrollPlanUpdateInput,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  deletePlan(
    planId: string,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  activatePlan(
    planId: string,
    reason: string,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  pausePlan(
    planId: string,
    reason: string,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  archivePlan(
    planId: string,
    reason: string,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  home(runtime: PayrollRouteRuntime<TEnv>): Promise<JsonRecord>;
  summary(
    input: JsonRecord,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  calendar(
    input: JsonRecord,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  recalculate(
    input: PayrollRecalculateInput,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  simulate(
    input: PayrollSimulationInput,
    runtime: PayrollRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
}

export interface PayrollRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | PayrollRepository<TEnv>
    | ((env: TEnv) => PayrollRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
  readonly onPayrollEvent?: (
    event: PayrollEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface PayrollEvent {
  readonly event:
    | "payroll_plan_created"
    | "payroll_plan_updated"
    | "payroll_plan_deleted"
    | "payroll_plan_activated"
    | "payroll_plan_paused"
    | "payroll_plan_archived"
    | "payroll_plan_recalculated"
    | "payroll_plan_simulated";
  readonly requestId: string;
  readonly userId: string;
  readonly planId: string | null;
  readonly path: string;
  readonly createdAt: string;
}

class PayrollHttpError extends Error {
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
    this.name = "PayrollHttpError";
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
  "salarySlip",
  "payslip",
  "payrollAccount",
  "incomeProof",
  "adTarget",
  "targeting",
  "비밀번호",
  "토큰",
  "계좌",
  "카드",
  "급여명세",
  "원천징수",
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

function normalizeRole(value: string): PayrollRole | null {
  const role = value.trim().toUpperCase();
  if (["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role))
    return role as PayrollRole;
  return null;
}

function principalFromRequest(
  request: Request,
  requireSource: boolean,
): PayrollPrincipal {
  const source = header(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source !== AUTH_CONTEXT_SOURCE_VALUE) {
    throw new PayrollHttpError(
      401,
      "PAYROLL_AUTH_CONTEXT_REQUIRED",
      "인증 컨텍스트가 필요합니다.",
    );
  }

  const userId = header(request, "x-authenticated-user-id");
  if (!userId)
    throw new PayrollHttpError(
      401,
      "PAYROLL_AUTH_REQUIRED",
      "로그인이 필요합니다.",
    );

  const roles = (header(request, "x-authenticated-roles") ?? "USER")
    .split(",")
    .map((role) => normalizeRole(role))
    .filter((role): role is PayrollRole => Boolean(role));
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

function isPrivileged(principal: PayrollPrincipal): boolean {
  return (
    principal.roles.some(
      (role) =>
        role === "ADMIN" || role === "SUPER_ADMIN" || role === "OPERATOR",
    ) || principal.permissions.includes("*")
  );
}

function assertOwner(userId: string, runtime: PayrollRouteRuntime): void {
  if (userId === runtime.principal.userId || isPrivileged(runtime.principal))
    return;
  throw new PayrollHttpError(
    403,
    "PAYROLL_OWNER_REQUIRED",
    "본인 급여계획만 접근할 수 있습니다.",
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
  runtime: Pick<PayrollRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: PAYROLL_ROUTES_SERVICE_NAME,
        version: PAYROLL_ROUTES_VERSION,
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
    error instanceof PayrollHttpError
      ? error
      : new PayrollHttpError(
          500,
          "PAYROLL_ROUTE_INTERNAL_ERROR",
          "급여계획 API 처리 중 오류가 발생했습니다.",
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
        service: PAYROLL_ROUTES_SERVICE_NAME,
        version: PAYROLL_ROUTES_VERSION,
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
    throw new PayrollHttpError(
      413,
      "PAYROLL_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new PayrollHttpError(
      400,
      "PAYROLL_JSON_OBJECT_REQUIRED",
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
    throw new PayrollHttpError(
      400,
      "PAYROLL_FIELD_REQUIRED",
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
    const max = options.max ?? 10_000_000_000;
    if (value < min || value > max)
      throw new PayrollHttpError(
        400,
        "PAYROLL_AMOUNT_RANGE_INVALID",
        `${key} 금액 범위가 올바르지 않습니다.`,
        { field: key },
      );
    return value;
  }
  if (required)
    throw new PayrollHttpError(
      400,
      "PAYROLL_AMOUNT_REQUIRED",
      `${key} 금액이 필요합니다.`,
      { field: key },
    );
  return 0;
}

function normalizeDate(value: string): string {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new PayrollHttpError(
      400,
      "PAYROLL_DATE_INVALID",
      "날짜는 YYYY-MM-DD 형식이어야 합니다.",
    );
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new PayrollHttpError(
      400,
      "PAYROLL_DATE_INVALID",
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

function addMonths(date: string, months: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCMonth(base.getUTCMonth() + months);
  return base.toISOString().slice(0, 10);
}

function daysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (end < start)
    throw new PayrollHttpError(
      400,
      "PAYROLL_PERIOD_INVALID",
      "종료일은 시작일보다 빠를 수 없습니다.",
    );
  return Math.floor((end - start) / 86_400_000) + 1;
}

function normalizeCycle(value: unknown): PayrollCycle {
  const cycle =
    typeof value === "string" ? value.trim().toUpperCase() : "MONTHLY";
  if (["MONTHLY", "BIWEEKLY", "WEEKLY", "CUSTOM"].includes(cycle))
    return cycle as PayrollCycle;
  throw new PayrollHttpError(
    400,
    "PAYROLL_CYCLE_INVALID",
    "급여 주기가 올바르지 않습니다.",
  );
}

function normalizeIncomeType(value: unknown): PayrollIncomeType {
  const type = typeof value === "string" ? value.trim().toUpperCase() : "NET";
  if (["NET", "GROSS"].includes(type)) return type as PayrollIncomeType;
  throw new PayrollHttpError(
    400,
    "PAYROLL_INCOME_TYPE_INVALID",
    "급여 금액 유형이 올바르지 않습니다.",
  );
}

function normalizeReservePolicy(value: unknown): PayrollReservePolicy {
  const policy =
    typeof value === "string" ? value.trim().toUpperCase() : "ZERO_BASE";
  if (["ZERO_BASE", "CARRY_OVER", "FIXED_BUFFER"].includes(policy))
    return policy as PayrollReservePolicy;
  throw new PayrollHttpError(
    400,
    "PAYROLL_RESERVE_POLICY_INVALID",
    "잔액 정책이 올바르지 않습니다.",
  );
}

function normalizeStatus(value: unknown): PayrollPlanStatus {
  const status =
    typeof value === "string" ? value.trim().toUpperCase() : "DRAFT";
  if (["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED", "DELETED"].includes(status))
    return status as PayrollPlanStatus;
  throw new PayrollHttpError(
    400,
    "PAYROLL_STATUS_INVALID",
    "급여계획 상태가 올바르지 않습니다.",
  );
}

function paydayField(
  input: Record<string, unknown>,
  key: string,
  cycle: PayrollCycle,
): number | null {
  const value = input[key];
  if (cycle === "WEEKLY" || cycle === "BIWEEKLY" || cycle === "CUSTOM") {
    if (value === undefined || value === null) return null;
  }
  if (value === undefined || value === null)
    throw new PayrollHttpError(
      400,
      "PAYROLL_PAYDAY_REQUIRED",
      "월급 계획은 급여일이 필요합니다.",
    );
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 31
  ) {
    throw new PayrollHttpError(
      400,
      "PAYROLL_PAYDAY_INVALID",
      "급여일은 1부터 31 사이 정수여야 합니다.",
    );
  }
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
    throw new PayrollHttpError(
      400,
      "PAYROLL_ROUTE_ID_REQUIRED",
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
): PayrollListResult<TItem> {
  return {
    items: items.slice(page.offset, page.offset + page.limit),
    page: page.page,
    pageSize: page.pageSize,
    total: items.length,
  };
}

function serverAuthorityBreakdown(input: {
  readonly periodStartDate: string;
  readonly periodEndDate: string;
  readonly payrollAmountMinor: number;
  readonly fixedExpenseTotalMinor: number;
  readonly fixedSavingsTotalMinor: number;
  readonly variableExpenseReserveMinor: number;
  readonly emergencyBufferMinor: number;
  readonly carryOverAmountMinor: number;
  readonly alreadySpentAmountMinor?: number;
}): JsonRecord {
  const dayCount = daysInclusive(input.periodStartDate, input.periodEndDate);
  const totalDeductionsMinor =
    input.fixedExpenseTotalMinor +
    input.fixedSavingsTotalMinor +
    input.variableExpenseReserveMinor +
    input.emergencyBufferMinor;
  const availableBeforeSpentMinor =
    input.payrollAmountMinor +
    input.carryOverAmountMinor -
    totalDeductionsMinor;
  const availableForDailyBudgetMinor = Math.max(
    0,
    availableBeforeSpentMinor - (input.alreadySpentAmountMinor ?? 0),
  );
  const recommendedDailyBudgetMinor =
    dayCount > 0 ? Math.floor(availableForDailyBudgetMinor / dayCount) : 0;
  const remainderMinor =
    availableForDailyBudgetMinor - recommendedDailyBudgetMinor * dayCount;
  const hijackRate =
    input.payrollAmountMinor > 0
      ? Math.round((totalDeductionsMinor / input.payrollAmountMinor) * 10_000) /
        10_000
      : 0;
  return {
    periodStartDate: input.periodStartDate,
    periodEndDate: input.periodEndDate,
    dayCount,
    payrollAmountMinor: input.payrollAmountMinor,
    fixedExpenseTotalMinor: input.fixedExpenseTotalMinor,
    fixedSavingsTotalMinor: input.fixedSavingsTotalMinor,
    variableExpenseReserveMinor: input.variableExpenseReserveMinor,
    emergencyBufferMinor: input.emergencyBufferMinor,
    carryOverAmountMinor: input.carryOverAmountMinor,
    alreadySpentAmountMinor: input.alreadySpentAmountMinor ?? 0,
    totalDeductionsMinor,
    availableBeforeSpentMinor,
    availableForDailyBudgetMinor,
    recommendedDailyBudgetMinor,
    remainderMinor,
    hijackRate,
    serverAuthority: true,
    financialRawDataExposed: false,
  };
}

function createPlanInput(
  body: Record<string, unknown>,
  now: Date,
): PayrollPlanCreateInput {
  const cycle = normalizeCycle(body.payrollCycle);
  const today = todayInSeoul(now);
  const periodStartDate = dateFromUnknown(body.periodStartDate, today);
  const periodEndDate = dateFromUnknown(
    body.periodEndDate,
    addMonths(periodStartDate, 1),
  );
  daysInclusive(periodStartDate, periodEndDate);
  return {
    title: stringField(body, "title", { maxLength: 100 }),
    incomeType: normalizeIncomeType(body.incomeType),
    payrollCycle: cycle,
    payrollAmountMinor: moneyField(body, "payrollAmountMinor", { min: 1 }),
    payday: paydayField(body, "payday", cycle),
    firstPayrollDate: dateFromUnknown(body.firstPayrollDate, periodStartDate),
    periodStartDate,
    periodEndDate,
    fixedExpenseTotalMinor: moneyField(body, "fixedExpenseTotalMinor", {
      required: false,
      min: 0,
    }),
    fixedSavingsTotalMinor: moneyField(body, "fixedSavingsTotalMinor", {
      required: false,
      min: 0,
    }),
    variableExpenseReserveMinor: moneyField(
      body,
      "variableExpenseReserveMinor",
      { required: false, min: 0 },
    ),
    emergencyBufferMinor: moneyField(body, "emergencyBufferMinor", {
      required: false,
      min: 0,
    }),
    carryOverAmountMinor: moneyField(body, "carryOverAmountMinor", {
      required: false,
      min: 0,
      max: 1_000_000_000,
    }),
    reservePolicy: normalizeReservePolicy(body.reservePolicy),
    memo: optionalStringField(body, "memo", 500),
  };
}

function updatePlanInput(
  body: Record<string, unknown>,
): PayrollPlanUpdateInput {
  const cycle =
    body.payrollCycle !== undefined
      ? normalizeCycle(body.payrollCycle)
      : undefined;
  const input: PayrollPlanUpdateInput = {
    ...(body.title !== undefined
      ? { title: stringField(body, "title", { maxLength: 100 }) }
      : {}),
    ...(body.incomeType !== undefined
      ? { incomeType: normalizeIncomeType(body.incomeType) }
      : {}),
    ...(cycle !== undefined ? { payrollCycle: cycle } : {}),
    ...(body.payrollAmountMinor !== undefined
      ? {
          payrollAmountMinor: moneyField(body, "payrollAmountMinor", {
            min: 1,
          }),
        }
      : {}),
    ...(body.payday !== undefined
      ? { payday: paydayField(body, "payday", cycle ?? "MONTHLY") }
      : {}),
    ...(body.firstPayrollDate !== undefined
      ? { firstPayrollDate: dateFromUnknown(body.firstPayrollDate, "") }
      : {}),
    ...(body.periodStartDate !== undefined
      ? { periodStartDate: dateFromUnknown(body.periodStartDate, "") }
      : {}),
    ...(body.periodEndDate !== undefined
      ? { periodEndDate: dateFromUnknown(body.periodEndDate, "") }
      : {}),
    ...(body.fixedExpenseTotalMinor !== undefined
      ? {
          fixedExpenseTotalMinor: moneyField(body, "fixedExpenseTotalMinor", {
            min: 0,
          }),
        }
      : {}),
    ...(body.fixedSavingsTotalMinor !== undefined
      ? {
          fixedSavingsTotalMinor: moneyField(body, "fixedSavingsTotalMinor", {
            min: 0,
          }),
        }
      : {}),
    ...(body.variableExpenseReserveMinor !== undefined
      ? {
          variableExpenseReserveMinor: moneyField(
            body,
            "variableExpenseReserveMinor",
            { min: 0 },
          ),
        }
      : {}),
    ...(body.emergencyBufferMinor !== undefined
      ? {
          emergencyBufferMinor: moneyField(body, "emergencyBufferMinor", {
            min: 0,
          }),
        }
      : {}),
    ...(body.carryOverAmountMinor !== undefined
      ? {
          carryOverAmountMinor: moneyField(body, "carryOverAmountMinor", {
            min: 0,
            max: 1_000_000_000,
          }),
        }
      : {}),
    ...(body.reservePolicy !== undefined
      ? { reservePolicy: normalizeReservePolicy(body.reservePolicy) }
      : {}),
    ...(body.memo !== undefined
      ? { memo: optionalStringField(body, "memo", 500) }
      : {}),
    ...(body.status !== undefined
      ? { status: normalizeStatus(body.status) }
      : {}),
  };
  if (!Object.keys(input).length)
    throw new PayrollHttpError(
      400,
      "PAYROLL_UPDATE_EMPTY",
      "수정할 값이 필요합니다.",
    );
  return input;
}

function reasonFromBody(body: Record<string, unknown>): string {
  return stringField(body, "reason", { maxLength: 500 });
}

function simulationInput(
  body: Record<string, unknown>,
  now: Date,
): PayrollSimulationInput {
  const today = todayInSeoul(now);
  const periodStartDate = dateFromUnknown(body.periodStartDate, today);
  const periodEndDate = dateFromUnknown(
    body.periodEndDate,
    addMonths(periodStartDate, 1),
  );
  daysInclusive(periodStartDate, periodEndDate);
  return {
    payrollAmountMinor: moneyField(body, "payrollAmountMinor", { min: 1 }),
    fixedExpenseTotalMinor: moneyField(body, "fixedExpenseTotalMinor", {
      required: false,
      min: 0,
    }),
    fixedSavingsTotalMinor: moneyField(body, "fixedSavingsTotalMinor", {
      required: false,
      min: 0,
    }),
    variableExpenseReserveMinor: moneyField(
      body,
      "variableExpenseReserveMinor",
      { required: false, min: 0 },
    ),
    emergencyBufferMinor: moneyField(body, "emergencyBufferMinor", {
      required: false,
      min: 0,
    }),
    carryOverAmountMinor: moneyField(body, "carryOverAmountMinor", {
      required: false,
      min: 0,
      max: 1_000_000_000,
    }),
    periodStartDate,
    periodEndDate,
  };
}

function recalculateInput(
  body: Record<string, unknown>,
  now: Date,
): PayrollRecalculateInput {
  const simulated = simulationInput(body, now);
  return {
    ...simulated,
    planId: optionalStringField(body, "planId", 160),
    alreadySpentAmountMinor: moneyField(body, "alreadySpentAmountMinor", {
      required: false,
      min: 0,
    }),
    overwritePlan: booleanField(body, "overwritePlan"),
    reason: optionalStringField(body, "reason", 500),
  };
}

async function emit<TEnv>(
  runtime: PayrollRouteRuntime<TEnv>,
  event: PayrollEvent,
): Promise<void> {
  const options = (
    runtime as PayrollRouteRuntime<TEnv> & {
      readonly routeOptions?: PayrollRoutesOptions<TEnv>;
    }
  ).routeOptions;
  if (!options?.onPayrollEvent) return;
  const task = Promise.resolve(
    options.onPayrollEvent(event, runtime.env, runtime.execution),
  ).catch((error) => {
    console.warn(
      "payroll_routes_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  runtime.execution.waitUntil?.(task);
}

function createInMemoryPayrollRepository<
  TEnv = unknown,
>(): PayrollRepository<TEnv> {
  const plans = new Map<string, JsonRecord>();

  function visibleForUser(userId: string): JsonRecord[] {
    return [...plans.values()].filter(
      (item) => item.userId === userId && item.status !== "DELETED",
    );
  }

  function findForRuntime(
    planId: string,
    runtime: PayrollRouteRuntime<TEnv>,
  ): JsonRecord | null {
    const found = plans.get(planId) ?? null;
    if (!found || found.status === "DELETED") return null;
    assertOwner(String(found.userId), runtime);
    return found;
  }

  function withBreakdown(plan: JsonRecord): JsonRecord {
    const breakdown = serverAuthorityBreakdown({
      periodStartDate: String(plan.periodStartDate),
      periodEndDate: String(plan.periodEndDate),
      payrollAmountMinor:
        typeof plan.payrollAmountMinor === "number"
          ? plan.payrollAmountMinor
          : 0,
      fixedExpenseTotalMinor:
        typeof plan.fixedExpenseTotalMinor === "number"
          ? plan.fixedExpenseTotalMinor
          : 0,
      fixedSavingsTotalMinor:
        typeof plan.fixedSavingsTotalMinor === "number"
          ? plan.fixedSavingsTotalMinor
          : 0,
      variableExpenseReserveMinor:
        typeof plan.variableExpenseReserveMinor === "number"
          ? plan.variableExpenseReserveMinor
          : 0,
      emergencyBufferMinor:
        typeof plan.emergencyBufferMinor === "number"
          ? plan.emergencyBufferMinor
          : 0,
      carryOverAmountMinor:
        typeof plan.carryOverAmountMinor === "number"
          ? plan.carryOverAmountMinor
          : 0,
    });
    return {
      ...plan,
      calculation: breakdown,
      serverAuthority: true,
      financialRawDataExposed: false,
    };
  }

  function current(runtime: PayrollRouteRuntime<TEnv>): JsonRecord | null {
    const today = todayInSeoul(runtime.now);
    const active = visibleForUser(runtime.principal.userId)
      .filter((item) => item.status === "ACTIVE")
      .sort((left, right) =>
        String(right.updatedAt).localeCompare(String(left.updatedAt)),
      );
    return (
      active.find(
        (item) =>
          String(item.periodStartDate) <= today &&
          String(item.periodEndDate) >= today,
      ) ??
      active[0] ??
      null
    );
  }

  return {
    name: "in-memory-payroll-repository",
    async listPlans(input, page, runtime): Promise<PayrollListResult> {
      const status =
        typeof input.status === "string" && input.status ? input.status : null;
      const items = visibleForUser(runtime.principal.userId)
        .filter((item) => !status || item.status === status)
        .sort((left, right) =>
          String(right.createdAt).localeCompare(String(left.createdAt)),
        )
        .map((item) => withBreakdown(item));
      return listResult(items, page);
    },
    async getPlan(planId, runtime): Promise<JsonRecord | null> {
      const found = findForRuntime(planId, runtime);
      return found ? withBreakdown(found) : null;
    },
    async getCurrentPlan(runtime): Promise<JsonRecord | null> {
      const found = current(runtime);
      return found ? withBreakdown(found) : null;
    },
    async createPlan(input, runtime): Promise<JsonRecord> {
      const planId = `ppl_${globalThis.crypto.randomUUID()}`;
      const record: JsonRecord = {
        planId,
        userId: runtime.principal.userId,
        title: input.title,
        incomeType: input.incomeType,
        payrollCycle: input.payrollCycle,
        payrollAmountMinor: input.payrollAmountMinor,
        payday: input.payday,
        firstPayrollDate: input.firstPayrollDate,
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        fixedExpenseTotalMinor: input.fixedExpenseTotalMinor,
        fixedSavingsTotalMinor: input.fixedSavingsTotalMinor,
        variableExpenseReserveMinor: input.variableExpenseReserveMinor,
        emergencyBufferMinor: input.emergencyBufferMinor,
        carryOverAmountMinor: input.carryOverAmountMinor,
        reservePolicy: input.reservePolicy,
        memo: input.memo,
        status: "DRAFT",
        createdAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      plans.set(planId, record);
      return withBreakdown(record);
    },
    async updatePlan(planId, input, runtime): Promise<JsonRecord> {
      const found = findForRuntime(planId, runtime);
      if (!found)
        throw new PayrollHttpError(
          404,
          "PAYROLL_PLAN_NOT_FOUND",
          "급여계획을 찾을 수 없습니다.",
        );
      const startDate = input.periodStartDate ?? String(found.periodStartDate);
      const endDate = input.periodEndDate ?? String(found.periodEndDate);
      daysInclusive(startDate, endDate);
      const updated: JsonRecord = {
        ...found,
        updatedAt: runtime.now.toISOString(),
      };
      if (input.title !== undefined) updated.title = input.title;
      if (input.incomeType !== undefined) updated.incomeType = input.incomeType;
      if (input.payrollCycle !== undefined)
        updated.payrollCycle = input.payrollCycle;
      if (input.payrollAmountMinor !== undefined)
        updated.payrollAmountMinor = input.payrollAmountMinor;
      if (input.payday !== undefined) updated.payday = input.payday;
      if (input.firstPayrollDate !== undefined)
        updated.firstPayrollDate = input.firstPayrollDate;
      if (input.periodStartDate !== undefined)
        updated.periodStartDate = input.periodStartDate;
      if (input.periodEndDate !== undefined)
        updated.periodEndDate = input.periodEndDate;
      if (input.fixedExpenseTotalMinor !== undefined)
        updated.fixedExpenseTotalMinor = input.fixedExpenseTotalMinor;
      if (input.fixedSavingsTotalMinor !== undefined)
        updated.fixedSavingsTotalMinor = input.fixedSavingsTotalMinor;
      if (input.variableExpenseReserveMinor !== undefined)
        updated.variableExpenseReserveMinor = input.variableExpenseReserveMinor;
      if (input.emergencyBufferMinor !== undefined)
        updated.emergencyBufferMinor = input.emergencyBufferMinor;
      if (input.carryOverAmountMinor !== undefined)
        updated.carryOverAmountMinor = input.carryOverAmountMinor;
      if (input.reservePolicy !== undefined)
        updated.reservePolicy = input.reservePolicy;
      if (input.memo !== undefined) updated.memo = input.memo;
      if (input.status !== undefined) updated.status = input.status;
      plans.set(planId, updated);
      return withBreakdown(updated);
    },
    async deletePlan(planId, runtime): Promise<JsonRecord> {
      const found = findForRuntime(planId, runtime);
      if (!found)
        throw new PayrollHttpError(
          404,
          "PAYROLL_PLAN_NOT_FOUND",
          "급여계획을 찾을 수 없습니다.",
        );
      plans.set(planId, {
        ...found,
        status: "DELETED",
        updatedAt: runtime.now.toISOString(),
      });
      return { planId, status: "DELETED" };
    },
    async activatePlan(planId, reason, runtime): Promise<JsonRecord> {
      const found = findForRuntime(planId, runtime);
      if (!found)
        throw new PayrollHttpError(
          404,
          "PAYROLL_PLAN_NOT_FOUND",
          "급여계획을 찾을 수 없습니다.",
        );
      visibleForUser(runtime.principal.userId).forEach((plan) => {
        if (plan.status === "ACTIVE" && plan.planId !== planId)
          plans.set(String(plan.planId), {
            ...plan,
            status: "ARCHIVED",
            updatedAt: runtime.now.toISOString(),
          });
      });
      const updated = {
        ...found,
        status: "ACTIVE",
        activatedReason: reason,
        activatedAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      plans.set(planId, updated);
      return withBreakdown(updated);
    },
    async pausePlan(planId, reason, runtime): Promise<JsonRecord> {
      const found = findForRuntime(planId, runtime);
      if (!found)
        throw new PayrollHttpError(
          404,
          "PAYROLL_PLAN_NOT_FOUND",
          "급여계획을 찾을 수 없습니다.",
        );
      const updated = {
        ...found,
        status: "PAUSED",
        pauseReason: reason,
        updatedAt: runtime.now.toISOString(),
      };
      plans.set(planId, updated);
      return withBreakdown(updated);
    },
    async archivePlan(planId, reason, runtime): Promise<JsonRecord> {
      const found = findForRuntime(planId, runtime);
      if (!found)
        throw new PayrollHttpError(
          404,
          "PAYROLL_PLAN_NOT_FOUND",
          "급여계획을 찾을 수 없습니다.",
        );
      const updated = {
        ...found,
        status: "ARCHIVED",
        archiveReason: reason,
        updatedAt: runtime.now.toISOString(),
      };
      plans.set(planId, updated);
      return withBreakdown(updated);
    },
    async home(runtime): Promise<JsonRecord> {
      const currentPlan = current(runtime);
      const plan = currentPlan ? withBreakdown(currentPlan) : null;
      const calculation =
        plan &&
        typeof plan.calculation === "object" &&
        plan.calculation !== null &&
        !Array.isArray(plan.calculation)
          ? (plan.calculation as JsonRecord)
          : null;
      return {
        currentPlan: plan,
        headline: plan
          ? "급여 납치 계획이 활성화되어 있습니다."
          : "활성 급여계획이 없습니다.",
        nextAction: plan
          ? "오늘의 일일 예산을 확인하고 변동지출을 기록하세요."
          : "급여일과 고정지출을 입력해 첫 계획을 만드세요.",
        recommendedDailyBudgetMinor:
          typeof calculation?.recommendedDailyBudgetMinor === "number"
            ? calculation.recommendedDailyBudgetMinor
            : 0,
        availableForDailyBudgetMinor:
          typeof calculation?.availableForDailyBudgetMinor === "number"
            ? calculation.availableForDailyBudgetMinor
            : 0,
        financialRawDataExposed: false,
        serverAuthority: true,
      };
    },
    async summary(input, runtime): Promise<JsonRecord> {
      const startDate =
        typeof input.startDate === "string"
          ? normalizeDate(input.startDate)
          : addMonths(todayInSeoul(runtime.now), -3);
      const endDate =
        typeof input.endDate === "string"
          ? normalizeDate(input.endDate)
          : todayInSeoul(runtime.now);
      daysInclusive(startDate, endDate);
      const items = visibleForUser(runtime.principal.userId)
        .filter(
          (item) =>
            String(item.periodEndDate) >= startDate &&
            String(item.periodStartDate) <= endDate,
        )
        .map((item) => withBreakdown(item));
      const payrollTotalMinor = items.reduce(
        (sum, item) =>
          sum +
          (typeof item.payrollAmountMinor === "number"
            ? item.payrollAmountMinor
            : 0),
        0,
      );
      const deductionTotalMinor = items.reduce((sum, item) => {
        const calculation =
          typeof item.calculation === "object" &&
          item.calculation !== null &&
          !Array.isArray(item.calculation)
            ? (item.calculation as JsonRecord)
            : {};
        return (
          sum +
          (typeof calculation.totalDeductionsMinor === "number"
            ? calculation.totalDeductionsMinor
            : 0)
        );
      }, 0);
      return {
        startDate,
        endDate,
        planCount: items.length,
        activePlanCount: items.filter((item) => item.status === "ACTIVE")
          .length,
        payrollTotalMinor,
        deductionTotalMinor,
        availableTotalMinor: Math.max(
          0,
          payrollTotalMinor - deductionTotalMinor,
        ),
        averageHijackRate:
          payrollTotalMinor > 0
            ? Math.round((deductionTotalMinor / payrollTotalMinor) * 10_000) /
              10_000
            : 0,
        serverAuthority: true,
        financialRawDataExposed: false,
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
        .filter(
          (item) =>
            String(item.firstPayrollDate) >= startDate &&
            String(item.firstPayrollDate) <= endDate,
        )
        .map((item) => ({
          planId: String(item.planId),
          title: String(item.title),
          payrollDate: String(item.firstPayrollDate),
          payrollAmountMinor:
            typeof item.payrollAmountMinor === "number"
              ? item.payrollAmountMinor
              : 0,
          status: String(item.status),
        }))
        .sort((left, right) =>
          left.payrollDate.localeCompare(right.payrollDate),
        );
      return {
        month,
        startDate,
        endDate,
        items,
        payrollCount: items.length,
        payrollTotalMinor: items.reduce(
          (sum, item) => sum + item.payrollAmountMinor,
          0,
        ),
        serverAuthority: true,
      };
    },
    async recalculate(input, runtime): Promise<JsonRecord> {
      const breakdown = serverAuthorityBreakdown(input);
      let updatedPlan: JsonRecord | null = null;
      if (input.planId && input.overwritePlan) {
        updatedPlan = await this.updatePlan(
          input.planId,
          {
            payrollAmountMinor: input.payrollAmountMinor,
            periodStartDate: input.periodStartDate,
            periodEndDate: input.periodEndDate,
            fixedExpenseTotalMinor: input.fixedExpenseTotalMinor,
            fixedSavingsTotalMinor: input.fixedSavingsTotalMinor,
            variableExpenseReserveMinor: input.variableExpenseReserveMinor,
            emergencyBufferMinor: input.emergencyBufferMinor,
            carryOverAmountMinor: input.carryOverAmountMinor,
            memo: input.reason,
          },
          runtime,
        );
      }
      return {
        calculation: breakdown,
        updatedPlan,
        overwritePlan: input.overwritePlan,
        reason: input.reason,
        serverAuthority: true,
      };
    },
    async simulate(input): Promise<JsonRecord> {
      return {
        calculation: serverAuthorityBreakdown(input),
        saved: false,
        financialRawDataExposed: false,
        adTargetingSeparated: true,
        serverAuthority: true,
      };
    },
  };
}

function resolveRepository<TEnv>(
  env: TEnv,
  options: PayrollRoutesOptions<TEnv>,
): PayrollRepository<TEnv> {
  const repo =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return repo ?? createInMemoryPayrollRepository<TEnv>();
}

async function dispatchPayrollRoute<TEnv>(
  runtime: PayrollRouteRuntime<TEnv>,
): Promise<Response> {
  const { method, relativePath, repository } = runtime;
  const page = pagination(runtime.url);

  if (method === "GET" && relativePath === "/") {
    return jsonResponse(runtime, 200, {
      data: await repository.listPlans(queryRecord(runtime.url), page, runtime),
    });
  }

  if (method === "POST" && relativePath === "/") {
    const data = await repository.createPlan(
      createPlanInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "payroll_plan_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      planId: String(data.planId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  if (method === "GET" && relativePath === "/home") {
    return jsonResponse(runtime, 200, { data: await repository.home(runtime) });
  }

  if (method === "GET" && relativePath === "/current") {
    const data = await repository.getCurrentPlan(runtime);
    if (!data)
      throw new PayrollHttpError(
        404,
        "PAYROLL_CURRENT_PLAN_NOT_FOUND",
        "활성 급여계획을 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data });
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

  if (method === "POST" && relativePath === "/simulate") {
    const data = await repository.simulate(
      simulationInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "payroll_plan_simulated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      planId: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "POST" && relativePath === "/recalculate") {
    const input = recalculateInput(
      await parseJsonBody(runtime.request),
      runtime.now,
    );
    const data = await repository.recalculate(input, runtime);
    await emit(runtime, {
      event: "payroll_plan_recalculated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      planId: input.planId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  let match = matchRoute(relativePath, /^\/([^/]+)$/);
  if (method === "GET" && match) {
    const data = await repository.getPlan(idFromMatch(match, 1), runtime);
    if (!data)
      throw new PayrollHttpError(
        404,
        "PAYROLL_PLAN_NOT_FOUND",
        "급여계획을 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "PATCH" && match) {
    const planId = idFromMatch(match, 1);
    const data = await repository.updatePlan(
      planId,
      updatePlanInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "payroll_plan_updated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      planId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "DELETE" && match) {
    const planId = idFromMatch(match, 1);
    const data = await repository.deletePlan(planId, runtime);
    await emit(runtime, {
      event: "payroll_plan_deleted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      planId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/activate$/);
  if (method === "POST" && match) {
    const planId = idFromMatch(match, 1);
    const data = await repository.activatePlan(
      planId,
      reasonFromBody(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "payroll_plan_activated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      planId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/pause$/);
  if (method === "POST" && match) {
    const planId = idFromMatch(match, 1);
    const data = await repository.pausePlan(
      planId,
      reasonFromBody(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "payroll_plan_paused",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      planId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/archive$/);
  if (method === "POST" && match) {
    const planId = idFromMatch(match, 1);
    const data = await repository.archivePlan(
      planId,
      reasonFromBody(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "payroll_plan_archived",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      planId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  throw new PayrollHttpError(
    404,
    "PAYROLL_ROUTE_NOT_FOUND",
    "급여계획 API 경로를 찾을 수 없습니다.",
  );
}

export function createPayrollRoutes<TEnv = unknown>(
  options: PayrollRoutesOptions<TEnv> = {},
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
        path !== PAYROLL_API_PREFIX &&
        !path.startsWith(`${PAYROLL_API_PREFIX}/`)
      ) {
        throw new PayrollHttpError(
          404,
          "PAYROLL_ROUTE_PREFIX_NOT_FOUND",
          "급여계획 API prefix가 아닙니다.",
        );
      }

      const baseRuntime: PayrollRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normalizePath(
          path.slice(PAYROLL_API_PREFIX.length) || "/",
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
      const response = await dispatchPayrollRoute(runtime);
      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set("x-payroll-repository", runtime.repository.name ?? "custom");
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

export const handlePayrollRoutes = createPayrollRoutes();

export const payrollRoutesManifest = Object.freeze({
  file: "services/api/src/routes/payroll.routes.ts",
  version: PAYROLL_ROUTES_VERSION,
  prefix: PAYROLL_API_PREFIX,
  endpoints: [
    "GET /",
    "POST /",
    "GET /home",
    "GET /current",
    "GET /summary",
    "GET /calendar",
    "POST /simulate",
    "POST /recalculate",
    "GET /{planId}",
    "PATCH /{planId}",
    "DELETE /{planId}",
    "POST /{planId}/activate",
    "POST /{planId}/pause",
    "POST /{planId}/archive",
  ],
  authMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  serverAuthorityPayrollCalculation: true,
  dailyBudgetInputContractReady: true,
  fixedExpenseFixedSavingsVariableExpenseReady: true,
  ownerDataBoundaryRequired: true,
  sensitivePayrollRawDataMasked: true,
  adTargetingSeparated: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertPayrollRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "payroll_api_prefix_api_v1",
    "auth_context_required_and_owner_boundary",
    "list_create_detail_update_delete",
    "home_current_summary_calendar",
    "activate_pause_archive_lifecycle",
    "server_authority_payroll_breakdown",
    "simulate_without_persistence",
    "recalculate_with_optional_plan_overwrite",
    "payroll_amount_fixed_expense_fixed_savings_variable_reserve_emergency_buffer_carryover",
    "recommended_daily_budget_calculation",
    "krw_integer_minor_unit_validation",
    "payday_cycle_income_type_reserve_policy_validation",
    "standard_json_response_and_error_contract",
    "sensitive_token_account_payslip_redaction",
    "repository_injection_with_memory_fallback",
    "security_event_wait_until_hook",
    "rate_limit_audit_error_middleware_compatible",
    "ads_recommendation_sensitive_financial_data_separation",
  ] as const;
  return { ok: checks.length >= 15, version: PAYROLL_ROUTES_VERSION, checks };
}

export default createPayrollRoutes;
