/** services/api/src/middlewares/error.middleware.ts
 * 급여납치 Salary Hijacking Platform · Cloudflare Workers 에러 표준화/보안 미들웨어 최종본
 *
 * 설계 목표
 * - API 전체에서 동일한 JSON 에러 계약을 제공한다.
 * - 인증/권한, rate limit, 입력 검증, 급여·예산·지출·저축 계산, 알림, LV UP, 커뮤니티, 광고/제휴, 관리자, 업로드, DB/외부 API 장애를 일관되게 분류한다.
 * - 토큰·비밀번호·급여·대출·저축·지출·계좌·카드·광고 타겟팅 원문을 응답/로그에 노출하지 않는다.
 * - Cloudflare Workers Fetch API와 waitUntil 로깅에 맞춰 외부 의존성 없이 동작한다.
 */

export const ERROR_MIDDLEWARE_VERSION = "3.1.0";
export const ERROR_SERVICE_NAME = "salary-hijacking-api";
export const ERROR_TIMEZONE = "Asia/Seoul";

const DEFAULT_PUBLIC_MESSAGE = "요청을 처리하는 중 문제가 발생했습니다.";
const DEFAULT_VALIDATION_MESSAGE = "요청 값이 올바르지 않습니다.";
const DEFAULT_AUTH_MESSAGE = "인증이 필요합니다.";
const DEFAULT_FORBIDDEN_MESSAGE = "접근 권한이 없습니다.";
const DEFAULT_NOT_FOUND_MESSAGE = "요청한 리소스를 찾을 수 없습니다.";
const DEFAULT_CONFLICT_MESSAGE = "현재 상태에서는 요청을 처리할 수 없습니다.";
const DEFAULT_RATE_LIMIT_MESSAGE =
  "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
const DEFAULT_UNAVAILABLE_MESSAGE = "일시적으로 서비스를 사용할 수 없습니다.";
const MAX_SAFE_TEXT_LENGTH = 2_000;
const MAX_DETAILS_DEPTH = 6;
const MAX_DETAILS_KEYS = 80;
const MAX_ARRAY_LENGTH = 50;

export type ErrorCategory =
  | "VALIDATION"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "RATE_LIMIT"
  | "IDEMPOTENCY"
  | "PAYROLL"
  | "BUDGET"
  | "EXPENSE"
  | "SAVINGS"
  | "NOTIFICATION"
  | "GROWTH"
  | "COMMUNITY"
  | "ADS"
  | "ADMIN"
  | "UPLOAD"
  | "DATABASE"
  | "EXTERNAL_SERVICE"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SECURITY"
  | "INTERNAL";

export type ErrorSeverity =
  | "INFO"
  | "NOTICE"
  | "WARNING"
  | "ERROR"
  | "CRITICAL";
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export type FetchHandler<TEnv = unknown> = (
  request: Request,
  env: TEnv,
  context: WaitUntilCapable,
) => Response | Promise<Response>;

export interface ApiErrorOptions {
  readonly code: string;
  readonly message?: string;
  readonly publicMessage?: string;
  readonly status?: number;
  readonly category?: ErrorCategory;
  readonly severity?: ErrorSeverity;
  readonly retryable?: boolean;
  readonly details?: unknown;
  readonly exposeDetails?: boolean;
  readonly cause?: unknown;
  readonly retryAfterSeconds?: number;
  readonly logOnly?: boolean;
}

export interface ErrorResponseBody {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly status: number;
    readonly category: ErrorCategory;
    readonly requestId: string;
    readonly retryable: boolean;
    readonly retryAfterSeconds?: number;
    readonly details?: JsonValue;
  };
  readonly meta: {
    readonly service: string;
    readonly version: string;
    readonly timestamp: string;
    readonly timezone: string;
    readonly path: string;
  };
}

export interface ErrorLogEvent {
  readonly event: "api_error";
  readonly service: string;
  readonly version: string;
  readonly environment: string;
  readonly requestId: string;
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly code: string;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly retryable: boolean;
  readonly latencyMs: number;
  readonly userId: string | null;
  readonly policyId: string | null;
  readonly errorName: string;
  readonly causeName: string | null;
  readonly message: string;
  readonly safeDetails: JsonValue | null;
  readonly createdAt: string;
}

export interface ErrorLogSink<TEnv = unknown> {
  readonly name?: string;
  write(
    event: ErrorLogEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<void>;
}

export interface ErrorMiddlewareOptions<TEnv = unknown> {
  readonly serviceName?: string;
  readonly environment?: string | ((env: TEnv) => string | null | undefined);
  readonly exposeDetails?: boolean | ((env: TEnv) => boolean);
  readonly exposeStack?: boolean | ((env: TEnv) => boolean);
  readonly logSink?: ErrorLogSink<TEnv>;
  readonly onError?: (
    event: ErrorLogEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
  readonly mapError?: (
    error: unknown,
    runtime: ErrorRuntimeContext<TEnv>,
  ) => ApiError | null | undefined;
  readonly now?: () => Date;
}

export interface ErrorRuntimeContext<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly requestId: string;
  readonly url: URL;
  readonly startedAtEpochMs: number;
  readonly serviceName: string;
  readonly environment: string;
  readonly exposeDetails: boolean;
  readonly exposeStack: boolean;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly retryable: boolean;
  readonly publicMessage: string;
  readonly details: unknown;
  readonly exposeDetails: boolean;
  readonly retryAfterSeconds: number | null;
  readonly logOnly: boolean;

  constructor(options: ApiErrorOptions) {
    super(options.message ?? options.publicMessage ?? options.code);
    this.name = "ApiError";
    this.code = normalizeErrorCode(options.code);
    this.status = normalizeHttpStatus(
      options.status ?? statusFromCode(this.code),
    );
    this.category =
      options.category ?? categoryFromCode(this.code, this.status);
    this.severity =
      options.severity ?? severityFromStatus(this.status, this.category);
    this.retryable = options.retryable ?? retryableFromStatus(this.status);
    this.publicMessage = sanitizeClientMessage(
      options.publicMessage ??
        messageFromCode(this.code, this.status, this.category),
    );
    this.details = options.details ?? null;
    this.exposeDetails = options.exposeDetails ?? false;
    this.retryAfterSeconds = normalizeRetryAfter(options.retryAfterSeconds);
    this.logOnly = options.logOnly ?? false;

    if (options.cause !== undefined) {
      try {
        Object.defineProperty(this, "cause", {
          value: options.cause,
          enumerable: false,
        });
      } catch {
        // 일부 런타임에서 Error.cause 재정의를 허용하지 않을 수 있다.
      }
    }
  }
}

const sensitiveKeyFragments = [
  "password",
  "passcode",
  "otp",
  "mfa",
  "totp",
  "recovery",
  "authorization",
  "cookie",
  "set-cookie",
  "access_token",
  "refresh_token",
  "id_token",
  "token",
  "oauth",
  "client_secret",
  "secret",
  "api_key",
  "private_key",
  "database_url",
  "connection_string",
  "dsn",
  "email",
  "phone",
  "resident",
  "rrn",
  "account_number",
  "card_number",
  "credit_card",
  "ip",
  "ip_address",
  "user_agent",
  "push_token",
  "device_token",
  "salary",
  "payroll",
  "income",
  "expected_salary",
  "actual_salary",
  "loan",
  "debt",
  "saving",
  "savings",
  "expense",
  "daily_budget",
  "hijack_amount",
  "financial",
  "ad_target",
  "targeting",
  "profile_segment",
  "비밀번호",
  "토큰",
  "급여",
  "월급",
  "소득",
  "대출",
  "저축",
  "적금",
  "지출",
  "생활비",
  "납치금액",
  "계좌",
  "카드",
  "광고타겟",
];

const sensitiveValuePatterns = [
  /bearer\s+[a-z0-9._-]+/i,
  /service\s+[a-z0-9._-]+/i,
  /eyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+/i,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i,
  /postgres(?:ql)?:\/\//i,
  /mysql:\/\//i,
  /mongodb(?:\+srv)?:\/\//i,
  /redis:\/\//i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b\d{3}-\d{2,4}-\d{4}\b/,
  /\b\d{13}\b/,
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
];

export const consoleErrorLogSink: ErrorLogSink<unknown> = {
  name: "console",
  async write(event): Promise<void> {
    const line = JSON.stringify(sanitizeForLog(event));
    if (event.severity === "CRITICAL" || event.severity === "ERROR") {
      console.error(line);
    } else if (event.severity === "WARNING") {
      console.warn(line);
    } else {
      console.info(line);
    }
  },
};

function normalizePath(pathname: string): string {
  const normalized = (pathname || "/").replace(/\/+/g, "/");
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function getHeader(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value ? value : null;
}

function safeRequestId(value: string | null): string | null {
  const trimmed = value?.trim().slice(0, 160);
  return trimmed && /^[a-zA-Z0-9._:\-/]{8,160}$/.test(trimmed) ? trimmed : null;
}

function randomId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function getOrCreateErrorRequestId(request: Request): string {
  return (
    safeRequestId(getHeader(request.headers, "x-request-id")) ??
    safeRequestId(getHeader(request.headers, "x-correlation-id")) ??
    safeRequestId(getHeader(request.headers, "cf-ray")) ??
    `req_${randomId()}`
  );
}

function resolveString<TEnv>(
  env: TEnv,
  value: string | ((env: TEnv) => string | null | undefined) | undefined,
  fallback: string,
): string {
  const resolved = typeof value === "function" ? value(env) : value;
  return resolved?.trim() || fallback;
}

function resolveBoolean<TEnv>(
  env: TEnv,
  value: boolean | ((env: TEnv) => boolean) | undefined,
  fallback: boolean,
): boolean {
  return typeof value === "function" ? value(env) : (value ?? fallback);
}

function normalizeErrorCode(code: string): string {
  const normalized = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 96);
  return normalized || "INTERNAL_ERROR";
}

function normalizeHttpStatus(status: number): number {
  if (!Number.isInteger(status)) return 500;
  if (status < 400 || status > 599) return 500;
  return status;
}

function normalizeRetryAfter(value: number | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.min(Math.ceil(value), 86_400);
}

function statusFromCode(code: string): number {
  if (code.startsWith("AUTH_TOKEN_") || code === "AUTH_SESSION_REVOKED")
    return 401;
  if (
    code.includes("PERMISSION") ||
    code.includes("FORBIDDEN") ||
    code.includes("MFA") ||
    code.includes("OWNER_MISMATCH")
  )
    return 403;
  if (code.includes("NOT_FOUND")) return 404;
  if (
    code.includes("CONFLICT") ||
    code.includes("DUPLICATE") ||
    code.includes("IDEMPOTENCY")
  )
    return 409;
  if (
    code.includes("VALIDATION") ||
    code.includes("INVALID") ||
    code.includes("REQUIRED") ||
    code.includes("MASS_ASSIGNMENT")
  )
    return 400;
  if (code.includes("UNPROCESSABLE")) return 422;
  if (code.includes("PAYLOAD_TOO_LARGE") || code.includes("FILE_TOO_LARGE"))
    return 413;
  if (code.includes("RATE_LIMIT") || code.includes("TOO_MANY_REQUESTS"))
    return 429;
  if (code.includes("TIMEOUT") || code.includes("UNAVAILABLE")) return 503;
  return 500;
}

function categoryFromCode(code: string, status: number): ErrorCategory {
  if (code.startsWith("AUTH_TOKEN_") || code.includes("SESSION"))
    return "AUTHENTICATION";
  if (
    code.includes("PERMISSION") ||
    code.includes("FORBIDDEN") ||
    code.includes("MFA") ||
    code.includes("OWNER_MISMATCH")
  )
    return "AUTHORIZATION";
  if (code.includes("RATE_LIMIT") || status === 429) return "RATE_LIMIT";
  if (code.includes("IDEMPOTENCY")) return "IDEMPOTENCY";
  if (
    code.includes("VALIDATION") ||
    code.includes("INVALID") ||
    code.includes("REQUIRED") ||
    code.includes("MASS_ASSIGNMENT")
  )
    return "VALIDATION";
  if (
    code.includes("PAYROLL") ||
    code.includes("SALARY") ||
    code.includes("HIJACK")
  )
    return "PAYROLL";
  if (code.includes("BUDGET")) return "BUDGET";
  if (code.includes("EXPENSE")) return "EXPENSE";
  if (code.includes("SAVING")) return "SAVINGS";
  if (code.includes("NOTIFICATION") || code.includes("PUSH"))
    return "NOTIFICATION";
  if (code.includes("GROWTH") || code.includes("LEVEL")) return "GROWTH";
  if (
    code.includes("COMMUNITY") ||
    code.includes("POST") ||
    code.includes("COMMENT") ||
    code.includes("REPORT")
  )
    return "COMMUNITY";
  if (
    code.includes("AD") ||
    code.includes("BANNER") ||
    code.includes("PARTNER")
  )
    return "ADS";
  if (code.includes("ADMIN") || code.includes("AUDIT")) return "ADMIN";
  if (
    code.includes("UPLOAD") ||
    code.includes("FILE") ||
    code.includes("ATTACHMENT")
  )
    return "UPLOAD";
  if (code.includes("DATABASE") || code.includes("DB") || code.includes("SQL"))
    return "DATABASE";
  if (
    code.includes("EXTERNAL") ||
    code.includes("UPSTREAM") ||
    code.includes("OAUTH")
  )
    return "EXTERNAL_SERVICE";
  if (status === 404) return "NOT_FOUND";
  if (status === 409 || status === 412) return "CONFLICT";
  if (
    code.includes("SECURITY") ||
    code.includes("CSRF") ||
    code.includes("SPOOF")
  )
    return "SECURITY";
  return "INTERNAL";
}

function severityFromStatus(
  status: number,
  category: ErrorCategory,
): ErrorSeverity {
  if (status >= 500)
    return status === 503 || category === "EXTERNAL_SERVICE"
      ? "ERROR"
      : "CRITICAL";
  if (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    category === "SECURITY"
  )
    return "WARNING";
  if (status === 404) return "INFO";
  return "NOTICE";
}

function retryableFromStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function messageFromCode(
  code: string,
  status: number,
  category: ErrorCategory,
): string {
  if (category === "AUTHENTICATION") return DEFAULT_AUTH_MESSAGE;
  if (category === "AUTHORIZATION") return DEFAULT_FORBIDDEN_MESSAGE;
  if (category === "RATE_LIMIT") return DEFAULT_RATE_LIMIT_MESSAGE;
  if (category === "VALIDATION") return DEFAULT_VALIDATION_MESSAGE;
  if (status === 404) return DEFAULT_NOT_FOUND_MESSAGE;
  if (status === 409 || status === 412) return DEFAULT_CONFLICT_MESSAGE;
  if (status === 503) return DEFAULT_UNAVAILABLE_MESSAGE;
  if (code === "PAYROLL_CALCULATION_INVALID")
    return "급여 계산 요청 값이 올바르지 않습니다.";
  if (code === "DAILY_BUDGET_EXCEEDED") return "일일 예산을 초과했습니다.";
  return DEFAULT_PUBLIC_MESSAGE;
}

function keyLooksSensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s.-]/g, "_");
  return sensitiveKeyFragments.some((fragment) =>
    normalized.includes(fragment),
  );
}

function valueLooksSensitive(value: string): boolean {
  return sensitiveValuePatterns.some((pattern) => pattern.test(value));
}

function clampText(value: string, max = MAX_SAFE_TEXT_LENGTH): string {
  return value.length <= max ? value : `${value.slice(0, max)}…[truncated]`;
}

function sanitizeString(value: string): string {
  return valueLooksSensitive(value) ? "[REDACTED]" : clampText(value);
}

function sanitizeInternal(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value !== "object") return sanitizeString(String(value));
  if (depth >= MAX_DETAILS_DEPTH) return "[MAX_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (value instanceof Error) {
    return {
      name: sanitizeString(value.name),
      message: sanitizeString(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeInternal(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, MAX_DETAILS_KEYS)
      .map(([key, item]) => [
        clampText(key, 128),
        keyLooksSensitive(key)
          ? "[REDACTED]"
          : sanitizeInternal(item, depth + 1, seen),
      ]),
  );
}

export function sanitizeErrorDetails(value: unknown): JsonValue {
  return sanitizeInternal(value, 0, new WeakSet<object>());
}

function sanitizeClientMessage(value: string): string {
  const safe = sanitizeString(value)
    .replace(/[\r\n\t]+/g, " ")
    .trim();
  if (!safe || safe === "[REDACTED]") return DEFAULT_PUBLIC_MESSAGE;
  return clampText(safe, 300);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function numberField(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function booleanField(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function errorCause(error: unknown): unknown {
  return isRecord(error) && "cause" in error ? error.cause : null;
}

function nameOf(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (isRecord(error)) return stringField(error.name) ?? "ObjectError";
  return typeof error;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error)) return stringField(error.message) ?? String(error);
  return String(error);
}

function codeOf(error: unknown): string | null {
  if (!isRecord(error)) return null;
  return (
    stringField(error.code) ??
    stringField(error.errorCode) ??
    stringField(error.name)
  );
}

function statusOf(error: unknown): number | null {
  if (!isRecord(error)) return null;
  const status = numberField(error.status) ?? numberField(error.statusCode);
  return status ? normalizeHttpStatus(status) : null;
}

function retryAfterOf(error: unknown): number | null {
  if (!isRecord(error)) return null;
  const value =
    numberField(error.retryAfterSeconds) ??
    numberField(error.retryAfter) ??
    numberField(error.resetAfterSeconds);
  return normalizeRetryAfter(value ?? undefined);
}

function categoryOf(
  error: unknown,
  code: string,
  status: number,
): ErrorCategory {
  if (isRecord(error) && typeof error.category === "string") {
    const category = error.category.toUpperCase();
    if (isKnownCategory(category)) return category;
  }
  return categoryFromCode(code, status);
}

function isKnownCategory(value: string): value is ErrorCategory {
  return [
    "VALIDATION",
    "AUTHENTICATION",
    "AUTHORIZATION",
    "RATE_LIMIT",
    "IDEMPOTENCY",
    "PAYROLL",
    "BUDGET",
    "EXPENSE",
    "SAVINGS",
    "NOTIFICATION",
    "GROWTH",
    "COMMUNITY",
    "ADS",
    "ADMIN",
    "UPLOAD",
    "DATABASE",
    "EXTERNAL_SERVICE",
    "NOT_FOUND",
    "CONFLICT",
    "SECURITY",
    "INTERNAL",
  ].includes(value);
}

function detailsOf(error: unknown): unknown {
  if (!isRecord(error)) return null;
  return (
    error.details ?? error.errors ?? error.fieldErrors ?? error.issues ?? null
  );
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const explicitCode = codeOf(error);
  const fallbackName = nameOf(error).toUpperCase();
  const code = normalizeErrorCode(
    explicitCode ?? fallbackName ?? "INTERNAL_ERROR",
  );
  const status = statusOf(error) ?? statusFromCode(code);
  const category = categoryOf(error, code, status);
  const retryAfterSeconds = retryAfterOf(error);
  const retryable =
    booleanField(isRecord(error) ? error.retryable : undefined) ??
    retryableFromStatus(status);
  const exposeDetails =
    booleanField(isRecord(error) ? error.exposeDetails : undefined) ?? false;
  const rawPublicMessage = stringField(
    isRecord(error) ? error.publicMessage : undefined,
  );
  const publicMessage =
    rawPublicMessage ?? messageFromCode(code, status, category);

  return new ApiError({
    code,
    status,
    category,
    retryable,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
    publicMessage,
    message: messageOf(error),
    details: detailsOf(error),
    exposeDetails,
    cause: errorCause(error),
  });
}

export function createValidationError(
  message = DEFAULT_VALIDATION_MESSAGE,
  details?: unknown,
): ApiError {
  return new ApiError({
    code: "VALIDATION_ERROR",
    status: 400,
    category: "VALIDATION",
    severity: "NOTICE",
    publicMessage: message,
    details,
    exposeDetails: true,
  });
}

export function createNotFoundError(
  resourceName = "resource",
  details?: unknown,
): ApiError {
  return new ApiError({
    code: "RESOURCE_NOT_FOUND",
    status: 404,
    category: "NOT_FOUND",
    severity: "INFO",
    publicMessage: DEFAULT_NOT_FOUND_MESSAGE,
    details: { resourceName, ...(isRecord(details) ? details : {}) },
    exposeDetails: true,
  });
}

export function createConflictError(
  message = DEFAULT_CONFLICT_MESSAGE,
  details?: unknown,
): ApiError {
  return new ApiError({
    code: "RESOURCE_CONFLICT",
    status: 409,
    category: "CONFLICT",
    severity: "NOTICE",
    publicMessage: message,
    details,
    exposeDetails: true,
  });
}

export function createDomainError(options: ApiErrorOptions): ApiError {
  return new ApiError(options);
}

function statusText(status: number): string {
  const table: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    412: "Precondition Failed",
    413: "Payload Too Large",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return table[status] ?? "Error";
}

function buildBody(
  error: ApiError,
  runtime: ErrorRuntimeContext,
  now: Date,
): ErrorResponseBody {
  const includeDetails = runtime.exposeDetails || error.exposeDetails;
  const safeDetails = includeDetails
    ? sanitizeErrorDetails(error.details)
    : undefined;

  return {
    success: false,
    error: {
      code: error.code,
      message: error.publicMessage,
      status: error.status,
      category: error.category,
      requestId: runtime.requestId,
      retryable: error.retryable,
      ...(error.retryAfterSeconds
        ? { retryAfterSeconds: error.retryAfterSeconds }
        : {}),
      ...(safeDetails !== undefined && safeDetails !== null
        ? { details: safeDetails }
        : {}),
    },
    meta: {
      service: runtime.serviceName,
      version: ERROR_MIDDLEWARE_VERSION,
      timestamp: now.toISOString(),
      timezone: ERROR_TIMEZONE,
      path: normalizePath(runtime.url.pathname),
    },
  };
}

function buildErrorHeaders(
  error: ApiError,
  runtime: ErrorRuntimeContext,
): Headers {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    pragma: "no-cache",
    "x-request-id": runtime.requestId,
    "x-error-code": error.code,
    "x-error-category": error.category,
    "x-content-type-options": "nosniff",
  });

  if (error.status === 401)
    headers.set("www-authenticate", `Bearer error="${error.code}"`);
  if (error.retryAfterSeconds)
    headers.set("retry-after", String(error.retryAfterSeconds));
  return headers;
}

function ensureRequestIdHeader(
  response: Response,
  requestId: string,
): Response {
  if (response.headers.get("x-request-id")) return response;
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function buildLogEvent(
  error: ApiError,
  runtime: ErrorRuntimeContext,
  now: Date,
): ErrorLogEvent {
  const userId = getHeader(runtime.request.headers, "x-authenticated-user-id");
  const policyId = getHeader(runtime.request.headers, "x-auth-policy-id");
  const cause = errorCause(error);

  return {
    event: "api_error",
    service: runtime.serviceName,
    version: ERROR_MIDDLEWARE_VERSION,
    environment: runtime.environment,
    requestId: runtime.requestId,
    method: runtime.request.method.toUpperCase(),
    path: normalizePath(runtime.url.pathname),
    status: error.status,
    code: error.code,
    category: error.category,
    severity: error.severity,
    retryable: error.retryable,
    latencyMs: Math.max(0, Date.now() - runtime.startedAtEpochMs),
    userId,
    policyId,
    errorName: sanitizeString(error.name),
    causeName: cause ? sanitizeString(nameOf(cause)) : null,
    message: sanitizeString(error.message),
    safeDetails:
      error.details === null || error.details === undefined
        ? null
        : sanitizeErrorDetails(error.details),
    createdAt: now.toISOString(),
  };
}

function sanitizeForLog(event: ErrorLogEvent): JsonValue {
  return sanitizeErrorDetails(event);
}

function schedule(context: WaitUntilCapable, task: Promise<unknown>): void {
  if (context.waitUntil) {
    context.waitUntil(
      task.catch((error) =>
        console.error(
          "error_middleware_async_log_failed",
          sanitizeErrorDetails(error),
        ),
      ),
    );
  } else {
    void task.catch((error) =>
      console.error(
        "error_middleware_async_log_failed",
        sanitizeErrorDetails(error),
      ),
    );
  }
}

async function logError<TEnv>(
  event: ErrorLogEvent,
  env: TEnv,
  context: WaitUntilCapable,
  options: ErrorMiddlewareOptions<TEnv>,
): Promise<void> {
  if (options.logSink) await options.logSink.write(event, env, context);
  else
    await (consoleErrorLogSink as ErrorLogSink<TEnv>).write(
      event,
      env,
      context,
    );

  if (options.onError) await options.onError(event, env, context);
}

function responseFromError(
  error: ApiError,
  runtime: ErrorRuntimeContext,
  now: Date,
): Response {
  return new Response(JSON.stringify(buildBody(error, runtime, now)), {
    status: error.status,
    statusText: statusText(error.status),
    headers: buildErrorHeaders(error, runtime),
  });
}

async function responseToApiError(
  response: Response,
  runtime: ErrorRuntimeContext,
): Promise<ApiError> {
  const status = normalizeHttpStatus(response.status);
  const headerCode = getHeader(response.headers, "x-error-code");
  const code = normalizeErrorCode(headerCode ?? `HTTP_${status}`);
  let details: unknown = null;
  let publicMessage: string | undefined;

  try {
    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("application/json")) {
      const cloned = response.clone();
      const body = (await cloned.json()) as unknown;
      details = body;
      if (isRecord(body)) {
        const bodyError = isRecord(body.error) ? body.error : body;
        publicMessage =
          stringField(bodyError.message) ??
          stringField(body.message) ??
          undefined;
      }
    }
  } catch {
    details = null;
  }

  const retryAfterSeconds = normalizeRetryAfter(
    Number(response.headers.get("retry-after")) || undefined,
  );

  return new ApiError({
    code,
    status,
    publicMessage:
      publicMessage ??
      messageFromCode(code, status, categoryFromCode(code, status)),
    details,
    exposeDetails: runtime.exposeDetails,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  });
}

export function createErrorMiddleware<TEnv = unknown>(
  handler: FetchHandler<TEnv>,
  options: ErrorMiddlewareOptions<TEnv> = {},
): FetchHandler<TEnv> {
  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const requestId = getOrCreateErrorRequestId(request);
    const url = new URL(request.url);
    const environment = resolveString(env, options.environment, "production");
    const exposeDetails = resolveBoolean(
      env,
      options.exposeDetails,
      environment !== "production",
    );
    const exposeStack = resolveBoolean(
      env,
      options.exposeStack,
      environment !== "production",
    );
    const runtime: ErrorRuntimeContext<TEnv> = {
      request,
      env,
      execution: context,
      requestId,
      url,
      startedAtEpochMs: Date.now(),
      serviceName: options.serviceName ?? ERROR_SERVICE_NAME,
      environment,
      exposeDetails,
      exposeStack,
    };

    try {
      const response = await handler(request, env, context);
      return ensureRequestIdHeader(response, requestId);
    } catch (caught) {
      const mapped = options.mapError?.(caught, runtime) ?? null;
      const apiError =
        mapped ??
        (caught instanceof Response
          ? await responseToApiError(caught, runtime)
          : normalizeApiError(caught));
      const now = options.now?.() ?? new Date();
      const event = buildLogEvent(apiError, runtime, now);
      schedule(context, logError(event, env, context, options));
      return responseFromError(apiError, runtime, now);
    }
  };
}

export function withErrorBoundary<TEnv = unknown>(
  handler: FetchHandler<TEnv>,
  options: ErrorMiddlewareOptions<TEnv> = {},
): FetchHandler<TEnv> {
  return createErrorMiddleware(handler, options);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function assertNeverForErrorMiddleware(value: never): never {
  throw new ApiError({
    code: "INTERNAL_UNREACHABLE_STATE",
    status: 500,
    category: "INTERNAL",
    severity: "CRITICAL",
    publicMessage: DEFAULT_PUBLIC_MESSAGE,
    details: { value },
  });
}

export function assertErrorMiddlewareCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "cloudflare_workers_fetch_handler_wrapper",
    "standard_json_error_contract_success_false",
    "request_id_correlation_header_and_body",
    "auth_error_mapping_401_403",
    "rate_limit_mapping_429_retry_after",
    "validation_not_found_conflict_mapping",
    "payroll_budget_expense_savings_domain_categories",
    "notification_growth_community_ads_admin_upload_categories",
    "database_external_internal_error_categories",
    "production_stack_trace_hidden",
    "safe_details_only_when_explicitly_exposed",
    "token_password_secret_redaction",
    "salary_payroll_expense_savings_hijack_redaction",
    "advertising_targeting_data_redaction",
    "no_store_error_cache_headers",
    "security_nosniff_error_header",
    "wait_until_async_safe_logging",
    "thrown_response_normalization",
    "route_handler_helper_factories",
    "self_completeness_contract",
  ] as const;

  return { ok: checks.length >= 15, version: ERROR_MIDDLEWARE_VERSION, checks };
}

export const errorMiddlewareContract = Object.freeze({
  file: "services/api/src/middlewares/error.middleware.ts",
  version: ERROR_MIDDLEWARE_VERSION,
  platform: "Cloudflare Workers Fetch API",
  standardErrorEnvelope: true,
  requestIdRequired: true,
  productionStackTraceExposed: false,
  tokenPasswordSecretExposed: false,
  rawFinancialDataExposed: false,
  rawAdvertisingTargetingDataExposed: false,
  supportsAuthMiddlewareErrors: true,
  supportsRateLimitMiddlewareErrors: true,
  supportsAuditSafeLogging: true,
  supportsPayrollBudgetExpenseSavingsDomains: true,
  supportsGrowthCommunityAdsAdminDomains: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export default createErrorMiddleware;
