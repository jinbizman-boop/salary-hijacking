import { describe, expect, it } from "vitest";
import { createPhase6GrowthCommunityNotificationProducer } from "../src/notifications/phase6-growth-community-producers";
import type { NotificationCreateInput } from "../src/routes/notifications.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

function repository(calls: NotificationCreateInput[]) {
  return {
    name: "phase6-test-notifications",
    list: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
    get: async () => null,
    create: async (input: NotificationCreateInput) => {
      calls.push(input);
      return {
        notificationId: `ntf_${calls.length}`,
        type: input.type,
        metadata: input.metadata,
      };
    },
    markRead: async () => ({}),
    markAllRead: async () => ({}),
    archive: async () => ({}),
    delete: async () => ({}),
    unreadCount: async () => ({ unreadCount: 0 }),
    summary: async () => ({}),
    getPreferences: async () => ({}),
    updatePreferences: async () => ({}),
    registerDevice: async () => ({}),
    revokeDevice: async () => ({}),
    listDevices: async () => [],
    test: async () => ({}),
    previewRules: async () => ({}),
  };
}

describe("Phase 6 growth/community notification producer", () => {
  it("creates a deduped, privacy-safe growth completion notification", async () => {
    const calls: NotificationCreateInput[] = [];
    const producer = createPhase6GrowthCommunityNotificationProducer({
      repository: repository(calls),
      now: () => new Date("2026-08-26T01:00:00.000Z"),
    });

    const result = await producer.handleGrowthEvent(
      {
        event: "growth_task_progress",
        requestId: "phase6-growth-producer",
        userId: "11111111-1111-4111-8111-111111111111",
        targetType: "TASK",
        targetId: "22222222-2222-4222-8222-222222222222",
        expDelta: 30,
        path: "/api/v1/growth/tasks/22222222-2222-4222-8222-222222222222/progress",
        createdAt: "2026-08-26T01:00:00.000Z",
      },
      { APP_ENV: "test" },
      context,
    );

    expect(result).toMatchObject({ produced: 1, skipped: 0 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      type: "GROWTH_REMINDER",
      channels: ["IN_APP"],
      deeplink:
        "salaryhijacking://level/task/22222222-2222-4222-8222-222222222222",
      metadata: {
        producer: "phase6-growth-community-producer",
        sourceEvent: "growth_task_progress",
        idempotencyKey:
          "growth-completion:TASK:22222222-2222-4222-8222-222222222222:2026-08-26",
        rawFinancialPayloadIncluded: false,
        rawPersonalDataIncluded: false,
      },
    });
    expect(JSON.stringify(calls[0])).not.toContain("salaryAmount");
    expect(JSON.stringify(calls[0])).not.toContain("expenseAmount");
  });

  it("skips community self-notifications and notifies the target owner", async () => {
    const calls: NotificationCreateInput[] = [];
    const producer = createPhase6GrowthCommunityNotificationProducer({
      repository: repository(calls),
      now: () => new Date("2026-08-26T01:00:00.000Z"),
    });

    const selfResult = await producer.handleCommunityEvent(
      {
        event: "community_comment_created",
        requestId: "phase6-community-self",
        userId: "11111111-1111-4111-8111-111111111111",
        recipientUserId: "11111111-1111-4111-8111-111111111111",
        targetType: "COMMENT",
        targetId: "33333333-3333-4333-8333-333333333333",
        parentPostId: "22222222-2222-4222-8222-222222222222",
        path: "/api/v1/community/posts/22222222-2222-4222-8222-222222222222/comments",
        createdAt: "2026-08-26T01:00:00.000Z",
      },
      { APP_ENV: "test" },
      context,
    );

    const ownerResult = await producer.handleCommunityEvent(
      {
        event: "community_comment_created",
        requestId: "phase6-community-owner",
        userId: "11111111-1111-4111-8111-111111111111",
        recipientUserId: "99999999-9999-4999-8999-999999999999",
        targetType: "COMMENT",
        targetId: "33333333-3333-4333-8333-333333333333",
        parentPostId: "22222222-2222-4222-8222-222222222222",
        path: "/api/v1/community/posts/22222222-2222-4222-8222-222222222222/comments",
        createdAt: "2026-08-26T01:00:00.000Z",
      },
      { APP_ENV: "test" },
      context,
    );

    expect(selfResult).toMatchObject({
      produced: 0,
      skipped: 1,
      reasons: ["SELF_NOTIFICATION"],
    });
    expect(ownerResult).toMatchObject({ produced: 1, skipped: 0 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      type: "COMMUNITY",
      deeplink:
        "salaryhijacking://community/post/22222222-2222-4222-8222-222222222222",
      metadata: {
        producer: "phase6-growth-community-producer",
        sourceEvent: "community_comment_created",
        idempotencyKey:
          "community-activity:community_comment_created:33333333-3333-4333-8333-333333333333:99999999-9999-4999-8999-999999999999",
        rawFinancialPayloadIncluded: false,
        rawPersonalDataIncluded: false,
      },
    });
    expect(JSON.stringify(calls[0])).not.toContain(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});
