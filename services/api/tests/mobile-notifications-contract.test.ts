import { describe, expect, it, vi } from "vitest";
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

  it("blocks archive and delete for mandatory notifications before mobile can hide them", async () => {
    const archive = vi.fn<NotificationsRepository<unknown>["archive"]>(
      async () => ({
        notificationId: "ntf_mandatory",
        status: "ARCHIVED",
      }),
    );
    const deleteNotification = vi.fn<
      NotificationsRepository<unknown>["delete"]
    >(async () => ({
      notificationId: "ntf_mandatory",
      status: "DELETED",
    }));
    const repository: NotificationsRepository<unknown> = {
      ...createMobileNotificationsRepository(),
      archive,
      delete: deleteNotification,
      get: async () => ({
        adTargetingSeparated: true,
        archivedAt: null,
        channels: ["IN_APP"],
        createdAt: "2026-07-03T04:00:00.000Z",
        deeplink: "salaryhijacking://notifications/security",
        expiresAt: null,
        isMandatory: true,
        message: "보안 공지는 사용자가 임의로 삭제하거나 보관할 수 없습니다.",
        metadata: { safeHint: "security-notice" },
        notificationId: "ntf_mandatory",
        priority: "URGENT",
        readAt: null,
        scheduledAt: null,
        sensitiveFinancialDataExposed: false,
        status: "UNREAD",
        title: "필수 보안 공지",
        type: "SECURITY",
      }),
    };
    const app = createApp({
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      notificationsRoutesOptions: { repository },
    });

    const archiveResponse = await app.fetch(
      new Request(
        "https://api.test/api/v1/notifications/ntf_mandatory/archive",
        {
          headers: authHeaders,
          method: "POST",
        },
      ),
      { APP_ENV: "development" },
      context,
    );
    const deleteResponse = await app.fetch(
      new Request("https://api.test/api/v1/notifications/ntf_mandatory", {
        headers: authHeaders,
        method: "DELETE",
      }),
      { APP_ENV: "development" },
      context,
    );

    await expect(archiveResponse.json()).resolves.toMatchObject({
      error: { code: "NOTIFICATION_MANDATORY_LOCKED" },
    });
    await expect(deleteResponse.json()).resolves.toMatchObject({
      error: { code: "NOTIFICATION_MANDATORY_LOCKED" },
    });
    expect(archiveResponse.status).toBe(409);
    expect(deleteResponse.status).toBe(409);
    expect(archive).not.toHaveBeenCalled();
    expect(deleteNotification).not.toHaveBeenCalled();
  });
});
