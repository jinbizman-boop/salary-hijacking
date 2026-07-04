import { createNotificationsApi } from "../api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

const serverNotification = {
  notificationId: "ntf_budget_warning",
  type: "BUDGET_WARNING",
  title: "예산 초과 주의",
  message: "오늘 남은 예산이 0원 아래로 내려갈 수 있어요.",
  priority: "HIGH",
  channels: "IN_APP,PUSH",
  deeplink: "/salary",
  status: "UNREAD",
  scheduledAt: null,
  expiresAt: null,
  metadata: { category: "budget" },
  createdAt: "2026-07-02T09:00:00.000Z",
  readAt: null,
  archivedAt: null,
  sensitiveFinancialDataExposed: false,
  adTargetingSeparated: true,
};

describe("notifications api", () => {
  it("lists server notifications with privacy-safe mobile headers", async () => {
    const calls: Request[] = [];
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "notification-correlation-1",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({
          data: {
            items: [serverNotification],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        });
      },
      platform: "android",
    });

    const result = await api.list();

    expect(result).toMatchObject({
      items: [
        {
          notificationId: "ntf_budget_warning",
          type: "BUDGET_WARNING",
          title: "예산 초과 주의",
          message: "오늘 남은 예산이 0원 아래로 내려갈 수 있어요.",
          priority: "HIGH",
          channels: ["IN_APP", "PUSH"],
          status: "UNREAD",
          sensitiveFinancialDataExposed: false,
          adTargetingSeparated: true,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/notifications?page=1&pageSize=20",
    );
    expect(calls[0]?.headers.get("x-correlation-id")).toBe(
      "notification-correlation-1",
    );
    expect(calls[0]?.headers.get("x-client-platform")).toBe("android");
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
    expect(JSON.stringify(result)).not.toContain("userId");
  });

  it("preserves mandatory notice flags so the app can block user archive and delete", async () => {
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            items: [
              {
                ...serverNotification,
                isMandatory: true,
                priority: "URGENT",
                type: "SECURITY",
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      platform: "android",
    });

    await expect(api.list()).resolves.toMatchObject({
      items: [
        {
          isMandatory: true,
          notificationId: "ntf_budget_warning",
          priority: "URGENT",
          type: "SECURITY",
        },
      ],
    });
  });

  it("reads unread count and marks notifications read without sending raw tokens", async () => {
    const calls: Request[] = [];
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        if (normalized.url.endsWith("/unread-count")) {
          return jsonResponse({
            data: {
              unreadCount: 2,
              byType: { BUDGET_WARNING: 1, LEVEL_UP: 1 },
              updatedAt: "2026-07-02T09:05:00.000Z",
            },
          });
        }
        if (normalized.url.endsWith("/ntf_budget_warning/read")) {
          return jsonResponse({
            data: {
              ...serverNotification,
              status: "READ",
              readAt: "2026-07-02T09:06:00.000Z",
            },
          });
        }
        return jsonResponse(
          {
            error: {
              code: "NOTIFICATION_NOT_FOUND",
              message: "알림을 찾을 수 없습니다.",
            },
          },
          404,
        );
      },
      platform: "ios",
    });

    await expect(api.unreadCount()).resolves.toMatchObject({
      unreadCount: 2,
      byType: { BUDGET_WARNING: 1, LEVEL_UP: 1 },
    });
    await expect(api.markRead("ntf_budget_warning")).resolves.toMatchObject({
      notificationId: "ntf_budget_warning",
      status: "READ",
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/notifications/unread-count",
    );
    expect(calls[1]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/notifications/ntf_budget_warning/read",
    );
    expect(calls[1]?.method).toBe("POST");
    expect(String(calls[1]?.body)).not.toMatch(/pushToken|deviceId|token/i);
  });

  it("archives a notification through the server without raw payload exposure", async () => {
    const calls: Request[] = [];
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            ...serverNotification,
            archivedAt: "2026-07-02T09:10:00.000Z",
            status: "ARCHIVED",
          },
        });
      },
      platform: "android",
    });

    await expect(api.archive("ntf_budget_warning")).resolves.toMatchObject({
      archivedAt: "2026-07-02T09:10:00.000Z",
      notificationId: "ntf_budget_warning",
      status: "ARCHIVED",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/notifications/ntf_budget_warning/archive",
    );
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(String(calls[0]?.body)).not.toMatch(
      /salary|expense|saving|token|device/i,
    );
  });

  it("deletes a notification through the server without raw payload exposure", async () => {
    const calls: Request[] = [];
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            ...serverNotification,
            archivedAt: "2026-07-02T09:20:00.000Z",
            status: "DELETED",
          },
        });
      },
      platform: "android",
    });

    await expect(api.delete("ntf_budget_warning")).resolves.toMatchObject({
      notificationId: "ntf_budget_warning",
      status: "DELETED",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/notifications/ntf_budget_warning",
    );
    expect(calls[0]?.method).toBe("DELETE");
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(String(calls[0]?.body)).not.toMatch(
      /salary|expense|saving|token|device/i,
    );
  });

  it("reads and updates notification preferences without exposing owner or financial targeting", async () => {
    const calls: Request[] = [];
    const serverPreferences = {
      userId: "user_123",
      inAppEnabled: true,
      pushEnabled: true,
      emailEnabled: false,
      paydayEnabled: true,
      paymentDueEnabled: true,
      budgetWarningEnabled: true,
      budgetExceededEnabled: true,
      savingsGoalEnabled: true,
      levelUpEnabled: true,
      communityEnabled: true,
      securityEnabled: true,
      contentRecommendationEnabled: false,
      adPartnerEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      timezone: "Asia/Seoul",
      sensitiveFinancialTargetingConsent: false,
      updatedAt: "2026-07-02T09:30:00.000Z",
    };
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        if (normalized.method === "PATCH") {
          return jsonResponse({
            data: {
              ...serverPreferences,
              pushEnabled: false,
              updatedAt: "2026-07-02T09:35:00.000Z",
            },
          });
        }
        return jsonResponse({ data: serverPreferences });
      },
      platform: "ios",
    });

    const preferences = await api.getPreferences();
    expect(preferences).toMatchObject({
      pushEnabled: true,
      quietHoursStart: "22:00",
      sensitiveFinancialTargetingConsent: false,
    });
    await expect(
      api.updatePreferences({
        contentRecommendationEnabled: true,
        pushEnabled: false,
      }),
    ).resolves.toMatchObject({
      pushEnabled: false,
      updatedAt: "2026-07-02T09:35:00.000Z",
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/notifications/preferences",
    );
    expect(calls[1]?.method).toBe("PATCH");
    await expect(calls[1]?.clone().json()).resolves.toEqual({
      contentRecommendationEnabled: true,
      pushEnabled: false,
    });
    expect(JSON.stringify(preferences)).not.toContain("userId");
  });

  it("rejects sensitive notification preference timezone values before payload construction", async () => {
    const calls: Request[] = [];
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "android",
    });

    await expect(
      api.updatePreferences({
        timezone: "owner user@example.com",
      }),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_PREFERENCES_UPDATE",
    });
    await expect(
      api.updatePreferences({
        timezone: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
      }),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_PREFERENCES_UPDATE",
    });

    expect(calls).toHaveLength(0);
  });

  it("registers, lists, and revokes notification devices without exposing raw push tokens", async () => {
    const calls: Request[] = [];
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        if (normalized.method === "GET") {
          return jsonResponse({
            data: [
              {
                deviceId: "device_android_1",
                platform: "ANDROID",
                pushTokenHashOnly: true,
                pushTokenPreview: "ExponentPushToken[abc***",
                status: "ACTIVE",
                registeredAt: "2026-07-02T09:40:00.000Z",
                updatedAt: "2026-07-02T09:40:00.000Z",
              },
            ],
          });
        }
        if (normalized.method === "DELETE") {
          return jsonResponse({
            data: {
              deviceId: "device_android_1",
              platform: "ANDROID",
              pushTokenHashOnly: true,
              pushTokenPreview: "ExponentPushToken[abc***",
              status: "REVOKED",
              registeredAt: "2026-07-02T09:40:00.000Z",
              revokedAt: "2026-07-02T09:45:00.000Z",
              updatedAt: "2026-07-02T09:40:00.000Z",
            },
          });
        }
        return jsonResponse({
          data: {
            deviceId: "device_android_1",
            platform: "ANDROID",
            pushTokenHashOnly: true,
            pushTokenPreview: "ExponentPushToken[abc***",
            status: "ACTIVE",
            registeredAt: "2026-07-02T09:40:00.000Z",
            updatedAt: "2026-07-02T09:40:00.000Z",
          },
        });
      },
      platform: "android",
    });

    await expect(api.listDevices()).resolves.toHaveLength(1);
    await expect(
      api.registerDevice({
        appVersion: "1.0.0",
        deviceId: "device_android_1",
        locale: "ko-KR",
        platform: "ANDROID",
        pushToken: "ExponentPushToken[abcdef123456]",
      }),
    ).resolves.toMatchObject({
      deviceId: "device_android_1",
      pushTokenHashOnly: true,
      status: "ACTIVE",
    });
    await expect(api.revokeDevice("device_android_1")).resolves.toMatchObject({
      deviceId: "device_android_1",
      status: "REVOKED",
    });

    expect(calls.map((call) => [call.method, call.url])).toEqual([
      ["GET", "https://api.salaryhijacking.com/api/v1/notifications/devices"],
      ["POST", "https://api.salaryhijacking.com/api/v1/notifications/devices"],
      [
        "DELETE",
        "https://api.salaryhijacking.com/api/v1/notifications/devices/device_android_1",
      ],
    ]);
    await expect(calls[1]?.clone().json()).resolves.toEqual({
      appVersion: "1.0.0",
      deviceId: "device_android_1",
      locale: "ko-KR",
      platform: "ANDROID",
      pushToken: "ExponentPushToken[abcdef123456]",
    });
    expect(JSON.stringify(await api.listDevices())).not.toContain(
      "ExponentPushToken[abcdef123456]",
    );
    expect(calls[1]?.headers.get("x-raw-push-token-exposed")).toBe("false");
  });

  it("normalizes notification device platforms to the server enum before registration", async () => {
    const calls: Request[] = [];
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            deviceId: "device_android_1",
            platform: "ANDROID",
            pushTokenHashOnly: true,
            pushTokenPreview: "ExponentPushToken[abc***",
            status: "ACTIVE",
            registeredAt: "2026-07-02T09:40:00.000Z",
            updatedAt: "2026-07-02T09:40:00.000Z",
          },
        });
      },
      platform: "android",
    });

    await expect(
      api.registerDevice({
        appVersion: "1.0.0",
        deviceId: "device_android_1",
        locale: "ko-KR",
        platform: " android " as never,
        pushToken: "ExponentPushToken[abcdef123456]",
      }),
    ).resolves.toMatchObject({
      deviceId: "device_android_1",
      platform: "ANDROID",
      status: "ACTIVE",
    });
    await expect(calls[0]?.clone().json()).resolves.toMatchObject({
      platform: "ANDROID",
    });

    await expect(
      api.registerDevice({
        appVersion: "1.0.0",
        deviceId: "device_android_1",
        locale: "ko-KR",
        platform: "desktop" as never,
        pushToken: "ExponentPushToken[abcdef123456]",
      }),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_DEVICE_REGISTRATION",
    });
    expect(calls).toHaveLength(1);
  });

  it("rejects unknown notification device registration fields before payload construction", async () => {
    const calls: Request[] = [];
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({
          data: {
            deviceId: "device_android_1",
            platform: "ANDROID",
            pushTokenHashOnly: true,
            pushTokenPreview: "ExponentPushToken[abc***",
            status: "ACTIVE",
            registeredAt: "2026-07-02T09:40:00.000Z",
            updatedAt: "2026-07-02T09:40:00.000Z",
          },
        });
      },
      platform: "android",
    });

    await expect(
      api.registerDevice({
        appVersion: "1.0.0",
        deviceId: "device_android_1",
        locale: "ko-KR",
        platform: "ANDROID",
        pushToken: "ExponentPushToken[abcdef123456]",
        rawSalaryMemo: "salary 2,700,000",
      } as never),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_DEVICE_REGISTRATION",
    });

    expect(calls).toHaveLength(0);
  });

  it("rejects notification device metadata with raw sensitive values before network access", async () => {
    const calls: Request[] = [];
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "android",
    });

    await expect(
      api.registerDevice({
        appVersion: "owner-user@example.com",
        deviceId: "device_android_1",
        locale: "ko-KR",
        platform: "ANDROID",
        pushToken: "ExponentPushToken[abcdef123456]",
      }),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_DEVICE_REGISTRATION",
    });

    await expect(
      api.registerDevice({
        appVersion: "1.0.0",
        deviceId: "device_android_1",
        locale: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
        platform: "ANDROID",
        pushToken: "ExponentPushToken[abcdef123456]",
      }),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_DEVICE_REGISTRATION",
    });

    expect(calls).toHaveLength(0);
  });

  it("rejects sensitive or invalid server payloads before the screen consumes them", async () => {
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            items: [
              {
                ...serverNotification,
                sensitiveFinancialDataExposed: true,
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      platform: "web",
    });

    await expect(api.list()).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_RESPONSE",
    });
  });

  it("rejects notification title and message text with raw sensitive values", async () => {
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            items: [
              {
                ...serverNotification,
                message: "account 123-456-789012 needs review",
                title: "contact user@example.com",
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      platform: "android",
    });

    await expect(api.list()).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_RESPONSE",
    });
  });

  it("rejects invalid notification and device ids returned by the server", async () => {
    const notificationApi = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            items: [
              {
                ...serverNotification,
                notificationId: "../ntf_budget_warning",
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      platform: "web",
    });
    const deviceApi = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: [
            {
              deviceId: "device_android_1\r\nAuthorization",
              platform: "ANDROID",
              pushTokenHashOnly: true,
              pushTokenPreview: "ExponentPushToken[abc***",
              status: "ACTIVE",
              registeredAt: "2026-07-02T09:40:00.000Z",
              updatedAt: "2026-07-02T09:40:00.000Z",
            },
          ],
        }),
      platform: "android",
    });

    await expect(notificationApi.list()).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_RESPONSE",
    });
    await expect(deviceApi.listDevices()).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_RESPONSE",
    });
  });

  it("rejects full push token previews returned by notification device APIs", async () => {
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: [
            {
              deviceId: "device_android_1",
              platform: "ANDROID",
              pushTokenHashOnly: true,
              pushTokenPreview: "ExponentPushToken[abcdef1234567890]",
              status: "ACTIVE",
              registeredAt: "2026-07-02T09:40:00.000Z",
              updatedAt: "2026-07-02T09:40:00.000Z",
            },
          ],
        }),
      platform: "android",
    });

    await expect(api.listDevices()).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_RESPONSE",
    });
  });

  it("rejects overlong notification and device path ids before network access", async () => {
    const calls: Request[] = [];
    const api = createNotificationsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: serverNotification });
      },
      platform: "android",
    });
    const overlongNotificationId = `ntf_${"a".repeat(300)}`;
    const overlongDeviceId = `device_${"b".repeat(300)}`;

    await expect(api.markRead(overlongNotificationId)).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_ID",
    });
    await expect(api.revokeDevice(overlongDeviceId)).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_DEVICE_ID",
    });

    expect(calls).toHaveLength(0);
  });
});
