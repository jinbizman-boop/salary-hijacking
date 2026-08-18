/**
 * Phase 5 canonical queue-event envelope for scheduler/notification delivery.
 *
 * SSOT contract: every queue payload carries schemaVersion, eventId, occurredAt,
 * correlationId and a domain idempotency key. The helper is deliberately
 * backward-compatible: existing message fields (including `type` and `payload`)
 * are preserved while the required envelope metadata is added.
 *
 * This module never accepts credentials, raw push tokens or raw financial data
 * as envelope metadata. Domain payload validation remains owned by the producer
 * and FCM client; this contract protects the operational routing envelope.
 */

export const NOTIFICATION_QUEUE_SCHEMA_VERSION = "1.0" as const;
export const NOTIFICATION_QUEUE_EVENT_ID_PREFIX = "nqe" as const;

export interface NotificationQueueEnvelopeV1 {
  readonly schemaVersion: typeof NOTIFICATION_QUEUE_SCHEMA_VERSION;
  readonly eventId: string;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
}

export interface NotificationQueueEnvelopeInput {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly occurredAt?: Date | string | undefined;
  readonly eventId?: string | undefined;
}

export type NotificationQueueMessageV1<TMessage extends object> = TMessage &
  NotificationQueueEnvelopeV1;

export class NotificationQueueEnvelopeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "NotificationQueueEnvelopeError";
    this.code = code;
  }
}

const ID_PATTERN = /^[a-zA-Z0-9._:/-]{8,256}$/;
const IDEMPOTENCY_PATTERN = /^[a-zA-Z0-9._:/|-]{8,512}$/;

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new NotificationQueueEnvelopeError(
      "NOTIFICATION_QUEUE_ENVELOPE_FIELD_REQUIRED",
      `${field} is required.`,
    );
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new NotificationQueueEnvelopeError(
      "NOTIFICATION_QUEUE_ENVELOPE_FIELD_TOO_LONG",
      `${field} exceeds ${maxLength} characters.`,
    );
  }
  return text;
}

function isoTimestamp(value: Date | string | undefined): string {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" && value.trim()
        ? new Date(value)
        : new Date();
  if (!Number.isFinite(date.getTime())) {
    throw new NotificationQueueEnvelopeError(
      "NOTIFICATION_QUEUE_ENVELOPE_OCCURRED_AT_INVALID",
      "occurredAt must be a valid ISO-compatible timestamp.",
    );
  }
  return date.toISOString();
}

function createEventId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return `${NOTIFICATION_QUEUE_EVENT_ID_PREFIX}_${random}`;
  return `${NOTIFICATION_QUEUE_EVENT_ID_PREFIX}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 14)}`;
}

function assertIdentifier(value: string, field: string): void {
  if (!ID_PATTERN.test(value)) {
    throw new NotificationQueueEnvelopeError(
      "NOTIFICATION_QUEUE_ENVELOPE_IDENTIFIER_INVALID",
      `${field} contains unsupported characters or is too short.`,
    );
  }
}

function assertIdempotencyKey(value: string): void {
  if (!IDEMPOTENCY_PATTERN.test(value)) {
    throw new NotificationQueueEnvelopeError(
      "NOTIFICATION_QUEUE_ENVELOPE_IDEMPOTENCY_INVALID",
      "idempotencyKey contains unsupported characters or is too short.",
    );
  }
}

export function createNotificationQueueEnvelope(
  input: NotificationQueueEnvelopeInput,
): NotificationQueueEnvelopeV1 {
  const correlationId = requiredText(input.correlationId, "correlationId", 256);
  const idempotencyKey = requiredText(input.idempotencyKey, "idempotencyKey", 512);
  const eventId = requiredText(input.eventId ?? createEventId(), "eventId", 256);

  assertIdentifier(correlationId, "correlationId");
  assertIdentifier(eventId, "eventId");
  assertIdempotencyKey(idempotencyKey);

  return Object.freeze({
    schemaVersion: NOTIFICATION_QUEUE_SCHEMA_VERSION,
    eventId,
    occurredAt: isoTimestamp(input.occurredAt),
    correlationId,
    idempotencyKey,
  });
}

export function withNotificationQueueEnvelope<TMessage extends object>(
  message: TMessage,
  input: NotificationQueueEnvelopeInput,
): NotificationQueueMessageV1<TMessage> {
  return Object.freeze({
    ...message,
    ...createNotificationQueueEnvelope(input),
  }) as NotificationQueueMessageV1<TMessage>;
}

export function assertNotificationQueueEnvelope(
  value: unknown,
): asserts value is NotificationQueueEnvelopeV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NotificationQueueEnvelopeError(
      "NOTIFICATION_QUEUE_ENVELOPE_OBJECT_REQUIRED",
      "queue message must be an object.",
    );
  }

  const envelope = value as Record<string, unknown>;
  if (envelope.schemaVersion !== NOTIFICATION_QUEUE_SCHEMA_VERSION) {
    throw new NotificationQueueEnvelopeError(
      "NOTIFICATION_QUEUE_ENVELOPE_VERSION_UNSUPPORTED",
      `schemaVersion must be ${NOTIFICATION_QUEUE_SCHEMA_VERSION}.`,
    );
  }

  const eventId = requiredText(envelope.eventId, "eventId", 256);
  const correlationId = requiredText(envelope.correlationId, "correlationId", 256);
  const idempotencyKey = requiredText(envelope.idempotencyKey, "idempotencyKey", 512);
  const occurredAt = requiredText(envelope.occurredAt, "occurredAt", 64);

  assertIdentifier(eventId, "eventId");
  assertIdentifier(correlationId, "correlationId");
  assertIdempotencyKey(idempotencyKey);
  isoTimestamp(occurredAt);
}

export function queueEnvelopeFromLegacyMessage(
  value: unknown,
  now: Date = new Date(),
): NotificationQueueEnvelopeV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NotificationQueueEnvelopeError(
      "NOTIFICATION_QUEUE_MESSAGE_OBJECT_REQUIRED",
      "legacy queue message must be an object.",
    );
  }
  const message = value as Record<string, unknown>;
  const requestId = requiredText(message.requestId, "requestId", 256);
  const payload =
    message.payload && typeof message.payload === "object" && !Array.isArray(message.payload)
      ? (message.payload as Record<string, unknown>)
      : null;
  const data =
    payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : null;
  const idempotencyKey = requiredText(
    message.idempotencyKey ?? data?.idempotencyKey,
    "idempotencyKey",
    512,
  );

  return createNotificationQueueEnvelope({
    correlationId: requestId,
    idempotencyKey,
    occurredAt: now,
  });
}

export const notificationQueueEnvelopeManifest = Object.freeze({
  schemaVersion: NOTIFICATION_QUEUE_SCHEMA_VERSION,
  requiredFields: Object.freeze([
    "schemaVersion",
    "eventId",
    "occurredAt",
    "correlationId",
    "idempotencyKey",
  ]),
  backwardCompatibleWithCurrentMessageType: true,
  rawCredentialFieldsAllowed: false,
  rawPushTokenEnvelopeFieldsAllowed: false,
  rawFinancialEnvelopeFieldsAllowed: false,
  requirementRefs: Object.freeze(["NOTI-010", "OPS-003", "SEC-009"]),
});
