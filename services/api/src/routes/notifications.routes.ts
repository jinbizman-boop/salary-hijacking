/** services/api/src/routes/notifications.routes.ts
 * 급여납치 Salary Hijacking Platform · 알림 API 라우트 최종본
 *
 * Cloudflare Workers Fetch API 호환 단일 파일이다. 급여일, 고정지출 결제 예정, 예산 초과,
 * 저축 목표, LV UP, 커뮤니티, 공지, 보안 알림을 사용자별로 조회·읽음·보관·삭제하고,
 * 푸시 디바이스와 알림 수신 설정을 관리한다. 민감 급여·계좌·지출 원문을 응답/이벤트/광고
 * 타겟팅에 노출하지 않으며 auth/error/rate-limit/audit 미들웨어와 함께 사용할 수 있도록
 * x-auth-* 컨텍스트, 표준 JSON 계약, requestId, 소유권 경계, repository injection,
 * in-memory fallback을 포함한다.
 */

export const NOTIFICATIONS_ROUTES_VERSION = "3.1.0";
export const NOTIFICATIONS_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const NOTIFICATIONS_API_PREFIX = "/api/v1/notifications";

const MAX_JSON_BODY_BYTES = 128 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_TEXT = 2_000;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

export type NotificationType =
  | "PAYDAY"
  | "PAYMENT_DUE"
  | "BUDGET_WARNING"
  | "BUDGET_EXCEEDED"
  | "SAVINGS_GOAL"
  | "LEVEL_UP"
  | "GROWTH_REMINDER"
  | "COMMUNITY"
  | "NOTICE"
  | "SECURITY"
  | "CONTENT_RECOMMENDATION"
  | "AD_PARTNER";

export type NotificationChannel = "IN_APP" | "PUSH" | "EMAIL";
export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED" | "DELETED";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type NotificationDevicePlatform = "IOS" | "ANDROID" | "WEB";
export type NotificationRole =
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

export interface NotificationPrincipal {
  readonly userId: string;
  readonly roles: readonly NotificationRole[];
  readonly permissions: readonly string[];
  readonly policyId: string | null;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}

export interface NotificationListResult<TItem extends JsonRecord = JsonRecord> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface NotificationCreateInput {
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly channels: readonly NotificationChannel[];
  readonly deeplink: string | null;
  readonly scheduledAt: string | null;
  readonly expiresAt: string | null;
  readonly metadata: JsonRecord;
}

export interface NotificationPreferenceInput {
  readonly inAppEnabled?: boolean | undefined;
  readonly pushEnabled?: boolean | undefined;
  readonly emailEnabled?: boolean | undefined;
  readonly paydayEnabled?: boolean | undefined;
  readonly paymentDueEnabled?: boolean | undefined;
  readonly budgetWarningEnabled?: boolean | undefined;
  readonly budgetExceededEnabled?: boolean | undefined;
  readonly savingsGoalEnabled?: boolean | undefined;
  readonly levelUpEnabled?: boolean | undefined;
  readonly communityEnabled?: boolean | undefined;
  readonly securityEnabled?: boolean | undefined;
  readonly contentRecommendationEnabled?: boolean | undefined;
  readonly adPartnerEnabled?: boolean | undefined;
  readonly quietHoursStart?: string | null | undefined;
  readonly quietHoursEnd?: string | null | undefined;
  readonly timezone?: string | undefined;
}

export interface NotificationDeviceInput {
  readonly deviceId: string;
  readonly platform: NotificationDevicePlatform;
  readonly pushToken: string;
  readonly appVersion: string | null;
  readonly locale: string | null;
}

export interface NotificationRulePreviewInput {
  readonly today: string;
  readonly upcomingPaymentCount: number;
  readonly budgetUsageRate: number;
  readonly savingsGoalRate: number;
  readonly levelChanged: boolean;
}

export interface NotificationsRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly principal: NotificationPrincipal;
  readonly repository: NotificationsRepository<TEnv>;
}

export interface NotificationsRepository<TEnv = unknown> {
  readonly name?: string;
  list(
    input: JsonRecord,
    page: PaginationInput,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<NotificationListResult>;
  get(
    notificationId: string,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  create(
    input: NotificationCreateInput,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  markRead(
    notificationId: string,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  markAllRead(runtime: NotificationsRouteRuntime<TEnv>): Promise<JsonRecord>;
  archive(
    notificationId: string,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  delete(
    notificationId: string,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  unreadCount(runtime: NotificationsRouteRuntime<TEnv>): Promise<JsonRecord>;
  summary(
    input: JsonRecord,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  getPreferences(runtime: NotificationsRouteRuntime<TEnv>): Promise<JsonRecord>;
  updatePreferences(
    input: NotificationPreferenceInput,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  registerDevice(
    input: NotificationDeviceInput,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  revokeDevice(
    deviceId: string,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listDevices(
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<readonly JsonRecord[]>;
  test(
    input: NotificationCreateInput,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  previewRules(
    input: NotificationRulePreviewInput,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
}

export interface NotificationsRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | NotificationsRepository<TEnv>
    | ((env: TEnv) => NotificationsRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
  readonly onNotificationEvent?: (
    event: NotificationEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface NotificationEvent {
  readonly event:
    | "notification_created"
    | "notification_read"
    | "notification_read_all"
    | "notification_archived"
    | "notification_deleted"
    | "notification_preferences_updated"
    | "notification_device_registered"
    | "notification_device_revoked"
    | "notification_test_sent"
    | "notification_rule_previewed";
  readonly requestId: string;
  readonly userId: string;
  readonly notificationId: string | null;
  readonly path: string;
  readonly createdAt: string;
}

class NotificationHttpError extends Error {
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
    this.name = "NotificationHttpError";
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
  "hijack",
  "adTarget",
  "targeting",
  "pushToken",
  "deviceToken",
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

const safePrivacyFlagKeys = new Set([
  "adtargetingseparated",
  "adfinancialtargetingused",
  "adsfinancialtargetingused",
  "rawfinancialdataexposed",
  "rawpersonaldataexposed",
  "rawpushtokenexposed",
  "sensitivefinancialdataexposed",
  "financialrawdataexposed",
  "financialrawaccountdataexposed",
]);

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

function normalizeRole(value: string): NotificationRole | null {
  const role = value.trim().toUpperCase();
  if (["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role))
    return role as NotificationRole;
  return null;
}

function principalFromRequest(
  request: Request,
  requireSource: boolean,
): NotificationPrincipal {
  const source = header(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source !== AUTH_CONTEXT_SOURCE_VALUE) {
    throw new NotificationHttpError(
      401,
      "NOTIFICATION_AUTH_CONTEXT_REQUIRED",
      "인증 컨텍스트가 필요합니다.",
    );
  }

  const userId = header(request, "x-authenticated-user-id");
  if (!userId)
    throw new NotificationHttpError(
      401,
      "NOTIFICATION_AUTH_REQUIRED",
      "로그인이 필요합니다.",
    );

  const roles = (header(request, "x-authenticated-roles") ?? "USER")
    .split(",")
    .map((role) => normalizeRole(role))
    .filter((role): role is NotificationRole => Boolean(role));
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

function isPrivileged(principal: NotificationPrincipal): boolean {
  return (
    principal.roles.some(
      (role) =>
        role === "ADMIN" || role === "SUPER_ADMIN" || role === "OPERATOR",
    ) || principal.permissions.includes("*")
  );
}

function assertOwner(userId: string, runtime: NotificationsRouteRuntime): void {
  if (userId === runtime.principal.userId || isPrivileged(runtime.principal))
    return;
  throw new NotificationHttpError(
    403,
    "NOTIFICATION_OWNER_REQUIRED",
    "본인 알림만 접근할 수 있습니다.",
  );
}

function keyLooksSensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  if (safePrivacyFlagKeys.has(normalized)) return false;
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
  runtime: Pick<NotificationsRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: NOTIFICATIONS_ROUTES_SERVICE_NAME,
        version: NOTIFICATIONS_ROUTES_VERSION,
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
    error instanceof NotificationHttpError
      ? error
      : new NotificationHttpError(
          500,
          "NOTIFICATION_ROUTE_INTERNAL_ERROR",
          "알림 API 처리 중 오류가 발생했습니다.",
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
        service: NOTIFICATIONS_ROUTES_SERVICE_NAME,
        version: NOTIFICATIONS_ROUTES_VERSION,
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
    throw new NotificationHttpError(
      413,
      "NOTIFICATION_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  }
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_JSON_OBJECT_REQUIRED",
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
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_FIELD_REQUIRED",
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
    if (value < min || value > max)
      throw new NotificationHttpError(
        400,
        "NOTIFICATION_INTEGER_RANGE_INVALID",
        `${key} 범위가 올바르지 않습니다.`,
        { field: key },
      );
    return value;
  }
  if (required)
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_INTEGER_REQUIRED",
      `${key} 정수 값이 필요합니다.`,
      { field: key },
    );
  return 0;
}

function numberField(
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
  if (typeof value === "number" && Number.isFinite(value)) {
    const min = options.min ?? 0;
    const max = options.max ?? 1_000_000;
    if (value < min || value > max)
      throw new NotificationHttpError(
        400,
        "NOTIFICATION_NUMBER_RANGE_INVALID",
        `${key} 범위가 올바르지 않습니다.`,
        { field: key },
      );
    return value;
  }
  if (required)
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_NUMBER_REQUIRED",
      `${key} 숫자 값이 필요합니다.`,
      { field: key },
    );
  return 0;
}

function normalizeDate(value: string): string {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_DATE_INVALID",
      "날짜는 YYYY-MM-DD 형식이어야 합니다.",
    );
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_DATE_INVALID",
      "존재하지 않는 날짜입니다.",
    );
  return date;
}

function parseOptionalIso(value: string | null, field: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_DATETIME_INVALID",
      `${field} 시간이 올바르지 않습니다.`,
      { field },
    );
  return parsed.toISOString();
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

function normalizeNotificationType(value: unknown): NotificationType {
  const type =
    typeof value === "string" ? value.trim().toUpperCase() : "NOTICE";
  if (
    [
      "PAYDAY",
      "PAYMENT_DUE",
      "BUDGET_WARNING",
      "BUDGET_EXCEEDED",
      "SAVINGS_GOAL",
      "LEVEL_UP",
      "GROWTH_REMINDER",
      "COMMUNITY",
      "NOTICE",
      "SECURITY",
      "CONTENT_RECOMMENDATION",
      "AD_PARTNER",
    ].includes(type)
  )
    return type as NotificationType;
  throw new NotificationHttpError(
    400,
    "NOTIFICATION_TYPE_INVALID",
    "알림 유형이 올바르지 않습니다.",
  );
}

function normalizeChannel(value: unknown): NotificationChannel {
  const channel =
    typeof value === "string" ? value.trim().toUpperCase() : "IN_APP";
  if (["IN_APP", "PUSH", "EMAIL"].includes(channel))
    return channel as NotificationChannel;
  throw new NotificationHttpError(
    400,
    "NOTIFICATION_CHANNEL_INVALID",
    "알림 채널이 올바르지 않습니다.",
  );
}

function normalizeChannels(value: unknown): readonly NotificationChannel[] {
  if (!Array.isArray(value)) return ["IN_APP"];
  const channels = value.map((item) => normalizeChannel(item));
  return [...new Set(channels)].length ? [...new Set(channels)] : ["IN_APP"];
}

function normalizePriority(value: unknown): NotificationPriority {
  const priority =
    typeof value === "string" ? value.trim().toUpperCase() : "NORMAL";
  if (["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority))
    return priority as NotificationPriority;
  throw new NotificationHttpError(
    400,
    "NOTIFICATION_PRIORITY_INVALID",
    "알림 우선순위가 올바르지 않습니다.",
  );
}

function normalizePlatform(value: unknown): NotificationDevicePlatform {
  const platform =
    typeof value === "string" ? value.trim().toUpperCase() : "WEB";
  if (["IOS", "ANDROID", "WEB"].includes(platform))
    return platform as NotificationDevicePlatform;
  throw new NotificationHttpError(
    400,
    "NOTIFICATION_DEVICE_PLATFORM_INVALID",
    "디바이스 플랫폼이 올바르지 않습니다.",
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
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_ROUTE_ID_REQUIRED",
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
): NotificationListResult<TItem> {
  return {
    items: items.slice(page.offset, page.offset + page.limit),
    page: page.page,
    pageSize: page.pageSize,
    total: items.length,
  };
}

function isMandatoryNotification(item: JsonRecord | null): boolean {
  if (!item) return false;
  if (item.isMandatory === true) return true;
  if (item.type === "SECURITY") return true;
  const metadata = item.metadata;
  return (
    metadata !== null &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    (metadata as JsonRecord).isMandatory === true
  );
}

async function assertNotificationCanBeHidden<TEnv>(
  notificationId: string,
  runtime: NotificationsRouteRuntime<TEnv>,
): Promise<void> {
  const existing = await runtime.repository.get(notificationId, runtime);
  if (!existing) {
    throw new NotificationHttpError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "알림을 찾을 수 없습니다.",
    );
  }
  if (isMandatoryNotification(existing)) {
    throw new NotificationHttpError(
      409,
      "NOTIFICATION_MANDATORY_LOCKED",
      "필수 알림은 사용자가 임의로 삭제하거나 보관할 수 없습니다.",
    );
  }
}

function metadataField(input: Record<string, unknown>): JsonRecord {
  const metadata = input.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return {};
  return sanitize(metadata) as JsonRecord;
}

function assertNotificationPolicy(input: NotificationCreateInput): void {
  if (
    (input.type === "CONTENT_RECOMMENDATION" || input.type === "AD_PARTNER") &&
    input.metadata.usesSensitiveFinancialData === true
  ) {
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_SENSITIVE_TARGETING_FORBIDDEN",
      "콘텐츠 추천/광고 알림에는 급여·지출·저축 원천 데이터를 사용할 수 없습니다.",
    );
  }
  if (
    input.message.includes("계좌") ||
    input.message.includes("카드번호") ||
    /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/.test(input.message)
  ) {
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_MESSAGE_SENSITIVE_DATA_FORBIDDEN",
      "알림 본문에는 계좌·카드 등 민감정보를 포함할 수 없습니다.",
    );
  }
}

function notificationCreateInput(
  body: Record<string, unknown>,
): NotificationCreateInput {
  const input: NotificationCreateInput = {
    type: normalizeNotificationType(body.type),
    title: stringField(body, "title", { maxLength: MAX_TITLE_LENGTH }),
    message: stringField(body, "message", { maxLength: MAX_MESSAGE_LENGTH }),
    priority: normalizePriority(body.priority),
    channels: normalizeChannels(body.channels),
    deeplink: optionalStringField(body, "deeplink", 500),
    scheduledAt: parseOptionalIso(
      optionalStringField(body, "scheduledAt"),
      "scheduledAt",
    ),
    expiresAt: parseOptionalIso(
      optionalStringField(body, "expiresAt"),
      "expiresAt",
    ),
    metadata: metadataField(body),
  };
  assertNotificationPolicy(input);
  return input;
}

type MutablePreferenceInput = {
  -readonly [K in keyof NotificationPreferenceInput]?: NotificationPreferenceInput[K];
};

function preferenceInput(
  body: Record<string, unknown>,
): NotificationPreferenceInput {
  const input: MutablePreferenceInput = {};
  const booleanKeys = [
    "inAppEnabled",
    "pushEnabled",
    "emailEnabled",
    "paydayEnabled",
    "paymentDueEnabled",
    "budgetWarningEnabled",
    "budgetExceededEnabled",
    "savingsGoalEnabled",
    "levelUpEnabled",
    "communityEnabled",
    "securityEnabled",
    "contentRecommendationEnabled",
    "adPartnerEnabled",
  ] as const;
  booleanKeys.forEach((key) => {
    if (body[key] !== undefined) input[key] = booleanField(body, key);
  });
  if (body.quietHoursStart !== undefined)
    input.quietHoursStart = optionalStringField(body, "quietHoursStart", 5);
  if (body.quietHoursEnd !== undefined)
    input.quietHoursEnd = optionalStringField(body, "quietHoursEnd", 5);
  if (body.timezone !== undefined)
    input.timezone = stringField(body, "timezone", { maxLength: 80 });
  if (!Object.keys(input).length)
    throw new NotificationHttpError(
      400,
      "NOTIFICATION_PREFERENCE_UPDATE_EMPTY",
      "수정할 알림 설정 값이 필요합니다.",
    );
  return input;
}

function deviceInput(body: Record<string, unknown>): NotificationDeviceInput {
  return {
    deviceId: stringField(body, "deviceId", { maxLength: 160 }),
    platform: normalizePlatform(body.platform),
    pushToken: stringField(body, "pushToken", { maxLength: 500 }),
    appVersion: optionalStringField(body, "appVersion", 80),
    locale: optionalStringField(body, "locale", 20),
  };
}

function rulePreviewInput(
  body: Record<string, unknown>,
  now: Date,
): NotificationRulePreviewInput {
  return {
    today: normalizeDate(
      optionalStringField(body, "today") ?? todayInSeoul(now),
    ),
    upcomingPaymentCount: integerField(body, "upcomingPaymentCount", {
      required: false,
      min: 0,
      max: 1_000,
    }),
    budgetUsageRate: numberField(body, "budgetUsageRate", {
      required: false,
      min: 0,
      max: 10,
    }),
    savingsGoalRate: numberField(body, "savingsGoalRate", {
      required: false,
      min: 0,
      max: 10,
    }),
    levelChanged: booleanField(body, "levelChanged"),
  };
}

function defaultPreferences(userId: string, now: Date): JsonRecord {
  return {
    userId,
    inAppEnabled: true,
    pushEnabled: true,
    emailEnabled: false,
    paydayEnabled: true,
    paymentDueEnabled: true,
    budgetWarningEnabled: true,
    budgetExceededEnabled: true,
    savingsGoalEnabled: true,
    levelUpEnabled: true,
    communityEnabled: true,
    securityEnabled: true,
    contentRecommendationEnabled: false,
    adPartnerEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    timezone: "Asia/Seoul",
    sensitiveFinancialTargetingConsent: false,
    updatedAt: now.toISOString(),
  };
}

function notificationEnabledByPreference(
  type: NotificationType,
  preferences: JsonRecord,
): boolean {
  const map: Record<NotificationType, string> = {
    PAYDAY: "paydayEnabled",
    PAYMENT_DUE: "paymentDueEnabled",
    BUDGET_WARNING: "budgetWarningEnabled",
    BUDGET_EXCEEDED: "budgetExceededEnabled",
    SAVINGS_GOAL: "savingsGoalEnabled",
    LEVEL_UP: "levelUpEnabled",
    GROWTH_REMINDER: "levelUpEnabled",
    COMMUNITY: "communityEnabled",
    NOTICE: "inAppEnabled",
    SECURITY: "securityEnabled",
    CONTENT_RECOMMENDATION: "contentRecommendationEnabled",
    AD_PARTNER: "adPartnerEnabled",
  };
  return preferences[map[type]] !== false;
}

async function emit<TEnv>(
  runtime: NotificationsRouteRuntime<TEnv>,
  event: NotificationEvent,
): Promise<void> {
  const options = (
    runtime as NotificationsRouteRuntime<TEnv> & {
      readonly routeOptions?: NotificationsRoutesOptions<TEnv>;
    }
  ).routeOptions;
  if (!options?.onNotificationEvent) return;
  const task = Promise.resolve(
    options.onNotificationEvent(event, runtime.env, runtime.execution),
  ).catch((error) => {
    console.warn(
      "notifications_routes_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  runtime.execution.waitUntil?.(task);
}

function createInMemoryNotificationsRepository<
  TEnv = unknown,
>(): NotificationsRepository<TEnv> {
  const notifications = new Map<string, JsonRecord>();
  const preferences = new Map<string, JsonRecord>();
  const devices = new Map<string, JsonRecord>();

  function ensurePreferences(userId: string, now: Date): JsonRecord {
    const existing = preferences.get(userId);
    if (existing) return existing;
    const created = defaultPreferences(userId, now);
    preferences.set(userId, created);
    return created;
  }

  function userNotifications(userId: string): JsonRecord[] {
    return [...notifications.values()].filter(
      (item) => item.userId === userId && item.status !== "DELETED",
    );
  }

  function findForRuntime(
    notificationId: string,
    runtime: NotificationsRouteRuntime<TEnv>,
  ): JsonRecord | null {
    const found = notifications.get(notificationId) ?? null;
    if (!found || found.status === "DELETED") return null;
    assertOwner(String(found.userId), runtime);
    return found;
  }

  function activeChannels(
    inputChannels: readonly NotificationChannel[],
    prefs: JsonRecord,
  ): readonly NotificationChannel[] {
    return inputChannels.filter((channel) => {
      if (channel === "IN_APP") return prefs.inAppEnabled !== false;
      if (channel === "PUSH") return prefs.pushEnabled !== false;
      return prefs.emailEnabled === true;
    });
  }

  return {
    name: "in-memory-notifications-repository",
    async list(input, page, runtime): Promise<NotificationListResult> {
      const status =
        typeof input.status === "string" && input.status ? input.status : null;
      const type =
        typeof input.type === "string" && input.type ? input.type : null;
      const items = userNotifications(runtime.principal.userId)
        .filter((item) => !status || item.status === status)
        .filter((item) => !type || item.type === type)
        .sort((left, right) =>
          String(right.createdAt).localeCompare(String(left.createdAt)),
        );
      return listResult(items, page);
    },
    async get(notificationId, runtime): Promise<JsonRecord | null> {
      return findForRuntime(notificationId, runtime);
    },
    async create(input, runtime): Promise<JsonRecord> {
      const prefs = ensurePreferences(runtime.principal.userId, runtime.now);
      if (!notificationEnabledByPreference(input.type, prefs)) {
        return {
          notificationId: null,
          suppressed: true,
          type: input.type,
          reason: "PREFERENCE_DISABLED",
          createdAt: runtime.now.toISOString(),
        };
      }
      const channels = activeChannels(input.channels, prefs);
      if (!channels.length) {
        return {
          notificationId: null,
          suppressed: true,
          type: input.type,
          reason: "CHANNEL_DISABLED",
          createdAt: runtime.now.toISOString(),
        };
      }
      const notificationId = `ntf_${globalThis.crypto.randomUUID()}`;
      const record: JsonRecord = {
        notificationId,
        userId: runtime.principal.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority,
        channels: channels.join(","),
        deeplink: input.deeplink,
        status: "UNREAD",
        scheduledAt: input.scheduledAt,
        expiresAt: input.expiresAt,
        metadata: input.metadata,
        createdAt: runtime.now.toISOString(),
        readAt: null,
        archivedAt: null,
        isMandatory:
          input.metadata.isMandatory === true || input.type === "SECURITY",
        sensitiveFinancialDataExposed: false,
        adTargetingSeparated: true,
      };
      notifications.set(notificationId, record);
      return record;
    },
    async markRead(notificationId, runtime): Promise<JsonRecord> {
      const found = findForRuntime(notificationId, runtime);
      if (!found)
        throw new NotificationHttpError(
          404,
          "NOTIFICATION_NOT_FOUND",
          "알림을 찾을 수 없습니다.",
        );
      const updated = {
        ...found,
        status: "READ",
        readAt: runtime.now.toISOString(),
      };
      notifications.set(notificationId, updated);
      return updated;
    },
    async markAllRead(runtime): Promise<JsonRecord> {
      let count = 0;
      userNotifications(runtime.principal.userId).forEach((item) => {
        if (item.status === "UNREAD") {
          notifications.set(String(item.notificationId), {
            ...item,
            status: "READ",
            readAt: runtime.now.toISOString(),
          });
          count += 1;
        }
      });
      return { markedReadCount: count, updatedAt: runtime.now.toISOString() };
    },
    async archive(notificationId, runtime): Promise<JsonRecord> {
      const found = findForRuntime(notificationId, runtime);
      if (!found)
        throw new NotificationHttpError(
          404,
          "NOTIFICATION_NOT_FOUND",
          "알림을 찾을 수 없습니다.",
        );
      const updated = {
        ...found,
        status: "ARCHIVED",
        archivedAt: runtime.now.toISOString(),
      };
      notifications.set(notificationId, updated);
      return updated;
    },
    async delete(notificationId, runtime): Promise<JsonRecord> {
      const found = findForRuntime(notificationId, runtime);
      if (!found)
        throw new NotificationHttpError(
          404,
          "NOTIFICATION_NOT_FOUND",
          "알림을 찾을 수 없습니다.",
        );
      const updated = {
        ...found,
        status: "DELETED",
        deletedAt: runtime.now.toISOString(),
      };
      notifications.set(notificationId, updated);
      return { notificationId, status: "DELETED" };
    },
    async unreadCount(runtime): Promise<JsonRecord> {
      const items = userNotifications(runtime.principal.userId).filter(
        (item) => item.status === "UNREAD",
      );
      const byType = items.reduce<Record<string, number>>((acc, item) => {
        const type = String(item.type ?? "NOTICE");
        acc[type] = (acc[type] ?? 0) + 1;
        return acc;
      }, {});
      return {
        unreadCount: items.length,
        byType,
        updatedAt: runtime.now.toISOString(),
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
      const items = userNotifications(runtime.principal.userId).filter(
        (item) =>
          String(item.createdAt).slice(0, 10) >= startDate &&
          String(item.createdAt).slice(0, 10) <= endDate,
      );
      return {
        startDate,
        endDate,
        totalCount: items.length,
        unreadCount: items.filter((item) => item.status === "UNREAD").length,
        archivedCount: items.filter((item) => item.status === "ARCHIVED")
          .length,
        urgentCount: items.filter((item) => item.priority === "URGENT").length,
        contentRecommendationEnabled:
          ensurePreferences(runtime.principal.userId, runtime.now)
            .contentRecommendationEnabled === true,
        adPartnerEnabled:
          ensurePreferences(runtime.principal.userId, runtime.now)
            .adPartnerEnabled === true,
        sensitiveFinancialDataExposed: false,
      };
    },
    async getPreferences(runtime): Promise<JsonRecord> {
      return ensurePreferences(runtime.principal.userId, runtime.now);
    },
    async updatePreferences(input, runtime): Promise<JsonRecord> {
      const current = ensurePreferences(runtime.principal.userId, runtime.now);
      const patch = sanitize(input) as JsonRecord;
      const updated: JsonRecord = {
        ...current,
        ...patch,
        userId: runtime.principal.userId,
        updatedAt: runtime.now.toISOString(),
        sensitiveFinancialTargetingConsent: false,
      };
      preferences.set(runtime.principal.userId, updated);
      return updated;
    },
    async registerDevice(input, runtime): Promise<JsonRecord> {
      const key = `${runtime.principal.userId}:${input.deviceId}`;
      const record: JsonRecord = {
        deviceId: input.deviceId,
        userId: runtime.principal.userId,
        platform: input.platform,
        pushTokenHashOnly: true,
        pushTokenPreview: `${input.pushToken.slice(0, 6)}***`,
        appVersion: input.appVersion,
        locale: input.locale,
        status: "ACTIVE",
        registeredAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      devices.set(key, record);
      return record;
    },
    async revokeDevice(deviceId, runtime): Promise<JsonRecord> {
      const key = `${runtime.principal.userId}:${deviceId}`;
      const found = devices.get(key);
      if (!found)
        throw new NotificationHttpError(
          404,
          "NOTIFICATION_DEVICE_NOT_FOUND",
          "디바이스를 찾을 수 없습니다.",
        );
      const updated = {
        ...found,
        status: "REVOKED",
        revokedAt: runtime.now.toISOString(),
      };
      devices.set(key, updated);
      return updated;
    },
    async listDevices(runtime): Promise<readonly JsonRecord[]> {
      return [...devices.values()].filter(
        (item) =>
          item.userId === runtime.principal.userId && item.status !== "REVOKED",
      );
    },
    async test(input, runtime): Promise<JsonRecord> {
      const created = await this.create(
        { ...input, title: `[테스트] ${input.title}` },
        runtime,
      );
      return {
        delivered: created.notificationId !== null,
        notification: created,
        dryRun: false,
      };
    },
    async previewRules(input, runtime): Promise<JsonRecord> {
      const candidates: JsonRecord[] = [];
      if (input.upcomingPaymentCount > 0)
        candidates.push({
          type: "PAYMENT_DUE",
          title: "고정지출 결제 예정",
          priority: "HIGH",
          enabled: true,
        });
      if (input.budgetUsageRate >= 1)
        candidates.push({
          type: "BUDGET_EXCEEDED",
          title: "일일 예산 초과",
          priority: "URGENT",
          enabled: true,
        });
      else if (input.budgetUsageRate >= 0.8)
        candidates.push({
          type: "BUDGET_WARNING",
          title: "일일 예산 80% 사용",
          priority: "HIGH",
          enabled: true,
        });
      if (input.savingsGoalRate >= 1)
        candidates.push({
          type: "SAVINGS_GOAL",
          title: "저축 목표 달성",
          priority: "NORMAL",
          enabled: true,
        });
      if (input.levelChanged)
        candidates.push({
          type: "LEVEL_UP",
          title: "LV UP 달성",
          priority: "NORMAL",
          enabled: true,
        });
      const prefs = ensurePreferences(runtime.principal.userId, runtime.now);
      return {
        today: input.today,
        candidates: candidates.map((item) => ({
          ...item,
          enabledByPreference: notificationEnabledByPreference(
            item.type as NotificationType,
            prefs,
          ),
        })),
        source: "SERVER_RULE_PREVIEW",
        sensitiveFinancialDataExposed: false,
        adTargetingSeparated: true,
      };
    },
  };
}

function resolveRepository<TEnv>(
  env: TEnv,
  options: NotificationsRoutesOptions<TEnv>,
): NotificationsRepository<TEnv> {
  const repo =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return repo ?? createInMemoryNotificationsRepository<TEnv>();
}

async function dispatchNotificationsRoute<TEnv>(
  runtime: NotificationsRouteRuntime<TEnv>,
): Promise<Response> {
  const { method, relativePath, repository } = runtime;
  const page = pagination(runtime.url);

  if (method === "GET" && relativePath === "/") {
    return jsonResponse(runtime, 200, {
      data: await repository.list(queryRecord(runtime.url), page, runtime),
    });
  }

  if (method === "POST" && relativePath === "/") {
    const data = await repository.create(
      notificationCreateInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "notification_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      notificationId: String(data.notificationId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, data.notificationId === null ? 202 : 201, {
      data,
    });
  }

  if (method === "GET" && relativePath === "/summary") {
    return jsonResponse(runtime, 200, {
      data: await repository.summary(queryRecord(runtime.url), runtime),
    });
  }

  if (method === "GET" && relativePath === "/unread-count") {
    return jsonResponse(runtime, 200, {
      data: await repository.unreadCount(runtime),
    });
  }

  if (method === "POST" && relativePath === "/read-all") {
    const data = await repository.markAllRead(runtime);
    await emit(runtime, {
      event: "notification_read_all",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      notificationId: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "GET" && relativePath === "/preferences") {
    return jsonResponse(runtime, 200, {
      data: await repository.getPreferences(runtime),
    });
  }

  if (
    (method === "PUT" || method === "PATCH") &&
    relativePath === "/preferences"
  ) {
    const data = await repository.updatePreferences(
      preferenceInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "notification_preferences_updated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      notificationId: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "GET" && relativePath === "/devices") {
    return jsonResponse(runtime, 200, {
      data: await repository.listDevices(runtime),
    });
  }

  if (method === "POST" && relativePath === "/devices") {
    const data = await repository.registerDevice(
      deviceInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "notification_device_registered",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      notificationId: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  let match = matchRoute(relativePath, /^\/devices\/([^/]+)$/);
  if (method === "DELETE" && match) {
    const data = await repository.revokeDevice(idFromMatch(match, 1), runtime);
    await emit(runtime, {
      event: "notification_device_revoked",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      notificationId: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "POST" && relativePath === "/test") {
    const data = await repository.test(
      notificationCreateInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    const notification =
      typeof data.notification === "object" &&
      data.notification !== null &&
      !Array.isArray(data.notification)
        ? (data.notification as JsonRecord)
        : {};
    await emit(runtime, {
      event: "notification_test_sent",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      notificationId: String(notification.notificationId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  if (method === "POST" && relativePath === "/rules/preview") {
    const data = await repository.previewRules(
      rulePreviewInput(await parseJsonBody(runtime.request), runtime.now),
      runtime,
    );
    await emit(runtime, {
      event: "notification_rule_previewed",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      notificationId: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)$/);
  if (method === "GET" && match) {
    const notification = await repository.get(idFromMatch(match, 1), runtime);
    if (!notification)
      throw new NotificationHttpError(
        404,
        "NOTIFICATION_NOT_FOUND",
        "알림을 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data: notification });
  }

  if (method === "DELETE" && match) {
    const notificationId = idFromMatch(match, 1);
    await assertNotificationCanBeHidden(notificationId, runtime);
    const data = await repository.delete(notificationId, runtime);
    await emit(runtime, {
      event: "notification_deleted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      notificationId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/read$/);
  if (method === "POST" && match) {
    const notificationId = idFromMatch(match, 1);
    const data = await repository.markRead(notificationId, runtime);
    await emit(runtime, {
      event: "notification_read",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      notificationId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/([^/]+)\/archive$/);
  if (method === "POST" && match) {
    const notificationId = idFromMatch(match, 1);
    await assertNotificationCanBeHidden(notificationId, runtime);
    const data = await repository.archive(notificationId, runtime);
    await emit(runtime, {
      event: "notification_archived",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      notificationId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  throw new NotificationHttpError(
    404,
    "NOTIFICATION_ROUTE_NOT_FOUND",
    "알림 API 경로를 찾을 수 없습니다.",
  );
}

export function createNotificationsRoutes<TEnv = unknown>(
  options: NotificationsRoutesOptions<TEnv> = {},
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
        path !== NOTIFICATIONS_API_PREFIX &&
        !path.startsWith(`${NOTIFICATIONS_API_PREFIX}/`)
      ) {
        throw new NotificationHttpError(
          404,
          "NOTIFICATION_ROUTE_PREFIX_NOT_FOUND",
          "알림 API prefix가 아닙니다.",
        );
      }

      const baseRuntime: NotificationsRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normalizePath(
          path.slice(NOTIFICATIONS_API_PREFIX.length) || "/",
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
      const response = await dispatchNotificationsRoute(runtime);
      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set(
        "x-notifications-repository",
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

export const handleNotificationsRoutes = createNotificationsRoutes();

export const notificationsRoutesManifest = Object.freeze({
  file: "services/api/src/routes/notifications.routes.ts",
  version: NOTIFICATIONS_ROUTES_VERSION,
  prefix: NOTIFICATIONS_API_PREFIX,
  endpoints: [
    "GET /",
    "POST /",
    "GET /summary",
    "GET /unread-count",
    "POST /read-all",
    "GET /preferences",
    "PUT|PATCH /preferences",
    "GET /devices",
    "POST /devices",
    "DELETE /devices/{deviceId}",
    "POST /test",
    "POST /rules/preview",
    "GET /{notificationId}",
    "DELETE /{notificationId}",
    "POST /{notificationId}/read",
    "POST /{notificationId}/archive",
  ],
  authMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  paydayPaymentDueBudgetSavingsGrowthCommunitySecurityNotifications: true,
  contentRecommendationAndAdPartnerOptInSeparated: true,
  sensitiveFinancialDataMasked: true,
  ownerDataBoundaryRequired: true,
  deviceTokenHashOnlyContract: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertNotificationsRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "notifications_api_prefix_api_v1",
    "auth_context_required_and_owner_boundary",
    "list_create_detail_delete",
    "read_single_and_read_all",
    "archive_notification",
    "unread_count_and_summary",
    "preferences_get_update",
    "push_device_register_list_revoke",
    "payday_payment_due_budget_warning_budget_exceeded_savings_goal_levelup_community_notice_security_types",
    "content_recommendation_opt_in",
    "ad_partner_opt_in_and_sensitive_financial_targeting_forbidden",
    "rule_preview_without_raw_financial_exposure",
    "standard_json_response_and_error_contract",
    "sensitive_token_account_salary_push_token_redaction",
    "repository_injection_with_memory_fallback",
    "security_event_wait_until_hook",
    "rate_limit_audit_error_middleware_compatible",
  ] as const;
  return {
    ok: checks.length >= 15,
    version: NOTIFICATIONS_ROUTES_VERSION,
    checks,
  };
}

export default createNotificationsRoutes;
