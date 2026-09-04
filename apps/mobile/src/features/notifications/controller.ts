import type { NotificationHref } from "./components/NotificationScreen";
import type {
  NotificationDevice,
  NotificationDevicePlatform,
  NotificationDeviceProvider,
  NotificationDeviceTokenSource,
  NotificationItem,
  NotificationPreferences,
  NotificationPreferencesUpdateRequest,
  NotificationsApiClient,
  NotificationUnreadCount,
} from "./types";

export type NotificationSnapshot = Readonly<{
  cursor: string | null;
  hasMore: boolean;
  items: readonly NotificationItem[];
  limit: number;
  nextCursor: string | null;
  unreadByType: NotificationUnreadCount["byType"];
  unreadCount: number;
  updatedAt: string;
}>;

export type NotificationOpenResult = Readonly<{
  href: NotificationHref | null;
  item: NotificationItem;
}>;

export type NotificationPreferenceState = Readonly<{
  budget: boolean;
  community: boolean;
  level: boolean;
  marketing: boolean;
  push: boolean;
  quietHours: boolean;
  salary: boolean;
}>;

export type NativeNotificationPermissionStatus =
  | "DENIED"
  | "GRANTED"
  | "UNDETERMINED";

export type NativeNotificationRegistrationDependencies = Readonly<{
  appVersion: string | null;
  getDeviceId: () => Promise<string>;
  getDevicePushToken: () => Promise<string>;
  getPermissionStatus: () => Promise<NativeNotificationPermissionStatus>;
  locale: string | null;
  platform: NotificationDevicePlatform;
  requestPermission: () => Promise<NativeNotificationPermissionStatus>;
}>;

export type NativeNotificationRegistrationResult =
  | Readonly<{
      device: NotificationDevice;
      permissionStatus: "GRANTED";
      provider: NotificationDeviceProvider;
      status: "REGISTERED";
      tokenSource: NotificationDeviceTokenSource;
    }>
  | Readonly<{
      device: null;
      permissionStatus: "DENIED" | "UNDETERMINED";
      provider: NotificationDeviceProvider;
      status: "PERMISSION_DENIED";
      tokenSource: NotificationDeviceTokenSource;
    }>;

export type NativeNotificationRevokeDependencies = Readonly<{
  getDeviceId: () => Promise<string>;
}>;

export type NativeNotificationRevokeResult = Readonly<{
  deviceId: string;
  status: "REVOKED";
}>;

const ALLOWED_NOTIFICATION_HREFS = new Set<NotificationHref>([
  "/salary",
  "/level",
  "/level/reading",
  "/level/news",
  "/level/english",
  "/level/health",
]);

export async function loadNotificationSnapshot(
  api: NotificationsApiClient,
): Promise<NotificationSnapshot> {
  const [list, unread] = await Promise.all([
    api.list({ limit: 30 }),
    api.unreadCount(),
  ]);

  return {
    cursor: list.cursor,
    hasMore: list.hasMore,
    items: list.items,
    limit: list.limit,
    nextCursor: list.nextCursor,
    unreadByType: unread.byType,
    unreadCount: unread.unreadCount,
    updatedAt: unread.updatedAt,
  };
}

export async function openNotificationWithServerRead(
  api: NotificationsApiClient,
  item: NotificationItem,
): Promise<NotificationOpenResult> {
  const nextItem =
    item.status === "UNREAD" ? await api.markRead(item.notificationId) : item;

  return {
    href: toNotificationHref(nextItem.deeplink ?? item.deeplink),
    item: nextItem,
  };
}

export function toNotificationHref(
  value: string | null,
): NotificationHref | null {
  if (!value) return null;
  return ALLOWED_NOTIFICATION_HREFS.has(value as NotificationHref)
    ? (value as NotificationHref)
    : null;
}

export async function loadNotificationPreferences(
  api: NotificationsApiClient,
): Promise<NotificationPreferenceState> {
  return preferenceStateFromApi(await api.getPreferences());
}

export async function saveNotificationPreferences(
  api: NotificationsApiClient,
  state: NotificationPreferenceState,
): Promise<NotificationPreferenceState> {
  return preferenceStateFromApi(
    await api.updatePreferences(preferenceUpdateFromState(state)),
  );
}

export function preferenceStateFromApi(
  preferences: NotificationPreferences,
): NotificationPreferenceState {
  return {
    budget:
      preferences.budgetWarningEnabled && preferences.budgetExceededEnabled,
    community: preferences.communityEnabled,
    level:
      preferences.levelUpEnabled && preferences.contentRecommendationEnabled,
    marketing: preferences.adPartnerEnabled,
    push: preferences.pushEnabled,
    quietHours:
      preferences.quietHoursStart !== null &&
      preferences.quietHoursEnd !== null,
    salary: preferences.paydayEnabled && preferences.savingsGoalEnabled,
  };
}

export function preferenceUpdateFromState(
  state: NotificationPreferenceState,
): NotificationPreferencesUpdateRequest {
  return {
    adPartnerEnabled: state.marketing,
    budgetExceededEnabled: state.budget,
    budgetWarningEnabled: state.budget,
    communityEnabled: state.community,
    contentRecommendationEnabled: state.level,
    inAppEnabled: true,
    levelUpEnabled: state.level,
    paydayEnabled: state.salary,
    paymentDueEnabled: state.salary,
    pushEnabled: state.push,
    quietHoursEnd: state.quietHours ? "07:00" : null,
    quietHoursStart: state.quietHours ? "22:00" : null,
    savingsGoalEnabled: state.salary,
  };
}

export async function registerNativeNotificationDevice(
  api: NotificationsApiClient,
  dependencies: NativeNotificationRegistrationDependencies,
): Promise<NativeNotificationRegistrationResult> {
  const provider = providerForNativePlatform(dependencies.platform);
  const tokenSource = tokenSourceForNativeProvider(provider);
  let permissionStatus = await dependencies.getPermissionStatus();

  if (permissionStatus === "UNDETERMINED") {
    permissionStatus = await dependencies.requestPermission();
  }

  if (permissionStatus !== "GRANTED") {
    return {
      device: null,
      permissionStatus,
      provider,
      status: "PERMISSION_DENIED",
      tokenSource,
    };
  }

  const pushToken = (await dependencies.getDevicePushToken()).trim();
  if (!pushToken) {
    throw new Error("NOTIFICATION_PUSH_TOKEN_UNAVAILABLE");
  }

  const device = await api.registerDevice({
    appVersion: dependencies.appVersion,
    deviceId: await dependencies.getDeviceId(),
    locale: dependencies.locale,
    platform: dependencies.platform,
    provider,
    pushToken,
    tokenSource,
  });

  return {
    device,
    permissionStatus,
    provider,
    status: "REGISTERED",
    tokenSource,
  };
}

export async function revokeNativeNotificationDevice(
  api: NotificationsApiClient,
  dependencies: NativeNotificationRevokeDependencies,
): Promise<NativeNotificationRevokeResult> {
  const deviceId = await dependencies.getDeviceId();
  await api.revokeDevice(deviceId);
  return {
    deviceId,
    status: "REVOKED",
  };
}

function providerForNativePlatform(
  platform: NotificationDevicePlatform,
): NotificationDeviceProvider {
  if (platform === "IOS") return "APNS";
  if (platform === "ANDROID") return "FCM";
  return "EXPO";
}

function tokenSourceForNativeProvider(
  provider: NotificationDeviceProvider,
): NotificationDeviceTokenSource {
  return provider === "EXPO" ? "EXPO_PUSH_SERVICE" : "NATIVE_DEVICE";
}
