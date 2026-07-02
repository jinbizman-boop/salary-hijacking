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
