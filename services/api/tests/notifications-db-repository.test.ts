import { describe, expect, it } from "vitest";
import {
  createNeonNotificationsRepository,
  shouldUseNeonNotificationsRepository,
} from "../src/repositories/notifications.repository";
import type { NotificationsRouteRuntime } from "../src/routes/notifications.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const notificationId = "22222222-2222-4222-8222-222222222222";

function notificationCursor(createdAt: string, id: string): string {
  return Buffer.from(
    JSON.stringify({ createdAt, notificationId: id }),
    "utf8",
  ).toString("base64url");
}

function createRuntime(
  path = "/api/v1/notifications",
): NotificationsRouteRuntime<unknown> {
  return {
    request: new Request(`https://api.test${path}`),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL(`https://api.test${path}`),
    path,
    relativePath: path.replace("/api/v1/notifications", "") || "/",
    method: "GET",
    requestId: "notifications-db-repository-test",
    now: new Date("2026-07-03T04:00:00.000Z"),
    principal: {
      userId,
      roles: ["USER"],
      permissions: [],
      policyId: null,
    },
    repository: {} as never,
  };
}

function notificationRow(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    notification_id: notificationId,
    user_id: userId,
    type: "BUDGET_OVER",
    title: "Daily budget exceeded",
    body: "Your daily budget is over the planned amount.",
    target_screen: "DAILY_BUDGET",
    target_id: null,
    payload: {
      deeplink: "salaryhijacking://notifications/daily-budget",
      safeHint: "daily-budget",
      rawPushToken: "ExponentPushToken[secret]",
      salaryAmountMinor: 2_700_000,
    },
    status: "SENT",
    priority: 8,
    scheduled_at: null,
    sent_at: "2026-07-03T03:55:00.000Z",
    read_at: null,
    expires_at: null,
    created_at: "2026-07-03T03:55:00.000Z",
    updated_at: "2026-07-03T03:55:00.000Z",
    total_count: "1",
    ...extra,
  };
}

describe("Neon notifications repository", () => {
  it("uses Neon only when a supported database URL env is present", () => {
    expect(
      shouldUseNeonNotificationsRepository({
        SALARY_HIJACKING_DATABASE_URL: "postgres" + "://example.invalid/db",
      }),
    ).toBe(true);
    expect(shouldUseNeonNotificationsRepository({ APP_ENV: "test" })).toBe(
      false,
    );
  });

  it("lists DB notifications as mobile-safe unread items without raw owner, token, or financial payloads", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonNotificationsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows: [notificationRow()], rowCount: 1 };
      },
    });

    const result = await repository.list(
      { status: "UNREAD", type: "BUDGET_EXCEEDED" },
      { page: 1, pageSize: 20, offset: 0, limit: 20 },
      createRuntime(),
    );

    expect(result).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      items: [
        {
          notificationId,
          type: "BUDGET_EXCEEDED",
          title: "Daily budget exceeded",
          message: "Your daily budget is over the planned amount.",
          priority: "URGENT",
          channels: ["IN_APP"],
          status: "UNREAD",
          deeplink: "salaryhijacking://notifications/daily-budget",
          sensitiveFinancialDataExposed: false,
          adTargetingSeparated: true,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(JSON.stringify(result)).not.toContain("ExponentPushToken");
    expect(JSON.stringify(result)).not.toContain("2700000");
    expect(calls[0]?.operationName).toBe("notifications.list");
    expect(calls[0]?.sqlText).toContain("public.notifications");
    expect(calls[0]?.params).toContain(userId);
  });

  it("preserves DB mandatory notification flags for mobile archive and delete locks", async () => {
    const repository = createNeonNotificationsRepository({
      query: async () => ({
        rows: [
          notificationRow({
            payload: {
              deeplink: "salaryhijacking://notifications/security",
              isMandatory: true,
            },
            priority: 9,
            type: "SECURITY",
          }),
        ],
        rowCount: 1,
      }),
    });

    const result = await repository.list(
      { status: "UNREAD", type: "SECURITY" },
      { page: 1, pageSize: 20, offset: 0, limit: 20 },
      createRuntime(),
    );

    expect(result.items[0]).toMatchObject({
      isMandatory: true,
      priority: "URGENT",
      type: "SECURITY",
    });
  });

  it("uses stable keyset cursor pagination without leaking raw cursor fields", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const rows = Array.from({ length: 4 }, (_, index) =>
      notificationRow({
        notification_id: `${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}-${index + 1}${index + 1}${index + 1}${index + 1}-4${index + 1}${index + 1}${index + 1}-8${index + 1}${index + 1}${index + 1}-${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}`,
        created_at: `2026-07-03T04:00:0${3 - index}.000Z`,
        total_count: "4",
      }),
    );
    const repository = createNeonNotificationsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows, rowCount: rows.length };
      },
    });

    const result = await repository.list(
      { status: "UNREAD" },
      { page: 1, pageSize: 3, offset: 0, limit: 3, mode: "cursor" },
      createRuntime(),
    );

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(result.nextCursor).not.toContain("2026-07-03");
    expect(result.nextCursor).not.toContain(String(result.items[2]?.notificationId));
    expect(calls[0]?.sqlText).not.toContain("offset");
    expect(calls[0]?.params.at(-1)).toBe(4);
  });

  it("applies cursor tuple predicates and rejects malformed cursors", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonNotificationsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows: [notificationRow()], rowCount: 1 };
      },
    });

    await repository.list(
      { status: "UNREAD" },
      {
        page: 1,
        pageSize: 20,
        offset: 0,
        limit: 20,
        cursor: notificationCursor(
          "2026-07-03T04:00:00.000Z",
          "33333333-3333-4333-8333-333333333333",
        ),
      },
      createRuntime(),
    );

    expect(calls[0]?.sqlText).toContain("(n.created_at, n.notification_id) <");
    expect(calls[0]?.sqlText).not.toContain("offset");
    expect(calls[0]?.params).toContain("2026-07-03T04:00:00.000Z");
    expect(calls[0]?.params).toContain("33333333-3333-4333-8333-333333333333");

    await expect(
      repository.list(
        { status: "UNREAD" },
        {
          page: 1,
          pageSize: 20,
          offset: 0,
          limit: 20,
          cursor: "not-a-valid-cursor",
        },
        createRuntime(),
      ),
    ).rejects.toMatchObject({
      status: 400,
      code: "NOTIFICATION_CURSOR_INVALID",
    });
  });

  it("marks a DB notification read with a server-authoritative update", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonNotificationsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            notificationRow({
              status: "READ",
              read_at: "2026-07-03T04:00:00.000Z",
              updated_at: "2026-07-03T04:00:00.000Z",
            }),
          ],
          rowCount: 1,
        };
      },
    });

    const result = await repository.markRead(
      notificationId,
      createRuntime(`/api/v1/notifications/${notificationId}/read`),
    );

    expect(result).toMatchObject({
      notificationId,
      status: "READ",
      readAt: "2026-07-03T04:00:00.000Z",
      sensitiveFinancialDataExposed: false,
      adTargetingSeparated: true,
    });
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(calls.map((call) => call.operationName)).toEqual([
      "notifications.markRead",
    ]);
    expect(calls[0]?.sqlText).toContain("update public.notifications");
    expect(calls[0]?.params).toContain(notificationId);
    expect(calls[0]?.params).toContain(userId);
  });

  it("returns a stable not-found error when revoking a device outside the current user scope", async () => {
    const repository = createNeonNotificationsRepository({
      query: async () => ({ rows: [], rowCount: 0 }),
    });

    await expect(
      repository.revokeDevice(
        "33333333-3333-4333-8333-333333333333",
        createRuntime("/api/v1/notifications/devices/33333333-3333-4333-8333-333333333333"),
      ),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOTIFICATION_DEVICE_NOT_FOUND",
    });
  });

  it("persists notification preferences in user_settings including quiet hours and timezone", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const row = {
      notification_in_app_enabled: true,
      push_enabled: false,
      notification_email_enabled: true,
      payday_reminder_days_before: 3,
      fixed_payment_alert_enabled: false,
      budget_alert_enabled: true,
      growth_alert_enabled: true,
      community_alert_enabled: false,
      marketing_opt_in: false,
      notification_quiet_hours_enabled: true,
      notification_quiet_hours_start: "23:00:00",
      notification_quiet_hours_end: "07:30:00",
      timezone: "UTC",
      updated_at: "2026-07-03T04:00:00.000Z",
    };
    const repository = createNeonNotificationsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows: [row], rowCount: 1 };
      },
    });

    const result = await repository.updatePreferences(
      {
        pushEnabled: false,
        emailEnabled: true,
        paymentDueEnabled: false,
        communityEnabled: false,
        quietHoursStart: "23:00",
        quietHoursEnd: "07:30",
        timezone: "UTC",
      },
      createRuntime("/api/v1/notifications/preferences"),
    );

    expect(result).toMatchObject({
      inAppEnabled: true,
      pushEnabled: false,
      emailEnabled: true,
      paymentDueEnabled: false,
      budgetWarningEnabled: true,
      budgetExceededEnabled: true,
      levelUpEnabled: true,
      communityEnabled: false,
      quietHoursEnabled: true,
      quietHoursStart: "23:00",
      quietHoursEnd: "07:30",
      timezone: "UTC",
      sensitiveFinancialTargetingConsent: false,
    });
    expect(calls.map((call) => call.operationName)).toEqual([
      "notifications.getPreferences",
      "notifications.updatePreferences",
    ]);
    expect(calls[1]?.sqlText).toContain("insert into public.user_settings");
    expect(calls[1]?.sqlText).toContain("notification_quiet_hours_start");
    expect(calls[1]?.params).toContain(userId);
    expect(JSON.stringify(result)).not.toContain(userId);
  });

  it("uses notification dedupe keys to return identical retries and reject conflicting payloads", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    let conflict = false;
    const repository = createNeonNotificationsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        if (options.operationName === "notifications.create.dedupeLookup") {
          return conflict
            ? {
                rows: [
                  notificationRow({
                    dedupe_key: "PAYDAY:111:2026-08-25",
                    dedupe_request_hash:
                      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  }),
                ],
                rowCount: 1,
              }
            : { rows: [], rowCount: 0 };
        }
        return {
          rows: [
            notificationRow({
              dedupe_key: "PAYDAY:111:2026-08-25",
              dedupe_request_hash: String(params.at(-1)),
            }),
          ],
          rowCount: 1,
        };
      },
    });

    const created = await repository.create(
      {
        type: "PAYDAY",
        title: "Payday reminder",
        message: "Open the app to review your current cycle.",
        priority: "HIGH",
        channels: ["IN_APP"],
        deeplink: "salaryhijacking://salary",
        scheduledAt: null,
        expiresAt: null,
        metadata: { idempotencyKey: "PAYDAY:111:2026-08-25" },
      },
      createRuntime(),
    );
    expect(created).toMatchObject({ notificationId });
    expect(calls.some((call) => call.sqlText.includes("dedupe_key"))).toBe(
      true,
    );

    conflict = true;
    await expect(
      repository.create(
        {
          type: "PAYDAY",
          title: "Changed title",
          message: "Open the app to review your current cycle.",
          priority: "HIGH",
          channels: ["IN_APP"],
          deeplink: "salaryhijacking://salary",
          scheduledAt: null,
          expiresAt: null,
          metadata: { idempotencyKey: "PAYDAY:111:2026-08-25" },
        },
        createRuntime(),
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: "NOTIFICATION_IDEMPOTENCY_CONFLICT",
    });
  });

  it("returns stable not-found errors for DB-backed notification state mutations", async () => {
    const repository = createNeonNotificationsRepository({
      query: async () => ({ rows: [], rowCount: 0 }),
    });

    await expect(
      repository.markRead(notificationId, createRuntime()),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOTIFICATION_NOT_FOUND",
    });
    await expect(
      repository.archive(notificationId, createRuntime()),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOTIFICATION_NOT_FOUND",
    });
    await expect(
      repository.delete(notificationId, createRuntime()),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOTIFICATION_NOT_FOUND",
    });
  });

  it("archives read DB notifications without violating status/read_status constraints", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonNotificationsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            notificationRow({
              status: "CANCELLED",
              read_status: "READ",
              read_at: "2026-07-03T04:00:00.000Z",
              cancelled_at: "2026-07-03T04:01:00.000Z",
            }),
          ],
          rowCount: 1,
        };
      },
    });

    const result = await repository.archive(notificationId, createRuntime());

    expect(result).toMatchObject({ notificationId, status: "ARCHIVED" });
    expect(calls[0]?.operationName).toBe("notifications.archive");
    expect(calls[0]?.sqlText).toContain("status = 'CANCELLED'");
    expect(calls[0]?.sqlText).toContain("read_status = case");
    expect(calls[0]?.sqlText).toContain("when read_at is not null then 'READ'");
    expect(calls[0]?.sqlText).toContain("cancelled_at = coalesce");
  });

  it("deletes DB notifications with the canonical deleted status/read_status pair", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonNotificationsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows: [{ notification_id: notificationId }], rowCount: 1 };
      },
    });

    const result = await repository.delete(notificationId, createRuntime());

    expect(result).toMatchObject({ notificationId, status: "DELETED" });
    expect(calls[0]?.operationName).toBe("notifications.delete");
    expect(calls[0]?.sqlText).toContain("status = 'DELETED'");
    expect(calls[0]?.sqlText).toContain("read_status = 'DELETED'");
    expect(calls[0]?.sqlText).toContain("deleted_at = coalesce");
    expect(calls[0]?.sqlText).not.toContain("cancelled_at = coalesce");
  });
});
