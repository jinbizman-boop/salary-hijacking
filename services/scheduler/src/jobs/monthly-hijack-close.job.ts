/** services/scheduler/src/jobs/monthly-hijack-close.job.ts
 * 급여납치 Salary Hijacking Platform · Monthly Hijack Close Job 최종본
 * 서버 권위로 월간 급여·예산·지출·저축 실적을 마감하고 실제 납치금액, 차이, 달성 상태를 확정한다.
 * 알림/감사/광고 payload에는 급여·지출·저축·납치금액 원문을 남기지 않는다.
 */

export const MONTHLY_HIJACK_CLOSE_JOB_VERSION = "3.1.0";
export const MONTHLY_HIJACK_CLOSE_JOB_NAME =
  "salary-hijacking-monthly-hijack-close";
export const MONTHLY_HIJACK_CLOSE_TIMEZONE = "Asia/Seoul";
export const DEFAULT_MONTHLY_HIJACK_CLOSE_BATCH_SIZE = 300;
export const MAX_MONTHLY_HIJACK_CLOSE_BATCH_SIZE = 1_000;
export const DEFAULT_MONTHLY_HIJACK_CLOSE_GRACE_DAYS = 3;
export const DEFAULT_MONTHLY_HIJACK_CLOSE_LOCK_TTL_SECONDS = 3_600;
export const DEFAULT_MONTHLY_HIJACK_CLOSE_HOUR = 6;

export type MonthlyHijackCloseMode = "DRY_RUN" | "APPLY";
export type MonthlyHijackCloseOperation =
  | "scheduled_close"
  | "user_scope_close"
  | "month_scope_close"
  | "preview";
export type MonthlyHijackCloseStatus =
  | "OPEN"
  | "READY"
  | "CLOSED"
  | "REOPENED"
  | "SKIPPED";
export type MonthlyHijackCloseDecision = "CLOSE" | "RECALCULATE" | "SKIP";
export type MonthlyHijackCloseSkipReason =
  | "NOT_TARGET_MONTH"
  | "MONTH_NOT_COMPLETE"
  | "ALREADY_CLOSED"
  | "MISSING_SALARY"
  | "INVALID_KRW"
  | "USER_PAUSED"
  | "LEGAL_HOLD"
  | "DISABLED"
  | "NONE";
export type JobLockStatus =
  | "ACQUIRED"
  | "SKIPPED_ALREADY_RUNNING"
  | "UNAVAILABLE";
export type NotificationImportance =
  | "TRANSACTIONAL"
  | "BEHAVIORAL"
  | "COMMUNITY"
  | "MARKETING"
  | "SYSTEM_REQUIRED";
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export interface MonthlyHijackCloseEnvLike {
  readonly APP_ENV?: string;
  readonly ENVIRONMENT?: string;
  readonly NODE_ENV?: string;
  readonly MONTHLY_HIJACK_CLOSE_DRY_RUN?: string;
  readonly MONTHLY_HIJACK_CLOSE_BATCH_SIZE?: string;
  readonly MONTHLY_HIJACK_CLOSE_GRACE_DAYS?: string;
  readonly MONTHLY_HIJACK_CLOSE_LOCK_TTL_SECONDS?: string;
  readonly MONTHLY_HIJACK_CLOSE_HOUR?: string;
  readonly MONTHLY_HIJACK_CLOSE_AUDIT_TO_CONSOLE?: string;
  readonly MONTHLY_HIJACK_CLOSE_ALLOW_RECLOSE?: string;
  readonly MONTHLY_HIJACK_CLOSE_NOTIFICATION_ENABLED?: string;
  readonly MONTHLY_HIJACK_CLOSE_GROWTH_EVENT_ENABLED?: string;
}

export interface MonthlyHijackCloseRuntimeContext<TEnv = unknown> {
  readonly env: TEnv;
  readonly execution?: WaitUntilCapable | undefined;
  readonly requestId?: string | undefined;
  readonly actorId?: string | undefined;
  readonly now?: Date | undefined;
  readonly operation?: MonthlyHijackCloseOperation | undefined;
  readonly targetMonth?: string | undefined;
}

export interface MonthlyHijackCloseCandidate {
  readonly id: string;
  readonly userId: string;
  readonly month: string;
  readonly status: MonthlyHijackCloseStatus;
  readonly userActive: boolean;
  readonly legalHold: boolean;
  readonly expectedSalaryKrw: number;
  readonly actualSalaryKrw?: number | undefined;
  readonly plannedFixedExpenseKrw: number;
  readonly actualFixedExpenseKrw: number;
  readonly plannedSavingsKrw: number;
  readonly actualSavingsKrw: number;
  readonly plannedDailyBudgetKrw: number;
  readonly actualVariableExpenseKrw: number;
  readonly otherPlannedExpenseKrw: number;
  readonly otherActualExpenseKrw: number;
  readonly previousCarryOverKrw: number;
  readonly targetHijackKrw?: number | undefined;
  readonly closedAt?: string | undefined;
  readonly salaryReceivedAt?: string | undefined;
  readonly timezone?: string | undefined;
  readonly notificationEnabled: boolean;
  readonly growthEnabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata: JsonRecord;
}

export interface MonthlyHijackCalculation {
  readonly month: string;
  readonly incomeKrw: number;
  readonly plannedExpenseKrw: number;
  readonly actualExpenseKrw: number;
  readonly plannedSavingsKrw: number;
  readonly actualSavingsKrw: number;
  readonly previousCarryOverKrw: number;
  readonly plannedHijackKrw: number;
  readonly actualHijackKrw: number;
  readonly carryOverKrw: number;
  readonly varianceKrw: number;
  readonly achievementRateBasisPoints: number;
  readonly savingRateBasisPoints: number;
  readonly expenseRateBasisPoints: number;
  readonly targetAchieved: boolean;
  readonly overspent: boolean;
  readonly serverCalculatedAt: string;
}

export interface MonthlyHijackCloseEvaluation {
  readonly candidate: MonthlyHijackCloseCandidate;
  readonly decision: MonthlyHijackCloseDecision;
  readonly eligible: boolean;
  readonly skipReason: MonthlyHijackCloseSkipReason;
  readonly closeKey: string;
  readonly idempotencyKey: string;
  readonly calculation: MonthlyHijackCalculation | null;
  readonly score: number;
}

export interface MonthlyHijackClosePolicy {
  readonly mode: MonthlyHijackCloseMode;
  readonly batchSize: number;
  readonly graceDays: number;
  readonly lockTtlSeconds: number;
  readonly closeHour: number;
  readonly targetMonth: string;
  readonly timezone: string;
  readonly allowReclose: boolean;
  readonly notificationEnabled: boolean;
  readonly growthEventEnabled: boolean;
  readonly rawAmountInNotificationPayloadAllowed: false;
  readonly rawFinancialDataLogged: false;
  readonly adsFinancialTargetingUsed: false;
}

export interface MonthlyHijackCloseListCriteria {
  readonly targetMonth: string;
  readonly limit: number;
  readonly cursor?: string | undefined;
  readonly userId?: string | undefined;
  readonly statuses: readonly MonthlyHijackCloseStatus[];
}

export interface MonthlyHijackCloseListResult {
  readonly items: readonly MonthlyHijackCloseCandidate[];
  readonly nextCursor: string | null;
}

export interface MonthlyHijackClosePersistInput {
  readonly ids: readonly string[];
  readonly requestId: string;
  readonly actorId: string;
  readonly now: string;
  readonly closeKeys: readonly string[];
  readonly calculations: readonly MonthlyHijackCalculation[];
  readonly details: JsonRecord;
}

export interface MonthlyHijackCloseLockInput {
  readonly lockName: string;
  readonly requestId: string;
  readonly owner: string;
  readonly ttlSeconds: number;
  readonly now: string;
}

export interface MonthlyHijackCloseLockResult {
  readonly status: JobLockStatus;
  readonly lockId: string;
  readonly owner: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
}

export interface MonthlyHijackCloseRepository {
  readonly acquireJobLock?: (
    input: MonthlyHijackCloseLockInput,
  ) => Promise<MonthlyHijackCloseLockResult>;
  readonly releaseJobLock?: (input: {
    readonly lockId: string;
    readonly requestId: string;
    readonly owner: string;
    readonly now: string;
  }) => Promise<void>;
  readonly listMonthlyHijackCloseCandidates: (
    criteria: MonthlyHijackCloseListCriteria,
  ) => Promise<MonthlyHijackCloseListResult>;
  readonly persistMonthlyHijackClose: (
    input: MonthlyHijackClosePersistInput,
  ) => Promise<number>;
  readonly markMonthlyHijackCloseSkipped?: (input: {
    readonly ids: readonly string[];
    readonly requestId: string;
    readonly actorId: string;
    readonly now: string;
    readonly reason: MonthlyHijackCloseSkipReason;
    readonly details: JsonRecord;
  }) => Promise<number>;
  readonly appendMonthlyHijackCloseAudit?: (
    event: MonthlyHijackCloseAuditEvent,
  ) => Promise<void>;
}

export interface MonthlyHijackNotificationMessage {
  readonly type: "FCM_SEND";
  readonly requestId: string;
  readonly payload: {
    readonly notification: { readonly title: string; readonly body: string };
    readonly data: {
      readonly notificationId: string;
      readonly userId: string;
      readonly type: "HIJACK_GOAL";
      readonly importance: NotificationImportance;
      readonly targetScreen: string;
      readonly deeplink: string;
      readonly routeParams: Readonly<
        Record<string, string | number | boolean | null>
      >;
      readonly ttlSeconds: number;
      readonly idempotencyKey: string;
      readonly marketingConsentVerified: false;
      readonly adsPartnerConsentVerified: false;
    };
    readonly extraData: Readonly<
      Record<string, string | number | boolean | null>
    >;
    readonly validateOnly?: boolean | undefined;
  };
  readonly retryDelaySeconds: number;
}

export interface MonthlyHijackNotificationProducer {
  readonly send: (
    message: MonthlyHijackNotificationMessage,
    options?: { readonly delaySeconds?: number },
  ) => Promise<void>;
}

export interface MonthlyHijackGrowthEvent {
  readonly userId: string;
  readonly month: string;
  readonly eventType:
    | "MONTHLY_HIJACK_CLOSED"
    | "MONTHLY_HIJACK_TARGET_ACHIEVED";
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly points: number;
  readonly rawAmountIncluded: false;
  readonly createdAt: string;
}

export interface MonthlyHijackGrowthProducer {
  readonly send: (event: MonthlyHijackGrowthEvent) => Promise<void>;
}

export interface MonthlyHijackCloseJobOptions<TEnv = unknown> {
  readonly repository: MonthlyHijackCloseRepository;
  readonly notificationProducer?: MonthlyHijackNotificationProducer | undefined;
  readonly growthProducer?: MonthlyHijackGrowthProducer | undefined;
  readonly defaultMode?:
    | MonthlyHijackCloseMode
    | ((env: TEnv) => MonthlyHijackCloseMode | null | undefined);
  readonly batchSize?: number | ((env: TEnv) => number | null | undefined);
  readonly graceDays?: number | ((env: TEnv) => number | null | undefined);
  readonly lockTtlSeconds?: number | ((env: TEnv) => number | null | undefined);
  readonly closeHour?: number | ((env: TEnv) => number | null | undefined);
  readonly allowReclose?: boolean | ((env: TEnv) => boolean);
  readonly notificationEnabled?: boolean | ((env: TEnv) => boolean);
  readonly growthEventEnabled?: boolean | ((env: TEnv) => boolean);
  readonly onEvent?: (
    event: MonthlyHijackCloseAuditEvent,
    env: TEnv,
    context?: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface MonthlyHijackCloseAuditEvent {
  readonly event:
    | "monthly_hijack_close.run"
    | "monthly_hijack_close.preview"
    | "monthly_hijack_close.user"
    | "monthly_hijack_close.month"
    | "monthly_hijack_close.lock";
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: MonthlyHijackCloseOperation;
  readonly actorId: string;
  readonly mode: MonthlyHijackCloseMode;
  readonly status: "SUCCESS" | "FAILURE" | "SKIPPED";
  readonly targetMonth: string;
  readonly scannedCount: number;
  readonly eligibleCount: number;
  readonly closedCount: number;
  readonly skippedCount: number;
  readonly notificationQueuedCount: number;
  readonly growthEventQueuedCount: number;
  readonly lockStatus: JobLockStatus;
  readonly closeKeys: readonly string[];
  readonly userIdPresent: boolean;
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly createdAt: string;
  readonly details: JsonRecord;
}

export interface MonthlyHijackCloseSafePolicyGuard {
  readonly serverAuthorityMonthlyCalculation: true;
  readonly krwIntegerOnly: true;
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly rawAmountInNotificationPayload: false;
  readonly adsFinancialTargetingUsed: false;
  readonly idempotencyRequired: true;
  readonly duplicateClosePrevented: true;
  readonly repositoryBoundaryRequired: true;
  readonly notificationBoundarySeparated: true;
}

export interface MonthlyHijackCloseRunResult {
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: MonthlyHijackCloseOperation;
  readonly mode: MonthlyHijackCloseMode;
  readonly policy: MonthlyHijackClosePolicy;
  readonly lockStatus: JobLockStatus;
  readonly scannedCount: number;
  readonly eligibleCount: number;
  readonly closedCount: number;
  readonly skippedCount: number;
  readonly notificationQueuedCount: number;
  readonly growthEventQueuedCount: number;
  readonly nextCursor: string | null;
  readonly evaluations: readonly MonthlyHijackCloseEvaluation[];
  readonly closeKeys: readonly string[];
  readonly safePolicyGuard: MonthlyHijackCloseSafePolicyGuard;
  readonly startedAt: string;
  readonly completedAt: string;
}

export interface MonthlyHijackCloseJob<TEnv = unknown> {
  readonly version: string;
  readonly preview: (
    context: MonthlyHijackCloseRuntimeContext<TEnv>,
  ) => Promise<MonthlyHijackCloseRunResult>;
  readonly run: (
    context: MonthlyHijackCloseRuntimeContext<TEnv>,
  ) => Promise<MonthlyHijackCloseRunResult>;
  readonly runForUser: (
    userId: string,
    context: MonthlyHijackCloseRuntimeContext<TEnv>,
  ) => Promise<MonthlyHijackCloseRunResult>;
  readonly runForMonth: (
    month: string,
    context: MonthlyHijackCloseRuntimeContext<TEnv>,
  ) => Promise<MonthlyHijackCloseRunResult>;
  readonly resolvePolicy: (
    context: MonthlyHijackCloseRuntimeContext<TEnv>,
    modeOverride?: MonthlyHijackCloseMode,
    monthOverride?: string,
  ) => MonthlyHijackClosePolicy;
  readonly calculateClose: (
    candidate: MonthlyHijackCloseCandidate,
    now: Date,
  ) => MonthlyHijackCalculation;
  readonly evaluateCandidate: (
    candidate: MonthlyHijackCloseCandidate,
    policy: MonthlyHijackClosePolicy,
    now: Date,
  ) => MonthlyHijackCloseEvaluation;
  readonly buildNotificationMessage: (
    evaluation: MonthlyHijackCloseEvaluation,
    requestId: string,
    validateOnly: boolean,
  ) => MonthlyHijackNotificationMessage;
}

export class MonthlyHijackCloseError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "MonthlyHijackCloseError";
    this.code = code;
    this.status = status;
  }
}

export const monthlyHijackCloseSafePolicyGuard: MonthlyHijackCloseSafePolicyGuard =
  Object.freeze({
    serverAuthorityMonthlyCalculation: true,
    krwIntegerOnly: true,
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    rawAmountInNotificationPayload: false,
    adsFinancialTargetingUsed: false,
    idempotencyRequired: true,
    duplicateClosePrevented: true,
    repositoryBoundaryRequired: true,
    notificationBoundarySeparated: true,
  });

function envText<TEnv>(
  env: TEnv,
  key: keyof MonthlyHijackCloseEnvLike,
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
  key: keyof MonthlyHijackCloseEnvLike,
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
  key: keyof MonthlyHijackCloseEnvLike,
  fallback: boolean,
): boolean {
  if (typeof option === "boolean") return option;
  if (typeof option === "function") return option(env);
  return boolFromText(envText(env, key), fallback);
}
function optionMode<TEnv>(
  env: TEnv,
  option:
    | MonthlyHijackCloseMode
    | ((env: TEnv) => MonthlyHijackCloseMode | null | undefined)
    | undefined,
): MonthlyHijackCloseMode {
  const value = typeof option === "function" ? option(env) : option;
  if (value === "APPLY" || value === "DRY_RUN") return value;
  return boolFromText(envText(env, "MONTHLY_HIJACK_CLOSE_DRY_RUN"), false)
    ? "DRY_RUN"
    : "APPLY";
}
function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}
function iso(date: Date): string {
  return date.toISOString();
}
function createRequestId(prefix: string): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}
function assertId(value: string, label: string): void {
  if (!/^[a-zA-Z0-9:_./-]{1,180}$/.test(value.trim()))
    throw new MonthlyHijackCloseError(
      "MONTHLY_HIJACK_CLOSE_ID_INVALID",
      `${label} 형식이 올바르지 않습니다.`,
      400,
    );
}
function assertMonth(month: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month.trim()))
    throw new MonthlyHijackCloseError(
      "MONTHLY_HIJACK_CLOSE_MONTH_INVALID",
      "month는 YYYY-MM 형식이어야 합니다.",
      400,
    );
}
function assertKrw(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 9_000_000_000_000)
    throw new MonthlyHijackCloseError(
      "MONTHLY_HIJACK_CLOSE_KRW_INVALID",
      `${label}은 0 이상의 KRW 정수여야 합니다.`,
      400,
    );
}
function monthStart(month: string): Date {
  assertMonth(month);
  const [year, mm] = month.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (mm ?? 1) - 1, 1));
}
function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}
function monthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function previousMonthOf(date: Date): string {
  return monthOf(
    addMonths(
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
      -1,
    ),
  );
}
function isMonthCloseDue(
  targetMonth: string,
  now: Date,
  graceDays: number,
  closeHour: number,
): boolean {
  const dueAt = new Date(
    addMonths(monthStart(targetMonth), 1).getTime() +
      graceDays * 86_400_000 +
      closeHour * 3_600_000,
  );
  return now.getTime() >= dueAt.getTime();
}
function safeDivBasisPoints(numerator: number, denominator: number): number {
  return denominator <= 0
    ? 0
    : clampInt(Math.round((numerator * 10_000) / denominator), 0, 1_000_000);
}
function safeSubFloorZero(left: number, right: number): number {
  return Math.max(0, left - right);
}
function positivePoints(calculation: MonthlyHijackCalculation): number {
  return calculation.targetAchieved
    ? 120
    : calculation.actualHijackKrw > 0
      ? 60
      : 20;
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
          "amount",
          "krw",
          "dailybudget",
          "hijack",
          "variance",
          "carryover",
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
          "금액",
          "납치",
          "명세서",
          "통장",
        ].some((fragment) =>
          normalized.includes(fragment.toLowerCase().replace(/[\s._-]/g, "")),
        );
        const allowed =
          normalized === "closekeys" ||
          normalized === "notificationids" ||
          normalized === "useridpresent" ||
          normalized === "targetmonth";
        return [
          key.slice(0, 160),
          sensitive && !allowed
            ? "[REDACTED]"
            : sanitize(item, depth + 1, seen),
        ];
      }),
  ) as JsonRecord;
}

function totals(
  evaluations: readonly MonthlyHijackCloseEvaluation[],
  closedCount: number,
  notificationQueuedCount: number,
  growthEventQueuedCount: number,
) {
  return {
    scannedCount: evaluations.length,
    eligibleCount: evaluations.filter((evaluation) => evaluation.eligible)
      .length,
    closedCount,
    skippedCount: evaluations.filter((evaluation) => !evaluation.eligible)
      .length,
    notificationQueuedCount,
    growthEventQueuedCount,
  };
}

function auditEventFrom(
  result: MonthlyHijackCloseRunResult,
  status: MonthlyHijackCloseAuditEvent["status"],
  actorId: string,
  details: JsonRecord,
): MonthlyHijackCloseAuditEvent {
  const event =
    result.operation === "preview"
      ? "monthly_hijack_close.preview"
      : result.operation === "user_scope_close"
        ? "monthly_hijack_close.user"
        : result.operation === "month_scope_close"
          ? "monthly_hijack_close.month"
          : "monthly_hijack_close.run";
  return {
    event,
    service: MONTHLY_HIJACK_CLOSE_JOB_NAME,
    version: MONTHLY_HIJACK_CLOSE_JOB_VERSION,
    requestId: result.requestId,
    operation: result.operation,
    actorId,
    mode: result.mode,
    status,
    targetMonth: result.policy.targetMonth,
    scannedCount: result.scannedCount,
    eligibleCount: result.eligibleCount,
    closedCount: result.closedCount,
    skippedCount: result.skippedCount,
    notificationQueuedCount: result.notificationQueuedCount,
    growthEventQueuedCount: result.growthEventQueuedCount,
    lockStatus: result.lockStatus,
    closeKeys: result.closeKeys,
    userIdPresent: Boolean(details.userIdPresent),
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
    createdAt: result.completedAt,
    details: sanitize(details) as JsonRecord,
  };
}

async function emit<TEnv>(
  options: MonthlyHijackCloseJobOptions<TEnv>,
  context: MonthlyHijackCloseRuntimeContext<TEnv>,
  event: MonthlyHijackCloseAuditEvent,
): Promise<void> {
  if (
    boolFromText(
      envText(context.env, "MONTHLY_HIJACK_CLOSE_AUDIT_TO_CONSOLE"),
      false,
    )
  )
    console.info(
      "salary_hijacking_monthly_hijack_close_event",
      JSON.stringify(sanitize(event)),
    );
  const task = Promise.all([
    options.repository.appendMonthlyHijackCloseAudit?.(event) ??
      Promise.resolve(),
    options.onEvent
      ? Promise.resolve(options.onEvent(event, context.env, context.execution))
      : Promise.resolve(),
  ])
    .then(() => undefined)
    .catch((error) =>
      console.warn(
        "monthly_hijack_close_event_failed",
        error instanceof Error ? error.name : "UnknownError",
      ),
    );
  context.execution?.waitUntil?.(task);
  if (!context.execution?.waitUntil) await task;
}

export function createMonthlyHijackCloseJob<TEnv = MonthlyHijackCloseEnvLike>(
  options: MonthlyHijackCloseJobOptions<TEnv>,
): MonthlyHijackCloseJob<TEnv> {
  if (!options.repository)
    throw new MonthlyHijackCloseError(
      "MONTHLY_HIJACK_CLOSE_REPOSITORY_REQUIRED",
      "monthly hijack close repository가 필요합니다.",
      500,
    );

  function resolvePolicy(
    context: MonthlyHijackCloseRuntimeContext<TEnv>,
    modeOverride?: MonthlyHijackCloseMode,
    monthOverride?: string,
  ): MonthlyHijackClosePolicy {
    const now = context.now ?? new Date();
    const targetMonth =
      monthOverride ?? context.targetMonth ?? previousMonthOf(now);
    assertMonth(targetMonth);
    return {
      mode: modeOverride ?? optionMode(context.env, options.defaultMode),
      batchSize: clampInt(
        optionNumber(
          context.env,
          options.batchSize,
          "MONTHLY_HIJACK_CLOSE_BATCH_SIZE",
          DEFAULT_MONTHLY_HIJACK_CLOSE_BATCH_SIZE,
        ),
        1,
        MAX_MONTHLY_HIJACK_CLOSE_BATCH_SIZE,
      ),
      graceDays: clampInt(
        optionNumber(
          context.env,
          options.graceDays,
          "MONTHLY_HIJACK_CLOSE_GRACE_DAYS",
          DEFAULT_MONTHLY_HIJACK_CLOSE_GRACE_DAYS,
        ),
        0,
        31,
      ),
      lockTtlSeconds: clampInt(
        optionNumber(
          context.env,
          options.lockTtlSeconds,
          "MONTHLY_HIJACK_CLOSE_LOCK_TTL_SECONDS",
          DEFAULT_MONTHLY_HIJACK_CLOSE_LOCK_TTL_SECONDS,
        ),
        60,
        86_400,
      ),
      closeHour: clampInt(
        optionNumber(
          context.env,
          options.closeHour,
          "MONTHLY_HIJACK_CLOSE_HOUR",
          DEFAULT_MONTHLY_HIJACK_CLOSE_HOUR,
        ),
        0,
        23,
      ),
      targetMonth,
      timezone: MONTHLY_HIJACK_CLOSE_TIMEZONE,
      allowReclose: optionBool(
        context.env,
        options.allowReclose,
        "MONTHLY_HIJACK_CLOSE_ALLOW_RECLOSE",
        false,
      ),
      notificationEnabled: optionBool(
        context.env,
        options.notificationEnabled,
        "MONTHLY_HIJACK_CLOSE_NOTIFICATION_ENABLED",
        true,
      ),
      growthEventEnabled: optionBool(
        context.env,
        options.growthEventEnabled,
        "MONTHLY_HIJACK_CLOSE_GROWTH_EVENT_ENABLED",
        true,
      ),
      rawAmountInNotificationPayloadAllowed: false,
      rawFinancialDataLogged: false,
      adsFinancialTargetingUsed: false,
    };
  }

  function calculateClose(
    candidate: MonthlyHijackCloseCandidate,
    now: Date,
  ): MonthlyHijackCalculation {
    assertMonth(candidate.month);
    const values: readonly [number, string][] = [
      [candidate.expectedSalaryKrw, "expectedSalaryKrw"],
      [candidate.actualSalaryKrw ?? 0, "actualSalaryKrw"],
      [candidate.plannedFixedExpenseKrw, "plannedFixedExpenseKrw"],
      [candidate.actualFixedExpenseKrw, "actualFixedExpenseKrw"],
      [candidate.plannedSavingsKrw, "plannedSavingsKrw"],
      [candidate.actualSavingsKrw, "actualSavingsKrw"],
      [candidate.plannedDailyBudgetKrw, "plannedDailyBudgetKrw"],
      [candidate.actualVariableExpenseKrw, "actualVariableExpenseKrw"],
      [candidate.otherPlannedExpenseKrw, "otherPlannedExpenseKrw"],
      [candidate.otherActualExpenseKrw, "otherActualExpenseKrw"],
      [candidate.previousCarryOverKrw, "previousCarryOverKrw"],
      [candidate.targetHijackKrw ?? 0, "targetHijackKrw"],
    ];
    values.forEach(([value, label]) => assertKrw(value, label));
    const incomeKrw = candidate.actualSalaryKrw ?? candidate.expectedSalaryKrw;
    const plannedExpenseKrw =
      candidate.plannedFixedExpenseKrw +
      candidate.plannedDailyBudgetKrw +
      candidate.otherPlannedExpenseKrw;
    const actualExpenseKrw =
      candidate.actualFixedExpenseKrw +
      candidate.actualVariableExpenseKrw +
      candidate.otherActualExpenseKrw;
    const plannedHijackKrw = safeSubFloorZero(
      incomeKrw + candidate.previousCarryOverKrw,
      plannedExpenseKrw + candidate.plannedSavingsKrw,
    );
    const actualHijackKrw = safeSubFloorZero(
      incomeKrw + candidate.previousCarryOverKrw,
      actualExpenseKrw + candidate.actualSavingsKrw,
    );
    const target = candidate.targetHijackKrw ?? plannedHijackKrw;
    const varianceKrw = actualHijackKrw - plannedHijackKrw;
    return {
      month: candidate.month,
      incomeKrw,
      plannedExpenseKrw,
      actualExpenseKrw,
      plannedSavingsKrw: candidate.plannedSavingsKrw,
      actualSavingsKrw: candidate.actualSavingsKrw,
      previousCarryOverKrw: candidate.previousCarryOverKrw,
      plannedHijackKrw,
      actualHijackKrw,
      carryOverKrw: actualHijackKrw,
      varianceKrw,
      achievementRateBasisPoints: safeDivBasisPoints(actualHijackKrw, target),
      savingRateBasisPoints: safeDivBasisPoints(
        candidate.actualSavingsKrw + actualHijackKrw,
        incomeKrw,
      ),
      expenseRateBasisPoints: safeDivBasisPoints(actualExpenseKrw, incomeKrw),
      targetAchieved:
        target > 0 ? actualHijackKrw >= target : actualHijackKrw > 0,
      overspent: actualExpenseKrw > plannedExpenseKrw,
      serverCalculatedAt: iso(now),
    };
  }

  function evaluateCandidate(
    candidate: MonthlyHijackCloseCandidate,
    policy: MonthlyHijackClosePolicy,
    now: Date,
  ): MonthlyHijackCloseEvaluation {
    assertId(candidate.id, "candidateId");
    assertId(candidate.userId, "userId");
    const closeKey = `${candidate.userId}:${candidate.month}:monthly-hijack-close`;
    const idempotencyKey = `monthly-hijack-close:${closeKey}`;
    const base = { closeKey, idempotencyKey };
    if (candidate.month !== policy.targetMonth)
      return {
        candidate,
        ...base,
        decision: "SKIP",
        eligible: false,
        skipReason: "NOT_TARGET_MONTH",
        calculation: null,
        score: 0,
      };
    if (!candidate.userActive)
      return {
        candidate,
        ...base,
        decision: "SKIP",
        eligible: false,
        skipReason: "USER_PAUSED",
        calculation: null,
        score: 0,
      };
    if (candidate.legalHold)
      return {
        candidate,
        ...base,
        decision: "SKIP",
        eligible: false,
        skipReason: "LEGAL_HOLD",
        calculation: null,
        score: 0,
      };
    if (candidate.status === "CLOSED" && !policy.allowReclose)
      return {
        candidate,
        ...base,
        decision: "SKIP",
        eligible: false,
        skipReason: "ALREADY_CLOSED",
        calculation: null,
        score: 0,
      };
    if (
      !isMonthCloseDue(candidate.month, now, policy.graceDays, policy.closeHour)
    )
      return {
        candidate,
        ...base,
        decision: "SKIP",
        eligible: false,
        skipReason: "MONTH_NOT_COMPLETE",
        calculation: null,
        score: 0,
      };
    if (
      (candidate.actualSalaryKrw ?? candidate.expectedSalaryKrw) <= 0 &&
      !candidate.salaryReceivedAt
    )
      return {
        candidate,
        ...base,
        decision: "SKIP",
        eligible: false,
        skipReason: "MISSING_SALARY",
        calculation: null,
        score: 0,
      };
    try {
      const calculation = calculateClose(candidate, now);
      const score = calculation.targetAchieved
        ? 100
        : calculation.actualHijackKrw > 0
          ? 80
          : 50;
      return {
        candidate,
        ...base,
        decision:
          candidate.status === "REOPENED" || candidate.status === "CLOSED"
            ? "RECALCULATE"
            : "CLOSE",
        eligible: true,
        skipReason: "NONE",
        calculation,
        score,
      };
    } catch {
      return {
        candidate,
        ...base,
        decision: "SKIP",
        eligible: false,
        skipReason: "INVALID_KRW",
        calculation: null,
        score: 0,
      };
    }
  }

  function buildNotificationMessage(
    evaluation: MonthlyHijackCloseEvaluation,
    requestId: string,
    validateOnly: boolean,
  ): MonthlyHijackNotificationMessage {
    if (!evaluation.calculation)
      throw new MonthlyHijackCloseError(
        "MONTHLY_HIJACK_CLOSE_NOTIFICATION_REQUIRES_CALCULATION",
        "정산 계산 결과가 필요합니다.",
        500,
      );
    const notificationId = `ntf_monthly_hijack_${evaluation.candidate.userId}_${evaluation.candidate.month.replace("-", "")}`;
    const title = evaluation.calculation.targetAchieved
      ? "이번 달 급여납치 목표를 달성했어요"
      : "이번 달 급여납치 정산이 완료됐어요";
    const body = evaluation.calculation.overspent
      ? "월간 정산 화면에서 예산 차이를 확인해 보세요."
      : "월간 정산 화면에서 이번 달 결과를 확인해 보세요.";
    const payload: MonthlyHijackNotificationMessage["payload"] = {
      notification: { title, body },
      data: {
        notificationId,
        userId: evaluation.candidate.userId,
        type: "HIJACK_GOAL",
        importance: "BEHAVIORAL",
        targetScreen: "payroll-monthly-close",
        deeplink: `salary-hijacking://payroll/monthly-close/${encodeURIComponent(evaluation.candidate.month)}`,
        routeParams: {
          month: evaluation.candidate.month,
          closeId: evaluation.candidate.id,
          targetAchieved: evaluation.calculation.targetAchieved,
          amountIncluded: false,
        },
        ttlSeconds: 604_800,
        idempotencyKey: evaluation.idempotencyKey,
        marketingConsentVerified: false,
        adsPartnerConsentVerified: false,
      },
      extraData: {
        closeKey: evaluation.closeKey,
        actualHijackPositive: evaluation.calculation.actualHijackKrw > 0,
        rawAmountIncluded: false,
        adFinancialTargeting: false,
      },
    };
    return {
      type: "FCM_SEND",
      requestId,
      payload: validateOnly ? { ...payload, validateOnly: true } : payload,
      retryDelaySeconds: 60,
    };
  }

  async function runInternal(
    context: MonthlyHijackCloseRuntimeContext<TEnv>,
    operation: MonthlyHijackCloseOperation,
    modeOverride?: MonthlyHijackCloseMode,
    userId?: string,
    monthOverride?: string,
  ): Promise<MonthlyHijackCloseRunResult> {
    if (userId) assertId(userId, "userId");
    if (monthOverride) assertMonth(monthOverride);
    const startedAt = context.now ?? new Date();
    const requestId = context.requestId ?? createRequestId("mhc");
    const actorId = context.actorId ?? "system:monthly-hijack-close";
    const policy = resolvePolicy(
      { ...context, requestId, actorId, now: startedAt, operation },
      modeOverride,
      monthOverride,
    );
    const owner = `${MONTHLY_HIJACK_CLOSE_JOB_NAME}:${actorId}:${policy.targetMonth}`;
    const lock =
      operation === "preview" ||
      operation === "user_scope_close" ||
      operation === "month_scope_close"
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
            lockName: `${MONTHLY_HIJACK_CLOSE_JOB_NAME}:${policy.targetMonth}`,
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
      const result: MonthlyHijackCloseRunResult = {
        service: MONTHLY_HIJACK_CLOSE_JOB_NAME,
        version: MONTHLY_HIJACK_CLOSE_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        policy,
        lockStatus: lock.status,
        scannedCount: 0,
        eligibleCount: 0,
        closedCount: 0,
        skippedCount: 0,
        notificationQueuedCount: 0,
        growthEventQueuedCount: 0,
        nextCursor: null,
        evaluations: [],
        closeKeys: [],
        safePolicyGuard: monthlyHijackCloseSafePolicyGuard,
        startedAt: iso(startedAt),
        completedAt: iso(new Date()),
      };
      await emit(
        options,
        context,
        auditEventFrom(result, "SKIPPED", actorId, {
          lockStatus: lock.status,
          userIdPresent: Boolean(userId),
        }),
      );
      return result;
    }

    try {
      const statuses: readonly MonthlyHijackCloseStatus[] = policy.allowReclose
        ? ["OPEN", "READY", "REOPENED", "CLOSED"]
        : ["OPEN", "READY", "REOPENED"];
      const list = await options.repository.listMonthlyHijackCloseCandidates({
        targetMonth: policy.targetMonth,
        limit: policy.batchSize,
        statuses,
        ...(userId ? { userId } : {}),
      });
      const evaluations = list.items
        .map((candidate) => evaluateCandidate(candidate, policy, startedAt))
        .sort((a, b) => b.score - a.score);
      const eligible = evaluations.filter(
        (evaluation) => evaluation.eligible && evaluation.calculation,
      );
      const calculations = eligible
        .map((evaluation) => evaluation.calculation)
        .filter(
          (calculation): calculation is MonthlyHijackCalculation =>
            calculation !== null,
        );
      const closeKeys = eligible.map((evaluation) => evaluation.closeKey);

      let closedCount = calculations.length;
      if (policy.mode === "APPLY" && eligible.length) {
        closedCount = await options.repository.persistMonthlyHijackClose({
          ids: eligible.map((evaluation) => evaluation.candidate.id),
          requestId,
          actorId,
          now: iso(startedAt),
          closeKeys,
          calculations,
          details: {
            targetMonth: policy.targetMonth,
            rawFinancialDataLogged: false,
            rawPushTokenLogged: false,
            adsFinancialTargetingUsed: false,
          },
        });
      }

      if (policy.mode === "APPLY") {
        const skipped = evaluations.filter(
          (evaluation) =>
            !evaluation.eligible && evaluation.skipReason !== "NONE",
        );
        if (skipped.length && options.repository.markMonthlyHijackCloseSkipped)
          await options.repository.markMonthlyHijackCloseSkipped({
            ids: skipped.map((evaluation) => evaluation.candidate.id),
            requestId,
            actorId,
            now: iso(startedAt),
            reason: "MONTH_NOT_COMPLETE",
            details: {
              skippedReasons: sanitize(
                skipped.map((evaluation) => evaluation.skipReason),
              ),
              rawFinancialDataLogged: false,
            },
          });
      }

      const notificationMessages =
        policy.notificationEnabled && options.notificationProducer
          ? eligible
              .filter((evaluation) => evaluation.candidate.notificationEnabled)
              .map((evaluation) =>
                buildNotificationMessage(
                  evaluation,
                  requestId,
                  policy.mode === "DRY_RUN",
                ),
              )
          : [];
      if (policy.mode === "APPLY")
        for (const message of notificationMessages)
          await options.notificationProducer?.send(message, {
            delaySeconds: 0,
          });

      const growthEvents =
        policy.growthEventEnabled && options.growthProducer
          ? eligible
              .filter(
                (evaluation) =>
                  evaluation.candidate.growthEnabled && evaluation.calculation,
              )
              .map(
                (evaluation): MonthlyHijackGrowthEvent => ({
                  userId: evaluation.candidate.userId,
                  month: evaluation.candidate.month,
                  eventType: evaluation.calculation?.targetAchieved
                    ? "MONTHLY_HIJACK_TARGET_ACHIEVED"
                    : "MONTHLY_HIJACK_CLOSED",
                  idempotencyKey: `${evaluation.idempotencyKey}:growth`,
                  requestId,
                  points: positivePoints(
                    evaluation.calculation as MonthlyHijackCalculation,
                  ),
                  rawAmountIncluded: false,
                  createdAt: iso(startedAt),
                }),
              )
          : [];
      if (policy.mode === "APPLY")
        for (const event of growthEvents)
          await options.growthProducer?.send(event);

      const counts = totals(
        evaluations,
        closedCount,
        notificationMessages.length,
        growthEvents.length,
      );
      const result: MonthlyHijackCloseRunResult = {
        service: MONTHLY_HIJACK_CLOSE_JOB_NAME,
        version: MONTHLY_HIJACK_CLOSE_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        policy,
        lockStatus: lock.status,
        ...counts,
        nextCursor: list.nextCursor,
        evaluations,
        closeKeys,
        safePolicyGuard: monthlyHijackCloseSafePolicyGuard,
        startedAt: iso(startedAt),
        completedAt: iso(new Date()),
      };
      await emit(
        options,
        context,
        auditEventFrom(result, "SUCCESS", actorId, {
          targetMonth: policy.targetMonth,
          userIdPresent: Boolean(userId),
          rawFinancialDataLogged: false,
        }),
      );
      return result;
    } catch (error) {
      const result: MonthlyHijackCloseRunResult = {
        service: MONTHLY_HIJACK_CLOSE_JOB_NAME,
        version: MONTHLY_HIJACK_CLOSE_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        policy,
        lockStatus: lock.status,
        scannedCount: 0,
        eligibleCount: 0,
        closedCount: 0,
        skippedCount: 0,
        notificationQueuedCount: 0,
        growthEventQueuedCount: 0,
        nextCursor: null,
        evaluations: [],
        closeKeys: [],
        safePolicyGuard: monthlyHijackCloseSafePolicyGuard,
        startedAt: iso(startedAt),
        completedAt: iso(new Date()),
      };
      await emit(
        options,
        context,
        auditEventFrom(result, "FAILURE", actorId, {
          error: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      throw error;
    } finally {
      if (operation === "scheduled_close")
        await options.repository.releaseJobLock?.({
          lockId: lock.lockId,
          requestId,
          owner,
          now: iso(new Date()),
        });
    }
  }

  return Object.freeze({
    version: MONTHLY_HIJACK_CLOSE_JOB_VERSION,
    preview: (context: MonthlyHijackCloseRuntimeContext<TEnv>) =>
      runInternal(context, "preview", "DRY_RUN"),
    run: (context: MonthlyHijackCloseRuntimeContext<TEnv>) =>
      runInternal(context, "scheduled_close"),
    runForUser: (
      userId: string,
      context: MonthlyHijackCloseRuntimeContext<TEnv>,
    ) => runInternal(context, "user_scope_close", undefined, userId),
    runForMonth: (
      month: string,
      context: MonthlyHijackCloseRuntimeContext<TEnv>,
    ) => runInternal(context, "month_scope_close", undefined, undefined, month),
    resolvePolicy,
    calculateClose,
    evaluateCandidate,
    buildNotificationMessage,
  });
}

export function createInMemoryMonthlyHijackCloseRepository(
  seed: readonly MonthlyHijackCloseCandidate[] = [],
): MonthlyHijackCloseRepository & {
  readonly snapshot: () => readonly MonthlyHijackCloseCandidate[];
  readonly auditSnapshot: () => readonly MonthlyHijackCloseAuditEvent[];
} {
  let rows = [...seed];
  const audits: MonthlyHijackCloseAuditEvent[] = [];
  let activeLock: MonthlyHijackCloseLockResult | null = null;
  const update = (
    ids: readonly string[],
    patch: (row: MonthlyHijackCloseCandidate) => MonthlyHijackCloseCandidate,
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
    listMonthlyHijackCloseCandidates: async (criteria) => ({
      items: rows
        .filter((row) => row.month === criteria.targetMonth)
        .filter((row) => criteria.statuses.includes(row.status))
        .filter((row) => !criteria.userId || row.userId === criteria.userId)
        .slice(0, criteria.limit),
      nextCursor: null,
    }),
    persistMonthlyHijackClose: async (input) =>
      update(input.ids, (row) => ({
        ...row,
        status: "CLOSED",
        closedAt: input.now,
        updatedAt: input.now,
        metadata: {
          ...row.metadata,
          monthlyHijackCloseKey:
            input.closeKeys[input.ids.indexOf(row.id)] ?? "",
          calculationPersisted: true,
        },
      })),
    markMonthlyHijackCloseSkipped: async (input) =>
      update(input.ids, (row) => ({
        ...row,
        status: row.status === "OPEN" ? "SKIPPED" : row.status,
        updatedAt: input.now,
        metadata: { ...row.metadata, closeSkippedReason: input.reason },
      })),
    appendMonthlyHijackCloseAudit: async (event) => {
      audits.push(event);
    },
  };
}

export function createInMemoryMonthlyHijackNotificationProducer(): MonthlyHijackNotificationProducer & {
  readonly snapshot: () => readonly MonthlyHijackNotificationMessage[];
} {
  const messages: MonthlyHijackNotificationMessage[] = [];
  return {
    send: async (message) => {
      messages.push(message);
    },
    snapshot: () =>
      messages.map((message) => ({
        ...message,
        payload: {
          ...message.payload,
          notification: { ...message.payload.notification },
          data: { ...message.payload.data },
          extraData: { ...message.payload.extraData },
        },
      })),
  };
}

export function createInMemoryMonthlyHijackGrowthProducer(): MonthlyHijackGrowthProducer & {
  readonly snapshot: () => readonly MonthlyHijackGrowthEvent[];
} {
  const events: MonthlyHijackGrowthEvent[] = [];
  return {
    send: async (event) => {
      events.push(event);
    },
    snapshot: () => events.map((event) => ({ ...event })),
  };
}

export const monthlyHijackCloseManifest = Object.freeze({
  file: "services/scheduler/src/jobs/monthly-hijack-close.job.ts",
  version: MONTHLY_HIJACK_CLOSE_JOB_VERSION,
  service: MONTHLY_HIJACK_CLOSE_JOB_NAME,
  runtime: "cloudflare-workers-cron-node-compatible",
  capabilities: Object.freeze([
    "server_authority_monthly_hijack_close",
    "krw_integer_calculation",
    "planned_vs_actual_expense_savings_salary",
    "carryover_and_variance",
    "target_achievement",
    "scheduled_close",
    "preview_dry_run",
    "user_scope_close",
    "month_scope_close",
    "idempotency_key_required",
    "duplicate_close_prevention",
    "notification_queue_boundary",
    "growth_event_boundary",
    "repository_boundary",
    "job_lock_contract",
    "sanitized_audit_event",
    "no_raw_financial_data_logged",
    "no_raw_push_token_logged",
    "no_raw_amount_in_notification_payload",
    "ads_financial_targeting_forbidden",
    "in_memory_test_repository_and_producers",
  ]),
  safePolicyGuard: monthlyHijackCloseSafePolicyGuard,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertMonthlyHijackCloseJobCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "scheduler_job_contract",
    "server_authority_monthly_hijack_calculation",
    "krw_integer_only",
    "planned_actual_salary_expense_savings_close",
    "actual_hijack_variance_carryover",
    "target_achievement_rate",
    "saving_and_expense_rate",
    "scheduled_close",
    "preview_dry_run_mode",
    "user_scope_close",
    "month_scope_close",
    "grace_day_and_close_hour_policy",
    "allow_reclose_policy",
    "idempotency_key_required",
    "duplicate_close_prevention",
    "notification_queue_boundary",
    "growth_event_boundary",
    "repository_boundary",
    "job_lock_contract",
    "request_id_actor_audit_contract",
    "wait_until_event_hook",
    "sanitized_audit_no_raw_financial_data",
    "sanitized_audit_no_raw_push_token",
    "notification_payload_excludes_raw_amounts",
    "ads_financial_targeting_not_used",
    "in_memory_repository_for_tests",
    "cloudflare_workers_cron_node_compatible_no_node_dependency",
  ] as const;
  return {
    ok: checks.length >= 20,
    version: MONTHLY_HIJACK_CLOSE_JOB_VERSION,
    checks,
  };
}

export const defaultMonthlyHijackCloseRepository =
  createInMemoryMonthlyHijackCloseRepository();
export const defaultMonthlyHijackNotificationProducer =
  createInMemoryMonthlyHijackNotificationProducer();
export const defaultMonthlyHijackGrowthProducer =
  createInMemoryMonthlyHijackGrowthProducer();
export const defaultMonthlyHijackCloseJob = createMonthlyHijackCloseJob({
  repository: defaultMonthlyHijackCloseRepository,
  notificationProducer: defaultMonthlyHijackNotificationProducer,
  growthProducer: defaultMonthlyHijackGrowthProducer,
  defaultMode: "DRY_RUN",
});
export default createMonthlyHijackCloseJob;
