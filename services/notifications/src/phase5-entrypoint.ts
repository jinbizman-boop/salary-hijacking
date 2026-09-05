/**
 * PHASE 5 notifications worker entrypoint.
 *
 * This wrapper preserves the proven FCM worker while enforcing the v2.0 queue
 * event envelope at the consumer boundary. Legacy messages are normalized for
 * a staged migration, known notification types are reconciled to current Expo
 * Router production deep links, Cloudflare queue retries are normalized to the
 * PHASE 5 exponential-backoff contract, and provider-invalid single-device FCM
 * outcomes are converted to hash-only cleanup events consumed by the API
 * operations worker. No raw push token is written to logs/evidence/cleanup
 * events.
 */

import baseWorker, {
  NOTIFICATIONS_API_PREFIX,
  type NotificationQueueMessage,
  type NotificationsEnv,
  type QueueBatchLike,
  type QueueMessageLike,
  type ScheduledControllerLike,
  type WorkerExecutionContext,
} from "./index";
import {
  assertNotificationQueueEnvelope,
  queueEnvelopeFromLegacyMessage,
  withNotificationQueueEnvelope,
} from "./queue-envelope";
import {
  isCanonicalNotificationDeeplink,
  notificationDeeplinkFor,
  type NotificationDeeplinkType,
} from "./deeplink-contract";

export const PHASE5_NOTIFICATIONS_ENTRYPOINT_VERSION = "1.2.0";
export const PHASE5_RETRY_MAX_ATTEMPTS = 5;
export const PHASE5_RETRY_BASE_DELAY_SECONDS = 30;
export const PHASE5_RETRY_MAX_DELAY_SECONDS = 3_600;
export const PHASE5_PUSH_CLEANUP_SCHEMA_VERSION = 1;
export const PHASE5_PUSH_CLEANUP_EVENT_TYPE = "PUSH_TOKEN_INVALIDATED";

interface QueueProducerLike {
  readonly send: (
    message: unknown,
    options?: { readonly contentType?: "json" | "v8" },
  ) => Promise<void>;
}

export interface Phase5NotificationsEnv extends NotificationsEnv {
  readonly NOTIFICATIONS_OPERATION_QUEUE?: QueueProducerLike;
}

interface InternalFcmSendResult {
  readonly status: string | null;
  readonly notificationId: string | null;
  readonly httpStatus: number | null;
  readonly errorCode: string | null;
  readonly retriable: boolean | null;
}

export interface PushTokenInvalidatedEvent {
  readonly schemaVersion: typeof PHASE5_PUSH_CLEANUP_SCHEMA_VERSION;
  readonly eventId: string;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly type: typeof PHASE5_PUSH_CLEANUP_EVENT_TYPE;
  readonly requestId: string;
  readonly payload: {
    readonly tokenHash: string;
    readonly providerErrorCode: string;
    readonly notificationId?: string;
    readonly httpStatus?: number;
  };
}

const invalidPushTokenErrorCodes = new Set([
  "UNREGISTERED",
  "INVALID_ARGUMENT",
  "INVALID_REGISTRATION",
  "NOT_FOUND",
  "SENDER_ID_MISMATCH",
  "APNS_BAD_DEVICE_TOKEN",
  "APNS_UNREGISTERED",
  "WEBPUSH_SUBSCRIPTION_EXPIRED",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function primitiveParams(
  value: unknown,
): Readonly<Record<string, string | number | boolean | null>> {
  const source = record(value);
  if (!source) return {};
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(source)) {
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      result[key] = item;
    }
  }
  return result;
}

function canonicalizeDeeplink(
  message: Record<string, unknown>,
): Record<string, unknown> {
  const payload = record(message.payload);
  const data = record(payload?.data);
  const type = text(data?.type);
  if (!payload || !data || !type) return message;

  const supported = new Set<NotificationDeeplinkType>([
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
  ]);
  if (!supported.has(type as NotificationDeeplinkType)) return message;

  const notificationType = type as NotificationDeeplinkType;
  const routeParams = primitiveParams(data.routeParams);
  const target = notificationDeeplinkFor(notificationType, routeParams);
  const existing = text(data.deeplink) ?? "";
  if (
    data.targetScreen === target.targetScreen &&
    isCanonicalNotificationDeeplink(notificationType, existing)
  ) {
    return message;
  }

  return {
    ...message,
    payload: {
      ...payload,
      data: {
        ...data,
        targetScreen: target.targetScreen,
        deeplink: target.deeplink,
      },
    },
  };
}

function legacyIdentity(
  source: Record<string, unknown>,
  queueMessageId?: string,
): Record<string, unknown> {
  const payload = record(source.payload);
  const data = record(payload?.data);
  const existingRequestId = text(source.requestId);
  const requestId =
    existingRequestId ??
    (queueMessageId
      ? `queue_${queueMessageId}`
      : `queue_${globalThis.crypto.randomUUID()}`);

  if (text(source.idempotencyKey) || text(data?.idempotencyKey)) {
    return existingRequestId ? source : { ...source, requestId };
  }

  const notificationId = text(data?.notificationId);
  const notificationType = text(data?.type) ?? "SYSTEM";
  const idempotencyKey = notificationId
    ? `notification:${notificationType}:${notificationId}`
    : `notification:${notificationType}:${requestId}`;

  return {
    ...source,
    requestId,
    idempotencyKey,
  };
}

export function normalizePhase5QueueBody(
  body: NotificationQueueMessage,
  queueMessageId?: string,
): NotificationQueueMessage {
  const raw = legacyIdentity(
    body as unknown as Record<string, unknown>,
    queueMessageId,
  );
  const source = canonicalizeDeeplink(raw);
  try {
    assertNotificationQueueEnvelope(source);
    return source as unknown as NotificationQueueMessage;
  } catch {
    const envelope = queueEnvelopeFromLegacyMessage(source);
    return withNotificationQueueEnvelope(
      source,
      envelope,
    ) as unknown as NotificationQueueMessage;
  }
}

/**
 * Cloudflare Queue's message.attempts represents delivery attempts already made
 * for the current message. The PHASE 5 contract uses bounded exponential
 * backoff; max_retries and dead-letter routing remain enforced by wrangler.
 * Jitter stays inside the repository retry service where persisted retries are
 * used; the Cloudflare-native path remains deterministic for test/evidence.
 */
export function phase5RetryDelaySeconds(attempts?: number): number {
  const currentAttempt = Number.isFinite(attempts)
    ? Math.max(1, Math.floor(attempts ?? 1))
    : 1;
  const exponent = Math.max(0, currentAttempt - 1);
  return Math.min(
    PHASE5_RETRY_MAX_DELAY_SECONDS,
    PHASE5_RETRY_BASE_DELAY_SECONDS * 2 ** exponent,
  );
}

export function isInvalidPushTokenErrorCode(errorCode: unknown): boolean {
  const normalized = text(errorCode)?.toUpperCase() ?? "";
  return invalidPushTokenErrorCodes.has(normalized);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function boundedSafeId(value: string, fallback: string, max = 120): string {
  const normalized = value
    .replace(/[^A-Za-z0-9._:/-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max);
  return normalized || fallback;
}

export function buildPushTokenInvalidatedEvent(input: {
  readonly tokenHash: string;
  readonly errorCode: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly notificationId?: string | null;
  readonly httpStatus?: number | null;
  readonly occurredAt?: string;
}): PushTokenInvalidatedEvent {
  const tokenHash = input.tokenHash.replace(/^sha256:/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(tokenHash)) {
    throw new Error("PHASE5_PUSH_CLEANUP_TOKEN_HASH_INVALID");
  }
  const errorCode = boundedSafeId(
    input.errorCode.toUpperCase(),
    "UNKNOWN_PROVIDER_ERROR",
    160,
  );
  const notificationId = input.notificationId
    ? boundedSafeId(input.notificationId, "notification", 60)
    : null;
  const requestId = boundedSafeId(input.requestId, "queue_request", 120);
  const correlationId = boundedSafeId(
    input.correlationId,
    requestId,
    120,
  );
  const eventIdentity = notificationId ?? requestId;
  const occurredAt = new Date(input.occurredAt ?? Date.now()).toISOString();

  return {
    schemaVersion: PHASE5_PUSH_CLEANUP_SCHEMA_VERSION,
    eventId: boundedSafeId(
      `push-invalid:${eventIdentity}:${errorCode}:${tokenHash.slice(0, 16)}`,
      `push-invalid:${tokenHash.slice(0, 16)}`,
      160,
    ),
    occurredAt,
    correlationId,
    idempotencyKey: boundedSafeId(
      `push-invalid:${eventIdentity}:${tokenHash.slice(0, 32)}`,
      `push-invalid:${tokenHash.slice(0, 32)}`,
      160,
    ),
    type: PHASE5_PUSH_CLEANUP_EVENT_TYPE,
    requestId,
    payload: {
      tokenHash,
      providerErrorCode: errorCode,
      ...(notificationId ? { notificationId } : {}),
      ...(typeof input.httpStatus === "number" && Number.isInteger(input.httpStatus)
        ? { httpStatus: input.httpStatus }
        : {}),
    },
  };
}

function normalizeQueueMessage(
  message: QueueMessageLike<NotificationQueueMessage>,
): QueueMessageLike<NotificationQueueMessage> {
  const normalizedBody = normalizePhase5QueueBody(message.body, message.id);

  if (!message.retry) {
    return {
      ...message,
      body: normalizedBody,
    };
  }

  const retry = message.retry;
  return {
    ...message,
    body: normalizedBody,
    retry: () => {
      retry({
        delaySeconds: phase5RetryDelaySeconds(message.attempts),
      });
    },
  };
}

function normalizeBatch(
  batch: QueueBatchLike<NotificationQueueMessage>,
): QueueBatchLike<NotificationQueueMessage> {
  return {
    queue: batch.queue,
    messages: batch.messages.map(normalizeQueueMessage),
  };
}

function internalDispatchEnv(
  env: Phase5NotificationsEnv,
  ephemeralToken: string,
): NotificationsEnv {
  return {
    ...env,
    NOTIFICATIONS_SERVICE_TOKEN_SHA256: "",
    SERVICE_TOKEN_SHA256: "",
    NOTIFICATIONS_SERVICE_TOKEN: ephemeralToken,
    SERVICE_TOKEN: "",
  };
}

function internalSendResult(value: unknown): InternalFcmSendResult | null {
  const source = record(value);
  const data = record(source?.data);
  if (!data) return null;
  return {
    status: text(data.status),
    notificationId: text(data.notificationId),
    httpStatus:
      typeof data.httpStatus === "number" && Number.isInteger(data.httpStatus)
        ? data.httpStatus
        : null,
    errorCode: text(data.errorCode),
    retriable: typeof data.retriable === "boolean" ? data.retriable : null,
  };
}

async function dispatchSingleFcmQueueMessage(
  message: QueueMessageLike<NotificationQueueMessage>,
  env: Phase5NotificationsEnv,
  context: WorkerExecutionContext,
): Promise<boolean> {
  const normalized = normalizePhase5QueueBody(message.body, message.id);
  const source = normalized as unknown as Record<string, unknown>;
  if (source.type !== "FCM_SEND") return false;

  const payload = record(source.payload);
  if (!payload) return false;

  const requestId = boundedSafeId(
    text(source.requestId) ?? `queue_${message.id ?? globalThis.crypto.randomUUID()}`,
    "queue_request",
  );
  const correlationId = boundedSafeId(
    text(source.correlationId) ?? requestId,
    requestId,
  );
  const ephemeralToken = `phase5_internal_${globalThis.crypto.randomUUID()}`;
  const request = new Request(
    `https://phase5.notifications.internal${NOTIFICATIONS_API_PREFIX}/send`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        authorization: `Bearer ${ephemeralToken}`,
        "x-request-id": requestId,
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify(payload),
    },
  );

  try {
    const response = await baseWorker.fetch(
      request,
      internalDispatchEnv(env, ephemeralToken),
      context,
    );
    const responseBody = (await response.json().catch(() => null)) as unknown;
    const result = internalSendResult(responseBody);

    if (result?.status === "SENT" || result?.status === "SKIPPED") {
      message.ack?.();
      return true;
    }

    const rawToken = text(payload.token);
    if (
      rawToken &&
      result?.errorCode &&
      isInvalidPushTokenErrorCode(result.errorCode)
    ) {
      if (!env.NOTIFICATIONS_OPERATION_QUEUE) {
        message.retry?.({ delaySeconds: phase5RetryDelaySeconds(message.attempts) });
        return true;
      }

      const tokenHash = await sha256Hex(rawToken);
      const cleanupEvent = buildPushTokenInvalidatedEvent({
        tokenHash,
        errorCode: result.errorCode,
        requestId,
        correlationId,
        notificationId: result.notificationId,
        httpStatus: result.httpStatus,
      });
      await env.NOTIFICATIONS_OPERATION_QUEUE.send(cleanupEvent, {
        contentType: "json",
      });
      message.ack?.();
      return true;
    }

    message.retry?.({ delaySeconds: phase5RetryDelaySeconds(message.attempts) });
    return true;
  } catch {
    message.retry?.({ delaySeconds: phase5RetryDelaySeconds(message.attempts) });
    return true;
  }
}

export async function fetch(
  request: Request,
  env: Phase5NotificationsEnv,
  context: WorkerExecutionContext,
): Promise<Response> {
  return baseWorker.fetch(request, env, context);
}

export async function scheduled(
  controller: ScheduledControllerLike,
  env: Phase5NotificationsEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  return baseWorker.scheduled(controller, env, context);
}

export async function queue(
  batch: QueueBatchLike<NotificationQueueMessage>,
  env: Phase5NotificationsEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  const fallback: QueueMessageLike<NotificationQueueMessage>[] = [];

  for (const message of batch.messages) {
    if (!(await dispatchSingleFcmQueueMessage(message, env, context))) {
      fallback.push(message);
    }
  }

  if (fallback.length > 0) {
    await baseWorker.queue(
      normalizeBatch({ queue: batch.queue, messages: fallback }),
      env,
      context,
    );
  }
}

export const phase5NotificationsEntrypointManifest = Object.freeze({
  version: PHASE5_NOTIFICATIONS_ENTRYPOINT_VERSION,
  baseEntrypoint: "services/notifications/src/index.ts",
  activeEntrypoint: "services/notifications/src/phase5-entrypoint.ts",
  legacyQueueMigrationSupported: true,
  legacyMissingRequestIdUsesCloudflareMessageId: true,
  legacyMissingIdempotencyUsesNotificationIdentity: true,
  queueEnvelopeEnforcedAtConsumerBoundary: true,
  deeplinkCanonicalizationEnabled: true,
  cloudflareNativeRetryBackoffNormalized: true,
  cloudflareNativeRetryMaxAttempts: PHASE5_RETRY_MAX_ATTEMPTS,
  cloudflareNativeRetryBaseDelaySeconds: PHASE5_RETRY_BASE_DELAY_SECONDS,
  cloudflareNativeRetryMaxDelaySeconds: PHASE5_RETRY_MAX_DELAY_SECONDS,
  deadLetterPolicyDelegatedToCloudflareQueueConfig: true,
  persistedRetryClassificationModuleAvailable: true,
  invalidTokenCleanupEventEmitterActiveForSingleFcmSend: true,
  invalidTokenCleanupOperationsQueueRequired: true,
  invalidTokenCleanupPayloadHashOnly: true,
  rawFinancialDataAdded: false,
  rawPushTokenAdded: false,
  requirementRefs: Object.freeze([
    "NOTI-003",
    "NOTI-009",
    "NOTI-010",
    "OPS-003",
    "SEC-009",
  ]),
});

const worker = Object.freeze({ fetch, scheduled, queue });
export default worker;
