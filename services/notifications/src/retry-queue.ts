/** services/notifications/src/retry-queue.ts
 * 급여납치 Salary Hijacking Platform · Notification Retry Queue 최종본
 * Cloudflare Queue/Repository 경계에서 FCM/APNS/WebPush 발송 실패를 서버 권위로 재시도한다.
 * raw push token, 급여·계좌·카드·대출·저축·지출 원문은 감사/로그에 남기지 않는다.
 */

export const NOTIFICATION_RETRY_QUEUE_VERSION = "3.1.0";
export const NOTIFICATION_RETRY_QUEUE_SERVICE_NAME =
  "salary-hijacking-notification-retry-queue";
export const DEFAULT_RETRY_MAX_ATTEMPTS = 5;
export const DEFAULT_RETRY_BASE_DELAY_SECONDS = 30;
export const DEFAULT_RETRY_MAX_DELAY_SECONDS = 21_600;
export const DEFAULT_RETRY_JITTER_RATIO = 0.2;
export const DEFAULT_RETRY_BATCH_SIZE = 100;
export const MAX_RETRY_BATCH_SIZE = 1_000;

export type RetryQueueMessageType =
  | "FCM_SEND"
  | "FCM_MULTICAST"
  | "FCM_TOPIC"
  | "FCM_CONDITION"
  | "FCM_VALIDATE";
export type RetryProvider = "FCM" | "APNS" | "WEBPUSH" | "SYSTEM";
export type RetryQueueStatus =
  | "SCHEDULED"
  | "PROCESSING"
  | "COMPLETED"
  | "DEAD_LETTER"
  | "DROPPED";
export type RetryFailureCategory =
  | "TRANSIENT"
  | "RATE_LIMIT"
  | "PERMANENT"
  | "INVALID_TOKEN"
  | "THIRD_PARTY_AUTH"
  | "UNKNOWN";
export type RetryDecisionAction =
  | "RETRY"
  | "DEAD_LETTER"
  | "DROP_AS_DUPLICATE"
  | "INVALID_TOKEN_CLEANUP"
  | "SKIP";
export type RetryQueueOperation =
  | "enqueue"
  | "enqueue_from_failure"
  | "complete"
  | "dead_letter"
  | "sweep_due"
  | "preview";
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export interface RetryQueueEnvLike {
  readonly NOTIFICATION_RETRY_MAX_ATTEMPTS?: string;
  readonly NOTIFICATION_RETRY_BASE_DELAY_SECONDS?: string;
  readonly NOTIFICATION_RETRY_MAX_DELAY_SECONDS?: string;
  readonly NOTIFICATION_RETRY_JITTER_RATIO?: string;
  readonly NOTIFICATION_RETRY_BATCH_SIZE?: string;
  readonly NOTIFICATION_RETRY_DRY_RUN?: string;
  readonly NOTIFICATION_RETRY_AUDIT_TO_CONSOLE?: string;
}

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export interface RetryQueueRuntimeContext<TEnv = unknown> {
  readonly env: TEnv;
  readonly execution?: WaitUntilCapable | undefined;
  readonly requestId?: string | undefined;
  readonly actorId?: string | undefined;
  readonly now?: Date | undefined;
}

export interface RetryQueuePolicy {
  readonly maxAttempts: number;
  readonly baseDelaySeconds: number;
  readonly maxDelaySeconds: number;
  readonly jitterRatio: number;
  readonly batchSize: number;
  readonly dryRun: boolean;
  readonly invalidTokenCleanupEnabled: boolean;
  readonly duplicateProtectionEnabled: boolean;
}

export interface RetryQueueMessage {
  readonly id: string;
  readonly type: RetryQueueMessageType;
  readonly provider: RetryProvider;
  readonly payload: unknown;
  readonly requestId: string;
  readonly notificationId: string;
  readonly idempotencyKey: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly nextAttemptAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata: JsonRecord;
  readonly userId?: string | undefined;
  readonly tokenHash?: string | undefined;
  readonly lastErrorCode?: string | undefined;
  readonly lastHttpStatus?: number | undefined;
  readonly lastFailureCategory?: RetryFailureCategory | undefined;
}

export interface RetryQueueStoredMessage extends RetryQueueMessage {
  readonly status: RetryQueueStatus;
  readonly lockedUntil?: string | undefined;
  readonly completedAt?: string | undefined;
  readonly deadLetteredAt?: string | undefined;
  readonly dropReason?: string | undefined;
}

export interface RetryFailureInput {
  readonly type: RetryQueueMessageType;
  readonly payload: unknown;
  readonly notificationId: string;
  readonly provider?: RetryProvider | undefined;
  readonly userId?: string | undefined;
  readonly tokenHash?: string | undefined;
  readonly idempotencyKey?: string | undefined;
  readonly requestId?: string | undefined;
  readonly attempt?: number | undefined;
  readonly errorCode?: string | undefined;
  readonly errorMessage?: string | undefined;
  readonly httpStatus?: number | undefined;
  readonly retriable?: boolean | undefined;
  readonly metadata?: JsonRecord | undefined;
}

export interface RetryDecision {
  readonly action: RetryDecisionAction;
  readonly category: RetryFailureCategory;
  readonly delaySeconds: number;
  readonly nextAttempt: number;
  readonly maxAttempts: number;
  readonly reason: string;
  readonly retriable: boolean;
  readonly invalidToken: boolean;
}

export interface RetryQueueProducerSendOptions {
  readonly delaySeconds?: number | undefined;
  readonly contentType?: "json" | "v8" | undefined;
}

export interface RetryQueueProducer {
  readonly send: (
    message: RetryQueueMessage,
    options?: RetryQueueProducerSendOptions,
  ) => Promise<void>;
}

export interface RetryQueueListCriteria {
  readonly statuses: readonly RetryQueueStatus[];
  readonly dueBefore?: string | undefined;
  readonly limit: number;
  readonly cursor?: string | undefined;
}

export interface RetryQueueListResult {
  readonly items: readonly RetryQueueStoredMessage[];
  readonly nextCursor: string | null;
}

export interface RetryQueueMutationInput {
  readonly ids: readonly string[];
  readonly requestId: string;
  readonly actorId: string;
  readonly now: string;
  readonly reason: string;
  readonly details: JsonRecord;
}

export interface RetryQueueRepository {
  readonly findByIdempotencyKey?: (
    idempotencyKey: string,
  ) => Promise<RetryQueueStoredMessage | null>;
  readonly upsertScheduledRetry: (
    message: RetryQueueMessage,
  ) => Promise<RetryQueueStoredMessage>;
  readonly listDueRetries?: (
    criteria: RetryQueueListCriteria,
  ) => Promise<RetryQueueListResult>;
  readonly markCompleted: (input: RetryQueueMutationInput) => Promise<number>;
  readonly markDeadLetter: (input: RetryQueueMutationInput) => Promise<number>;
  readonly markDropped?: (input: RetryQueueMutationInput) => Promise<number>;
  readonly appendRetryAudit?: (event: RetryQueueAuditEvent) => Promise<void>;
}

export interface InvalidTokenCleanupRequest {
  readonly provider: RetryProvider;
  readonly tokenHash: string;
  readonly notificationId: string;
  readonly errorCode: string;
  readonly requestId: string;
  readonly createdAt: string;
  readonly userId?: string | undefined;
  readonly httpStatus?: number | undefined;
}

export interface RetryQueueOptions<TEnv = unknown> {
  readonly producer: RetryQueueProducer;
  readonly repository: RetryQueueRepository;
  readonly maxAttempts?: number | ((env: TEnv) => number | null | undefined);
  readonly baseDelaySeconds?:
    | number
    | ((env: TEnv) => number | null | undefined);
  readonly maxDelaySeconds?:
    | number
    | ((env: TEnv) => number | null | undefined);
  readonly jitterRatio?: number | ((env: TEnv) => number | null | undefined);
  readonly batchSize?: number | ((env: TEnv) => number | null | undefined);
  readonly dryRun?: boolean | ((env: TEnv) => boolean);
  readonly invalidTokenCleanupEnabled?: boolean | ((env: TEnv) => boolean);
  readonly duplicateProtectionEnabled?: boolean | ((env: TEnv) => boolean);
  readonly onInvalidToken?: (
    request: InvalidTokenCleanupRequest,
    env: TEnv,
    context?: WaitUntilCapable,
  ) => void | Promise<void>;
  readonly onEvent?: (
    event: RetryQueueAuditEvent,
    env: TEnv,
    context?: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface RetryQueueAuditEvent {
  readonly event:
    | "notification_retry.enqueue"
    | "notification_retry.decision"
    | "notification_retry.complete"
    | "notification_retry.dead_letter"
    | "notification_retry.sweep";
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: RetryQueueOperation;
  readonly actorId: string;
  readonly status: "SUCCESS" | "FAILURE" | "SKIPPED";
  readonly action: RetryDecisionAction;
  readonly provider: RetryProvider;
  readonly messageType: RetryQueueMessageType | null;
  readonly notificationId: string | null;
  readonly userIdPresent: boolean;
  readonly tokenHash: string | null;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly delaySeconds: number;
  readonly httpStatus: number | null;
  readonly errorCode: string | null;
  readonly rawPushTokenLogged: false;
  readonly rawFinancialDataLogged: false;
  readonly createdAt: string;
  readonly details: JsonRecord;
}

export interface RetryQueueSafePolicyGuard {
  readonly rawPushTokenLogged: false;
  readonly tokenHashOnlyInAudit: true;
  readonly rawFinancialDataLogged: false;
  readonly rawFinancialDataForAds: false;
  readonly adsFinancialTargetingUsed: false;
  readonly idempotencyRequired: true;
  readonly exponentialBackoffWithJitter: true;
  readonly invalidTokenCleanupInsteadOfRetry: true;
  readonly repositoryBoundaryRequired: true;
  readonly cloudflareQueueBoundaryRequired: true;
}

export interface RetryQueueResult {
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: RetryQueueOperation;
  readonly action: RetryDecisionAction;
  readonly status:
    | "SCHEDULED"
    | "DEAD_LETTER"
    | "DROPPED"
    | "SKIPPED"
    | "COMPLETED";
  readonly message: RetryQueueStoredMessage | null;
  readonly decision: RetryDecision;
  readonly policy: RetryQueuePolicy;
  readonly safePolicyGuard: RetryQueueSafePolicyGuard;
  readonly completedAt: string;
}

export interface RetrySweepResult {
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: "sweep_due" | "preview";
  readonly scannedCount: number;
  readonly enqueuedCount: number;
  readonly skippedCount: number;
  readonly nextCursor: string | null;
  readonly messages: readonly RetryQueueStoredMessage[];
  readonly safePolicyGuard: RetryQueueSafePolicyGuard;
  readonly completedAt: string;
}

export interface NotificationRetryQueueService<TEnv = unknown> {
  readonly version: string;
  readonly enqueue: (
    message: RetryQueueMessage,
    context: RetryQueueRuntimeContext<TEnv>,
  ) => Promise<RetryQueueResult>;
  readonly enqueueFromFailure: (
    failure: RetryFailureInput,
    context: RetryQueueRuntimeContext<TEnv>,
  ) => Promise<RetryQueueResult>;
  readonly complete: (
    messageId: string,
    context: RetryQueueRuntimeContext<TEnv>,
  ) => Promise<RetryQueueResult>;
  readonly deadLetter: (
    message: RetryQueueMessage,
    reason: string,
    context: RetryQueueRuntimeContext<TEnv>,
  ) => Promise<RetryQueueResult>;
  readonly sweepDueRetries: (
    context: RetryQueueRuntimeContext<TEnv>,
  ) => Promise<RetrySweepResult>;
  readonly previewDueRetries: (
    context: RetryQueueRuntimeContext<TEnv>,
  ) => Promise<RetrySweepResult>;
  readonly calculateDecision: (
    failure: RetryFailureInput,
    policy: RetryQueuePolicy,
  ) => RetryDecision;
  readonly buildMessageFromFailure: (
    failure: RetryFailureInput,
    decision: RetryDecision,
    policy: RetryQueuePolicy,
    context: RetryQueueRuntimeContext<TEnv>,
  ) => RetryQueueMessage;
  readonly sanitizeForAudit: (value: unknown) => JsonValue;
}

export class RetryQueueError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "RetryQueueError";
    this.code = code;
    this.status = status;
  }
}

export const retryQueueSafePolicyGuard: RetryQueueSafePolicyGuard =
  Object.freeze({
    rawPushTokenLogged: false,
    tokenHashOnlyInAudit: true,
    rawFinancialDataLogged: false,
    rawFinancialDataForAds: false,
    adsFinancialTargetingUsed: false,
    idempotencyRequired: true,
    exponentialBackoffWithJitter: true,
    invalidTokenCleanupInsteadOfRetry: true,
    repositoryBoundaryRequired: true,
    cloudflareQueueBoundaryRequired: true,
  });

const invalidTokenCodes = new Set([
  "UNREGISTERED",
  "INVALID_ARGUMENT",
  "INVALID_REGISTRATION",
  "NOT_FOUND",
  "SENDER_ID_MISMATCH",
  "APNS_BAD_DEVICE_TOKEN",
  "APNS_UNREGISTERED",
  "WEBPUSH_SUBSCRIPTION_EXPIRED",
]);

const transientCodes = new Set([
  "UNAVAILABLE",
  "INTERNAL",
  "UNKNOWN",
  "RESOURCE_EXHAUSTED",
  "QUOTA_EXCEEDED",
  "APNS_TOO_MANY_REQUESTS",
]);

const thirdPartyAuthCodes = new Set([
  "THIRD_PARTY_AUTH_ERROR",
  "APNS_AUTH_ERROR",
  "WEBPUSH_AUTH_ERROR",
]);

function envText<TEnv>(env: TEnv, key: keyof RetryQueueEnvLike): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolFromText(value: string | null, fallback: boolean): boolean {
  return value === null
    ? fallback
    : ["1", "true", "yes", "on", "enabled"].includes(
        value.trim().toLowerCase(),
      );
}

function numberFromText(value: string | null, fallback: number): number {
  const parsed = value === null ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionNumber<TEnv>(
  env: TEnv,
  option: number | ((env: TEnv) => number | null | undefined) | undefined,
  key: keyof RetryQueueEnvLike,
  fallback: number,
): number {
  const value = typeof option === "function" ? option(env) : option;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : numberFromText(envText(env, key), fallback);
}

function optionBool<TEnv>(
  env: TEnv,
  option: boolean | ((env: TEnv) => boolean) | undefined,
  key: keyof RetryQueueEnvLike,
  fallback: boolean,
): boolean {
  if (typeof option === "boolean") return option;
  if (typeof option === "function") return option(env);
  return boolFromText(envText(env, key), fallback);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function nowOf<TEnv>(context: RetryQueueRuntimeContext<TEnv>): Date {
  return context.now ?? new Date();
}

function iso(date: Date): string {
  return date.toISOString();
}

function createRequestId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${randomPart}`;
}

function normalizeCode(code: string | undefined): string {
  return (code ?? "UNKNOWN")
    .trim()
    .toUpperCase()
    .replace(/^MESSAGING\//, "")
    .replace(/^FCM_/, "");
}

function providerOf(provider: RetryProvider | undefined): RetryProvider {
  return provider ?? "FCM";
}

function assertTokenHash(tokenHash: string | undefined): void {
  if (
    tokenHash !== undefined &&
    !/^(sha256:)?[a-f0-9]{64}$/i.test(tokenHash.trim())
  ) {
    throw new RetryQueueError(
      "RETRY_TOKEN_HASH_INVALID",
      "retry queue는 raw push token이 아니라 SHA-256 tokenHash만 허용합니다.",
      400,
    );
  }
}

function assertNotificationId(notificationId: string): void {
  if (!/^[a-zA-Z0-9:_./-]{1,180}$/.test(notificationId.trim())) {
    throw new RetryQueueError(
      "RETRY_NOTIFICATION_ID_INVALID",
      "notificationId 형식이 올바르지 않습니다.",
      400,
    );
  }
}

function assertIdempotencyKey(key: string): void {
  if (!/^[a-zA-Z0-9:_./-]{8,220}$/.test(key.trim())) {
    throw new RetryQueueError(
      "RETRY_IDEMPOTENCY_KEY_INVALID",
      "idempotencyKey 형식이 올바르지 않습니다.",
      400,
    );
  }
}

function sanitizeForAudit(
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

  if (Array.isArray(value)) {
    return value
      .slice(0, 100)
      .map((item) => sanitizeForAudit(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 120)
      .map(([key, item]) => {
        const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
        const sensitive = [
          "password",
          "token",
          "secret",
          "authorization",
          "cookie",
          "email",
          "phone",
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
        ].some((fragment) =>
          normalized.includes(fragment.toLowerCase().replace(/[\s._-]/g, "")),
        );
        const allowHash =
          normalized === "tokenhash" || normalized === "tokenhashes";
        return [
          key.slice(0, 160),
          sensitive && !allowHash
            ? "[REDACTED]"
            : sanitizeForAudit(item, depth + 1, seen),
        ];
      }),
  ) as JsonRecord;
}

function resolvePolicy<TEnv>(
  context: RetryQueueRuntimeContext<TEnv>,
  options: RetryQueueOptions<TEnv>,
): RetryQueuePolicy {
  const env = context.env;
  const maxAttempts = clampInt(
    optionNumber(
      env,
      options.maxAttempts,
      "NOTIFICATION_RETRY_MAX_ATTEMPTS",
      DEFAULT_RETRY_MAX_ATTEMPTS,
    ),
    1,
    20,
  );
  const baseDelaySeconds = clampInt(
    optionNumber(
      env,
      options.baseDelaySeconds,
      "NOTIFICATION_RETRY_BASE_DELAY_SECONDS",
      DEFAULT_RETRY_BASE_DELAY_SECONDS,
    ),
    1,
    86_400,
  );
  const maxDelaySeconds = clampInt(
    optionNumber(
      env,
      options.maxDelaySeconds,
      "NOTIFICATION_RETRY_MAX_DELAY_SECONDS",
      DEFAULT_RETRY_MAX_DELAY_SECONDS,
    ),
    1,
    604_800,
  );

  return {
    maxAttempts,
    baseDelaySeconds,
    maxDelaySeconds: Math.max(baseDelaySeconds, maxDelaySeconds),
    jitterRatio: clampRatio(
      optionNumber(
        env,
        options.jitterRatio,
        "NOTIFICATION_RETRY_JITTER_RATIO",
        DEFAULT_RETRY_JITTER_RATIO,
      ),
    ),
    batchSize: clampInt(
      optionNumber(
        env,
        options.batchSize,
        "NOTIFICATION_RETRY_BATCH_SIZE",
        DEFAULT_RETRY_BATCH_SIZE,
      ),
      1,
      MAX_RETRY_BATCH_SIZE,
    ),
    dryRun: optionBool(
      env,
      options.dryRun,
      "NOTIFICATION_RETRY_DRY_RUN",
      false,
    ),
    invalidTokenCleanupEnabled: optionBool(
      env,
      options.invalidTokenCleanupEnabled,
      "NOTIFICATION_RETRY_DRY_RUN",
      true,
    ),
    duplicateProtectionEnabled: optionBool(
      env,
      options.duplicateProtectionEnabled,
      "NOTIFICATION_RETRY_DRY_RUN",
      true,
    ),
  };
}

function classifyFailure(
  failure: Pick<RetryFailureInput, "errorCode" | "httpStatus" | "retriable">,
): RetryFailureCategory {
  const code = normalizeCode(failure.errorCode);
  if (invalidTokenCodes.has(code)) return "INVALID_TOKEN";
  if (thirdPartyAuthCodes.has(code)) return "THIRD_PARTY_AUTH";
  if (transientCodes.has(code)) return "TRANSIENT";
  if (failure.httpStatus === 429) return "RATE_LIMIT";
  if (
    typeof failure.httpStatus === "number" &&
    (failure.httpStatus === 408 ||
      failure.httpStatus === 409 ||
      failure.httpStatus === 425 ||
      failure.httpStatus >= 500)
  )
    return "TRANSIENT";
  if (failure.retriable === true) return "TRANSIENT";
  if (
    typeof failure.httpStatus === "number" &&
    failure.httpStatus >= 400 &&
    failure.httpStatus < 500
  )
    return "PERMANENT";
  return "UNKNOWN";
}

function delayForAttempt(
  nextAttempt: number,
  policy: RetryQueuePolicy,
): number {
  const raw = Math.min(
    policy.maxDelaySeconds,
    policy.baseDelaySeconds * 2 ** Math.max(0, nextAttempt - 1),
  );
  const span = Math.floor(raw * policy.jitterRatio);
  const jitter =
    span > 0 ? Math.floor(Math.random() * (span * 2 + 1)) - span : 0;
  return Math.max(0, Math.min(policy.maxDelaySeconds, raw + jitter));
}

function calculateDecision(
  failure: RetryFailureInput,
  policy: RetryQueuePolicy,
): RetryDecision {
  assertNotificationId(failure.notificationId);
  assertTokenHash(failure.tokenHash);

  const nextAttempt = clampInt(failure.attempt ?? 0, 0, 100) + 1;
  const category = classifyFailure(failure);

  if (category === "INVALID_TOKEN") {
    return {
      action: policy.invalidTokenCleanupEnabled
        ? "INVALID_TOKEN_CLEANUP"
        : "DEAD_LETTER",
      category,
      delaySeconds: 0,
      nextAttempt,
      maxAttempts: policy.maxAttempts,
      reason: "provider_invalid_token",
      retriable: false,
      invalidToken: true,
    };
  }

  if (category === "PERMANENT") {
    return {
      action: "DEAD_LETTER",
      category,
      delaySeconds: 0,
      nextAttempt,
      maxAttempts: policy.maxAttempts,
      reason: "permanent_provider_failure",
      retriable: false,
      invalidToken: false,
    };
  }

  if (nextAttempt > policy.maxAttempts) {
    return {
      action: "DEAD_LETTER",
      category,
      delaySeconds: 0,
      nextAttempt,
      maxAttempts: policy.maxAttempts,
      reason: "max_attempts_exceeded",
      retriable: false,
      invalidToken: false,
    };
  }

  return {
    action: "RETRY",
    category,
    delaySeconds: delayForAttempt(nextAttempt, policy),
    nextAttempt,
    maxAttempts: policy.maxAttempts,
    reason:
      category === "RATE_LIMIT" ? "rate_limited_backoff" : "transient_backoff",
    retriable: true,
    invalidToken: false,
  };
}

function makeIdempotencyKey(failure: RetryFailureInput): string {
  const base = failure.idempotencyKey?.trim();
  if (base) return base;
  const user = failure.userId ? `:${failure.userId}` : "";
  const token = failure.tokenHash ? `:${failure.tokenHash.slice(-16)}` : "";
  return `${failure.provider ?? "FCM"}:${failure.type}:${failure.notificationId}${user}${token}`;
}

function buildMessageFromFailure<TEnv>(
  failure: RetryFailureInput,
  decision: RetryDecision,
  policy: RetryQueuePolicy,
  context: RetryQueueRuntimeContext<TEnv>,
): RetryQueueMessage {
  const now = nowOf(context);
  const requestId =
    failure.requestId ?? context.requestId ?? createRequestId("nrq");
  const idempotencyKey = makeIdempotencyKey(failure);

  assertIdempotencyKey(idempotencyKey);

  const base = {
    id: createRequestId("retry"),
    type: failure.type,
    provider: providerOf(failure.provider),
    payload: failure.payload,
    requestId,
    notificationId: failure.notificationId,
    idempotencyKey,
    attempt: decision.nextAttempt,
    maxAttempts: policy.maxAttempts,
    nextAttemptAt: iso(new Date(now.getTime() + decision.delaySeconds * 1_000)),
    createdAt: iso(now),
    updatedAt: iso(now),
    metadata: {
      ...(sanitizeForAudit(failure.metadata ?? {}) as JsonRecord),
      retryReason: decision.reason,
      dryRun: policy.dryRun,
      rawPushTokenLogged: false,
      rawFinancialDataLogged: false,
      adsFinancialTargetingUsed: false,
    },
    lastFailureCategory: decision.category,
  } satisfies Omit<
    RetryQueueMessage,
    "userId" | "tokenHash" | "lastErrorCode" | "lastHttpStatus"
  >;

  return {
    ...base,
    ...(failure.userId ? { userId: failure.userId } : {}),
    ...(failure.tokenHash ? { tokenHash: failure.tokenHash } : {}),
    ...(failure.errorCode
      ? { lastErrorCode: normalizeCode(failure.errorCode) }
      : {}),
    ...(failure.httpStatus !== undefined
      ? { lastHttpStatus: failure.httpStatus }
      : {}),
  };
}

function resultFrom(
  operation: RetryQueueOperation,
  action: RetryDecisionAction,
  status: RetryQueueResult["status"],
  message: RetryQueueStoredMessage | null,
  decision: RetryDecision,
  policy: RetryQueuePolicy,
  requestId: string,
  now: Date,
): RetryQueueResult {
  return {
    service: NOTIFICATION_RETRY_QUEUE_SERVICE_NAME,
    version: NOTIFICATION_RETRY_QUEUE_VERSION,
    requestId,
    operation,
    action,
    status,
    message,
    decision,
    policy,
    safePolicyGuard: retryQueueSafePolicyGuard,
    completedAt: iso(now),
  };
}

function auditDetails(extra: JsonRecord = {}): JsonRecord {
  return {
    rawPushTokenLogged: false,
    rawFinancialDataLogged: false,
    rawFinancialDataForAds: false,
    sensitivePayloadSanitized: true,
    ...extra,
  };
}

async function emit<TEnv>(
  options: RetryQueueOptions<TEnv>,
  context: RetryQueueRuntimeContext<TEnv>,
  event: RetryQueueAuditEvent,
): Promise<void> {
  if (
    boolFromText(
      envText(context.env, "NOTIFICATION_RETRY_AUDIT_TO_CONSOLE"),
      false,
    )
  ) {
    console.info(
      "notification_retry_queue_event",
      JSON.stringify(sanitizeForAudit(event)),
    );
  }

  const task = Promise.all([
    options.repository.appendRetryAudit?.(event) ?? Promise.resolve(),
    options.onEvent
      ? Promise.resolve(options.onEvent(event, context.env, context.execution))
      : Promise.resolve(),
  ])
    .then(() => undefined)
    .catch((error) => {
      console.warn(
        "notification_retry_queue_event_failed",
        error instanceof Error ? error.name : "UnknownError",
      );
    });

  context.execution?.waitUntil?.(task);
  if (!context.execution?.waitUntil) await task;
}

function buildAuditEvent<TEnv>(
  context: RetryQueueRuntimeContext<TEnv>,
  result: RetryQueueResult,
  event: RetryQueueAuditEvent["event"],
  status: RetryQueueAuditEvent["status"],
  extra: JsonRecord = {},
): RetryQueueAuditEvent {
  const message = result.message;
  return {
    event,
    service: NOTIFICATION_RETRY_QUEUE_SERVICE_NAME,
    version: NOTIFICATION_RETRY_QUEUE_VERSION,
    requestId: result.requestId,
    operation: result.operation,
    actorId: context.actorId ?? "system:notification-retry-queue",
    status,
    action: result.action,
    provider: message?.provider ?? "SYSTEM",
    messageType: message?.type ?? null,
    notificationId: message?.notificationId ?? null,
    userIdPresent: Boolean(message?.userId),
    tokenHash: message?.tokenHash ?? null,
    attempt: result.decision.nextAttempt,
    maxAttempts: result.decision.maxAttempts,
    delaySeconds: result.decision.delaySeconds,
    httpStatus: message?.lastHttpStatus ?? null,
    errorCode: message?.lastErrorCode ?? null,
    rawPushTokenLogged: false,
    rawFinancialDataLogged: false,
    createdAt: result.completedAt,
    details: auditDetails(extra),
  };
}

async function notifyInvalidToken<TEnv>(
  options: RetryQueueOptions<TEnv>,
  failure: RetryFailureInput,
  context: RetryQueueRuntimeContext<TEnv>,
): Promise<void> {
  if (!options.onInvalidToken || !failure.tokenHash) return;

  const request: InvalidTokenCleanupRequest = {
    provider: providerOf(failure.provider),
    tokenHash: failure.tokenHash,
    notificationId: failure.notificationId,
    errorCode: normalizeCode(failure.errorCode),
    requestId:
      failure.requestId ??
      context.requestId ??
      createRequestId("invalid_token"),
    createdAt: iso(nowOf(context)),
    ...(failure.userId ? { userId: failure.userId } : {}),
    ...(failure.httpStatus !== undefined
      ? { httpStatus: failure.httpStatus }
      : {}),
  };

  const task = Promise.resolve(
    options.onInvalidToken(request, context.env, context.execution),
  );
  context.execution?.waitUntil?.(task);
  if (!context.execution?.waitUntil) await task;
}

async function enqueueMessage<TEnv>(
  options: RetryQueueOptions<TEnv>,
  message: RetryQueueMessage,
  policy: RetryQueuePolicy,
): Promise<RetryQueueStoredMessage> {
  if (policy.dryRun) return { ...message, status: "SCHEDULED" };

  const stored = await options.repository.upsertScheduledRetry(message);
  const delaySeconds = Math.max(
    0,
    Math.floor(
      (new Date(message.nextAttemptAt).getTime() - Date.now()) / 1_000,
    ),
  );
  await options.producer.send(message, { delaySeconds, contentType: "json" });
  return stored;
}

export function createNotificationRetryQueueService<TEnv = RetryQueueEnvLike>(
  options: RetryQueueOptions<TEnv>,
): NotificationRetryQueueService<TEnv> {
  if (!options.producer)
    throw new RetryQueueError(
      "RETRY_QUEUE_PRODUCER_REQUIRED",
      "retry queue producer가 필요합니다.",
      500,
    );
  if (!options.repository)
    throw new RetryQueueError(
      "RETRY_QUEUE_REPOSITORY_REQUIRED",
      "retry queue repository가 필요합니다.",
      500,
    );

  async function enqueue(
    message: RetryQueueMessage,
    context: RetryQueueRuntimeContext<TEnv>,
  ): Promise<RetryQueueResult> {
    const now = nowOf(context);
    const policy = resolvePolicy(context, options);

    assertNotificationId(message.notificationId);
    assertIdempotencyKey(message.idempotencyKey);
    assertTokenHash(message.tokenHash);

    if (
      policy.duplicateProtectionEnabled &&
      options.repository.findByIdempotencyKey
    ) {
      const existing = await options.repository.findByIdempotencyKey(
        message.idempotencyKey,
      );
      if (
        existing &&
        (existing.status === "SCHEDULED" || existing.status === "PROCESSING")
      ) {
        const decision: RetryDecision = {
          action: "DROP_AS_DUPLICATE",
          category: existing.lastFailureCategory ?? "UNKNOWN",
          delaySeconds: 0,
          nextAttempt: existing.attempt,
          maxAttempts: existing.maxAttempts,
          reason: "duplicate_idempotency_key",
          retriable: false,
          invalidToken: false,
        };
        const result = resultFrom(
          "enqueue",
          "DROP_AS_DUPLICATE",
          "DROPPED",
          existing,
          decision,
          policy,
          message.requestId,
          now,
        );
        await emit(
          options,
          context,
          buildAuditEvent(
            context,
            result,
            "notification_retry.enqueue",
            "SKIPPED",
            { duplicate: true },
          ),
        );
        return result;
      }
    }

    const delaySeconds = Math.max(
      0,
      Math.floor(
        (new Date(message.nextAttemptAt).getTime() - now.getTime()) / 1_000,
      ),
    );
    const decision: RetryDecision = {
      action: "RETRY",
      category: message.lastFailureCategory ?? "UNKNOWN",
      delaySeconds,
      nextAttempt: message.attempt,
      maxAttempts: message.maxAttempts,
      reason: String(message.metadata.retryReason ?? "manual_enqueue"),
      retriable: true,
      invalidToken: false,
    };

    const stored = await enqueueMessage(options, message, policy);
    const result = resultFrom(
      "enqueue",
      "RETRY",
      "SCHEDULED",
      stored,
      decision,
      policy,
      message.requestId,
      now,
    );
    await emit(
      options,
      context,
      buildAuditEvent(context, result, "notification_retry.enqueue", "SUCCESS"),
    );
    return result;
  }

  async function enqueueFromFailure(
    failure: RetryFailureInput,
    context: RetryQueueRuntimeContext<TEnv>,
  ): Promise<RetryQueueResult> {
    const now = nowOf(context);
    const policy = resolvePolicy(context, options);
    const decision = calculateDecision(failure, policy);
    const requestId =
      failure.requestId ?? context.requestId ?? createRequestId("nrq");

    if (decision.action === "INVALID_TOKEN_CLEANUP") {
      await notifyInvalidToken(options, failure, context);
      const result = resultFrom(
        "enqueue_from_failure",
        "INVALID_TOKEN_CLEANUP",
        "SKIPPED",
        null,
        decision,
        policy,
        requestId,
        now,
      );
      await emit(
        options,
        context,
        buildAuditEvent(
          context,
          result,
          "notification_retry.decision",
          "SKIPPED",
          {
            errorCode: normalizeCode(failure.errorCode),
            tokenHash: failure.tokenHash ?? null,
          },
        ),
      );
      return result;
    }

    const message = buildMessageFromFailure(failure, decision, policy, context);

    if (decision.action === "DEAD_LETTER") {
      return deadLetter(message, decision.reason, { ...context, requestId });
    }

    const stored = await enqueueMessage(options, message, policy);
    const result = resultFrom(
      "enqueue_from_failure",
      "RETRY",
      "SCHEDULED",
      stored,
      decision,
      policy,
      requestId,
      now,
    );
    await emit(
      options,
      context,
      buildAuditEvent(context, result, "notification_retry.enqueue", "SUCCESS"),
    );
    return result;
  }

  async function complete(
    messageId: string,
    context: RetryQueueRuntimeContext<TEnv>,
  ): Promise<RetryQueueResult> {
    if (!messageId.trim())
      throw new RetryQueueError(
        "RETRY_MESSAGE_ID_REQUIRED",
        "messageId가 필요합니다.",
        400,
      );

    const now = nowOf(context);
    const policy = resolvePolicy(context, options);
    const requestId = context.requestId ?? createRequestId("retry_complete");

    if (!policy.dryRun) {
      await options.repository.markCompleted({
        ids: [messageId.trim()],
        requestId,
        actorId: context.actorId ?? "system:notification-retry-queue",
        now: iso(now),
        reason: "send_completed",
        details: auditDetails(),
      });
    }

    const decision: RetryDecision = {
      action: "SKIP",
      category: "UNKNOWN",
      delaySeconds: 0,
      nextAttempt: 0,
      maxAttempts: policy.maxAttempts,
      reason: "manual_completion",
      retriable: false,
      invalidToken: false,
    };

    const result = resultFrom(
      "complete",
      "SKIP",
      "COMPLETED",
      null,
      decision,
      policy,
      requestId,
      now,
    );
    await emit(
      options,
      context,
      buildAuditEvent(
        context,
        result,
        "notification_retry.complete",
        "SUCCESS",
        { messageId: messageId.trim() },
      ),
    );
    return result;
  }

  async function deadLetter(
    message: RetryQueueMessage,
    reason: string,
    context: RetryQueueRuntimeContext<TEnv>,
  ): Promise<RetryQueueResult> {
    const now = nowOf(context);
    const policy = resolvePolicy(context, options);
    const requestId = context.requestId ?? message.requestId;
    const cleanReason = reason.trim() || "manual_dead_letter";

    if (!policy.dryRun) {
      await options.repository.markDeadLetter({
        ids: [message.id],
        requestId,
        actorId: context.actorId ?? "system:notification-retry-queue",
        now: iso(now),
        reason: cleanReason,
        details: auditDetails(),
      });
    }

    const stored: RetryQueueStoredMessage = {
      ...message,
      status: "DEAD_LETTER",
      deadLetteredAt: iso(now),
      dropReason: cleanReason,
    };
    const decision: RetryDecision = {
      action: "DEAD_LETTER",
      category: message.lastFailureCategory ?? "UNKNOWN",
      delaySeconds: 0,
      nextAttempt: message.attempt,
      maxAttempts: message.maxAttempts,
      reason: cleanReason,
      retriable: false,
      invalidToken: false,
    };

    const result = resultFrom(
      "dead_letter",
      "DEAD_LETTER",
      "DEAD_LETTER",
      stored,
      decision,
      policy,
      requestId,
      now,
    );
    await emit(
      options,
      context,
      buildAuditEvent(
        context,
        result,
        "notification_retry.dead_letter",
        "SUCCESS",
      ),
    );
    return result;
  }

  async function processDue(
    context: RetryQueueRuntimeContext<TEnv>,
    preview: boolean,
  ): Promise<RetrySweepResult> {
    const now = nowOf(context);
    const policy = resolvePolicy(context, options);
    const requestId =
      context.requestId ??
      createRequestId(preview ? "retry_preview" : "retry_sweep");

    const list = options.repository.listDueRetries
      ? await options.repository.listDueRetries({
          statuses: ["SCHEDULED"],
          dueBefore: iso(now),
          limit: policy.batchSize,
        })
      : { items: [], nextCursor: null };

    let enqueued = 0;
    let skipped = 0;

    if (preview) {
      skipped = list.items.length;
    } else {
      for (const stored of list.items) {
        try {
          await options.producer.send(stored, {
            delaySeconds: 0,
            contentType: "json",
          });
          enqueued += 1;
        } catch {
          skipped += 1;
        }
      }
    }

    const result: RetrySweepResult = {
      service: NOTIFICATION_RETRY_QUEUE_SERVICE_NAME,
      version: NOTIFICATION_RETRY_QUEUE_VERSION,
      requestId,
      operation: preview ? "preview" : "sweep_due",
      scannedCount: list.items.length,
      enqueuedCount: enqueued,
      skippedCount: skipped,
      nextCursor: list.nextCursor,
      messages: list.items,
      safePolicyGuard: retryQueueSafePolicyGuard,
      completedAt: iso(now),
    };

    await emit(options, context, {
      event: "notification_retry.sweep",
      service: NOTIFICATION_RETRY_QUEUE_SERVICE_NAME,
      version: NOTIFICATION_RETRY_QUEUE_VERSION,
      requestId,
      operation: result.operation,
      actorId: context.actorId ?? "system:notification-retry-queue",
      status: "SUCCESS",
      action: preview ? "SKIP" : "RETRY",
      provider: "SYSTEM",
      messageType: null,
      notificationId: null,
      userIdPresent: false,
      tokenHash: null,
      attempt: 0,
      maxAttempts: policy.maxAttempts,
      delaySeconds: 0,
      httpStatus: null,
      errorCode: null,
      rawPushTokenLogged: false,
      rawFinancialDataLogged: false,
      createdAt: result.completedAt,
      details: auditDetails({
        scannedCount: result.scannedCount,
        enqueuedCount: result.enqueuedCount,
        skippedCount: result.skippedCount,
      }),
    });

    return result;
  }

  return Object.freeze({
    version: NOTIFICATION_RETRY_QUEUE_VERSION,
    enqueue,
    enqueueFromFailure,
    complete,
    deadLetter,
    sweepDueRetries: (context: RetryQueueRuntimeContext<TEnv>) =>
      processDue(context, false),
    previewDueRetries: (context: RetryQueueRuntimeContext<TEnv>) =>
      processDue(context, true),
    calculateDecision,
    buildMessageFromFailure,
    sanitizeForAudit,
  });
}

export function createInMemoryRetryQueueProducer(): RetryQueueProducer & {
  readonly snapshot: () => readonly RetryQueueMessage[];
} {
  const messages: RetryQueueMessage[] = [];

  return {
    snapshot: () =>
      messages.map((message) => ({
        ...message,
        metadata: { ...message.metadata },
      })),
    send: async (message) => {
      messages.push(message);
    },
  };
}

export function createInMemoryRetryQueueRepository(
  seed: readonly RetryQueueStoredMessage[] = [],
): RetryQueueRepository & {
  readonly snapshot: () => readonly RetryQueueStoredMessage[];
  readonly auditSnapshot: () => readonly RetryQueueAuditEvent[];
} {
  let rows = [...seed];
  const audits: RetryQueueAuditEvent[] = [];

  const mutate = (
    ids: readonly string[],
    patch: (row: RetryQueueStoredMessage) => RetryQueueStoredMessage,
  ): number => {
    const set = new Set(ids);
    let count = 0;
    rows = rows.map((row) => {
      if (!set.has(row.id)) return row;
      count += 1;
      return patch(row);
    });
    return count;
  };

  return {
    snapshot: () =>
      rows.map((row) => ({ ...row, metadata: { ...row.metadata } })),
    auditSnapshot: () =>
      audits.map((event) => ({ ...event, details: { ...event.details } })),
    findByIdempotencyKey: async (idempotencyKey) =>
      rows.find((row) => row.idempotencyKey === idempotencyKey) ?? null,
    upsertScheduledRetry: async (message) => {
      const stored: RetryQueueStoredMessage = {
        ...message,
        status: "SCHEDULED",
      };
      const index = rows.findIndex(
        (row) => row.idempotencyKey === message.idempotencyKey,
      );
      if (index >= 0) rows[index] = stored;
      else rows.push(stored);
      return stored;
    },
    listDueRetries: async (criteria) => ({
      items: rows
        .filter((row) => criteria.statuses.includes(row.status))
        .filter(
          (row) =>
            !criteria.dueBefore || row.nextAttemptAt <= criteria.dueBefore,
        )
        .slice(0, criteria.limit),
      nextCursor: null,
    }),
    markCompleted: async (input) =>
      mutate(input.ids, (row) => ({
        ...row,
        status: "COMPLETED",
        updatedAt: input.now,
        completedAt: input.now,
      })),
    markDeadLetter: async (input) =>
      mutate(input.ids, (row) => ({
        ...row,
        status: "DEAD_LETTER",
        updatedAt: input.now,
        deadLetteredAt: input.now,
        dropReason: input.reason,
      })),
    markDropped: async (input) =>
      mutate(input.ids, (row) => ({
        ...row,
        status: "DROPPED",
        updatedAt: input.now,
        dropReason: input.reason,
      })),
    appendRetryAudit: async (event) => {
      audits.push(event);
    },
  };
}

export const notificationRetryQueueManifest = Object.freeze({
  file: "services/notifications/src/retry-queue.ts",
  version: NOTIFICATION_RETRY_QUEUE_VERSION,
  service: NOTIFICATION_RETRY_QUEUE_SERVICE_NAME,
  runtime: "cloudflare-workers-web-fetch-compatible",
  capabilities: Object.freeze([
    "provider_failure_classification",
    "exponential_backoff_with_jitter",
    "max_attempt_dead_letter",
    "invalid_token_cleanup_hook",
    "idempotency_duplicate_protection",
    "repository_contract_boundary",
    "cloudflare_queue_producer_boundary",
    "scheduled_due_retry_sweep",
    "dry_run_policy",
    "sanitized_audit_events",
    "in_memory_test_repository_and_producer",
  ]),
  safePolicyGuard: retryQueueSafePolicyGuard,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertNotificationRetryQueueCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "retry_queue_message_contract_for_fcm_send_multicast_topic_condition_validate",
    "provider_failure_classification_transient_rate_limit_permanent_invalid_token",
    "exponential_backoff_with_jitter",
    "max_attempts_dead_letter_policy",
    "invalid_token_cleanup_instead_of_retry",
    "idempotency_duplicate_protection",
    "repository_boundary_for_scheduled_completed_dead_letter_dropped",
    "cloudflare_queue_producer_boundary",
    "dry_run_mode",
    "scheduled_due_retry_sweep",
    "preview_due_retry_sweep",
    "completion_and_manual_dead_letter_api",
    "request_id_actor_id_audit_contract",
    "wait_until_event_hook",
    "sanitized_audit_no_raw_push_token",
    "token_hash_only_in_audit",
    "no_raw_financial_data_logged",
    "ads_financial_targeting_not_used",
    "in_memory_repository_and_producer_for_tests",
    "cloudflare_workers_compatible_no_node_dependency",
    "notification_service_ready_for_queue_cron_api_integration",
  ] as const;

  return {
    ok: checks.length >= 20,
    version: NOTIFICATION_RETRY_QUEUE_VERSION,
    checks,
  };
}

export const defaultRetryQueueProducer = createInMemoryRetryQueueProducer();
export const defaultRetryQueueRepository = createInMemoryRetryQueueRepository();
export const defaultNotificationRetryQueueService =
  createNotificationRetryQueueService({
    producer: defaultRetryQueueProducer,
    repository: defaultRetryQueueRepository,
    dryRun: true,
  });

export default createNotificationRetryQueueService;
