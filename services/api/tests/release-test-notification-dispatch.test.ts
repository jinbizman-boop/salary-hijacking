import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { NotificationsRepository } from "../src/routes/notifications.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const serviceTokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function createRepository(): NotificationsRepository<unknown> {
  return {
    name: "release-test-notification-dispatch-repository",
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
    unreadCount: vi.fn(),
    summary: vi.fn(),
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    registerDevice: vi.fn(),
    revokeDevice: vi.fn(),
    listDevices: vi.fn(),
    test: vi.fn(),
    previewRules: vi.fn(),
    releaseTestDispatchLatestActiveDevice: vi.fn(async () => ({
      attempted: true,
      eligibleDeviceCount: 1,
      notificationCreated: true,
      pushDelivery: {
        attempted: true,
        sentCount: 1,
        failureCount: 0,
        rawPushTokenExposed: false,
      },
      rawPushTokenExposed: false,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
    })),
  };
}

describe("release-test notification dispatch route", () => {
  it("requires service-token auth before dispatching to a latest active device", async () => {
    const repository = createRepository();
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      notificationsRoutesOptions: { repository },
      authOptions: {
        serviceTokenSha256Hashes: [serviceTokenHash("local-service-token")],
      },
    });

    const response = await app.fetch(
      new Request(
        "https://api.test/api/v1/internal/notifications/release-test-dispatch",
        {
          body: JSON.stringify({ appVersion: "1.0.0" }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      ),
      { APP_ENV: "staging" },
      context,
    );

    expect(response.status).toBe(401);
    expect(repository.releaseTestDispatchLatestActiveDevice).not.toHaveBeenCalled();
  });

  it("dispatches through the repository without returning raw push tokens", async () => {
    const repository = createRepository();
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      notificationsRoutesOptions: { repository },
      authOptions: {
        serviceTokenSha256Hashes: [serviceTokenHash("local-service-token")],
      },
    });

    const response = await app.fetch(
      new Request(
        "https://api.test/api/v1/internal/notifications/release-test-dispatch",
        {
          body: JSON.stringify({ appVersion: "1.0.0" }),
          headers: {
            "content-type": "application/json",
            "x-service-token": "local-service-token",
          },
          method: "POST",
        },
      ),
      { APP_ENV: "staging" },
      context,
    );
    const body = (await response.json()) as Record<string, unknown>;
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(repository.releaseTestDispatchLatestActiveDevice).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      success: true,
      data: {
        releaseTestDispatch: true,
        rawPushTokenExposed: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
      },
    });
    expect(serialized).not.toMatch(/fcm|ExponentPushToken|accessToken|refreshToken/i);
  });
});
