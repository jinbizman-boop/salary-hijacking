import {
  loadNotificationPreferences,
  loadNotificationSnapshot,
  openNotificationWithServerRead,
  registerNativeNotificationDevice,
  revokeNativeNotificationDevice,
  saveNotificationPreferences,
} from "../controller";
import type {
  NotificationDevice,
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

const registeredDevice: NotificationDevice = {
  deviceId: "salary-hijacking-android-device-1",
  platform: "ANDROID",
  provider: "FCM",
  pushTokenHashOnly: true,
  pushTokenPreview: "fcm:sha256:4f2c",
  status: "ACTIVE",
  tokenSource: "NATIVE_DEVICE",
  registeredAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
  revokedAt: null,
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

  it("registers a native FCM device through the authenticated notification API without returning the raw token", async () => {
    const api = createApi({
      registerDevice: jest.fn(async () => registeredDevice),
    });

    await expect(
      registerNativeNotificationDevice(api, {
        appVersion: "1.0.0",
        getDeviceId: async () => "salary-hijacking-android-device-1",
        getDevicePushToken: async () => "fcm-native-token-value",
        getPermissionStatus: async () => "GRANTED",
        locale: "ko-KR",
        platform: "ANDROID",
        requestPermission: jest.fn(),
      }),
    ).resolves.toEqual({
      device: registeredDevice,
      permissionStatus: "GRANTED",
      provider: "FCM",
      status: "REGISTERED",
      tokenSource: "NATIVE_DEVICE",
    });

    expect(api.registerDevice).toHaveBeenCalledWith({
      appVersion: "1.0.0",
      deviceId: "salary-hijacking-android-device-1",
      locale: "ko-KR",
      platform: "ANDROID",
      provider: "FCM",
      pushToken: "fcm-native-token-value",
      tokenSource: "NATIVE_DEVICE",
    });
  });

  it("does not request or register a native push token when notification permission is denied", async () => {
    const getDevicePushToken = jest.fn();
    const requestPermission = jest.fn();
    const api = createApi({
      registerDevice: jest.fn(),
    });

    await expect(
      registerNativeNotificationDevice(api, {
        appVersion: "1.0.0",
        getDeviceId: async () => "salary-hijacking-android-device-1",
        getDevicePushToken,
        getPermissionStatus: async () => "DENIED",
        locale: "ko-KR",
        platform: "ANDROID",
        requestPermission,
      }),
    ).resolves.toEqual({
      device: null,
      permissionStatus: "DENIED",
      provider: "FCM",
      status: "PERMISSION_DENIED",
      tokenSource: "NATIVE_DEVICE",
    });

    expect(requestPermission).not.toHaveBeenCalled();
    expect(getDevicePushToken).not.toHaveBeenCalled();
    expect(api.registerDevice).not.toHaveBeenCalled();
  });

  it("revokes the current native notification device without requiring a raw push token", async () => {
    const api = createApi({
      revokeDevice: jest.fn(async () => ({
        ...registeredDevice,
        revokedAt: "2026-09-05T00:01:00.000Z",
        status: "REVOKED" as const,
        updatedAt: "2026-09-05T00:01:00.000Z",
      })),
    });

    await expect(
      revokeNativeNotificationDevice(api, {
        getDeviceId: async () => "salary-hijacking-android-device-1",
      }),
    ).resolves.toEqual({
      deviceId: "salary-hijacking-android-device-1",
      status: "REVOKED",
    });

    expect(api.revokeDevice).toHaveBeenCalledWith(
      "salary-hijacking-android-device-1",
    );
  });
});
