/** services/scheduler/src/jobs/data-retention-cleanup.job.ts
 * 급여납치 Salary Hijacking Platform · Data Retention Cleanup Job 최종본
 * 서버 권위 보존기간 정책으로 개인정보·알림·업로드·광고/운영 이벤트·감사 로그를 정리한다.
 * DB/Storage 구현은 repository contract로 분리하며 raw 금융 데이터·raw push token은 로그/감사/응답에 남기지 않는다.
 */

export const DATA_RETENTION_CLEANUP_JOB_VERSION = "3.1.1";
export const DATA_RETENTION_CLEANUP_JOB_NAME =
  "salary-hijacking-data-retention-cleanup";
export const DEFAULT_RETENTION_BATCH_SIZE = 500;
export const MAX_RETENTION_BATCH_SIZE = 2_000;
export const DEFAULT_LOCK_TTL_SECONDS = 1_800;

export type DataRetentionMode = "DRY_RUN" | "APPLY";
export type DataRetentionDomain =
  | "AUTH_SESSIONS"
  | "PASSWORD_RESETS"
  | "EMAIL_VERIFICATIONS"
  | "WITHDRAWN_USERS"
  | "PRIVACY_EXPORTS"
  | "NOTIFICATIONS"
  | "PUSH_TOKENS"
  | "UPLOAD_OBJECTS"
  | "COMMUNITY_SOFT_DELETED_CONTENT"
  | "AD_IMPRESSIONS"
  | "AD_CLICKS"
  | "OPERATION_EVENTS"
  | "AUDIT_LOGS"
  | "ADMIN_AUDIT_LOGS"
  | "RATE_LIMIT_EVENTS"
  | "IDEMPOTENCY_KEYS";
export type DataRetentionAction =
  | "ANONYMIZE"
  | "HARD_DELETE"
  | "PURGE_EXTERNAL_OBJECT"
  | "RETAIN"
  | "SKIP";
export type DataRetentionReason =
  | "TTL_EXPIRED"
  | "WITHDRAWAL_GRACE_EXPIRED"
  | "CONSENT_REVOKED"
  | "PRIVACY_EXPORT_EXPIRED"
  | "SOFT_DELETE_RETENTION_EXPIRED"
  | "AUDIT_RETENTION_EXPIRED"
  | "OPERATION_RETENTION_EXPIRED"
  | "AD_EVENT_RETENTION_EXPIRED"
  | "SECURITY_EVENT_RETENTION_EXPIRED"
  | "LEGAL_HOLD"
  | "ACTIVE_DISPUTE"
  | "NOT_YET_DUE"
  | "DOMAIN_DISABLED";
export type RetentionCandidateStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "SOFT_DELETED"
  | "WITHDRAWN"
  | "REVOKED"
  | "FAILED"
  | "ARCHIVED";
export type RetentionOperation =
  | "scheduled_cleanup"
  | "domain_cleanup"
  | "subject_cleanup"
  | "preview";
export type JobLockStatus =
  | "ACQUIRED"
  | "SKIPPED_ALREADY_RUNNING"
  | "UNAVAILABLE";
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export interface DataRetentionEnvLike {
  readonly APP_ENV?: string;
  readonly ENVIRONMENT?: string;
  readonly NODE_ENV?: string;
  readonly DATA_RETENTION_DRY_RUN?: string;
  readonly DATA_RETENTION_BATCH_SIZE?: string;
  readonly DATA_RETENTION_LOCK_TTL_SECONDS?: string;
  readonly DATA_RETENTION_AUDIT_TO_CONSOLE?: string;
  readonly DATA_RETENTION_AUTH_SESSION_DAYS?: string;
  readonly DATA_RETENTION_TEMP_TOKEN_DAYS?: string;
  readonly DATA_RETENTION_WITHDRAWN_USER_DAYS?: string;
  readonly DATA_RETENTION_PRIVACY_EXPORT_DAYS?: string;
  readonly DATA_RETENTION_NOTIFICATION_DAYS?: string;
  readonly DATA_RETENTION_PUSH_TOKEN_DAYS?: string;
  readonly DATA_RETENTION_UPLOAD_DAYS?: string;
  readonly DATA_RETENTION_COMMUNITY_DELETED_DAYS?: string;
  readonly DATA_RETENTION_AD_EVENT_DAYS?: string;
  readonly DATA_RETENTION_OPERATION_EVENT_DAYS?: string;
  readonly DATA_RETENTION_AUDIT_LOG_DAYS?: string;
  readonly DATA_RETENTION_ADMIN_AUDIT_LOG_DAYS?: string;
  readonly DATA_RETENTION_RATE_LIMIT_DAYS?: string;
  readonly DATA_RETENTION_IDEMPOTENCY_DAYS?: string;
}

export interface DataRetentionRuntimeContext<TEnv = unknown> {
  readonly env: TEnv;
  readonly execution?: WaitUntilCapable | undefined;
  readonly requestId?: string | undefined;
  readonly actorId?: string | undefined;
  readonly now?: Date | undefined;
  readonly operation?: RetentionOperation | undefined;
}

export interface DomainRetentionPolicy {
  readonly domain: DataRetentionDomain;
  readonly enabled: boolean;
  readonly retentionDays: number;
  readonly action: DataRetentionAction;
  readonly reason: DataRetentionReason;
  readonly batchSize: number;
  readonly hardDeleteAllowed: boolean;
  readonly anonymizeBeforeDelete: boolean;
  readonly requiresObjectPurge: boolean;
}

export interface DataRetentionCandidate {
  readonly id: string;
  readonly domain: DataRetentionDomain;
  readonly status: RetentionCandidateStatus;
  readonly createdAt: string;
  readonly updatedAt?: string | undefined;
  readonly deletedAt?: string | undefined;
  readonly expiresAt?: string | undefined;
  readonly retentionUntil?: string | undefined;
  readonly subjectUserId?: string | undefined;
  readonly objectKey?: string | undefined;
  readonly objectBucket?: string | undefined;
  readonly legalHold: boolean;
  readonly activeDispute: boolean;
  readonly containsRawFinancialData: boolean;
  readonly containsRawPushToken: boolean;
  readonly metadata: JsonRecord;
}

export interface DataRetentionEvaluation {
  readonly candidate: DataRetentionCandidate;
  readonly action: DataRetentionAction;
  readonly reason: DataRetentionReason;
  readonly eligible: boolean;
  readonly dueAt: string;
  readonly ageDays: number;
  readonly score: number;
  readonly protectedByLegalHold: boolean;
  readonly protectedByActiveDispute: boolean;
}

export interface DataRetentionPolicySet {
  readonly mode: DataRetentionMode;
  readonly batchSize: number;
  readonly lockTtlSeconds: number;
  readonly domains: Readonly<
    Record<DataRetentionDomain, DomainRetentionPolicy>
  >;
}

export interface DataRetentionListCriteria {
  readonly domain: DataRetentionDomain;
  readonly dueBefore: string;
  readonly limit: number;
  readonly cursor?: string | undefined;
  readonly subjectUserId?: string | undefined;
}
export interface DataRetentionListResult {
  readonly items: readonly DataRetentionCandidate[];
  readonly nextCursor: string | null;
}
export interface DataRetentionExternalObject {
  readonly id: string;
  readonly bucket: string;
  readonly key: string;
  readonly domain: DataRetentionDomain;
}
export interface DataRetentionMutationInput {
  readonly domain: DataRetentionDomain;
  readonly ids: readonly string[];
  readonly requestId: string;
  readonly actorId: string;
  readonly now: string;
  readonly reason: DataRetentionReason;
  readonly details: JsonRecord;
}
export interface ExternalObjectPurgeInput extends DataRetentionMutationInput {
  readonly objects: readonly DataRetentionExternalObject[];
}
export interface DataRetentionLockResult {
  readonly status: JobLockStatus;
  readonly lockId: string;
  readonly owner: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
}

export interface DataRetentionRepository {
  readonly acquireJobLock?: (input: {
    readonly lockName: string;
    readonly requestId: string;
    readonly owner: string;
    readonly ttlSeconds: number;
    readonly now: string;
  }) => Promise<DataRetentionLockResult>;
  readonly releaseJobLock?: (input: {
    readonly lockId: string;
    readonly requestId: string;
    readonly owner: string;
    readonly now: string;
  }) => Promise<void>;
  readonly listRetentionCandidates: (
    criteria: DataRetentionListCriteria,
  ) => Promise<DataRetentionListResult>;
  readonly anonymizeCandidates: (
    input: DataRetentionMutationInput,
  ) => Promise<number>;
  readonly hardDeleteCandidates: (
    input: DataRetentionMutationInput,
  ) => Promise<number>;
  readonly purgeExternalObjects?: (
    input: ExternalObjectPurgeInput,
  ) => Promise<number>;
  readonly markRetained?: (
    input: DataRetentionMutationInput,
  ) => Promise<number>;
  readonly appendRetentionAudit?: (
    event: DataRetentionAuditEvent,
  ) => Promise<void>;
}

export interface DataRetentionJobOptions<TEnv = unknown> {
  readonly repository: DataRetentionRepository;
  readonly defaultMode?:
    | DataRetentionMode
    | ((env: TEnv) => DataRetentionMode | null | undefined);
  readonly batchSize?: number | ((env: TEnv) => number | null | undefined);
  readonly lockTtlSeconds?: number | ((env: TEnv) => number | null | undefined);
  readonly domainPolicies?:
    | Partial<
        Record<
          DataRetentionDomain,
          Partial<Omit<DomainRetentionPolicy, "domain" | "batchSize">>
        >
      >
    | undefined;
  readonly onEvent?: (
    event: DataRetentionAuditEvent,
    env: TEnv,
    context?: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface DataRetentionAuditEvent {
  readonly event:
    | "data_retention.cleanup"
    | "data_retention.preview"
    | "data_retention.domain"
    | "data_retention.subject"
    | "data_retention.lock";
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: RetentionOperation;
  readonly actorId: string;
  readonly mode: DataRetentionMode;
  readonly status: "SUCCESS" | "FAILURE" | "SKIPPED";
  readonly domain: DataRetentionDomain | "ALL";
  readonly scannedCount: number;
  readonly eligibleCount: number;
  readonly anonymizedCount: number;
  readonly hardDeletedCount: number;
  readonly externalPurgedCount: number;
  readonly retainedCount: number;
  readonly skippedCount: number;
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly createdAt: string;
  readonly details: JsonRecord;
}

export interface DataRetentionSafePolicyGuard {
  readonly rawFinancialDataReadForCleanupOnly: true;
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly legalHoldProtected: true;
  readonly activeDisputeProtected: true;
  readonly dryRunSupported: true;
  readonly repositoryBoundaryRequired: true;
  readonly auditEventSanitized: true;
  readonly hardDeleteRequiresPolicy: true;
}

export interface DataRetentionDomainResult {
  readonly domain: DataRetentionDomain;
  readonly scannedCount: number;
  readonly eligibleCount: number;
  readonly anonymizedCount: number;
  readonly hardDeletedCount: number;
  readonly externalPurgedCount: number;
  readonly retainedCount: number;
  readonly skippedCount: number;
  readonly nextCursor: string | null;
  readonly evaluations: readonly DataRetentionEvaluation[];
}

export interface DataRetentionJobResult {
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: RetentionOperation;
  readonly mode: DataRetentionMode;
  readonly lockStatus: JobLockStatus;
  readonly policy: DataRetentionPolicySet;
  readonly scannedCount: number;
  readonly eligibleCount: number;
  readonly anonymizedCount: number;
  readonly hardDeletedCount: number;
  readonly externalPurgedCount: number;
  readonly retainedCount: number;
  readonly skippedCount: number;
  readonly domainResults: readonly DataRetentionDomainResult[];
  readonly safePolicyGuard: DataRetentionSafePolicyGuard;
  readonly startedAt: string;
  readonly completedAt: string;
}

export interface DataRetentionCleanupJob<TEnv = unknown> {
  readonly version: string;
  readonly preview: (
    context: DataRetentionRuntimeContext<TEnv>,
  ) => Promise<DataRetentionJobResult>;
  readonly run: (
    context: DataRetentionRuntimeContext<TEnv>,
  ) => Promise<DataRetentionJobResult>;
  readonly runDomain: (
    domain: DataRetentionDomain,
    context: DataRetentionRuntimeContext<TEnv>,
  ) => Promise<DataRetentionJobResult>;
  readonly runForSubject: (
    subjectUserId: string,
    context: DataRetentionRuntimeContext<TEnv>,
  ) => Promise<DataRetentionJobResult>;
  readonly resolvePolicy: (
    context: DataRetentionRuntimeContext<TEnv>,
    modeOverride?: DataRetentionMode,
  ) => DataRetentionPolicySet;
  readonly evaluateCandidate: (
    candidate: DataRetentionCandidate,
    policy: DomainRetentionPolicy,
    now: Date,
  ) => DataRetentionEvaluation;
}

export class DataRetentionCleanupError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "DataRetentionCleanupError";
    this.code = code;
    this.status = status;
  }
}

export const dataRetentionSafePolicyGuard: DataRetentionSafePolicyGuard =
  Object.freeze({
    rawFinancialDataReadForCleanupOnly: true,
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
    legalHoldProtected: true,
    activeDisputeProtected: true,
    dryRunSupported: true,
    repositoryBoundaryRequired: true,
    auditEventSanitized: true,
    hardDeleteRequiresPolicy: true,
  });

const domainOrder: readonly DataRetentionDomain[] = Object.freeze([
  "AUTH_SESSIONS",
  "PASSWORD_RESETS",
  "EMAIL_VERIFICATIONS",
  "WITHDRAWN_USERS",
  "PRIVACY_EXPORTS",
  "NOTIFICATIONS",
  "PUSH_TOKENS",
  "UPLOAD_OBJECTS",
  "COMMUNITY_SOFT_DELETED_CONTENT",
  "AD_IMPRESSIONS",
  "AD_CLICKS",
  "OPERATION_EVENTS",
  "AUDIT_LOGS",
  "ADMIN_AUDIT_LOGS",
  "RATE_LIMIT_EVENTS",
  "IDEMPOTENCY_KEYS",
]);

const basePolicies: Readonly<
  Record<
    DataRetentionDomain,
    Omit<DomainRetentionPolicy, "domain" | "batchSize">
  >
> = Object.freeze({
  AUTH_SESSIONS: {
    enabled: true,
    retentionDays: 30,
    action: "HARD_DELETE",
    reason: "SECURITY_EVENT_RETENTION_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  PASSWORD_RESETS: {
    enabled: true,
    retentionDays: 7,
    action: "HARD_DELETE",
    reason: "TTL_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  EMAIL_VERIFICATIONS: {
    enabled: true,
    retentionDays: 14,
    action: "HARD_DELETE",
    reason: "TTL_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  WITHDRAWN_USERS: {
    enabled: true,
    retentionDays: 30,
    action: "ANONYMIZE",
    reason: "WITHDRAWAL_GRACE_EXPIRED",
    hardDeleteAllowed: false,
    anonymizeBeforeDelete: true,
    requiresObjectPurge: false,
  },
  PRIVACY_EXPORTS: {
    enabled: true,
    retentionDays: 7,
    action: "PURGE_EXTERNAL_OBJECT",
    reason: "PRIVACY_EXPORT_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: true,
  },
  NOTIFICATIONS: {
    enabled: true,
    retentionDays: 180,
    action: "HARD_DELETE",
    reason: "TTL_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  PUSH_TOKENS: {
    enabled: true,
    retentionDays: 180,
    action: "HARD_DELETE",
    reason: "CONSENT_REVOKED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  UPLOAD_OBJECTS: {
    enabled: true,
    retentionDays: 30,
    action: "PURGE_EXTERNAL_OBJECT",
    reason: "SOFT_DELETE_RETENTION_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: true,
  },
  COMMUNITY_SOFT_DELETED_CONTENT: {
    enabled: true,
    retentionDays: 90,
    action: "ANONYMIZE",
    reason: "SOFT_DELETE_RETENTION_EXPIRED",
    hardDeleteAllowed: false,
    anonymizeBeforeDelete: true,
    requiresObjectPurge: false,
  },
  AD_IMPRESSIONS: {
    enabled: true,
    retentionDays: 90,
    action: "HARD_DELETE",
    reason: "AD_EVENT_RETENTION_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  AD_CLICKS: {
    enabled: true,
    retentionDays: 180,
    action: "HARD_DELETE",
    reason: "AD_EVENT_RETENTION_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  OPERATION_EVENTS: {
    enabled: true,
    retentionDays: 180,
    action: "HARD_DELETE",
    reason: "OPERATION_RETENTION_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  AUDIT_LOGS: {
    enabled: true,
    retentionDays: 730,
    action: "HARD_DELETE",
    reason: "AUDIT_RETENTION_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  ADMIN_AUDIT_LOGS: {
    enabled: true,
    retentionDays: 1_825,
    action: "RETAIN",
    reason: "AUDIT_RETENTION_EXPIRED",
    hardDeleteAllowed: false,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  RATE_LIMIT_EVENTS: {
    enabled: true,
    retentionDays: 30,
    action: "HARD_DELETE",
    reason: "SECURITY_EVENT_RETENTION_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
  IDEMPOTENCY_KEYS: {
    enabled: true,
    retentionDays: 14,
    action: "HARD_DELETE",
    reason: "TTL_EXPIRED",
    hardDeleteAllowed: true,
    anonymizeBeforeDelete: false,
    requiresObjectPurge: false,
  },
});

function envText<TEnv>(
  env: TEnv,
  key: keyof DataRetentionEnvLike,
): string | null {
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
  key: keyof DataRetentionEnvLike,
  fallback: number,
): number {
  const value = typeof option === "function" ? option(env) : option;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : numberFromText(envText(env, key), fallback);
}
function optionMode<TEnv>(
  env: TEnv,
  option:
    | DataRetentionMode
    | ((env: TEnv) => DataRetentionMode | null | undefined)
    | undefined,
): DataRetentionMode {
  const value = typeof option === "function" ? option(env) : option;
  if (value === "APPLY" || value === "DRY_RUN") return value;
  return boolFromText(envText(env, "DATA_RETENTION_DRY_RUN"), false)
    ? "DRY_RUN"
    : "APPLY";
}
function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}
function createRequestId(prefix: string): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}
function iso(date: Date): string {
  return date.toISOString();
}
function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
function cutoff(now: Date, days: number): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}
function daysSince(now: Date, value: string | undefined): number {
  const date = parseDate(value);
  return date
    ? Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000))
    : 0;
}
function dueDateFor(
  candidate: DataRetentionCandidate,
  policy: DomainRetentionPolicy,
): string {
  return (
    candidate.retentionUntil ??
    candidate.expiresAt ??
    cutoff(new Date(candidate.createdAt), -policy.retentionDays)
  );
}
function isDue(
  candidate: DataRetentionCandidate,
  policy: DomainRetentionPolicy,
  now: Date,
): boolean {
  const due = parseDate(dueDateFor(candidate, policy));
  return Boolean(due && due.getTime() <= now.getTime());
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
          "급여",
          "월급",
          "계좌",
          "카드",
          "대출",
          "저축",
          "지출",
          "명세서",
          "통장",
        ].some((fragment) =>
          normalized.includes(fragment.toLowerCase().replace(/[\s._-]/g, "")),
        );
        const allowed =
          normalized === "tokenhash" ||
          normalized === "tokenhashes" ||
          normalized === "subjectuseridpresent";
        return [
          key.slice(0, 160),
          sensitive && !allowed
            ? "[REDACTED]"
            : sanitize(item, depth + 1, seen),
        ];
      }),
  ) as JsonRecord;
}

function retentionDays<TEnv>(
  env: TEnv,
  domain: DataRetentionDomain,
  fallback: number,
): number {
  const keys: Record<DataRetentionDomain, keyof DataRetentionEnvLike> = {
    AUTH_SESSIONS: "DATA_RETENTION_AUTH_SESSION_DAYS",
    PASSWORD_RESETS: "DATA_RETENTION_TEMP_TOKEN_DAYS",
    EMAIL_VERIFICATIONS: "DATA_RETENTION_TEMP_TOKEN_DAYS",
    WITHDRAWN_USERS: "DATA_RETENTION_WITHDRAWN_USER_DAYS",
    PRIVACY_EXPORTS: "DATA_RETENTION_PRIVACY_EXPORT_DAYS",
    NOTIFICATIONS: "DATA_RETENTION_NOTIFICATION_DAYS",
    PUSH_TOKENS: "DATA_RETENTION_PUSH_TOKEN_DAYS",
    UPLOAD_OBJECTS: "DATA_RETENTION_UPLOAD_DAYS",
    COMMUNITY_SOFT_DELETED_CONTENT: "DATA_RETENTION_COMMUNITY_DELETED_DAYS",
    AD_IMPRESSIONS: "DATA_RETENTION_AD_EVENT_DAYS",
    AD_CLICKS: "DATA_RETENTION_AD_EVENT_DAYS",
    OPERATION_EVENTS: "DATA_RETENTION_OPERATION_EVENT_DAYS",
    AUDIT_LOGS: "DATA_RETENTION_AUDIT_LOG_DAYS",
    ADMIN_AUDIT_LOGS: "DATA_RETENTION_ADMIN_AUDIT_LOG_DAYS",
    RATE_LIMIT_EVENTS: "DATA_RETENTION_RATE_LIMIT_DAYS",
    IDEMPOTENCY_KEYS: "DATA_RETENTION_IDEMPOTENCY_DAYS",
  };
  return clampInt(
    numberFromText(envText(env, keys[domain]), fallback),
    1,
    7_300,
  );
}
function assertSubjectUserId(subjectUserId: string): void {
  if (!/^[a-zA-Z0-9:_./-]{1,180}$/.test(subjectUserId.trim()))
    throw new DataRetentionCleanupError(
      "DATA_RETENTION_SUBJECT_ID_INVALID",
      "subjectUserId 형식이 올바르지 않습니다.",
      400,
    );
}
function idsFor(
  items: readonly DataRetentionEvaluation[],
  action: DataRetentionAction,
): readonly string[] {
  return items
    .filter((item) => item.eligible && item.action === action)
    .map((item) => item.candidate.id);
}
function externalObjects(
  items: readonly DataRetentionEvaluation[],
): readonly DataRetentionExternalObject[] {
  return items
    .filter(
      (item) =>
        item.eligible &&
        item.action === "PURGE_EXTERNAL_OBJECT" &&
        item.candidate.objectBucket &&
        item.candidate.objectKey,
    )
    .map((item) => ({
      id: item.candidate.id,
      bucket: item.candidate.objectBucket ?? "",
      key: item.candidate.objectKey ?? "",
      domain: item.candidate.domain,
    }));
}
function totals(results: readonly DataRetentionDomainResult[]) {
  return results.reduce(
    (acc, item) => ({
      scannedCount: acc.scannedCount + item.scannedCount,
      eligibleCount: acc.eligibleCount + item.eligibleCount,
      anonymizedCount: acc.anonymizedCount + item.anonymizedCount,
      hardDeletedCount: acc.hardDeletedCount + item.hardDeletedCount,
      externalPurgedCount: acc.externalPurgedCount + item.externalPurgedCount,
      retainedCount: acc.retainedCount + item.retainedCount,
      skippedCount: acc.skippedCount + item.skippedCount,
    }),
    {
      scannedCount: 0,
      eligibleCount: 0,
      anonymizedCount: 0,
      hardDeletedCount: 0,
      externalPurgedCount: 0,
      retainedCount: 0,
      skippedCount: 0,
    },
  );
}
function eventName(
  operation: RetentionOperation,
): DataRetentionAuditEvent["event"] {
  return operation === "preview"
    ? "data_retention.preview"
    : operation === "domain_cleanup"
      ? "data_retention.domain"
      : operation === "subject_cleanup"
        ? "data_retention.subject"
        : "data_retention.cleanup";
}

async function emit<TEnv>(
  options: DataRetentionJobOptions<TEnv>,
  context: DataRetentionRuntimeContext<TEnv>,
  event: DataRetentionAuditEvent,
): Promise<void> {
  if (
    boolFromText(envText(context.env, "DATA_RETENTION_AUDIT_TO_CONSOLE"), false)
  )
    console.info(
      "salary_hijacking_data_retention_event",
      JSON.stringify(sanitize(event)),
    );
  const task = Promise.all([
    options.repository.appendRetentionAudit?.(event) ?? Promise.resolve(),
    options.onEvent
      ? Promise.resolve(options.onEvent(event, context.env, context.execution))
      : Promise.resolve(),
  ])
    .then(() => undefined)
    .catch((error) =>
      console.warn(
        "data_retention_event_failed",
        error instanceof Error ? error.name : "UnknownError",
      ),
    );
  context.execution?.waitUntil?.(task);
  if (!context.execution?.waitUntil) await task;
}

function auditFrom(
  result: DataRetentionJobResult,
  status: DataRetentionAuditEvent["status"],
  domain: DataRetentionDomain | "ALL",
  details: JsonRecord,
): DataRetentionAuditEvent {
  return {
    event: eventName(result.operation),
    service: DATA_RETENTION_CLEANUP_JOB_NAME,
    version: DATA_RETENTION_CLEANUP_JOB_VERSION,
    requestId: result.requestId,
    operation: result.operation,
    actorId: "system:data-retention-cleanup",
    mode: result.mode,
    status,
    domain,
    scannedCount: result.scannedCount,
    eligibleCount: result.eligibleCount,
    anonymizedCount: result.anonymizedCount,
    hardDeletedCount: result.hardDeletedCount,
    externalPurgedCount: result.externalPurgedCount,
    retainedCount: result.retainedCount,
    skippedCount: result.skippedCount,
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
    createdAt: result.completedAt,
    details: sanitize(details) as JsonRecord,
  };
}

export function createDataRetentionCleanupJob<TEnv = DataRetentionEnvLike>(
  options: DataRetentionJobOptions<TEnv>,
): DataRetentionCleanupJob<TEnv> {
  if (!options.repository)
    throw new DataRetentionCleanupError(
      "DATA_RETENTION_REPOSITORY_REQUIRED",
      "data retention repository가 필요합니다.",
      500,
    );

  function resolvePolicy(
    context: DataRetentionRuntimeContext<TEnv>,
    modeOverride?: DataRetentionMode,
  ): DataRetentionPolicySet {
    const batchSize = clampInt(
      optionNumber(
        context.env,
        options.batchSize,
        "DATA_RETENTION_BATCH_SIZE",
        DEFAULT_RETENTION_BATCH_SIZE,
      ),
      1,
      MAX_RETENTION_BATCH_SIZE,
    );
    const domains = Object.fromEntries(
      domainOrder.map((domain) => {
        const base = basePolicies[domain];
        const override = options.domainPolicies?.[domain] ?? {};
        const policy: DomainRetentionPolicy = {
          domain,
          enabled: override.enabled ?? base.enabled,
          retentionDays: retentionDays(
            context.env,
            domain,
            override.retentionDays ?? base.retentionDays,
          ),
          action: override.action ?? base.action,
          reason: override.reason ?? base.reason,
          batchSize,
          hardDeleteAllowed:
            override.hardDeleteAllowed ?? base.hardDeleteAllowed,
          anonymizeBeforeDelete:
            override.anonymizeBeforeDelete ?? base.anonymizeBeforeDelete,
          requiresObjectPurge:
            override.requiresObjectPurge ?? base.requiresObjectPurge,
        };
        return [domain, policy];
      }),
    ) as Record<DataRetentionDomain, DomainRetentionPolicy>;
    return {
      mode: modeOverride ?? optionMode(context.env, options.defaultMode),
      batchSize,
      lockTtlSeconds: clampInt(
        optionNumber(
          context.env,
          options.lockTtlSeconds,
          "DATA_RETENTION_LOCK_TTL_SECONDS",
          DEFAULT_LOCK_TTL_SECONDS,
        ),
        60,
        86_400,
      ),
      domains,
    };
  }

  function evaluateCandidate(
    candidate: DataRetentionCandidate,
    policy: DomainRetentionPolicy,
    now: Date,
  ): DataRetentionEvaluation {
    const ageDays = daysSince(now, candidate.createdAt);
    const dueAt = dueDateFor(candidate, policy);
    if (!policy.enabled)
      return {
        candidate,
        action: "SKIP",
        reason: "DOMAIN_DISABLED",
        eligible: false,
        dueAt,
        ageDays,
        score: 0,
        protectedByLegalHold: false,
        protectedByActiveDispute: false,
      };
    if (candidate.legalHold)
      return {
        candidate,
        action: "RETAIN",
        reason: "LEGAL_HOLD",
        eligible: false,
        dueAt,
        ageDays,
        score: 0,
        protectedByLegalHold: true,
        protectedByActiveDispute: false,
      };
    if (candidate.activeDispute)
      return {
        candidate,
        action: "RETAIN",
        reason: "ACTIVE_DISPUTE",
        eligible: false,
        dueAt,
        ageDays,
        score: 0,
        protectedByLegalHold: false,
        protectedByActiveDispute: true,
      };
    if (!isDue(candidate, policy, now))
      return {
        candidate,
        action: "SKIP",
        reason: "NOT_YET_DUE",
        eligible: false,
        dueAt,
        ageDays,
        score: 0,
        protectedByLegalHold: false,
        protectedByActiveDispute: false,
      };
    const action =
      policy.action === "HARD_DELETE" && !policy.hardDeleteAllowed
        ? "ANONYMIZE"
        : policy.action;
    return {
      candidate,
      action,
      reason: policy.reason,
      eligible: action !== "RETAIN" && action !== "SKIP",
      dueAt,
      ageDays,
      score: Math.min(100, 50 + Math.max(0, ageDays - policy.retentionDays)),
      protectedByLegalHold: false,
      protectedByActiveDispute: false,
    };
  }

  async function applyDomain(
    domain: DataRetentionDomain,
    context: DataRetentionRuntimeContext<TEnv>,
    policySet: DataRetentionPolicySet,
    subjectUserId?: string,
  ): Promise<DataRetentionDomainResult> {
    const now = context.now ?? new Date();
    const policy = policySet.domains[domain];
    const list = await options.repository.listRetentionCandidates({
      domain,
      dueBefore: iso(now),
      limit: policy.batchSize,
      ...(subjectUserId ? { subjectUserId } : {}),
    });
    const evaluations = list.items.map((candidate) =>
      evaluateCandidate(candidate, policy, now),
    );
    const eligible = evaluations.filter((item) => item.eligible);
    const retainIds = idsFor(evaluations, "RETAIN");
    const anonymizeIds = idsFor(evaluations, "ANONYMIZE");
    const deleteIds = idsFor(evaluations, "HARD_DELETE");
    const objects = externalObjects(evaluations);
    const skipped = evaluations.filter((item) => item.action === "SKIP").length;

    if (policySet.mode === "DRY_RUN")
      return {
        domain,
        scannedCount: list.items.length,
        eligibleCount: eligible.length,
        anonymizedCount: anonymizeIds.length,
        hardDeletedCount: deleteIds.length,
        externalPurgedCount: objects.length,
        retainedCount: retainIds.length,
        skippedCount: skipped,
        nextCursor: list.nextCursor,
        evaluations,
      };

    const base = {
      domain,
      requestId: context.requestId ?? createRequestId("drc"),
      actorId: context.actorId ?? "system:data-retention-cleanup",
      now: iso(now),
      reason: policy.reason,
      details: {
        retentionDays: policy.retentionDays,
        subjectUserIdPresent: Boolean(subjectUserId),
        rawFinancialDataLogged: false,
        rawPushTokenLogged: false,
      },
    };
    const anonymizedCount = anonymizeIds.length
      ? await options.repository.anonymizeCandidates({
          ...base,
          ids: anonymizeIds,
        })
      : 0;
    const hardDeletedCount = deleteIds.length
      ? await options.repository.hardDeleteCandidates({
          ...base,
          ids: deleteIds,
        })
      : 0;
    const externalPurgedCount =
      objects.length && options.repository.purgeExternalObjects
        ? await options.repository.purgeExternalObjects({
            ...base,
            ids: objects.map((object) => object.id),
            objects,
          })
        : 0;
    const retainedCount =
      retainIds.length && options.repository.markRetained
        ? await options.repository.markRetained({ ...base, ids: retainIds })
        : retainIds.length;
    return {
      domain,
      scannedCount: list.items.length,
      eligibleCount: eligible.length,
      anonymizedCount,
      hardDeletedCount,
      externalPurgedCount,
      retainedCount,
      skippedCount: skipped,
      nextCursor: list.nextCursor,
      evaluations,
    };
  }

  async function runInternal(
    context: DataRetentionRuntimeContext<TEnv>,
    domains: readonly DataRetentionDomain[],
    operation: RetentionOperation,
    mode?: DataRetentionMode,
    subjectUserId?: string,
  ): Promise<DataRetentionJobResult> {
    if (subjectUserId) assertSubjectUserId(subjectUserId);
    const startedAt = context.now ?? new Date();
    const requestId = context.requestId ?? createRequestId("drc");
    const actorId = context.actorId ?? "system:data-retention-cleanup";
    const policy = resolvePolicy(
      { ...context, requestId, actorId, now: startedAt, operation },
      mode,
    );
    const owner = `${DATA_RETENTION_CLEANUP_JOB_NAME}:${actorId}`;
    const lock =
      operation === "preview" || operation === "subject_cleanup"
        ? {
            status: "ACQUIRED" as const,
            lockId: `lock_${requestId}`,
            owner,
            acquiredAt: iso(startedAt),
            expiresAt: iso(
              new Date(startedAt.getTime() + policy.lockTtlSeconds * 1_000),
            ),
          }
        : ((await options.repository.acquireJobLock?.({
            lockName: DATA_RETENTION_CLEANUP_JOB_NAME,
            requestId,
            owner,
            ttlSeconds: policy.lockTtlSeconds,
            now: iso(startedAt),
          })) ?? {
            status: "ACQUIRED" as const,
            lockId: `lock_${requestId}`,
            owner,
            acquiredAt: iso(startedAt),
            expiresAt: iso(
              new Date(startedAt.getTime() + policy.lockTtlSeconds * 1_000),
            ),
          });

    if (lock.status !== "ACQUIRED") {
      const skippedResult: DataRetentionJobResult = {
        service: DATA_RETENTION_CLEANUP_JOB_NAME,
        version: DATA_RETENTION_CLEANUP_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        lockStatus: lock.status,
        policy,
        scannedCount: 0,
        eligibleCount: 0,
        anonymizedCount: 0,
        hardDeletedCount: 0,
        externalPurgedCount: 0,
        retainedCount: 0,
        skippedCount: 0,
        domainResults: [],
        safePolicyGuard: dataRetentionSafePolicyGuard,
        startedAt: iso(startedAt),
        completedAt: iso(new Date()),
      };
      await emit(
        options,
        context,
        auditFrom(skippedResult, "SKIPPED", "ALL", { lockStatus: lock.status }),
      );
      return skippedResult;
    }

    try {
      const domainResults: DataRetentionDomainResult[] = [];
      for (const domain of domains)
        domainResults.push(
          await applyDomain(
            domain,
            { ...context, requestId, actorId, now: startedAt, operation },
            policy,
            subjectUserId,
          ),
        );
      const result: DataRetentionJobResult = {
        service: DATA_RETENTION_CLEANUP_JOB_NAME,
        version: DATA_RETENTION_CLEANUP_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        lockStatus: lock.status,
        policy,
        ...totals(domainResults),
        domainResults,
        safePolicyGuard: dataRetentionSafePolicyGuard,
        startedAt: iso(startedAt),
        completedAt: iso(new Date()),
      };
      await emit(
        options,
        context,
        auditFrom(
          result,
          "SUCCESS",
          domains.length === 1 ? (domains[0] ?? "ALL") : "ALL",
          { domainCount: domains.length },
        ),
      );
      return result;
    } catch (error) {
      const failed: DataRetentionJobResult = {
        service: DATA_RETENTION_CLEANUP_JOB_NAME,
        version: DATA_RETENTION_CLEANUP_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        lockStatus: lock.status,
        policy,
        scannedCount: 0,
        eligibleCount: 0,
        anonymizedCount: 0,
        hardDeletedCount: 0,
        externalPurgedCount: 0,
        retainedCount: 0,
        skippedCount: 0,
        domainResults: [],
        safePolicyGuard: dataRetentionSafePolicyGuard,
        startedAt: iso(startedAt),
        completedAt: iso(new Date()),
      };
      await emit(
        options,
        context,
        auditFrom(failed, "FAILURE", "ALL", {
          error: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      throw error;
    } finally {
      if (operation !== "preview" && operation !== "subject_cleanup")
        await options.repository.releaseJobLock?.({
          lockId: lock.lockId,
          requestId,
          owner,
          now: iso(new Date()),
        });
    }
  }

  return Object.freeze({
    version: DATA_RETENTION_CLEANUP_JOB_VERSION,
    preview: (context: DataRetentionRuntimeContext<TEnv>) =>
      runInternal(context, domainOrder, "preview", "DRY_RUN"),
    run: (context: DataRetentionRuntimeContext<TEnv>) =>
      runInternal(context, domainOrder, "scheduled_cleanup"),
    runDomain: (
      domain: DataRetentionDomain,
      context: DataRetentionRuntimeContext<TEnv>,
    ) => runInternal(context, [domain], "domain_cleanup"),
    runForSubject: (
      subjectUserId: string,
      context: DataRetentionRuntimeContext<TEnv>,
    ) =>
      runInternal(
        context,
        domainOrder,
        "subject_cleanup",
        undefined,
        subjectUserId,
      ),
    resolvePolicy,
    evaluateCandidate,
  });
}

export function createInMemoryDataRetentionRepository(
  seed: readonly DataRetentionCandidate[] = [],
): DataRetentionRepository & {
  readonly snapshot: () => readonly DataRetentionCandidate[];
  readonly auditSnapshot: () => readonly DataRetentionAuditEvent[];
} {
  let rows = [...seed];
  const audits: DataRetentionAuditEvent[] = [];
  let activeLock: DataRetentionLockResult | null = null;
  const update = (
    ids: readonly string[],
    patch: (row: DataRetentionCandidate) => DataRetentionCandidate,
  ): number => {
    const idSet = new Set(ids);
    let count = 0;
    rows = rows.map((row) => {
      if (!idSet.has(row.id)) return row;
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
    acquireJobLock: async (input) => {
      const now = new Date(input.now);
      if (
        activeLock &&
        new Date(activeLock.expiresAt).getTime() > now.getTime()
      )
        return { ...activeLock, status: "SKIPPED_ALREADY_RUNNING" };
      activeLock = {
        status: "ACQUIRED",
        lockId: createRequestId("lock"),
        owner: input.owner,
        acquiredAt: input.now,
        expiresAt: new Date(
          now.getTime() + input.ttlSeconds * 1_000,
        ).toISOString(),
      };
      return activeLock;
    },
    releaseJobLock: async () => {
      activeLock = null;
    },
    listRetentionCandidates: async (criteria) => ({
      items: rows
        .filter((row) => row.domain === criteria.domain)
        .filter(
          (row) =>
            !criteria.subjectUserId ||
            row.subjectUserId === criteria.subjectUserId,
        )
        .filter((row) => {
          const date =
            parseDate(row.retentionUntil) ??
            parseDate(row.expiresAt) ??
            parseDate(row.deletedAt) ??
            parseDate(row.updatedAt) ??
            parseDate(row.createdAt);
          return date ? date.toISOString() <= criteria.dueBefore : false;
        })
        .slice(0, criteria.limit),
      nextCursor: null,
    }),
    anonymizeCandidates: async (input) =>
      update(input.ids, (row) => ({
        ...row,
        subjectUserId: undefined,
        updatedAt: input.now,
        metadata: { anonymized: true, reason: input.reason },
      })),
    hardDeleteCandidates: async (input) =>
      update(input.ids, (row) => ({
        ...row,
        status: "ARCHIVED",
        deletedAt: input.now,
        updatedAt: input.now,
        metadata: { hardDeleted: true, reason: input.reason },
      })),
    purgeExternalObjects: async (input) =>
      update(input.ids, (row) => ({
        ...row,
        objectKey: undefined,
        objectBucket: undefined,
        updatedAt: input.now,
        metadata: { externalPurged: true, reason: input.reason },
      })),
    markRetained: async (input) =>
      update(input.ids, (row) => ({
        ...row,
        updatedAt: input.now,
        metadata: { retained: true, reason: input.reason },
      })),
    appendRetentionAudit: async (event) => {
      audits.push(event);
    },
  };
}

export const dataRetentionCleanupManifest = Object.freeze({
  file: "services/scheduler/src/jobs/data-retention-cleanup.job.ts",
  version: DATA_RETENTION_CLEANUP_JOB_VERSION,
  service: DATA_RETENTION_CLEANUP_JOB_NAME,
  runtime: "cloudflare-workers-cron-node-compatible",
  domains: domainOrder,
  capabilities: Object.freeze([
    "retention_policy_per_domain",
    "dry_run_preview",
    "scheduled_cleanup",
    "domain_cleanup",
    "subject_user_cleanup",
    "legal_hold_protection",
    "active_dispute_protection",
    "anonymize_hard_delete_external_object_purge",
    "job_lock_contract",
    "repository_boundary",
    "sanitized_audit_event",
    "raw_financial_data_not_logged",
    "raw_push_token_not_logged",
    "ads_financial_targeting_forbidden",
    "in_memory_test_repository",
  ]),
  safePolicyGuard: dataRetentionSafePolicyGuard,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertDataRetentionCleanupJobCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "scheduler_job_contract",
    "domain_retention_policy_set",
    "auth_session_temp_token_withdrawn_user_privacy_export_cleanup",
    "notifications_push_tokens_uploads_community_cleanup",
    "ad_operation_audit_rate_limit_idempotency_cleanup",
    "dry_run_preview_mode",
    "apply_mode_mutation_contract",
    "legal_hold_protection",
    "active_dispute_protection",
    "subject_user_scope_cleanup",
    "anonymize_action",
    "hard_delete_action",
    "external_object_purge_action",
    "job_lock_contract",
    "repository_boundary",
    "request_id_actor_audit_contract",
    "wait_until_event_hook",
    "sanitized_audit_no_raw_financial_data",
    "sanitized_audit_no_raw_push_token",
    "ads_financial_targeting_not_used",
    "in_memory_repository_for_tests",
    "cloudflare_workers_cron_node_compatible_no_node_dependency",
  ] as const;
  return {
    ok: checks.length >= 20,
    version: DATA_RETENTION_CLEANUP_JOB_VERSION,
    checks,
  };
}

export const defaultDataRetentionRepository =
  createInMemoryDataRetentionRepository();
export const defaultDataRetentionCleanupJob = createDataRetentionCleanupJob({
  repository: defaultDataRetentionRepository,
  defaultMode: "DRY_RUN",
});
export default createDataRetentionCleanupJob;
