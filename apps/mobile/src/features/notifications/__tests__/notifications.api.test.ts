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
});
