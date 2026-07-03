export type NotificationType =
  | "PAYDAY"
  | "PAYMENT_DUE"
  | "BUDGET_WARNING"
  | "BUDGET_EXCEEDED"
  | "SAVINGS_GOAL"
  | "LEVEL_UP"
  | "COMMUNITY"
  | "NOTICE"
  | "SECURITY"
  | "CONTENT_RECOMMENDATION"
  | "AD_PARTNER";

export type NotificationChannel = "IN_APP" | "PUSH" | "EMAIL";
export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED" | "DELETED";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type NotificationItem = Readonly<{
  notificationId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: readonly NotificationChannel[];
  deeplink: string | null;
  status: NotificationStatus;
  scheduledAt: string | null;
  expiresAt: string | null;
  metadata: Readonly<Record<string, unknown>>;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
  sensitiveFinancialDataExposed: false;
  adTargetingSeparated: true;
}>;

export type NotificationListResult = Readonly<{
  items: readonly NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type NotificationUnreadCount = Readonly<{
  unreadCount: number;
  byType: Readonly<Partial<Record<NotificationType, number>>>;
  updatedAt: string;
}>;

export type NotificationReadAllResult = Readonly<{
  markedReadCount: number;
  updatedAt: string;
}>;

export type NotificationPreferences = Readonly<{
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  paydayEnabled: boolean;
  paymentDueEnabled: boolean;
  budgetWarningEnabled: boolean;
  budgetExceededEnabled: boolean;
  savingsGoalEnabled: boolean;
  levelUpEnabled: boolean;
  communityEnabled: boolean;
  securityEnabled: boolean;
  contentRecommendationEnabled: boolean;
  adPartnerEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  sensitiveFinancialTargetingConsent: false;
  updatedAt: string;
}>;

export type NotificationPreferencesUpdateRequest = Readonly<
  Partial<
    Pick<
      NotificationPreferences,
      | "adPartnerEnabled"
      | "budgetExceededEnabled"
      | "budgetWarningEnabled"
      | "communityEnabled"
      | "contentRecommendationEnabled"
      | "emailEnabled"
      | "inAppEnabled"
      | "levelUpEnabled"
      | "paymentDueEnabled"
      | "paydayEnabled"
      | "pushEnabled"
      | "quietHoursEnd"
      | "quietHoursStart"
      | "savingsGoalEnabled"
      | "securityEnabled"
      | "timezone"
    >
  >
>;

export type NotificationsApiClient = Readonly<{
  list: (options?: {
    readonly page?: number;
    readonly pageSize?: number;
    readonly status?: NotificationStatus;
  }) => Promise<NotificationListResult>;
  unreadCount: () => Promise<NotificationUnreadCount>;
  markRead: (notificationId: string) => Promise<NotificationItem>;
  archive: (notificationId: string) => Promise<NotificationItem>;
  delete: (notificationId: string) => Promise<NotificationItem>;
  markAllRead: () => Promise<NotificationReadAllResult>;
  getPreferences: () => Promise<NotificationPreferences>;
  updatePreferences: (
    request: NotificationPreferencesUpdateRequest,
  ) => Promise<NotificationPreferences>;
}>;
