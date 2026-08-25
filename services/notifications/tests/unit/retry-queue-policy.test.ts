import { describe, expect, it } from "vitest";
import {
  createInMemoryRetryQueueProducer,
  createInMemoryRetryQueueRepository,
  createNotificationRetryQueueService,
} from "../../src/retry-queue";

describe("notification retry queue policy", () => {
  it("uses dedicated env toggles for invalid-token cleanup and duplicate protection", async () => {
    const producer = createInMemoryRetryQueueProducer();
    const repository = createInMemoryRetryQueueRepository();
    const service = createNotificationRetryQueueService({
      producer,
      repository,
    });

    const result = await service.enqueueFromFailure(
      {
        type: "FCM_SEND",
        payload: { safe: true },
        notificationId: "ntf_policy_test",
        tokenHash:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        errorCode: "UNREGISTERED",
        httpStatus: 404,
        attempt: 1,
      },
      {
        env: {
          NOTIFICATION_RETRY_DRY_RUN: "false",
          NOTIFICATION_RETRY_INVALID_TOKEN_CLEANUP_ENABLED: "false",
          NOTIFICATION_RETRY_DUPLICATE_PROTECTION_ENABLED: "false",
        },
        requestId: "retry-policy-test",
        now: new Date("2026-08-25T00:00:00.000Z"),
      },
    );

    expect(result.policy.dryRun).toBe(false);
    expect(result.policy.invalidTokenCleanupEnabled).toBe(false);
    expect(result.policy.duplicateProtectionEnabled).toBe(false);
    expect(result.action).toBe("DEAD_LETTER");
  });
});
