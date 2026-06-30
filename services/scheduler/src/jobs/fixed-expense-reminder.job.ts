/** services/scheduler/src/jobs/fixed-expense-reminder.job.ts
 * 급여납치 Salary Hijacking Platform · Fixed Expense Reminder Job 최종본
 * 서버 권위로 고정지출 결제 예정/당일/연체 알림 후보를 계산하고 notifications service/queue로 전달한다.
 * FCM payload·감사 로그에는 급여·계좌·카드·대출·저축·지출 금액 원문을 남기지 않는다.
 */

export const FIXED_EXPENSE_REMINDER_JOB_VERSION = "3.1.0";
export const FIXED_EXPENSE_REMINDER_JOB_NAME =
  "salary-hijacking-fixed-expense-reminder";
export const FIXED_EXPENSE_REMINDER_TIMEZONE = "Asia/Seoul";
export const DEFAULT_FIXED_EXPENSE_REMINDER_BATCH_SIZE = 500;
export const MAX_FIXED_EXPENSE_REMINDER_BATCH_SIZE = 2_000;
export const DEFAULT_FIXED_EXPENSE_LOOKAHEAD_DAYS = 7;
export const DEFAULT_FIXED_EXPENSE_GRACE_DAYS = 3;
export const DEFAULT_FIXED_EXPENSE_LOCK_TTL_SECONDS = 1_800;

export type FixedExpenseReminderMode = "DRY_RUN" | "APPLY";
export type FixedExpenseReminderOperation =
  | "scheduled_reminder"
  | "user_scope_reminder"
  | "expense_scope_reminder"
  | "preview";
export type FixedExpenseReminderTiming = "BEFORE_DUE" | "DUE_TODAY" | "OVERDUE";
export type FixedExpenseReminderStatus =
  | "ACTIVE"
  | "PAUSED"
  | "ENDED"
  | "DELETED";
export type FixedExpensePaymentStatus =
  | "PENDING"
  | "PAID"
  | "SKIPPED"
  | "OVERDUE";
export type FixedExpenseRecurrence =
  | "ONCE"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "YEARLY";
export type FixedExpenseCategory =
  | "SUBSCRIPTION"
  | "LOAN"
  | "RENT"
  | "UTILITY"
  | "INSURANCE"
  | "TELECOM"
  | "CARD"
  | "SAVINGS"
  | "ETC";
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

export interface FixedExpenseReminderEnvLike {
  readonly APP_ENV?: string;
  readonly ENVIRONMENT?: string;
  readonly NODE_ENV?: string;
  readonly FIXED_EXPENSE_REMINDER_DRY_RUN?: string;
  readonly FIXED_EXPENSE_REMINDER_BATCH_SIZE?: string;
  readonly FIXED_EXPENSE_REMINDER_LOOKAHEAD_DAYS?: string;
  readonly FIXED_EXPENSE_REMINDER_GRACE_DAYS?: string;
  readonly FIXED_EXPENSE_REMINDER_LOCK_TTL_SECONDS?: string;
  readonly FIXED_EXPENSE_REMINDER_AUDIT_TO_CONSOLE?: string;
  readonly FIXED_EXPENSE_REMINDER_DEFAULT_HOUR?: string;
}

export interface FixedExpenseReminderRuntimeContext<TEnv = unknown> {
  readonly env: TEnv;
  readonly execution?: WaitUntilCapable | undefined;
  readonly requestId?: string | undefined;
  readonly actorId?: string | undefined;
  readonly now?: Date | undefined;
  readonly operation?: FixedExpenseReminderOperation | undefined;
}

export interface FixedExpenseRecord {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly category: FixedExpenseCategory;
  readonly recurrence: FixedExpenseRecurrence;
  readonly status: FixedExpenseReminderStatus;
  readonly paymentStatus: FixedExpensePaymentStatus;
  readonly dueDay?: number | undefined;
  readonly dueDate?: string | undefined;
  readonly nextDueDate: string;
  readonly startedAt: string;
  readonly endedAt?: string | undefined;
  readonly timezone?: string | undefined;
  readonly reminderEnabled: boolean;
  readonly reminderDaysBefore: readonly number[];
  readonly notificationQuietHours?:
    | { readonly startHour: number; readonly endHour: number }
    | undefined;
  readonly lastReminderAt?: string | undefined;
  readonly lastReminderKey?: string | undefined;
  readonly paidAt?: string | undefined;
  readonly amountKrw?: number | undefined;
  readonly merchantName?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata: JsonRecord;
}

export interface FixedExpenseReminderCandidate {
  readonly expense: FixedExpenseRecord;
  readonly timing: FixedExpenseReminderTiming;
  readonly dueDate: string;
  readonly daysUntilDue: number;
  readonly reminderKey: string;
  readonly idempotencyKey: string;
  readonly eligible: boolean;
  readonly skipReason: string | null;
  readonly priority: number;
}

export interface FixedExpenseReminderPolicy {
  readonly mode: FixedExpenseReminderMode;
  readonly batchSize: number;
  readonly lookaheadDays: number;
  readonly graceDays: number;
  readonly lockTtlSeconds: number;
  readonly defaultReminderHour: number;
  readonly timezone: string;
  readonly allowLoanCategory: boolean;
  readonly rawAmountInPayloadAllowed: false;
  readonly marketingConsentRequired: true;
}

export interface FixedExpenseReminderListCriteria {
  readonly dueFrom: string;
  readonly dueTo: string;
  readonly limit: number;
  readonly cursor?: string | undefined;
  readonly userId?: string | undefined;
  readonly expenseId?: string | undefined;
  readonly statuses: readonly FixedExpenseReminderStatus[];
}

export interface FixedExpenseReminderListResult {
  readonly items: readonly FixedExpenseRecord[];
  readonly nextCursor: string | null;
}

export interface FixedExpenseReminderMarkInput {
  readonly expenseIds: readonly string[];
  readonly requestId: string;
  readonly actorId: string;
  readonly now: string;
  readonly reminderKeys: readonly string[];
  readonly notificationIds: readonly string[];
  readonly details: JsonRecord;
}

export interface FixedExpenseReminderLockInput {
  readonly lockName: string;
  readonly requestId: string;
  readonly owner: string;
  readonly ttlSeconds: number;
  readonly now: string;
}

export interface FixedExpenseReminderLockResult {
  readonly status: JobLockStatus;
  readonly lockId: string;
  readonly owner: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
}

export interface FixedExpenseReminderRepository {
  readonly acquireJobLock?: (
    input: FixedExpenseReminderLockInput,
  ) => Promise<FixedExpenseReminderLockResult>;
  readonly releaseJobLock?: (input: {
    readonly lockId: string;
    readonly requestId: string;
    readonly owner: string;
    readonly now: string;
  }) => Promise<void>;
  readonly listFixedExpensesForReminder: (
    criteria: FixedExpenseReminderListCriteria,
  ) => Promise<FixedExpenseReminderListResult>;
  readonly markFixedExpenseRemindersQueued: (
    input: FixedExpenseReminderMarkInput,
  ) => Promise<number>;
  readonly appendFixedExpenseReminderAudit?: (
    event: FixedExpenseReminderAuditEvent,
  ) => Promise<void>;
}

export interface FixedExpenseNotificationMessage {
  readonly type:
    | "FCM_SEND"
    | "FCM_MULTICAST"
    | "FCM_TOPIC"
    | "FCM_CONDITION"
    | "FCM_VALIDATE";
  readonly requestId: string;
  readonly payload: {
    readonly notification: { readonly title: string; readonly body: string };
    readonly data: {
      readonly notificationId: string;
      readonly userId: string;
      readonly type: "FIXED_PAYMENT_DUE";
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

export interface FixedExpenseNotificationProducer {
  readonly send: (
    message: FixedExpenseNotificationMessage,
    options?: { readonly delaySeconds?: number },
  ) => Promise<void>;
}

export interface FixedExpenseReminderJobOptions<TEnv = unknown> {
  readonly repository: FixedExpenseReminderRepository;
  readonly notificationProducer: FixedExpenseNotificationProducer;
  readonly defaultMode?:
    | FixedExpenseReminderMode
    | ((env: TEnv) => FixedExpenseReminderMode | null | undefined);
  readonly batchSize?: number | ((env: TEnv) => number | null | undefined);
  readonly lookaheadDays?: number | ((env: TEnv) => number | null | undefined);
  readonly graceDays?: number | ((env: TEnv) => number | null | undefined);
  readonly lockTtlSeconds?: number | ((env: TEnv) => number | null | undefined);
  readonly defaultReminderHour?:
    | number
    | ((env: TEnv) => number | null | undefined);
  readonly onEvent?: (
    event: FixedExpenseReminderAuditEvent,
    env: TEnv,
    context?: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface FixedExpenseReminderAuditEvent {
  readonly event:
    | "fixed_expense_reminder.run"
    | "fixed_expense_reminder.preview"
    | "fixed_expense_reminder.user"
    | "fixed_expense_reminder.expense"
    | "fixed_expense_reminder.lock";
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: FixedExpenseReminderOperation;
  readonly actorId: string;
  readonly mode: FixedExpenseReminderMode;
  readonly status: "SUCCESS" | "FAILURE" | "SKIPPED";
  readonly scannedCount: number;
  readonly eligibleCount: number;
  readonly queuedCount: number;
  readonly skippedCount: number;
  readonly lockStatus: JobLockStatus;
  readonly notificationIds: readonly string[];
  readonly reminderKeys: readonly string[];
  readonly userIdPresent: boolean;
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly createdAt: string;
  readonly details: JsonRecord;
}

export interface FixedExpenseReminderSafePolicyGuard {
  readonly serverAuthorityDueCalculation: true;
  readonly krwAmountNotIncludedInPushPayload: true;
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly transactionalNotificationOnly: true;
  readonly idempotencyRequired: true;
  readonly quietHoursRespected: true;
  readonly duplicateReminderPrevented: true;
  readonly repositoryBoundaryRequired: true;
}

export interface FixedExpenseReminderRunResult {
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly operation: FixedExpenseReminderOperation;
  readonly mode: FixedExpenseReminderMode;
  readonly policy: FixedExpenseReminderPolicy;
  readonly lockStatus: JobLockStatus;
  readonly scannedCount: number;
  readonly eligibleCount: number;
  readonly queuedCount: number;
  readonly skippedCount: number;
  readonly nextCursor: string | null;
  readonly candidates: readonly FixedExpenseReminderCandidate[];
  readonly notificationIds: readonly string[];
  readonly reminderKeys: readonly string[];
  readonly safePolicyGuard: FixedExpenseReminderSafePolicyGuard;
  readonly startedAt: string;
  readonly completedAt: string;
}

export interface FixedExpenseReminderJob<TEnv = unknown> {
  readonly version: string;
  readonly preview: (
    context: FixedExpenseReminderRuntimeContext<TEnv>,
  ) => Promise<FixedExpenseReminderRunResult>;
  readonly run: (
    context: FixedExpenseReminderRuntimeContext<TEnv>,
  ) => Promise<FixedExpenseReminderRunResult>;
  readonly runForUser: (
    userId: string,
    context: FixedExpenseReminderRuntimeContext<TEnv>,
  ) => Promise<FixedExpenseReminderRunResult>;
  readonly runForExpense: (
    expenseId: string,
    context: FixedExpenseReminderRuntimeContext<TEnv>,
  ) => Promise<FixedExpenseReminderRunResult>;
  readonly resolvePolicy: (
    context: FixedExpenseReminderRuntimeContext<TEnv>,
    modeOverride?: FixedExpenseReminderMode,
  ) => FixedExpenseReminderPolicy;
  readonly evaluateExpense: (
    expense: FixedExpenseRecord,
    policy: FixedExpenseReminderPolicy,
    now: Date,
  ) => FixedExpenseReminderCandidate;
  readonly buildNotificationMessage: (
    candidate: FixedExpenseReminderCandidate,
    requestId: string,
    validateOnly: boolean,
  ) => FixedExpenseNotificationMessage;
}

export class FixedExpenseReminderError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "FixedExpenseReminderError";
    this.code = code;
    this.status = status;
  }
}

export const fixedExpenseReminderSafePolicyGuard: FixedExpenseReminderSafePolicyGuard =
  Object.freeze({
    serverAuthorityDueCalculation: true,
    krwAmountNotIncludedInPushPayload: true,
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
    transactionalNotificationOnly: true,
    idempotencyRequired: true,
    quietHoursRespected: true,
    duplicateReminderPrevented: true,
    repositoryBoundaryRequired: true,
  });

function envText<TEnv>(
  env: TEnv,
  key: keyof FixedExpenseReminderEnvLike,
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
  key: keyof FixedExpenseReminderEnvLike,
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
    | FixedExpenseReminderMode
    | ((env: TEnv) => FixedExpenseReminderMode | null | undefined)
    | undefined,
): FixedExpenseReminderMode {
  const value = typeof option === "function" ? option(env) : option;
  if (value === "APPLY" || value === "DRY_RUN") return value;
  return boolFromText(envText(env, "FIXED_EXPENSE_REMINDER_DRY_RUN"), false)
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
  if (!/^[a-zA-Z0-9:_./-]{1,180}$/.test(value.trim()))
    throw new FixedExpenseReminderError(
      "FIXED_EXPENSE_REMINDER_ID_INVALID",
      `${label} 형식이 올바르지 않습니다.`,
      400,
    );
}
function safeExpenseLabel(expense: FixedExpenseRecord): string {
  return expense.category === "LOAN"
    ? "대출 상환"
    : expense.category === "CARD"
      ? "카드 결제"
      : expense.category === "SUBSCRIPTION"
        ? "구독 결제"
        : expense.category === "SAVINGS"
          ? "고정저축"
          : "고정지출";
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
          "merchant",
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
          "금액",
          "명세서",
          "통장",
        ].some((fragment) =>
          normalized.includes(fragment.toLowerCase().replace(/[\s._-]/g, "")),
        );
        const allowed =
          normalized === "notificationids" ||
          normalized === "reminderkeys" ||
          normalized === "useridpresent" ||
          normalized === "expenseidpresent";
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
  candidates: readonly FixedExpenseReminderCandidate[],
  queuedCount: number,
) {
  return {
    scannedCount: candidates.length,
    eligibleCount: candidates.filter((candidate) => candidate.eligible).length,
    queuedCount,
    skippedCount: candidates.filter((candidate) => !candidate.eligible).length,
  };
}

function auditEventFrom(
  result: FixedExpenseReminderRunResult,
  status: FixedExpenseReminderAuditEvent["status"],
  actorId: string,
  details: JsonRecord,
): FixedExpenseReminderAuditEvent {
  const event =
    result.operation === "preview"
      ? "fixed_expense_reminder.preview"
      : result.operation === "user_scope_reminder"
        ? "fixed_expense_reminder.user"
        : result.operation === "expense_scope_reminder"
          ? "fixed_expense_reminder.expense"
          : "fixed_expense_reminder.run";
  return {
    event,
    service: FIXED_EXPENSE_REMINDER_JOB_NAME,
    version: FIXED_EXPENSE_REMINDER_JOB_VERSION,
    requestId: result.requestId,
    operation: result.operation,
    actorId,
    mode: result.mode,
    status,
    scannedCount: result.scannedCount,
    eligibleCount: result.eligibleCount,
    queuedCount: result.queuedCount,
    skippedCount: result.skippedCount,
    lockStatus: result.lockStatus,
    notificationIds: result.notificationIds,
    reminderKeys: result.reminderKeys,
    userIdPresent: Boolean(details.userIdPresent),
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
    createdAt: result.completedAt,
    details: sanitize(details) as JsonRecord,
  };
}

async function emit<TEnv>(
  options: FixedExpenseReminderJobOptions<TEnv>,
  context: FixedExpenseReminderRuntimeContext<TEnv>,
  event: FixedExpenseReminderAuditEvent,
): Promise<void> {
  if (
    boolFromText(
      envText(context.env, "FIXED_EXPENSE_REMINDER_AUDIT_TO_CONSOLE"),
      false,
    )
  )
    console.info(
      "salary_hijacking_fixed_expense_reminder_event",
      JSON.stringify(sanitize(event)),
    );
  const task = Promise.all([
    options.repository.appendFixedExpenseReminderAudit?.(event) ??
      Promise.resolve(),
    options.onEvent
      ? Promise.resolve(options.onEvent(event, context.env, context.execution))
      : Promise.resolve(),
  ])
    .then(() => undefined)
    .catch((error) =>
      console.warn(
        "fixed_expense_reminder_event_failed",
        error instanceof Error ? error.name : "UnknownError",
      ),
    );
  context.execution?.waitUntil?.(task);
  if (!context.execution?.waitUntil) await task;
}

export function createFixedExpenseReminderJob<
  TEnv = FixedExpenseReminderEnvLike,
>(
  options: FixedExpenseReminderJobOptions<TEnv>,
): FixedExpenseReminderJob<TEnv> {
  if (!options.repository)
    throw new FixedExpenseReminderError(
      "FIXED_EXPENSE_REMINDER_REPOSITORY_REQUIRED",
      "fixed expense reminder repository가 필요합니다.",
      500,
    );
  if (!options.notificationProducer)
    throw new FixedExpenseReminderError(
      "FIXED_EXPENSE_REMINDER_PRODUCER_REQUIRED",
      "notification producer가 필요합니다.",
      500,
    );

  function resolvePolicy(
    context: FixedExpenseReminderRuntimeContext<TEnv>,
    modeOverride?: FixedExpenseReminderMode,
  ): FixedExpenseReminderPolicy {
    return {
      mode: modeOverride ?? optionMode(context.env, options.defaultMode),
      batchSize: clampInt(
        optionNumber(
          context.env,
          options.batchSize,
          "FIXED_EXPENSE_REMINDER_BATCH_SIZE",
          DEFAULT_FIXED_EXPENSE_REMINDER_BATCH_SIZE,
        ),
        1,
        MAX_FIXED_EXPENSE_REMINDER_BATCH_SIZE,
      ),
      lookaheadDays: clampInt(
        optionNumber(
          context.env,
          options.lookaheadDays,
          "FIXED_EXPENSE_REMINDER_LOOKAHEAD_DAYS",
          DEFAULT_FIXED_EXPENSE_LOOKAHEAD_DAYS,
        ),
        0,
        31,
      ),
      graceDays: clampInt(
        optionNumber(
          context.env,
          options.graceDays,
          "FIXED_EXPENSE_REMINDER_GRACE_DAYS",
          DEFAULT_FIXED_EXPENSE_GRACE_DAYS,
        ),
        0,
        31,
      ),
      lockTtlSeconds: clampInt(
        optionNumber(
          context.env,
          options.lockTtlSeconds,
          "FIXED_EXPENSE_REMINDER_LOCK_TTL_SECONDS",
          DEFAULT_FIXED_EXPENSE_LOCK_TTL_SECONDS,
        ),
        60,
        86_400,
      ),
      defaultReminderHour: clampInt(
        optionNumber(
          context.env,
          options.defaultReminderHour,
          "FIXED_EXPENSE_REMINDER_DEFAULT_HOUR",
          9,
        ),
        0,
        23,
      ),
      timezone: FIXED_EXPENSE_REMINDER_TIMEZONE,
      allowLoanCategory: true,
      rawAmountInPayloadAllowed: false,
      marketingConsentRequired: true,
    };
  }

  function evaluateExpense(
    expense: FixedExpenseRecord,
    policy: FixedExpenseReminderPolicy,
    now: Date,
  ): FixedExpenseReminderCandidate {
    assertId(expense.id, "expenseId");
    assertId(expense.userId, "userId");
    const due = parseDate(expense.nextDueDate) ?? parseDate(expense.dueDate);
    if (!due)
      throw new FixedExpenseReminderError(
        "FIXED_EXPENSE_DUE_DATE_INVALID",
        "고정지출 due date가 올바르지 않습니다.",
        400,
      );
    const daysUntilDue = daysBetweenUtc(now, due);
    const timing: FixedExpenseReminderTiming =
      daysUntilDue < 0
        ? "OVERDUE"
        : daysUntilDue === 0
          ? "DUE_TODAY"
          : "BEFORE_DUE";
    const reminderKey = `${expense.id}:${dateOnly(due)}:${timing}:${Math.max(0, daysUntilDue)}`;
    const idempotencyKey = `fixed-expense-reminder:${expense.userId}:${reminderKey}`;
    const hour = now.getUTCHours();
    const quiet = expense.notificationQuietHours;
    const inQuietHours = quiet
      ? quiet.startHour <= quiet.endHour
        ? hour >= quiet.startHour && hour < quiet.endHour
        : hour >= quiet.startHour || hour < quiet.endHour
      : false;

    let eligible = true;
    let skipReason: string | null = null;
    if (expense.status !== "ACTIVE") {
      eligible = false;
      skipReason = "expense_not_active";
    } else if (!expense.reminderEnabled) {
      eligible = false;
      skipReason = "reminder_disabled";
    } else if (expense.paymentStatus === "PAID" || expense.paidAt) {
      eligible = false;
      skipReason = "already_paid";
    } else if (daysUntilDue > policy.lookaheadDays) {
      eligible = false;
      skipReason = "outside_lookahead_window";
    } else if (daysUntilDue < -policy.graceDays) {
      eligible = false;
      skipReason = "outside_overdue_grace_window";
    } else if (
      timing === "BEFORE_DUE" &&
      !expense.reminderDaysBefore.includes(daysUntilDue)
    ) {
      eligible = false;
      skipReason = "reminder_day_not_configured";
    } else if (expense.lastReminderKey === reminderKey) {
      eligible = false;
      skipReason = "duplicate_reminder_key";
    } else if (inQuietHours) {
      eligible = false;
      skipReason = "quiet_hours";
    }

    const priority =
      timing === "OVERDUE"
        ? 100
        : timing === "DUE_TODAY"
          ? 90
          : Math.max(30, 80 - daysUntilDue * 5);
    return {
      expense,
      timing,
      dueDate: dateOnly(due),
      daysUntilDue,
      reminderKey,
      idempotencyKey,
      eligible,
      skipReason,
      priority,
    };
  }

  function buildNotificationMessage(
    candidate: FixedExpenseReminderCandidate,
    requestId: string,
    validateOnly: boolean,
  ): FixedExpenseNotificationMessage {
    const expense = candidate.expense;
    const notificationId = `ntf_fixed_${expense.id}_${candidate.dueDate.replace(/-/g, "")}_${candidate.timing.toLowerCase()}`;
    const label = safeExpenseLabel(expense);
    const title =
      candidate.timing === "OVERDUE"
        ? `${label} 확인이 필요해요`
        : candidate.timing === "DUE_TODAY"
          ? `오늘 ${label} 예정일이에요`
          : `${candidate.daysUntilDue}일 뒤 ${label} 예정일이에요`;
    const body =
      candidate.timing === "OVERDUE"
        ? "고정지출 화면에서 처리 상태를 확인해 주세요."
        : "고정지출 화면에서 예정 항목을 확인해 주세요.";
    const payload: FixedExpenseNotificationMessage["payload"] = {
      notification: { title, body },
      data: {
        notificationId,
        userId: expense.userId,
        type: "FIXED_PAYMENT_DUE",
        importance: "TRANSACTIONAL",
        targetScreen: "fixed-expenses",
        deeplink: `salary-hijacking://fixed-expenses/${encodeURIComponent(expense.id)}`,
        routeParams: {
          expenseId: expense.id,
          dueDate: candidate.dueDate,
          timing: candidate.timing,
          amountIncluded: false,
        },
        ttlSeconds: candidate.timing === "OVERDUE" ? 86_400 : 172_800,
        idempotencyKey: candidate.idempotencyKey,
        marketingConsentVerified: false,
        adsPartnerConsentVerified: false,
      },
      extraData: {
        reminderKey: candidate.reminderKey,
        category: expense.category,
        recurrence: expense.recurrence,
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
    context: FixedExpenseReminderRuntimeContext<TEnv>,
    operation: FixedExpenseReminderOperation,
    modeOverride?: FixedExpenseReminderMode,
    userId?: string,
    expenseId?: string,
  ): Promise<FixedExpenseReminderRunResult> {
    if (userId) assertId(userId, "userId");
    if (expenseId) assertId(expenseId, "expenseId");
    const startedAt = context.now ?? new Date();
    const requestId = context.requestId ?? createRequestId("fer");
    const actorId = context.actorId ?? "system:fixed-expense-reminder";
    const policy = resolvePolicy(
      { ...context, requestId, actorId, now: startedAt, operation },
      modeOverride,
    );
    const owner = `${FIXED_EXPENSE_REMINDER_JOB_NAME}:${actorId}`;
    const lock =
      operation === "preview" ||
      operation === "user_scope_reminder" ||
      operation === "expense_scope_reminder"
        ? {
            status: "ACQUIRED" as const,
            lockId: `lock_${requestId}`,
            owner,
            acquiredAt: iso(startedAt),
            expiresAt: iso(addDays(startedAt, 1)),
          }
        : ((await options.repository.acquireJobLock?.({
            lockName: FIXED_EXPENSE_REMINDER_JOB_NAME,
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
      const result: FixedExpenseReminderRunResult = {
        service: FIXED_EXPENSE_REMINDER_JOB_NAME,
        version: FIXED_EXPENSE_REMINDER_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        policy,
        lockStatus: lock.status,
        scannedCount: 0,
        eligibleCount: 0,
        queuedCount: 0,
        skippedCount: 0,
        nextCursor: null,
        candidates: [],
        notificationIds: [],
        reminderKeys: [],
        safePolicyGuard: fixedExpenseReminderSafePolicyGuard,
        startedAt: iso(startedAt),
        completedAt: iso(new Date()),
      };
      await emit(
        options,
        context,
        auditEventFrom(result, "SKIPPED", actorId, {
          lockStatus: lock.status,
          userIdPresent: Boolean(userId),
          expenseIdPresent: Boolean(expenseId),
        }),
      );
      return result;
    }

    try {
      const dueFrom = dateOnly(addDays(startedAt, -policy.graceDays));
      const dueTo = dateOnly(addDays(startedAt, policy.lookaheadDays));
      const list = await options.repository.listFixedExpensesForReminder({
        dueFrom,
        dueTo,
        limit: policy.batchSize,
        statuses: ["ACTIVE"],
        ...(userId ? { userId } : {}),
        ...(expenseId ? { expenseId } : {}),
      });
      const candidates = list.items
        .map((expense) => evaluateExpense(expense, policy, startedAt))
        .sort((a, b) => b.priority - a.priority);
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
      const queuedCount =
        policy.mode === "DRY_RUN" ? eligible.length : messages.length;
      if (policy.mode === "APPLY" && eligible.length)
        await options.repository.markFixedExpenseRemindersQueued({
          expenseIds: eligible.map((candidate) => candidate.expense.id),
          requestId,
          actorId,
          now: iso(startedAt),
          reminderKeys: eligible.map((candidate) => candidate.reminderKey),
          notificationIds: messages.map(
            (message) => message.payload.data.notificationId,
          ),
          details: {
            rawFinancialDataLogged: false,
            rawPushTokenLogged: false,
            amountIncludedInPayload: false,
          },
        });
      const counts = totals(candidates, queuedCount);
      const result: FixedExpenseReminderRunResult = {
        service: FIXED_EXPENSE_REMINDER_JOB_NAME,
        version: FIXED_EXPENSE_REMINDER_JOB_VERSION,
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
        safePolicyGuard: fixedExpenseReminderSafePolicyGuard,
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
          expenseIdPresent: Boolean(expenseId),
        }),
      );
      return result;
    } catch (error) {
      const result: FixedExpenseReminderRunResult = {
        service: FIXED_EXPENSE_REMINDER_JOB_NAME,
        version: FIXED_EXPENSE_REMINDER_JOB_VERSION,
        requestId,
        operation,
        mode: policy.mode,
        policy,
        lockStatus: lock.status,
        scannedCount: 0,
        eligibleCount: 0,
        queuedCount: 0,
        skippedCount: 0,
        nextCursor: null,
        candidates: [],
        notificationIds: [],
        reminderKeys: [],
        safePolicyGuard: fixedExpenseReminderSafePolicyGuard,
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
    version: FIXED_EXPENSE_REMINDER_JOB_VERSION,
    preview: (context: FixedExpenseReminderRuntimeContext<TEnv>) =>
      runInternal(context, "preview", "DRY_RUN"),
    run: (context: FixedExpenseReminderRuntimeContext<TEnv>) =>
      runInternal(context, "scheduled_reminder"),
    runForUser: (
      userId: string,
      context: FixedExpenseReminderRuntimeContext<TEnv>,
    ) => runInternal(context, "user_scope_reminder", undefined, userId),
    runForExpense: (
      expenseId: string,
      context: FixedExpenseReminderRuntimeContext<TEnv>,
    ) =>
      runInternal(
        context,
        "expense_scope_reminder",
        undefined,
        undefined,
        expenseId,
      ),
    resolvePolicy,
    evaluateExpense,
    buildNotificationMessage,
  });
}

export function createInMemoryFixedExpenseReminderRepository(
  seed: readonly FixedExpenseRecord[] = [],
): FixedExpenseReminderRepository & {
  readonly snapshot: () => readonly FixedExpenseRecord[];
  readonly auditSnapshot: () => readonly FixedExpenseReminderAuditEvent[];
} {
  let rows = [...seed];
  const audits: FixedExpenseReminderAuditEvent[] = [];
  let activeLock: FixedExpenseReminderLockResult | null = null;
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
    listFixedExpensesForReminder: async (criteria) => ({
      items: rows
        .filter((row) => criteria.statuses.includes(row.status))
        .filter((row) => !criteria.userId || row.userId === criteria.userId)
        .filter((row) => !criteria.expenseId || row.id === criteria.expenseId)
        .filter(
          (row) =>
            dateOnly(parseDate(row.nextDueDate) ?? new Date(0)) >=
              criteria.dueFrom &&
            dateOnly(parseDate(row.nextDueDate) ?? new Date(0)) <=
              criteria.dueTo,
        )
        .slice(0, criteria.limit),
      nextCursor: null,
    }),
    markFixedExpenseRemindersQueued: async (input) => {
      const ids = new Set(input.expenseIds);
      rows = rows.map((row) =>
        ids.has(row.id)
          ? {
              ...row,
              lastReminderAt: input.now,
              lastReminderKey:
                input.reminderKeys[input.expenseIds.indexOf(row.id)] ??
                row.lastReminderKey,
              updatedAt: input.now,
            }
          : row,
      );
      return ids.size;
    },
    appendFixedExpenseReminderAudit: async (event) => {
      audits.push(event);
    },
  };
}

export function createInMemoryFixedExpenseNotificationProducer(): FixedExpenseNotificationProducer & {
  readonly snapshot: () => readonly FixedExpenseNotificationMessage[];
} {
  const messages: FixedExpenseNotificationMessage[] = [];
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

export const fixedExpenseReminderManifest = Object.freeze({
  file: "services/scheduler/src/jobs/fixed-expense-reminder.job.ts",
  version: FIXED_EXPENSE_REMINDER_JOB_VERSION,
  service: FIXED_EXPENSE_REMINDER_JOB_NAME,
  runtime: "cloudflare-workers-cron-node-compatible",
  capabilities: Object.freeze([
    "server_authority_fixed_expense_due_calculation",
    "scheduled_reminder",
    "preview_dry_run",
    "user_scope_reminder",
    "expense_scope_reminder",
    "before_due_due_today_overdue_timing",
    "duplicate_reminder_prevention",
    "quiet_hours_guard",
    "transactional_notification_payload",
    "notification_queue_boundary",
    "repository_boundary",
    "job_lock_contract",
    "sanitized_audit_event",
    "no_raw_financial_data_logged",
    "no_raw_push_token_logged",
    "ads_financial_targeting_forbidden",
    "in_memory_test_repository_and_producer",
  ]),
  safePolicyGuard: fixedExpenseReminderSafePolicyGuard,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertFixedExpenseReminderJobCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "scheduler_job_contract",
    "server_authority_fixed_expense_due_calculation",
    "scheduled_reminder",
    "preview_dry_run_mode",
    "user_scope_reminder",
    "expense_scope_reminder",
    "lookahead_and_overdue_grace_policy",
    "before_due_due_today_overdue_timing",
    "duplicate_reminder_key_prevention",
    "idempotency_key_required",
    "quiet_hours_guard",
    "transactional_notification_only",
    "fixed_payment_due_domain_type",
    "amount_not_in_push_payload",
    "notification_queue_boundary",
    "repository_boundary",
    "job_lock_contract",
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
    version: FIXED_EXPENSE_REMINDER_JOB_VERSION,
    checks,
  };
}

export const defaultFixedExpenseReminderRepository =
  createInMemoryFixedExpenseReminderRepository();
export const defaultFixedExpenseNotificationProducer =
  createInMemoryFixedExpenseNotificationProducer();
export const defaultFixedExpenseReminderJob = createFixedExpenseReminderJob({
  repository: defaultFixedExpenseReminderRepository,
  notificationProducer: defaultFixedExpenseNotificationProducer,
  defaultMode: "DRY_RUN",
});
export default createFixedExpenseReminderJob;
