import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_QUEUE_SCHEMA_VERSION,
  NotificationQueueEnvelopeError,
  assertNotificationQueueEnvelope,
  createNotificationQueueEnvelope,
  queueEnvelopeFromLegacyMessage,
  withNotificationQueueEnvelope,
} from "../../src/queue-envelope";

describe("Phase 5 notification queue envelope", () => {
  it("creates the SSOT-required queue metadata without changing the domain message", () => {
    const message = withNotificationQueueEnvelope(
      {
        type: "FCM_SEND" as const,
        requestId: "req_phase5_0001",
        payload: {
          data: {
            idempotencyKey: "payday:user-1:cycle-1:PAYDAY",
          },
        },
      },
      {
        eventId: "nqe_phase5_event_0001",
        correlationId: "req_phase5_0001",
        idempotencyKey: "payday:user-1:cycle-1:PAYDAY",
        occurredAt: "2026-08-18T11:00:00.000Z",
      },
    );

    expect(message.type).toBe("FCM_SEND");
    expect(message.schemaVersion).toBe(NOTIFICATION_QUEUE_SCHEMA_VERSION);
    expect(message.eventId).toBe("nqe_phase5_event_0001");
    expect(message.correlationId).toBe("req_phase5_0001");
    expect(message.idempotencyKey).toBe("payday:user-1:cycle-1:PAYDAY");
    expect(message.occurredAt).toBe("2026-08-18T11:00:00.000Z");
    expect(() => assertNotificationQueueEnvelope(message)).not.toThrow();
  });

  it("adapts the current legacy scheduler message shape", () => {
    const envelope = queueEnvelopeFromLegacyMessage(
      {
        type: "FCM_SEND",
        requestId: "req_phase5_legacy_01",
        payload: {
          data: {
            idempotencyKey: "fixed-expense:user-2:expense-9:DUE",
          },
        },
      },
      new Date("2026-08-18T11:01:00.000Z"),
    );

    expect(envelope.schemaVersion).toBe("1.0");
    expect(envelope.correlationId).toBe("req_phase5_legacy_01");
    expect(envelope.idempotencyKey).toBe(
      "fixed-expense:user-2:expense-9:DUE",
    );
    expect(envelope.occurredAt).toBe("2026-08-18T11:01:00.000Z");
    expect(() => assertNotificationQueueEnvelope(envelope)).not.toThrow();
  });

  it("rejects missing or malformed required envelope metadata", () => {
    expect(() =>
      assertNotificationQueueEnvelope({
        schemaVersion: "1.0",
        eventId: "short",
        occurredAt: "not-a-date",
        correlationId: "req_phase5_0002",
        idempotencyKey: "budget:user-1:2026-08-18:80pct",
      }),
    ).toThrow(NotificationQueueEnvelopeError);

    expect(() =>
      createNotificationQueueEnvelope({
        correlationId: "req_phase5_0003",
        idempotencyKey: "bad key containing spaces",
      }),
    ).toThrow(NotificationQueueEnvelopeError);
  });

  it("does not accept a legacy message without a domain idempotency key", () => {
    expect(() =>
      queueEnvelopeFromLegacyMessage({
        type: "FCM_SEND",
        requestId: "req_phase5_legacy_02",
        payload: { data: {} },
      }),
    ).toThrowError(/idempotencyKey is required/i);
  });
});
