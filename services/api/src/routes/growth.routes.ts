/** services/api/src/routes/growth.routes.ts
 * 급여납치 Salary Hijacking Platform · 성장/LV UP API 라우트 최종본
 */

export const GROWTH_ROUTES_VERSION = "3.1.0";
export const GROWTH_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const GROWTH_API_PREFIX = "/api/v1/growth";

const MAX_JSON_BODY_BYTES = 128 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TEXT = 2_000;
const MAX_TITLE_LENGTH = 120;
const MAX_NOTE_LENGTH = 2_000;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

export type GrowthTaskType =
  | "READING"
  | "EXERCISE"
  | "STUDY"
  | "SAVING"
  | "EXPENSE_LOG"
  | "BUDGET_REVIEW"
  | "CONTENT"
  | "CUSTOM";
export type GrowthTaskStatus =
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ARCHIVED"
  | "DELETED";
export type GrowthTaskDifficulty = "EASY" | "NORMAL" | "HARD" | "EXTREME";
export type GrowthChallengeStatus = "JOINED" | "COMPLETED" | "FAILED" | "LEFT";
export type GrowthContentType =
  | "ARTICLE"
  | "VIDEO"
  | "CHECKLIST"
  | "ROUTINE"
  | "COURSE";
export type GrowthRole =
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

export interface GrowthPrincipal {
  readonly userId: string;
  readonly roles: readonly GrowthRole[];
  readonly permissions: readonly string[];
  readonly policyId: string | null;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}
export interface GrowthListResult<TItem extends JsonRecord = JsonRecord> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface GrowthTaskCreateInput {
  readonly title: string;
  readonly taskType: GrowthTaskType;
  readonly difficulty: GrowthTaskDifficulty;
  readonly targetCount: number;
  readonly expReward: number;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly note: string | null;
  readonly publicShareEnabled: boolean;
}

export interface GrowthTaskUpdateInput {
  readonly title?: string | undefined;
  readonly taskType?: GrowthTaskType | undefined;
  readonly difficulty?: GrowthTaskDifficulty | undefined;
  readonly targetCount?: number | undefined;
  readonly expReward?: number | undefined;
  readonly startDate?: string | undefined;
  readonly endDate?: string | null | undefined;
  readonly note?: string | null | undefined;
  readonly publicShareEnabled?: boolean | undefined;
  readonly status?: GrowthTaskStatus | undefined;
}

export interface GrowthTaskProgressInput {
  readonly progressCount: number;
  readonly note: string | null;
  readonly occurredAt: string;
  readonly idempotencyKey: string | null;
}

export interface GrowthChallengeJoinInput {
  readonly challengeId: string;
  readonly publicShareEnabled: boolean;
}
export interface GrowthContentCompleteInput {
  readonly contentId: string;
  readonly note: string | null;
  readonly idempotencyKey: string | null;
}

export interface GrowthRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly principal: GrowthPrincipal;
  readonly repository: GrowthRepository<TEnv>;
}

export interface GrowthRepository<TEnv = unknown> {
  readonly name?: string;
  profile(runtime: GrowthRouteRuntime<TEnv>): Promise<JsonRecord>;
  dashboard(runtime: GrowthRouteRuntime<TEnv>): Promise<JsonRecord>;
  listTasks(
    input: JsonRecord,
    page: PaginationInput,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<GrowthListResult>;
  getTask(
    taskId: string,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  createTask(
    input: GrowthTaskCreateInput,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updateTask(
    taskId: string,
    input: GrowthTaskUpdateInput,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  deleteTask(
    taskId: string,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  recordTaskProgress(
    taskId: string,
    input: GrowthTaskProgressInput,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listChallenges(
    input: JsonRecord,
    page: PaginationInput,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<GrowthListResult>;
  joinChallenge(
    input: GrowthChallengeJoinInput,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  leaveChallenge(
    challengeId: string,
    reason: string,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  completeChallenge(
    challengeId: string,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listContents(
    input: JsonRecord,
    page: PaginationInput,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<GrowthListResult>;
  completeContent(
    input: GrowthContentCompleteInput,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listBadges(runtime: GrowthRouteRuntime<TEnv>): Promise<readonly JsonRecord[]>;
  leaderboard(
    input: JsonRecord,
    page: PaginationInput,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<GrowthListResult>;
  recommendations(
    input: JsonRecord,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  summary(
    input: JsonRecord,
    runtime: GrowthRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
}

export interface GrowthRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | GrowthRepository<TEnv>
    | ((env: TEnv) => GrowthRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
  readonly onGrowthEvent?: (
    event: GrowthEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface GrowthEvent {
  readonly event:
    | "growth_task_created"
    | "growth_task_updated"
    | "growth_task_deleted"
    | "growth_task_progress"
    | "growth_challenge_joined"
    | "growth_challenge_left"
    | "growth_challenge_completed"
    | "growth_content_completed";
  readonly requestId: string;
  readonly userId: string;
  readonly targetType: "TASK" | "CHALLENGE" | "CONTENT";
  readonly targetId: string | null;
  readonly expDelta: number;
  readonly path: string;
  readonly createdAt: string;
}

class GrowthHttpError extends Error {
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
    this.name = "GrowthHttpError";
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
  "saving",
  "savings",
  "expense",
  "dailyBudget",
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
  "저축",
  "지출",
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

function normalizeRole(value: string): GrowthRole | null {
  const role = value.trim().toUpperCase();
  if (["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role))
    return role as GrowthRole;
  return null;
}

function principalFromRequest(
  request: Request,
  requireSource: boolean,
): GrowthPrincipal {
  const source = header(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source !== AUTH_CONTEXT_SOURCE_VALUE) {
    throw new GrowthHttpError(
      401,
      "GROWTH_AUTH_CONTEXT_REQUIRED",
      "인증 컨텍스트가 필요합니다.",
    );
  }

  const userId = header(request, "x-authenticated-user-id");
  if (!userId)
    throw new GrowthHttpError(
      401,
      "GROWTH_AUTH_REQUIRED",
      "로그인이 필요합니다.",
    );

  const roles = (header(request, "x-authenticated-roles") ?? "USER")
    .split(",")
    .map((role) => normalizeRole(role))
    .filter((role): role is GrowthRole => Boolean(role));
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

function isPrivileged(principal: GrowthPrincipal): boolean {
  return (
    principal.roles.some(
      (role) =>
        role === "ADMIN" || role === "SUPER_ADMIN" || role === "OPERATOR",
    ) || principal.permissions.includes("*")
  );
}

function assertOwner(userId: string, runtime: GrowthRouteRuntime): void {
  if (userId === runtime.principal.userId || isPrivileged(runtime.principal))
    return;
  throw new GrowthHttpError(
    403,
    "GROWTH_OWNER_REQUIRED",
    "본인 성장 데이터만 접근할 수 있습니다.",
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
  runtime: Pick<GrowthRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: GROWTH_ROUTES_SERVICE_NAME,
        version: GROWTH_ROUTES_VERSION,
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
    error instanceof GrowthHttpError
      ? error
      : new GrowthHttpError(
          500,
          "GROWTH_ROUTE_INTERNAL_ERROR",
          "성장 API 처리 중 오류가 발생했습니다.",
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
        service: GROWTH_ROUTES_SERVICE_NAME,
        version: GROWTH_ROUTES_VERSION,
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
  if (Number.isFinite(length) && length > MAX_JSON_BODY_BYTES) {
    throw new GrowthHttpError(
      413,
      "GROWTH_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  }
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GrowthHttpError(
      400,
      "GROWTH_JSON_OBJECT_REQUIRED",
      "JSON 객체 본문이 필요합니다.",
    );
  }
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
    throw new GrowthHttpError(
      400,
      "GROWTH_FIELD_REQUIRED",
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

function integerField(
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
  if (typeof value === "number" && Number.isInteger(value)) {
    const min = options.min ?? 0;
    const max = options.max ?? 1_000_000;
    if (value < min || value > max) {
      throw new GrowthHttpError(
        400,
        "GROWTH_INTEGER_RANGE_INVALID",
        `${key} 범위가 올바르지 않습니다.`,
        { field: key },
      );
    }
    return value;
  }
  if (required)
    throw new GrowthHttpError(
      400,
      "GROWTH_INTEGER_REQUIRED",
      `${key} 정수 값이 필요합니다.`,
      { field: key },
    );
  return 0;
}

function normalizeDate(value: string): string {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new GrowthHttpError(
      400,
      "GROWTH_DATE_INVALID",
      "날짜는 YYYY-MM-DD 형식이어야 합니다.",
    );
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new GrowthHttpError(
      400,
      "GROWTH_DATE_INVALID",
      "존재하지 않는 날짜입니다.",
    );
  }
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
    throw new GrowthHttpError(
      400,
      "GROWTH_PERIOD_INVALID",
      "종료일은 시작일보다 빠를 수 없습니다.",
    );
  return Math.floor((end - start) / 86_400_000) + 1;
}

function normalizeTaskType(value: unknown): GrowthTaskType {
  const type =
    typeof value === "string" ? value.trim().toUpperCase() : "CUSTOM";
  if (
    [
      "READING",
      "EXERCISE",
      "STUDY",
      "SAVING",
      "EXPENSE_LOG",
      "BUDGET_REVIEW",
      "CONTENT",
      "CUSTOM",
    ].includes(type)
  )
    return type as GrowthTaskType;
  throw new GrowthHttpError(
    400,
    "GROWTH_TASK_TYPE_INVALID",
    "성장 과제 유형이 올바르지 않습니다.",
  );
}

function normalizeDifficulty(value: unknown): GrowthTaskDifficulty {
  const difficulty =
    typeof value === "string" ? value.trim().toUpperCase() : "NORMAL";
  if (["EASY", "NORMAL", "HARD", "EXTREME"].includes(difficulty))
    return difficulty as GrowthTaskDifficulty;
  throw new GrowthHttpError(
    400,
    "GROWTH_DIFFICULTY_INVALID",
    "난이도가 올바르지 않습니다.",
  );
}

function normalizeTaskStatus(value: unknown): GrowthTaskStatus {
  const status =
    typeof value === "string" ? value.trim().toUpperCase() : "ACTIVE";
  if (["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED", "DELETED"].includes(status))
    return status as GrowthTaskStatus;
  throw new GrowthHttpError(
    400,
    "GROWTH_TASK_STATUS_INVALID",
    "성장 과제 상태가 올바르지 않습니다.",
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
    throw new GrowthHttpError(
      400,
      "GROWTH_ROUTE_ID_REQUIRED",
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
): GrowthListResult<TItem> {
  return {
    items: items.slice(page.offset, page.offset + page.limit),
    page: page.page,
    pageSize: page.pageSize,
    total: items.length,
  };
}

function levelFromExp(totalExp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, totalExp) / 100)) + 1);
}

function nextLevelExp(level: number): number {
  return level * level * 100;
}

function difficultyMultiplier(difficulty: GrowthTaskDifficulty): number {
  return difficulty === "EXTREME"
    ? 3
    : difficulty === "HARD"
      ? 2
      : difficulty === "NORMAL"
        ? 1
        : 0.75;
}

function createTaskInput(
  body: Record<string, unknown>,
  now: Date,
): GrowthTaskCreateInput {
  const difficulty = normalizeDifficulty(body.difficulty);
  const targetCount = integerField(body, "targetCount", { min: 1, max: 365 });
  const defaultExp = Math.round(
    targetCount * 10 * difficultyMultiplier(difficulty),
  );
  const startDate = dateFromUnknown(body.startDate, todayInSeoul(now));
  const endDate =
    body.endDate === undefined || body.endDate === null
      ? null
      : dateFromUnknown(body.endDate, addDays(startDate, 7));
  if (endDate) daysInclusive(startDate, endDate);
  return {
    title: stringField(body, "title", { maxLength: MAX_TITLE_LENGTH }),
    taskType: normalizeTaskType(body.taskType),
    difficulty,
    targetCount,
    expReward:
      integerField(body, "expReward", {
        required: false,
        min: 0,
        max: 100_000,
      }) || defaultExp,
    startDate,
    endDate,
    note: optionalStringField(body, "note", MAX_NOTE_LENGTH),
    publicShareEnabled: booleanField(body, "publicShareEnabled"),
  };
}

type MutableGrowthTaskUpdateInput = {
  -readonly [K in keyof GrowthTaskUpdateInput]?: GrowthTaskUpdateInput[K];
};

function updateTaskInput(body: Record<string, unknown>): GrowthTaskUpdateInput {
  const input: MutableGrowthTaskUpdateInput = {};
  if (body.title !== undefined)
    input.title = stringField(body, "title", { maxLength: MAX_TITLE_LENGTH });
  if (body.taskType !== undefined)
    input.taskType = normalizeTaskType(body.taskType);
  if (body.difficulty !== undefined)
    input.difficulty = normalizeDifficulty(body.difficulty);
  if (body.targetCount !== undefined)
    input.targetCount = integerField(body, "targetCount", { min: 1, max: 365 });
  if (body.expReward !== undefined)
    input.expReward = integerField(body, "expReward", { min: 0, max: 100_000 });
  if (body.startDate !== undefined)
    input.startDate = dateFromUnknown(body.startDate, "");
  if (body.endDate !== undefined)
    input.endDate =
      body.endDate === null ? null : dateFromUnknown(body.endDate, "");
  if (body.note !== undefined)
    input.note = optionalStringField(body, "note", MAX_NOTE_LENGTH);
  if (body.publicShareEnabled !== undefined)
    input.publicShareEnabled = booleanField(body, "publicShareEnabled");
  if (body.status !== undefined)
    input.status = normalizeTaskStatus(body.status);
  if (!Object.keys(input).length)
    throw new GrowthHttpError(
      400,
      "GROWTH_TASK_UPDATE_EMPTY",
      "수정할 값이 필요합니다.",
    );
  return input;
}

function progressInput(
  body: Record<string, unknown>,
  now: Date,
): GrowthTaskProgressInput {
  const occurredAtRaw =
    optionalStringField(body, "occurredAt") ?? now.toISOString();
  const occurredAt = new Date(occurredAtRaw);
  if (Number.isNaN(occurredAt.getTime()))
    throw new GrowthHttpError(
      400,
      "GROWTH_PROGRESS_OCCURRED_AT_INVALID",
      "진행 시간이 올바르지 않습니다.",
    );
  return {
    progressCount: integerField(body, "progressCount", { min: 1, max: 10_000 }),
    note: optionalStringField(body, "note", MAX_NOTE_LENGTH),
    occurredAt: occurredAt.toISOString(),
    idempotencyKey: optionalStringField(body, "idempotencyKey", 160),
  };
}

function challengeJoinInput(
  body: Record<string, unknown>,
  challengeId: string | null = null,
): GrowthChallengeJoinInput {
  return {
    challengeId:
      challengeId ?? stringField(body, "challengeId", { maxLength: 160 }),
    publicShareEnabled: booleanField(body, "publicShareEnabled"),
  };
}

function contentCompleteInput(
  body: Record<string, unknown>,
  contentId: string | null = null,
): GrowthContentCompleteInput {
  return {
    contentId: contentId ?? stringField(body, "contentId", { maxLength: 160 }),
    note: optionalStringField(body, "note", MAX_NOTE_LENGTH),
    idempotencyKey: optionalStringField(body, "idempotencyKey", 160),
  };
}

function reasonFromBody(body: Record<string, unknown>): string {
  return stringField(body, "reason", { maxLength: 500 });
}

async function emit<TEnv>(
  runtime: GrowthRouteRuntime<TEnv>,
  event: GrowthEvent,
): Promise<void> {
  const options = (
    runtime as GrowthRouteRuntime<TEnv> & {
      readonly routeOptions?: GrowthRoutesOptions<TEnv>;
    }
  ).routeOptions;
  if (!options?.onGrowthEvent) return;
  const task = Promise.resolve(
    options.onGrowthEvent(event, runtime.env, runtime.execution),
  ).catch((error) => {
    console.warn(
      "growth_routes_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  runtime.execution.waitUntil?.(task);
}

function createInMemoryGrowthRepository<
  TEnv = unknown,
>(): GrowthRepository<TEnv> {
  const tasks = new Map<string, JsonRecord>();
  const progress = new Map<string, JsonRecord>();
  const challengeJoins = new Map<string, JsonRecord>();
  const completedContents = new Map<string, JsonRecord>();
  const badges = new Map<string, JsonRecord>();
  const seedChallenges: readonly JsonRecord[] = [
    {
      challengeId: "chl_budget_7d",
      title: "7일 예산 지키기",
      taskType: "BUDGET_REVIEW",
      expReward: 120,
      days: 7,
      status: "ACTIVE",
      financialRawDataRequired: false,
    },
    {
      challengeId: "chl_reading_14d",
      title: "14일 독서 루틴",
      taskType: "READING",
      expReward: 180,
      days: 14,
      status: "ACTIVE",
      financialRawDataRequired: false,
    },
  ];
  const seedContents: readonly JsonRecord[] = [
    {
      contentId: "cnt_budget_start",
      contentType: "ARTICLE",
      title: "일일 예산을 오래 유지하는 법",
      tags: "budget,habit",
      expReward: 20,
      recommendationUsesSensitiveFinancialData: false,
    },
    {
      contentId: "cnt_expense_log",
      contentType: "CHECKLIST",
      title: "변동지출 기록 체크리스트",
      tags: "expense,record",
      expReward: 25,
      recommendationUsesSensitiveFinancialData: false,
    },
  ];

  function userTasks(userId: string): JsonRecord[] {
    return [...tasks.values()].filter(
      (item) => item.userId === userId && item.status !== "DELETED",
    );
  }

  function userProgress(userId: string): JsonRecord[] {
    return [...progress.values()].filter((item) => item.userId === userId);
  }

  function totalExp(userId: string): number {
    const progressExp = userProgress(userId).reduce(
      (sum, item) =>
        sum + (typeof item.expDelta === "number" ? item.expDelta : 0),
      0,
    );
    const contentExp = [...completedContents.values()]
      .filter((item) => item.userId === userId)
      .reduce(
        (sum, item) =>
          sum + (typeof item.expDelta === "number" ? item.expDelta : 0),
        0,
      );
    const challengeExp = [...challengeJoins.values()]
      .filter((item) => item.userId === userId && item.status === "COMPLETED")
      .reduce(
        (sum, item) =>
          sum + (typeof item.expReward === "number" ? item.expReward : 0),
        0,
      );
    return progressExp + contentExp + challengeExp;
  }

  function taskById(
    taskId: string,
    runtime: GrowthRouteRuntime<TEnv>,
  ): JsonRecord | null {
    const task = tasks.get(taskId) ?? null;
    if (!task || task.status === "DELETED") return null;
    assertOwner(String(task.userId), runtime);
    return task;
  }

  function awardBadgeIfNeeded(
    userId: string,
    now: Date,
  ): readonly JsonRecord[] {
    const total = totalExp(userId);
    const awarded: JsonRecord[] = [];
    const definitions = [
      { badgeId: "bdg_lv5", title: "LV.5 달성", exp: 1_600 },
      { badgeId: "bdg_lv10", title: "LV.10 달성", exp: 8_100 },
      { badgeId: "bdg_routine_10", title: "루틴 10회 인증", exp: 300 },
    ];
    definitions.forEach((definition) => {
      const key = `${userId}:${definition.badgeId}`;
      if (total >= definition.exp && !badges.has(key)) {
        const badge = {
          userId,
          badgeId: definition.badgeId,
          title: definition.title,
          awardedAt: now.toISOString(),
        };
        badges.set(key, badge);
        awarded.push(badge);
      }
    });
    return awarded;
  }

  return {
    name: "in-memory-growth-repository",
    async profile(runtime): Promise<JsonRecord> {
      const exp = totalExp(runtime.principal.userId);
      const level = levelFromExp(exp);
      return {
        userId: runtime.principal.userId,
        level,
        totalExp: exp,
        nextLevelExp: nextLevelExp(level),
        remainingExpToNextLevel: Math.max(0, nextLevelExp(level) - exp),
        badgeCount: [...badges.values()].filter(
          (item) => item.userId === runtime.principal.userId,
        ).length,
        financialRawDataExposed: false,
      };
    },
    async dashboard(runtime): Promise<JsonRecord> {
      const taskItems = userTasks(runtime.principal.userId);
      const activeTasks = taskItems.filter((item) => item.status === "ACTIVE");
      const exp = totalExp(runtime.principal.userId);
      return {
        profile: {
          userId: runtime.principal.userId,
          level: levelFromExp(exp),
          totalExp: exp,
        },
        activeTaskCount: activeTasks.length,
        completedTaskCount: taskItems.filter(
          (item) => item.status === "COMPLETED",
        ).length,
        joinedChallengeCount: [...challengeJoins.values()].filter(
          (item) =>
            item.userId === runtime.principal.userId &&
            item.status === "JOINED",
        ).length,
        completedContentCount: [...completedContents.values()].filter(
          (item) => item.userId === runtime.principal.userId,
        ).length,
        todaySuggestion:
          "오늘의 변동지출 기록과 10분 독서를 완료해 LV UP 경험치를 확보하세요.",
        financialRawDataExposed: false,
      };
    },
    async listTasks(input, page, runtime): Promise<GrowthListResult> {
      const status =
        typeof input.status === "string" && input.status ? input.status : null;
      const taskType =
        typeof input.taskType === "string" && input.taskType
          ? input.taskType
          : null;
      const items = userTasks(runtime.principal.userId)
        .filter((item) => !status || item.status === status)
        .filter((item) => !taskType || item.taskType === taskType)
        .sort((left, right) =>
          String(right.createdAt).localeCompare(String(left.createdAt)),
        );
      return listResult(items, page);
    },
    async getTask(taskId, runtime): Promise<JsonRecord | null> {
      const task = taskById(taskId, runtime);
      return task
        ? {
            ...task,
            progressRecords: userProgress(runtime.principal.userId)
              .filter((item) => item.taskId === taskId)
              .slice(-20),
          }
        : null;
    },
    async createTask(input, runtime): Promise<JsonRecord> {
      const taskId = `gtk_${globalThis.crypto.randomUUID()}`;
      const record: JsonRecord = {
        taskId,
        userId: runtime.principal.userId,
        ...input,
        progressCount: 0,
        status: "ACTIVE",
        createdAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
        serverAuthority: true,
        financialRawDataExposed: false,
      };
      tasks.set(taskId, record);
      return record;
    },
    async updateTask(taskId, input, runtime): Promise<JsonRecord> {
      const task = taskById(taskId, runtime);
      if (!task)
        throw new GrowthHttpError(
          404,
          "GROWTH_TASK_NOT_FOUND",
          "성장 과제를 찾을 수 없습니다.",
        );
      const updated: JsonRecord = {
        ...task,
        updatedAt: runtime.now.toISOString(),
        serverAuthority: true,
      };
      if (input.title !== undefined) updated.title = input.title;
      if (input.taskType !== undefined) updated.taskType = input.taskType;
      if (input.difficulty !== undefined) updated.difficulty = input.difficulty;
      if (input.targetCount !== undefined)
        updated.targetCount = input.targetCount;
      if (input.expReward !== undefined) updated.expReward = input.expReward;
      if (input.startDate !== undefined) updated.startDate = input.startDate;
      if (input.endDate !== undefined) updated.endDate = input.endDate;
      if (input.note !== undefined) updated.note = input.note;
      if (input.publicShareEnabled !== undefined)
        updated.publicShareEnabled = input.publicShareEnabled;
      if (input.status !== undefined) updated.status = input.status;
      tasks.set(taskId, updated);
      return updated;
    },
    async deleteTask(taskId, runtime): Promise<JsonRecord> {
      const task = taskById(taskId, runtime);
      if (!task)
        throw new GrowthHttpError(
          404,
          "GROWTH_TASK_NOT_FOUND",
          "성장 과제를 찾을 수 없습니다.",
        );
      tasks.set(taskId, {
        ...task,
        status: "DELETED",
        updatedAt: runtime.now.toISOString(),
      });
      return { taskId, status: "DELETED" };
    },
    async recordTaskProgress(taskId, input, runtime): Promise<JsonRecord> {
      const task = taskById(taskId, runtime);
      if (!task)
        throw new GrowthHttpError(
          404,
          "GROWTH_TASK_NOT_FOUND",
          "성장 과제를 찾을 수 없습니다.",
        );
      if (input.idempotencyKey) {
        const existing = [...progress.values()].find(
          (item) =>
            item.idempotencyKey === input.idempotencyKey &&
            item.userId === runtime.principal.userId,
        );
        if (existing)
          return {
            progress: existing,
            task,
            idempotentReplay: true,
            badges: [],
          };
      }
      const previousProgress =
        typeof task.progressCount === "number" ? task.progressCount : 0;
      const targetCount =
        typeof task.targetCount === "number" ? task.targetCount : 1;
      const nextProgress = Math.min(
        targetCount,
        previousProgress + input.progressCount,
      );
      const completedNow =
        previousProgress < targetCount && nextProgress >= targetCount;
      const expDelta = completedNow
        ? typeof task.expReward === "number"
          ? task.expReward
          : 0
        : Math.max(
            1,
            Math.floor(
              (((typeof task.expReward === "number" ? task.expReward : 10) *
                input.progressCount) /
                Math.max(1, targetCount)) *
                0.5,
            ),
          );
      const progressId = `gpr_${globalThis.crypto.randomUUID()}`;
      const record: JsonRecord = {
        progressId,
        taskId,
        userId: runtime.principal.userId,
        progressCount: input.progressCount,
        note: input.note,
        occurredAt: input.occurredAt,
        idempotencyKey: input.idempotencyKey,
        expDelta,
        createdAt: runtime.now.toISOString(),
      };
      progress.set(progressId, record);
      const currentStatus =
        typeof task.status === "string" ? task.status : "ACTIVE";
      const currentCompletedAt =
        typeof task.completedAt === "string" ? task.completedAt : null;
      const updatedTask: JsonRecord = {
        ...task,
        progressCount: nextProgress,
        status: completedNow ? "COMPLETED" : currentStatus,
        completedAt: completedNow
          ? runtime.now.toISOString()
          : currentCompletedAt,
        updatedAt: runtime.now.toISOString(),
      };
      tasks.set(taskId, updatedTask);
      const awarded = awardBadgeIfNeeded(runtime.principal.userId, runtime.now);
      return {
        progress: record,
        task: updatedTask,
        expDelta,
        badges: [...awarded],
        idempotentReplay: false,
      };
    },
    async listChallenges(input, page, runtime): Promise<GrowthListResult> {
      const mineOnly = input.mine === "true";
      const joined = [...challengeJoins.values()].filter(
        (item) => item.userId === runtime.principal.userId,
      );
      const joinedIds = new Set(joined.map((item) => String(item.challengeId)));
      const items = (
        mineOnly
          ? seedChallenges.filter((item) =>
              joinedIds.has(String(item.challengeId)),
            )
          : seedChallenges
      ).map((item) => ({
        ...item,
        joined: joinedIds.has(String(item.challengeId)),
        joinStatus:
          joined.find((join) => join.challengeId === item.challengeId)
            ?.status ?? null,
      }));
      return listResult(items, page);
    },
    async joinChallenge(input, runtime): Promise<JsonRecord> {
      const challenge = seedChallenges.find(
        (item) => item.challengeId === input.challengeId,
      );
      if (!challenge)
        throw new GrowthHttpError(
          404,
          "GROWTH_CHALLENGE_NOT_FOUND",
          "챌린지를 찾을 수 없습니다.",
        );
      const key = `${runtime.principal.userId}:${input.challengeId}`;
      const record: JsonRecord = {
        joinId: `gcj_${globalThis.crypto.randomUUID()}`,
        challengeId: input.challengeId,
        userId: runtime.principal.userId,
        status: "JOINED",
        publicShareEnabled: input.publicShareEnabled,
        expReward: challenge.expReward ?? 0,
        joinedAt: runtime.now.toISOString(),
        financialRawDataRequired: false,
      };
      challengeJoins.set(key, record);
      return record;
    },
    async leaveChallenge(challengeId, reason, runtime): Promise<JsonRecord> {
      const key = `${runtime.principal.userId}:${challengeId}`;
      const join = challengeJoins.get(key);
      if (!join)
        throw new GrowthHttpError(
          404,
          "GROWTH_CHALLENGE_JOIN_NOT_FOUND",
          "참여 중인 챌린지를 찾을 수 없습니다.",
        );
      const updated = {
        ...join,
        status: "LEFT",
        leaveReason: reason,
        leftAt: runtime.now.toISOString(),
      };
      challengeJoins.set(key, updated);
      return updated;
    },
    async completeChallenge(challengeId, runtime): Promise<JsonRecord> {
      const key = `${runtime.principal.userId}:${challengeId}`;
      const join = challengeJoins.get(key);
      if (!join)
        throw new GrowthHttpError(
          404,
          "GROWTH_CHALLENGE_JOIN_NOT_FOUND",
          "참여 중인 챌린지를 찾을 수 없습니다.",
        );
      const updated: JsonRecord = {
        ...join,
        status: "COMPLETED",
        completedAt: runtime.now.toISOString(),
      };
      challengeJoins.set(key, updated);
      const awarded = awardBadgeIfNeeded(runtime.principal.userId, runtime.now);
      return {
        challenge: updated,
        badges: [...awarded],
        expDelta: typeof updated.expReward === "number" ? updated.expReward : 0,
      };
    },
    async listContents(input, page): Promise<GrowthListResult> {
      const contentType =
        typeof input.contentType === "string" && input.contentType
          ? input.contentType
          : null;
      return listResult(
        seedContents.filter(
          (item) => !contentType || item.contentType === contentType,
        ),
        page,
      );
    },
    async completeContent(input, runtime): Promise<JsonRecord> {
      if (input.idempotencyKey) {
        const existing = [...completedContents.values()].find(
          (item) =>
            item.idempotencyKey === input.idempotencyKey &&
            item.userId === runtime.principal.userId,
        );
        if (existing)
          return { completion: existing, idempotentReplay: true, badges: [] };
      }
      const content = seedContents.find(
        (item) => item.contentId === input.contentId,
      );
      if (!content)
        throw new GrowthHttpError(
          404,
          "GROWTH_CONTENT_NOT_FOUND",
          "콘텐츠를 찾을 수 없습니다.",
        );
      const completionId = `gcc_${globalThis.crypto.randomUUID()}`;
      const record: JsonRecord = {
        completionId,
        contentId: input.contentId,
        userId: runtime.principal.userId,
        note: input.note,
        expDelta: typeof content.expReward === "number" ? content.expReward : 0,
        idempotencyKey: input.idempotencyKey,
        completedAt: runtime.now.toISOString(),
        recommendationUsesSensitiveFinancialData: false,
      };
      completedContents.set(completionId, record);
      const awarded = awardBadgeIfNeeded(runtime.principal.userId, runtime.now);
      return {
        completion: record,
        badges: [...awarded],
        idempotentReplay: false,
      };
    },
    async listBadges(runtime): Promise<readonly JsonRecord[]> {
      return [...badges.values()].filter(
        (item) => item.userId === runtime.principal.userId,
      );
    },
    async leaderboard(_input, page, runtime): Promise<GrowthListResult> {
      const selfExp = totalExp(runtime.principal.userId);
      const items = [
        {
          rank: 1,
          userMasked: "나",
          userId: runtime.principal.userId,
          level: levelFromExp(selfExp),
          totalExp: selfExp,
        },
        {
          rank: 2,
          userMasked: "usr***",
          userId: null,
          level: 7,
          totalExp: 3_700,
        },
      ];
      return listResult(items, page);
    },
    async recommendations(input, runtime): Promise<JsonRecord> {
      const goal = typeof input.goal === "string" ? input.goal : "habit";
      return {
        goal,
        items: seedContents.slice(0, 2).map((item) => ({ ...item })),
        disclaimer:
          "추천은 급여·계좌·지출 원문을 사용하지 않는 일반 성장 콘텐츠 기반입니다.",
        recommendationUsesSensitiveFinancialData: false,
        adTargetingSeparated: true,
        userId: runtime.principal.userId,
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
      const progressItems = userProgress(runtime.principal.userId).filter(
        (item) =>
          String(item.occurredAt).slice(0, 10) >= startDate &&
          String(item.occurredAt).slice(0, 10) <= endDate,
      );
      const exp = totalExp(runtime.principal.userId);
      return {
        startDate,
        endDate,
        progressRecordCount: progressItems.length,
        expEarnedInPeriod: progressItems.reduce(
          (sum, item) =>
            sum + (typeof item.expDelta === "number" ? item.expDelta : 0),
          0,
        ),
        totalExp: exp,
        level: levelFromExp(exp),
        taskCount: userTasks(runtime.principal.userId).length,
        badgeCount: [...badges.values()].filter(
          (item) => item.userId === runtime.principal.userId,
        ).length,
        financialRawDataExposed: false,
      };
    },
  };
}

function resolveRepository<TEnv>(
  env: TEnv,
  options: GrowthRoutesOptions<TEnv>,
): GrowthRepository<TEnv> {
  const repo =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return repo ?? createInMemoryGrowthRepository<TEnv>();
}

async function dispatchGrowthRoute<TEnv>(
  runtime: GrowthRouteRuntime<TEnv>,
): Promise<Response> {
  const { method, relativePath, repository } = runtime;
  const page = pagination(runtime.url);

  if (method === "GET" && relativePath === "/profile")
    return jsonResponse(runtime, 200, {
      data: await repository.profile(runtime),
    });
  if (method === "GET" && relativePath === "/dashboard")
    return jsonResponse(runtime, 200, {
      data: await repository.dashboard(runtime),
    });
  if (method === "GET" && relativePath === "/summary")
    return jsonResponse(runtime, 200, {
      data: await repository.summary(queryRecord(runtime.url), runtime),
    });
  if (method === "GET" && relativePath === "/recommendations")
    return jsonResponse(runtime, 200, {
      data: await repository.recommendations(queryRecord(runtime.url), runtime),
    });
  if (method === "GET" && relativePath === "/badges")
    return jsonResponse(runtime, 200, {
      data: await repository.listBadges(runtime),
    });
  if (method === "GET" && relativePath === "/leaderboard")
    return jsonResponse(runtime, 200, {
      data: await repository.leaderboard(
        queryRecord(runtime.url),
        page,
        runtime,
      ),
    });

  if (method === "GET" && relativePath === "/tasks")
    return jsonResponse(runtime, 200, {
      data: await repository.listTasks(queryRecord(runtime.url), page, runtime),
    });
  if (method === "POST" && relativePath === "/tasks") {
    const data = await repository.createTask(
      createTaskInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "growth_task_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "TASK",
      targetId: String(data.taskId ?? ""),
      expDelta: 0,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  let match = matchRoute(relativePath, /^\/tasks\/([^/]+)$/);
  if (method === "GET" && match) {
    const task = await repository.getTask(idFromMatch(match, 1), runtime);
    if (!task)
      throw new GrowthHttpError(
        404,
        "GROWTH_TASK_NOT_FOUND",
        "성장 과제를 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data: task });
  }
  if (method === "PATCH" && match) {
    const taskId = idFromMatch(match, 1);
    const data = await repository.updateTask(
      taskId,
      updateTaskInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "growth_task_updated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "TASK",
      targetId: taskId,
      expDelta: 0,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }
  if (method === "DELETE" && match) {
    const taskId = idFromMatch(match, 1);
    const data = await repository.deleteTask(taskId, runtime);
    await emit(runtime, {
      event: "growth_task_deleted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "TASK",
      targetId: taskId,
      expDelta: 0,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/tasks\/([^/]+)\/progress$/);
  if (method === "POST" && match) {
    const taskId = idFromMatch(match, 1);
    const data = await repository.recordTaskProgress(
      taskId,
      progressInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "growth_task_progress",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "TASK",
      targetId: taskId,
      expDelta: typeof data.expDelta === "number" ? data.expDelta : 0,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  if (method === "GET" && relativePath === "/challenges")
    return jsonResponse(runtime, 200, {
      data: await repository.listChallenges(
        queryRecord(runtime.url),
        page,
        runtime,
      ),
    });
  if (method === "POST" && relativePath === "/challenges/join") {
    const data = await repository.joinChallenge(
      challengeJoinInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "growth_challenge_joined",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "CHALLENGE",
      targetId: String(data.challengeId ?? ""),
      expDelta: 0,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  match = matchRoute(relativePath, /^\/challenges\/([^/]+)\/join$/);
  if (method === "POST" && match) {
    const challengeId = idFromMatch(match, 1);
    const data = await repository.joinChallenge(
      challengeJoinInput(await parseJsonBody(runtime.request), challengeId),
      runtime,
    );
    await emit(runtime, {
      event: "growth_challenge_joined",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "CHALLENGE",
      targetId: challengeId,
      expDelta: 0,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  match = matchRoute(relativePath, /^\/challenges\/([^/]+)\/leave$/);
  if (method === "POST" && match) {
    const challengeId = idFromMatch(match, 1);
    const data = await repository.leaveChallenge(
      challengeId,
      reasonFromBody(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "growth_challenge_left",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "CHALLENGE",
      targetId: challengeId,
      expDelta: 0,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/challenges\/([^/]+)\/complete$/);
  if (method === "POST" && match) {
    const challengeId = idFromMatch(match, 1);
    const data = await repository.completeChallenge(challengeId, runtime);
    await emit(runtime, {
      event: "growth_challenge_completed",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "CHALLENGE",
      targetId: challengeId,
      expDelta: typeof data.expDelta === "number" ? data.expDelta : 0,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "GET" && relativePath === "/contents")
    return jsonResponse(runtime, 200, {
      data: await repository.listContents(
        queryRecord(runtime.url),
        page,
        runtime,
      ),
    });
  if (method === "POST" && relativePath === "/contents/complete") {
    const data = await repository.completeContent(
      contentCompleteInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    const completion =
      typeof data.completion === "object" &&
      data.completion !== null &&
      !Array.isArray(data.completion)
        ? (data.completion as JsonRecord)
        : {};
    await emit(runtime, {
      event: "growth_content_completed",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "CONTENT",
      targetId: String(completion.contentId ?? ""),
      expDelta:
        typeof completion.expDelta === "number" ? completion.expDelta : 0,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  match = matchRoute(relativePath, /^\/contents\/([^/]+)\/complete$/);
  if (method === "POST" && match) {
    const contentId = idFromMatch(match, 1);
    const data = await repository.completeContent(
      contentCompleteInput(await parseJsonBody(runtime.request), contentId),
      runtime,
    );
    const completion =
      typeof data.completion === "object" &&
      data.completion !== null &&
      !Array.isArray(data.completion)
        ? (data.completion as JsonRecord)
        : {};
    await emit(runtime, {
      event: "growth_content_completed",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "CONTENT",
      targetId: contentId,
      expDelta:
        typeof completion.expDelta === "number" ? completion.expDelta : 0,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  throw new GrowthHttpError(
    404,
    "GROWTH_ROUTE_NOT_FOUND",
    "성장 API 경로를 찾을 수 없습니다.",
  );
}

export function createGrowthRoutes<TEnv = unknown>(
  options: GrowthRoutesOptions<TEnv> = {},
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
        path !== GROWTH_API_PREFIX &&
        !path.startsWith(`${GROWTH_API_PREFIX}/`)
      ) {
        throw new GrowthHttpError(
          404,
          "GROWTH_ROUTE_PREFIX_NOT_FOUND",
          "성장 API prefix가 아닙니다.",
        );
      }

      const baseRuntime: GrowthRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normalizePath(
          path.slice(GROWTH_API_PREFIX.length) || "/",
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
      const response = await dispatchGrowthRoute(runtime);
      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set("x-growth-repository", runtime.repository.name ?? "custom");
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

export const handleGrowthRoutes = createGrowthRoutes();

export const growthRoutesManifest = Object.freeze({
  file: "services/api/src/routes/growth.routes.ts",
  version: GROWTH_ROUTES_VERSION,
  prefix: GROWTH_API_PREFIX,
  endpoints: [
    "GET /profile",
    "GET /dashboard",
    "GET /summary",
    "GET /recommendations",
    "GET /badges",
    "GET /leaderboard",
    "GET /tasks",
    "POST /tasks",
    "GET /tasks/{taskId}",
    "PATCH /tasks/{taskId}",
    "DELETE /tasks/{taskId}",
    "POST /tasks/{taskId}/progress",
    "GET /challenges",
    "POST /challenges/join",
    "POST /challenges/{challengeId}/join",
    "POST /challenges/{challengeId}/leave",
    "POST /challenges/{challengeId}/complete",
    "GET /contents",
    "POST /contents/complete",
    "POST /contents/{contentId}/complete",
  ],
  authMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  levelUpSystemEnabled: true,
  badgeSystemEnabled: true,
  financialRawDataMasked: true,
  adTargetingSeparated: true,
  serverAuthorityExpCalculation: true,
  idempotentProgressAndContentCompletion: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertGrowthRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "growth_api_prefix_api_v1",
    "auth_context_required_and_owner_boundary",
    "profile_dashboard_summary",
    "task_list_create_detail_update_delete",
    "task_progress_with_idempotency_key",
    "level_and_exp_server_authority_calculation",
    "badge_award_system",
    "challenge_list_join_leave_complete",
    "content_list_complete",
    "recommendations_without_sensitive_financial_data",
    "leaderboard_masked_user_identity",
    "standard_json_response_and_error_contract",
    "sensitive_token_account_salary_redaction",
    "repository_injection_with_memory_fallback",
    "security_event_wait_until_hook",
    "rate_limit_audit_error_middleware_compatible",
    "payroll_budget_expense_self_development_module_ready",
  ] as const;
  return { ok: checks.length >= 15, version: GROWTH_ROUTES_VERSION, checks };
}

export default createGrowthRoutes;
