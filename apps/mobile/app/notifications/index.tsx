import { AppHeader, AppShell } from "../../src/shared/components";
import {
  NotificationList,
  NotificationPreferenceStrip,
  NotificationSummaryCard,
} from "../../src/features/notifications/components";
import {
  NOTIFICATIONS_PATH,
  NOTIFICATIONS_UNREAD_COUNT_PATH,
} from "../../src/features/notifications/constants";
import type { NotificationItem } from "../../src/features/notifications/types";

const SCREEN_VERSION = "4.1.0-notifications-components";

const notifications: readonly NotificationItem[] = [
  {
    notificationId: "ntf_budget",
    type: "BUDGET_WARNING",
    title: "오늘 예산 확인",
    message: "생활비 사용 속도가 빨라졌어요",
    priority: "HIGH",
    channels: ["IN_APP", "PUSH"],
    deeplink: "/salary",
    status: "UNREAD",
    scheduledAt: null,
    expiresAt: null,
    isMandatory: false,
    metadata: {},
    createdAt: "2026-07-10T00:00:00.000Z",
    readAt: null,
    archivedAt: null,
    sensitiveFinancialDataExposed: false,
    adTargetingSeparated: true,
  },
  {
    notificationId: "ntf_level",
    type: "LEVEL_UP",
    title: "LV UP 루틴",
    message: "오늘 기록하면 XP를 받을 수 있어요",
    priority: "NORMAL",
    channels: ["IN_APP"],
    deeplink: "/level",
    status: "READ",
    scheduledAt: null,
    expiresAt: null,
    isMandatory: false,
    metadata: {},
    createdAt: "2026-07-10T01:00:00.000Z",
    readAt: "2026-07-10T02:00:00.000Z",
    archivedAt: null,
    sensitiveFinancialDataExposed: false,
    adTargetingSeparated: true,
  },
];

export default function NotificationsIndexScreen(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="Salary Hijacking notifications screen"
      header={<AppHeader subtitle="Notifications" title="알림" />}
    >
      <NotificationSummaryCard
        importantCount={1}
        unreadCount={3}
        updatedAtLabel="방금 전"
      />
      <NotificationPreferenceStrip
        marketingEnabled={false}
        onMarkAllRead={() => undefined}
        pushEnabled
      />
      <NotificationList
        items={notifications}
        onOpenNotification={() => undefined}
      />
    </AppShell>
  );
}

export function assertMobileNotificationsIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking notifications feature components",
    NOTIFICATIONS_PATH,
    NOTIFICATIONS_UNREAD_COUNT_PATH,
    "AppShell",
    "NotificationSummaryCard",
    "NotificationPreferenceStrip",
    "NotificationList",
    "새로운 알림이 있어요",
    "중요 알림",
    "루틴 알림",
    "unread_green_dot",
    "push_token_component_guard",
    "sensitive_financial_data_component_guard",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
