/**
 * PHASE 5 API entrypoint.
 *
 * Keeps the proven HTTP/scheduled API worker intact while giving the existing
 * operations Queue one narrowly-scoped runtime responsibility: consume
 * hash-only invalid push-token cleanup events emitted by the notifications
 * worker and invoke the staging/production-safe DB function introduced by
 * migration 0021. Raw push tokens are never accepted by this boundary.
 */

import baseWorker from "./index";
import type { AppEnv, WaitUntilCapable } from "./app";

export const PHASE5_API_ENTRYPOINT_VERSION = "1.0.0";
export const PUSH_TOKEN_INVALIDATED_EVENT = "PUSH_TOKEN_INVALIDATED";

interface Phase5ApiEnv extends AppEnv {
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

interface PushTokenCleanupPayload {
  readonly tokenHash: string;
  readonly providerErrorCode: string;
  readonly notificationId?: string;
  readonly httpStatus?: number;
}

interface PushTokenCleanupMessage {
  readonly schemaVersion?: number;
  readonly eventId?: string;
  readonly occurredAt?: string;
  readonly correlationId?: string;
  readonly idempotencyKey?: string;
  readonly type: typeof PUSH_TOKEN_INVALIDATED_EVENT;
  readonly requestId: string;
  readonly payload: PushTokenCleanupPayload;
}

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

const DATABASE_URL_ENV_KEYS = [
  "SALARY_HIJACKING_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "NEON_DATABASE_URL",
  "NEON_POSTGRES_URL",
  "DIRECT_DATABASE_URL",
] as const;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function databaseUrl(env: Phase5ApiEnv): string {
  const source = env as unknown as Record<string, unknown>;
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = text(source[key]);
    if (value) return value;
  }
  throw new Error("PHASE5_PUSH_CLEANUP_DATABASE_URL_MISSING");
}

function parseCleanupMessage(value: unknown): PushTokenCleanupMessage | null {
  const source = record(value);
  if (!source || source.type !== PUSH_TOKEN_INVALIDATED_EVENT) return null;

  const requestId = text(source.requestId);
  const payload = record(source.payload);
  const tokenHash = text(payload?.tokenHash)?.replace(/^sha256:/i, "").toLowerCase();
  const providerErrorCode = text(payload?.providerErrorCode);

  if (!requestId || !/^[A-Za-z0-9._:/-]{1,160}$/.test(requestId)) {
    throw new Error("PHASE5_PUSH_CLEANUP_REQUEST_ID_INVALID");
  }
  if (!tokenHash || !/^[0-9a-f]{64}$/.test(tokenHash)) {
    throw new Error("PHASE5_PUSH_CLEANUP_TOKEN_HASH_INVALID");
  }
  if (!providerErrorCode || providerErrorCode.length > 160) {
    throw new Error("PHASE5_PUSH_CLEANUP_PROVIDER_ERROR_INVALID");
  }

  const notificationId = text(payload?.notificationId);
  const httpStatus = payload?.httpStatus;

  return {
    type: PUSH_TOKEN_INVALIDATED_EVENT,
    requestId,
    payload: {
      tokenHash,
      providerErrorCode,
      ...(notificationId ? { notificationId } : {}),
      ...(typeof httpStatus === "number" && Number.isInteger(httpStatus)
        ? { httpStatus }
        : {}),
    },
    ...(typeof source.schemaVersion === "number"
      ? { schemaVersion: source.schemaVersion }
      : {}),
    ...(text(source.eventId) ? { eventId: text(source.eventId) ?? undefined } : {}),
    ...(text(source.occurredAt)
      ? { occurredAt: text(source.occurredAt) ?? undefined }
      : {}),
    ...(text(source.correlationId)
      ? { correlationId: text(source.correlationId) ?? undefined }
      : {}),
    ...(text(source.idempotencyKey)
      ? { idempotencyKey: text(source.idempotencyKey) ?? undefined }
      : {}),
  };
}

async function revokeInvalidPushTokenHash(
  env: Phase5ApiEnv,
  message: PushTokenCleanupMessage,
): Promise<number> {
  const moduleValue = (await import("@neondatabase/serverless")) as unknown as {
    readonly Pool: new (config: Record<string, unknown>) => {
      query: (
        sqlText: string,
        params?: readonly DbValue[],
      ) => Promise<{ readonly rows: readonly DbRow[]; readonly rowCount: number | null }>;
      end: () => Promise<void>;
    };
    readonly neonConfig?: { fetchConnectionCache?: boolean };
  };

  if (moduleValue.neonConfig) moduleValue.neonConfig.fetchConnectionCache = true;

  const pool = new moduleValue.Pool({
    connectionString: databaseUrl(env),
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  });

  try {
    const result = await pool.query(
      "select public.revoke_invalid_push_token_hash($1, $2, $3) as revoked_count",
      [
        message.payload.tokenHash,
        message.payload.providerErrorCode,
        message.requestId,
      ],
    );
    const value = result.rows[0]?.revoked_count;
    const count = typeof value === "number" ? value : Number(value ?? 0);
    if (!Number.isInteger(count) || count < 0) {
      throw new Error("PHASE5_PUSH_CLEANUP_RESULT_INVALID");
    }
    return count;
  } finally {
    await pool.end();
  }
}

function retryDelaySeconds(attempts?: number): number {
  const attempt = Number.isFinite(attempts)
    ? Math.max(1, Math.floor(attempts ?? 1))
    : 1;
  return Math.min(900, 30 * 2 ** Math.max(0, attempt - 1));
}

async function consumeCleanupMessage(
  message: QueueMessageLike<unknown>,
  env: Phase5ApiEnv,
): Promise<boolean> {
  const parsed = parseCleanupMessage(message.body);
  if (!parsed) return false;

  try {
    const revokedCount = await revokeInvalidPushTokenHash(env, parsed);
    message.ack?.();
    console.info(
      "phase5_push_token_cleanup",
      JSON.stringify({
        requestId: parsed.requestId,
        providerErrorCode: parsed.payload.providerErrorCode,
        revokedCount,
        tokenHashPresent: true,
        rawPushTokenLogged: false,
        rawFinancialDataLogged: false,
      }),
    );
  } catch (error) {
    message.retry?.({ delaySeconds: retryDelaySeconds(message.attempts) });
    console.warn(
      "phase5_push_token_cleanup_failed",
      JSON.stringify({
        error: error instanceof Error ? error.name : "UnknownError",
        requestId: parsed.requestId,
        tokenHashPresent: true,
        rawPushTokenLogged: false,
        rawFinancialDataLogged: false,
      }),
    );
  }

  return true;
}

export async function fetch(
  request: Request,
  env: Phase5ApiEnv,
  context: WorkerExecutionContext,
): Promise<Response> {
  return baseWorker.fetch(request, env, context);
}

export async function scheduled(
  controller: ScheduledControllerLike,
  env: Phase5ApiEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  return baseWorker.scheduled(controller, env, context);
}

export async function queue(
  batch: QueueBatchLike<unknown>,
  env: Phase5ApiEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  const fallback: QueueMessageLike<unknown>[] = [];

  for (const message of batch.messages) {
    if (!(await consumeCleanupMessage(message, env))) fallback.push(message);
  }

  if (fallback.length > 0) {
    await baseWorker.queue(
      { queue: batch.queue, messages: fallback },
      env,
      context,
    );
  }
}

export const phase5ApiEntrypointManifest = Object.freeze({
  version: PHASE5_API_ENTRYPOINT_VERSION,
  baseEntrypoint: "services/api/src/index.ts",
  activeEntrypoint: "services/api/src/phase5-entrypoint.ts",
  pushTokenInvalidatedEvent: PUSH_TOKEN_INVALIDATED_EVENT,
  hashOnlyCleanup: true,
  databaseFunction: "public.revoke_invalid_push_token_hash(text,text,text)",
  rawPushTokenAccepted: false,
  rawPushTokenLogged: false,
  rawFinancialDataLogged: false,
  publicDbFunctionExecute: false,
  requirementRefs: Object.freeze(["NOTI-003", "NOTI-010", "OPS-003", "SEC-009"]),
});

const worker = Object.freeze({ fetch, scheduled, queue });
export default worker;
