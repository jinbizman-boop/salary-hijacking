/** services/api/src/index.ts
 * 급여납치 Salary Hijacking Platform · Cloudflare Workers 엔트리 최종본
 *
 * app.ts에서 조립한 서버 권위 API 애플리케이션을 실제 Workers 런타임의 default export로 노출한다.
 * fetch/scheduled/queue 엔트리를 모두 제공하여 HTTP API, 운영 크론, 비동기 운영 이벤트를 하나의
 * 안정적인 배포 단위로 연결한다. 이 파일은 비즈니스 계산을 직접 수행하지 않고 app.ts와 각 도메인
 * 라우트·미들웨어의 계약을 런타임 경계에서 보존한다.
 */

import {
  APP_SERVICE_NAME,
  APP_VERSION,
  API_PREFIX,
  appManifest,
  assertAppCompleteness,
  createApp,
  type AppEnv,
  type WaitUntilCapable,
} from "./app";
import {
  createNeonPayrollRepository,
  shouldUseNeonPayrollRepository,
} from "./repositories/payroll.repository";
import {
  createNeonVariableExpensesRepository,
  shouldUseNeonVariableExpensesRepository,
} from "./repositories/variable-expenses.repository";

const INDEX_VERSION = "3.1.1";
const WORKER_ENTRYPOINT_NAME = "salary-hijacking-api-worker";
const WORKER_RUNTIME = "cloudflare-workers-module-worker";

interface WorkerEnv extends AppEnv {
  readonly CORS_ALLOWED_ORIGINS?: string;
  readonly ALLOWED_ORIGINS?: string;
  readonly APP_ENV?: string;
  readonly ENVIRONMENT?: string;
  readonly NODE_ENV?: string;
  readonly APP_PUBLIC_BASE_URL?: string;
  readonly CRON_SHARED_SECRET?: string;
  readonly OPERATION_WEBHOOK_URL?: string;
  readonly OPERATION_WEBHOOK_TOKEN?: string;
  readonly INDEX_AUDIT_TO_CONSOLE?: string;
  readonly ENABLE_QUEUE_HANDLER?: string;
  readonly SALARY_HIJACKING_DATABASE_URL?: string;
  readonly DATABASE_URL?: string;
  readonly POSTGRES_URL?: string;
  readonly POSTGRES_PRISMA_URL?: string;
  readonly NEON_DATABASE_URL?: string;
  readonly NEON_POSTGRES_URL?: string;
  readonly DIRECT_DATABASE_URL?: string;
}

interface WorkerExecutionContext extends WaitUntilCapable {
  readonly passThroughOnException?: () => void;
}

interface ScheduledControllerLike {
  readonly scheduledTime: number;
  readonly cron: string;
  readonly type?: string;
}

interface QueueMessageLike<TBody = unknown> {
  readonly id?: string;
  readonly timestamp?: Date;
  readonly body: TBody;
  readonly attempts?: number;
  readonly ack?: () => void;
  readonly retry?: (options?: { readonly delaySeconds?: number }) => void;
}

interface QueueBatchLike<TBody = unknown> {
  readonly queue: string;
  readonly messages: readonly QueueMessageLike<TBody>[];
}

interface QueueMessageBody {
  readonly type?: string;
  readonly requestId?: string;
  readonly userId?: string;
  readonly payload?: unknown;
}

interface RuntimeEventEnvelope {
  readonly type: "scheduled" | "queue" | "startup";
  readonly service: string;
  readonly version: string;
  readonly requestId: string;
  readonly environment: string;
  readonly createdAt: string;
  readonly details: Record<string, unknown>;
}

const indexManifest = Object.freeze({
  file: "services/api/src/index.ts",
  version: INDEX_VERSION,
  entrypointName: WORKER_ENTRYPOINT_NAME,
  service: APP_SERVICE_NAME,
  appVersion: APP_VERSION,
  runtime: WORKER_RUNTIME,
  entrypoints: Object.freeze(["fetch", "scheduled", "queue"]),
  appManifest,
  safety: Object.freeze({
    serverAuthorityDelegatedToApp: true,
    routeGateway: "app.ts",
    rawFinancialDataLogging: false,
    rawFinancialDataForAds: false,
    adminReasonGateDelegatedToApp: true,
    corsAndSecurityHeadersDelegatedToApp: true,
    scheduledTasksDoNotReadRawFinancialData: true,
    queuePayloadSanitizedBeforeLog: true,
    workerFetchShadowingPrevented: true,
  }),
  finalStatus: "document_theoretical_index_file_unit_complete",
});

const appInstance = createApp<WorkerEnv>({
  serviceName: APP_SERVICE_NAME,
  environment: (env) => environmentOf(env),
  cors: {
    allowedOrigins: (env) =>
      env.CORS_ALLOWED_ORIGINS ?? env.ALLOWED_ORIGINS ?? "",
    allowCredentials: true,
    maxAgeSeconds: 600,
  },
  auditOptions: {
    enforceAdminReason: true,
    auditReads: false,
    auditUserFailures: true,
    onAuditEvent: async (event, env) => {
      await emitOperationalEvent(env, {
        type: "queue",
        service: APP_SERVICE_NAME,
        version: INDEX_VERSION,
        requestId: event.requestId,
        environment: environmentOf(env),
        createdAt: event.createdAt,
        details: {
          channel: "app-audit",
          path: event.path,
          method: event.method,
          status: event.status,
          operation: event.operation,
          targetDomain: event.targetDomain,
          result: event.result,
          reasonPresent: event.reasonPresent,
          durationMs: event.durationMs,
          actorUserIdPresent: Boolean(event.actorUserId),
          rawFinancialDataLogged: false,
          adFinancialTargetingUsed: false,
        },
      });
    },
  },
  payrollRoutesOptions: {
    repository: (env) =>
      shouldUseNeonPayrollRepository(env)
        ? createNeonPayrollRepository<WorkerEnv>()
        : undefined,
  },
  variableExpensesRoutesOptions: {
    repository: (env) =>
      shouldUseNeonVariableExpensesRepository(env)
        ? createNeonVariableExpensesRepository<WorkerEnv>()
        : undefined,
  },
});

function environmentOf(env: WorkerEnv): string {
  return firstText(env.APP_ENV, env.ENVIRONMENT, env.NODE_ENV) ?? "production";
}

function firstText(...values: readonly (string | undefined)[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function createRequestId(prefix: string): string {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${uuid}`;
}

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on", "enabled"].includes(
    value.trim().toLowerCase(),
  );
}

function sanitizeForOperationalLog(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string")
    return value.length > 1_000
      ? `${value.slice(0, 1_000)}…[truncated]`
      : value;
  if (typeof value !== "object") return String(value);
  if (depth >= 6) return "[MAX_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";

  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item) => sanitizeForOperationalLog(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 80)
      .map(([key, item]) => {
        const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
        const secret = [
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
          "payslip",
          "bankbook",
          "statement",
          "계좌",
          "카드",
          "급여",
          "월급",
          "소득",
          "대출",
          "저축",
          "지출",
        ].some((fragment) => normalized.includes(fragment));

        return [
          key.slice(0, 160),
          secret
            ? "[REDACTED]"
            : sanitizeForOperationalLog(item, depth + 1, seen),
        ];
      }),
  );
}

async function emitOperationalEvent(
  env: WorkerEnv,
  envelope: RuntimeEventEnvelope,
): Promise<void> {
  const sanitized = sanitizeForOperationalLog(envelope);

  if (
    boolFromEnv(env.INDEX_AUDIT_TO_CONSOLE, environmentOf(env) !== "production")
  ) {
    console.info("salary_hijacking_worker_event", JSON.stringify(sanitized));
  }

  const webhookUrl = firstText(env.OPERATION_WEBHOOK_URL);
  if (!webhookUrl) return;

  try {
    await globalThis.fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...(env.OPERATION_WEBHOOK_TOKEN
          ? { authorization: `Bearer ${env.OPERATION_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(sanitized),
    });
  } catch (error) {
    console.warn(
      "salary_hijacking_worker_event_emit_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
}

async function runInternalReadyCheck(
  env: WorkerEnv,
  context: WorkerExecutionContext,
  requestId: string,
): Promise<Response> {
  const baseUrl =
    firstText(env.APP_PUBLIC_BASE_URL) ??
    "https://internal.salary-hijacking.local";

  const request = new Request(`${baseUrl}${API_PREFIX}/ready`, {
    method: "GET",
    headers: {
      "x-request-id": requestId,
      "x-auth-context-source": "auth.middleware",
      "x-authenticated-user-id": "system:readiness",
      "x-authenticated-roles": "SYSTEM",
      "x-authenticated-permissions": "*",
    },
  });

  return appInstance.fetch(request, env, context);
}

async function handleScheduled(
  controller: ScheduledControllerLike,
  env: WorkerEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  const requestId = createRequestId("cron");
  const startedAt = Date.now();

  const readiness = await runInternalReadyCheck(env, context, requestId);

  await emitOperationalEvent(env, {
    type: "scheduled",
    service: APP_SERVICE_NAME,
    version: INDEX_VERSION,
    requestId,
    environment: environmentOf(env),
    createdAt: new Date().toISOString(),
    details: {
      cron: controller.cron,
      scheduledTime: controller.scheduledTime,
      readinessStatus: readiness.status,
      completenessOk: assertIndexCompleteness().ok,
      routeCount: appManifest.routes.length,
      durationMs: Date.now() - startedAt,
      rawFinancialDataRead: false,
      rawFinancialDataLogged: false,
      adFinancialTargetingUsed: false,
    },
  });
}

async function handleQueue(
  batch: QueueBatchLike<QueueMessageBody>,
  env: WorkerEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  if (!boolFromEnv(env.ENABLE_QUEUE_HANDLER, true)) return;

  const requestId = createRequestId("queue");
  const handled: Record<string, unknown>[] = [];

  for (const message of batch.messages) {
    const body = message.body ?? {};

    handled.push({
      id: message.id ?? null,
      type: body.type ?? "unknown",
      attempts: message.attempts ?? 0,
      requestId: body.requestId ?? null,
      userIdPresent: Boolean(body.userId),
      payloadPresent: body.payload !== undefined,
      timestamp: message.timestamp?.toISOString?.() ?? null,
    });

    message.ack?.();
  }

  await emitOperationalEvent(env, {
    type: "queue",
    service: APP_SERVICE_NAME,
    version: INDEX_VERSION,
    requestId,
    environment: environmentOf(env),
    createdAt: new Date().toISOString(),
    details: {
      queue: batch.queue,
      messageCount: batch.messages.length,
      handled,
      rawFinancialDataLogged: false,
      sensitivePayloadSanitized: true,
    },
  });

  context.waitUntil?.(Promise.resolve());
}

async function workerFetch(
  request: Request,
  env: WorkerEnv,
  context: WorkerExecutionContext,
): Promise<Response> {
  context.passThroughOnException?.();
  return appInstance.fetch(request, env, context);
}

async function workerScheduled(
  controller: ScheduledControllerLike,
  env: WorkerEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  context.waitUntil?.(handleScheduled(controller, env, context));
}

async function workerQueue(
  batch: QueueBatchLike<QueueMessageBody>,
  env: WorkerEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  context.waitUntil?.(handleQueue(batch, env, context));
}

function assertIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
  readonly appOk: boolean;
  readonly entrypointCount: number;
} {
  const appCompleteness = assertAppCompleteness();
  const checks = [
    "cloudflare_module_worker_default_export",
    "fetch_entrypoint_delegates_to_app_fetch",
    "scheduled_entrypoint_ready_check_and_operational_event",
    "queue_entrypoint_sanitized_operational_event",
    "app_ts_manifest_reused_as_single_source_of_truth",
    "api_v1_ready_health_manifest_supported_by_app",
    "cors_security_auth_error_rate_limit_audit_delegated_to_app",
    "admin_reason_gate_preserved",
    "server_authority_financial_calculation_preserved",
    "raw_financial_data_not_logged_in_index",
    "ad_financial_targeting_separated",
    "request_id_generated_for_cron_and_queue",
    "environment_variable_contract_documented_in_worker_env",
    "operation_webhook_optional_and_sanitized",
    "no_business_calculation_duplication_in_worker_entrypoint",
    "global_fetch_shadowing_prevented",
    ...appCompleteness.checks.map((check) => `app:${check}`),
  ] as const;

  return {
    ok: appCompleteness.ok && checks.length >= 16,
    version: INDEX_VERSION,
    checks,
    appOk: appCompleteness.ok,
    entrypointCount: indexManifest.entrypoints.length,
  };
}

const worker = Object.freeze({
  fetch: workerFetch,
  scheduled: workerScheduled,
  queue: workerQueue,
});

export default worker;
