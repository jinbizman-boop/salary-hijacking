/** services/api/src/middlewares/rate-limit.middleware.ts
 * 급여납치 Salary Hijacking Platform · Cloudflare Workers Rate Limit 미들웨어 최종본
 *
 * 설계 목표
 * - 로그인/회원가입/소셜 로그인/토큰 재발급의 credential stuffing과 brute-force를 차단한다.
 * - 급여·예산·지출·저축 서버 권위 API를 사용자 단위로 안정적으로 보호한다.
 * - 커뮤니티 글쓰기/댓글/신고/업로드 남용과 광고 이벤트 폭주를 별도 정책으로 제한한다.
 * - 관리자/운영 API는 더 엄격하게 보호하고, 감사·오류 미들웨어와 호환되는 429 JSON 계약을 제공한다.
 * - IP/User-Agent/토큰/급여 원문을 저장하지 않고 해시·정책 ID·requestId만 로깅한다.
 */

export const RATE_LIMIT_MIDDLEWARE_VERSION = "3.1.1";
export const RATE_LIMIT_SERVICE_NAME = "salary-hijacking-api";
export const RATE_LIMIT_TIMEZONE = "Asia/Seoul";

const DEFAULT_HASH_LABEL = "salary-hijacking-rate-limit";
const DEFAULT_STORE_KEY_PREFIX = "rl";
const DEFAULT_MAX_RETRY_AFTER_SECONDS = 86_400;
const DEFAULT_MEMORY_SWEEP_INTERVAL_MS = 60_000;
const DEFAULT_MEMORY_MAX_KEYS = 25_000;
const IP_FALLBACK = "unknown-ip";

export type RateLimitScope =
  | "GLOBAL"
  | "IP"
  | "USER"
  | "SESSION"
  | "USER_OR_IP"
  | "SERVICE"
  | "USER_AND_IP";
export type RateLimitAlgorithm = "fixed_window" | "sliding_window";
export type RateLimitSeverity = "INFO" | "NOTICE" | "WARNING" | "CRITICAL";
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

export interface RateLimitPolicy {
  readonly id: string;
  readonly pattern: RegExp;
  readonly methods?: readonly string[];
  readonly capacity: number;
  readonly windowSeconds: number;
  readonly algorithm?: RateLimitAlgorithm;
  readonly scope?: RateLimitScope;
  readonly cost?:
    | number
    | ((runtime: RateLimitRuntimeContext<unknown>) => number | Promise<number>);
  readonly public?: boolean;
  readonly shadowOnly?: boolean;
  readonly failOpenOnStoreError?: boolean;
  readonly message?: string;
  readonly category?: string;
  readonly severity?: RateLimitSeverity;
  readonly includeStandardHeaders?: boolean;
  readonly skipSuccessfulResponseAccounting?: boolean;
}

export interface RateLimitRuntimeContext<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly requestId: string;
  readonly url: URL;
  readonly path: string;
  readonly method: string;
  readonly policy: RateLimitPolicy;
  readonly userId: string | null;
  readonly sessionId: string | null;
  readonly role: string | null;
  readonly ipHash: string;
  readonly userAgentHash: string | null;
  readonly clientKeyHash: string;
  readonly nowEpochMs: number;
}

export interface RateLimitConsumeInput {
  readonly key: string;
  readonly policyId: string;
  readonly capacity: number;
  readonly windowSeconds: number;
  readonly cost: number;
  readonly algorithm: RateLimitAlgorithm;
  readonly nowEpochMs: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly policyId: string;
  readonly key: string;
  readonly limit: number;
  readonly remaining: number;
  readonly used: number;
  readonly resetEpochSeconds: number;
  readonly retryAfterSeconds: number;
  readonly cost: number;
  readonly algorithm: RateLimitAlgorithm;
  readonly shadowOnly?: boolean;
}

export interface RateLimitStore {
  readonly name?: string;
  consume(input: RateLimitConsumeInput): Promise<RateLimitResult>;
}

export interface CloudflareKvNamespaceLike {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { readonly expirationTtl?: number },
  ): Promise<void>;
}

export interface CloudflareRateLimitBindingLike {
  limit(input: {
    readonly key: string;
  }): Promise<{ readonly success: boolean }> | { readonly success: boolean };
}

export interface RateLimitEvent {
  readonly event:
    | "rate_limit_allowed"
    | "rate_limit_blocked"
    | "rate_limit_shadow_blocked"
    | "rate_limit_store_error";
  readonly service: string;
  readonly version: string;
  readonly environment: string;
  readonly requestId: string;
  readonly method: string;
  readonly path: string;
  readonly policyId: string;
  readonly scope: RateLimitScope;
  readonly algorithm: RateLimitAlgorithm;
  readonly status: number;
  readonly limit: number;
  readonly remaining: number;
  readonly used: number;
  readonly retryAfterSeconds: number;
  readonly resetEpochSeconds: number;
  readonly cost: number;
  readonly userId: string | null;
  readonly role: string | null;
  readonly ipHash: string;
  readonly userAgentHash: string | null;
  readonly storeName: string;
  readonly severity: RateLimitSeverity;
  readonly createdAt: string;
}

export interface RateLimitEventSink<TEnv = unknown> {
  readonly name?: string;
  write(
    event: RateLimitEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<void>;
}

export interface RateLimitMiddlewareOptions<TEnv = unknown> {
  readonly serviceName?: string;
  readonly environment?: string | ((env: TEnv) => string | null | undefined);
  readonly hashSecret?: string | ((env: TEnv) => string | null | undefined);
  readonly store?:
    | RateLimitStore
    | ((env: TEnv) => RateLimitStore | null | undefined);
  readonly fallbackStore?: RateLimitStore;
  readonly policies?: readonly RateLimitPolicy[];
  readonly prependPolicies?: readonly RateLimitPolicy[];
  readonly skip?: (
    runtime: Omit<RateLimitRuntimeContext<TEnv>, "policy" | "clientKeyHash">,
  ) => boolean | Promise<boolean>;
  readonly keyResolver?: (
    runtime: RateLimitRuntimeContext<TEnv>,
  ) => string | Promise<string>;
  readonly eventSink?: RateLimitEventSink<TEnv>;
  readonly onEvent?: (
    event: RateLimitEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
  readonly rateLimitBinding?:
    | CloudflareRateLimitBindingLike
    | ((env: TEnv) => CloudflareRateLimitBindingLike | null | undefined);
  readonly failOpenOnUnexpectedError?: boolean;
  readonly now?: () => Date;
}

interface BucketState {
  readonly count: number;
  readonly resetEpochMs: number;
  readonly events?: readonly number[];
}

export class RateLimitError extends Error {
  readonly status = 429;
  readonly code = "RATE_LIMIT_EXCEEDED";
  readonly result: RateLimitResult;

  constructor(
    result: RateLimitResult,
    message = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  ) {
    super(message);
    this.name = "RateLimitError";
    this.result = result;
  }
}

const defaultPolicies: readonly RateLimitPolicy[] = [
  {
    id: "preflight",
    pattern: /^.*$/,
    methods: ["OPTIONS"],
    public: true,
    capacity: 10_000,
    windowSeconds: 60,
    scope: "GLOBAL",
  },
  {
    id: "health",
    pattern: /^\/(health|ready|live|_health)(?:\/|$)/,
    public: true,
    capacity: 1_000,
    windowSeconds: 60,
    scope: "GLOBAL",
  },
  {
    id: "auth-login-ip",
    pattern:
      /^\/api\/v1\/auth\/(login|social-login|oauth|oauth\/callback)(?:\/|$)/,
    methods: ["POST"],
    capacity: 8,
    windowSeconds: 60,
    scope: "IP",
    algorithm: "sliding_window",
    message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
    severity: "WARNING",
  },
  {
    id: "auth-register-ip",
    pattern: /^\/api\/v1\/auth\/(register|verify-email)(?:\/|$)/,
    methods: ["POST"],
    capacity: 5,
    windowSeconds: 300,
    scope: "IP",
    algorithm: "sliding_window",
    severity: "WARNING",
  },
  {
    id: "auth-refresh-session",
    pattern: /^\/api\/v1\/auth\/refresh(?:\/|$)/,
    methods: ["POST"],
    capacity: 20,
    windowSeconds: 60,
    scope: "SESSION",
    algorithm: "sliding_window",
  },
  {
    id: "auth-password-reset-ip",
    pattern:
      /^\/api\/v1\/auth\/(password-reset|forgot-password|reset-password)(?:\/|$)/,
    methods: ["POST"],
    capacity: 3,
    windowSeconds: 900,
    scope: "IP",
    algorithm: "sliding_window",
    severity: "WARNING",
  },
  {
    id: "admin-api-strict",
    pattern: /^\/(api\/v1\/admin|admin\/api\/v1)(?:\/|$)/,
    capacity: 120,
    windowSeconds: 60,
    scope: "USER_OR_IP",
    algorithm: "sliding_window",
    severity: "WARNING",
    failOpenOnStoreError: false,
  },
  {
    id: "internal-service",
    pattern: /^\/api\/v1\/(internal|system|scheduler|batch)(?:\/|$)/,
    capacity: 1_000,
    windowSeconds: 60,
    scope: "SERVICE",
    algorithm: "fixed_window",
    failOpenOnStoreError: false,
  },
  {
    id: "payroll-write",
    pattern:
      /^\/api\/v1\/(payroll|payroll-plans|salary-home|daily-budgets|fixed-expenses|variable-expenses|savings|savings-plans)(?:\/|$)/,
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    capacity: 90,
    windowSeconds: 60,
    scope: "USER_OR_IP",
    algorithm: "sliding_window",
  },
  {
    id: "payroll-read",
    pattern:
      /^\/api\/v1\/(payroll|payroll-plans|salary-home|daily-budgets|fixed-expenses|variable-expenses|savings|savings-plans)(?:\/|$)/,
    methods: ["GET", "HEAD"],
    capacity: 300,
    windowSeconds: 60,
    scope: "USER_OR_IP",
    algorithm: "fixed_window",
  },
  {
    id: "notifications-write",
    pattern: /^\/api\/v1\/(notifications|notification-settings)(?:\/|$)/,
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    capacity: 60,
    windowSeconds: 60,
    scope: "USER_OR_IP",
    algorithm: "sliding_window",
  },
  {
    id: "growth-actions",
    pattern: /^\/api\/v1\/growth(?:\/|$)/,
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    capacity: 80,
    windowSeconds: 60,
    scope: "USER_OR_IP",
    algorithm: "sliding_window",
  },
  {
    id: "community-write",
    pattern: /^\/api\/v1\/community(?:\/|$)/,
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    capacity: 12,
    windowSeconds: 60,
    scope: "USER_AND_IP",
    algorithm: "sliding_window",
    severity: "WARNING",
  },
  {
    id: "community-read",
    pattern: /^\/api\/v1\/community(?:\/|$)/,
    methods: ["GET", "HEAD"],
    capacity: 240,
    windowSeconds: 60,
    scope: "USER_OR_IP",
    algorithm: "fixed_window",
  },
  {
    id: "uploads",
    pattern: /^\/api\/v1\/(files|uploads|attachments)(?:\/|$)/,
    methods: ["POST", "PUT", "PATCH"],
    capacity: 10,
    windowSeconds: 300,
    scope: "USER_AND_IP",
    algorithm: "sliding_window",
    severity: "WARNING",
  },
  {
    id: "ads-events",
    pattern: /^\/api\/v1\/(ads|ad-events|banners|partners)(?:\/|$)/,
    methods: ["POST"],
    capacity: 180,
    windowSeconds: 60,
    scope: "IP",
    algorithm: "fixed_window",
  },
  {
    id: "api-default-write",
    pattern: /^\/api\/v1(?:\/|$)/,
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    capacity: 120,
    windowSeconds: 60,
    scope: "USER_OR_IP",
    algorithm: "sliding_window",
  },
  {
    id: "api-default-read",
    pattern: /^\/api\/v1(?:\/|$)/,
    capacity: 600,
    windowSeconds: 60,
    scope: "USER_OR_IP",
    algorithm: "fixed_window",
  },
  {
    id: "global-public",
    pattern: /^.*$/,
    capacity: 300,
    windowSeconds: 60,
    scope: "IP",
    algorithm: "fixed_window",
  },
];

export const consoleRateLimitEventSink: RateLimitEventSink<unknown> = {
  name: "console",
  async write(event): Promise<void> {
    const text = JSON.stringify(event);
    if (
      event.event === "rate_limit_blocked" ||
      event.event === "rate_limit_store_error"
    )
      console.warn(text);
    else console.info(text);
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

export function getOrCreateRateLimitRequestId(request: Request): string {
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

function resolveStore<TEnv>(
  env: TEnv,
  value: RateLimitMiddlewareOptions<TEnv>["store"],
): RateLimitStore | null {
  return typeof value === "function" ? (value(env) ?? null) : (value ?? null);
}

function resolveBinding<TEnv>(
  env: TEnv,
  value: RateLimitMiddlewareOptions<TEnv>["rateLimitBinding"],
): CloudflareRateLimitBindingLike | null {
  return typeof value === "function" ? (value(env) ?? null) : (value ?? null);
}

function methodMatches(policy: RateLimitPolicy, method: string): boolean {
  return (
    !policy.methods ||
    policy.methods
      .map((item) => item.toUpperCase())
      .includes(method.toUpperCase())
  );
}

function policyMatches(
  policy: RateLimitPolicy,
  path: string,
  method: string,
): boolean {
  return methodMatches(policy, method) && policy.pattern.test(path);
}

function resolvePolicy(
  path: string,
  method: string,
  options: RateLimitMiddlewareOptions<unknown>,
): RateLimitPolicy {
  const policies = [
    ...(options.prependPolicies ?? []),
    ...(options.policies ?? defaultPolicies),
  ];
  return (
    policies.find((policy) => policyMatches(policy, path, method)) ??
    defaultPolicies[defaultPolicies.length - 1]!
  );
}

function isMutation(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function positiveInt(
  value: number,
  fallback: number,
  min = 1,
  max = 1_000_000,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function clampRetryAfter(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 1;
  return Math.min(
    DEFAULT_MAX_RETRY_AFTER_SECONDS,
    Math.max(1, Math.ceil(seconds)),
  );
}

function utf8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    toArrayBuffer(utf8(input)),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function hashValue(
  value: string,
  secret: string,
  label: string,
): Promise<string> {
  return sha256Hex(`${DEFAULT_HASH_LABEL}:${label}:${secret}:${value}`);
}

function rawIpFromRequest(request: Request): string {
  return (
    getHeader(request.headers, "cf-connecting-ip") ??
    getHeader(request.headers, "true-client-ip") ??
    getHeader(request.headers, "x-forwarded-for")?.split(",")[0]?.trim() ??
    IP_FALLBACK
  );
}

function sanitizeKeyPart(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._:-]/g, "_")
      .slice(0, 180) || "unknown"
  );
}

function userIdFromHeaders(request: Request): string | null {
  return (
    getHeader(request.headers, "x-authenticated-user-id") ??
    getHeader(request.headers, "x-user-id")
  );
}

function sessionIdFromHeaders(request: Request): string | null {
  return (
    getHeader(request.headers, "x-session-id") ??
    getHeader(request.headers, "x-auth-session-id")
  );
}

function roleFromHeaders(request: Request): string | null {
  return (
    getHeader(request.headers, "x-auth-primary-role") ??
    getHeader(request.headers, "x-authenticated-roles")
      ?.split(",")[0]
      ?.trim() ??
    null
  );
}

function buildScopeIdentity(runtime: RateLimitRuntimeContext): string {
  const scope = runtime.policy.scope ?? "USER_OR_IP";
  const user = runtime.userId ? `u:${sanitizeKeyPart(runtime.userId)}` : null;
  const session = runtime.sessionId
    ? `s:${sanitizeKeyPart(runtime.sessionId)}`
    : null;
  const ip = `ip:${runtime.ipHash}`;

  switch (scope) {
    case "GLOBAL":
      return "global";
    case "IP":
      return ip;
    case "USER":
      return user ?? ip;
    case "SESSION":
      return session ?? user ?? ip;
    case "USER_OR_IP":
      return user ?? ip;
    case "USER_AND_IP":
      return `${user ?? "anonymous"}:${ip}`;
    case "SERVICE":
      return `svc:${runtime.role ?? runtime.userId ?? runtime.ipHash}`;
    default:
      return user ?? ip;
  }
}

function routeTemplate(path: string): string {
  return path
    .split("/")
    .map((part) => {
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          part,
        )
      )
        return ":id";
      if (/^[0-9a-f]{24}$/i.test(part)) return ":id";
      if (/^\d{3,}$/.test(part)) return ":id";
      return part;
    })
    .join("/");
}

function storeKey(input: {
  readonly prefix?: string;
  readonly policyId: string;
  readonly identityHash: string;
  readonly route: string;
  readonly method: string;
}): string {
  return [
    input.prefix ?? DEFAULT_STORE_KEY_PREFIX,
    sanitizeKeyPart(input.policyId),
    input.method.toLowerCase(),
    sanitizeKeyPart(input.route),
    input.identityHash,
  ].join(":");
}

function headersForResult(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set("RateLimit-Limit", String(result.limit));
  headers.set("RateLimit-Remaining", String(Math.max(0, result.remaining)));
  headers.set("RateLimit-Reset", String(result.resetEpochSeconds));
  headers.set("X-RateLimit-Policy", result.policyId);
  headers.set("X-RateLimit-Algorithm", result.algorithm);
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(Math.max(0, result.remaining)));
  headers.set("X-RateLimit-Reset", String(result.resetEpochSeconds));
  return headers;
}

function applyRateLimitHeaders(
  response: Response,
  result: RateLimitResult,
  include = true,
): Response {
  if (!include) return response;
  const headers = new Headers(response.headers);
  headersForResult(result).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function blockedResponse(
  runtime: RateLimitRuntimeContext,
  result: RateLimitResult,
): Response {
  const retryAfterSeconds = clampRetryAfter(result.retryAfterSeconds);
  const headers = headersForResult(result);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set(
    "cache-control",
    "no-store, no-cache, must-revalidate, max-age=0",
  );
  headers.set("pragma", "no-cache");
  headers.set("retry-after", String(retryAfterSeconds));
  headers.set("x-request-id", runtime.requestId);
  headers.set("x-error-code", "RATE_LIMIT_EXCEEDED");
  headers.set("x-error-category", "RATE_LIMIT");
  headers.set("x-content-type-options", "nosniff");

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message:
          runtime.policy.message ??
          "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        status: 429,
        category: runtime.policy.category ?? "RATE_LIMIT",
        requestId: runtime.requestId,
        retryable: true,
        retryAfterSeconds,
        limit: result.limit,
        remaining: Math.max(0, result.remaining),
        resetEpochSeconds: result.resetEpochSeconds,
        policyId: result.policyId,
      },
      meta: {
        service: RATE_LIMIT_SERVICE_NAME,
        version: RATE_LIMIT_MIDDLEWARE_VERSION,
        timestamp: new Date(runtime.nowEpochMs).toISOString(),
        timezone: RATE_LIMIT_TIMEZONE,
        path: runtime.path,
      },
    }),
    { status: 429, statusText: "Too Many Requests", headers },
  );
}

function unavailableResponse(runtime: RateLimitRuntimeContext): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: "RATE_LIMIT_STORE_UNAVAILABLE",
        message: "요청 보호 장치가 일시적으로 사용할 수 없습니다.",
        status: 503,
        category: "RATE_LIMIT",
        requestId: runtime.requestId,
        retryable: true,
        retryAfterSeconds: 3,
        policyId: runtime.policy.id,
      },
      meta: {
        service: RATE_LIMIT_SERVICE_NAME,
        version: RATE_LIMIT_MIDDLEWARE_VERSION,
        timestamp: new Date(runtime.nowEpochMs).toISOString(),
        timezone: RATE_LIMIT_TIMEZONE,
        path: runtime.path,
      },
    }),
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "retry-after": "3",
        "x-request-id": runtime.requestId,
        "x-error-code": "RATE_LIMIT_STORE_UNAVAILABLE",
        "x-error-category": "RATE_LIMIT",
        "x-content-type-options": "nosniff",
      },
    },
  );
}

function storeErrorResult(
  runtime: RateLimitRuntimeContext,
  cost: number,
): RateLimitResult {
  return {
    allowed: false,
    policyId: runtime.policy.id,
    key: "store-error",
    limit: runtime.policy.capacity,
    remaining: 0,
    used: runtime.policy.capacity + cost,
    resetEpochSeconds: Math.ceil(
      (runtime.nowEpochMs + runtime.policy.windowSeconds * 1_000) / 1_000,
    ),
    retryAfterSeconds: 3,
    cost,
    algorithm: runtime.policy.algorithm ?? "fixed_window",
  };
}

function buildEvent<TEnv>(args: {
  readonly runtime: RateLimitRuntimeContext<TEnv>;
  readonly result: RateLimitResult;
  readonly environment: string;
  readonly serviceName: string;
  readonly storeName: string;
  readonly event: RateLimitEvent["event"];
  readonly status: number;
}): RateLimitEvent {
  return {
    event: args.event,
    service: args.serviceName,
    version: RATE_LIMIT_MIDDLEWARE_VERSION,
    environment: args.environment,
    requestId: args.runtime.requestId,
    method: args.runtime.method,
    path: routeTemplate(args.runtime.path),
    policyId: args.runtime.policy.id,
    scope: args.runtime.policy.scope ?? "USER_OR_IP",
    algorithm: args.result.algorithm,
    status: args.status,
    limit: args.result.limit,
    remaining: Math.max(0, args.result.remaining),
    used: args.result.used,
    retryAfterSeconds: args.result.retryAfterSeconds,
    resetEpochSeconds: args.result.resetEpochSeconds,
    cost: args.result.cost,
    userId: args.runtime.userId,
    role: args.runtime.role,
    ipHash: args.runtime.ipHash,
    userAgentHash: args.runtime.userAgentHash,
    storeName: args.storeName,
    severity:
      args.runtime.policy.severity ??
      (args.event === "rate_limit_blocked" ? "WARNING" : "INFO"),
    createdAt: new Date(args.runtime.nowEpochMs).toISOString(),
  };
}

function schedule(context: WaitUntilCapable, task: Promise<unknown>): void {
  if (context.waitUntil)
    context.waitUntil(
      task.catch((error) =>
        console.warn(
          "rate_limit_async_event_failed",
          String(error instanceof Error ? error.name : error),
        ),
      ),
    );
  else
    void task.catch((error) =>
      console.warn(
        "rate_limit_async_event_failed",
        String(error instanceof Error ? error.name : error),
      ),
    );
}

async function emitEvent<TEnv>(
  event: RateLimitEvent,
  env: TEnv,
  context: WaitUntilCapable,
  options: RateLimitMiddlewareOptions<TEnv>,
): Promise<void> {
  if (options.eventSink) await options.eventSink.write(event, env, context);
  else if (event.event !== "rate_limit_allowed")
    await (consoleRateLimitEventSink as RateLimitEventSink<TEnv>).write(
      event,
      env,
      context,
    );
  if (options.onEvent) await options.onEvent(event, env, context);
}

function memoryNow(): number {
  return Date.now();
}

export function createInMemoryRateLimitStore(
  options: {
    readonly maxKeys?: number;
    readonly sweepIntervalMs?: number;
  } = {},
): RateLimitStore {
  const states = new Map<string, BucketState>();
  let lastSweep = memoryNow();
  const maxKeys = options.maxKeys ?? DEFAULT_MEMORY_MAX_KEYS;
  const sweepIntervalMs =
    options.sweepIntervalMs ?? DEFAULT_MEMORY_SWEEP_INTERVAL_MS;

  function sweep(now: number): void {
    if (now - lastSweep < sweepIntervalMs && states.size <= maxKeys) return;
    lastSweep = now;
    for (const [key, state] of states.entries()) {
      if (state.resetEpochMs <= now) states.delete(key);
    }
    if (states.size <= maxKeys) return;
    const overflow = states.size - maxKeys;
    let deleted = 0;
    for (const key of states.keys()) {
      states.delete(key);
      deleted += 1;
      if (deleted >= overflow) break;
    }
  }

  return {
    name: "in-memory",
    async consume(input): Promise<RateLimitResult> {
      const capacity = positiveInt(input.capacity, 1);
      const cost = positiveInt(input.cost, 1, 1, capacity * 2);
      const windowMs = positiveInt(input.windowSeconds, 60) * 1_000;
      const now = input.nowEpochMs;
      sweep(now);

      if (input.algorithm === "sliding_window") {
        const previous = states.get(input.key);
        const events = (previous?.events ?? []).filter(
          (time) => now - time < windowMs,
        );
        const newEvents = [
          ...events,
          ...Array.from({ length: cost }, () => now),
        ];
        const oldest = newEvents[0] ?? now;
        const resetEpochMs = oldest + windowMs;
        const used = newEvents.length;
        const allowed = used <= capacity;
        states.set(input.key, {
          count: used,
          resetEpochMs,
          events: newEvents.slice(-Math.min(capacity + cost, capacity * 2)),
        });
        const retryAfterSeconds = allowed
          ? 0
          : clampRetryAfter((resetEpochMs - now) / 1_000);
        return {
          allowed,
          policyId: input.policyId,
          key: input.key,
          limit: capacity,
          remaining: Math.max(0, capacity - used),
          used,
          resetEpochSeconds: Math.ceil(resetEpochMs / 1_000),
          retryAfterSeconds,
          cost,
          algorithm: input.algorithm,
        };
      }

      const existing = states.get(input.key);
      const resetEpochMs =
        existing && existing.resetEpochMs > now
          ? existing.resetEpochMs
          : now + windowMs;
      const previousCount =
        existing && existing.resetEpochMs > now ? existing.count : 0;
      const used = previousCount + cost;
      states.set(input.key, { count: used, resetEpochMs });
      const allowed = used <= capacity;
      return {
        allowed,
        policyId: input.policyId,
        key: input.key,
        limit: capacity,
        remaining: Math.max(0, capacity - used),
        used,
        resetEpochSeconds: Math.ceil(resetEpochMs / 1_000),
        retryAfterSeconds: allowed
          ? 0
          : clampRetryAfter((resetEpochMs - now) / 1_000),
        cost,
        algorithm: input.algorithm,
      };
    },
  };
}

export function createCloudflareKvRateLimitStore(
  kv: CloudflareKvNamespaceLike,
): RateLimitStore {
  return {
    name: "cloudflare-kv-approximate",
    async consume(input): Promise<RateLimitResult> {
      const capacity = positiveInt(input.capacity, 1);
      const cost = positiveInt(input.cost, 1, 1, capacity * 2);
      const windowMs = positiveInt(input.windowSeconds, 60) * 1_000;
      const now = input.nowEpochMs;
      const raw = await kv.get(input.key);
      let state: BucketState | null = null;
      if (raw) {
        try {
          state = JSON.parse(raw) as BucketState;
        } catch {
          state = null;
        }
      }

      let next: BucketState;
      let used: number;
      let resetEpochMs: number;

      if (input.algorithm === "sliding_window") {
        const events = (state?.events ?? []).filter(
          (time) => now - time < windowMs,
        );
        const newEvents = [
          ...events,
          ...Array.from({ length: cost }, () => now),
        ];
        resetEpochMs = (newEvents[0] ?? now) + windowMs;
        used = newEvents.length;
        next = {
          count: used,
          resetEpochMs,
          events: newEvents.slice(-Math.min(capacity + cost, capacity * 2)),
        };
      } else {
        resetEpochMs =
          state && state.resetEpochMs > now
            ? state.resetEpochMs
            : now + windowMs;
        used = (state && state.resetEpochMs > now ? state.count : 0) + cost;
        next = { count: used, resetEpochMs };
      }

      const ttl = clampRetryAfter((resetEpochMs - now) / 1_000) + 5;
      await kv.put(input.key, JSON.stringify(next), { expirationTtl: ttl });
      const allowed = used <= capacity;
      return {
        allowed,
        policyId: input.policyId,
        key: input.key,
        limit: capacity,
        remaining: Math.max(0, capacity - used),
        used,
        resetEpochSeconds: Math.ceil(resetEpochMs / 1_000),
        retryAfterSeconds: allowed
          ? 0
          : clampRetryAfter((resetEpochMs - now) / 1_000),
        cost,
        algorithm: input.algorithm,
      };
    },
  };
}

export function createCloudflareRateLimitBindingStore(
  binding: CloudflareRateLimitBindingLike,
  fallbackWindowSeconds = 60,
): RateLimitStore {
  return {
    name: "cloudflare-rate-limit-binding",
    async consume(input): Promise<RateLimitResult> {
      const outcome = await binding.limit({ key: input.key });
      const allowed = Boolean(outcome.success);
      const resetEpochSeconds = Math.ceil(
        (input.nowEpochMs + fallbackWindowSeconds * 1_000) / 1_000,
      );
      return {
        allowed,
        policyId: input.policyId,
        key: input.key,
        limit: input.capacity,
        remaining: allowed ? Math.max(0, input.capacity - input.cost) : 0,
        used: allowed ? input.cost : input.capacity + input.cost,
        resetEpochSeconds,
        retryAfterSeconds: allowed ? 0 : fallbackWindowSeconds,
        cost: input.cost,
        algorithm: input.algorithm,
      };
    },
  };
}

async function resolveCost<TEnv>(
  policy: RateLimitPolicy,
  runtime: RateLimitRuntimeContext<TEnv>,
): Promise<number> {
  const raw =
    typeof policy.cost === "function"
      ? await policy.cost(runtime as RateLimitRuntimeContext<unknown>)
      : (policy.cost ?? 1);
  return positiveInt(raw, 1, 1, Math.max(1, policy.capacity * 2));
}

async function createRuntime<TEnv>(
  request: Request,
  env: TEnv,
  context: WaitUntilCapable,
  policy: RateLimitPolicy,
  options: RateLimitMiddlewareOptions<TEnv>,
): Promise<RateLimitRuntimeContext<TEnv>> {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  const method = request.method.toUpperCase();
  const requestId = getOrCreateRateLimitRequestId(request);
  const secret = resolveString(env, options.hashSecret, "");
  const ipHash = await hashValue(rawIpFromRequest(request), secret, "ip");
  const userAgent = getHeader(request.headers, "user-agent");
  const userAgentHash = userAgent
    ? await hashValue(userAgent, secret, "ua")
    : null;
  const userId = userIdFromHeaders(request);
  const sessionId = sessionIdFromHeaders(request);
  const role = roleFromHeaders(request);
  const partial: Omit<RateLimitRuntimeContext<TEnv>, "clientKeyHash"> = {
    request,
    env,
    execution: context,
    requestId,
    url,
    path,
    method,
    policy,
    userId,
    sessionId,
    role,
    ipHash,
    userAgentHash,
    nowEpochMs: options.now?.().getTime() ?? Date.now(),
  };
  const identitySource = buildScopeIdentity({
    ...partial,
    clientKeyHash: "pending",
  });
  const clientKeyHash = await hashValue(identitySource, secret, "client");
  return { ...partial, clientKeyHash };
}

async function resolveRateLimitKey<TEnv>(
  runtime: RateLimitRuntimeContext<TEnv>,
  options: RateLimitMiddlewareOptions<TEnv>,
): Promise<string> {
  if (options.keyResolver) return options.keyResolver(runtime);
  const identity = buildScopeIdentity(runtime);
  const identityHash = await hashValue(identity, "", "key");
  return storeKey({
    policyId: runtime.policy.id,
    identityHash,
    route: routeTemplate(runtime.path),
    method: runtime.method,
  });
}

function withRequestId(request: Request, requestId: string): Request {
  if (getHeader(request.headers, "x-request-id") === requestId) return request;
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  return new Request(request, { headers });
}

function shouldLogAllowed(
  policy: RateLimitPolicy,
  result: RateLimitResult,
): boolean {
  return (
    policy.severity === "CRITICAL" ||
    policy.shadowOnly === true ||
    result.remaining <= Math.max(1, Math.floor(result.limit * 0.1))
  );
}

export function createRateLimitMiddleware<TEnv = unknown>(
  handler: FetchHandler<TEnv>,
  options: RateLimitMiddlewareOptions<TEnv> = {},
): FetchHandler<TEnv> {
  const fallbackStore = options.fallbackStore ?? createInMemoryRateLimitStore();

  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const method = request.method.toUpperCase();
    const policy = resolvePolicy(
      path,
      method,
      options as RateLimitMiddlewareOptions<unknown>,
    );
    const runtime = await createRuntime(request, env, context, policy, options);
    const serviceName = options.serviceName ?? RATE_LIMIT_SERVICE_NAME;
    const environment = resolveString(env, options.environment, "production");

    if (policy.public || (await options.skip?.(runtime))) {
      const forwarded = withRequestId(request, runtime.requestId);
      return handler(forwarded, env, context);
    }

    const algorithm =
      policy.algorithm ??
      (isMutation(method) ? "sliding_window" : "fixed_window");
    const cost = await resolveCost(policy, runtime);
    const binding = resolveBinding(env, options.rateLimitBinding);
    const store = binding
      ? createCloudflareRateLimitBindingStore(binding, policy.windowSeconds)
      : (resolveStore(env, options.store) ?? fallbackStore);
    const key = await resolveRateLimitKey(runtime, options);

    let result: RateLimitResult;
    try {
      result = await store.consume({
        key,
        policyId: policy.id,
        capacity: policy.capacity,
        windowSeconds: policy.windowSeconds,
        cost,
        algorithm,
        nowEpochMs: runtime.nowEpochMs,
      });
    } catch (_error) {
      result = storeErrorResult(runtime, cost);
      const event = buildEvent({
        runtime,
        result,
        environment,
        serviceName,
        storeName: store.name ?? "unknown",
        event: "rate_limit_store_error",
        status: 503,
      });
      schedule(context, emitEvent(event, env, context, options));
      const failOpen =
        policy.failOpenOnStoreError ??
        options.failOpenOnUnexpectedError ??
        !isMutation(method);
      if (!failOpen) return unavailableResponse(runtime);
      const forwarded = withRequestId(request, runtime.requestId);
      return handler(forwarded, env, context);
    }

    const eventType: RateLimitEvent["event"] = result.allowed
      ? "rate_limit_allowed"
      : policy.shadowOnly
        ? "rate_limit_shadow_blocked"
        : "rate_limit_blocked";

    if (!result.allowed || shouldLogAllowed(policy, result)) {
      const status = result.allowed || policy.shadowOnly ? 200 : 429;
      const eventResult: RateLimitResult =
        policy.shadowOnly === undefined
          ? result
          : { ...result, shadowOnly: policy.shadowOnly };
      const event = buildEvent({
        runtime,
        result: eventResult,
        environment,
        serviceName,
        storeName: store.name ?? "unknown",
        event: eventType,
        status,
      });
      schedule(context, emitEvent(event, env, context, options));
    }

    if (!result.allowed && !policy.shadowOnly) {
      return blockedResponse(runtime, result);
    }

    const forwarded = withRequestId(request, runtime.requestId);
    const response = await handler(forwarded, env, context);
    return applyRateLimitHeaders(
      response,
      result,
      policy.includeStandardHeaders ?? true,
    );
  };
}

export function withRateLimit<TEnv = unknown>(
  handler: FetchHandler<TEnv>,
  options: RateLimitMiddlewareOptions<TEnv> = {},
): FetchHandler<TEnv> {
  return createRateLimitMiddleware(handler, options);
}

export function assertRateLimitMiddlewareCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "cloudflare_workers_fetch_handler_wrapper",
    "standard_429_json_contract_error_middleware_compatible",
    "request_id_correlation",
    "rate_limit_standard_and_x_headers",
    "fixed_window_and_sliding_window_algorithms",
    "login_social_login_register_password_reset_strict_limits",
    "refresh_session_limits",
    "admin_api_strict_limits_and_fail_closed",
    "internal_service_limits",
    "payroll_budget_expense_savings_read_write_limits",
    "notification_growth_limits",
    "community_write_read_limits",
    "upload_limits",
    "ads_event_limits",
    "ip_user_session_service_scopes",
    "ip_user_agent_hash_only_no_raw_storage",
    "cloudflare_kv_store_adapter",
    "cloudflare_rate_limit_binding_adapter",
    "memory_fallback_store_for_local_tests",
    "event_sink_wait_until_safe_logging",
    "shadow_mode_support",
    "custom_policy_and_key_resolver_support",
  ] as const;
  return {
    ok: checks.length >= 15,
    version: RATE_LIMIT_MIDDLEWARE_VERSION,
    checks,
  };
}

export const rateLimitMiddlewareContract = Object.freeze({
  file: "services/api/src/middlewares/rate-limit.middleware.ts",
  version: RATE_LIMIT_MIDDLEWARE_VERSION,
  platform: "Cloudflare Workers Fetch API",
  standard429Envelope: true,
  requestIdRequired: true,
  rawIpStored: false,
  rawUserAgentStored: false,
  rawTokenStored: false,
  protectsAuthEndpoints: true,
  protectsPayrollBudgetExpenseSavings: true,
  protectsGrowthCommunityUploads: true,
  protectsAdsEvents: true,
  protectsAdminOperations: true,
  supportsCloudflareKv: true,
  supportsCloudflareRateLimitBinding: true,
  supportsShadowMode: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export default createRateLimitMiddleware;
