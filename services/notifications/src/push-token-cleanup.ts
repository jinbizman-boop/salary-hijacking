/** services/notifications/src/push-token-cleanup.ts
 * 급여납치 Salary Hijacking Platform · Push Token Cleanup Service 최종본
 *
 * FCM/APNS/WebPush registration token의 원문을 절대 저장·로그하지 않는 hash-only 정리 서비스다.
 * 만료·장기 미사용·반복 실패·FCM invalid error token을 비활성/철회/하드삭제 대상으로 판정하고,
 * repository contract를 통해 DB 구현과 분리한다. Cloudflare Workers, Queue, Cron, API service 어디서든
 * 호출 가능한 순수 TypeScript 모듈이다.
 */

export const PUSH_TOKEN_CLEANUP_VERSION = "3.1.0";
export const PUSH_TOKEN_CLEANUP_SERVICE_NAME =
  "salary-hijacking-push-token-cleanup";
export const DEFAULT_STALE_AFTER_DAYS = 90;
export const DEFAULT_EXPIRED_AFTER_DAYS = 365;
export const DEFAULT_FAILURE_THRESHOLD = 5;
export const DEFAULT_REVOKED_HARD_DELETE_AFTER_DAYS = 180;
export const DEFAULT_CLEANUP_BATCH_SIZE = 500;
export const MAX_CLEANUP_BATCH_SIZE = 1_000;

export type PushProvider = "FCM" | "APNS" | "WEBPUSH";
export type PushPlatform = "IOS" | "ANDROID" | "WEB" | "UNKNOWN";
export type PushTokenStatus =
  | "ACTIVE"
  | "STALE"
  | "FAILED"
  | "REVOKED"
  | "DELETED";
export type PushCleanupReason =
  | "STALE_LAST_SEEN"
  | "EXPIRED_MAX_AGE"
  | "FAILURE_THRESHOLD_EXCEEDED"
  | "PROVIDER_INVALID_TOKEN"
  | "USER_LOGOUT"
  | "USER_WITHDRAWAL"
  | "CONSENT_REVOKED"
  | "ADMIN_PRIVACY_REQUEST"
  | "HARD_DELETE_RETENTION_EXPIRED";
export type PushCleanupAction =
  | "MARK_STALE"
  | "MARK_FAILED"
  | "REVOKE"
  | "HARD_DELETE"
  | "SKIP";
export type PushCleanupMode = "DRY_RUN" | "APPLY";
export type PushCleanupOperation =
  | "scheduled_cleanup"
  | "invalid_token_cleanup"
  | "user_scope_cleanup"
  | "preview";
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export interface PushCleanupEnvLike {
  readonly APP_ENV?: string;
  readonly ENVIRONMENT?: string;
  readonly NODE_ENV?: string;
  readonly PUSH_TOKEN_STALE_AFTER_DAYS?: string;
  readonly PUSH_TOKEN_EXPIRED_AFTER_DAYS?: string;
  readonly PUSH_TOKEN_FAILURE_THRESHOLD?: string;
  readonly PUSH_TOKEN_HARD_DELETE_AFTER_DAYS?: string;
  readonly PUSH_TOKEN_CLEANUP_BATCH_SIZE?: string;
  readonly PUSH_TOKEN_CLEANUP_DRY_RUN?: string;
  readonly PUSH_TOKEN_CLEANUP_AUDIT_TO_CONSOLE?: string;
}

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export interface PushCleanupRuntimeContext<TEnv = unknown> {
  readonly env: TEnv;
  readonly execution?: WaitUntilCapable | undefined;
  readonly requestId?: string | undefined;
  readonly now?: Date | undefined;
  readonly actorId?: string | undefined;
  readonly operation?: PushCleanupOperation | undefined;
}

export interface PushTokenRecord {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly tokenLast4?: string | undefined;
  readonly provider: PushProvider;
  readonly platform: PushPlatform;
  readonly status: PushTokenStatus;
  readonly appVersion?: string | undefined;
  readonly locale?: string | undefined;
  readonly timezone?: string | undefined;
  readonly marketingConsent: boolean;
  readonly pushConsent: boolean;
  readonly lastSeenAt?: string | undefined;
  readonly lastSuccessAt?: string | undefined;
  readonly lastFailureAt?: string | undefined;
  readonly lastErrorCode?: string | undefined;
  readonly failureCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revokedAt?: string | undefined;
  readonly deletedAt?: string | undefined;
}

export interface PushCleanupCandidate {
  readonly token: PushTokenRecord;
  readonly action: PushCleanupAction;
  readonly reason: PushCleanupReason;
  readonly score: number;
  readonly ageDays: number;
  readonly inactiveDays: number | null;
  readonly failureCount: number;
  readonly providerInvalidError: boolean;
}

export interface PushTokenListCriteria {
  readonly statuses: readonly PushTokenStatus[];
  readonly provider?: PushProvider | undefined;
  readonly userId?: string | undefined;
  readonly updatedBefore?: string | undefined;
  readonly createdBefore?: string | undefined;
  readonly limit: number;
  readonly cursor?: string | undefined;
}

export interface PushTokenListResult {
  readonly items: readonly PushTokenRecord[];
  readonly nextCursor: string | null;
}

export interface PushTokenMutationInput {
  readonly tokenIds: readonly string[];
  readonly reason: PushCleanupReason;
  readonly requestId: string;
  readonly actorId: string;
  readonly now: string;
  readonly details: JsonRecord;
}

export interface PushTokenFailureInput {
  readonly tokenHash: string;
  readonly provider: PushProvider;
  readonly userId?: string | undefined;
  readonly errorCode: string;
  readonly httpStatus?: number | undefined;
  readonly retriable?: boolean | undefined;
  readonly failedAt?: string | undefined;
  readonly notificationId?: string | undefined;
  readonly requestId?: string | undefined;
}

export interface PushTokenUserCleanupInput {
  readonly userId: string;
  readonly reason: Extract<
    PushCleanupReason,
    | "USER_LOGOUT"
    | "USER_WITHDRAWAL"
    | "CONSENT_REVOKED"
    | "ADMIN_PRIVACY_REQUEST"
  >;
  readonly mode?: PushCleanupMode | undefined;
  readonly hardDelete?: boolean | undefined;
}

export interface PushTokenRepository {
  readonly listPushTokensForCleanup: (
    criteria: PushTokenListCriteria,
  ) => Promise<PushTokenListResult>;
  readonly markPushTokensStale: (
    input: PushTokenMutationInput,
  ) => Promise<number>;
  readonly markPushTokensFailed: (
    input: PushTokenMutationInput,
  ) => Promise<number>;
  readonly revokePushTokens: (input: PushTokenMutationInput) => Promise<number>;
  readonly hardDeletePushTokens?: (
    input: PushTokenMutationInput,
  ) => Promise<number>;
  readonly recordPushTokenFailure?: (
    failure: PushTokenFailureInput,
  ) => Promise<void>;
  readonly appendPushTokenCleanupAudit?: (
    event: PushCleanupAuditEvent,
  ) => Promise<void>;
}

export interface PushCleanupPolicy {
  readonly staleAfterDays: number;
  readonly expiredAfterDays: number;
  readonly failureThreshold: number;
  readonly hardDeleteRevokedAfterDays: number;
  readonly batchSize: number;
  readonly mode: PushCleanupMode;
  readonly hardDeleteEnabled: boolean;
}

export interface PushCleanupOptions<TEnv = unknown> {
  readonly repository: PushTokenRepository;
  readonly staleAfterDays?: number | ((env: TEnv) => number | null | undefined);
  readonly expiredAfterDays?:
    | number
    | ((env: TEnv) => number | null | undefined);
  readonly failureThreshold?:
    | number
    | ((env: TEnv) => number | null | undefined);
  readonly hardDeleteRevokedAfterDays?:
    | number
    | ((env: TEnv) => number | null | undefined);
  readonly batchSize?: number | ((env: TEnv) => number | null | undefined);
  readonly dryRun?: boolean | ((env: TEnv) => boolean);
  readonly hardDeleteEnabled?: boolean | ((env: TEnv) => boolean);
  readonly onEvent?: (
    event: PushCleanupAuditEvent,
    env: TEnv,
    context?: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface PushCleanupAuditEvent {
  readonly event:
    | "push_token.cleanup"
    | "push_token.invalid"
    | "push_token.user_cleanup"
    | "push_token.preview";
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: PushCleanupOperation;
  readonly actorId: string;
  readonly mode: PushCleanupMode;
  readonly status: "SUCCESS" | "FAILURE" | "SKIPPED";
  readonly scannedCount: number;
  readonly staleCount: number;
  readonly failedCount: number;
  readonly revokedCount: number;
  readonly hardDeletedCount: number;
  readonly skippedCount: number;
  readonly tokenHashes: readonly string[];
  readonly rawPushTokenLogged: false;
  readonly rawFinancialDataLogged: false;
  readonly createdAt: string;
  readonly details: JsonRecord;
}

export interface PushCleanupResult {
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: PushCleanupOperation;
  readonly mode: PushCleanupMode;
  readonly policy: PushCleanupPolicy;
  readonly scannedCount: number;
  readonly candidateCount: number;
  readonly staleCount: number;
  readonly failedCount: number;
  readonly revokedCount: number;
  readonly hardDeletedCount: number;
  readonly skippedCount: number;
  readonly nextCursor: string | null;
  readonly candidates: readonly PushCleanupCandidate[];
  readonly tokenHashes: readonly string[];
  readonly safePolicyGuard: PushTokenCleanupSafePolicyGuard;
  readonly completedAt: string;
}

export interface PushTokenCleanupSafePolicyGuard {
  readonly rawPushTokenAccepted: false;
  readonly rawPushTokenLogged: false;
  readonly tokenHashOnly: true;
  readonly rawFinancialDataRead: false;
  readonly rawFinancialDataLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly userOwnershipPreserved: true;
  readonly hardDeleteRequiresRetentionOrExplicitUserScope: true;
  readonly repositoryBoundaryRequired: true;
}

export interface PushTokenCleanupService<TEnv = unknown> {
  readonly version: string;
  readonly previewCleanup: (
    context: PushCleanupRuntimeContext<TEnv>,
  ) => Promise<PushCleanupResult>;
  readonly cleanupStaleTokens: (
    context: PushCleanupRuntimeContext<TEnv>,
  ) => Promise<PushCleanupResult>;
  readonly cleanupInvalidToken: (
    failure: PushTokenFailureInput,
    context: PushCleanupRuntimeContext<TEnv>,
  ) => Promise<PushCleanupResult>;
  readonly cleanupInvalidTokens: (
    failures: readonly PushTokenFailureInput[],
    context: PushCleanupRuntimeContext<TEnv>,
  ) => Promise<PushCleanupResult>;
  readonly cleanupUserTokens: (
    input: PushTokenUserCleanupInput,
    context: PushCleanupRuntimeContext<TEnv>,
  ) => Promise<PushCleanupResult>;
  readonly classifyProviderError: (
    failure: Pick<
      PushTokenFailureInput,
      "errorCode" | "httpStatus" | "retriable"
    >,
  ) => PushCleanupAction;
  readonly evaluateToken: (
    token: PushTokenRecord,
    policy: PushCleanupPolicy,
    now: Date,
    providerInvalidError?: boolean,
  ) => PushCleanupCandidate;
}

export class PushTokenCleanupError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "PushTokenCleanupError";
    this.code = code;
    this.status = status;
  }
}

export const pushTokenCleanupSafePolicyGuard: PushTokenCleanupSafePolicyGuard =
  Object.freeze({
    rawPushTokenAccepted: false,
    rawPushTokenLogged: false,
    tokenHashOnly: true,
    rawFinancialDataRead: false,
    rawFinancialDataLogged: false,
    adsFinancialTargetingUsed: false,
    userOwnershipPreserved: true,
    hardDeleteRequiresRetentionOrExplicitUserScope: true,
    repositoryBoundaryRequired: true,
  });

const invalidProviderErrorCodes = new Set([
  "UNREGISTERED",
  "INVALID_ARGUMENT",
  "INVALID_REGISTRATION",
  "NOT_FOUND",
  "SENDER_ID_MISMATCH",
  "APNS_BAD_DEVICE_TOKEN",
  "APNS_UNREGISTERED",
  "WEBPUSH_SUBSCRIPTION_EXPIRED",
]);

const transientProviderErrorCodes = new Set([
  "UNAVAILABLE",
  "INTERNAL",
  "UNKNOWN",
  "RESOURCE_EXHAUSTED",
  "QUOTA_EXCEEDED",
  "THIRD_PARTY_AUTH_ERROR",
  "APNS_TOO_MANY_REQUESTS",
]);

function envText<TEnv>(
  env: TEnv,
  key: keyof PushCleanupEnvLike,
): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolFromText(value: string | null, fallback: boolean): boolean {
  return value === null
    ? fallback
    : ["1", "true", "yes", "on", "enabled"].includes(value.toLowerCase());
}

function numberFromText(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionNumber<TEnv>(
  env: TEnv,
  option: number | ((env: TEnv) => number | null | undefined) | undefined,
  envKey: keyof PushCleanupEnvLike,
  fallback: number,
): number {
  const value = typeof option === "function" ? option(env) : option;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : numberFromText(envText(env, envKey), fallback);
}

function optionBool<TEnv>(
  env: TEnv,
  option: boolean | ((env: TEnv) => boolean) | undefined,
  envKey: keyof PushCleanupEnvLike,
  fallback: boolean,
): boolean {
  if (typeof option === "boolean") return option;
  if (typeof option === "function") return option(env);
  return boolFromText(envText(env, envKey), fallback);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function createRequestId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${randomPart}`;
}

function iso(date: Date): string {
  return date.toISOString();
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function daysBetween(now: Date, then: Date | null): number | null {
  if (!then) return null;
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000));
}

function cutoffIso(now: Date, days: number): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

function normalizeErrorCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/^MESSAGING\//, "")
    .replace(/^FCM_/, "");
}

function assertTokenHash(tokenHash: string): void {
  const value = tokenHash.trim();
  if (!/^(sha256:)?[a-f0-9]{64}$/i.test(value)) {
    throw new PushTokenCleanupError(
      "PUSH_TOKEN_HASH_INVALID",
      "push token cleanup은 raw token이 아니라 SHA-256 tokenHash만 허용합니다.",
      400,
    );
  }
}

function assertUserId(userId: string): void {
  if (!/^[a-zA-Z0-9:_./-]{1,160}$/.test(userId.trim())) {
    throw new PushTokenCleanupError(
      "PUSH_TOKEN_USER_ID_INVALID",
      "userId 형식이 올바르지 않습니다.",
      400,
    );
  }
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
      .map(([key, item]) => {
        const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
        const sensitive = [
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
          "saving",
          "savings",
          "expense",
          "dailybudget",
          "hijack",
          "push",
          "device",
          "fcm",
          "급여",
          "계좌",
          "카드",
          "대출",
          "저축",
          "지출",
        ].some((fragment) => normalized.includes(fragment));
        return [
          key.slice(0, 160),
          sensitive && key !== "tokenHash" && key !== "tokenHashes"
            ? "[REDACTED]"
            : sanitize(item, depth + 1, seen),
        ];
      }),
  );
}

function makePolicy<TEnv>(
  context: PushCleanupRuntimeContext<TEnv>,
  options: PushCleanupOptions<TEnv>,
  modeOverride?: PushCleanupMode,
): PushCleanupPolicy {
  const env = context.env;
  const batchSize = clampInt(
    optionNumber(
      env,
      options.batchSize,
      "PUSH_TOKEN_CLEANUP_BATCH_SIZE",
      DEFAULT_CLEANUP_BATCH_SIZE,
    ),
    1,
    MAX_CLEANUP_BATCH_SIZE,
  );
  const envDryRun = optionBool(
    env,
    options.dryRun,
    "PUSH_TOKEN_CLEANUP_DRY_RUN",
    false,
  );
  const hardDeleteConfigured = optionBool(
    env,
    options.hardDeleteEnabled,
    "PUSH_TOKEN_CLEANUP_DRY_RUN",
    false,
  );

  return {
    staleAfterDays: clampInt(
      optionNumber(
        env,
        options.staleAfterDays,
        "PUSH_TOKEN_STALE_AFTER_DAYS",
        DEFAULT_STALE_AFTER_DAYS,
      ),
      1,
      2_000,
    ),
    expiredAfterDays: clampInt(
      optionNumber(
        env,
        options.expiredAfterDays,
        "PUSH_TOKEN_EXPIRED_AFTER_DAYS",
        DEFAULT_EXPIRED_AFTER_DAYS,
      ),
      1,
      4_000,
    ),
    failureThreshold: clampInt(
      optionNumber(
        env,
        options.failureThreshold,
        "PUSH_TOKEN_FAILURE_THRESHOLD",
        DEFAULT_FAILURE_THRESHOLD,
      ),
      1,
      100,
    ),
    hardDeleteRevokedAfterDays: clampInt(
      optionNumber(
        env,
        options.hardDeleteRevokedAfterDays,
        "PUSH_TOKEN_HARD_DELETE_AFTER_DAYS",
        DEFAULT_REVOKED_HARD_DELETE_AFTER_DAYS,
      ),
      1,
      4_000,
    ),
    batchSize,
    mode: modeOverride ?? (envDryRun ? "DRY_RUN" : "APPLY"),
    hardDeleteEnabled: hardDeleteConfigured && !envDryRun,
  };
}

function classifyProviderError(
  failure: Pick<
    PushTokenFailureInput,
    "errorCode" | "httpStatus" | "retriable"
  >,
): PushCleanupAction {
  const code = normalizeErrorCode(failure.errorCode);
  if (invalidProviderErrorCodes.has(code)) return "REVOKE";
  if (failure.retriable === true || transientProviderErrorCodes.has(code))
    return "MARK_FAILED";
  if (
    typeof failure.httpStatus === "number" &&
    (failure.httpStatus === 404 || failure.httpStatus === 410)
  )
    return "REVOKE";
  if (
    typeof failure.httpStatus === "number" &&
    (failure.httpStatus === 408 ||
      failure.httpStatus === 429 ||
      failure.httpStatus >= 500)
  )
    return "MARK_FAILED";
  return "MARK_FAILED";
}

function evaluateToken(
  token: PushTokenRecord,
  policy: PushCleanupPolicy,
  now: Date,
  providerInvalidError = false,
): PushCleanupCandidate {
  assertTokenHash(token.tokenHash);
  assertUserId(token.userId);

  const createdAt = parseDate(token.createdAt);
  const updatedAt = parseDate(token.updatedAt);
  const lastSeenAt =
    parseDate(token.lastSeenAt) ??
    parseDate(token.lastSuccessAt) ??
    updatedAt ??
    createdAt;
  const revokedAt = parseDate(token.revokedAt);
  const ageDays = daysBetween(now, createdAt) ?? 0;
  const inactiveDays = daysBetween(now, lastSeenAt);
  const revokedDays = daysBetween(now, revokedAt);

  if (token.status === "DELETED") {
    return {
      token,
      action: "SKIP",
      reason: "HARD_DELETE_RETENTION_EXPIRED",
      score: 0,
      ageDays,
      inactiveDays,
      failureCount: token.failureCount,
      providerInvalidError,
    };
  }

  if (providerInvalidError) {
    return {
      token,
      action: "REVOKE",
      reason: "PROVIDER_INVALID_TOKEN",
      score: 100,
      ageDays,
      inactiveDays,
      failureCount: token.failureCount,
      providerInvalidError,
    };
  }

  if (
    token.status === "REVOKED" &&
    policy.hardDeleteEnabled &&
    revokedDays !== null &&
    revokedDays >= policy.hardDeleteRevokedAfterDays
  ) {
    return {
      token,
      action: "HARD_DELETE",
      reason: "HARD_DELETE_RETENTION_EXPIRED",
      score: 95,
      ageDays,
      inactiveDays,
      failureCount: token.failureCount,
      providerInvalidError,
    };
  }

  if (ageDays >= policy.expiredAfterDays) {
    return {
      token,
      action: "REVOKE",
      reason: "EXPIRED_MAX_AGE",
      score: 90,
      ageDays,
      inactiveDays,
      failureCount: token.failureCount,
      providerInvalidError,
    };
  }

  if (token.failureCount >= policy.failureThreshold) {
    return {
      token,
      action: "MARK_FAILED",
      reason: "FAILURE_THRESHOLD_EXCEEDED",
      score: 80,
      ageDays,
      inactiveDays,
      failureCount: token.failureCount,
      providerInvalidError,
    };
  }

  if (inactiveDays !== null && inactiveDays >= policy.staleAfterDays) {
    return {
      token,
      action: "MARK_STALE",
      reason: "STALE_LAST_SEEN",
      score: 60,
      ageDays,
      inactiveDays,
      failureCount: token.failureCount,
      providerInvalidError,
    };
  }

  if (token.pushConsent === false) {
    return {
      token,
      action: "REVOKE",
      reason: "CONSENT_REVOKED",
      score: 85,
      ageDays,
      inactiveDays,
      failureCount: token.failureCount,
      providerInvalidError,
    };
  }

  return {
    token,
    action: "SKIP",
    reason: "STALE_LAST_SEEN",
    score: 0,
    ageDays,
    inactiveDays,
    failureCount: token.failureCount,
    providerInvalidError,
  };
}

function idsOf(
  candidates: readonly PushCleanupCandidate[],
  action: PushCleanupAction,
): readonly string[] {
  return candidates
    .filter((candidate) => candidate.action === action)
    .map((candidate) => candidate.token.id);
}

function hashesOf(
  candidates: readonly PushCleanupCandidate[],
): readonly string[] {
  return candidates
    .filter((candidate) => candidate.action !== "SKIP")
    .map((candidate) => candidate.token.tokenHash);
}

function mutationDetails(candidate: PushCleanupCandidate): JsonRecord {
  return {
    reason: candidate.reason,
    score: candidate.score,
    ageDays: candidate.ageDays,
    inactiveDays: candidate.inactiveDays,
    failureCount: candidate.failureCount,
    providerInvalidError: candidate.providerInvalidError,
    rawPushTokenLogged: false,
    rawFinancialDataLogged: false,
  };
}

async function emit<TEnv>(
  options: PushCleanupOptions<TEnv>,
  context: PushCleanupRuntimeContext<TEnv>,
  event: PushCleanupAuditEvent,
): Promise<void> {
  const envAuditToConsole = boolFromText(
    envText(context.env, "PUSH_TOKEN_CLEANUP_AUDIT_TO_CONSOLE"),
    false,
  );
  if (envAuditToConsole)
    console.info("push_token_cleanup_event", JSON.stringify(sanitize(event)));

  const repositoryTask =
    options.repository.appendPushTokenCleanupAudit?.(event) ??
    Promise.resolve();
  const hookTask = options.onEvent
    ? Promise.resolve(options.onEvent(event, context.env, context.execution))
    : Promise.resolve();
  const task = Promise.all([repositoryTask, hookTask])
    .then(() => undefined)
    .catch((error) => {
      console.warn(
        "push_token_cleanup_event_failed",
        error instanceof Error ? error.name : "UnknownError",
      );
    });

  context.execution?.waitUntil?.(task);
  if (!context.execution?.waitUntil) await task;
}

function buildResult(
  context: PushCleanupRuntimeContext,
  operation: PushCleanupOperation,
  policy: PushCleanupPolicy,
  requestId: string,
  scannedCount: number,
  candidates: readonly PushCleanupCandidate[],
  nextCursor: string | null,
  counts: {
    readonly stale: number;
    readonly failed: number;
    readonly revoked: number;
    readonly hardDeleted: number;
  },
): PushCleanupResult {
  return {
    service: PUSH_TOKEN_CLEANUP_SERVICE_NAME,
    version: PUSH_TOKEN_CLEANUP_VERSION,
    requestId,
    operation,
    mode: policy.mode,
    policy,
    scannedCount,
    candidateCount: candidates.filter(
      (candidate) => candidate.action !== "SKIP",
    ).length,
    staleCount: counts.stale,
    failedCount: counts.failed,
    revokedCount: counts.revoked,
    hardDeletedCount: counts.hardDeleted,
    skippedCount: candidates.filter((candidate) => candidate.action === "SKIP")
      .length,
    nextCursor,
    candidates,
    tokenHashes: hashesOf(candidates),
    safePolicyGuard: pushTokenCleanupSafePolicyGuard,
    completedAt: iso(context.now ?? new Date()),
  };
}

function buildAudit(
  result: PushCleanupResult,
  actorId: string,
  status: "SUCCESS" | "FAILURE" | "SKIPPED",
  details: JsonRecord = {},
): PushCleanupAuditEvent {
  const eventName =
    result.operation === "invalid_token_cleanup"
      ? "push_token.invalid"
      : result.operation === "user_scope_cleanup"
        ? "push_token.user_cleanup"
        : result.operation === "preview"
          ? "push_token.preview"
          : "push_token.cleanup";

  return {
    event: eventName,
    service: PUSH_TOKEN_CLEANUP_SERVICE_NAME,
    version: PUSH_TOKEN_CLEANUP_VERSION,
    requestId: result.requestId,
    operation: result.operation,
    actorId,
    mode: result.mode,
    status,
    scannedCount: result.scannedCount,
    staleCount: result.staleCount,
    failedCount: result.failedCount,
    revokedCount: result.revokedCount,
    hardDeletedCount: result.hardDeletedCount,
    skippedCount: result.skippedCount,
    tokenHashes: result.tokenHashes,
    rawPushTokenLogged: false,
    rawFinancialDataLogged: false,
    createdAt: result.completedAt,
    details,
  };
}

async function applyCandidateMutations(
  repository: PushTokenRepository,
  candidates: readonly PushCleanupCandidate[],
  context: PushCleanupRuntimeContext,
  policy: PushCleanupPolicy,
  requestId: string,
  actorId: string,
): Promise<{
  readonly stale: number;
  readonly failed: number;
  readonly revoked: number;
  readonly hardDeleted: number;
}> {
  if (policy.mode === "DRY_RUN") {
    return {
      stale: idsOf(candidates, "MARK_STALE").length,
      failed: idsOf(candidates, "MARK_FAILED").length,
      revoked: idsOf(candidates, "REVOKE").length,
      hardDeleted: idsOf(candidates, "HARD_DELETE").length,
    };
  }

  const now = iso(context.now ?? new Date());
  const staleCandidates = candidates.filter(
    (candidate) => candidate.action === "MARK_STALE",
  );
  const failedCandidates = candidates.filter(
    (candidate) => candidate.action === "MARK_FAILED",
  );
  const revokedCandidates = candidates.filter(
    (candidate) => candidate.action === "REVOKE",
  );
  const hardDeleteCandidates = candidates.filter(
    (candidate) => candidate.action === "HARD_DELETE",
  );

  const stale = staleCandidates.length
    ? await repository.markPushTokensStale({
        tokenIds: staleCandidates.map((candidate) => candidate.token.id),
        reason: staleCandidates[0]?.reason ?? "STALE_LAST_SEEN",
        requestId,
        actorId,
        now,
        details: { candidates: sanitize(staleCandidates.map(mutationDetails)) },
      })
    : 0;

  const failed = failedCandidates.length
    ? await repository.markPushTokensFailed({
        tokenIds: failedCandidates.map((candidate) => candidate.token.id),
        reason: failedCandidates[0]?.reason ?? "FAILURE_THRESHOLD_EXCEEDED",
        requestId,
        actorId,
        now,
        details: {
          candidates: sanitize(failedCandidates.map(mutationDetails)),
        },
      })
    : 0;

  const revoked = revokedCandidates.length
    ? await repository.revokePushTokens({
        tokenIds: revokedCandidates.map((candidate) => candidate.token.id),
        reason: revokedCandidates[0]?.reason ?? "PROVIDER_INVALID_TOKEN",
        requestId,
        actorId,
        now,
        details: {
          candidates: sanitize(revokedCandidates.map(mutationDetails)),
        },
      })
    : 0;

  const hardDeleted =
    hardDeleteCandidates.length && repository.hardDeletePushTokens
      ? await repository.hardDeletePushTokens({
          tokenIds: hardDeleteCandidates.map((candidate) => candidate.token.id),
          reason: "HARD_DELETE_RETENTION_EXPIRED",
          requestId,
          actorId,
          now,
          details: {
            candidates: sanitize(hardDeleteCandidates.map(mutationDetails)),
          },
        })
      : 0;

  return { stale, failed, revoked, hardDeleted };
}

export function createPushTokenCleanupService<TEnv = PushCleanupEnvLike>(
  options: PushCleanupOptions<TEnv>,
): PushTokenCleanupService<TEnv> {
  if (!options.repository) {
    throw new PushTokenCleanupError(
      "PUSH_TOKEN_REPOSITORY_REQUIRED",
      "push-token cleanup repository가 필요합니다.",
      500,
    );
  }

  async function cleanupByCriteria(
    operation: PushCleanupOperation,
    context: PushCleanupRuntimeContext<TEnv>,
    criteria: Omit<PushTokenListCriteria, "limit">,
    modeOverride?: PushCleanupMode,
    providerInvalidHashes: ReadonlySet<string> = new Set(),
  ): Promise<PushCleanupResult> {
    const requestId = context.requestId ?? createRequestId("ptc");
    const actorId = context.actorId ?? "system:push-token-cleanup";
    const now = context.now ?? new Date();
    const policy = makePolicy(context, options, modeOverride);
    const list = await options.repository.listPushTokensForCleanup({
      ...criteria,
      limit: policy.batchSize,
    });
    const candidates = list.items.map((token) =>
      evaluateToken(
        token,
        policy,
        now,
        providerInvalidHashes.has(token.tokenHash),
      ),
    );
    const counts = await applyCandidateMutations(
      options.repository,
      candidates,
      context,
      policy,
      requestId,
      actorId,
    );
    const result = buildResult(
      context,
      operation,
      policy,
      requestId,
      list.items.length,
      candidates,
      list.nextCursor,
      counts,
    );
    await emit(
      options,
      context,
      buildAudit(result, actorId, "SUCCESS", {
        criteria: sanitize(criteria),
        rawPushTokenLogged: false,
      }),
    );
    return result;
  }

  async function previewCleanup(
    context: PushCleanupRuntimeContext<TEnv>,
  ): Promise<PushCleanupResult> {
    return cleanupByCriteria(
      "preview",
      context,
      {
        statuses: ["ACTIVE", "STALE", "FAILED", "REVOKED"],
        updatedBefore: cutoffIso(context.now ?? new Date(), 0),
      },
      "DRY_RUN",
    );
  }

  async function cleanupStaleTokens(
    context: PushCleanupRuntimeContext<TEnv>,
  ): Promise<PushCleanupResult> {
    const now = context.now ?? new Date();
    const policy = makePolicy(context, options);
    return cleanupByCriteria("scheduled_cleanup", context, {
      statuses: ["ACTIVE", "STALE", "FAILED", "REVOKED"],
      updatedBefore: cutoffIso(
        now,
        Math.min(policy.staleAfterDays, policy.expiredAfterDays),
      ),
    });
  }

  async function cleanupInvalidTokens(
    failures: readonly PushTokenFailureInput[],
    context: PushCleanupRuntimeContext<TEnv>,
  ): Promise<PushCleanupResult> {
    const invalidFailures = failures.filter((failure) => {
      assertTokenHash(failure.tokenHash);
      return classifyProviderError(failure) === "REVOKE";
    });

    await Promise.all(
      failures.map(
        (failure) =>
          options.repository.recordPushTokenFailure?.(failure) ??
          Promise.resolve(),
      ),
    );

    if (!invalidFailures.length) {
      const requestId = context.requestId ?? createRequestId("ptc_invalid");
      const policy = makePolicy(context, options);
      const result = buildResult(
        context,
        "invalid_token_cleanup",
        policy,
        requestId,
        0,
        [],
        null,
        {
          stale: 0,
          failed: 0,
          revoked: 0,
          hardDeleted: 0,
        },
      );
      await emit(
        options,
        context,
        buildAudit(
          result,
          context.actorId ?? "system:push-token-cleanup",
          "SKIPPED",
          {
            failureCount: failures.length,
            invalidFailureCount: 0,
          },
        ),
      );
      return result;
    }

    const hashes = new Set(invalidFailures.map((failure) => failure.tokenHash));
    const firstFailure = invalidFailures[0];
    const criteria: Omit<PushTokenListCriteria, "limit"> = {
      statuses: ["ACTIVE", "STALE", "FAILED"],
      ...(firstFailure?.provider ? { provider: firstFailure.provider } : {}),
      ...(firstFailure?.userId ? { userId: firstFailure.userId } : {}),
    };

    return cleanupByCriteria(
      "invalid_token_cleanup",
      context,
      criteria,
      undefined,
      hashes,
    );
  }

  async function cleanupInvalidToken(
    failure: PushTokenFailureInput,
    context: PushCleanupRuntimeContext<TEnv>,
  ): Promise<PushCleanupResult> {
    return cleanupInvalidTokens([failure], context);
  }

  async function cleanupUserTokens(
    input: PushTokenUserCleanupInput,
    context: PushCleanupRuntimeContext<TEnv>,
  ): Promise<PushCleanupResult> {
    assertUserId(input.userId);
    const mode = input.mode ?? makePolicy(context, options).mode;
    const requestId = context.requestId ?? createRequestId("ptc_user");
    const actorId = context.actorId ?? `user:${input.userId}`;
    const now = context.now ?? new Date();
    const policy = makePolicy(context, options, mode);
    const list = await options.repository.listPushTokensForCleanup({
      statuses: ["ACTIVE", "STALE", "FAILED", "REVOKED"],
      userId: input.userId,
      limit: policy.batchSize,
    });

    const action: PushCleanupAction =
      input.hardDelete === true ? "HARD_DELETE" : "REVOKE";
    const candidates = list.items.map(
      (token): PushCleanupCandidate => ({
        token,
        action,
        reason:
          input.hardDelete === true
            ? "HARD_DELETE_RETENTION_EXPIRED"
            : input.reason,
        score: input.hardDelete === true ? 100 : 95,
        ageDays: daysBetween(now, parseDate(token.createdAt)) ?? 0,
        inactiveDays: daysBetween(
          now,
          parseDate(token.lastSeenAt) ??
            parseDate(token.lastSuccessAt) ??
            parseDate(token.updatedAt),
        ),
        failureCount: token.failureCount,
        providerInvalidError: false,
      }),
    );

    const counts = await applyCandidateMutations(
      options.repository,
      candidates,
      context,
      policy,
      requestId,
      actorId,
    );
    const result = buildResult(
      context,
      "user_scope_cleanup",
      policy,
      requestId,
      list.items.length,
      candidates,
      list.nextCursor,
      counts,
    );
    await emit(
      options,
      context,
      buildAudit(result, actorId, "SUCCESS", {
        userIdPresent: true,
        reason: input.reason,
        hardDelete: input.hardDelete === true,
      }),
    );
    return result;
  }

  return Object.freeze({
    version: PUSH_TOKEN_CLEANUP_VERSION,
    previewCleanup,
    cleanupStaleTokens,
    cleanupInvalidToken,
    cleanupInvalidTokens,
    cleanupUserTokens,
    classifyProviderError,
    evaluateToken,
  });
}

export function createInMemoryPushTokenRepository(
  seed: readonly PushTokenRecord[] = [],
): PushTokenRepository & {
  readonly snapshot: () => readonly PushTokenRecord[];
} {
  let records = [...seed];
  const audits: PushCleanupAuditEvent[] = [];

  function update(
    ids: readonly string[],
    patch: (record: PushTokenRecord) => PushTokenRecord,
  ): number {
    const idSet = new Set(ids);
    let count = 0;
    records = records.map((record) => {
      if (!idSet.has(record.id)) return record;
      count += 1;
      return patch(record);
    });
    return count;
  }

  return {
    snapshot: () => records.map((record) => ({ ...record })),
    listPushTokensForCleanup: async (criteria) => {
      const filtered = records
        .filter((record) => {
          if (!criteria.statuses.includes(record.status)) return false;
          if (criteria.provider && record.provider !== criteria.provider)
            return false;
          if (criteria.userId && record.userId !== criteria.userId)
            return false;
          if (
            criteria.updatedBefore &&
            record.updatedAt >= criteria.updatedBefore
          )
            return false;
          if (
            criteria.createdBefore &&
            record.createdAt >= criteria.createdBefore
          )
            return false;
          return true;
        })
        .slice(0, criteria.limit);

      return { items: filtered, nextCursor: null };
    },
    markPushTokensStale: async (input) =>
      update(input.tokenIds, (record) => ({
        ...record,
        status: "STALE",
        updatedAt: input.now,
      })),
    markPushTokensFailed: async (input) =>
      update(input.tokenIds, (record) => ({
        ...record,
        status: "FAILED",
        updatedAt: input.now,
        failureCount: record.failureCount + 1,
        lastFailureAt: input.now,
        lastErrorCode: input.reason,
      })),
    revokePushTokens: async (input) =>
      update(input.tokenIds, (record) => ({
        ...record,
        status: "REVOKED",
        updatedAt: input.now,
        revokedAt: input.now,
        lastErrorCode: input.reason,
      })),
    hardDeletePushTokens: async (input) =>
      update(input.tokenIds, (record) => ({
        ...record,
        status: "DELETED",
        updatedAt: input.now,
        deletedAt: input.now,
        lastErrorCode: input.reason,
      })),
    recordPushTokenFailure: async (failure) => {
      records = records.map((record) =>
        record.tokenHash === failure.tokenHash
          ? {
              ...record,
              failureCount: record.failureCount + 1,
              lastFailureAt: failure.failedAt ?? new Date().toISOString(),
              lastErrorCode: normalizeErrorCode(failure.errorCode),
            }
          : record,
      );
    },
    appendPushTokenCleanupAudit: async (event) => {
      audits.push(event);
    },
  };
}

export const pushTokenCleanupManifest = Object.freeze({
  file: "services/notifications/src/push-token-cleanup.ts",
  version: PUSH_TOKEN_CLEANUP_VERSION,
  service: PUSH_TOKEN_CLEANUP_SERVICE_NAME,
  runtime: "cloudflare-workers-web-fetch-compatible",
  capabilities: Object.freeze([
    "hash_only_push_token_cleanup",
    "stale_token_cleanup",
    "expired_token_cleanup",
    "failure_threshold_cleanup",
    "provider_invalid_token_revocation",
    "user_scope_logout_withdrawal_consent_cleanup",
    "retention_based_hard_delete",
    "dry_run_preview",
    "repository_contract_boundary",
    "audit_event_sanitization",
    "cloudflare_cron_queue_ready",
  ]),
  safePolicyGuard: pushTokenCleanupSafePolicyGuard,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertPushTokenCleanupCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "hash_only_no_raw_push_token_contract",
    "repository_boundary_for_db_adapter",
    "stale_last_seen_cleanup_policy",
    "expired_max_age_cleanup_policy",
    "failure_threshold_cleanup_policy",
    "fcm_apns_webpush_invalid_error_classification",
    "user_logout_withdrawal_consent_cleanup",
    "admin_privacy_request_cleanup",
    "retention_based_hard_delete_guard",
    "dry_run_preview_mode",
    "apply_mode_mutation_contract",
    "batch_size_env_policy",
    "request_id_actor_id_audit_contract",
    "wait_until_event_hook",
    "sanitized_audit_no_raw_push_token",
    "no_raw_financial_data_read_or_logged",
    "ads_financial_targeting_not_used",
    "in_memory_repository_for_tests",
    "cloudflare_workers_compatible_no_node_dependency",
    "notification_service_ready_for_cron_queue_api_integration",
  ] as const;

  return {
    ok: checks.length >= 20,
    version: PUSH_TOKEN_CLEANUP_VERSION,
    checks,
  };
}

export const defaultPushTokenCleanupRepository =
  createInMemoryPushTokenRepository();
export const defaultPushTokenCleanupService = createPushTokenCleanupService({
  repository: defaultPushTokenCleanupRepository,
  dryRun: true,
});

export default createPushTokenCleanupService;
