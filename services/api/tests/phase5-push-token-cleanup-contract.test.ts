import { describe, expect, it } from "vitest";

import {
  PHASE5_QUEUE_SCHEMA_VERSION,
  PUSH_TOKEN_INVALIDATED_EVENT,
  parsePhase5PushTokenCleanupMessage,
  phase5ApiRetryDelaySeconds,
} from "../src/phase5-entrypoint";

const tokenHash = "A".repeat(64);

function validMessage() {
  return {
    schemaVersion: PHASE5_QUEUE_SCHEMA_VERSION,
    eventId: "push-invalid:evt-001",
    occurredAt: "2026-08-18T12:00:00.000Z",
    correlationId: "corr-001",
    idempotencyKey: "push-invalid:notification-001:hash-001",
    type: PUSH_TOKEN_INVALIDATED_EVENT,
    requestId: "req-001",
    payload: {
      tokenHash: `sha256:${tokenHash}`,
      providerErrorCode: "UNREGISTERED",
      notificationId: "notification-001",
      httpStatus: 404,
    },
  };
}

describe("PHASE 5 push-token cleanup queue contract", () => {
  it("accepts a complete v2 queue envelope and normalizes the SHA-256 hash", () => {
    const parsed = parsePhase5PushTokenCleanupMessage(validMessage());

    expect(parsed).not.toBeNull();
    expect(parsed?.schemaVersion).toBe(1);
    expect(parsed?.payload.tokenHash).toBe(tokenHash.toLowerCase());
    expect(parsed?.payload.providerErrorCode).toBe("UNREGISTERED");
    expect(parsed?.occurredAt).toBe("2026-08-18T12:00:00.000Z");
  });

  it("rejects raw or malformed push tokens at the API queue boundary", () => {
    const message = validMessage();
    message.payload.tokenHash = "raw-fcm-registration-token";

    expect(() => parsePhase5PushTokenCleanupMessage(message)).toThrow(
      "PHASE5_PUSH_CLEANUP_TOKEN_HASH_INVALID",
    );
  });

  it.each([
    ["schemaVersion", undefined, "PHASE5_PUSH_CLEANUP_SCHEMA_VERSION_INVALID"],
    ["eventId", undefined, "PHASE5_PUSH_CLEANUP_EVENT_ID_INVALID"],
    ["correlationId", undefined, "PHASE5_PUSH_CLEANUP_CORRELATION_ID_INVALID"],
    ["idempotencyKey", undefined, "PHASE5_PUSH_CLEANUP_IDEMPOTENCY_KEY_INVALID"],
    ["occurredAt", "not-a-date", "PHASE5_PUSH_CLEANUP_OCCURRED_AT_INVALID"],
  ])("rejects an invalid %s envelope field", (field, value, errorCode) => {
    const message = validMessage() as Record<string, unknown>;
    message[field] = value;

    expect(() => parsePhase5PushTokenCleanupMessage(message)).toThrow(errorCode);
  });

  it("returns null for queue messages owned by the base API worker", () => {
    expect(
      parsePhase5PushTokenCleanupMessage({
        type: "SOME_OTHER_OPERATION",
        payload: {},
      }),
    ).toBeNull();
  });

  it("uses bounded exponential retry delays", () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(phase5ApiRetryDelaySeconds)).toEqual([
      30,
      60,
      120,
      240,
      480,
      900,
      900,
    ]);
  });
});
