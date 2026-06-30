/**
 * packages/types/src/domain/notification.types.ts
 * 급여납치 Salary Hijacking Platform · Notification Domain Types
 *
 * 알림 도메인 SSOT: 인앱 알림, 푸시, 이메일, 기기별 발송 이력, 수신 설정,
 * 예약/재시도, 관리자 캠페인, 감사로그, 멱등성, 개인정보·푸시토큰·재무원천데이터 분리 정책을 포함한다.
 */

export const NOTIFICATION_TYPES_CONTRACT_VERSION = "2.0.0" as const;
export const NOTIFICATION_TYPES_DOMAIN = "notification" as const;
export const NOTIFICATION_TIMEZONE = "Asia/Seoul" as const;
export const NOTIFICATION_LOCALE = "ko-KR" as const;
export const NOTIFICATION_CURRENCY = "KRW" as const;

export type UUID = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type YearMonthString =
  `${number}${number}${number}${number}-${number}${number}`;
export type HashString = string;
export type IdempotencyKey = string;
export type RequestId = string;
export type TraceId = string;
export type Locale = typeof NOTIFICATION_LOCALE | "en-US";
export type Timezone = typeof NOTIFICATION_TIMEZONE;
export type Currency = typeof NOTIFICATION_CURRENCY;
export type UrlString = string;
export type NonNegativeInteger = number;
export type PositiveInteger = number;
export type Percentage = number;
export type Nullable<T> = T | null;

export interface NotificationEntity {
  readonly id: UUID;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

export interface NotificationMutationTrace {
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly idempotencyKey?: IdempotencyKey;
}

export const NOTIFICATION_TYPES = [
  "PAYDAY",
  "FIXED_PAYMENT_DUE",
  "SAVINGS_DUE",
  "BUDGET_OVER",
  "BUDGET_REMAINING",
  "HIJACK_GOAL",
  "GROWTH_TASK",
  "GROWTH_LEVEL_UP",
  "COMMUNITY_COMMENT",
  "COMMUNITY_REACTION",
  "COMMUNITY_REPORT_RESULT",
  "NOTICE",
  "SECURITY",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_DOMAINS = [
  "PAYROLL",
  "FIXED_EXPENSE",
  "SAVINGS",
  "DAILY_BUDGET",
  "HIJACK_GOAL",
  "GROWTH",
  "COMMUNITY",
  "NOTICE",
  "SECURITY",
  "SYSTEM",
  "EVENT",
  "ADS_PARTNER",
] as const;
export type NotificationDomain = (typeof NOTIFICATION_DOMAINS)[number];

export const NOTIFICATION_TARGET_SCREENS = [
  "HOME",
  "PLAN",
  "DAILY_BUDGET",
  "FIXED_EXPENSE",
  "SAVINGS",
  "VARIABLE_EXPENSE",
  "NOTIFICATIONS",
  "LEVEL_UP",
  "COMMUNITY",
  "POST_DETAIL",
  "WRITE",
  "MY_PAGE",
  "NOTICE_DETAIL",
  "SECURITY_CENTER",
] as const;
export type NotificationTargetScreen =
  (typeof NOTIFICATION_TARGET_SCREENS)[number];

export const NOTIFICATION_STATUSES = [
  "SCHEDULED",
  "SENT",
  "READ",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ["IN_APP", "PUSH", "EMAIL"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_PROVIDERS = [
  "EXPO",
  "FCM",
  "APNS",
  "IN_APP",
  "EMAIL",
  "MOCK",
] as const;
export type NotificationProvider = (typeof NOTIFICATION_PROVIDERS)[number];

export const NOTIFICATION_DELIVERY_STATUSES = [
  "PENDING",
  "ATTEMPTED",
  "DELIVERED",
  "FAILED",
  "SKIPPED",
] as const;
export type NotificationDeliveryStatus =
  (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export const NOTIFICATION_DEVICE_PLATFORMS = [
  "IOS",
  "ANDROID",
  "WEB",
  "ADMIN_WEB",
  "UNKNOWN",
] as const;
export type NotificationDevicePlatform =
  (typeof NOTIFICATION_DEVICE_PLATFORMS)[number];

export const NOTIFICATION_DEVICE_STATUSES = [
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
  "BLOCKED",
] as const;
export type NotificationDeviceStatus =
  (typeof NOTIFICATION_DEVICE_STATUSES)[number];

export const NOTIFICATION_TEMPLATE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
] as const;
export type NotificationTemplateStatus =
  (typeof NOTIFICATION_TEMPLATE_STATUSES)[number];

export const NOTIFICATION_CAMPAIGN_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
] as const;
export type NotificationCampaignStatus =
  (typeof NOTIFICATION_CAMPAIGN_STATUSES)[number];

export const NOTIFICATION_SCHEDULE_SOURCES = [
  "USER_EVENT",
  "SERVER_RULE",
  "SCHEDULER",
  "ADMIN_MANUAL",
  "BATCH",
  "MIGRATION",
  "TEST",
] as const;
export type NotificationScheduleSource =
  (typeof NOTIFICATION_SCHEDULE_SOURCES)[number];

export const NOTIFICATION_IDEMPOTENCY_STATUSES = [
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
] as const;
export type NotificationIdempotencyStatus =
  (typeof NOTIFICATION_IDEMPOTENCY_STATUSES)[number];

export const NOTIFICATION_AUDIT_EVENT_TYPES = [
  "notification.created",
  "notification.scheduled",
  "notification.sent",
  "notification.read",
  "notification.failed",
  "notification.cancelled",
  "notification.expired",
  "notification.delivery.attempted",
  "notification.delivery.delivered",
  "notification.delivery.failed",
  "notification.delivery.skipped",
  "notification.preference.updated",
  "notification.device.registered",
  "notification.device.revoked",
  "notification.template.updated",
  "notification.campaign.started",
  "notification.campaign.cancelled",
  "notification.idempotency.replayed",
] as const;
export type NotificationAuditEventType =
  (typeof NOTIFICATION_AUDIT_EVENT_TYPES)[number];

export type NotificationPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type NotificationImportance =
  | "TRANSACTIONAL"
  | "BEHAVIORAL"
  | "COMMUNITY"
  | "MARKETING"
  | "SYSTEM_REQUIRED";
export type NotificationRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface NotificationPolicyGuard {
  readonly rawPiiIncluded: false;
  readonly rawSecretIncluded: false;
  readonly rawTokenIncluded: false;
  readonly rawPushTokenIncluded: false;
  readonly rawFinancialSourceDataIncluded: false;
  readonly salaryExpenseSavingsRawAmountIncluded: false;
  readonly adsFinancialJoinAllowed: false;
  readonly pushTokenStoredAsHashOnly: true;
  readonly marketingConsentRequiredForMarketing: true;
  readonly inAppInboxRetainedWhenPushDenied: true;
}

export const NOTIFICATION_SAFE_POLICY_GUARD: NotificationPolicyGuard =
  Object.freeze({
    rawPiiIncluded: false,
    rawSecretIncluded: false,
    rawTokenIncluded: false,
    rawPushTokenIncluded: false,
    rawFinancialSourceDataIncluded: false,
    salaryExpenseSavingsRawAmountIncluded: false,
    adsFinancialJoinAllowed: false,
    pushTokenStoredAsHashOnly: true,
    marketingConsentRequiredForMarketing: true,
    inAppInboxRetainedWhenPushDenied: true,
  });

export interface NotificationTypeDescriptor {
  readonly type: NotificationType;
  readonly domain: NotificationDomain;
  readonly nameKo: string;
  readonly emoji: string;
  readonly defaultTargetScreen: NotificationTargetScreen;
  readonly defaultPriority: NotificationPriority;
  readonly importance: NotificationImportance;
  readonly pushAllowed: boolean;
  readonly emailAllowed: boolean;
  readonly inAppRequired: boolean;
  readonly userCanDisable: boolean;
  readonly marketingConsentRequired: boolean;
  readonly adsPartnerConsentRequired: boolean;
  readonly quietHoursRespectRequired: boolean;
  readonly defaultTtlHours: PositiveInteger;
}

export const NOTIFICATION_TYPE_DESCRIPTORS: Readonly<
  Record<NotificationType, NotificationTypeDescriptor>
> = Object.freeze({
  PAYDAY: {
    type: "PAYDAY",
    domain: "PAYROLL",
    nameKo: "급여일 알림",
    emoji: "💰",
    defaultTargetScreen: "HOME",
    defaultPriority: 4,
    importance: "TRANSACTIONAL",
    pushAllowed: true,
    emailAllowed: false,
    inAppRequired: true,
    userCanDisable: true,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: true,
    defaultTtlHours: 72,
  },
  FIXED_PAYMENT_DUE: {
    type: "FIXED_PAYMENT_DUE",
    domain: "FIXED_EXPENSE",
    nameKo: "고정지출 결제 예정",
    emoji: "🧾",
    defaultTargetScreen: "FIXED_EXPENSE",
    defaultPriority: 3,
    importance: "TRANSACTIONAL",
    pushAllowed: true,
    emailAllowed: false,
    inAppRequired: true,
    userCanDisable: true,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: true,
    defaultTtlHours: 96,
  },
  SAVINGS_DUE: {
    type: "SAVINGS_DUE",
    domain: "SAVINGS",
    nameKo: "고정저축 예정",
    emoji: "🏦",
    defaultTargetScreen: "SAVINGS",
    defaultPriority: 4,
    importance: "TRANSACTIONAL",
    pushAllowed: true,
    emailAllowed: false,
    inAppRequired: true,
    userCanDisable: true,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: true,
    defaultTtlHours: 96,
  },
  BUDGET_OVER: {
    type: "BUDGET_OVER",
    domain: "DAILY_BUDGET",
    nameKo: "예산 초과",
    emoji: "🚨",
    defaultTargetScreen: "DAILY_BUDGET",
    defaultPriority: 2,
    importance: "BEHAVIORAL",
    pushAllowed: true,
    emailAllowed: false,
    inAppRequired: true,
    userCanDisable: true,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: false,
    defaultTtlHours: 24,
  },
  BUDGET_REMAINING: {
    type: "BUDGET_REMAINING",
    domain: "DAILY_BUDGET",
    nameKo: "남은 예산",
    emoji: "🟢",
    defaultTargetScreen: "DAILY_BUDGET",
    defaultPriority: 5,
    importance: "BEHAVIORAL",
    pushAllowed: true,
    emailAllowed: false,
    inAppRequired: true,
    userCanDisable: true,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: true,
    defaultTtlHours: 24,
  },
  HIJACK_GOAL: {
    type: "HIJACK_GOAL",
    domain: "HIJACK_GOAL",
    nameKo: "납치 목표 달성",
    emoji: "🏅",
    defaultTargetScreen: "HOME",
    defaultPriority: 4,
    importance: "BEHAVIORAL",
    pushAllowed: true,
    emailAllowed: false,
    inAppRequired: true,
    userCanDisable: true,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: true,
    defaultTtlHours: 168,
  },
  GROWTH_TASK: {
    type: "GROWTH_TASK",
    domain: "GROWTH",
    nameKo: "LV UP 미션",
    emoji: "⬆️",
    defaultTargetScreen: "LEVEL_UP",
    defaultPriority: 5,
    importance: "BEHAVIORAL",
    pushAllowed: true,
    emailAllowed: false,
    inAppRequired: true,
    userCanDisable: true,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: true,
    defaultTtlHours: 36,
  },
  GROWTH_LEVEL_UP: {
    type: "GROWTH_LEVEL_UP",
    domain: "GROWTH",
    nameKo: "레벨업 달성",
    emoji: "🎉",
    defaultTargetScreen: "LEVEL_UP",
    defaultPriority: 4,
    importance: "BEHAVIORAL",
    pushAllowed: true,
    emailAllowed: false,
    inAppRequired: true,
    userCanDisable: true,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: true,
    defaultTtlHours: 168,
  },
  COMMUNITY_COMMENT: {
    type: "COMMUNITY_COMMENT",
    domain: "COMMUNITY",
    nameKo: "댓글 알림",
    emoji: "💬",
    defaultTargetScreen: "POST_DETAIL",
    defaultPriority: 5,
    importance: "COMMUNITY",
    pushAllowed: true,
    emailAllowed: false,
    inAppRequired: true,
    userCanDisable: true,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: true,
    defaultTtlHours: 168,
  },
  COMMUNITY_REACTION: {
    type: "COMMUNITY_REACTION",
    domain: "COMMUNITY",
    nameKo: "커뮤니티 반응",
    emoji: "❤️",
    defaultTargetScreen: "POST_DETAIL",
    defaultPriority: 6,
    importance: "COMMUNITY",
    pushAllowed: true,
    emailAllowed: false,
    inAppRequired: true,
    userCanDisable: true,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: true,
    defaultTtlHours: 168,
  },
  COMMUNITY_REPORT_RESULT: {
    type: "COMMUNITY_REPORT_RESULT",
    domain: "COMMUNITY",
    nameKo: "신고 처리 결과",
    emoji: "🛡️",
    defaultTargetScreen: "COMMUNITY",
    defaultPriority: 4,
    importance: "SYSTEM_REQUIRED",
    pushAllowed: true,
    emailAllowed: true,
    inAppRequired: true,
    userCanDisable: false,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: false,
    defaultTtlHours: 720,
  },
  NOTICE: {
    type: "NOTICE",
    domain: "NOTICE",
    nameKo: "공지사항",
    emoji: "📢",
    defaultTargetScreen: "NOTICE_DETAIL",
    defaultPriority: 5,
    importance: "SYSTEM_REQUIRED",
    pushAllowed: true,
    emailAllowed: true,
    inAppRequired: true,
    userCanDisable: false,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: false,
    defaultTtlHours: 720,
  },
  SECURITY: {
    type: "SECURITY",
    domain: "SECURITY",
    nameKo: "보안 알림",
    emoji: "🔐",
    defaultTargetScreen: "SECURITY_CENTER",
    defaultPriority: 1,
    importance: "SYSTEM_REQUIRED",
    pushAllowed: true,
    emailAllowed: true,
    inAppRequired: true,
    userCanDisable: false,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: false,
    defaultTtlHours: 720,
  },
  SYSTEM: {
    type: "SYSTEM",
    domain: "SYSTEM",
    nameKo: "시스템 알림",
    emoji: "⚙️",
    defaultTargetScreen: "NOTIFICATIONS",
    defaultPriority: 4,
    importance: "SYSTEM_REQUIRED",
    pushAllowed: true,
    emailAllowed: true,
    inAppRequired: true,
    userCanDisable: false,
    marketingConsentRequired: false,
    adsPartnerConsentRequired: false,
    quietHoursRespectRequired: false,
    defaultTtlHours: 720,
  },
});

export interface NotificationRequestContext {
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly viewerUserId?: UUID;
  readonly adminUserId?: UUID;
  readonly locale?: Locale;
  readonly timezone?: Timezone;
  readonly appVersion?: string;
  readonly platform?:
    | "IOS"
    | "ANDROID"
    | "WEB"
    | "ADMIN"
    | "SERVER"
    | "WORKER"
    | "UNKNOWN";
}

export interface NotificationOwnerTrace {
  readonly ownerUserId: UUID;
  readonly ownerHash: HashString;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly deviceHash?: HashString;
  readonly retainedUntil: ISODateTimeString;
  readonly serverOnly: true;
}

export type NotificationPayloadPrimitive = string | number | boolean | null;
export type NotificationPayloadValue =
  | NotificationPayloadPrimitive
  | readonly NotificationPayloadPrimitive[];
export type NotificationSafePayload = Readonly<
  Record<string, NotificationPayloadValue>
>;

export interface NotificationTypedPayloadBase {
  readonly policy: NotificationPolicyGuard;
  readonly sourceDomain: NotificationDomain;
  readonly sourceId?: UUID;
  readonly summaryLabel?: string;
}

export interface PayrollNotificationPayload extends NotificationTypedPayloadBase {
  readonly sourceDomain: "PAYROLL";
  readonly payrollPlanId?: UUID;
  readonly payday?: ISODateString;
  readonly displayAmountLabel?: string;
}

export interface FixedPaymentNotificationPayload extends NotificationTypedPayloadBase {
  readonly sourceDomain: "FIXED_EXPENSE";
  readonly fixedExpenseId?: UUID;
  readonly dueDate?: ISODateString;
  readonly categoryLabel?: string;
  readonly displayAmountLabel?: string;
}

export interface SavingsNotificationPayload extends NotificationTypedPayloadBase {
  readonly sourceDomain: "SAVINGS";
  readonly savingsPlanId?: UUID;
  readonly dueDate?: ISODateString;
  readonly categoryLabel?: string;
  readonly displayAmountLabel?: string;
}

export interface BudgetNotificationPayload extends NotificationTypedPayloadBase {
  readonly sourceDomain: "DAILY_BUDGET";
  readonly dailyBudgetId?: UUID;
  readonly budgetDate?: ISODateString;
  readonly displayRemainingLabel?: string;
  readonly displayOverLabel?: string;
}

export interface HijackGoalNotificationPayload extends NotificationTypedPayloadBase {
  readonly sourceDomain: "HIJACK_GOAL";
  readonly payrollPlanId?: UUID;
  readonly yearMonth?: YearMonthString;
  readonly achievementRate?: Percentage;
  readonly achievementLabel?: string;
  readonly displayHijackAmountLabel?: string;
}

export interface GrowthNotificationPayload extends NotificationTypedPayloadBase {
  readonly sourceDomain: "GROWTH";
  readonly growthTaskId?: UUID;
  readonly growthContentId?: UUID;
  readonly growthDomain?: "READING" | "NEWS" | "ENGLISH" | "HEALTH" | "QUIZ";
  readonly level?: number;
  readonly expLabel?: string;
}

export interface CommunityNotificationPayload extends NotificationTypedPayloadBase {
  readonly sourceDomain: "COMMUNITY";
  readonly postId?: UUID;
  readonly commentId?: UUID;
  readonly reactionType?: string;
  readonly reportId?: UUID;
}

export interface NoticeNotificationPayload extends NotificationTypedPayloadBase {
  readonly sourceDomain:
    | "NOTICE"
    | "SYSTEM"
    | "SECURITY"
    | "EVENT"
    | "ADS_PARTNER";
  readonly noticeId?: UUID;
  readonly campaignId?: UUID;
  readonly severityLabel?: string;
}

export type NotificationTypedPayload =
  | PayrollNotificationPayload
  | FixedPaymentNotificationPayload
  | SavingsNotificationPayload
  | BudgetNotificationPayload
  | HijackGoalNotificationPayload
  | GrowthNotificationPayload
  | CommunityNotificationPayload
  | NoticeNotificationPayload;

export interface NotificationPreferences extends NotificationEntity {
  readonly settingId: UUID;
  readonly userId: UUID;
  readonly pushEnabled: boolean;
  readonly budgetAlertEnabled: boolean;
  readonly fixedPaymentAlertEnabled: boolean;
  readonly savingsAlertEnabled: boolean;
  readonly growthAlertEnabled: boolean;
  readonly communityAlertEnabled: boolean;
  readonly securityAlertEnabled: boolean;
  readonly marketingOptIn: boolean;
  readonly adsPartnerOptIn: boolean;
  readonly quietHoursEnabled: boolean;
  readonly quietHoursStart?: string;
  readonly quietHoursEnd?: string;
  readonly timezone: Timezone;
  readonly locale: Locale;
  readonly currencyCode: Currency;
  readonly policy: NotificationPolicyGuard;
}

export interface NotificationDevice extends NotificationEntity {
  readonly deviceId: UUID;
  readonly userId: UUID;
  readonly platform: NotificationDevicePlatform;
  readonly pushTokenHash?: HashString;
  readonly pushTokenSecretRef?: string;
  readonly deviceFingerprintHash?: HashString;
  readonly appVersion?: string;
  readonly osVersion?: string;
  readonly status: NotificationDeviceStatus;
  readonly lastSeenAt?: Nullable<ISODateTimeString>;
  readonly revokedAt?: Nullable<ISODateTimeString>;
  readonly policy: NotificationPolicyGuard;
}

export interface Notification extends NotificationEntity {
  readonly notificationId: UUID;
  readonly userId: UUID;
  readonly type: NotificationType;
  readonly domain: NotificationDomain;
  readonly title: string;
  readonly body: string;
  readonly targetScreen?: Nullable<NotificationTargetScreen>;
  readonly targetId?: Nullable<UUID>;
  readonly payload: NotificationSafePayload;
  readonly typedPayload?: NotificationTypedPayload;
  readonly status: NotificationStatus;
  readonly priority: NotificationPriority;
  readonly scheduledAt?: Nullable<ISODateTimeString>;
  readonly sentAt?: Nullable<ISODateTimeString>;
  readonly readAt?: Nullable<ISODateTimeString>;
  readonly cancelledAt?: Nullable<ISODateTimeString>;
  readonly expiresAt?: Nullable<ISODateTimeString>;
  readonly source: NotificationScheduleSource;
  readonly policy: NotificationPolicyGuard;
}

export interface NotificationInboxItem extends Notification {
  readonly emoji: string;
  readonly typeNameKo: string;
  readonly relativeTimeLabel?: string;
  readonly unread: boolean;
  readonly actionable: boolean;
}

export interface NotificationDelivery extends NotificationEntity {
  readonly deliveryId: UUID;
  readonly notificationId: UUID;
  readonly deviceId?: Nullable<UUID>;
  readonly provider: NotificationProvider;
  readonly channel: NotificationChannel;
  readonly status: NotificationDeliveryStatus;
  readonly providerMessageId?: Nullable<string>;
  readonly failureReason?: Nullable<string>;
  readonly failureCode?: Nullable<string>;
  readonly attemptCount: NonNegativeInteger;
  readonly attemptedAt?: Nullable<ISODateTimeString>;
  readonly deliveredAt?: Nullable<ISODateTimeString>;
  readonly failedAt?: Nullable<ISODateTimeString>;
  readonly skippedAt?: Nullable<ISODateTimeString>;
  readonly nextRetryAt?: Nullable<ISODateTimeString>;
  readonly policy: NotificationPolicyGuard;
}

export interface NotificationTemplate extends NotificationEntity {
  readonly templateId: UUID;
  readonly type: NotificationType;
  readonly status: NotificationTemplateStatus;
  readonly locale: Locale;
  readonly titleTemplate: string;
  readonly bodyTemplate: string;
  readonly defaultTargetScreen: NotificationTargetScreen;
  readonly defaultPriority: NotificationPriority;
  readonly defaultChannels: readonly NotificationChannel[];
  readonly requiredPayloadKeys: readonly string[];
  readonly deletedAt?: Nullable<ISODateTimeString>;
  readonly policy: NotificationPolicyGuard;
}

export interface NotificationCampaign extends NotificationEntity {
  readonly campaignId: UUID;
  readonly type: Extract<
    NotificationType,
    "NOTICE" | "SYSTEM" | "HIJACK_GOAL" | "GROWTH_TASK"
  >;
  readonly status: NotificationCampaignStatus;
  readonly name: string;
  readonly description?: string;
  readonly templateId?: UUID;
  readonly scheduledAt?: Nullable<ISODateTimeString>;
  readonly startedAt?: Nullable<ISODateTimeString>;
  readonly completedAt?: Nullable<ISODateTimeString>;
  readonly cancelledAt?: Nullable<ISODateTimeString>;
  readonly targetSegmentLabel: string;
  readonly estimatedRecipientCount: NonNegativeInteger;
  readonly marketingConsentRequired: boolean;
  readonly adsPartnerConsentRequired: boolean;
  readonly createdByAdminId: UUID;
  readonly deletedAt?: Nullable<ISODateTimeString>;
  readonly policy: NotificationPolicyGuard;
}

export interface NotificationReadState {
  readonly userId: UUID;
  readonly unreadCount: NonNegativeInteger;
  readonly latestUnreadAt?: Nullable<ISODateTimeString>;
  readonly lastReadAllAt?: Nullable<ISODateTimeString>;
}

export interface NotificationListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly cursor?: string;
  readonly sortBy?: "latest" | "oldest" | "priority" | "unread" | "type";
}

export interface NotificationPageInfo {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount?: number;
  readonly nextCursor?: string;
  readonly hasNextPage: boolean;
}

export interface NotificationSuccessResponse<TData> {
  readonly ok: true;
  readonly data: TData;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface NotificationListResponse<
  TItem,
> extends NotificationSuccessResponse<readonly TItem[]> {
  readonly pageInfo: NotificationPageInfo;
}

export interface NotificationMutationResponse<
  TData,
> extends NotificationSuccessResponse<TData> {
  readonly mutation: {
    readonly idempotencyKey?: IdempotencyKey;
    readonly replayed: boolean;
    readonly committedAt: ISODateTimeString;
  };
}

export interface NotificationErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  };
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export type NotificationApiResponse<TData> =
  | NotificationSuccessResponse<TData>
  | NotificationErrorResponse;
export type NotificationMutationApiResponse<TData> =
  | NotificationMutationResponse<TData>
  | NotificationErrorResponse;

export interface ListNotificationsRequest extends NotificationListQuery {
  readonly status?: NotificationStatus;
  readonly type?: NotificationType;
  readonly unreadOnly?: boolean;
  readonly from?: ISODateTimeString;
  readonly to?: ISODateTimeString;
  readonly context?: NotificationRequestContext;
}

export interface CreateNotificationRequest extends NotificationMutationTrace {
  readonly userId: UUID;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly targetScreen?: NotificationTargetScreen;
  readonly targetId?: UUID;
  readonly payload?: NotificationSafePayload;
  readonly typedPayload?: NotificationTypedPayload;
  readonly priority?: NotificationPriority;
  readonly channels?: readonly NotificationChannel[];
  readonly scheduledAt?: ISODateTimeString;
  readonly expiresAt?: ISODateTimeString;
  readonly source?: NotificationScheduleSource;
  readonly context?: NotificationRequestContext;
}

export interface GetNotificationRequest {
  readonly notificationId: UUID;
  readonly context?: NotificationRequestContext;
}

export interface SendNotificationNowRequest extends NotificationMutationTrace {
  readonly notificationId: UUID;
  readonly channels?: readonly NotificationChannel[];
  readonly context?: NotificationRequestContext;
}

export interface MarkNotificationReadRequest extends NotificationMutationTrace {
  readonly notificationId: UUID;
  readonly readAt?: ISODateTimeString;
  readonly context?: NotificationRequestContext;
}

export interface MarkAllNotificationsReadRequest extends NotificationMutationTrace {
  readonly readAt?: ISODateTimeString;
  readonly types?: readonly NotificationType[];
  readonly context?: NotificationRequestContext;
}

export interface CancelNotificationRequest extends NotificationMutationTrace {
  readonly notificationId: UUID;
  readonly reason?: string;
  readonly cancelledAt?: ISODateTimeString;
  readonly context?: NotificationRequestContext;
}

export interface DeleteNotificationRequest extends NotificationMutationTrace {
  readonly notificationId: UUID;
  readonly reason?: string;
  readonly hardDelete?: false;
  readonly context?: NotificationRequestContext;
}

export interface ListNotificationDeliveriesRequest extends NotificationListQuery {
  readonly notificationId?: UUID;
  readonly deviceId?: UUID;
  readonly provider?: NotificationProvider;
  readonly channel?: NotificationChannel;
  readonly status?: NotificationDeliveryStatus;
  readonly context?: NotificationRequestContext;
}

export interface RetryNotificationDeliveryRequest extends NotificationMutationTrace {
  readonly deliveryId: UUID;
  readonly nextRetryAt?: ISODateTimeString;
  readonly context?: NotificationRequestContext;
}

export interface RegisterNotificationDeviceRequest extends NotificationMutationTrace {
  readonly platform: NotificationDevicePlatform;
  readonly pushTokenHash?: HashString;
  readonly pushTokenSecretRef?: string;
  readonly deviceFingerprintHash?: HashString;
  readonly appVersion?: string;
  readonly osVersion?: string;
  readonly context?: NotificationRequestContext;
}

export interface RevokeNotificationDeviceRequest extends NotificationMutationTrace {
  readonly deviceId: UUID;
  readonly reason?: string;
  readonly revokedAt?: ISODateTimeString;
  readonly context?: NotificationRequestContext;
}

export interface UpdateNotificationPreferencesRequest extends NotificationMutationTrace {
  readonly pushEnabled?: boolean;
  readonly budgetAlertEnabled?: boolean;
  readonly fixedPaymentAlertEnabled?: boolean;
  readonly savingsAlertEnabled?: boolean;
  readonly growthAlertEnabled?: boolean;
  readonly communityAlertEnabled?: boolean;
  readonly securityAlertEnabled?: boolean;
  readonly marketingOptIn?: boolean;
  readonly adsPartnerOptIn?: boolean;
  readonly quietHoursEnabled?: boolean;
  readonly quietHoursStart?: string;
  readonly quietHoursEnd?: string;
  readonly context?: NotificationRequestContext;
}

export interface CreateNotificationTemplateAdminRequest extends NotificationMutationTrace {
  readonly type: NotificationType;
  readonly locale?: Locale;
  readonly titleTemplate: string;
  readonly bodyTemplate: string;
  readonly defaultTargetScreen?: NotificationTargetScreen;
  readonly defaultPriority?: NotificationPriority;
  readonly defaultChannels?: readonly NotificationChannel[];
  readonly requiredPayloadKeys?: readonly string[];
  readonly context?: NotificationRequestContext;
}

export interface CreateNotificationCampaignAdminRequest extends NotificationMutationTrace {
  readonly name: string;
  readonly type: NotificationCampaign["type"];
  readonly templateId?: UUID;
  readonly title?: string;
  readonly body?: string;
  readonly scheduledAt?: ISODateTimeString;
  readonly targetSegmentLabel: string;
  readonly estimatedRecipientCount?: NonNegativeInteger;
  readonly marketingConsentRequired?: boolean;
  readonly adsPartnerConsentRequired?: boolean;
  readonly context?: NotificationRequestContext;
}

export interface NotificationDeleteResult {
  readonly id: UUID;
  readonly deleted: true;
  readonly deletedAt: ISODateTimeString;
}

export type ListNotificationsResponse =
  NotificationListResponse<NotificationInboxItem>;
export type GetNotificationResponse = NotificationSuccessResponse<Notification>;
export type CreateNotificationResponse =
  NotificationMutationResponse<Notification>;
export type SendNotificationNowResponse = NotificationMutationResponse<
  readonly NotificationDelivery[]
>;
export type MarkNotificationReadResponse =
  NotificationMutationResponse<Notification>;
export type MarkAllNotificationsReadResponse =
  NotificationMutationResponse<NotificationReadState>;
export type CancelNotificationResponse =
  NotificationMutationResponse<Notification>;
export type DeleteNotificationResponse =
  NotificationMutationResponse<NotificationDeleteResult>;
export type ListNotificationDeliveriesResponse =
  NotificationListResponse<NotificationDelivery>;
export type RetryNotificationDeliveryResponse =
  NotificationMutationResponse<NotificationDelivery>;
export type RegisterNotificationDeviceResponse =
  NotificationMutationResponse<NotificationDevice>;
export type RevokeNotificationDeviceResponse =
  NotificationMutationResponse<NotificationDevice>;
export type UpdateNotificationPreferencesResponse =
  NotificationMutationResponse<NotificationPreferences>;
export type CreateNotificationTemplateAdminResponse =
  NotificationMutationResponse<NotificationTemplate>;
export type CreateNotificationCampaignAdminResponse =
  NotificationMutationResponse<NotificationCampaign>;

export type NotificationMutationOperation =
  | "CREATE_NOTIFICATION"
  | "SEND_NOTIFICATION_NOW"
  | "MARK_NOTIFICATION_READ"
  | "MARK_ALL_NOTIFICATIONS_READ"
  | "CANCEL_NOTIFICATION"
  | "DELETE_NOTIFICATION"
  | "RETRY_DELIVERY"
  | "REGISTER_DEVICE"
  | "REVOKE_DEVICE"
  | "UPDATE_PREFERENCES"
  | "ADMIN_CREATE_TEMPLATE"
  | "ADMIN_CREATE_CAMPAIGN"
  | "ADMIN_START_CAMPAIGN"
  | "ADMIN_CANCEL_CAMPAIGN";

export interface NotificationAuditLog extends NotificationEntity {
  readonly auditLogId: UUID;
  readonly eventType: NotificationAuditEventType;
  readonly actorUserId?: UUID;
  readonly adminActor?: {
    readonly adminUserId: UUID;
    readonly displayName: string;
    readonly role:
      | "OWNER"
      | "ADMIN"
      | "OPERATOR"
      | "CS_MANAGER"
      | "MARKETER"
      | "SECURITY_OPERATOR"
      | "VIEWER";
  };
  readonly targetType:
    | "NOTIFICATION"
    | "DELIVERY"
    | "DEVICE"
    | "PREFERENCE"
    | "TEMPLATE"
    | "CAMPAIGN";
  readonly targetId: UUID;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  readonly reason?: string;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly policy: NotificationPolicyGuard;
}

export interface NotificationIdempotencyRecord extends NotificationEntity {
  readonly userId: UUID;
  readonly idempotencyKey: IdempotencyKey;
  readonly operation: NotificationMutationOperation;
  readonly status: NotificationIdempotencyStatus;
  readonly requestHash: HashString;
  readonly responseReferenceId?: UUID;
  readonly errorCode?: string;
  readonly expiresAt: ISODateTimeString;
}

export interface NotificationMetricsAdmin {
  readonly notificationCount: NonNegativeInteger;
  readonly scheduledCount: NonNegativeInteger;
  readonly sentCount: NonNegativeInteger;
  readonly readCount: NonNegativeInteger;
  readonly failedCount: NonNegativeInteger;
  readonly cancelledCount: NonNegativeInteger;
  readonly expiredCount: NonNegativeInteger;
  readonly deliveryAttemptCount: NonNegativeInteger;
  readonly deliveredCount: NonNegativeInteger;
  readonly skippedCount: NonNegativeInteger;
  readonly pushDeliveryRate: Percentage;
  readonly inAppReadRate: Percentage;
  readonly clickThroughRate: Percentage;
  readonly marketingOptInRate: Percentage;
  readonly byType: readonly {
    readonly type: NotificationType;
    readonly count: NonNegativeInteger;
    readonly readRate: Percentage;
  }[];
  readonly byChannel: readonly {
    readonly channel: NotificationChannel;
    readonly attemptedCount: NonNegativeInteger;
    readonly deliveredCount: NonNegativeInteger;
    readonly failedCount: NonNegativeInteger;
  }[];
  readonly measuredAt: ISODateTimeString;
}

export const NOTIFICATION_API_PATHS = Object.freeze({
  listNotifications: "/notifications",
  getNotification: "/notifications/:notificationId",
  createNotification: "/notifications",
  sendNotificationNow: "/notifications/:notificationId/send-now",
  markNotificationRead: "/notifications/:notificationId/read",
  markAllNotificationsRead: "/notifications/read-all",
  cancelNotification: "/notifications/:notificationId/cancel",
  deleteNotification: "/notifications/:notificationId",
  listDeliveries: "/admin/notifications/deliveries",
  retryDelivery: "/admin/notifications/deliveries/:deliveryId/retry",
  registerDevice: "/notifications/devices",
  revokeDevice: "/notifications/devices/:deviceId/revoke",
  getPreferences: "/notifications/preferences",
  updatePreferences: "/notifications/preferences",
  adminCreateTemplate: "/admin/notifications/templates",
  adminCreateCampaign: "/admin/notifications/campaigns",
  adminStartCampaign: "/admin/notifications/campaigns/:campaignId/start",
  adminCancelCampaign: "/admin/notifications/campaigns/:campaignId/cancel",
  adminAuditLogs: "/admin/notifications/audit-logs",
  adminMetrics: "/admin/notifications/metrics",
} as const);

export type NotificationApiPathName = keyof typeof NOTIFICATION_API_PATHS;
export type NotificationApiPath =
  (typeof NOTIFICATION_API_PATHS)[NotificationApiPathName];
export type NotificationHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface NotificationEndpointDescriptor<TRequest, TResponse> {
  readonly method: NotificationHttpMethod;
  readonly path: NotificationApiPath;
  readonly request: TRequest;
  readonly response: TResponse;
  readonly authRequired: boolean;
  readonly adminRequired: boolean;
  readonly idempotencyRequired: boolean;
  readonly pushTokenRawAccessAllowed: false;
}

export interface NotificationEndpointTypes {
  readonly listNotifications: NotificationEndpointDescriptor<
    ListNotificationsRequest,
    ListNotificationsResponse
  >;
  readonly getNotification: NotificationEndpointDescriptor<
    GetNotificationRequest,
    GetNotificationResponse
  >;
  readonly createNotification: NotificationEndpointDescriptor<
    CreateNotificationRequest,
    CreateNotificationResponse
  >;
  readonly sendNotificationNow: NotificationEndpointDescriptor<
    SendNotificationNowRequest,
    SendNotificationNowResponse
  >;
  readonly markNotificationRead: NotificationEndpointDescriptor<
    MarkNotificationReadRequest,
    MarkNotificationReadResponse
  >;
  readonly markAllNotificationsRead: NotificationEndpointDescriptor<
    MarkAllNotificationsReadRequest,
    MarkAllNotificationsReadResponse
  >;
  readonly cancelNotification: NotificationEndpointDescriptor<
    CancelNotificationRequest,
    CancelNotificationResponse
  >;
  readonly deleteNotification: NotificationEndpointDescriptor<
    DeleteNotificationRequest,
    DeleteNotificationResponse
  >;
  readonly listDeliveries: NotificationEndpointDescriptor<
    ListNotificationDeliveriesRequest,
    ListNotificationDeliveriesResponse
  >;
  readonly retryDelivery: NotificationEndpointDescriptor<
    RetryNotificationDeliveryRequest,
    RetryNotificationDeliveryResponse
  >;
  readonly registerDevice: NotificationEndpointDescriptor<
    RegisterNotificationDeviceRequest,
    RegisterNotificationDeviceResponse
  >;
  readonly revokeDevice: NotificationEndpointDescriptor<
    RevokeNotificationDeviceRequest,
    RevokeNotificationDeviceResponse
  >;
  readonly updatePreferences: NotificationEndpointDescriptor<
    UpdateNotificationPreferencesRequest,
    UpdateNotificationPreferencesResponse
  >;
  readonly adminCreateTemplate: NotificationEndpointDescriptor<
    CreateNotificationTemplateAdminRequest,
    CreateNotificationTemplateAdminResponse
  >;
  readonly adminCreateCampaign: NotificationEndpointDescriptor<
    CreateNotificationCampaignAdminRequest,
    CreateNotificationCampaignAdminResponse
  >;
}

const includesString = <TValue extends string>(
  values: readonly TValue[],
  value: string,
): value is TValue => (values as readonly string[]).includes(value);

export const isNotificationType = (value: string): value is NotificationType =>
  includesString(NOTIFICATION_TYPES, value);
export const isNotificationDomain = (
  value: string,
): value is NotificationDomain => includesString(NOTIFICATION_DOMAINS, value);
export const isNotificationTargetScreen = (
  value: string,
): value is NotificationTargetScreen =>
  includesString(NOTIFICATION_TARGET_SCREENS, value);
export const isNotificationStatus = (
  value: string,
): value is NotificationStatus => includesString(NOTIFICATION_STATUSES, value);
export const isNotificationChannel = (
  value: string,
): value is NotificationChannel => includesString(NOTIFICATION_CHANNELS, value);
export const isNotificationProvider = (
  value: string,
): value is NotificationProvider =>
  includesString(NOTIFICATION_PROVIDERS, value);
export const isNotificationDeliveryStatus = (
  value: string,
): value is NotificationDeliveryStatus =>
  includesString(NOTIFICATION_DELIVERY_STATUSES, value);
export const isNotificationPriority = (
  value: number,
): value is NotificationPriority =>
  Number.isInteger(value) && value >= 1 && value <= 9;

export const normalizeNotificationPriority = (
  value: number | undefined,
  fallback: NotificationPriority = 5,
): NotificationPriority => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.floor(value), 9)) as NotificationPriority;
};

export const getNotificationTypeDescriptor = (
  type: NotificationType,
): NotificationTypeDescriptor => NOTIFICATION_TYPE_DESCRIPTORS[type];
export const getNotificationDomainByType = (
  type: NotificationType,
): NotificationDomain => NOTIFICATION_TYPE_DESCRIPTORS[type].domain;
export const getDefaultNotificationTargetScreen = (
  type: NotificationType,
): NotificationTargetScreen =>
  NOTIFICATION_TYPE_DESCRIPTORS[type].defaultTargetScreen;
export const getDefaultNotificationPriority = (
  type: NotificationType,
): NotificationPriority => NOTIFICATION_TYPE_DESCRIPTORS[type].defaultPriority;
export const isUnreadNotification = (
  notification: Pick<Notification, "status" | "readAt">,
): boolean => notification.status !== "READ" && notification.readAt == null;
export const isTerminalNotificationStatus = (
  status: NotificationStatus,
): boolean =>
  status === "READ" || status === "CANCELLED" || status === "EXPIRED";
export const isTerminalDeliveryStatus = (
  status: NotificationDeliveryStatus,
): boolean =>
  status === "DELIVERED" || status === "FAILED" || status === "SKIPPED";

export const canDeliverNotificationChannel = (
  type: NotificationType,
  channel: NotificationChannel,
  preferences: Pick<
    NotificationPreferences,
    | "pushEnabled"
    | "budgetAlertEnabled"
    | "fixedPaymentAlertEnabled"
    | "savingsAlertEnabled"
    | "growthAlertEnabled"
    | "communityAlertEnabled"
    | "securityAlertEnabled"
    | "marketingOptIn"
    | "adsPartnerOptIn"
  >,
): boolean => {
  const descriptor = getNotificationTypeDescriptor(type);
  if (channel === "IN_APP") return true;
  if (channel === "PUSH" && !preferences.pushEnabled) return false;
  if (descriptor.marketingConsentRequired && !preferences.marketingOptIn)
    return false;
  if (descriptor.adsPartnerConsentRequired && !preferences.adsPartnerOptIn)
    return false;
  if (
    (type === "BUDGET_OVER" || type === "BUDGET_REMAINING") &&
    !preferences.budgetAlertEnabled
  )
    return false;
  if (type === "FIXED_PAYMENT_DUE" && !preferences.fixedPaymentAlertEnabled)
    return false;
  if (type === "SAVINGS_DUE" && !preferences.savingsAlertEnabled) return false;
  if (
    (type === "GROWTH_TASK" || type === "GROWTH_LEVEL_UP") &&
    !preferences.growthAlertEnabled
  )
    return false;
  if (
    (type === "COMMUNITY_COMMENT" ||
      type === "COMMUNITY_REACTION" ||
      type === "COMMUNITY_REPORT_RESULT") &&
    !preferences.communityAlertEnabled
  )
    return false;
  if (type === "SECURITY" && !preferences.securityAlertEnabled) return false;
  if (channel === "EMAIL") return descriptor.emailAllowed;
  return descriptor.pushAllowed;
};

export const createNotificationPolicyGuard = (): NotificationPolicyGuard => ({
  ...NOTIFICATION_SAFE_POLICY_GUARD,
});

export const assertNotificationPolicyGuard = (
  guard: NotificationPolicyGuard,
): void => {
  if (
    guard.rawPiiIncluded !== false ||
    guard.rawSecretIncluded !== false ||
    guard.rawTokenIncluded !== false ||
    guard.rawPushTokenIncluded !== false ||
    guard.rawFinancialSourceDataIncluded !== false ||
    guard.salaryExpenseSavingsRawAmountIncluded !== false ||
    guard.adsFinancialJoinAllowed !== false ||
    guard.pushTokenStoredAsHashOnly !== true ||
    guard.marketingConsentRequiredForMarketing !== true ||
    guard.inAppInboxRetainedWhenPushDenied !== true
  ) {
    throw new Error(
      "Unsafe notification payload policy: raw PII, secrets, tokens, push tokens, and raw financial source data are forbidden.",
    );
  }
};

export const normalizeNotificationPageSize = (
  pageSize: number | undefined,
  fallback = 20,
  max = 100,
): number => {
  if (typeof pageSize !== "number" || !Number.isFinite(pageSize))
    return fallback;
  return Math.max(1, Math.min(Math.floor(pageSize), max));
};

export interface NotificationTypesCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof NOTIFICATION_TYPES_CONTRACT_VERSION;
  readonly typeCount: number;
  readonly channelCount: number;
  readonly providerCount: number;
  readonly targetScreenCount: number;
  readonly apiPathCount: number;
  readonly hasDeliverySeparationContract: boolean;
  readonly hasPreferenceContract: boolean;
  readonly hasDeviceTokenHashPolicy: boolean;
  readonly hasInAppWhenPushDeniedPolicy: boolean;
  readonly missing: readonly string[];
}

const requireEvery = <TValue extends string>(
  source: readonly TValue[],
  required: readonly TValue[],
  label: string,
  missing: string[],
): void => {
  for (const value of required)
    if (!source.includes(value)) missing.push(`missing ${label}: ${value}`);
};

export const getNotificationTypesCompletenessReport =
  (): NotificationTypesCompletenessReport => {
    const missing: string[] = [];
    requireEvery(
      NOTIFICATION_TYPES,
      [
        "PAYDAY",
        "FIXED_PAYMENT_DUE",
        "SAVINGS_DUE",
        "BUDGET_OVER",
        "BUDGET_REMAINING",
        "HIJACK_GOAL",
        "GROWTH_TASK",
        "GROWTH_LEVEL_UP",
        "COMMUNITY_COMMENT",
        "COMMUNITY_REACTION",
        "COMMUNITY_REPORT_RESULT",
        "NOTICE",
        "SECURITY",
        "SYSTEM",
      ] as const,
      "notification type",
      missing,
    );
    requireEvery(
      NOTIFICATION_CHANNELS,
      ["IN_APP", "PUSH", "EMAIL"] as const,
      "channel",
      missing,
    );
    requireEvery(
      NOTIFICATION_PROVIDERS,
      ["EXPO", "FCM", "APNS", "IN_APP", "EMAIL", "MOCK"] as const,
      "provider",
      missing,
    );
    requireEvery(
      NOTIFICATION_STATUSES,
      ["SCHEDULED", "SENT", "READ", "FAILED", "CANCELLED", "EXPIRED"] as const,
      "status",
      missing,
    );
    requireEvery(
      NOTIFICATION_DELIVERY_STATUSES,
      ["PENDING", "ATTEMPTED", "DELIVERED", "FAILED", "SKIPPED"] as const,
      "delivery status",
      missing,
    );
    requireEvery(
      NOTIFICATION_TARGET_SCREENS,
      [
        "HOME",
        "PLAN",
        "DAILY_BUDGET",
        "FIXED_EXPENSE",
        "SAVINGS",
        "VARIABLE_EXPENSE",
        "NOTIFICATIONS",
        "LEVEL_UP",
        "COMMUNITY",
        "POST_DETAIL",
        "WRITE",
        "MY_PAGE",
        "NOTICE_DETAIL",
        "SECURITY_CENTER",
      ] as const,
      "target screen",
      missing,
    );
    for (const type of NOTIFICATION_TYPES)
      if (!NOTIFICATION_TYPE_DESCRIPTORS[type])
        missing.push(`missing descriptor: ${type}`);
    for (const path of [
      "listNotifications",
      "createNotification",
      "sendNotificationNow",
      "markNotificationRead",
      "markAllNotificationsRead",
      "registerDevice",
      "updatePreferences",
      "adminCreateTemplate",
      "adminCreateCampaign",
      "adminMetrics",
    ] as const)
      if (!NOTIFICATION_API_PATHS[path])
        missing.push(`missing API path: ${path}`);
    if (!NOTIFICATION_SAFE_POLICY_GUARD.pushTokenStoredAsHashOnly)
      missing.push("push token must be hash-only");
    if (!NOTIFICATION_SAFE_POLICY_GUARD.inAppInboxRetainedWhenPushDenied)
      missing.push("in-app inbox must survive push denial");
    return {
      ok: missing.length === 0,
      contractVersion: NOTIFICATION_TYPES_CONTRACT_VERSION,
      typeCount: NOTIFICATION_TYPES.length,
      channelCount: NOTIFICATION_CHANNELS.length,
      providerCount: NOTIFICATION_PROVIDERS.length,
      targetScreenCount: NOTIFICATION_TARGET_SCREENS.length,
      apiPathCount: Object.keys(NOTIFICATION_API_PATHS).length,
      hasDeliverySeparationContract: true,
      hasPreferenceContract: true,
      hasDeviceTokenHashPolicy: true,
      hasInAppWhenPushDeniedPolicy: true,
      missing,
    };
  };

export const assertNotificationTypesCompleteness = (): void => {
  const report = getNotificationTypesCompletenessReport();
  if (!report.ok)
    throw new Error(
      `Notification types are incomplete: ${report.missing.join(", ")}`,
    );
};

export const NOTIFICATION_TYPES_COMPLETENESS_REPORT = Object.freeze(
  getNotificationTypesCompletenessReport(),
);

export const notificationTypes = Object.freeze({
  contractVersion: NOTIFICATION_TYPES_CONTRACT_VERSION,
  domain: NOTIFICATION_TYPES_DOMAIN,
  timezone: NOTIFICATION_TIMEZONE,
  locale: NOTIFICATION_LOCALE,
  currency: NOTIFICATION_CURRENCY,
  types: NOTIFICATION_TYPES,
  domains: NOTIFICATION_DOMAINS,
  targetScreens: NOTIFICATION_TARGET_SCREENS,
  statuses: NOTIFICATION_STATUSES,
  channels: NOTIFICATION_CHANNELS,
  providers: NOTIFICATION_PROVIDERS,
  deliveryStatuses: NOTIFICATION_DELIVERY_STATUSES,
  devicePlatforms: NOTIFICATION_DEVICE_PLATFORMS,
  deviceStatuses: NOTIFICATION_DEVICE_STATUSES,
  typeDescriptors: NOTIFICATION_TYPE_DESCRIPTORS,
  safePolicyGuard: NOTIFICATION_SAFE_POLICY_GUARD,
  apiPaths: NOTIFICATION_API_PATHS,
  completenessReport: NOTIFICATION_TYPES_COMPLETENESS_REPORT,
  getCompletenessReport: getNotificationTypesCompletenessReport,
  assertCompleteness: assertNotificationTypesCompleteness,
});

export default notificationTypes;
