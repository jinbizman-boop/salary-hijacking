/**
 * PHASE 5 scheduler -> queue delivery contract.
 *
 * The scheduler previously emitted valid domain messages but without the v2.0
 * queue envelope fields required for operational tracing. This adapter is
 * intentionally additive: the existing `type`, `requestId`, `payload` and
 * retry fields remain untouched except that known notification deep links are
 * normalized to Expo Router production routes.
 */

export const PHASE5_QUEUE_SCHEMA_VERSION = "1.0" as const;

export interface QueueEnvelopeV1 {
  readonly schemaVersion: typeof PHASE5_QUEUE_SCHEMA_VERSION;
  readonly eventId: string;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
}

export interface QueueBinding<TMessage = unknown> {
  readonly send: (
    message: TMessage,
    options?: { readonly delaySeconds?: number },
  ) => Promise<void>;
}

const canonicalNotificationRoutes: Readonly<
  Record<string, { readonly targetScreen: string; readonly deeplink: string }>
> = Object.freeze({
  PAYDAY: {
    targetScreen: "salary-home",
    deeplink: "salary-hijacking://salary",
  },
  FIXED_PAYMENT_DUE: {
    targetScreen: "plan",
    deeplink: "salary-hijacking://plan",
  },
  SAVINGS_DUE: {
    targetScreen: "plan",
    deeplink: "salary-hijacking://plan",
  },
  BUDGET_OVER: {
    targetScreen: "salary-home",
    deeplink: "salary-hijacking://salary",
  },
  BUDGET_REMAINING: {
    targetScreen: "salary-home",
    deeplink: "salary-hijacking://salary",
  },
  HIJACK_GOAL: {
    targetScreen: "salary-home",
    deeplink: "salary-hijacking://salary",
  },
  GROWTH_TASK: {
    targetScreen: "level",
    deeplink: "salary-hijacking://level",
  },
  GROWTH_LEVEL_UP: {
    targetScreen: "level",
    deeplink: "salary-hijacking://level",
  },
  COMMUNITY_COMMENT: {
    targetScreen: "community",
    deeplink: "salary-hijacking://community",
  },
  COMMUNITY_REACTION: {
    targetScreen: "community",
    deeplink: "salary-hijacking://community",
  },
  NOTICE: {
    targetScreen: "notifications",
    deeplink: "salary-hijacking://notifications",
  },
  SECURITY: {
    targetScreen: "notifications",
    deeplink: "salary-hijacking://notifications",
  },
  SYSTEM: {
    targetScreen: "notifications",
    deeplink: "salary-hijacking://notifications",
  },
});

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function eventId(): string {
  const id = globalThis.crypto?.randomUUID?.();
  return id
    ? `sqe_${id}`
    : `sqe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function requestIdFor(message: Record<string, unknown>): string {
  return stringValue(message.requestId) ?? `queue_${eventId()}`;
}

function idempotencyKeyFor(
  message: Record<string, unknown>,
  correlationId: string,
): string {
  const direct = stringValue(message.idempotencyKey);
  if (direct) return direct;

  const payload = record(message.payload);
  const data = record(payload?.data);
  const nested = stringValue(data?.idempotencyKey);
  if (nested) return nested;

  const job = stringValue(message.job);
  const action = stringValue(message.action);
  if (job && action) return `scheduler:${job}:${action}:${correlationId}`;

  const eventType = stringValue(message.eventType);
  if (eventType) return `event:${eventType}:${correlationId}`;

  return `queue:${correlationId}`;
}

function canonicalizeNotificationMessage(
  message: Record<string, unknown>,
): Record<string, unknown> {
  const payload = record(message.payload);
  const data = record(payload?.data);
  const notificationType = stringValue(data?.type);
  const target = notificationType
    ? canonicalNotificationRoutes[notificationType]
    : undefined;
  if (!payload || !data || !target) return message;

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

export function applyPhase5QueueContract<TMessage>(
  message: TMessage,
  now: Date = new Date(),
): TMessage & QueueEnvelopeV1 {
  const source = record(message) ?? {};
  const canonical = canonicalizeNotificationMessage(source);
  const correlationId = stringValue(canonical.correlationId) ?? requestIdFor(canonical);
  const idempotencyKey =
    stringValue(canonical.idempotencyKey) ??
    idempotencyKeyFor(canonical, correlationId);
  const occurredAt = stringValue(canonical.occurredAt) ?? now.toISOString();
  const currentEventId = stringValue(canonical.eventId) ?? eventId();

  return Object.freeze({
    ...canonical,
    schemaVersion: PHASE5_QUEUE_SCHEMA_VERSION,
    eventId: currentEventId,
    occurredAt,
    correlationId,
    idempotencyKey,
  }) as TMessage & QueueEnvelopeV1;
}

export function wrapPhase5QueueBinding<TMessage>(
  binding: QueueBinding<TMessage> | undefined,
): QueueBinding<TMessage> | undefined {
  if (!binding) return undefined;
  return {
    send: async (message, options) => {
      await binding.send(applyPhase5QueueContract(message), options);
    },
  };
}

export function assertPhase5QueueEnvelope(value: unknown): QueueEnvelopeV1 {
  const message = record(value);
  if (!message)
    throw new Error("PHASE5_QUEUE_MESSAGE_OBJECT_REQUIRED");
  if (message.schemaVersion !== PHASE5_QUEUE_SCHEMA_VERSION)
    throw new Error("PHASE5_QUEUE_SCHEMA_VERSION_INVALID");
  for (const field of ["eventId", "occurredAt", "correlationId", "idempotencyKey"] as const) {
    if (!stringValue(message[field]))
      throw new Error(`PHASE5_QUEUE_${field.toUpperCase()}_REQUIRED`);
  }
  const occurredAt = new Date(String(message.occurredAt));
  if (!Number.isFinite(occurredAt.getTime()))
    throw new Error("PHASE5_QUEUE_OCCURRED_AT_INVALID");
  return message as unknown as QueueEnvelopeV1;
}

export const phase5NotificationContractManifest = Object.freeze({
  schemaVersion: PHASE5_QUEUE_SCHEMA_VERSION,
  queueEnvelopeRequired: true,
  canonicalDeepLinks: canonicalNotificationRoutes,
  rawFinancialDataAddedToEnvelope: false,
  rawPushTokenAddedToEnvelope: false,
  requirementRefs: Object.freeze(["NOTI-004", "NOTI-005", "NOTI-009", "NOTI-010", "OPS-003"]),
});
