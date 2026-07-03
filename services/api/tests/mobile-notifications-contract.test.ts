import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type {
  NotificationsRepository,
  NotificationsRoutesOptions,
} from "../src/routes/notifications.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const authHeaders = Object.freeze({
  "content-type": "application/json",
  "x-auth-context-source": "auth.middleware",
  "x-authenticated-user-id": "11111111-1111-4111-8111-111111111111",
  "x-auth-primary-role": "USER",
  "x-authenticated-roles": "USER",
  "x-auth-account-status": "ACTIVE",
  "x-auth-mfa-verified": "false",
  "x-correlation-id": "mobile-notifications-contract",
});

function createMobileNotificationsRepository(): NotificationsRepository<unknown> {
  const item = {
    notificationId: "22222222-2222-4222-8222-222222222222",
    type: "BUDGET_EXCEEDED",
    title: "DB-backed notifications repository is wired",
    message: "Budget notification came from the injected repository.",
    priority: "HIGH",
    channels: ["IN_APP"],
    deeplink: "salaryhijacking://notifications",
    status: "UNREAD",
    scheduledAt: null,
    expiresAt: null,
    metadata: { safeHint: "daily-budget" },
    createdAt: "2026-07-03T04:00:00.000Z",
    readAt: null,
    archivedAt: null,
    sensitiveFinancialDataExposed: false,
    adTargetingSeparated: true,
  } as const;
  const record = async () => item;

  return {
    name: "mobile-contract-notifications-repository",
    list: async () => ({
      items: [item],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
    get: async () => item,
    create: record,
    markRead: record,
    markAllRead: async () => ({
      markedReadCount: 1,
      updatedAt: "2026-07-03T04:00:00.000Z",
    }),
    archive: record,
    delete: record,
    unreadCount: async () => ({
      unreadCount: 1,
      byType: { BUDGET_EXCEEDED: 1 },
      updatedAt: "2026-07-03T04:00:00.000Z",
    }),
    summary: async () => ({
      totalCount: 1,
      unreadCount: 1,
      sensitiveFinancialDataExposed: false,
    }),
    getPreferences: async () => ({
      inAppEnabled: true,
      pushEnabled: true,
      adPartnerEnabled: false,
      sensitiveFinancialTargetingConsent: false,
    }),
    updatePreferences: async () => ({
      inAppEnabled: true,
      pushEnabled: true,
      adPartnerEnabled: false,
      sensitiveFinancialTargetingConsent: false,
    }),
    registerDevice: async () => ({
      deviceId: "device-1",
      pushTokenHashOnly: true,
      rawPushTokenExposed: false,
    }),
    revokeDevice: async () => ({
      deviceId: "device-1",
      status: "REVOKED",
    }),
    listDevices: async () => [],
    test: record,
    previewRules: async () => ({
      candidates: [],
      sensitiveFinancialDataExposed: false,
      adTargetingSeparated: true,
    }),
  };
}

describe("mobile notifications API contract", () => {
  it("lets the app gateway inject a notifications repository for DB-backed runtime wiring", async () => {
    const options = {
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      notificationsRoutesOptions: {
        repository: createMobileNotificationsRepository(),
        exposeRepositoryName: true,
      },
    } satisfies AppOptions<unknown> & {
      readonly notificationsRoutesOptions: NotificationsRoutesOptions<unknown>;
    };
    const app = createApp(options);

    const response = await app.fetch(
      new Request("https://api.test/api/v1/notifications", {
        headers: authHeaders,
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: { readonly items?: readonly Record<string, unknown>[] };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-notifications-repository")).toBe(
      "mobile-contract-notifications-repository",
    );
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.items?.[0]).toMatchObject({
      title: "DB-backed notifications repository is wired",
      sensitiveFinancialDataExposed: false,
      adTargetingSeparated: true,
    });
    expect(JSON.stringify(body)).not.toContain(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});
