import {
  loadNotificationPreferences,
  loadNotificationSnapshot,
  openNotificationWithServerRead,
  saveNotificationPreferences,
} from "../controller";
import type {
  NotificationItem,
  NotificationsApiClient,
  NotificationUnreadCount,
} from "../types";

const unreadNotification: NotificationItem = {
  archivedAt: null,
  adTargetingSeparated: true,
  channels: ["IN_APP", "PUSH"],
  createdAt: "2026-07-25T00:00:00.000Z",
  deeplink: "/level/reading",
  expiresAt: null,
  isMandatory: false,
  message: "오늘의 독서 기록을 완료해 주세요.",
  metadata: {},
  notificationId: "ntf_reading",
  priority: "HIGH",
  readAt: null,
  scheduledAt: null,
  sensitiveFinancialDataExposed: false,
  status: "UNREAD",
  title: "독서 레벨업 알림",
  type: "LEVEL_UP",
};

function createApi(overrides: Partial<NotificationsApiClient> = {}) {
  const unreadCount: NotificationUnreadCount = {
    byType: { LEVEL_UP: 1 },
    unreadCount: 1,
    updatedAt: "2026-07-25T00:00:01.000Z",
  };
  return {
    archive: jest.fn(),
    delete: jest.fn(),
    getPreferences: jest.fn(),
    list: jest.fn(async () => ({
      cursor: null,
      hasMore: false,
      items: [unreadNotification],
      limit: 30,
      nextCursor: null,
    })),
    listDevices: jest.fn(),
    markAllRead: jest.fn(),
    markRead: jest.fn(async () => ({
      ...unreadNotification,
      readAt: "2026-07-25T00:00:02.000Z",
      status: "READ" as const,
    })),
    registerDevice: jest.fn(),
    revokeDevice: jest.fn(),
    unreadCount: jest.fn(async () => unreadCount),
    updatePreferences: jest.fn(),
    ...overrides,
  } satisfies NotificationsApiClient;
}

describe("notifications controller", () => {
  it("loads server-backed notification list and unread count together", async () => {
    const api = createApi();

    await expect(loadNotificationSnapshot(api)).resolves.toMatchObject({
      hasMore: false,
      items: [expect.objectContaining({ notificationId: "ntf_reading" })],
      limit: 30,
      unreadCount: 1,
    });

    expect(api.list).toHaveBeenCalledWith({ limit: 30 });
    expect(api.unreadCount).toHaveBeenCalledTimes(1);
  });

  it("marks unread notification read before returning a safe deep link", async () => {
    const api = createApi();

    await expect(
      openNotificationWithServerRead(api, unreadNotification),
    ).resolves.toMatchObject({
      href: "/level/reading",
      item: expect.objectContaining({ status: "READ" }),
    });

    expect(api.markRead).toHaveBeenCalledWith("ntf_reading");
  });

  it("does not navigate to unsupported notification deep links", async () => {
    const api = createApi();
    const unsupported = {
      ...unreadNotification,
      deeplink: "https://example.com/phishing",
      status: "READ" as const,
    };

    await expect(
      openNotificationWithServerRead(api, unsupported),
    ).resolves.toMatchObject({
      href: null,
      item: expect.objectContaining({ notificationId: "ntf_reading" }),
    });

    expect(api.markRead).not.toHaveBeenCalled();
  });

  it("loads and saves notification setting toggles through the server API", async () => {
    const api = createApi({
      getPreferences: jest.fn(async () => ({
        adPartnerEnabled: false,
        budgetExceededEnabled: true,
        budgetWarningEnabled: true,
        communityEnabled: true,
        contentRecommendationEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        levelUpEnabled: true,
        paydayEnabled: true,
        paymentDueEnabled: true,
        pushEnabled: true,
        quietHoursEnd: "07:00",
        quietHoursStart: "22:00",
        savingsGoalEnabled: true,
        securityEnabled: true,
        sensitiveFinancialTargetingConsent: false as const,
        timezone: "Asia/Seoul",
        updatedAt: "2026-07-25T00:00:00.000Z",
      })),
      updatePreferences: jest.fn(async (request) => ({
        adPartnerEnabled: request.adPartnerEnabled ?? false,
        budgetExceededEnabled: request.budgetExceededEnabled ?? true,
        budgetWarningEnabled: request.budgetWarningEnabled ?? true,
        communityEnabled: request.communityEnabled ?? true,
        contentRecommendationEnabled:
          request.contentRecommendationEnabled ?? true,
        emailEnabled: request.emailEnabled ?? false,
        inAppEnabled: request.inAppEnabled ?? true,
        levelUpEnabled: request.levelUpEnabled ?? true,
        paydayEnabled: request.paydayEnabled ?? true,
        paymentDueEnabled: request.paymentDueEnabled ?? true,
        pushEnabled: request.pushEnabled ?? false,
        quietHoursEnd: request.quietHoursEnd ?? "07:00",
        quietHoursStart: request.quietHoursStart ?? "22:00",
        savingsGoalEnabled: request.savingsGoalEnabled ?? true,
        securityEnabled: request.securityEnabled ?? true,
        sensitiveFinancialTargetingConsent: false as const,
        timezone: request.timezone ?? "Asia/Seoul",
        updatedAt: "2026-07-25T00:00:01.000Z",
      })),
    });

    await expect(loadNotificationPreferences(api)).resolves.toMatchObject({
      marketing: false,
      push: true,
      quietHours: true,
      salary: true,
    });

    await saveNotificationPreferences(api, {
      budget: true,
      community: true,
      level: true,
      marketing: true,
      push: false,
      quietHours: false,
      salary: true,
    });

    expect(api.updatePreferences).toHaveBeenCalledWith({
      adPartnerEnabled: true,
      budgetExceededEnabled: true,
      budgetWarningEnabled: true,
      communityEnabled: true,
      contentRecommendationEnabled: true,
      inAppEnabled: true,
      levelUpEnabled: true,
      paydayEnabled: true,
      paymentDueEnabled: true,
      pushEnabled: false,
      quietHoursEnd: null,
      quietHoursStart: null,
      savingsGoalEnabled: true,
    });
  });
});
