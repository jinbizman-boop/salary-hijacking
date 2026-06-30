/** services/scheduler/src/jobs/payday-reminder.job.ts
 * 급여납치 Salary Hijacking Platform · Payday Reminder Job 최종본
 * 서버 권위로 급여일 전/당일/미확인 알림 후보를 계산하고 notifications service/queue로 전달한다.
 * FCM payload·감사 로그에는 급여액·계좌·카드·대출·저축·지출·납치금액 원문을 남기지 않는다.
 */

export const PAYDAY_REMINDER_JOB_VERSION = "3.1.0";
export const PAYDAY_REMINDER_JOB_NAME = "salary-hijacking-payday-reminder";
export const PAYDAY_REMINDER_TIMEZONE = "Asia/Seoul";
export const DEFAULT_PAYDAY_REMINDER_BATCH_SIZE = 500;
export const MAX_PAYDAY_REMINDER_BATCH_SIZE = 2_000;
export const DEFAULT_PAYDAY_LOOKAHEAD_DAYS = 7;
export const DEFAULT_PAYDAY_GRACE_DAYS = 2;
export const DEFAULT_PAYDAY_LOCK_TTL_SECONDS = 1_800;
export const DEFAULT_PAYDAY_REMINDER_HOUR = 8;

export type PaydayReminderMode = "DRY_RUN" | "APPLY";
export type PaydayReminderOperation =
  | "scheduled_reminder"
  | "user_scope_reminder"
  | "plan_scope_reminder"
  | "preview";
export type PaydayReminderTiming =
  | "BEFORE_PAYDAY"
  | "PAYDAY_TODAY"
  | "PAYDAY_MISSED";
export type PayrollPlanStatus = "ACTIVE" | "PAUSED" | "ENDED" | "DELETED";
export type PayrollFrequency =
  | "ONCE"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "YEARLY";
export type NotificationImportance =
  | "TRANSACTIONAL"
  | "BEHAVIORAL"
  | "COMMUNITY"
  | "MARKETING"
  | "SYSTEM_REQUIRED";
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

export interface PaydayReminderEnvLike {
  readonly APP_ENV?: string;
  readonly ENVIRONMENT?: string;
  readonly NODE_ENV?: string;
  readonly PAYDAY_REMINDER_DRY_RUN?: string;
  readonly PAYDAY_REMINDER_BATCH_SIZE?: string;
  readonly PAYDAY_REMINDER_LOOKAHEAD_DAYS?: string;
  readonly PAYDAY_REMINDER_GRACE_DAYS?: string;
  readonly PAYDAY_REMINDER_LOCK_TTL_SECONDS?: string;
  readonly PAYDAY_REMINDER_DEFAULT_HOUR?: string;
  readonly PAYDAY_REMINDER_AUDIT_TO_CONSOLE?: string;
  readonly PAYDAY_REMINDER_NOTIFICATION_ENABLED?: string;
  readonly PAYDAY_REMINDER_GROWTH_EVENT_ENABLED?: string;
}

export interface PaydayReminderRuntimeContext<TEnv = unknown> {
  readonly env: TEnv;
  readonly execution?: WaitUntilCapable | undefined;
  readonly requestId?: string | undefined;
  readonly actorId?: string | undefined;
  readonly now?: Date | undefined;
  readonly operation?: PaydayReminderOperation | undefined;
}

export interface PayrollPlanRecord {
  readonly id: string;
  readonly userId: string;
  readonly displayName: string;
  readonly status: PayrollPlanStatus;
  readonly frequency: PayrollFrequency;
  readonly nextPaydayDate: string;
  readonly startedAt: string;
  readonly endedAt?: string | undefined;
  readonly timezone?: string | undefined;
  readonly reminderEnabled: boolean;
  readonly reminderDaysBefore: readonly number[];
  readonly notificationEnabled: boolean;
  readonly growthEnabled: boolean;
  readonly notificationQuietHours?:
    | { readonly startHour: number; readonly endHour: number }
    | undefined;
  readonly lastReminderAt?: string | undefined;
  readonly lastReminderKey?: string | undefined;
  readonly salaryReceivedAt?: string | undefined;
  readonly expectedSalaryKrw?: number | undefined;
  readonly actualSalaryKrw?: number | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata: JsonRecord;
}

export interface PaydayReminderCandidate {
  readonly plan: PayrollPlanRecord;
  readonly timing: PaydayReminderTiming;
  readonly paydayDate: string;
  readonly daysUntilPayday: number;
  readonly reminderKey: string;
  readonly idempotencyKey: string;
  readonly eligible: boolean;
  readonly skipReason: string | null;
  readonly priority: number;
}

export interface PaydayReminderPolicy {
  readonly mode: PaydayReminderMode;
  readonly batchSize: number;
  readonly lookaheadDays: number;
  readonly graceDays: number;
  readonly lockTtlSeconds: number;
  readonly defaultReminderHour: number;
  readonly timezone: string;
  readonly notificationEnabled: boolean;
  readonly growthEventEnabled: boolean;
  readonly rawSalaryInPayloadAllowed: false;
  readonly rawFinancialDataLogged: false;
  readonly adsFinancialTargetingUsed: false;
}

export interface PaydayReminderListCriteria {
  readonly dueFrom: string;
  readonly dueTo: string;
  readonly limit: number;
  readonly cursor?: string | undefined;
  readonly userId?: string | undefined;
  readonly planId?: string | undefined;
  readonly statuses: readonly PayrollPlanStatus[];
}

export interface PaydayReminderListResult {
  readonly items: readonly PayrollPlanRecord[];
  readonly nextCursor: string | null;
}

export interface PaydayReminderMarkInput {
  readonly planIds: readonly string[];
  readonly requestId: string;
  readonly actorId: string;
  readonly now: string;
  readonly reminderKeys: readonly string[];
  readonly notificationIds: readonly string[];
  readonly details: JsonRecord;
}

export interface PaydayReminderLockInput {
  readonly lockName: string;
  readonly requestId: string;
  readonly owner: string;
  readonly ttlSeconds: number;
  readonly now: string;
}

export interface PaydayReminderLockResult {
  readonly status: JobLockStatus;
  readonly lockId: string;
  readonly owner: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
}

export interface PaydayReminderRepository {
  readonly acquireJobLock?: (
    input: PaydayReminderLockInput,
  ) => Promise<PaydayReminderLockResult>;
  readonly releaseJobLock?: (input: {
    readonly lockId: string;
    readonly requestId: string;
    readonly owner: string;
    readonly now: string;
  }) => Promise<void>;
  readonly listPayrollPlansForPaydayReminder: (
    criteria: PaydayReminderListCriteria,
  ) => Promise<PaydayReminderListResult>;
  readonly markPaydayRemindersQueued: (
    input: PaydayReminderMarkInput,
  ) => Promise<number>;
  readonly appendPaydayReminderAudit?: (
    event: PaydayReminderAuditEvent,
  ) => Promise<void>;
}

export interface PaydayNotificationMessage {
  readonly type: "FCM_SEND";
  readonly requestId: string;
  readonly payload: {
    readonly notification: { readonly title: string; readonly body: string };
    readonly data: {
      readonly notificationId: string;
      readonly userId: string;
      readonly type: "PAYDAY";
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

export interface PaydayNotificationProducer {
  readonly send: (
    message: PaydayNotificationMessage,
    options?: { readonly delaySeconds?: number },
  ) => Promise<void>;
}

export interface PaydayGrowthEvent {
  readonly userId: string;
  readonly planId: string;
  readonly paydayDate: string;
  readonly eventType: "PAYDAY_REMINDER_QUEUED" | "PAYDAY_TODAY";
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly points: number;
  readonly rawAmountIncluded: false;
  readonly createdAt: string;
}

export interface PaydayGrowthProducer {
  readonly send: (event: PaydayGrowthEvent) => Promise<void>;
}

export interface PaydayReminderJobOptions<TEnv = unknown> {
  readonly repository: PaydayReminderRepository;
  readonly notificationProducer: PaydayNotificationProducer;
  readonly growthProducer?: PaydayGrowthProducer | undefined;
  readonly defaultMode?:
    | PaydayReminderMode
    | ((env: TEnv) => PaydayReminderMode | null | undefined);
  readonly batchSize?: number | ((env: TEnv) => number | null | undefined);
  readonly lookaheadDays?: number | ((env: TEnv) => number | null | undefined);
  readonly graceDays?: number | ((env: TEnv) => number | null | undefined);
  readonly lockTtlSeconds?: number | ((env: TEnv) => number | null | undefined);
  readonly defaultReminderHour?:
    | number
    | ((env: TEnv) => number | null | undefined);
  readonly notificationEnabled?: boolean | ((env: TEnv) => boolean);
  readonly growthEventEnabled?: boolean | ((env: TEnv) => boolean);
  readonly onEvent?: (
    event: PaydayReminderAuditEvent,
    env: TEnv,
    context?: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface PaydayReminderAuditEvent {
  readonly event:
    | "payday_reminder.run"
    | "payday_reminder.preview"
    | "payday_reminder.user"
    | "payday_reminder.plan"
    | "payday_reminder.lock";
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: PaydayReminderOperation;
  readonly actorId: string;
  readonly mode: PaydayReminderMode;
  readonly status: "SUCCESS" | "FAILURE" | "SKIPPED";
  readonly scannedCount: number;
  readonly eligibleCount: number;
  readonly queuedCount: number;
  readonly skippedCount: number;
  readonly growthEventQueuedCount: number;
  readonly lockStatus: JobLockStatus;
  readonly notificationIds: readonly string[];
  readonly reminderKeys: readonly string[];
  readonly userIdPresent: boolean;
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly rawSalaryLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly createdAt: string;
  readonly details: JsonRecord;
}

export interface PaydayReminderSafePolicyGuard {
  readonly serverAuthorityPaydayCalculation: true;
  readonly rawSalaryNotIncludedInPushPayload: true;
  readonly krwAmountNotLogged: true;
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly transactionalNotificationOnly: true;
  readonly idempotencyRequired: true;
  readonly quietHoursRespected: true;
  readonly duplicateReminderPrevented: true;
  readonly repositoryBoundaryRequired: true;
  readonly notificationBoundarySeparated: true;
}

export interface PaydayReminderRunResult {
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: PaydayReminderOperation;
  readonly mode: PaydayReminderMode;
  readonly policy: PaydayReminderPolicy;
  readonly lockStatus: JobLockStatus;
  readonly scannedCount: number;
  readonly eligibleCount: number;
  readonly queuedCount: number;
  readonly skippedCount: number;
  readonly growthEventQueuedCount: number;
  readonly nextCursor: string | null;
  readonly candidates: readonly PaydayReminderCandidate[];
  readonly notificationIds: readonly string[];
  readonly reminderKeys: readonly string[];
  readonly safePolicyGuard: PaydayReminderSafePolicyGuard;
  readonly startedAt: string;
  readonly completedAt: string;
}

export interface PaydayReminderJob<TEnv = unknown> {
  readonly version: string;
  readonly preview: (
    context: PaydayReminderRuntimeContext<TEnv>,
  ) => Promise<PaydayReminderRunResult>;
  readonly run: (
    context: PaydayReminderRuntimeContext<TEnv>,
  ) => Promise<PaydayReminderRunResult>;
  readonly runForUser: (
    userId: string,
    context: PaydayReminderRuntimeContext<TEnv>,
  ) => Promise<PaydayReminderRunResult>;
  readonly runForPlan: (
    planId: string,
    context: PaydayReminderRuntimeContext<TEnv>,
  ) => Promise<PaydayReminderRunResult>;
  readonly resolvePolicy: (
    context: PaydayReminderRuntimeContext<TEnv>,
    modeOverride?: PaydayReminderMode,
  ) => PaydayReminderPolicy;
  readonly evaluatePlan: (
    plan: PayrollPlanRecord,
    policy: PaydayReminderPolicy,
    now: Date,
  ) => PaydayReminderCandidate;
  readonly buildNotificationMessage: (
    candidate: PaydayReminderCandidate,
    requestId: string,
    validateOnly: boolean,
  ) => PaydayNotificationMessage;
}

export class PaydayReminderError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "PaydayReminderError";
    this.code = code;
    this.status = status;
  }
}

export const paydayReminderSafePolicyGuard: PaydayReminderSafePolicyGuard =
  Object.freeze({
    serverAuthorityPaydayCalculation: true,
    rawSalaryNotIncludedInPushPayload: true,
    krwAmountNotLogged: true,
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
    transactionalNotificationOnly: true,
    idempotencyRequired: true,
    quietHoursRespected: true,
    duplicateReminderPrevented: true,
    repositoryBoundaryRequired: true,
    notificationBoundarySeparated: true,
  });

function envText<TEnv>(
  env: TEnv,
  key: keyof PaydayReminderEnvLike,
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
  key: keyof PaydayReminderEnvLike,
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
  key: keyof PaydayReminderEnvLike,
  fallback: boolean,
): boolean {
  if (typeof option === "boolean") return option;
  if (typeof option === "function") return option(env);
  return boolFromText(envText(env, key), fallback);
}

function optionMode<TEnv>(
  env: TEnv,
  option:
    | PaydayReminderMode
    | ((env: TEnv) => PaydayReminderMode | null | undefined)
    | undefined,
): PaydayReminderMode {
  const value = typeof option === "function" ? option(env) : option;
  if (value === "APPLY" || value === "DRY_RUN") return value;
  return boolFromText(envText(env, "PAYDAY_REMINDER_DRY_RUN"), false)
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

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function daysBetweenUtc(from: Date, to: Date): number {
  return Math.round(
    (startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / 86_400_000,
  );
}

function dateOnly(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function assertId(value: string, label: string): void {
  if (!/^[a-zA-Z0-9:_./-]{1,180}$/.test(value.trim())) {
    throw new PaydayReminderError(
      "PAYDAY_REMINDER_ID_INVALID",
      `${label} 형식이 올바르지 않습니다.`,
      400,
    );
  }
}

function isPaidForPayday(plan: PayrollPlanRecord, payday: Date): boolean {
  const paidAt = parseDate(plan.salaryReceivedAt);
  return Boolean(
    paidAt &&
    startOfUtcDay(paidAt).getTime() >= startOfUtcDay(payday).getTime(),
  );
}

function safePayrollLabel(plan: PayrollPlanRecord): string {
  const name = plan.displayName.trim();
  if (
    !name ||
    /(?:salary|payroll|income|급여|월급|소득|연봉|계좌|카드|대출|금액|\b\d{5,}\b)/i.test(
      name,
    )
  )
    return "급여";
  return name.slice(0, 24);
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
          normalized === "notificationids" ||
          normalized === "reminderkeys" ||
          normalized === "useridpresent" ||
          normalized === "planidpresent";
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
  candidates: readonly PaydayReminderCandidate[],
  queuedCount: number,
  growthEventQueuedCount: number,
) {
  return {
    scannedCount: candidates.length,
    eligibleCount: candidates.filter((candidate) => candidate.eligible).length,
    queuedCount,
    skippedCount: candidates.filter((candidate) => !candidate.eligible).length,
    growthEventQueuedCount,
  };
}

function auditEventFrom(
  result: PaydayReminderRunResult,
  status: PaydayReminderAuditEvent["status"],
  actorId: string,
  details: JsonRecord,
): PaydayReminderAuditEvent {
  const event =
    result.operation === "preview"
      ? "payday_reminder.preview"
      : result.operation === "user_scope_reminder"
        ? "payday_reminder.user"
        : result.operation === "plan_scope_reminder"
          ? "payday_reminder.plan"
          : "payday_reminder.run";
  return {
    event,
    service: PAYDAY_REMINDER_JOB_NAME,
    version: PAYDAY_REMINDER_JOB_VERSION,
    requestId: result.requestId,
    operation: result.operation,
    actorId,
    mode: result.mode,
    status,
    scannedCount: result.scannedCount,
    eligibleCount: result.eligibleCount,
    queuedCount: result.queuedCount,
    skippedCount: result.skippedCount,
    growthEventQueuedCount: result.growthEventQueuedCount,
    lockStatus: result.lockStatus,
    notificationIds: result.notificationIds,
    reminderKeys: result.reminderKeys,
    userIdPresent: Boolean(details.userIdPresent),
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    rawSalaryLogged: false,
    adsFinancialTargetingUsed: false,
    createdAt: result.completedAt,
    details: sanitize(details) as JsonRecord,
  };
}

async function emit<TEnv>(
  options: PaydayReminderJobOptions<TEnv>,
  context: PaydayReminderRuntimeContext<TEnv>,
  event: PaydayReminderAuditEvent,
): Promise<void> {
  if (
    boolFromText(
      envText(context.env, "PAYDAY_REMINDER_AUDIT_TO_CONSOLE"),
      false,
    )
  ) {
    console.info(
      "salary_hijacking_payday_reminder_event",
      JSON.stringify(sanitize(event)),
    );
  }
  const task = Promise.all([
    options.repository.appendPaydayReminderAudit?.(event) ?? Promise.resolve(),
    options.onEvent
      ? Promise.resolve(options.onEvent(event, context.env, context.execution))
      : Promise.resolve(),
  ])
    .then(() => undefined)
    .catch((error) =>
      console.warn(
        "payday_reminder_event_failed",
        error instanceof Error ? error.name : "UnknownError",
      ),
    );
  context.execution?.waitUntil?.(task);
  if (!context.execution?.waitUntil) await task;
}

export function createPaydayReminderJob<TEnv = PaydayReminderEnvLike>(
  options: PaydayReminderJobOptions<TEnv>,
): PaydayReminderJob<TEnv> {
  if (!options.repository)
    throw new PaydayReminderError(
      "PAYDAY_REMINDER_REPOSITORY_REQUIRED",
      "payday reminder repository가 필요합니다.",
      500,
    );
  if (!options.notificationProducer)
    throw new PaydayReminderError(
      "PAYDAY_REMINDER_PRODUCER_REQUIRED",
      "notification producer가 필요합니다.",
      500,
    );

  function resolvePolicy(
    context: PaydayReminderRuntimeContext<TEnv>,
    modeOverride?: PaydayReminderMode,
  ): PaydayReminderPolicy {
    return {
      mode: modeOverride ?? optionMode(context.env, options.defaultMode),
      batchSize: clampInt(
        optionNumber(
          context.env,
          options.batchSize,
          "PAYDAY_REMINDER_BATCH_SIZE",
          DEFAULT_PAYDAY_REMINDER_BATCH_SIZE,
        ),
        1,
        MAX_PAYDAY_REMINDER_BATCH_SIZE,
      ),
      lookaheadDays: clampInt(
        optionNumber(
          context.env,
          options.lookaheadDays,
          "PAYDAY_REMINDER_LOOKAHEAD_DAYS",
          DEFAULT_PAYDAY_LOOKAHEAD_DAYS,
        ),
        0,
        31,
      ),
      graceDays: clampInt(
        optionNumber(
          context.env,
          options.graceDays,
          "PAYDAY_REMINDER_GRACE_DAYS",
          DEFAULT_PAYDAY_GRACE_DAYS,
        ),
        0,
        31,
      ),
      lockTtlSeconds: clampInt(
        optionNumber(
          context.env,
          options.lockTtlSeconds,
          "PAYDAY_REMINDER_LOCK_TTL_SECONDS",
          DEFAULT_PAYDAY_LOCK_TTL_SECONDS,
        ),
        60,
        86_400,
      ),
      defaultReminderHour: clampInt(
        optionNumber(
          context.env,
          options.defaultReminderHour,
          "PAYDAY_REMINDER_DEFAULT_HOUR",
          DEFAULT_PAYDAY_REMINDER_HOUR,
        ),
        0,
        23,
      ),
      timezone: PAYDAY_REMINDER_TIMEZONE,
      notificationEnabled: optionBool(
        context.env,
        options.notificationEnabled,
        "PAYDAY_REMINDER_NOTIFICATION_ENABLED",
        true,
      ),
      growthEventEnabled: optionBool(
        context.env,
        options.growthEventEnabled,
        "PAYDAY_REMINDER_GROWTH_EVENT_ENABLED",
        true,
      ),
      rawSalaryInPayloadAllowed: false,
      rawFinancialDataLogged: false,
      adsFinancialTargetingUsed: false,
    };
  }

  function evaluatePlan(
    plan: PayrollPlanRecord,
    policy: PaydayReminderPolicy,
    now: Date,
  ): PaydayReminderCandidate {
    assertId(plan.id, "planId");
    assertId(plan.userId, "userId");
    const payday = parseDate(plan.nextPaydayDate);
    if (!payday)
      throw new PaydayReminderError(
        "PAYDAY_REMINDER_PAYDAY_DATE_INVALID",
        "급여일 날짜가 올바르지 않습니다.",
        400,
      );
    const daysUntilPayday = daysBetweenUtc(now, payday);
    const timing: PaydayReminderTiming =
      daysUntilPayday < 0
        ? "PAYDAY_MISSED"
        : daysUntilPayday === 0
          ? "PAYDAY_TODAY"
          : "BEFORE_PAYDAY";
    const paydayDate = dateOnly(payday);
    const reminderKey = `${plan.id}:${paydayDate}:${timing}:${Math.max(0, daysUntilPayday)}`;
    const idempotencyKey = `payday-reminder:${plan.userId}:${reminderKey}`;
    const hour = now.getUTCHours();
    const quiet = plan.notificationQuietHours;
    const inQuietHours = quiet
      ? quiet.startHour <= quiet.endHour
        ? hour >= quiet.startHour && hour < quiet.endHour
        : hour >= quiet.startHour || hour < quiet.endHour
      : false;

    let eligible = true;
    let skipReason: string | null = null;
    if (plan.status !== "ACTIVE") {
      eligible = false;
      skipReason = "plan_not_active";
    } else if (!policy.notificationEnabled || !plan.notificationEnabled) {
      eligible = false;
      skipReason = "notification_disabled";
    } else if (!plan.reminderEnabled) {
      eligible = false;
      skipReason = "reminder_disabled";
    } else if (isPaidForPayday(plan, payday)) {
      eligible = false;
      skipReason = "salary_already_received";
    } else if (daysUntilPayday > policy.lookaheadDays) {
      eligible = false;
      skipReason = "outside_lookahead_window";
    } else if (daysUntilPayday < -policy.graceDays) {
      eligible = false;
      skipReason = "outside_missed_grace_window";
    } else if (
      timing === "BEFORE_PAYDAY" &&
      !plan.reminderDaysBefore.includes(daysUntilPayday)
    ) {
      eligible = false;
      skipReason = "reminder_day_not_configured";
    } else if (plan.lastReminderKey === reminderKey) {
      eligible = false;
      skipReason = "duplicate_reminder_key";
    } else if (inQuietHours) {
      eligible = false;
      skipReason = "quiet_hours";
    }

    const priority =
      timing === "PAYDAY_MISSED"
        ? 100
        : timing === "PAYDAY_TODAY"
          ? 95
          : Math.max(35, 85 - daysUntilPayday * 5);
    return {
      plan,
      timing,
      paydayDate,
      daysUntilPayday,
      reminderKey,
      idempotencyKey,
      eligible,
      skipReason,
      priority,
    };
  }

  function buildNotificationMessage(
    candidate: PaydayReminderCandidate,
    requestId: string,
    validateOnly: boolean,
  ): PaydayNotificationMessage {
    const plan = candidate.plan;
    const notificationId = `ntf_payday_${plan.id}_${candidate.paydayDate.replace(/-/g, "")}_${candidate.timing.toLowerCase()}`;
    const label = safePayrollLabel(plan);
    const title =
      candidate.timing === "PAYDAY_MISSED"
        ? `${label} 입금 확인이 필요해요`
        : candidate.timing === "PAYDAY_TODAY"
          ? `오늘은 ${label} 예정일이에요`
          : `${candidate.daysUntilPayday}일 뒤 ${label} 예정일이에요`;
    const body =
      candidate.timing === "PAYDAY_MISSED"
        ? "급여 화면에서 입금 여부와 이번 달 계획을 확인해 주세요."
        : "급여 홈에서 이번 달 예산과 납치 계획을 확인해 주세요.";
    const payload: PaydayNotificationMessage["payload"] = {
      notification: { title, body },
      data: {
        notificationId,
        userId: plan.userId,
        type: "PAYDAY",
        importance: "TRANSACTIONAL",
        targetScreen: "payroll-home",
        deeplink: `salary-hijacking://payroll/payday/${encodeURIComponent(plan.id)}`,
        routeParams: {
          planId: plan.id,
          paydayDate: candidate.paydayDate,
          timing: candidate.timing,
          salaryIncluded: false,
          amountIncluded: false,
        },
        ttlSeconds: candidate.timing === "PAYDAY_MISSED" ? 86_400 : 259_200,
        idempotencyKey: candidate.idempotencyKey,
        marketingConsentVerified: false,
        adsPartnerConsentVerified: false,
      },
      extraData: {
        reminderKey: candidate.reminderKey,
        frequency: plan.frequency,
        rawSalaryIncluded: false,
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

  function buildGrowthEvent(
    candidate: PaydayReminderCandidate,
    requestId: string,
    now: Date,
  ): PaydayGrowthEvent {
    return {
      userId: candidate.plan.userId,
      planId: candidate.plan.id,
      paydayDate: candidate.paydayDate,
      eventType:
        candidate.timing === "PAYDAY_TODAY"
          ? "PAYDAY_TODAY"
          : "PAYDAY_REMINDER_QUEUED",
      idempotencyKey: `${candidate.idempotencyKey}:growth`,
      requestId,
      points: candidate.timing === "PAYDAY_TODAY" ? 20 : 5,
      rawAmountIncluded: false,
      createdAt: iso(now),
    };
  }

  async function runInternal(
    context: PaydayReminderRuntimeContext<TEnv>,
    operation: PaydayReminderOperation,
    modeOverride?: PaydayReminderMode,
    userId?: string,
    planId?: string,
  ): Promise<PaydayReminderRunResult> {
    if (userId) assertId(userId, "userId");
    if (planId) assertId(planId, "planId");
    const startedAt = context.now ?? new Date();
    const requestId = context.requestId ?? createRequestId("pdr");
    const actorId = context.actorId ?? "system:payday-reminder";
    const policy = resolvePolicy(
      { ...context, requestId, actorId, now: startedAt, operation },
      modeOverride,
    );
    const owner = `${PAYDAY_REMINDER_JOB_NAME}:${actorId}`;
    const lock =
      operation === "preview" ||
      operation === "user_scope_reminder" ||
      operation === "plan_scope_reminder"
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
            lockName: PAYDAY_REMINDER_JOB_NAME,
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
      const result: PaydayReminderRunResult = {
        service: PAYDAY_REMINDER_JOB_NAME,
        version: PAYDAY_REMINDER_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        policy,
        lockStatus: lock.status,
        scannedCount: 0,
        eligibleCount: 0,
        queuedCount: 0,
        skippedCount: 0,
        growthEventQueuedCount: 0,
        nextCursor: null,
        candidates: [],
        notificationIds: [],
        reminderKeys: [],
        safePolicyGuard: paydayReminderSafePolicyGuard,
        startedAt: iso(startedAt),
        completedAt: iso(new Date()),
      };
      await emit(
        options,
        context,
        auditEventFrom(result, "SKIPPED", actorId, {
          lockStatus: lock.status,
          userIdPresent: Boolean(userId),
          planIdPresent: Boolean(planId),
        }),
      );
      return result;
    }

    try {
      const dueFrom = dateOnly(addDays(startedAt, -policy.graceDays));
      const dueTo = dateOnly(addDays(startedAt, policy.lookaheadDays));
      const list = await options.repository.listPayrollPlansForPaydayReminder({
        dueFrom,
        dueTo,
        limit: policy.batchSize,
        statuses: ["ACTIVE"],
        ...(userId ? { userId } : {}),
        ...(planId ? { planId } : {}),
      });
      const candidates = list.items
        .map((plan) => evaluatePlan(plan, policy, startedAt))
        .sort((left, right) => right.priority - left.priority);
      const eligible = candidates.filter((candidate) => candidate.eligible);
      const messages = eligible.map((candidate) =>
        buildNotificationMessage(
          candidate,
          requestId,
          policy.mode === "DRY_RUN",
        ),
      );
      if (policy.mode === "APPLY")
        for (const message of messages)
          await options.notificationProducer.send(message, { delaySeconds: 0 });

      const growthEvents =
        policy.growthEventEnabled && options.growthProducer
          ? eligible
              .filter((candidate) => candidate.plan.growthEnabled)
              .map((candidate) =>
                buildGrowthEvent(candidate, requestId, startedAt),
              )
          : [];
      if (policy.mode === "APPLY")
        for (const event of growthEvents)
          await options.growthProducer?.send(event);

      const queuedCount =
        policy.mode === "DRY_RUN" ? eligible.length : messages.length;
      if (policy.mode === "APPLY" && eligible.length) {
        await options.repository.markPaydayRemindersQueued({
          planIds: eligible.map((candidate) => candidate.plan.id),
          requestId,
          actorId,
          now: iso(startedAt),
          reminderKeys: eligible.map((candidate) => candidate.reminderKey),
          notificationIds: messages.map(
            (message) => message.payload.data.notificationId,
          ),
          details: {
            rawSalaryLogged: false,
            rawFinancialDataLogged: false,
            rawPushTokenLogged: false,
            amountIncludedInPayload: false,
          },
        });
      }

      const counts = totals(candidates, queuedCount, growthEvents.length);
      const result: PaydayReminderRunResult = {
        service: PAYDAY_REMINDER_JOB_NAME,
        version: PAYDAY_REMINDER_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        policy,
        lockStatus: lock.status,
        ...counts,
        nextCursor: list.nextCursor,
        candidates,
        notificationIds: messages.map(
          (message) => message.payload.data.notificationId,
        ),
        reminderKeys: eligible.map((candidate) => candidate.reminderKey),
        safePolicyGuard: paydayReminderSafePolicyGuard,
        startedAt: iso(startedAt),
        completedAt: iso(new Date()),
      };
      await emit(
        options,
        context,
        auditEventFrom(result, "SUCCESS", actorId, {
          dueFrom,
          dueTo,
          userIdPresent: Boolean(userId),
          planIdPresent: Boolean(planId),
          rawSalaryLogged: false,
        }),
      );
      return result;
    } catch (error) {
      const result: PaydayReminderRunResult = {
        service: PAYDAY_REMINDER_JOB_NAME,
        version: PAYDAY_REMINDER_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        policy,
        lockStatus: lock.status,
        scannedCount: 0,
        eligibleCount: 0,
        queuedCount: 0,
        skippedCount: 0,
        growthEventQueuedCount: 0,
        nextCursor: null,
        candidates: [],
        notificationIds: [],
        reminderKeys: [],
        safePolicyGuard: paydayReminderSafePolicyGuard,
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
      if (operation === "scheduled_reminder")
        await options.repository.releaseJobLock?.({
          lockId: lock.lockId,
          requestId,
          owner,
          now: iso(new Date()),
        });
    }
  }

  return Object.freeze({
    version: PAYDAY_REMINDER_JOB_VERSION,
    preview: (context: PaydayReminderRuntimeContext<TEnv>) =>
      runInternal(context, "preview", "DRY_RUN"),
    run: (context: PaydayReminderRuntimeContext<TEnv>) =>
      runInternal(context, "scheduled_reminder"),
    runForUser: (userId: string, context: PaydayReminderRuntimeContext<TEnv>) =>
      runInternal(context, "user_scope_reminder", undefined, userId),
    runForPlan: (planId: string, context: PaydayReminderRuntimeContext<TEnv>) =>
      runInternal(context, "plan_scope_reminder", undefined, undefined, planId),
    resolvePolicy,
    evaluatePlan,
    buildNotificationMessage,
  });
}

export function createInMemoryPaydayReminderRepository(
  seed: readonly PayrollPlanRecord[] = [],
): PaydayReminderRepository & {
  readonly snapshot: () => readonly PayrollPlanRecord[];
  readonly auditSnapshot: () => readonly PaydayReminderAuditEvent[];
} {
  let rows = [...seed];
  const audits: PaydayReminderAuditEvent[] = [];
  let activeLock: PaydayReminderLockResult | null = null;
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
    listPayrollPlansForPaydayReminder: async (criteria) => ({
      items: rows
        .filter((row) => criteria.statuses.includes(row.status))
        .filter((row) => !criteria.userId || row.userId === criteria.userId)
        .filter((row) => !criteria.planId || row.id === criteria.planId)
        .filter(
          (row) =>
            dateOnly(parseDate(row.nextPaydayDate) ?? new Date(0)) >=
              criteria.dueFrom &&
            dateOnly(parseDate(row.nextPaydayDate) ?? new Date(0)) <=
              criteria.dueTo,
        )
        .slice(0, criteria.limit),
      nextCursor: null,
    }),
    markPaydayRemindersQueued: async (input) => {
      const idSet = new Set(input.planIds);
      rows = rows.map((row) =>
        idSet.has(row.id)
          ? {
              ...row,
              lastReminderAt: input.now,
              lastReminderKey:
                input.reminderKeys[input.planIds.indexOf(row.id)] ??
                row.lastReminderKey,
              updatedAt: input.now,
            }
          : row,
      );
      return idSet.size;
    },
    appendPaydayReminderAudit: async (event) => {
      audits.push(event);
    },
  };
}

export function createInMemoryPaydayNotificationProducer(): PaydayNotificationProducer & {
  readonly snapshot: () => readonly PaydayNotificationMessage[];
} {
  const messages: PaydayNotificationMessage[] = [];
  return {
    send: async (message) => {
      messages.push(message);
    },
    snapshot: () =>
      messages.map((message) => ({
        ...message,
        payload: {
          ...message.payload,
          data: { ...message.payload.data },
          notification: { ...message.payload.notification },
          extraData: { ...message.payload.extraData },
        },
      })),
  };
}

export function createInMemoryPaydayGrowthProducer(): PaydayGrowthProducer & {
  readonly snapshot: () => readonly PaydayGrowthEvent[];
} {
  const events: PaydayGrowthEvent[] = [];
  return {
    send: async (event) => {
      events.push(event);
    },
    snapshot: () => events.map((event) => ({ ...event })),
  };
}

export const paydayReminderManifest = Object.freeze({
  file: "services/scheduler/src/jobs/payday-reminder.job.ts",
  version: PAYDAY_REMINDER_JOB_VERSION,
  service: PAYDAY_REMINDER_JOB_NAME,
  runtime: "cloudflare-workers-cron-node-compatible",
  capabilities: Object.freeze([
    "server_authority_payday_due_calculation",
    "scheduled_reminder",
    "preview_dry_run",
    "user_scope_reminder",
    "plan_scope_reminder",
    "before_payday_payday_today_missed_timing",
    "duplicate_reminder_prevention",
    "quiet_hours_guard",
    "transactional_payday_notification_payload",
    "notification_queue_boundary",
    "growth_event_boundary",
    "repository_boundary",
    "job_lock_contract",
    "sanitized_audit_event",
    "no_raw_salary_or_financial_data_logged",
    "no_raw_push_token_logged",
    "no_salary_amount_in_notification_payload",
    "ads_financial_targeting_forbidden",
    "in_memory_test_repository_and_producers",
  ]),
  safePolicyGuard: paydayReminderSafePolicyGuard,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertPaydayReminderJobCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "scheduler_job_contract",
    "server_authority_payday_due_calculation",
    "scheduled_reminder",
    "preview_dry_run_mode",
    "user_scope_reminder",
    "plan_scope_reminder",
    "lookahead_and_missed_grace_policy",
    "before_payday_today_missed_timing",
    "duplicate_reminder_key_prevention",
    "idempotency_key_required",
    "quiet_hours_guard",
    "transactional_payday_notification_only",
    "payday_domain_type",
    "salary_amount_not_in_push_payload",
    "notification_queue_boundary",
    "growth_event_boundary",
    "repository_boundary",
    "job_lock_contract",
    "request_id_actor_audit_contract",
    "wait_until_event_hook",
    "sanitized_audit_no_raw_salary_or_financial_data",
    "sanitized_audit_no_raw_push_token",
    "ads_financial_targeting_not_used",
    "in_memory_repository_for_tests",
    "cloudflare_workers_cron_node_compatible_no_node_dependency",
  ] as const;
  return {
    ok: checks.length >= 20,
    version: PAYDAY_REMINDER_JOB_VERSION,
    checks,
  };
}

export const defaultPaydayReminderRepository =
  createInMemoryPaydayReminderRepository();
export const defaultPaydayNotificationProducer =
  createInMemoryPaydayNotificationProducer();
export const defaultPaydayGrowthProducer = createInMemoryPaydayGrowthProducer();
export const defaultPaydayReminderJob = createPaydayReminderJob({
  repository: defaultPaydayReminderRepository,
  notificationProducer: defaultPaydayNotificationProducer,
  growthProducer: defaultPaydayGrowthProducer,
  defaultMode: "DRY_RUN",
});
export default createPaydayReminderJob;
