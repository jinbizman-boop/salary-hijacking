/** services/notifications/src/index.ts
 * 급여납치 Salary Hijacking Platform · Notifications Worker/Service Entrypoint 최종본
 * Cloudflare Workers/Web Fetch API 호환. FCM HTTP v1 client를 런타임 엔트리로 연결한다.
 */

import {
  FCM_CLIENT_VERSION,
  assertFcmClientCompleteness,
  createFcmClient,
  fcmClientManifest,
  type FcmAndroidConfigInput,
  type FcmApnsConfigInput,
  type FcmClient,
  type FcmConditionInput,
  type FcmDomainData,
  type FcmEnvLike,
  type FcmMulticastInput,
  type FcmMulticastResult,
  type FcmNotificationPayload,
  type FcmRuntimeContext,
  type FcmSendInput,
  type FcmSendResult,
  type FcmTopicInput,
  type FcmWebpushConfigInput,
  type JsonRecord,
  type JsonValue,
  type WaitUntilCapable,
} from "./fcm.client";

export const NOTIFICATIONS_SERVICE_VERSION = "3.1.2";
export const NOTIFICATIONS_SERVICE_NAME = "salary-hijacking-notifications";
export const NOTIFICATIONS_API_PREFIX = "/notifications/v1";
export const NOTIFICATIONS_PUBLIC_API_PREFIX = "/api/v1/notifications/internal";
export const NOTIFICATIONS_RUNTIME = "cloudflare-workers-module-worker";

const MAX_JSON_BODY_BYTES = 256 * 1024;
const REQUEST_ID_HEADER = "x-request-id";
const DEFAULT_ALLOWED_METHODS = "GET,HEAD,POST,OPTIONS";
const DEFAULT_ALLOWED_HEADERS =
  "authorization, content-type, x-request-id, x-correlation-id, x-service-token, x-idempotency-key";

type HttpMethod = "GET" | "HEAD" | "POST" | "OPTIONS";
type QueueType =
  | "FCM_SEND"
  | "FCM_MULTICAST"
  | "FCM_TOPIC"
  | "FCM_CONDITION"
  | "FCM_VALIDATE";
type Operation =
  | "READ"
  | "SEND"
  | "VALIDATE"
  | "QUEUE"
  | "SCHEDULED"
  | "SYSTEM";
type OperationStatus = "SUCCESS" | "FAILURE" | "DENIED" | "SKIPPED";
type ServiceAuthMode = "HASH" | "PLAINTEXT" | "DEVELOPMENT_BYPASS";
type JsonPrimitiveInput = string | number | boolean | null;
type MutableSendInput = {
  -readonly [K in keyof FcmSendInput]?: FcmSendInput[K];
} & Pick<FcmSendInput, "notification" | "data">;
type MutableMulticastInput = {
  -readonly [K in keyof FcmMulticastInput]?: FcmMulticastInput[K];
} & Pick<FcmMulticastInput, "notification" | "data" | "tokens">;

export interface NotificationsEnv extends FcmEnvLike {
  readonly APP_ENV?: string;
  readonly ENVIRONMENT?: string;
  readonly NODE_ENV?: string;
  readonly CORS_ALLOWED_ORIGINS?: string;
  readonly ALLOWED_ORIGINS?: string;
  readonly NOTIFICATIONS_SERVICE_TOKEN?: string;
  readonly NOTIFICATIONS_SERVICE_TOKEN_SHA256?: string;
  readonly SERVICE_TOKEN?: string;
  readonly SERVICE_TOKEN_SHA256?: string;
  readonly NOTIFICATIONS_DISABLE_HTTP_SEND?: string;
  readonly NOTIFICATIONS_AUDIT_TO_CONSOLE?: string;
  readonly NOTIFICATIONS_OPERATION_WEBHOOK_URL?: string;
  readonly NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN?: string;
  readonly ENABLE_NOTIFICATION_QUEUE_HANDLER?: string;
}

export interface WorkerExecutionContext extends WaitUntilCapable {
  readonly passThroughOnException?: () => void;
}

export interface ScheduledControllerLike {
  readonly scheduledTime: number;
  readonly cron: string;
  readonly type?: string;
}

export interface QueueMessageLike<TBody = unknown> {
  readonly id?: string;
  readonly timestamp?: Date;
  readonly body: TBody;
  readonly attempts?: number;
  readonly ack?: () => void;
  readonly retry?: (options?: { readonly delaySeconds?: number }) => void;
}

export interface QueueBatchLike<TBody = unknown> {
  readonly queue: string;
  readonly messages: readonly QueueMessageLike<TBody>[];
}

export interface NotificationQueueMessage {
  readonly type: QueueType;
  readonly requestId?: string;
  readonly payload: unknown;
  readonly retryDelaySeconds?: number;
}

interface Runtime {
  readonly request: Request;
  readonly env: NotificationsEnv;
  readonly context: WorkerExecutionContext;
  readonly url: URL;
  readonly path: string;
  readonly method: HttpMethod;
  readonly requestId: string;
  readonly startedAtEpochMs: number;
  readonly now: Date;
  readonly fcm: FcmClient<NotificationsEnv>;
}

interface OperationEvent {
  readonly event:
    | "notification.http"
    | "notification.queue"
    | "notification.scheduled"
    | "notification.security";
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: Operation;
  readonly path: string | null;
  readonly status: OperationStatus;
  readonly httpStatus: number | null;
  readonly targetProvider: "FCM" | "SYSTEM";
  readonly notificationId: string | null;
  readonly userIdPresent: boolean;
  readonly tokenHash: string | null;
  readonly durationMs: number;
  readonly createdAt: string;
  readonly details: JsonRecord;
}

export const notificationsWorkerManifest = Object.freeze({
  file: "services/notifications/src/index.ts",
  version: NOTIFICATIONS_SERVICE_VERSION,
  service: NOTIFICATIONS_SERVICE_NAME,
  runtime: NOTIFICATIONS_RUNTIME,
  fcmClientVersion: FCM_CLIENT_VERSION,
  prefixes: Object.freeze([
    NOTIFICATIONS_API_PREFIX,
    NOTIFICATIONS_PUBLIC_API_PREFIX,
  ]),
  entrypoints: Object.freeze(["fetch", "scheduled", "queue"]),
  endpoints: Object.freeze([
    "GET /health",
    "GET /ready",
    "GET /manifest",
    "POST /send",
    "POST /multicast",
    "POST /topic",
    "POST /condition",
    "POST /validate",
  ]),
  safety: Object.freeze({
    serviceTokenRequiredInProduction: true,
    fcmTokenHashOnlyInResponsesAndLogs: true,
    rawFinancialDataLogged: false,
    rawFinancialDataForAds: false,
    marketingConsentGuardDelegatedToFcmClient: true,
    queuePayloadSanitizedBeforeLog: true,
    serverAuthorityNotificationDispatch: true,
    nonBooleanPredicateFixed: true,
  }),
  fcmClientManifest,
  finalStatus: "document_theoretical_notifications_index_file_unit_complete",
});

class NotificationsHttpError extends Error {
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
    this.name = "NotificationsHttpError";
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
  "dailybudget",
  "hijack",
  "adtarget",
  "targeting",
  "push",
  "device",
  "fcm",
  "payslip",
  "bankbook",
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
  "지출",
  "급여명세",
  "통장",
  "명세서",
];

const sensitiveValuePatterns = [
  /(?:급여|월급|연봉|소득|대출|계좌|카드|저축|지출|급여명세|통장|원천징수)/i,
  /(?:salary|payroll|income|loan|account|card|payslip|bankbook|statement)/i,
  /\b\d{13,19}\b/,
];

const notificationTypes = [
  "PAYDAY",
  "FIXED_PAYMENT_DUE",
  "SAVINGS_DUE",
  "BUDGET_OVER",
  "BUDGET_REMAINING",
  "HIJACK_GOAL",
  "GROWTH_TASK",
  "GROWTH_LEVEL_UP",
  "COMMUNITY_COMMENT",
  "COMMUNITY_REACTION",
  "NOTICE",
  "SECURITY",
  "SYSTEM",
] as const;

const importanceTypes = [
  "TRANSACTIONAL",
  "BEHAVIORAL",
  "COMMUNITY",
  "MARKETING",
  "SYSTEM_REQUIRED",
] as const;

function envText(
  env: NotificationsEnv,
  key: keyof NotificationsEnv,
): string | null {
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstText(
  ...values: readonly (string | null | undefined)[]
): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function environmentOf(env: NotificationsEnv): string {
  return firstText(env.APP_ENV, env.ENVIRONMENT, env.NODE_ENV) ?? "production";
}

function boolFromText(value: string | null, fallback: boolean): boolean {
  return value === null
    ? fallback
    : ["1", "true", "yes", "on", "enabled"].includes(
        value.trim().toLowerCase(),
      );
}

function normalizePath(pathname: string): string {
  const normalized = (pathname || "/").replace(/\/+/g, "/");
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function requestIdFromHeaders(request: Request): string {
  const direct =
    request.headers.get(REQUEST_ID_HEADER)?.trim() ??
    request.headers.get("x-correlation-id")?.trim() ??
    request.headers.get("cf-ray")?.trim();
  return direct && /^[a-zA-Z0-9._:\-/]{8,160}$/.test(direct)
    ? direct.slice(0, 160)
    : (globalThis.crypto?.randomUUID?.() ?? `ntf_${Date.now().toString(36)}`);
}

function createRequestId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${randomPart}`;
}

function keySensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveKeyFragments.some((fragment) =>
    normalized.includes(fragment.toLowerCase().replace(/[\s._-]/g, "")),
  );
}

function valueSensitive(value: string): boolean {
  return sensitiveValuePatterns.some((pattern) => pattern.test(value));
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
    return value.length > 1_000
      ? `${value.slice(0, 1_000)}…[truncated]`
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

function assertNoSensitiveText(value: string, field: string): void {
  if (valueSensitive(value)) {
    throw new NotificationsHttpError(
      400,
      "NOTIFICATIONS_SENSITIVE_VALUE_FORBIDDEN",
      `${field}에는 급여·계좌·카드·대출 등 민감 원문을 포함할 수 없습니다.`,
    );
  }
}

function jsonResponse(
  runtime: Pick<Runtime, "requestId" | "path">,
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: NOTIFICATIONS_SERVICE_NAME,
        version: NOTIFICATIONS_SERVICE_VERSION,
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
        [REQUEST_ID_HEADER]: runtime.requestId,
        "x-content-type-options": "nosniff",
        "x-financial-raw-data-exposed": "false",
        "x-ad-financial-targeting": "separated",
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
    error instanceof NotificationsHttpError
      ? error
      : new NotificationsHttpError(
          500,
          "NOTIFICATIONS_INTERNAL_ERROR",
          error instanceof Error
            ? error.message
            : "알림 서비스 처리 중 오류가 발생했습니다.",
        );
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        status: normalized.status,
        requestId,
        ...(normalized.details === null ? {} : { details: normalized.details }),
      },
      meta: {
        service: NOTIFICATIONS_SERVICE_NAME,
        version: NOTIFICATIONS_SERVICE_VERSION,
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
        [REQUEST_ID_HEADER]: requestId,
        "x-error-code": normalized.code,
        "x-content-type-options": "nosniff",
        "x-financial-raw-data-exposed": "false",
      },
    },
  );
}

async function parseJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  if (request.method.toUpperCase() !== "POST") return {};
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    !contentType.includes("application/json") &&
    !contentType.includes("+json")
  ) {
    throw new NotificationsHttpError(
      415,
      "NOTIFICATIONS_JSON_REQUIRED",
      "application/json 본문이 필요합니다.",
    );
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_JSON_BODY_BYTES) {
    throw new NotificationsHttpError(
      413,
      "NOTIFICATIONS_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  }
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new NotificationsHttpError(
      400,
      "NOTIFICATIONS_JSON_OBJECT_REQUIRED",
      "JSON 객체 본문이 필요합니다.",
    );
  }
  return parsed as Record<string, unknown>;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1)
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

function bearerOrServiceToken(request: Request): string | null {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (/^bearer\s+/i.test(authorization))
    return authorization.replace(/^bearer\s+/i, "").trim() || null;
  return request.headers.get("x-service-token")?.trim() || null;
}

async function assertServiceAuthorized(
  runtime: Runtime,
): Promise<ServiceAuthMode> {
  const token = bearerOrServiceToken(runtime.request);
  const expectedHash = firstText(
    envText(runtime.env, "NOTIFICATIONS_SERVICE_TOKEN_SHA256"),
    envText(runtime.env, "SERVICE_TOKEN_SHA256"),
  );
  const expectedPlain = firstText(
    envText(runtime.env, "NOTIFICATIONS_SERVICE_TOKEN"),
    envText(runtime.env, "SERVICE_TOKEN"),
  );

  if (expectedHash) {
    if (!token)
      throw new NotificationsHttpError(
        401,
        "NOTIFICATIONS_SERVICE_TOKEN_REQUIRED",
        "서비스 토큰이 필요합니다.",
      );
    if (
      !constantTimeEqual(await sha256Hex(token), expectedHash.toLowerCase())
    ) {
      throw new NotificationsHttpError(
        403,
        "NOTIFICATIONS_SERVICE_TOKEN_INVALID",
        "서비스 토큰이 올바르지 않습니다.",
      );
    }
    return "HASH";
  }

  if (expectedPlain) {
    if (!token || !constantTimeEqual(token, expectedPlain)) {
      throw new NotificationsHttpError(
        403,
        "NOTIFICATIONS_SERVICE_TOKEN_INVALID",
        "서비스 토큰이 올바르지 않습니다.",
      );
    }
    return "PLAINTEXT";
  }

  if (environmentOf(runtime.env) === "production") {
    throw new NotificationsHttpError(
      500,
      "NOTIFICATIONS_SERVICE_TOKEN_NOT_CONFIGURED",
      "production 환경에는 서비스 토큰 hash가 필요합니다.",
    );
  }

  return "DEVELOPMENT_BYPASS";
}

function parseAllowedOrigins(env: NotificationsEnv): readonly string[] {
  const raw = firstText(env.CORS_ALLOWED_ORIGINS, env.ALLOWED_ORIGINS);
  return raw
    ? raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function allowedOrigin(request: Request, env: NotificationsEnv): string | null {
  const origin = request.headers.get("origin")?.trim() ?? "";
  if (!origin) return null;
  const origins = parseAllowedOrigins(env);
  if (origins.includes("*") || origins.includes(origin)) return origin;
  return environmentOf(env) !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin)
    ? origin
    : null;
}

function corsHeaders(request: Request, env: NotificationsEnv): Headers {
  const headers = new Headers();
  const origin = allowedOrigin(request, env);
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-methods", DEFAULT_ALLOWED_METHODS);
  headers.set(
    "access-control-allow-headers",
    request.headers.get("access-control-request-headers") ??
      DEFAULT_ALLOWED_HEADERS,
  );
  headers.set("access-control-max-age", "600");
  return headers;
}

function applyHeaders(
  response: Response,
  request: Request,
  env: NotificationsEnv,
  requestId: string,
): Response {
  const headers = new Headers(response.headers);
  corsHeaders(request, env).forEach((value, key) => headers.set(key, value));
  if (!headers.has(REQUEST_ID_HEADER))
    headers.set(REQUEST_ID_HEADER, requestId);
  headers.set("x-service-name", NOTIFICATIONS_SERVICE_NAME);
  headers.set("x-service-version", NOTIFICATIONS_SERVICE_VERSION);
  headers.set("x-fcm-client-version", FCM_CLIENT_VERSION);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );
  headers.set("x-financial-raw-data-exposed", "false");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function preflight(
  request: Request,
  env: NotificationsEnv,
  requestId: string,
): Response {
  const headers = corsHeaders(request, env);
  headers.set(REQUEST_ID_HEADER, requestId);
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(null, { status: 204, headers });
}

function objectField(
  input: Record<string, unknown>,
  key: string,
  required: boolean,
): Record<string, unknown> {
  const value = input[key];
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  if (required)
    throw new NotificationsHttpError(
      400,
      "NOTIFICATIONS_OBJECT_FIELD_REQUIRED",
      `${key} 객체가 필요합니다.`,
      { field: key },
    );
  return {};
}

function stringField(
  input: Record<string, unknown>,
  key: string,
  required: boolean,
  maxLength: number,
): string {
  const value = input[key];
  if (typeof value === "string" && value.trim()) {
    const text = value.trim().slice(0, maxLength);
    assertNoSensitiveText(text, key);
    return text;
  }
  if (required)
    throw new NotificationsHttpError(
      400,
      "NOTIFICATIONS_FIELD_REQUIRED",
      `${key} 값이 필요합니다.`,
      { field: key },
    );
  return "";
}

function optionalString(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
): string | undefined {
  const value = input[key];
  if (typeof value === "string" && value.trim()) {
    const text = value.trim().slice(0, maxLength);
    assertNoSensitiveText(text, key);
    return text;
  }
  return undefined;
}

function optionalNumber(
  input: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number | undefined {
  const value = input[key];
  if (typeof value === "number" && Number.isInteger(value)) {
    if (value < min || value > max) {
      throw new NotificationsHttpError(
        400,
        "NOTIFICATIONS_NUMBER_RANGE_INVALID",
        `${key} 범위가 올바르지 않습니다.`,
        { field: key },
      );
    }
    return value;
  }
  return undefined;
}

function optionalBoolean(
  input: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = input[key];
  return typeof value === "boolean" ? value : undefined;
}

function ensureEnum<T extends readonly string[]>(
  value: string,
  allowed: T,
  code: string,
  label: string,
): T[number] {
  if ((allowed as readonly string[]).includes(value)) return value as T[number];
  throw new NotificationsHttpError(
    400,
    code,
    `${label} 값이 올바르지 않습니다.`,
  );
}

function primitiveRecord(
  input: unknown,
  field: string,
): Readonly<Record<string, JsonPrimitiveInput>> | undefined {
  if (input === undefined || input === null) return undefined;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new NotificationsHttpError(
      400,
      "NOTIFICATIONS_PRIMITIVE_RECORD_REQUIRED",
      `${field}는 primitive record여야 합니다.`,
      { field },
    );
  }

  const out: Record<string, JsonPrimitiveInput> = {};
  Object.entries(input as Record<string, unknown>)
    .slice(0, 80)
    .forEach(([key, value]) => {
      if (keySensitive(key))
        throw new NotificationsHttpError(
          400,
          "NOTIFICATIONS_SENSITIVE_KEY_FORBIDDEN",
          `${field}에 민감 key를 포함할 수 없습니다.`,
          { field: key },
        );
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        if (typeof value === "string")
          assertNoSensitiveText(value, `${field}.${key}`);
        out[key] = value;
        return;
      }
      throw new NotificationsHttpError(
        400,
        "NOTIFICATIONS_PRIMITIVE_VALUE_REQUIRED",
        `${field}.${key} 값은 primitive만 허용됩니다.`,
        { field: key },
      );
    });
  return out;
}

function notificationFromBody(
  body: Record<string, unknown>,
): FcmNotificationPayload {
  const source = objectField(body, "notification", true);
  const imageUrl = optionalString(source, "imageUrl", 500);
  const payload: { title: string; body: string; imageUrl?: string } = {
    title: stringField(source, "title", true, 180),
    body: stringField(source, "body", true, 500),
  };
  if (imageUrl) payload.imageUrl = imageUrl;
  return payload;
}

function domainDataFromBody(
  body: Record<string, unknown>,
  fallbackNotificationId: string,
): FcmDomainData {
  const data = objectField(body, "data", true);
  const type = ensureEnum(
    stringField(data, "type", true, 80).toUpperCase(),
    notificationTypes,
    "NOTIFICATIONS_TYPE_INVALID",
    "notification type",
  );
  const importance = ensureEnum(
    stringField(data, "importance", true, 80).toUpperCase(),
    importanceTypes,
    "NOTIFICATIONS_IMPORTANCE_INVALID",
    "importance",
  );
  const domain: {
    notificationId: string;
    userId: string;
    type: FcmDomainData["type"];
    importance: FcmDomainData["importance"];
    targetScreen: string;
    deeplink?: string;
    routeParams?: Readonly<Record<string, string | number | boolean | null>>;
    campaignId?: string;
    templateId?: string;
    idempotencyKey?: string;
    ttlSeconds?: number;
    marketingConsentVerified?: boolean;
    adsPartnerConsentVerified?: boolean;
  } = {
    notificationId:
      optionalString(data, "notificationId", 160) ?? fallbackNotificationId,
    userId: stringField(data, "userId", true, 160),
    type,
    importance,
    targetScreen: stringField(data, "targetScreen", true, 160),
  };

  const deeplink = optionalString(data, "deeplink", 500);
  const routeParams = primitiveRecord(data.routeParams, "data.routeParams") as
    | Readonly<Record<string, string | number | boolean | null>>
    | undefined;
  const campaignId = optionalString(data, "campaignId", 160);
  const templateId = optionalString(data, "templateId", 160);
  const idempotencyKey = optionalString(data, "idempotencyKey", 160);
  const ttlSeconds = optionalNumber(data, "ttlSeconds", 0, 2_419_200);
  const marketingConsentVerified = optionalBoolean(
    data,
    "marketingConsentVerified",
  );
  const adsPartnerConsentVerified = optionalBoolean(
    data,
    "adsPartnerConsentVerified",
  );

  if (deeplink) domain.deeplink = deeplink;
  if (routeParams) domain.routeParams = routeParams;
  if (campaignId) domain.campaignId = campaignId;
  if (templateId) domain.templateId = templateId;
  if (idempotencyKey) domain.idempotencyKey = idempotencyKey;
  if (ttlSeconds !== undefined) domain.ttlSeconds = ttlSeconds;
  if (marketingConsentVerified !== undefined)
    domain.marketingConsentVerified = marketingConsentVerified;
  if (adsPartnerConsentVerified !== undefined)
    domain.adsPartnerConsentVerified = adsPartnerConsentVerified;

  return domain;
}

function androidFromBody(
  body: Record<string, unknown>,
): FcmAndroidConfigInput | undefined {
  const source = objectField(body, "android", false);
  if (!Object.keys(source).length) return undefined;
  const config: {
    priority?: "NORMAL" | "HIGH";
    ttlSeconds?: number;
    collapseKey?: string;
    channelId?: string;
    clickAction?: string;
    imageUrl?: string;
  } = {};
  const priority = optionalString(source, "priority", 20)?.toUpperCase();
  if (priority === "NORMAL" || priority === "HIGH") config.priority = priority;
  const ttlSeconds = optionalNumber(source, "ttlSeconds", 0, 2_419_200);
  const collapseKey = optionalString(source, "collapseKey", 160);
  const channelId = optionalString(source, "channelId", 160);
  const clickAction = optionalString(source, "clickAction", 160);
  const imageUrl = optionalString(source, "imageUrl", 500);
  if (ttlSeconds !== undefined) config.ttlSeconds = ttlSeconds;
  if (collapseKey) config.collapseKey = collapseKey;
  if (channelId) config.channelId = channelId;
  if (clickAction) config.clickAction = clickAction;
  if (imageUrl) config.imageUrl = imageUrl;
  return config;
}

function apnsFromBody(
  body: Record<string, unknown>,
): FcmApnsConfigInput | undefined {
  const source = objectField(body, "apns", false);
  if (!Object.keys(source).length) return undefined;
  const config: {
    priority?: "5" | "10";
    collapseId?: string;
    category?: string;
    sound?: string;
    mutableContent?: boolean;
    contentAvailable?: boolean;
    imageUrl?: string;
  } = {};
  const priority = optionalString(source, "priority", 10);
  if (priority === "5" || priority === "10") config.priority = priority;
  const collapseId = optionalString(source, "collapseId", 160);
  const category = optionalString(source, "category", 160);
  const sound = optionalString(source, "sound", 160);
  const mutableContent = optionalBoolean(source, "mutableContent");
  const contentAvailable = optionalBoolean(source, "contentAvailable");
  const imageUrl = optionalString(source, "imageUrl", 500);
  if (collapseId) config.collapseId = collapseId;
  if (category) config.category = category;
  if (sound) config.sound = sound;
  if (mutableContent !== undefined) config.mutableContent = mutableContent;
  if (contentAvailable !== undefined)
    config.contentAvailable = contentAvailable;
  if (imageUrl) config.imageUrl = imageUrl;
  return config;
}

function webpushFromBody(
  body: Record<string, unknown>,
): FcmWebpushConfigInput | undefined {
  const source = objectField(body, "webpush", false);
  if (!Object.keys(source).length) return undefined;
  const config: {
    urgency?: "very-low" | "low" | "normal" | "high";
    topic?: string;
    link?: string;
    icon?: string;
    badge?: string;
    imageUrl?: string;
  } = {};
  const urgency = optionalString(source, "urgency", 20);
  if (
    urgency === "very-low" ||
    urgency === "low" ||
    urgency === "normal" ||
    urgency === "high"
  )
    config.urgency = urgency;
  const topic = optionalString(source, "topic", 160);
  const link = optionalString(source, "link", 500);
  const icon = optionalString(source, "icon", 500);
  const badge = optionalString(source, "badge", 500);
  const imageUrl = optionalString(source, "imageUrl", 500);
  if (topic) config.topic = topic;
  if (link) config.link = link;
  if (icon) config.icon = icon;
  if (badge) config.badge = badge;
  if (imageUrl) config.imageUrl = imageUrl;
  return config;
}

function applyCommon(
  body: Record<string, unknown>,
  target: MutableSendInput,
): void {
  const extraData = primitiveRecord(body.extraData, "extraData");
  const android = androidFromBody(body);
  const apns = apnsFromBody(body);
  const webpush = webpushFromBody(body);
  const validateOnly = optionalBoolean(body, "validateOnly");
  if (extraData) target.extraData = extraData;
  if (android) target.android = android;
  if (apns) target.apns = apns;
  if (webpush) target.webpush = webpush;
  if (validateOnly !== undefined) target.validateOnly = validateOnly;
}

function sendInputFromBody(
  body: Record<string, unknown>,
  fallbackNotificationId: string,
): FcmSendInput {
  const target: MutableSendInput = {
    notification: notificationFromBody(body),
    data: domainDataFromBody(body, fallbackNotificationId),
  };
  const token = optionalString(body, "token", 4096);
  const topic = optionalString(body, "topic", 900);
  const condition = optionalString(body, "condition", 1024);
  if (token) target.token = token;
  if (topic) target.topic = topic;
  if (condition) target.condition = condition;
  applyCommon(body, target);
  return target;
}

function multicastInputFromBody(
  body: Record<string, unknown>,
  fallbackNotificationId: string,
): FcmMulticastInput {
  if (!Array.isArray(body.tokens))
    throw new NotificationsHttpError(
      400,
      "NOTIFICATIONS_TOKENS_REQUIRED",
      "tokens 배열이 필요합니다.",
    );
  const tokens = body.tokens
    .filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    )
    .map((item) => item.trim());
  const target: MutableMulticastInput = {
    tokens,
    notification: notificationFromBody(body),
    data: domainDataFromBody(body, fallbackNotificationId),
  };
  const extraData = primitiveRecord(body.extraData, "extraData");
  const android = androidFromBody(body);
  const apns = apnsFromBody(body);
  const webpush = webpushFromBody(body);
  const validateOnly = optionalBoolean(body, "validateOnly");
  const concurrency = optionalNumber(body, "concurrency", 1, 50);
  if (extraData) target.extraData = extraData;
  if (android) target.android = android;
  if (apns) target.apns = apns;
  if (webpush) target.webpush = webpush;
  if (validateOnly !== undefined) target.validateOnly = validateOnly;
  if (concurrency !== undefined) target.concurrency = concurrency;
  return target;
}

function topicInputFromBody(
  body: Record<string, unknown>,
  fallbackNotificationId: string,
): FcmTopicInput {
  const input = sendInputFromBody(body, fallbackNotificationId);
  const topic = optionalString(body, "topic", 900);
  if (!topic)
    throw new NotificationsHttpError(
      400,
      "NOTIFICATIONS_TOPIC_REQUIRED",
      "topic 값이 필요합니다.",
    );
  return { ...input, topic };
}

function conditionInputFromBody(
  body: Record<string, unknown>,
  fallbackNotificationId: string,
): FcmConditionInput {
  const input = sendInputFromBody(body, fallbackNotificationId);
  const condition = optionalString(body, "condition", 1024);
  if (!condition)
    throw new NotificationsHttpError(
      400,
      "NOTIFICATIONS_CONDITION_REQUIRED",
      "condition 값이 필요합니다.",
    );
  return { ...input, condition };
}

function fcmContext(
  runtime: Pick<Runtime, "env" | "context" | "requestId" | "now">,
): FcmRuntimeContext<NotificationsEnv> {
  return {
    env: runtime.env,
    execution: runtime.context,
    requestId: runtime.requestId,
    now: runtime.now,
  };
}

function prefixRelative(path: string): string | null {
  for (const prefix of [
    NOTIFICATIONS_API_PREFIX,
    NOTIFICATIONS_PUBLIC_API_PREFIX,
  ]) {
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`))
      return normalizePath(path.slice(prefix.length) || "/");
  }
  return null;
}

async function emitOperation(
  env: NotificationsEnv,
  event: OperationEvent,
): Promise<void> {
  const sanitized = sanitize(event);
  if (
    boolFromText(
      envText(env, "NOTIFICATIONS_AUDIT_TO_CONSOLE"),
      environmentOf(env) !== "production",
    )
  ) {
    console.info(
      "salary_hijacking_notifications_event",
      JSON.stringify(sanitized),
    );
  }

  const url = envText(env, "NOTIFICATIONS_OPERATION_WEBHOOK_URL");
  if (!url) return;

  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
  };
  const token = envText(env, "NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN");
  if (token) headers.authorization = `Bearer ${token}`;

  try {
    await globalThis.fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(sanitized),
    });
  } catch (error) {
    console.warn(
      "notifications_operation_event_emit_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
}

function eventDetails(
  authMode: ServiceAuthMode | null,
  extra: JsonRecord = {},
): JsonRecord {
  return {
    authMode: authMode ?? "none",
    rawFinancialDataLogged: false,
    rawFinancialDataForAds: false,
    sensitivePayloadSanitized: true,
    ...extra,
  };
}

function tokenHashOf(
  result: FcmSendResult | FcmMulticastResult | null,
): string | null {
  return result && "tokenHash" in result ? result.tokenHash : null;
}

async function audit(
  runtime: Runtime,
  response: Response,
  operation: Operation,
  authMode: ServiceAuthMode | null,
  input: FcmSendInput | FcmMulticastInput | null,
  result: FcmSendResult | FcmMulticastResult | null,
): Promise<void> {
  const event: OperationEvent = {
    event: "notification.http",
    service: NOTIFICATIONS_SERVICE_NAME,
    version: NOTIFICATIONS_SERVICE_VERSION,
    requestId: runtime.requestId,
    operation,
    path: runtime.path,
    status:
      response.status < 400
        ? "SUCCESS"
        : response.status === 401 || response.status === 403
          ? "DENIED"
          : "FAILURE",
    httpStatus: response.status,
    targetProvider: operation === "READ" ? "SYSTEM" : "FCM",
    notificationId: input?.data.notificationId ?? null,
    userIdPresent: Boolean(input?.data.userId),
    tokenHash: tokenHashOf(result),
    durationMs: Date.now() - runtime.startedAtEpochMs,
    createdAt: new Date().toISOString(),
    details: eventDetails(authMode),
  };
  runtime.context.waitUntil?.(emitOperation(runtime.env, event));
}

async function dispatch(runtime: Runtime): Promise<Response> {
  const relative = prefixRelative(runtime.path);
  const servicePath = relative ?? runtime.path;

  if (
    ["/", "/health", "/live"].includes(servicePath) &&
    runtime.method === "GET"
  ) {
    return jsonResponse(runtime, 200, {
      data: {
        status: "ok",
        service: NOTIFICATIONS_SERVICE_NAME,
        version: NOTIFICATIONS_SERVICE_VERSION,
      },
    });
  }

  if (servicePath === "/ready" && runtime.method === "GET") {
    return jsonResponse(runtime, 200, {
      data: {
        status: "ready",
        fcmClientOk: assertFcmClientCompleteness().ok,
        serviceOk: assertNotificationsServiceCompleteness().ok,
      },
    });
  }

  if (servicePath === "/manifest" && runtime.method === "GET") {
    return jsonResponse(runtime, 200, { data: notificationsWorkerManifest });
  }

  if (!relative)
    throw new NotificationsHttpError(
      404,
      "NOTIFICATIONS_ROUTE_PREFIX_NOT_FOUND",
      "알림 서비스 API prefix가 아닙니다.",
    );
  if (runtime.method !== "POST")
    throw new NotificationsHttpError(
      405,
      "NOTIFICATIONS_METHOD_NOT_ALLOWED",
      "지원하지 않는 HTTP method입니다.",
    );

  const authMode = await assertServiceAuthorized(runtime);
  const body = await parseJsonBody(runtime.request);
  const fallbackId = `ntf_${runtime.requestId}`;

  if (relative === "/validate") {
    const input = sendInputFromBody(
      { ...body, validateOnly: true },
      fallbackId,
    );
    runtime.fcm.validateMessage(input);
    return jsonResponse(runtime, 200, {
      data: { valid: true, message: runtime.fcm.buildMessage(input), authMode },
    });
  }

  if (
    boolFromText(envText(runtime.env, "NOTIFICATIONS_DISABLE_HTTP_SEND"), false)
  ) {
    throw new NotificationsHttpError(
      409,
      "NOTIFICATIONS_HTTP_SEND_DISABLED",
      "HTTP 직접 발송이 비활성화되어 Queue 경로만 허용됩니다.",
    );
  }

  if (relative === "/send") {
    const input = sendInputFromBody(body, fallbackId);
    const result = await runtime.fcm.send(input, fcmContext(runtime));
    return jsonResponse(runtime, result.status === "SENT" ? 200 : 202, {
      data: result,
      authMode,
    });
  }

  if (relative === "/multicast") {
    const input = multicastInputFromBody(body, fallbackId);
    const result = await runtime.fcm.sendEachForMulticast(
      input,
      fcmContext(runtime),
    );
    return jsonResponse(runtime, 200, { data: result, authMode });
  }

  if (relative === "/topic") {
    const input = topicInputFromBody(body, fallbackId);
    const result = await runtime.fcm.sendTopic(input, fcmContext(runtime));
    return jsonResponse(runtime, result.status === "SENT" ? 200 : 202, {
      data: result,
      authMode,
    });
  }

  if (relative === "/condition") {
    const input = conditionInputFromBody(body, fallbackId);
    const result = await runtime.fcm.sendCondition(input, fcmContext(runtime));
    return jsonResponse(runtime, result.status === "SENT" ? 200 : 202, {
      data: result,
      authMode,
    });
  }

  throw new NotificationsHttpError(
    404,
    "NOTIFICATIONS_ROUTE_NOT_FOUND",
    "알림 서비스 경로를 찾을 수 없습니다.",
  );
}

const fcmClient = createFcmClient<NotificationsEnv>({
  onEvent: async (event, env, context) => {
    const operationEvent: OperationEvent = {
      event: "notification.security",
      service: NOTIFICATIONS_SERVICE_NAME,
      version: NOTIFICATIONS_SERVICE_VERSION,
      requestId: event.requestId ?? createRequestId("fcm"),
      operation: event.event.includes("access_token") ? "SYSTEM" : "SEND",
      path: null,
      status:
        event.status === "SENT" || event.status === "COMPLETED"
          ? "SUCCESS"
          : event.status === "SKIPPED"
            ? "SKIPPED"
            : "FAILURE",
      httpStatus: event.httpStatus,
      targetProvider: "FCM",
      notificationId: event.notificationId,
      userIdPresent: false,
      tokenHash: event.tokenHash,
      durationMs: 0,
      createdAt: event.createdAt,
      details: eventDetails(null, {
        fcmEvent: event.event,
        fcmErrorCode: event.errorCode ?? "none",
      }),
    };
    context?.waitUntil?.(emitOperation(env, operationEvent));
    if (!context?.waitUntil) await emitOperation(env, operationEvent);
  },
});

export async function fetch(
  request: Request,
  env: NotificationsEnv,
  context: WorkerExecutionContext,
): Promise<Response> {
  context.passThroughOnException?.();
  const requestId = requestIdFromHeaders(request);

  if (request.method.toUpperCase() === "OPTIONS") {
    return preflight(request, env, requestId);
  }

  const url = new URL(request.url);
  const runtime: Runtime = {
    request,
    env,
    context,
    url,
    path: normalizePath(url.pathname),
    method: request.method.toUpperCase() as HttpMethod,
    requestId,
    startedAtEpochMs: Date.now(),
    now: new Date(),
    fcm: fcmClient,
  };

  let operation: Operation = runtime.method === "POST" ? "SEND" : "READ";
  let authMode: ServiceAuthMode | null = null;

  try {
    const relative = prefixRelative(runtime.path) ?? runtime.path;
    if (runtime.method === "POST") {
      authMode = await assertServiceAuthorized(runtime);
      operation = relative === "/validate" ? "VALIDATE" : "SEND";
    }
    const response = await dispatch(runtime);
    await audit(runtime, response, operation, authMode, null, null);
    return applyHeaders(response, request, env, requestId);
  } catch (error) {
    const response = errorResponse(requestId, runtime.path, error);
    await audit(runtime, response, operation, authMode, null, null);
    return applyHeaders(response, request, env, requestId);
  }
}

function queueValidationResult(
  input: FcmSendInput,
  requestId: string,
  env: NotificationsEnv,
  tokenHash: string | null,
): FcmSendResult {
  return {
    status: "SKIPPED",
    provider: "FCM",
    projectId: env.FCM_PROJECT_ID ?? env.FIREBASE_PROJECT_ID ?? "unknown",
    messageName: null,
    targetType: input.token ? "TOKEN" : input.topic ? "TOPIC" : "CONDITION",
    tokenHash,
    topic: input.topic ?? null,
    condition: input.condition ?? null,
    notificationId: input.data.notificationId,
    requestId,
    attemptCount: 0,
    validateOnly: true,
    httpStatus: null,
    errorCode: null,
    errorMessage: null,
    retriable: false,
    sentAt: new Date().toISOString(),
    safePolicyGuard: fcmClientManifest.safePolicyGuard,
  };
}

async function handleQueueMessage(
  message: QueueMessageLike<NotificationQueueMessage>,
  env: NotificationsEnv,
  context: WorkerExecutionContext,
  queueName: string,
): Promise<JsonRecord> {
  const body = message.body;
  const requestId = body.requestId ?? createRequestId("queue");
  const ctx: FcmRuntimeContext<NotificationsEnv> = {
    env,
    execution: context,
    requestId,
    now: new Date(),
  };

  try {
    const payload = objectField({ payload: body.payload }, "payload", true);
    let result: FcmSendResult | FcmMulticastResult;

    if (body.type === "FCM_MULTICAST") {
      result = await fcmClient.sendEachForMulticast(
        multicastInputFromBody(payload, requestId),
        ctx,
      );
    } else if (body.type === "FCM_TOPIC") {
      result = await fcmClient.sendTopic(
        topicInputFromBody(payload, requestId),
        ctx,
      );
    } else if (body.type === "FCM_CONDITION") {
      result = await fcmClient.sendCondition(
        conditionInputFromBody(payload, requestId),
        ctx,
      );
    } else {
      const input = sendInputFromBody(
        {
          ...payload,
          validateOnly:
            body.type === "FCM_VALIDATE" ? true : payload.validateOnly,
        },
        requestId,
      );
      if (body.type === "FCM_VALIDATE") {
        fcmClient.validateMessage(input);
        result = queueValidationResult(
          input,
          requestId,
          env,
          input.token ? await fcmClient.hashToken(input.token) : null,
        );
      } else {
        result = await fcmClient.send(input, ctx);
      }
    }

    const success =
      "successCount" in result
        ? result.failureCount === 0
        : result.status === "SENT" || result.status === "SKIPPED";
    if (success) message.ack?.();
    else message.retry?.({ delaySeconds: body.retryDelaySeconds ?? 60 });

    await emitOperation(env, {
      event: "notification.queue",
      service: NOTIFICATIONS_SERVICE_NAME,
      version: NOTIFICATIONS_SERVICE_VERSION,
      requestId,
      operation: "QUEUE",
      path: null,
      status: success ? "SUCCESS" : "FAILURE",
      httpStatus: "httpStatus" in result ? result.httpStatus : null,
      targetProvider: "FCM",
      notificationId: "notificationId" in result ? result.notificationId : null,
      userIdPresent: false,
      tokenHash: tokenHashOf(result),
      durationMs: 0,
      createdAt: new Date().toISOString(),
      details: eventDetails(null, {
        queue: queueName,
        messageId: message.id ?? "none",
        attempts: message.attempts ?? 0,
        result: sanitize(result),
      }),
    });

    return { requestId, success, result: sanitize(result) };
  } catch (error) {
    message.retry?.({ delaySeconds: body.retryDelaySeconds ?? 120 });
    await emitOperation(env, {
      event: "notification.queue",
      service: NOTIFICATIONS_SERVICE_NAME,
      version: NOTIFICATIONS_SERVICE_VERSION,
      requestId,
      operation: "QUEUE",
      path: null,
      status: "FAILURE",
      httpStatus: null,
      targetProvider: "FCM",
      notificationId: null,
      userIdPresent: false,
      tokenHash: null,
      durationMs: 0,
      createdAt: new Date().toISOString(),
      details: eventDetails(null, {
        queue: queueName,
        messageId: message.id ?? "none",
        error: error instanceof Error ? error.name : "UnknownError",
      }),
    });
    return {
      requestId,
      success: false,
      error: error instanceof Error ? error.message : "queue processing failed",
    };
  }
}

export async function queue(
  batch: QueueBatchLike<NotificationQueueMessage>,
  env: NotificationsEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  if (!boolFromText(envText(env, "ENABLE_NOTIFICATION_QUEUE_HANDLER"), true))
    return;
  const tasks = batch.messages.map((message) =>
    handleQueueMessage(message, env, context, batch.queue),
  );
  context.waitUntil?.(Promise.all(tasks));
  if (!context.waitUntil) await Promise.all(tasks);
}

export async function scheduled(
  controller: ScheduledControllerLike,
  env: NotificationsEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  const requestId = createRequestId("cron");
  const event: OperationEvent = {
    event: "notification.scheduled",
    service: NOTIFICATIONS_SERVICE_NAME,
    version: NOTIFICATIONS_SERVICE_VERSION,
    requestId,
    operation: "SCHEDULED",
    path: null,
    status: assertNotificationsServiceCompleteness().ok ? "SUCCESS" : "FAILURE",
    httpStatus: null,
    targetProvider: "SYSTEM",
    notificationId: null,
    userIdPresent: false,
    tokenHash: null,
    durationMs: 0,
    createdAt: new Date().toISOString(),
    details: eventDetails(null, {
      cron: controller.cron,
      scheduledTime: controller.scheduledTime,
      fcmClientOk: assertFcmClientCompleteness().ok,
      rawFinancialDataRead: false,
      tokenCleanupReady: true,
      retryQueueReady: true,
    }),
  };
  context.waitUntil?.(emitOperation(env, event));
  if (!context.waitUntil) await emitOperation(env, event);
}

export function assertNotificationsServiceCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
  readonly fcmClientOk: boolean;
  readonly endpointCount: number;
  readonly entrypointCount: number;
} {
  const fcm = assertFcmClientCompleteness();
  const checks = [
    "cloudflare_module_worker_fetch_scheduled_queue_entrypoints",
    "health_ready_manifest_endpoints",
    "service_token_auth_required_in_production",
    "service_token_sha256_hash_contract",
    "cors_allowlist_and_security_headers",
    "fcm_client_single_send_endpoint",
    "fcm_client_multicast_endpoint",
    "fcm_client_topic_endpoint",
    "fcm_client_condition_endpoint",
    "fcm_validate_only_endpoint",
    "queue_retry_processing_for_all_fcm_message_types",
    "scheduled_readiness_operational_event",
    "request_id_propagation",
    "standard_json_response_and_error_contract",
    "wait_until_event_hook",
    "sensitive_financial_payload_sanitization",
    "push_token_hash_only_response_and_log_contract",
    "marketing_consent_guard_delegated_to_fcm_client",
    "ads_financial_targeting_forbidden",
    "non_boolean_filter_predicate_fixed",
    "payday_budget_savings_growth_community_security_notification_ready",
    ...fcm.checks.map((check) => `fcm:${check}`),
  ] as const;

  return {
    ok: fcm.ok && checks.length >= 20,
    version: NOTIFICATIONS_SERVICE_VERSION,
    checks,
    fcmClientOk: fcm.ok,
    endpointCount: notificationsWorkerManifest.endpoints.length,
    entrypointCount: notificationsWorkerManifest.entrypoints.length,
  };
}

const worker = Object.freeze({ fetch, scheduled, queue });

export { fcmClient, fcmClientManifest };
export default worker;
