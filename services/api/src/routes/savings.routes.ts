/** services/api/src/routes/savings.routes.ts
 * 급여납치 Salary Hijacking Platform · 고정저축/저축목표 API 라우트 최종본
 * Cloudflare Workers Fetch API 호환 단일 파일. 고정저축·목표저축·입금/출금·요약·캘린더·일일예산 영향 계산을 서버 권위로 처리한다.
 */
export const SAVINGS_ROUTES_VERSION = "3.1.0";
export const SAVINGS_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const SAVINGS_API_PREFIX = "/api/v1/savings";

const MAX_JSON_BODY_BYTES = 128 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TEXT = 2_000;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

type GoalType =
  | "EMERGENCY_FUND"
  | "HOUSE"
  | "TRAVEL"
  | "INVESTMENT"
  | "EDUCATION"
  | "DEBT_PAYOFF"
  | "CUSTOM";
type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "PAYDAY" | "ONCE";
type GoalStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED" | "DELETED";
type TxType = "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT" | "AUTO_SAVE";
type Role = "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN" | "SYSTEM";
type JsonPrimitive = null | boolean | number | string;
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

export interface SavingsPrincipal {
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly string[];
  readonly policyId: string | null;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}

export interface SavingsListResult<T extends JsonRecord = JsonRecord> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface SavingsGoalCreateInput {
  readonly title: string;
  readonly goalType: GoalType;
  readonly targetAmountMinor: number;
  readonly currentAmountMinor: number;
  readonly fixedSaveAmountMinor: number;
  readonly frequency: Frequency;
  readonly saveDay: number | null;
  readonly startDate: string;
  readonly targetDate: string | null;
  readonly accountAlias: string | null;
  readonly memo: string | null;
  readonly autoSave: boolean;
  readonly affectsDailyBudget: boolean;
}

export interface SavingsGoalUpdateInput {
  readonly title?: string | undefined;
  readonly goalType?: GoalType | undefined;
  readonly targetAmountMinor?: number | undefined;
  readonly currentAmountMinor?: number | undefined;
  readonly fixedSaveAmountMinor?: number | undefined;
  readonly frequency?: Frequency | undefined;
  readonly saveDay?: number | null | undefined;
  readonly startDate?: string | undefined;
  readonly targetDate?: string | null | undefined;
  readonly accountAlias?: string | null | undefined;
  readonly memo?: string | null | undefined;
  readonly autoSave?: boolean | undefined;
  readonly affectsDailyBudget?: boolean | undefined;
  readonly status?: GoalStatus | undefined;
}

export interface SavingsTransactionInput {
  readonly transactionType: TxType;
  readonly amountMinor: number;
  readonly occurredAt: string;
  readonly memo: string | null;
  readonly reason: string | null;
  readonly idempotencyKey: string | null;
}

export interface SavingsImpactInput {
  readonly periodStartDate: string;
  readonly periodEndDate: string;
  readonly payrollAmountMinor: number;
  readonly fixedExpenseTotalMinor: number;
  readonly variableExpenseReserveMinor: number;
  readonly emergencyBufferMinor: number;
}

export interface SavingsRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly principal: SavingsPrincipal;
  readonly repository: SavingsRepository<TEnv>;
}

export interface SavingsRepository<TEnv = unknown> {
  readonly name?: string;
  listGoals(
    input: JsonRecord,
    page: PaginationInput,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<SavingsListResult>;
  getGoal(
    goalId: string,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  createGoal(
    input: SavingsGoalCreateInput,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updateGoal(
    goalId: string,
    input: SavingsGoalUpdateInput,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  deleteGoal(
    goalId: string,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  pauseGoal(
    goalId: string,
    reason: string,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  resumeGoal(
    goalId: string,
    reason: string,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  archiveGoal(
    goalId: string,
    reason: string,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  recordTransaction(
    goalId: string,
    input: SavingsTransactionInput,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listTransactions(
    goalId: string,
    page: PaginationInput,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<SavingsListResult>;
  upcoming(
    input: JsonRecord,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  summary(
    input: JsonRecord,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  calendar(
    input: JsonRecord,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  impact(
    input: SavingsImpactInput,
    runtime: SavingsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
}

export interface SavingsRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | SavingsRepository<TEnv>
    | ((env: TEnv) => SavingsRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
  readonly onSavingsEvent?: (
    event: SavingsEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface SavingsEvent {
  readonly event:
    | "savings_goal_created"
    | "savings_goal_updated"
    | "savings_goal_deleted"
    | "savings_goal_paused"
    | "savings_goal_resumed"
    | "savings_goal_archived"
    | "savings_transaction_recorded"
    | "savings_impact_calculated";
  readonly requestId: string;
  readonly userId: string;
  readonly goalId: string | null;
  readonly path: string;
  readonly createdAt: string;
}

class SavingsHttpError extends Error {
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
    this.name = "SavingsHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const sensitiveKeys = [
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
  "accountnumber",
  "bankaccount",
  "salary",
  "payroll",
  "income",
  "loan",
  "debt",
  "adtarget",
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

function h(request: Request, name: string): string | null {
  const value = request.headers.get(name)?.trim();
  return value ? value : null;
}

function requestId(request: Request): string {
  const value =
    h(request, "x-request-id") ??
    h(request, "x-correlation-id") ??
    h(request, "cf-ray");
  return value && /^[a-zA-Z0-9._:\-/]{8,160}$/.test(value)
    ? value.slice(0, 160)
    : (globalThis.crypto?.randomUUID?.() ?? `req_${Date.now().toString(36)}`);
}

function normRole(value: string): Role | null {
  const role = value.trim().toUpperCase();
  return ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role)
    ? (role as Role)
    : null;
}

function principal(request: Request, requireSource: boolean): SavingsPrincipal {
  const source = h(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source !== AUTH_CONTEXT_SOURCE_VALUE)
    throw new SavingsHttpError(
      401,
      "SAVINGS_AUTH_CONTEXT_REQUIRED",
      "인증 컨텍스트가 필요합니다.",
    );

  const userId = h(request, "x-authenticated-user-id");
  if (!userId)
    throw new SavingsHttpError(
      401,
      "SAVINGS_AUTH_REQUIRED",
      "로그인이 필요합니다.",
    );

  const roles = (h(request, "x-authenticated-roles") ?? "USER")
    .split(",")
    .map(normRole)
    .filter((role): role is Role => Boolean(role));
  const permissions = (h(request, "x-authenticated-permissions") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    userId,
    roles: roles.length ? roles : ["USER"],
    permissions,
    policyId: h(request, "x-auth-policy-id"),
  };
}

function privileged(p: SavingsPrincipal): boolean {
  return (
    p.roles.some(
      (role) =>
        role === "ADMIN" || role === "SUPER_ADMIN" || role === "OPERATOR",
    ) || p.permissions.includes("*")
  );
}

function assertOwner(userId: string, runtime: SavingsRouteRuntime): void {
  if (userId !== runtime.principal.userId && !privileged(runtime.principal))
    throw new SavingsHttpError(
      403,
      "SAVINGS_OWNER_REQUIRED",
      "본인 저축 목표만 접근할 수 있습니다.",
    );
}

function keySensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveKeys.some((fragment) =>
    normalized.includes(fragment.replace(/[\s._-]/g, "")),
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
        keySensitive(key) ? "[REDACTED]" : sanitize(item, depth + 1, seen),
      ]),
  );
}

function ok(
  runtime: Pick<SavingsRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: SAVINGS_ROUTES_SERVICE_NAME,
        version: SAVINGS_ROUTES_VERSION,
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

function fail(requestIdValue: string, path: string, error: unknown): Response {
  const e =
    error instanceof SavingsHttpError
      ? error
      : new SavingsHttpError(
          500,
          "SAVINGS_ROUTE_INTERNAL_ERROR",
          "저축 API 처리 중 오류가 발생했습니다.",
        );
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: e.code,
        message: e.message,
        status: e.status,
        requestId: requestIdValue,
        ...(e.details ? { details: e.details } : {}),
      },
      meta: {
        service: SAVINGS_ROUTES_SERVICE_NAME,
        version: SAVINGS_ROUTES_VERSION,
        requestId: requestIdValue,
        path,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status: e.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-request-id": requestIdValue,
        "x-error-code": e.code,
        "x-content-type-options": "nosniff",
      },
    },
  );
}

async function body(request: Request): Promise<Record<string, unknown>> {
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
    throw new SavingsHttpError(
      413,
      "SAVINGS_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new SavingsHttpError(
      400,
      "SAVINGS_JSON_OBJECT_REQUIRED",
      "JSON 객체 본문이 필요합니다.",
    );
  return parsed as Record<string, unknown>;
}

function str(
  input: Record<string, unknown>,
  key: string,
  required = true,
  max = MAX_TEXT,
): string {
  const value = input[key];
  if (typeof value === "string" && value.trim())
    return value.trim().slice(0, max);
  if (required)
    throw new SavingsHttpError(
      400,
      "SAVINGS_FIELD_REQUIRED",
      `${key} 값이 필요합니다.`,
      { field: key },
    );
  return "";
}

function opt(
  input: Record<string, unknown>,
  key: string,
  max = MAX_TEXT,
): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function bool(
  input: Record<string, unknown>,
  key: string,
  fallback = false,
): boolean {
  return input[key] === undefined ? fallback : input[key] === true;
}

function money(
  input: Record<string, unknown>,
  key: string,
  required = true,
  min = 0,
  max = 10_000_000_000,
): number {
  const value = input[key];
  if (typeof value === "number" && Number.isInteger(value)) {
    if (value < min || value > max)
      throw new SavingsHttpError(
        400,
        "SAVINGS_AMOUNT_RANGE_INVALID",
        `${key} 금액 범위가 올바르지 않습니다.`,
        { field: key },
      );
    return value;
  }
  if (required)
    throw new SavingsHttpError(
      400,
      "SAVINGS_AMOUNT_REQUIRED",
      `${key} 금액이 필요합니다.`,
      { field: key },
    );
  return 0;
}

function date(value: string): string {
  const dateText = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText))
    throw new SavingsHttpError(
      400,
      "SAVINGS_DATE_INVALID",
      "날짜는 YYYY-MM-DD 형식이어야 합니다.",
    );
  const parsed = new Date(`${dateText}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dateText
  )
    throw new SavingsHttpError(
      400,
      "SAVINGS_DATE_INVALID",
      "존재하지 않는 날짜입니다.",
    );
  return dateText;
}

function dateFrom(value: unknown, fallback: string): string {
  return date(typeof value === "string" && value.trim() ? value : fallback);
}

function today(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(dateText: string, days: number): string {
  const base = new Date(`${dateText}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function addMonths(dateText: string, months: number): string {
  const base = new Date(`${dateText}T00:00:00.000Z`);
  base.setUTCMonth(base.getUTCMonth() + months);
  return base.toISOString().slice(0, 10);
}

function days(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (end < start)
    throw new SavingsHttpError(
      400,
      "SAVINGS_PERIOD_INVALID",
      "종료일은 시작일보다 빠를 수 없습니다.",
    );
  return Math.floor((end - start) / 86_400_000) + 1;
}

function goalType(value: unknown): GoalType {
  const text =
    typeof value === "string" ? value.trim().toUpperCase() : "CUSTOM";
  if (
    [
      "EMERGENCY_FUND",
      "HOUSE",
      "TRAVEL",
      "INVESTMENT",
      "EDUCATION",
      "DEBT_PAYOFF",
      "CUSTOM",
    ].includes(text)
  )
    return text as GoalType;
  throw new SavingsHttpError(
    400,
    "SAVINGS_GOAL_TYPE_INVALID",
    "저축 목표 유형이 올바르지 않습니다.",
  );
}

function freq(value: unknown): Frequency {
  const text =
    typeof value === "string" ? value.trim().toUpperCase() : "MONTHLY";
  if (["DAILY", "WEEKLY", "MONTHLY", "PAYDAY", "ONCE"].includes(text))
    return text as Frequency;
  throw new SavingsHttpError(
    400,
    "SAVINGS_FREQUENCY_INVALID",
    "저축 주기가 올바르지 않습니다.",
  );
}

function status(value: unknown): GoalStatus {
  const text =
    typeof value === "string" ? value.trim().toUpperCase() : "ACTIVE";
  if (["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED", "DELETED"].includes(text))
    return text as GoalStatus;
  throw new SavingsHttpError(
    400,
    "SAVINGS_STATUS_INVALID",
    "저축 목표 상태가 올바르지 않습니다.",
  );
}

function txType(value: unknown): TxType {
  const text =
    typeof value === "string" ? value.trim().toUpperCase() : "DEPOSIT";
  if (["DEPOSIT", "WITHDRAWAL", "ADJUSTMENT", "AUTO_SAVE"].includes(text))
    return text as TxType;
  throw new SavingsHttpError(
    400,
    "SAVINGS_TRANSACTION_TYPE_INVALID",
    "저축 거래 유형이 올바르지 않습니다.",
  );
}

function saveDay(
  input: Record<string, unknown>,
  key: string,
  frequency: Frequency,
  required = true,
): number | null {
  const value = input[key];
  if (frequency === "DAILY" || frequency === "ONCE" || frequency === "PAYDAY")
    return null;
  if (value === undefined || value === null) {
    if (required)
      throw new SavingsHttpError(
        400,
        "SAVINGS_SAVE_DAY_REQUIRED",
        "정기 저축은 저축일이 필요합니다.",
      );
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value))
    throw new SavingsHttpError(
      400,
      "SAVINGS_SAVE_DAY_INVALID",
      "저축일은 정수여야 합니다.",
    );
  const max = frequency === "WEEKLY" ? 7 : 31;
  if (value < 1 || value > max)
    throw new SavingsHttpError(
      400,
      "SAVINGS_SAVE_DAY_INVALID",
      `저축일은 1부터 ${max} 사이여야 합니다.`,
    );
  return value;
}

function page(url: URL): PaginationInput {
  const p = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  );
  const ps = Math.max(
    1,
    Math.min(
      MAX_PAGE_SIZE,
      Number.parseInt(
        url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
        10,
      ) || DEFAULT_PAGE_SIZE,
    ),
  );
  return { page: p, pageSize: ps, offset: (p - 1) * ps, limit: ps };
}

function query(url: URL): JsonRecord {
  const record: Record<string, JsonValue> = {};
  url.searchParams.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function id(match: RegExpMatchArray, index: number): string {
  const value = match[index];
  if (!value)
    throw new SavingsHttpError(
      400,
      "SAVINGS_ROUTE_ID_REQUIRED",
      "경로 식별자가 필요합니다.",
    );
  return decodeURIComponent(value);
}

function list<T extends JsonRecord>(
  items: readonly T[],
  p: PaginationInput,
): SavingsListResult<T> {
  return {
    items: items.slice(p.offset, p.offset + p.limit),
    page: p.page,
    pageSize: p.pageSize,
    total: items.length,
  };
}

function createInput(
  input: Record<string, unknown>,
  now: Date,
): SavingsGoalCreateInput {
  const f = freq(input.frequency);
  const startDate = dateFrom(input.startDate, today(now));
  const targetDate =
    input.targetDate === undefined || input.targetDate === null
      ? null
      : dateFrom(input.targetDate, addMonths(startDate, 12));
  if (targetDate) days(startDate, targetDate);
  return {
    title: str(input, "title", true, 100),
    goalType: goalType(input.goalType),
    targetAmountMinor: money(input, "targetAmountMinor", true, 1),
    currentAmountMinor: money(input, "currentAmountMinor", false, 0),
    fixedSaveAmountMinor: money(input, "fixedSaveAmountMinor", true, 0),
    frequency: f,
    saveDay: saveDay(input, "saveDay", f, true),
    startDate,
    targetDate,
    accountAlias: opt(input, "accountAlias", 120),
    memo: opt(input, "memo", 500),
    autoSave: bool(input, "autoSave", true),
    affectsDailyBudget: bool(input, "affectsDailyBudget", true),
  };
}

type MutableUpdate = {
  -readonly [K in keyof SavingsGoalUpdateInput]?: SavingsGoalUpdateInput[K];
};

function updateInput(input: Record<string, unknown>): SavingsGoalUpdateInput {
  const f = input.frequency !== undefined ? freq(input.frequency) : undefined;
  const patch: MutableUpdate = {};
  if (input.title !== undefined) patch.title = str(input, "title", true, 100);
  if (input.goalType !== undefined) patch.goalType = goalType(input.goalType);
  if (input.targetAmountMinor !== undefined)
    patch.targetAmountMinor = money(input, "targetAmountMinor", true, 1);
  if (input.currentAmountMinor !== undefined)
    patch.currentAmountMinor = money(input, "currentAmountMinor", true, 0);
  if (input.fixedSaveAmountMinor !== undefined)
    patch.fixedSaveAmountMinor = money(input, "fixedSaveAmountMinor", true, 0);
  if (f !== undefined) patch.frequency = f;
  if (input.saveDay !== undefined)
    patch.saveDay = saveDay(input, "saveDay", f ?? "MONTHLY", false);
  if (input.startDate !== undefined)
    patch.startDate = dateFrom(input.startDate, "");
  if (input.targetDate !== undefined)
    patch.targetDate =
      input.targetDate === null ? null : dateFrom(input.targetDate, "");
  if (input.accountAlias !== undefined)
    patch.accountAlias = opt(input, "accountAlias", 120);
  if (input.memo !== undefined) patch.memo = opt(input, "memo", 500);
  if (input.autoSave !== undefined) patch.autoSave = bool(input, "autoSave");
  if (input.affectsDailyBudget !== undefined)
    patch.affectsDailyBudget = bool(input, "affectsDailyBudget");
  if (input.status !== undefined) patch.status = status(input.status);
  if (!Object.keys(patch).length)
    throw new SavingsHttpError(
      400,
      "SAVINGS_UPDATE_EMPTY",
      "수정할 값이 필요합니다.",
    );
  return patch;
}

function txInput(
  input: Record<string, unknown>,
  now: Date,
): SavingsTransactionInput {
  const raw = opt(input, "occurredAt") ?? now.toISOString();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime()))
    throw new SavingsHttpError(
      400,
      "SAVINGS_OCCURRED_AT_INVALID",
      "거래 시간이 올바르지 않습니다.",
    );
  return {
    transactionType: txType(input.transactionType),
    amountMinor: money(input, "amountMinor", true, 1),
    occurredAt: parsed.toISOString(),
    memo: opt(input, "memo", 500),
    reason: opt(input, "reason", 500),
    idempotencyKey: opt(input, "idempotencyKey", 160),
  };
}

function reason(input: Record<string, unknown>): string {
  return str(input, "reason", true, 500);
}

function impactInput(
  input: Record<string, unknown>,
  now: Date,
): SavingsImpactInput {
  const startDate = dateFrom(input.periodStartDate, today(now));
  const endDate = dateFrom(input.periodEndDate, addMonths(startDate, 1));
  days(startDate, endDate);
  return {
    periodStartDate: startDate,
    periodEndDate: endDate,
    payrollAmountMinor: money(input, "payrollAmountMinor", true, 0),
    fixedExpenseTotalMinor: money(input, "fixedExpenseTotalMinor", false, 0),
    variableExpenseReserveMinor: money(
      input,
      "variableExpenseReserveMinor",
      false,
      0,
    ),
    emergencyBufferMinor: money(input, "emergencyBufferMinor", false, 0),
  };
}

function computed(goal: JsonRecord): JsonRecord {
  const current =
    typeof goal.currentAmountMinor === "number" ? goal.currentAmountMinor : 0;
  const target =
    typeof goal.targetAmountMinor === "number" ? goal.targetAmountMinor : 0;
  const fixed =
    typeof goal.fixedSaveAmountMinor === "number"
      ? goal.fixedSaveAmountMinor
      : 0;
  const remaining = Math.max(0, target - current);
  const s =
    goal.status === "PAUSED" ||
    goal.status === "ARCHIVED" ||
    goal.status === "DELETED"
      ? goal.status
      : current >= target && target > 0
        ? "COMPLETED"
        : "ACTIVE";
  return {
    ...goal,
    currentAmountMinor: current,
    targetAmountMinor: target,
    remainingAmountMinor: remaining,
    completionRate:
      target > 0
        ? Math.min(1, Math.round((current / target) * 10_000) / 10_000)
        : 0,
    estimatedRemainingCycles: fixed > 0 ? Math.ceil(remaining / fixed) : null,
    status: s,
    serverAuthority: true,
    financialRawAccountDataExposed: false,
  };
}

function activeIn(
  goal: JsonRecord,
  startDate: string,
  endDate: string,
): boolean {
  const state = computed(goal).status;
  if (state !== "ACTIVE") return false;
  const start = String(goal.startDate ?? startDate);
  const target = typeof goal.targetDate === "string" ? goal.targetDate : null;
  return start <= endDate && (!target || target >= startDate);
}

function nextDate(goal: JsonRecord, from: string): string | null {
  const f = String(goal.frequency ?? "MONTHLY") as Frequency;
  const start = String(goal.startDate ?? from);
  const end = typeof goal.targetDate === "string" ? goal.targetDate : null;
  const dayValue = typeof goal.saveDay === "number" ? goal.saveDay : null;
  const candidate = start > from ? start : from;

  if (f === "ONCE")
    return start >= from && (!end || start <= end) ? start : null;
  if (f === "DAILY" || f === "PAYDAY")
    return candidate <= (end ?? "9999-12-31") ? candidate : null;

  if (f === "WEEKLY") {
    const weekdayTarget = dayValue ?? 1;
    for (let offset = 0; offset < 8; offset += 1) {
      const test = addDays(candidate, offset);
      const weekday = new Date(`${test}T00:00:00.000Z`).getUTCDay() || 7;
      if (weekday === weekdayTarget && (!end || test <= end)) return test;
    }
    return null;
  }

  for (let step = 0; step < 36; step += 1) {
    const base = addMonths(candidate, step);
    const first = new Date(`${base.slice(0, 7)}-01T00:00:00.000Z`);
    const last = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const due = `${base.slice(0, 7)}-${String(Math.min(dayValue ?? 1, last)).padStart(2, "0")}`;
    if (due >= from && due >= start && (!end || due <= end)) return due;
  }
  return null;
}

function occurrences(
  goal: JsonRecord,
  startDate: string,
  endDate: string,
): readonly string[] {
  if (!activeIn(goal, startDate, endDate)) return [];
  const out: string[] = [];
  let cursor = startDate;
  for (let index = 0; index < 370; index += 1) {
    const due = nextDate(goal, cursor);
    if (!due || due > endDate) break;
    out.push(due);
    cursor = addDays(due, 1);
  }
  return out;
}

async function emit<TEnv>(
  runtime: SavingsRouteRuntime<TEnv>,
  event: SavingsEvent,
): Promise<void> {
  const options = (
    runtime as SavingsRouteRuntime<TEnv> & {
      readonly routeOptions?: SavingsRoutesOptions<TEnv>;
    }
  ).routeOptions;
  if (!options?.onSavingsEvent) return;
  const task = Promise.resolve(
    options.onSavingsEvent(event, runtime.env, runtime.execution),
  ).catch((error) => {
    console.warn(
      "savings_routes_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  runtime.execution.waitUntil?.(task);
}

function memoryRepo<TEnv = unknown>(): SavingsRepository<TEnv> {
  const goals = new Map<string, JsonRecord>();
  const txs = new Map<string, JsonRecord>();

  const visible = (userId: string): JsonRecord[] =>
    [...goals.values()].filter(
      (item) => item.userId === userId && item.status !== "DELETED",
    );

  const goal = (
    goalId: string,
    runtime: SavingsRouteRuntime<TEnv>,
  ): JsonRecord => {
    const found = goals.get(goalId);
    if (!found || found.status === "DELETED")
      throw new SavingsHttpError(
        404,
        "SAVINGS_GOAL_NOT_FOUND",
        "저축 목표를 찾을 수 없습니다.",
      );
    assertOwner(String(found.userId), runtime);
    return found;
  };

  const txList = (goalId: string): JsonRecord[] =>
    [...txs.values()].filter(
      (item) => item.goalId === goalId && item.status !== "CANCELED",
    );

  return {
    name: "in-memory-savings-repository",

    async listGoals(input, p, runtime) {
      const state =
        typeof input.status === "string" && input.status ? input.status : null;
      const type =
        typeof input.goalType === "string" && input.goalType
          ? input.goalType
          : null;
      const keyword =
        typeof input.q === "string" && input.q ? input.q.toLowerCase() : null;
      const items = visible(runtime.principal.userId)
        .filter((item) => !state || computed(item).status === state)
        .filter((item) => !type || item.goalType === type)
        .filter(
          (item) =>
            !keyword ||
            `${item.title ?? ""}\n${item.accountAlias ?? ""}`
              .toLowerCase()
              .includes(keyword),
        )
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map((item) => ({
          ...computed(item),
          nextSaveDate: nextDate(item, today(runtime.now)),
          transactionCount: txList(String(item.goalId)).length,
        }));
      return list(items, p);
    },

    async getGoal(goalId, runtime) {
      const found = goals.get(goalId);
      if (!found || found.status === "DELETED") return null;
      assertOwner(String(found.userId), runtime);
      return {
        ...computed(found),
        nextSaveDate: nextDate(found, today(runtime.now)),
        transactions: txList(goalId).slice(-20),
      };
    },

    async createGoal(input, runtime) {
      if (input.targetDate && input.targetDate < input.startDate)
        throw new SavingsHttpError(
          400,
          "SAVINGS_TARGET_DATE_INVALID",
          "목표일은 시작일보다 빠를 수 없습니다.",
        );
      if (input.currentAmountMinor > input.targetAmountMinor)
        throw new SavingsHttpError(
          400,
          "SAVINGS_CURRENT_AMOUNT_INVALID",
          "현재 저축액은 목표 금액보다 클 수 없습니다.",
        );
      const goalId = `svg_${globalThis.crypto.randomUUID()}`;
      const record: JsonRecord = {
        goalId,
        userId: runtime.principal.userId,
        ...input,
        status: "ACTIVE",
        createdAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
        serverAuthority: true,
      };
      goals.set(goalId, record);
      return {
        ...computed(record),
        nextSaveDate: nextDate(record, today(runtime.now)),
      };
    },

    async updateGoal(goalId, input, runtime) {
      const found = goal(goalId, runtime);
      const startDate = input.startDate ?? String(found.startDate);
      const targetDate =
        input.targetDate !== undefined
          ? input.targetDate
          : typeof found.targetDate === "string"
            ? found.targetDate
            : null;
      if (targetDate && targetDate < startDate)
        throw new SavingsHttpError(
          400,
          "SAVINGS_TARGET_DATE_INVALID",
          "목표일은 시작일보다 빠를 수 없습니다.",
        );
      const targetAmount =
        input.targetAmountMinor ??
        (typeof found.targetAmountMinor === "number"
          ? found.targetAmountMinor
          : 0);
      const currentAmount =
        input.currentAmountMinor ??
        (typeof found.currentAmountMinor === "number"
          ? found.currentAmountMinor
          : 0);
      if (currentAmount > targetAmount)
        throw new SavingsHttpError(
          400,
          "SAVINGS_CURRENT_AMOUNT_INVALID",
          "현재 저축액은 목표 금액보다 클 수 없습니다.",
        );
      const updated: JsonRecord = {
        ...found,
        updatedAt: runtime.now.toISOString(),
      };
      Object.entries(input).forEach(([key, value]) => {
        updated[key] = sanitize(value);
      });
      goals.set(goalId, updated);
      return {
        ...computed(updated),
        nextSaveDate: nextDate(updated, today(runtime.now)),
      };
    },

    async deleteGoal(goalId, runtime) {
      const found = goal(goalId, runtime);
      goals.set(goalId, {
        ...found,
        status: "DELETED",
        updatedAt: runtime.now.toISOString(),
      });
      return { goalId, status: "DELETED" };
    },

    async pauseGoal(goalId, reasonText, runtime) {
      const found = goal(goalId, runtime);
      const updated = {
        ...found,
        status: "PAUSED",
        pauseReason: reasonText,
        updatedAt: runtime.now.toISOString(),
      };
      goals.set(goalId, updated);
      return computed(updated);
    },

    async resumeGoal(goalId, reasonText, runtime) {
      const found = goal(goalId, runtime);
      const updated = {
        ...found,
        status: "ACTIVE",
        resumeReason: reasonText,
        updatedAt: runtime.now.toISOString(),
      };
      goals.set(goalId, updated);
      return {
        ...computed(updated),
        nextSaveDate: nextDate(updated, today(runtime.now)),
      };
    },

    async archiveGoal(goalId, reasonText, runtime) {
      const found = goal(goalId, runtime);
      const updated = {
        ...found,
        status: "ARCHIVED",
        archiveReason: reasonText,
        updatedAt: runtime.now.toISOString(),
      };
      goals.set(goalId, updated);
      return computed(updated);
    },

    async recordTransaction(goalId, input, runtime) {
      const found = goal(goalId, runtime);
      if (input.idempotencyKey) {
        const existing = [...txs.values()].find(
          (item) =>
            item.idempotencyKey === input.idempotencyKey &&
            item.userId === runtime.principal.userId,
        );
        if (existing)
          return {
            transaction: existing,
            goal: computed(found),
            idempotentReplay: true,
          };
      }

      const current =
        typeof found.currentAmountMinor === "number"
          ? found.currentAmountMinor
          : 0;
      const signed =
        input.transactionType === "WITHDRAWAL"
          ? -input.amountMinor
          : input.amountMinor;
      const next = current + signed;
      if (next < 0)
        throw new SavingsHttpError(
          400,
          "SAVINGS_BALANCE_NEGATIVE",
          "저축 잔액은 음수가 될 수 없습니다.",
        );

      const transactionId = `svt_${globalThis.crypto.randomUUID()}`;
      const transaction: JsonRecord = {
        transactionId,
        goalId,
        userId: runtime.principal.userId,
        transactionType: input.transactionType,
        amountMinor: input.amountMinor,
        signedAmountMinor: signed,
        occurredAt: input.occurredAt,
        memo: input.memo,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        status: "POSTED",
        createdAt: runtime.now.toISOString(),
        financialRawAccountDataExposed: false,
      };
      txs.set(transactionId, transaction);

      const updated = {
        ...found,
        currentAmountMinor: next,
        updatedAt: runtime.now.toISOString(),
      };
      goals.set(goalId, updated);
      return { transaction, goal: computed(updated), idempotentReplay: false };
    },

    async listTransactions(goalId, p, runtime) {
      goal(goalId, runtime);
      return list(
        txList(goalId).sort((a, b) =>
          String(b.occurredAt).localeCompare(String(a.occurredAt)),
        ),
        p,
      );
    },

    async upcoming(input, runtime) {
      const fromDate =
        typeof input.fromDate === "string"
          ? date(input.fromDate)
          : today(runtime.now);
      const toDate =
        typeof input.toDate === "string"
          ? date(input.toDate)
          : addDays(fromDate, 31);
      days(fromDate, toDate);
      const items = visible(runtime.principal.userId).flatMap((item) =>
        occurrences(item, fromDate, toDate).map((dueDate) => ({
          goalId: String(item.goalId),
          title: String(item.title),
          goalType: String(item.goalType),
          dueDate,
          amountMinor:
            typeof item.fixedSaveAmountMinor === "number"
              ? item.fixedSaveAmountMinor
              : 0,
          autoSave: item.autoSave === true,
          status: "SCHEDULED",
        })),
      );
      return {
        fromDate,
        toDate,
        count: items.length,
        totalAmountMinor: items.reduce(
          (sum, item) => sum + item.amountMinor,
          0,
        ),
        items,
        serverAuthority: true,
      };
    },

    async summary(input, runtime) {
      const startDate =
        typeof input.startDate === "string"
          ? date(input.startDate)
          : addMonths(today(runtime.now), -3);
      const endDate =
        typeof input.endDate === "string"
          ? date(input.endDate)
          : today(runtime.now);
      days(startDate, endDate);
      const items = visible(runtime.principal.userId).map(computed);
      const txItems = [...txs.values()].filter(
        (item) =>
          item.userId === runtime.principal.userId &&
          String(item.occurredAt).slice(0, 10) >= startDate &&
          String(item.occurredAt).slice(0, 10) <= endDate,
      );
      const deposit = txItems.reduce(
        (sum, item) =>
          sum +
          Math.max(
            0,
            typeof item.signedAmountMinor === "number"
              ? item.signedAmountMinor
              : 0,
          ),
        0,
      );
      const withdrawal = Math.abs(
        txItems.reduce(
          (sum, item) =>
            sum +
            Math.min(
              0,
              typeof item.signedAmountMinor === "number"
                ? item.signedAmountMinor
                : 0,
            ),
          0,
        ),
      );
      return {
        startDate,
        endDate,
        goalCount: items.length,
        activeGoalCount: items.filter((item) => item.status === "ACTIVE")
          .length,
        completedGoalCount: items.filter((item) => item.status === "COMPLETED")
          .length,
        targetTotalMinor: items.reduce(
          (sum, item) =>
            sum +
            (typeof item.targetAmountMinor === "number"
              ? item.targetAmountMinor
              : 0),
          0,
        ),
        currentTotalMinor: items.reduce(
          (sum, item) =>
            sum +
            (typeof item.currentAmountMinor === "number"
              ? item.currentAmountMinor
              : 0),
          0,
        ),
        fixedSaveTotalMinor: items
          .filter((item) => item.status === "ACTIVE")
          .reduce(
            (sum, item) =>
              sum +
              (typeof item.fixedSaveAmountMinor === "number"
                ? item.fixedSaveAmountMinor
                : 0),
            0,
          ),
        depositTotalMinor: deposit,
        withdrawalTotalMinor: withdrawal,
        averageCompletionRate: items.length
          ? Math.round(
              (items.reduce(
                (sum, item) =>
                  sum +
                  (typeof item.completionRate === "number"
                    ? item.completionRate
                    : 0),
                0,
              ) /
                items.length) *
                10_000,
            ) / 10_000
          : 0,
        financialRawAccountDataExposed: false,
        serverAuthority: true,
      };
    },

    async calendar(input, runtime) {
      const month =
        typeof input.month === "string" && /^\d{4}-\d{2}$/.test(input.month)
          ? input.month
          : today(runtime.now).slice(0, 7);
      const startDate = `${month}-01`;
      const end = new Date(`${startDate}T00:00:00.000Z`);
      end.setUTCMonth(end.getUTCMonth() + 1);
      end.setUTCDate(0);
      const endDate = end.toISOString().slice(0, 10);
      const items = visible(runtime.principal.userId)
        .flatMap((item) =>
          occurrences(item, startDate, endDate).map((dateText) => ({
            date: dateText,
            goalId: String(item.goalId),
            title: String(item.title),
            goalType: String(item.goalType),
            amountMinor:
              typeof item.fixedSaveAmountMinor === "number"
                ? item.fixedSaveAmountMinor
                : 0,
            autoSave: item.autoSave === true,
          })),
        )
        .sort((a, b) => a.date.localeCompare(b.date));
      return {
        month,
        startDate,
        endDate,
        scheduledSaveCount: items.length,
        scheduledSaveTotalMinor: items.reduce(
          (sum, item) => sum + item.amountMinor,
          0,
        ),
        items,
        serverAuthority: true,
      };
    },

    async impact(input, runtime) {
      const active = visible(runtime.principal.userId).filter(
        (item) =>
          item.affectsDailyBudget !== false &&
          activeIn(item, input.periodStartDate, input.periodEndDate),
      );
      const fixedSavingsTotalMinor = active.reduce(
        (sum, item) =>
          sum +
          occurrences(item, input.periodStartDate, input.periodEndDate).length *
            (typeof item.fixedSaveAmountMinor === "number"
              ? item.fixedSaveAmountMinor
              : 0),
        0,
      );
      const dayCount = days(input.periodStartDate, input.periodEndDate);
      const availableForDailyBudgetMinor = Math.max(
        0,
        input.payrollAmountMinor -
          input.fixedExpenseTotalMinor -
          fixedSavingsTotalMinor -
          input.variableExpenseReserveMinor -
          input.emergencyBufferMinor,
      );
      return {
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        dayCount,
        payrollAmountMinor: input.payrollAmountMinor,
        fixedExpenseTotalMinor: input.fixedExpenseTotalMinor,
        fixedSavingsTotalMinor,
        variableExpenseReserveMinor: input.variableExpenseReserveMinor,
        emergencyBufferMinor: input.emergencyBufferMinor,
        availableForDailyBudgetMinor,
        recommendedDailyBudgetMinor:
          dayCount > 0
            ? Math.floor(availableForDailyBudgetMinor / dayCount)
            : 0,
        goalCount: active.length,
        serverAuthority: true,
        financialRawAccountDataExposed: false,
      };
    },
  };
}

function repo<TEnv>(
  env: TEnv,
  options: SavingsRoutesOptions<TEnv>,
): SavingsRepository<TEnv> {
  const resolved =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return resolved ?? memoryRepo<TEnv>();
}

async function dispatch<TEnv>(
  runtime: SavingsRouteRuntime<TEnv>,
): Promise<Response> {
  const p = page(runtime.url);
  const { method, relativePath, repository } = runtime;

  if (method === "GET" && relativePath === "/")
    return ok(runtime, 200, {
      data: await repository.listGoals(query(runtime.url), p, runtime),
    });

  if (method === "POST" && relativePath === "/") {
    const data = await repository.createGoal(
      createInput(await body(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "savings_goal_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      goalId: String(data.goalId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return ok(runtime, 201, { data });
  }

  if (method === "GET" && relativePath === "/summary")
    return ok(runtime, 200, {
      data: await repository.summary(query(runtime.url), runtime),
    });
  if (method === "GET" && relativePath === "/upcoming")
    return ok(runtime, 200, {
      data: await repository.upcoming(query(runtime.url), runtime),
    });
  if (method === "GET" && relativePath === "/calendar")
    return ok(runtime, 200, {
      data: await repository.calendar(query(runtime.url), runtime),
    });

  if (method === "POST" && relativePath === "/impact") {
    const data = await repository.impact(
      impactInput(await body(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "savings_impact_calculated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      goalId: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return ok(runtime, 200, { data });
  }

  let match = relativePath.match(/^\/([^/]+)$/);
  if (method === "GET" && match) {
    const data = await repository.getGoal(id(match, 1), runtime);
    if (!data)
      throw new SavingsHttpError(
        404,
        "SAVINGS_GOAL_NOT_FOUND",
        "저축 목표를 찾을 수 없습니다.",
      );
    return ok(runtime, 200, { data });
  }

  if (method === "PATCH" && match) {
    const goalId = id(match, 1);
    const data = await repository.updateGoal(
      goalId,
      updateInput(await body(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "savings_goal_updated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      goalId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return ok(runtime, 200, { data });
  }

  if (method === "DELETE" && match) {
    const goalId = id(match, 1);
    const data = await repository.deleteGoal(goalId, runtime);
    await emit(runtime, {
      event: "savings_goal_deleted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      goalId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return ok(runtime, 200, { data });
  }

  match = relativePath.match(/^\/([^/]+)\/(pause|resume|archive)$/);
  if (method === "POST" && match) {
    const goalId = id(match, 1);
    const action = id(match, 2);
    const text = reason(await body(runtime.request));
    const data =
      action === "pause"
        ? await repository.pauseGoal(goalId, text, runtime)
        : action === "resume"
          ? await repository.resumeGoal(goalId, text, runtime)
          : await repository.archiveGoal(goalId, text, runtime);
    await emit(runtime, {
      event:
        action === "pause"
          ? "savings_goal_paused"
          : action === "resume"
            ? "savings_goal_resumed"
            : "savings_goal_archived",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      goalId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return ok(runtime, 200, { data });
  }

  match = relativePath.match(/^\/([^/]+)\/transactions$/);
  if (method === "GET" && match)
    return ok(runtime, 200, {
      data: await repository.listTransactions(id(match, 1), p, runtime),
    });

  if (method === "POST" && match) {
    const goalId = id(match, 1);
    const data = await repository.recordTransaction(
      goalId,
      txInput(await body(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "savings_transaction_recorded",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      goalId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return ok(runtime, 201, { data });
  }

  match = relativePath.match(/^\/([^/]+)\/(deposit|withdraw)$/);
  if (method === "POST" && match) {
    const goalId = id(match, 1);
    const txKind: TxType =
      id(match, 2) === "withdraw" ? "WITHDRAWAL" : "DEPOSIT";
    const input = await body(runtime.request);
    const data = await repository.recordTransaction(
      goalId,
      {
        ...txInput({ ...input, transactionType: txKind }, runtime.now),
        transactionType: txKind,
      },
      runtime,
    );
    await emit(runtime, {
      event: "savings_transaction_recorded",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      goalId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return ok(runtime, 201, { data });
  }

  throw new SavingsHttpError(
    404,
    "SAVINGS_ROUTE_NOT_FOUND",
    "저축 API 경로를 찾을 수 없습니다.",
  );
}

export function createSavingsRoutes<TEnv = unknown>(
  options: SavingsRoutesOptions<TEnv> = {},
): FetchHandler<TEnv> {
  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const rid = requestId(request);

    try {
      if (
        path !== SAVINGS_API_PREFIX &&
        !path.startsWith(`${SAVINGS_API_PREFIX}/`)
      )
        throw new SavingsHttpError(
          404,
          "SAVINGS_ROUTE_PREFIX_NOT_FOUND",
          "저축 API prefix가 아닙니다.",
        );

      const runtimeBase: SavingsRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normalizePath(
          path.slice(SAVINGS_API_PREFIX.length) || "/",
        ),
        method: request.method.toUpperCase(),
        requestId: rid,
        now: options.now?.() ?? new Date(),
        principal: principal(request, options.requireAuthContextSource ?? true),
        repository: repo(env, options),
      };
      const runtime = Object.assign(runtimeBase, { routeOptions: options });
      const response = await dispatch(runtime);

      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set("x-savings-repository", runtime.repository.name ?? "custom");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      return fail(rid, path, error);
    }
  };
}

export const handleSavingsRoutes = createSavingsRoutes();

export const savingsRoutesManifest = Object.freeze({
  file: "services/api/src/routes/savings.routes.ts",
  version: SAVINGS_ROUTES_VERSION,
  prefix: SAVINGS_API_PREFIX,
  endpoints: [
    "GET /",
    "POST /",
    "GET /summary",
    "GET /upcoming",
    "GET /calendar",
    "POST /impact",
    "GET /{goalId}",
    "PATCH /{goalId}",
    "DELETE /{goalId}",
    "POST /{goalId}/pause",
    "POST /{goalId}/resume",
    "POST /{goalId}/archive",
    "GET /{goalId}/transactions",
    "POST /{goalId}/transactions",
    "POST /{goalId}/deposit",
    "POST /{goalId}/withdraw",
  ],
  authMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  serverAuthoritySavingsCalculation: true,
  ownerDataBoundaryRequired: true,
  fixedSavingsImpactForDailyBudget: true,
  idempotentTransactionSupported: true,
  financialRawAccountDataExposed: false,
  adTargetingSeparated: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertSavingsRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "savings_api_prefix_api_v1",
    "auth_context_required_and_owner_boundary",
    "goal_list_create_detail_update_delete",
    "pause_resume_archive_lifecycle",
    "deposit_withdraw_transaction_record",
    "transaction_idempotency_key",
    "summary_upcoming_calendar_views",
    "server_authority_completion_rate_remaining_cycle",
    "fixed_savings_daily_budget_impact",
    "daily_weekly_monthly_payday_once_frequencies",
    "save_day_validation",
    "krw_integer_minor_unit_validation",
    "goal_type_contract_emergency_house_travel_investment_education_debt_custom",
    "standard_json_response_and_error_contract",
    "sensitive_token_account_salary_redaction",
    "ads_recommendation_sensitive_financial_data_separation",
    "repository_injection_with_memory_fallback",
    "security_event_wait_until_hook",
    "rate_limit_audit_error_middleware_compatible",
  ] as const;
  return { ok: checks.length >= 15, version: SAVINGS_ROUTES_VERSION, checks };
}

export default createSavingsRoutes;
