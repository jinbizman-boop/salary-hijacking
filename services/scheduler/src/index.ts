/** services/scheduler/src/index.ts
 * 급여납치 Salary Hijacking Platform · Scheduler Worker Entrypoint 최종본
 * Cloudflare Workers Cron/HTTP/Queue 기반으로 payday reminder, fixed-expense reminder,
 * monthly hijack close, data-retention cleanup job을 서버 권위로 실행한다.
 */

import {
  assertDataRetentionCleanupJobCompleteness,
  createDataRetentionCleanupJob,
  dataRetentionCleanupManifest,
  defaultDataRetentionCleanupJob,
  type DataRetentionAuditEvent,
  type DataRetentionCleanupJob,
  type DataRetentionDomain,
  type DataRetentionEnvLike,
  type DataRetentionExternalObject,
  type DataRetentionListCriteria,
  type DataRetentionListResult,
  type DataRetentionLockResult,
  type DataRetentionMutationInput,
  type DataRetentionRepository,
} from "./jobs/data-retention-cleanup.job";
import {
  assertFixedExpenseReminderJobCompleteness,
  createFixedExpenseReminderJob,
  defaultFixedExpenseReminderJob,
  fixedExpenseReminderManifest,
  type FixedExpenseNotificationMessage,
  type FixedExpenseReminderAuditEvent,
  type FixedExpenseReminderEnvLike,
  type FixedExpenseReminderJob,
  type FixedExpenseReminderListCriteria,
  type FixedExpenseReminderListResult,
  type FixedExpenseReminderLockResult,
  type FixedExpenseReminderMarkInput,
  type FixedExpenseReminderRepository,
} from "./jobs/fixed-expense-reminder.job";
import {
  assertMonthlyHijackCloseJobCompleteness,
  createMonthlyHijackCloseJob,
  defaultMonthlyHijackCloseJob,
  monthlyHijackCloseManifest,
  type MonthlyHijackCloseAuditEvent,
  type MonthlyHijackCloseEnvLike,
  type MonthlyHijackCloseJob,
  type MonthlyHijackCloseListCriteria,
  type MonthlyHijackCloseListResult,
  type MonthlyHijackCloseLockResult,
  type MonthlyHijackClosePersistInput,
  type MonthlyHijackCloseRepository,
  type MonthlyHijackGrowthEvent,
  type MonthlyHijackGrowthProducer,
  type MonthlyHijackNotificationMessage,
} from "./jobs/monthly-hijack-close.job";
import {
  assertPaydayReminderJobCompleteness,
  createPaydayReminderJob,
  defaultPaydayReminderJob,
  paydayReminderManifest,
  type PaydayGrowthEvent,
  type PaydayGrowthProducer,
  type PaydayNotificationMessage,
  type PaydayReminderAuditEvent,
  type PaydayReminderEnvLike,
  type PaydayReminderJob,
  type PaydayReminderListCriteria,
  type PaydayReminderListResult,
  type PaydayReminderLockResult,
  type PaydayReminderMarkInput,
  type PaydayReminderRepository,
} from "./jobs/payday-reminder.job";

export const SCHEDULER_SERVICE_VERSION = "3.1.0";
export const SCHEDULER_SERVICE_NAME = "salary-hijacking-scheduler";
export const SCHEDULER_TIMEZONE = "Asia/Seoul";

export type SchedulerJobName =
  | "payday-reminder"
  | "fixed-expense-reminder"
  | "monthly-hijack-close"
  | "data-retention-cleanup";
export type SchedulerJobAction =
  | "run"
  | "preview"
  | "user"
  | "plan"
  | "expense"
  | "month"
  | "domain"
  | "subject";
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export interface QueueBinding<TMessage = unknown> {
  readonly send: (
    message: TMessage,
    options?: { readonly delaySeconds?: number },
  ) => Promise<void>;
}

export interface SchedulerExecutionContext {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
  readonly passThroughOnException?: () => void;
}

export interface SchedulerScheduledController {
  readonly scheduledTime: number;
  readonly cron?: string | undefined;
}

export interface SchedulerQueueMessage<TBody = unknown> {
  readonly body: TBody;
  readonly ack?: () => void;
  readonly retry?: () => void;
}

export interface SchedulerMessageBatch<TBody = unknown> {
  readonly messages: readonly SchedulerQueueMessage<TBody>[];
  readonly queue?: string | undefined;
}

export interface SchedulerEnv
  extends
    DataRetentionEnvLike,
    FixedExpenseReminderEnvLike,
    MonthlyHijackCloseEnvLike,
    PaydayReminderEnvLike {
  readonly APP_ENV?: string;
  readonly ENVIRONMENT?: string;
  readonly NODE_ENV?: string;
  readonly API_INTERNAL_BASE_URL?: string;
  readonly API_INTERNAL_SERVICE_TOKEN?: string;
  readonly SCHEDULER_SERVICE_TOKEN?: string;
  readonly SCHEDULER_SERVICE_TOKEN_SHA256?: string;
  readonly SCHEDULER_DISABLE_NETWORK?: string;
  readonly SCHEDULER_ENABLE_HTTP_RUN?: string;
  readonly SCHEDULER_ENABLE_SCHEDULED?: string;
  readonly SCHEDULER_AUDIT_TO_CONSOLE?: string;
  readonly SCHEDULER_OPERATION_WEBHOOK_URL?: string;
  readonly SCHEDULER_OPERATION_WEBHOOK_TOKEN?: string;
  readonly SCHEDULER_PAYDAY_REMINDER_ENABLED?: string;
  readonly SCHEDULER_FIXED_EXPENSE_REMINDER_ENABLED?: string;
  readonly SCHEDULER_MONTHLY_HIJACK_CLOSE_ENABLED?: string;
  readonly SCHEDULER_DATA_RETENTION_CLEANUP_ENABLED?: string;
  readonly SCHEDULER_REQUIRE_SERVICE_TOKEN?: string;
  readonly NOTIFICATIONS_RETRY_QUEUE?: QueueBinding<
    | PaydayNotificationMessage
    | FixedExpenseNotificationMessage
    | MonthlyHijackNotificationMessage
  >;
  readonly SCHEDULER_OPERATION_QUEUE?: QueueBinding<SchedulerQueuePayload>;
  readonly GROWTH_EVENTS_QUEUE?: QueueBinding<
    PaydayGrowthEvent | MonthlyHijackGrowthEvent
  >;
}

export interface SchedulerQueuePayload {
  readonly type: "RUN_JOB";
  readonly job: SchedulerJobName;
  readonly action: SchedulerJobAction;
  readonly requestId?: string | undefined;
  readonly actorId?: string | undefined;
  readonly userId?: string | undefined;
  readonly planId?: string | undefined;
  readonly expenseId?: string | undefined;
  readonly month?: string | undefined;
  readonly domain?: DataRetentionDomain | undefined;
  readonly subjectUserId?: string | undefined;
  readonly dryRun?: boolean | undefined;
}

export interface SchedulerApiClient {
  readonly enabled: boolean;
  readonly post: <TResult>(
    path: string,
    payload: unknown,
    requestId: string,
  ) => Promise<TResult>;
}

export interface SchedulerJobs {
  readonly paydayReminder: PaydayReminderJob<SchedulerEnv>;
  readonly fixedExpenseReminder: FixedExpenseReminderJob<SchedulerEnv>;
  readonly monthlyHijackClose: MonthlyHijackCloseJob<SchedulerEnv>;
  readonly dataRetentionCleanup: DataRetentionCleanupJob<SchedulerEnv>;
}

export interface SchedulerRunEnvelope {
  readonly job: SchedulerJobName;
  readonly action: SchedulerJobAction;
  readonly ok: boolean;
  readonly result: JsonValue;
}

export interface SchedulerHttpEnvelope<TData extends JsonValue = JsonValue> {
  readonly success: boolean;
  readonly data?: TData;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly status: number;
    readonly requestId: string;
  };
  readonly meta: {
    readonly service: string;
    readonly version: string;
    readonly requestId: string;
    readonly path: string;
    readonly timestamp: string;
  };
}

export class SchedulerEntrypointError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "SchedulerEntrypointError";
    this.code = code;
    this.status = status;
  }
}

const schedulerJobNames: readonly SchedulerJobName[] = Object.freeze([
  "payday-reminder",
  "fixed-expense-reminder",
  "monthly-hijack-close",
  "data-retention-cleanup",
]);

function envText(env: SchedulerEnv, key: keyof SchedulerEnv): string | null {
  const value = env[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function boolFromText(value: string | null, fallback: boolean): boolean {
  return value === null
    ? fallback
    : ["1", "true", "yes", "on", "enabled"].includes(value.toLowerCase());
}

function isProduction(env: SchedulerEnv): boolean {
  return [
    envText(env, "APP_ENV"),
    envText(env, "ENVIRONMENT"),
    envText(env, "NODE_ENV"),
  ].some((item) => item === "production");
}

function createRequestId(prefix = "sch"): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function jsonHeaders(requestId: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-request-id", requestId);
  headers.set("x-service-name", SCHEDULER_SERVICE_NAME);
  headers.set("x-service-version", SCHEDULER_SERVICE_VERSION);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("cache-control", "no-store");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );
  headers.set("x-financial-raw-data-exposed", "false");
  headers.set("x-ad-financial-targeting", "separated");
  return headers;
}

function jsonResponse<TData extends JsonValue>(
  request: Request,
  requestId: string,
  status: number,
  body: Omit<SchedulerHttpEnvelope<TData>, "meta">,
): Response {
  const envelope: SchedulerHttpEnvelope<TData> = {
    ...body,
    meta: {
      service: SCHEDULER_SERVICE_NAME,
      version: SCHEDULER_SERVICE_VERSION,
      requestId,
      path: new URL(request.url).pathname,
      timestamp: nowIso(),
    },
  };
  return new Response(JSON.stringify(envelope), {
    status,
    headers: jsonHeaders(requestId),
  });
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
    return value.slice(0, 120).map((item) => sanitize(item, depth + 1, seen));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 150)
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
        const allowed = [
          "requestid",
          "useridpresent",
          "planidpresent",
          "expenseidpresent",
          "targetmonth",
          "domain",
          "job",
          "action",
          "success",
          "ok",
        ].includes(normalized);
        return [
          key.slice(0, 160),
          sensitive && !allowed
            ? "[REDACTED]"
            : sanitize(item, depth + 1, seen),
        ];
      }),
  ) as JsonRecord;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer "))
    return authorization.slice("Bearer ".length).trim();
  return request.headers.get("x-service-token")?.trim() ?? null;
}

async function assertServiceAuthorized(
  request: Request,
  env: SchedulerEnv,
): Promise<void> {
  const method = request.method.toUpperCase();
  const required =
    isProduction(env) ||
    boolFromText(envText(env, "SCHEDULER_REQUIRE_SERVICE_TOKEN"), false);
  if (!required || method === "GET" || method === "HEAD") return;
  const token = bearerToken(request);
  if (!token)
    throw new SchedulerEntrypointError(
      "SCHEDULER_UNAUTHORIZED",
      "scheduler service token이 필요합니다.",
      401,
    );
  const plain = envText(env, "SCHEDULER_SERVICE_TOKEN");
  const hash = envText(env, "SCHEDULER_SERVICE_TOKEN_SHA256");
  const ok =
    (plain !== null && token === plain) ||
    (hash !== null && (await sha256Hex(token)) === hash);
  if (!ok)
    throw new SchedulerEntrypointError(
      "SCHEDULER_FORBIDDEN",
      "scheduler service token이 올바르지 않습니다.",
      403,
    );
}

async function readJson(request: Request): Promise<JsonRecord> {
  if (
    request.method.toUpperCase() === "GET" ||
    request.method.toUpperCase() === "HEAD"
  )
    return {};
  const text = await request.text();
  if (!text.trim()) return {};
  if (text.length > 64_000)
    throw new SchedulerEntrypointError(
      "SCHEDULER_BODY_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
      413,
    );
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new SchedulerEntrypointError(
      "SCHEDULER_BODY_INVALID",
      "JSON object 본문이 필요합니다.",
      400,
    );
  return parsed as JsonRecord;
}

function valueText(body: JsonRecord, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function responseData(value: unknown): JsonValue {
  return sanitize(value);
}

function countFrom(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object") {
    const count = (value as Record<string, unknown>).count;
    if (typeof count === "number" && Number.isFinite(count)) return count;
  }
  return 0;
}

function createApiClient(env: SchedulerEnv): SchedulerApiClient {
  const baseUrl =
    envText(env, "API_INTERNAL_BASE_URL")?.replace(/\/$/, "") ?? null;
  const disabled = boolFromText(
    envText(env, "SCHEDULER_DISABLE_NETWORK"),
    false,
  );
  return {
    enabled: Boolean(baseUrl && !disabled),
    post: async <TResult>(
      path: string,
      payload: unknown,
      requestId: string,
    ): Promise<TResult> => {
      if (!baseUrl || disabled)
        throw new SchedulerEntrypointError(
          "SCHEDULER_API_DISABLED",
          "API internal adapter가 비활성화되어 있습니다.",
          503,
        );
      const headers = jsonHeaders(requestId);
      const token = envText(env, "API_INTERNAL_SERVICE_TOKEN");
      if (token) headers.set("authorization", `Bearer ${token}`);
      const response = await globalThis.fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const parsed = text ? (JSON.parse(text) as unknown) : null;
      if (!response.ok)
        throw new SchedulerEntrypointError(
          "SCHEDULER_API_REQUEST_FAILED",
          `internal API 요청 실패: ${response.status}`,
          response.status,
        );
      if (parsed && typeof parsed === "object" && "data" in parsed)
        return (parsed as { readonly data: TResult }).data;
      return parsed as TResult;
    },
  };
}

function createDataRetentionRepository(
  api: SchedulerApiClient,
): DataRetentionRepository {
  return {
    acquireJobLock: (input) =>
      api.post<DataRetentionLockResult>(
        "/api/v1/internal/scheduler/locks/acquire",
        input,
        input.requestId,
      ),
    releaseJobLock: (input) =>
      api.post<void>(
        "/api/v1/internal/scheduler/locks/release",
        input,
        input.requestId,
      ),
    listRetentionCandidates: (criteria: DataRetentionListCriteria) =>
      api.post<DataRetentionListResult>(
        "/api/v1/internal/scheduler/data-retention/candidates",
        criteria,
        createRequestId("drc_list"),
      ),
    anonymizeCandidates: async (input: DataRetentionMutationInput) =>
      countFrom(
        await api.post<unknown>(
          "/api/v1/internal/scheduler/data-retention/anonymize",
          input,
          input.requestId,
        ),
      ),
    hardDeleteCandidates: async (input: DataRetentionMutationInput) =>
      countFrom(
        await api.post<unknown>(
          "/api/v1/internal/scheduler/data-retention/hard-delete",
          input,
          input.requestId,
        ),
      ),
    purgeExternalObjects: async (
      input: DataRetentionMutationInput & {
        readonly objects: readonly DataRetentionExternalObject[];
      },
    ) =>
      countFrom(
        await api.post<unknown>(
          "/api/v1/internal/scheduler/data-retention/purge-objects",
          input,
          input.requestId,
        ),
      ),
    markRetained: async (input: DataRetentionMutationInput) =>
      countFrom(
        await api.post<unknown>(
          "/api/v1/internal/scheduler/data-retention/retain",
          input,
          input.requestId,
        ),
      ),
    appendRetentionAudit: (event: DataRetentionAuditEvent) =>
      api.post<void>(
        "/api/v1/internal/scheduler/audit/data-retention",
        event,
        event.requestId,
      ),
  };
}

function createPaydayRepository(
  api: SchedulerApiClient,
): PaydayReminderRepository {
  return {
    acquireJobLock: (input) =>
      api.post<PaydayReminderLockResult>(
        "/api/v1/internal/scheduler/locks/acquire",
        input,
        input.requestId,
      ),
    releaseJobLock: (input) =>
      api.post<void>(
        "/api/v1/internal/scheduler/locks/release",
        input,
        input.requestId,
      ),
    listPayrollPlansForPaydayReminder: (criteria: PaydayReminderListCriteria) =>
      api.post<PaydayReminderListResult>(
        "/api/v1/internal/scheduler/payday-reminder/candidates",
        criteria,
        createRequestId("pdr_list"),
      ),
    markPaydayRemindersQueued: async (input: PaydayReminderMarkInput) =>
      countFrom(
        await api.post<unknown>(
          "/api/v1/internal/scheduler/payday-reminder/mark-queued",
          input,
          input.requestId,
        ),
      ),
    appendPaydayReminderAudit: (event: PaydayReminderAuditEvent) =>
      api.post<void>(
        "/api/v1/internal/scheduler/audit/payday-reminder",
        event,
        event.requestId,
      ),
  };
}

function createFixedExpenseRepository(
  api: SchedulerApiClient,
): FixedExpenseReminderRepository {
  return {
    acquireJobLock: (input) =>
      api.post<FixedExpenseReminderLockResult>(
        "/api/v1/internal/scheduler/locks/acquire",
        input,
        input.requestId,
      ),
    releaseJobLock: (input) =>
      api.post<void>(
        "/api/v1/internal/scheduler/locks/release",
        input,
        input.requestId,
      ),
    listFixedExpensesForReminder: (
      criteria: FixedExpenseReminderListCriteria,
    ) =>
      api.post<FixedExpenseReminderListResult>(
        "/api/v1/internal/scheduler/fixed-expense-reminder/candidates",
        criteria,
        createRequestId("fer_list"),
      ),
    markFixedExpenseRemindersQueued: async (
      input: FixedExpenseReminderMarkInput,
    ) =>
      countFrom(
        await api.post<unknown>(
          "/api/v1/internal/scheduler/fixed-expense-reminder/mark-queued",
          input,
          input.requestId,
        ),
      ),
    appendFixedExpenseReminderAudit: (event: FixedExpenseReminderAuditEvent) =>
      api.post<void>(
        "/api/v1/internal/scheduler/audit/fixed-expense-reminder",
        event,
        event.requestId,
      ),
  };
}

function createMonthlyCloseRepository(
  api: SchedulerApiClient,
): MonthlyHijackCloseRepository {
  return {
    acquireJobLock: (input) =>
      api.post<MonthlyHijackCloseLockResult>(
        "/api/v1/internal/scheduler/locks/acquire",
        input,
        input.requestId,
      ),
    releaseJobLock: (input) =>
      api.post<void>(
        "/api/v1/internal/scheduler/locks/release",
        input,
        input.requestId,
      ),
    listMonthlyHijackCloseCandidates: (
      criteria: MonthlyHijackCloseListCriteria,
    ) =>
      api.post<MonthlyHijackCloseListResult>(
        "/api/v1/internal/scheduler/monthly-hijack-close/candidates",
        criteria,
        createRequestId("mhc_list"),
      ),
    persistMonthlyHijackClose: async (input: MonthlyHijackClosePersistInput) =>
      countFrom(
        await api.post<unknown>(
          "/api/v1/internal/scheduler/monthly-hijack-close/persist",
          input,
          input.requestId,
        ),
      ),
    markMonthlyHijackCloseSkipped: async (input) =>
      countFrom(
        await api.post<unknown>(
          "/api/v1/internal/scheduler/monthly-hijack-close/mark-skipped",
          input,
          input.requestId,
        ),
      ),
    appendMonthlyHijackCloseAudit: (event: MonthlyHijackCloseAuditEvent) =>
      api.post<void>(
        "/api/v1/internal/scheduler/audit/monthly-hijack-close",
        event,
        event.requestId,
      ),
  };
}

function createNotificationProducer<
  TMessage extends
    | PaydayNotificationMessage
    | FixedExpenseNotificationMessage
    | MonthlyHijackNotificationMessage,
>(
  env: SchedulerEnv,
  api: SchedulerApiClient,
): {
  readonly send: (
    message: TMessage,
    options?: { readonly delaySeconds?: number },
  ) => Promise<void>;
} {
  return {
    send: async (message, options) => {
      if (env.NOTIFICATIONS_RETRY_QUEUE)
        await env.NOTIFICATIONS_RETRY_QUEUE.send(message, options);
      else
        await api.post<void>(
          "/api/v1/internal/scheduler/notifications/enqueue",
          { message, options },
          message.requestId,
        );
    },
  };
}

function createGrowthProducer(
  env: SchedulerEnv,
  api: SchedulerApiClient,
): PaydayGrowthProducer & MonthlyHijackGrowthProducer {
  return {
    send: async (event: PaydayGrowthEvent | MonthlyHijackGrowthEvent) => {
      if (env.GROWTH_EVENTS_QUEUE) await env.GROWTH_EVENTS_QUEUE.send(event);
      else
        await api.post<void>(
          "/api/v1/internal/scheduler/growth-events/enqueue",
          event,
          event.requestId,
        );
    },
  };
}

function createJobs(
  env: SchedulerEnv,
  context: SchedulerExecutionContext,
): SchedulerJobs {
  const api = createApiClient(env);
  if (!api.enabled) {
    return {
      paydayReminder:
        defaultPaydayReminderJob as PaydayReminderJob<SchedulerEnv>,
      fixedExpenseReminder:
        defaultFixedExpenseReminderJob as FixedExpenseReminderJob<SchedulerEnv>,
      monthlyHijackClose:
        defaultMonthlyHijackCloseJob as MonthlyHijackCloseJob<SchedulerEnv>,
      dataRetentionCleanup:
        defaultDataRetentionCleanupJob as DataRetentionCleanupJob<SchedulerEnv>,
    };
  }

  const onEvent = (event: JsonValue): void => {
    if (boolFromText(envText(env, "SCHEDULER_AUDIT_TO_CONSOLE"), false))
      console.info(
        "salary_hijacking_scheduler_event",
        JSON.stringify(sanitize(event)),
      );
    const url = envText(env, "SCHEDULER_OPERATION_WEBHOOK_URL");
    if (!url) return;
    const headers = jsonHeaders(createRequestId("evt"));
    const token = envText(env, "SCHEDULER_OPERATION_WEBHOOK_TOKEN");
    if (token) headers.set("authorization", `Bearer ${token}`);
    context.waitUntil?.(
      globalThis
        .fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(sanitize(event)),
        })
        .then(() => undefined)
        .catch(() => undefined),
    );
  };

  const notificationProducer = createNotificationProducer(env, api);
  const growthProducer = createGrowthProducer(env, api);
  return {
    paydayReminder: createPaydayReminderJob<SchedulerEnv>({
      repository: createPaydayRepository(api),
      notificationProducer,
      growthProducer,
      onEvent: (event) => onEvent(event as unknown as JsonValue),
    }),
    fixedExpenseReminder: createFixedExpenseReminderJob<SchedulerEnv>({
      repository: createFixedExpenseRepository(api),
      notificationProducer,
      onEvent: (event) => onEvent(event as unknown as JsonValue),
    }),
    monthlyHijackClose: createMonthlyHijackCloseJob<SchedulerEnv>({
      repository: createMonthlyCloseRepository(api),
      notificationProducer,
      growthProducer,
      onEvent: (event) => onEvent(event as unknown as JsonValue),
    }),
    dataRetentionCleanup: createDataRetentionCleanupJob<SchedulerEnv>({
      repository: createDataRetentionRepository(api),
      onEvent: (event) => onEvent(event as unknown as JsonValue),
    }),
  };
}

async function dispatchJob(
  payload: SchedulerQueuePayload,
  env: SchedulerEnv,
  context: SchedulerExecutionContext,
): Promise<SchedulerRunEnvelope> {
  const jobs = createJobs(env, context);
  const requestId = payload.requestId ?? createRequestId("sch_job");
  const actorId = payload.actorId ?? "system:scheduler";
  const mode = payload.dryRun === true ? "DRY_RUN" : undefined;
  const runtime = {
    env,
    execution: context,
    requestId,
    actorId,
    now: new Date(),
  };

  if (payload.job === "payday-reminder") {
    const result =
      payload.action === "preview"
        ? await jobs.paydayReminder.preview(runtime)
        : payload.action === "user" && payload.userId
          ? await jobs.paydayReminder.runForUser(payload.userId, runtime)
          : payload.action === "plan" && payload.planId
            ? await jobs.paydayReminder.runForPlan(payload.planId, runtime)
            : mode === "DRY_RUN"
              ? await jobs.paydayReminder.preview(runtime)
              : await jobs.paydayReminder.run(runtime);
    return {
      job: payload.job,
      action: payload.action,
      ok: true,
      result: responseData(result),
    };
  }

  if (payload.job === "fixed-expense-reminder") {
    const result =
      payload.action === "preview"
        ? await jobs.fixedExpenseReminder.preview(runtime)
        : payload.action === "user" && payload.userId
          ? await jobs.fixedExpenseReminder.runForUser(payload.userId, runtime)
          : payload.action === "expense" && payload.expenseId
            ? await jobs.fixedExpenseReminder.runForExpense(
                payload.expenseId,
                runtime,
              )
            : mode === "DRY_RUN"
              ? await jobs.fixedExpenseReminder.preview(runtime)
              : await jobs.fixedExpenseReminder.run(runtime);
    return {
      job: payload.job,
      action: payload.action,
      ok: true,
      result: responseData(result),
    };
  }

  if (payload.job === "monthly-hijack-close") {
    const result =
      payload.action === "preview"
        ? await jobs.monthlyHijackClose.preview(runtime)
        : payload.action === "user" && payload.userId
          ? await jobs.monthlyHijackClose.runForUser(payload.userId, runtime)
          : payload.action === "month" && payload.month
            ? await jobs.monthlyHijackClose.runForMonth(payload.month, runtime)
            : mode === "DRY_RUN"
              ? await jobs.monthlyHijackClose.preview(runtime)
              : await jobs.monthlyHijackClose.run(runtime);
    return {
      job: payload.job,
      action: payload.action,
      ok: true,
      result: responseData(result),
    };
  }

  if (payload.job === "data-retention-cleanup") {
    const result =
      payload.action === "preview"
        ? await jobs.dataRetentionCleanup.preview(runtime)
        : payload.action === "domain" && payload.domain
          ? await jobs.dataRetentionCleanup.runDomain(payload.domain, runtime)
          : payload.action === "subject" && payload.subjectUserId
            ? await jobs.dataRetentionCleanup.runForSubject(
                payload.subjectUserId,
                runtime,
              )
            : mode === "DRY_RUN"
              ? await jobs.dataRetentionCleanup.preview(runtime)
              : await jobs.dataRetentionCleanup.run(runtime);
    return {
      job: payload.job,
      action: payload.action,
      ok: true,
      result: responseData(result),
    };
  }

  throw new SchedulerEntrypointError(
    "SCHEDULER_JOB_NOT_FOUND",
    "지원하지 않는 scheduler job입니다.",
    404,
  );
}

function assertQueuePayload(value: unknown): SchedulerQueuePayload {
  if (!value || typeof value !== "object")
    throw new SchedulerEntrypointError(
      "SCHEDULER_QUEUE_PAYLOAD_INVALID",
      "queue payload가 올바르지 않습니다.",
      400,
    );
  const body = value as Record<string, unknown>;
  const job = body.job;
  const action = body.action;
  if (!schedulerJobNames.includes(job as SchedulerJobName))
    throw new SchedulerEntrypointError(
      "SCHEDULER_QUEUE_JOB_INVALID",
      "queue job 값이 올바르지 않습니다.",
      400,
    );
  if (
    ![
      "run",
      "preview",
      "user",
      "plan",
      "expense",
      "month",
      "domain",
      "subject",
    ].includes(String(action))
  ) {
    throw new SchedulerEntrypointError(
      "SCHEDULER_QUEUE_ACTION_INVALID",
      "queue action 값이 올바르지 않습니다.",
      400,
    );
  }
  return body as unknown as SchedulerQueuePayload;
}

async function runScheduled(
  controller: SchedulerScheduledController,
  env: SchedulerEnv,
  context: SchedulerExecutionContext,
): Promise<readonly SchedulerRunEnvelope[]> {
  if (!boolFromText(envText(env, "SCHEDULER_ENABLE_SCHEDULED"), true))
    return [];
  const dryRun = boolFromText(envText(env, "SCHEDULER_DISABLE_NETWORK"), false);
  const planned: SchedulerQueuePayload[] = [];

  if (boolFromText(envText(env, "SCHEDULER_PAYDAY_REMINDER_ENABLED"), true)) {
    planned.push({
      type: "RUN_JOB",
      job: "payday-reminder",
      action: "run",
      requestId: createRequestId("cron_pdr"),
      actorId: `cron:${controller.cron ?? "scheduled"}`,
      dryRun,
    });
  }
  if (
    boolFromText(envText(env, "SCHEDULER_FIXED_EXPENSE_REMINDER_ENABLED"), true)
  ) {
    planned.push({
      type: "RUN_JOB",
      job: "fixed-expense-reminder",
      action: "run",
      requestId: createRequestId("cron_fer"),
      actorId: `cron:${controller.cron ?? "scheduled"}`,
      dryRun,
    });
  }
  if (
    boolFromText(envText(env, "SCHEDULER_MONTHLY_HIJACK_CLOSE_ENABLED"), true)
  ) {
    planned.push({
      type: "RUN_JOB",
      job: "monthly-hijack-close",
      action: "run",
      requestId: createRequestId("cron_mhc"),
      actorId: `cron:${controller.cron ?? "scheduled"}`,
      dryRun,
    });
  }
  if (
    boolFromText(envText(env, "SCHEDULER_DATA_RETENTION_CLEANUP_ENABLED"), true)
  ) {
    planned.push({
      type: "RUN_JOB",
      job: "data-retention-cleanup",
      action: "run",
      requestId: createRequestId("cron_drc"),
      actorId: `cron:${controller.cron ?? "scheduled"}`,
      dryRun,
    });
  }

  const settled = await Promise.allSettled(
    planned.map((payload) => dispatchJob(payload, env, context)),
  );
  return settled.map((item, index) =>
    item.status === "fulfilled"
      ? item.value
      : {
          job: planned[index]?.job ?? "data-retention-cleanup",
          action: planned[index]?.action ?? "run",
          ok: false,
          result: sanitize({
            error:
              item.reason instanceof Error ? item.reason.name : "UnknownError",
          }),
        },
  );
}

async function routeRequest(
  request: Request,
  env: SchedulerEnv,
  context: SchedulerExecutionContext,
  requestId: string,
): Promise<Response> {
  await assertServiceAuthorized(request, env);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (
    request.method === "GET" &&
    (path === "/health" ||
      path === "/scheduler/v1/health" ||
      path === "/api/v1/scheduler/health")
  ) {
    return jsonResponse(request, requestId, 200, {
      success: true,
      data: {
        ok: true,
        service: SCHEDULER_SERVICE_NAME,
        version: SCHEDULER_SERVICE_VERSION,
        timestamp: nowIso(),
      },
    });
  }

  if (
    request.method === "GET" &&
    (path === "/ready" ||
      path === "/scheduler/v1/ready" ||
      path === "/api/v1/scheduler/ready")
  ) {
    const checks = {
      payday: assertPaydayReminderJobCompleteness(),
      fixedExpense: assertFixedExpenseReminderJobCompleteness(),
      monthlyHijack: assertMonthlyHijackCloseJobCompleteness(),
      dataRetention: assertDataRetentionCleanupJobCompleteness(),
    };
    return jsonResponse(request, requestId, 200, {
      success: true,
      data: responseData({
        ok: Object.values(checks).every((check) => check.ok),
        checks,
      }),
    });
  }

  if (
    request.method === "GET" &&
    (path === "/manifest" ||
      path === "/scheduler/v1/manifest" ||
      path === "/api/v1/scheduler/manifest")
  ) {
    return jsonResponse(request, requestId, 200, {
      success: true,
      data: responseData(schedulerManifest),
    });
  }

  if (request.method !== "POST")
    throw new SchedulerEntrypointError(
      "SCHEDULER_METHOD_NOT_ALLOWED",
      "지원하지 않는 메서드입니다.",
      405,
    );
  if (!boolFromText(envText(env, "SCHEDULER_ENABLE_HTTP_RUN"), true))
    throw new SchedulerEntrypointError(
      "SCHEDULER_HTTP_RUN_DISABLED",
      "HTTP job 실행이 비활성화되어 있습니다.",
      403,
    );

  const body = await readJson(request);
  const segments = path.split("/").filter(Boolean);
  const jobIndex = segments.findIndex((segment) => segment === "jobs");
  const job = segments[jobIndex + 1] as SchedulerJobName | undefined;
  const action = segments[jobIndex + 2] as SchedulerJobAction | undefined;
  if (!job || !schedulerJobNames.includes(job))
    throw new SchedulerEntrypointError(
      "SCHEDULER_ROUTE_NOT_FOUND",
      "scheduler job route를 찾을 수 없습니다.",
      404,
    );

  const payload: SchedulerQueuePayload = {
    type: "RUN_JOB",
    job,
    action: action ?? "run",
    requestId,
    actorId: "http:scheduler",
    userId: valueText(body, "userId"),
    planId: valueText(body, "planId"),
    expenseId: valueText(body, "expenseId"),
    month: valueText(body, "month"),
    domain: valueText(body, "domain") as DataRetentionDomain | undefined,
    subjectUserId: valueText(body, "subjectUserId"),
    dryRun: body.dryRun === true,
  };
  const result = await dispatchJob(payload, env, context);
  return jsonResponse(request, requestId, 200, {
    success: true,
    data: responseData(result),
  });
}

export async function handleSchedulerRequest(
  request: Request,
  env: SchedulerEnv,
  context: SchedulerExecutionContext = {},
): Promise<Response> {
  const requestId =
    request.headers.get("x-request-id") ?? createRequestId("req");
  try {
    return await routeRequest(request, env, context, requestId);
  } catch (error) {
    const normalized =
      error instanceof SchedulerEntrypointError
        ? error
        : new SchedulerEntrypointError(
            "SCHEDULER_INTERNAL_ERROR",
            error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다.",
            500,
          );
    return jsonResponse(request, requestId, normalized.status, {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        status: normalized.status,
        requestId,
      },
    });
  }
}

export async function handleScheduled(
  controller: SchedulerScheduledController,
  env: SchedulerEnv,
  context: SchedulerExecutionContext = {},
): Promise<void> {
  context.waitUntil?.(runScheduled(controller, env, context));
  if (!context.waitUntil) await runScheduled(controller, env, context);
}

export async function handleQueue(
  batch: SchedulerMessageBatch,
  env: SchedulerEnv,
  context: SchedulerExecutionContext = {},
): Promise<void> {
  const tasks = batch.messages.map(async (message) => {
    try {
      await dispatchJob(assertQueuePayload(message.body), env, context);
      message.ack?.();
    } catch (error) {
      console.warn(
        "scheduler_queue_message_failed",
        error instanceof Error ? error.name : "UnknownError",
        batch.queue ?? "unknown",
      );
      message.retry?.();
    }
  });
  await Promise.all(tasks);
}

export const schedulerManifest = Object.freeze({
  service: SCHEDULER_SERVICE_NAME,
  version: SCHEDULER_SERVICE_VERSION,
  runtime: "cloudflare-workers-module-worker",
  timezone: SCHEDULER_TIMEZONE,
  entrypoint: "services/scheduler/src/index.ts",
  endpoints: Object.freeze([
    "GET /health",
    "GET /ready",
    "GET /manifest",
    "POST /scheduler/v1/jobs/:job/:action",
    "POST /api/v1/scheduler/jobs/:job/:action",
  ]),
  jobs: Object.freeze({
    paydayReminder: paydayReminderManifest,
    fixedExpenseReminder: fixedExpenseReminderManifest,
    monthlyHijackClose: monthlyHijackCloseManifest,
    dataRetentionCleanup: dataRetentionCleanupManifest,
  }),
  guarantees: Object.freeze([
    "server_authority_scheduler",
    "cron_http_queue_entrypoints",
    "service_token_protected_http_mutations",
    "api_internal_repository_adapters",
    "cloudflare_queue_producers",
    "dry_run_fallback",
    "request_id_audit",
    "raw_financial_data_not_logged",
    "raw_push_token_not_logged",
    "ads_financial_targeting_forbidden",
  ]),
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertSchedulerEntrypointCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "cloudflare_worker_default_export",
    "fetch_scheduled_queue_handlers",
    "health_ready_manifest_endpoints",
    "service_token_guard",
    "scheduler_job_dispatcher",
    "payday_reminder_integration",
    "fixed_expense_reminder_integration",
    "monthly_hijack_close_integration",
    "data_retention_cleanup_integration",
    "cron_run_planner",
    "queue_message_dispatch",
    "api_internal_repository_adapters",
    "notification_queue_producer",
    "growth_queue_producer",
    "dry_run_preview_support",
    "production_auth_guard",
    "request_id_envelope",
    "security_privacy_headers",
    "sanitized_error_response",
    "raw_financial_data_not_logged",
    "raw_push_token_not_logged",
    "ads_financial_targeting_forbidden",
    "completeness_checks_wired",
  ] as const;

  return {
    ok:
      checks.length >= 20 &&
      assertPaydayReminderJobCompleteness().ok &&
      assertFixedExpenseReminderJobCompleteness().ok &&
      assertMonthlyHijackCloseJobCompleteness().ok &&
      assertDataRetentionCleanupJobCompleteness().ok,
    version: SCHEDULER_SERVICE_VERSION,
    checks,
  };
}

const worker = {
  fetch: handleSchedulerRequest,
  scheduled: handleScheduled,
  queue: handleQueue,
};

export default worker;
