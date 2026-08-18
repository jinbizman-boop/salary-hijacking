import { describe, expect, it } from "vitest";
import {
  PHASE5_RETRY_MAX_DELAY_SECONDS,
  normalizePhase5QueueBody,
  phase5RetryDelaySeconds,
} from "../../src/phase5-entrypoint";
import { assertNotificationQueueEnvelope } from "../../src/queue-envelope";

describe("Phase 5 notifications queue consumer normalization", () => {
  it("upgrades a legacy scheduler PAYDAY message and reconciles its deep link", () => {
    const normalized = normalizePhase5QueueBody(
      {
        type: "FCM_SEND",
        requestId: "req_notification_phase5_0001",
        payload: {
          notification: { title: "급여일", body: "급여일 알림" },
          data: {
            notificationId: "ntf_payday_0001",
            type: "PAYDAY",
            idempotencyKey: "payday:user-1:cycle-1:PAYDAY",
            targetScreen: "payroll-home",
            deeplink: "salary-hijacking://payroll/payday/plan-1",
            consentRequired: false,
            consentGranted: true,
          },
        },
      },
      "cf-message-0001",
    ) as unknown as Record<string, unknown>;

    expect(() => assertNotificationQueueEnvelope(normalized)).not.toThrow();
    expect(normalized.schemaVersion).toBe("1.0");
    expect(normalized.correlationId).toBe("req_notification_phase5_0001");

    const payload = normalized.payload as Record<string, unknown>;
    const data = payload.data as Record<string, unknown>;
    expect(data.targetScreen).toBe("salary-home");
    expect(data.deeplink).toContain("salary-hijacking://salary");
  });

  it("uses the Cloudflare message id and notification identity for legacy messages missing operational ids", () => {
    const normalized = normalizePhase5QueueBody(
      {
        type: "FCM_VALIDATE",
        payload: {
          notification: { title: "테스트", body: "검증" },
          data: {
            notificationId: "ntf_validate_0002",
            type: "SYSTEM",
            consentRequired: false,
            consentGranted: true,
          },
        },
      },
      "cf-message-0002",
    ) as unknown as Record<string, unknown>;

    expect(() => assertNotificationQueueEnvelope(normalized)).not.toThrow();
    expect(normalized.correlationId).toBe("queue_cf-message-0002");
    expect(normalized.idempotencyKey).toBe(
      "notification:SYSTEM:ntf_validate_0002",
    );
  });

  it("applies bounded exponential backoff to Cloudflare-native queue retries", () => {
    expect(phase5RetryDelaySeconds(undefined)).toBe(30);
    expect(phase5RetryDelaySeconds(1)).toBe(30);
    expect(phase5RetryDelaySeconds(2)).toBe(60);
    expect(phase5RetryDelaySeconds(3)).toBe(120);
    expect(phase5RetryDelaySeconds(4)).toBe(240);
    expect(phase5RetryDelaySeconds(5)).toBe(480);
    expect(phase5RetryDelaySeconds(100)).toBe(
      PHASE5_RETRY_MAX_DELAY_SECONDS,
    );
  });
});
