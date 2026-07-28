import type { NotificationHref } from "./components/NotificationScreen";
import type {
  NotificationItem,
  NotificationPreferences,
  NotificationPreferencesUpdateRequest,
  NotificationsApiClient,
  NotificationUnreadCount,
} from "./types";

export type NotificationSnapshot = Readonly<{
  items: readonly NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
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
    api.list({ page: 1, pageSize: 30 }),
    api.unreadCount(),
  ]);

  return {
    items: list.items,
    page: list.page,
    pageSize: list.pageSize,
    total: list.total,
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

export function toNotificationHref(value: string | null): NotificationHref | null {
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
      preferences.quietHoursStart !== null && preferences.quietHoursEnd !== null,
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
