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
export type NotificationDevicePlatform = "IOS" | "ANDROID" | "WEB";
export type NotificationDeviceStatus = "ACTIVE" | "REVOKED";
export type NotificationDeviceProvider = "FCM" | "APNS" | "EXPO";
export type NotificationDeviceTokenSource =
  | "NATIVE_DEVICE"
  | "EXPO_PUSH_SERVICE";

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
  isMandatory: boolean;
  metadata: Readonly<Record<string, unknown>>;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
  sensitiveFinancialDataExposed: false;
  adTargetingSeparated: true;
}>;

export type NotificationListResult = Readonly<{
  cursor: string | null;
  hasMore: boolean;
  items: readonly NotificationItem[];
  limit: number;
  nextCursor: string | null;
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

export type NotificationDevice = Readonly<{
  deviceId: string;
  platform: NotificationDevicePlatform;
  provider: NotificationDeviceProvider;
  pushTokenHashOnly: true;
  pushTokenPreview: string | null;
  status: NotificationDeviceStatus;
  tokenSource: NotificationDeviceTokenSource;
  registeredAt: string;
  updatedAt: string;
  revokedAt: string | null;
}>;

export type NotificationDeviceRegistrationRequest = Readonly<{
  appVersion?: string | null;
  deviceId: string;
  locale?: string | null;
  platform: NotificationDevicePlatform;
  provider?: NotificationDeviceProvider;
  pushToken: string;
  tokenSource?: NotificationDeviceTokenSource;
}>;

export type NotificationsApiClient = Readonly<{
  list: (options?: {
    readonly cursor?: string | null;
    readonly limit?: number;
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
  listDevices: () => Promise<readonly NotificationDevice[]>;
  registerDevice: (
    request: NotificationDeviceRegistrationRequest,
  ) => Promise<NotificationDevice>;
  revokeDevice: (deviceId: string) => Promise<NotificationDevice>;
}>;
