import { describe, expect, it } from "vitest";
import {
  createNeonNotificationsRepository,
  shouldUseNeonNotificationsRepository,
} from "../src/repositories/notifications.repository";
import type { NotificationsRouteRuntime } from "../src/routes/notifications.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const notificationId = "22222222-2222-4222-8222-222222222222";

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
        SALARY_HIJACKING_DATABASE_URL: "postgres://example.invalid/db",
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
});
