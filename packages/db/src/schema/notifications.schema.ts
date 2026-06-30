/**
 * packages/db/src/schema/notifications.schema.ts
 *
 * 급여납치 Salary Hijacking Platform · Notifications database schema contract.
 *
 * 파일 목적:
 * - 앱 내 알림, 푸시 발송, 기기 토큰 참조, 수신 설정, 예약/재시도 queue, dedupe, 감사 이력 DB schema contract 제공
 * - 외부 ORM/DB/Zod 패키지 정적 import 없이 bootstrap/typecheck 안정성 확보
 * - SQL DDL 생성을 위한 table/index/policy/seed metadata 제공
 * - 예산 초과, 결제 예정, 고정저축 이체, 납치목표 달성, LV UP, 커뮤니티 반응, 이벤트, 공지, 광고성 알림을 모두 수용
 * - 서버 권위 알림 생성, 멱등성, FCM 재시도, 야간 방해금지, 사용자 수신설정, 마케팅 동의, RLS/RBAC/audit 운영 원칙 반영
 * - 급여·대출·저축·소비 원천 데이터, push token 원문, secret, PII가 알림 payload/log에 섞이지 않도록 DB-level guard 설계
 */

export const NOTIFICATIONS_SCHEMA_CONTRACT_VERSION = "1.0.0";
export const NOTIFICATIONS_SCHEMA_TIMEZONE = "Asia/Seoul";
export const NOTIFICATIONS_SCHEMA_CURRENCY = "KRW";

export const notificationTypes = [
  "PAYDAY",
  "BUDGET_OVER",
  "BUDGET_REMAINING",
  "BUDGET_REMAINING_LOW",
  "FIXED_PAYMENT_DUE",
  "SAVINGS_DUE",
  "SAVINGS_TRANSFER_DUE",
  "HIJACK_GOAL",
  "HIJACK_GOAL_ACHIEVED",
  "GROWTH_TASK",
  "GROWTH_MISSION",
  "GROWTH_LEVEL_UP",
  "COMMUNITY_COMMENT",
  "COMMUNITY_REACTION",
  "COMMUNITY_LIKE",
  "COMMUNITY_REPORT_RESULT",
  "EVENT_REWARD",
  "NOTICE",
  "AD_PROMOTION",
  "SECURITY",
  "SYSTEM",
] as const;

export const requiredNotificationTypes = [
  "BUDGET_OVER",
  "BUDGET_REMAINING_LOW",
  "FIXED_PAYMENT_DUE",
  "SAVINGS_TRANSFER_DUE",
  "HIJACK_GOAL_ACHIEVED",
  "GROWTH_MISSION",
  "GROWTH_LEVEL_UP",
  "COMMUNITY_COMMENT",
  "COMMUNITY_LIKE",
  "EVENT_REWARD",
  "NOTICE",
  "AD_PROMOTION",
] as const;

export const notificationStatuses = [
  "CREATED",
  "SCHEDULED",
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "SUPPRESSED",
  "CANCELLED",
  "EXPIRED",
  "DELETED",
] as const;

export const notificationReadStatuses = ["UNREAD", "READ", "DELETED"] as const;

export const notificationChannels = [
  "IN_APP",
  "PUSH",
  "ADMIN_NOTICE",
  "EMAIL",
] as const;

export const notificationDeliveryProviders = [
  "IN_APP",
  "FCM",
  "EXPO",
  "APNS",
  "ADMIN",
  "MOCK",
] as const;

export const notificationDeliveryStatuses = [
  "PENDING",
  "ATTEMPTED",
  "SENT",
  "DELIVERED",
  "FAILED_RETRYABLE",
  "FAILED_PERMANENT",
  "SKIPPED",
  "SUPPRESSED",
] as const;

export const notificationPreferenceKeys = [
  "PUSH_GLOBAL",
  "BUDGET_ALERT",
  "FIXED_PAYMENT_ALERT",
  "SAVINGS_ALERT",
  "GROWTH_ALERT",
  "COMMUNITY_ALERT",
  "EVENT_ALERT",
  "NOTICE_ALERT",
  "MARKETING",
  "AD_PROMOTION",
] as const;

export const notificationTargetScreens = [
  "HOME",
  "SALARY_HOME",
  "PLAN",
  "DAILY_BUDGET",
  "FIXED_EXPENSE",
  "SAVINGS",
  "VARIABLE_EXPENSE",
  "NOTIFICATIONS",
  "LEVEL_UP",
  "GROWTH_READING",
  "GROWTH_NEWS",
  "GROWTH_ENGLISH",
  "GROWTH_HEALTH",
  "COMMUNITY",
  "POST_DETAIL",
  "WRITE",
  "MY_PAGE",
  "ACHIEVEMENT",
  "EVENT",
  "NOTICE_DETAIL",
  "AD_LANDING",
  "SECURITY_CENTER",
] as const;

export const notificationSourceDomains = [
  "payroll",
  "budget",
  "expense",
  "savings",
  "growth",
  "community",
  "event",
  "notice",
  "ad",
  "admin",
  "system",
] as const;

export const notificationTriggerKinds = [
  "PAYDAY_SCHEDULE",
  "DAILY_BUDGET_OVER",
  "DAILY_BUDGET_REMAINING_LOW",
  "FIXED_PAYMENT_DUE",
  "SAVINGS_TRANSFER_DUE",
  "HIJACK_GOAL_ACHIEVED",
  "GROWTH_MISSION_SCHEDULE",
  "GROWTH_LEVEL_UP",
  "COMMUNITY_INTERACTION",
  "EVENT_REWARD_GRANTED",
  "ADMIN_NOTICE_PUBLISHED",
  "AD_PROMOTION_APPROVED",
  "SECURITY_EVENT",
] as const;

export const notificationJobStatuses = [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED_RETRYABLE",
  "FAILED_PERMANENT",
  "CANCELLED",
] as const;

export const notificationPushTokenStatuses = [
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
  "BLOCKED",
] as const;

export const notificationDevicePlatforms = [
  "IOS",
  "ANDROID",
  "WEB",
  "ADMIN_WEB",
  "UNKNOWN",
] as const;

export const notificationPushPermissionStatuses = [
  "AUTHORIZED",
  "DENIED",
  "PROVISIONAL",
  "EPHEMERAL",
  "NOT_DETERMINED",
] as const;

export const notificationSuppressionReasons = [
  "USER_PUSH_DISABLED",
  "TYPE_PREFERENCE_DISABLED",
  "MARKETING_OPT_IN_REQUIRED",
  "PUSH_PERMISSION_DENIED",
  "QUIET_HOURS",
  "DEDUPED",
  "EXPIRED",
  "NO_ACTIVE_DEVICE",
  "INVALID_TOKEN",
  "RATE_LIMITED",
  "ADMIN_CANCELLED",
] as const;

export const notificationAuditEventTypes = [
  "NOTIFICATION_CREATED",
  "NOTIFICATION_SCHEDULED",
  "NOTIFICATION_SENT",
  "NOTIFICATION_DELIVERED",
  "NOTIFICATION_READ",
  "NOTIFICATION_DELETED",
  "NOTIFICATION_SUPPRESSED",
  "DELIVERY_FAILED",
  "DELIVERY_RETRIED",
  "PREFERENCE_CHANGED",
  "PUSH_TOKEN_REGISTERED",
  "PUSH_TOKEN_REVOKED",
  "ADMIN_BROADCAST_CREATED",
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type RequiredNotificationType =
  (typeof requiredNotificationTypes)[number];
export type NotificationStatus = (typeof notificationStatuses)[number];
export type NotificationReadStatus = (typeof notificationReadStatuses)[number];
export type NotificationChannel = (typeof notificationChannels)[number];
export type NotificationDeliveryProvider =
  (typeof notificationDeliveryProviders)[number];
export type NotificationDeliveryStatus =
  (typeof notificationDeliveryStatuses)[number];
export type NotificationPreferenceKey =
  (typeof notificationPreferenceKeys)[number];
export type NotificationTargetScreen =
  (typeof notificationTargetScreens)[number];
export type NotificationSourceDomain =
  (typeof notificationSourceDomains)[number];
export type NotificationTriggerKind = (typeof notificationTriggerKinds)[number];
export type NotificationJobStatus = (typeof notificationJobStatuses)[number];
export type NotificationPushTokenStatus =
  (typeof notificationPushTokenStatuses)[number];
export type NotificationDevicePlatform =
  (typeof notificationDevicePlatforms)[number];
export type NotificationPushPermissionStatus =
  (typeof notificationPushPermissionStatuses)[number];
export type NotificationSuppressionReason =
  (typeof notificationSuppressionReasons)[number];
export type NotificationAuditEventType =
  (typeof notificationAuditEventTypes)[number];

export type DbColumnType =
  | "uuid"
  | "text"
  | "boolean"
  | "smallint"
  | "integer"
  | "bigint"
  | "date"
  | "time"
  | "timestamptz"
  | "jsonb"
  | `char(${number})`
  | `varchar(${number})`;

export interface DbColumnReferenceSpec {
  readonly table: string;
  readonly column: string;
  readonly onDelete?: "cascade" | "restrict" | "set null" | "no action";
  readonly onUpdate?: "cascade" | "restrict" | "set null" | "no action";
}

export interface DbColumnSpec {
  readonly name: string;
  readonly type: DbColumnType;
  readonly primaryKey?: boolean;
  readonly notNull?: boolean;
  readonly unique?: boolean;
  readonly defaultSql?: string;
  readonly references?: DbColumnReferenceSpec;
  readonly checks?: readonly string[];
  readonly comment?: string;
  readonly sensitivity?: "S1" | "S2" | "S3" | "S4" | "S5";
  readonly containsRawFinancialData?: boolean;
  readonly containsRawPushToken?: boolean;
  readonly containsPii?: boolean;
}

export interface DbTableSpec {
  readonly name: string;
  readonly description: string;
  readonly columns: readonly DbColumnSpec[];
  readonly constraints?: readonly string[];
  readonly rlsRequired: boolean;
  readonly auditRequired: boolean;
  readonly containsFinancialSourceData: boolean;
  readonly containsRawPushToken: boolean;
}

export interface DbIndexSpec {
  readonly name: string;
  readonly table: string;
  readonly columns: readonly string[];
  readonly unique?: boolean;
  readonly whereSql?: string;
  readonly method?: "btree" | "gin";
}

export interface DbPolicySpec {
  readonly name: string;
  readonly table: string;
  readonly command: "select" | "insert" | "update" | "delete" | "all";
  readonly role: "authenticated" | "service_role" | "admin";
  readonly usingSql?: string;
  readonly checkSql?: string;
}

export interface NotificationTemplateSeed {
  readonly slug: string;
  readonly type: RequiredNotificationType;
  readonly titleKo: string;
  readonly bodyKo: string;
  readonly targetScreen: NotificationTargetScreen;
  readonly defaultChannel: NotificationChannel;
  readonly defaultPriority: number;
  readonly marketing: boolean;
  readonly isSystem: true;
}

export interface NotificationsSchemaCompletenessReport {
  readonly ok: boolean;
  readonly tableCount: number;
  readonly indexCount: number;
  readonly policyCount: number;
  readonly seedCount: number;
  readonly ddlStatementCount: number;
  readonly missing: readonly string[];
}

export const notificationsSchemaPolicy = Object.freeze({
  project: "salary-hijacking-platform",
  packageScope: "packages/db",
  file: "packages/db/src/schema/notifications.schema.ts",
  contractVersion: NOTIFICATIONS_SCHEMA_CONTRACT_VERSION,
  timezone: NOTIFICATIONS_SCHEMA_TIMEZONE,
  currency: NOTIFICATIONS_SCHEMA_CURRENCY,
  schemaAuthority: "server-database-contract",
  serverAuthorityRequired: true,
  browserDirectDatabaseAccessAllowed: false,
  clientFinalNotificationCreationAllowed: false,
  appInNotificationRequired: true,
  pushOptionalByUserPermission: true,
  fcmHttpV1Compatible: true,
  notificationPermissionOptional: true,
  quietHoursDefaultLocal: "22:00-08:00",
  criticalFinancialAlertsMayBypassQuietHours: true,
  contentAndMarketingPushDelayedInQuietHours: true,
  dedupeKeyUniqueRequired: true,
  dispatchRequiresIdempotency: true,
  pushTokenRawStorageAllowed: false,
  pushTokenHashOrSecretRefOnly: true,
  rawFinancialDataInNotificationPayloadAllowed: false,
  rawFinancialDataInDeliveryLogAllowed: false,
  rawFinancialDataInAdsEventAllowed: false,
  rawTokenInResponseAllowed: false,
  rawSecretInResponseAllowed: false,
  rawPiiInLogsAllowed: false,
  marketingNotificationRequiresOptIn: true,
  adPromotionRequiresMarketingOptIn: true,
  rlsRequired: true,
  auditRequired: true,
  finalStatus: "file_unit_100_percent_document_theoretical_complete",
});

const enumCheck = (columnName: string, values: readonly string[]): string =>
  `${columnName} in (${values.map((value) => `'${value}'`).join(", ")})`;

const falseOnlyCheck = (columnName: string): string => `${columnName} = false`;
const nonNegativeCheck = (columnName: string): string => `${columnName} >= 0`;
const trimmedLengthBetweenCheck = (
  columnName: string,
  min: number,
  max: number,
): string => `char_length(trim(${columnName})) between ${min} and ${max}`;

const createdUpdatedColumns = [
  {
    name: "created_at",
    type: "timestamptz",
    notNull: true,
    defaultSql: "now()",
  },
  {
    name: "updated_at",
    type: "timestamptz",
    notNull: true,
    defaultSql: "now()",
  },
] as const satisfies readonly DbColumnSpec[];

const safetyFlagColumns = [
  {
    name: "raw_financial_source_data_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_financial_source_data_included")],
    comment:
      "급여·대출·저축·소비 원천 데이터 원문 저장 금지. 금액은 필요한 경우 서버가 생성한 안전 문구/집계값만 허용.",
  },
  {
    name: "raw_push_token_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_push_token_included")],
    comment:
      "FCM/APNs/Expo push token 원문 저장 금지. hash 또는 secret reference만 사용.",
  },
  {
    name: "raw_token_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_token_included")],
    comment: "access token, refresh token, session token 원문 저장 금지.",
  },
  {
    name: "raw_secret_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_secret_included")],
    comment: "API key, service account, webhook secret, DB URL 원문 저장 금지.",
  },
  {
    name: "raw_pii_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_pii_included")],
    comment:
      "이메일, 전화번호, 계좌번호, 주민번호 등 원문 PII 저장 금지. 필요한 값은 hash/masking snapshot만 허용.",
  },
] as const satisfies readonly DbColumnSpec[];

const actorContextColumns = [
  {
    name: "request_id",
    type: "varchar(128)",
    comment: "API gateway/request middleware가 생성한 요청 추적 ID.",
  },
  {
    name: "created_by",
    type: "uuid",
    comment:
      "생성 주체 user_id/admin_id/system actor. 서비스 계층에서 검증한다.",
  },
  {
    name: "updated_by",
    type: "uuid",
    comment:
      "마지막 수정 주체 user_id/admin_id/system actor. 서비스 계층에서 검증한다.",
  },
] as const satisfies readonly DbColumnSpec[];

export const notificationsSchemaTables = [
  {
    name: "notification_templates",
    description:
      "알림 유형별 기본 문구, 연결 화면, 채널, 우선순위 템플릿. 운영자 공지/이벤트/마케팅 문구 검수 기반.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: false,
    containsRawPushToken: false,
    columns: [
      {
        name: "template_id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        defaultSql: "gen_random_uuid()",
      },
      {
        name: "slug",
        type: "varchar(96)",
        notNull: true,
        unique: true,
        checks: ["slug ~ '^[a-z0-9][a-z0-9_-]{1,94}[a-z0-9]$'"],
      },
      {
        name: "type",
        type: "varchar(48)",
        notNull: true,
        checks: [enumCheck("type", notificationTypes)],
      },
      {
        name: "title_template",
        type: "varchar(140)",
        notNull: true,
        checks: [trimmedLengthBetweenCheck("title_template", 1, 140)],
      },
      {
        name: "body_template",
        type: "text",
        notNull: true,
        checks: [trimmedLengthBetweenCheck("body_template", 1, 1200)],
      },
      {
        name: "target_screen",
        type: "varchar(48)",
        checks: [enumCheck("target_screen", notificationTargetScreens)],
      },
      {
        name: "default_channel",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'IN_APP'",
        checks: [enumCheck("default_channel", notificationChannels)],
      },
      {
        name: "default_priority",
        type: "smallint",
        notNull: true,
        defaultSql: "5",
        checks: ["default_priority between 1 and 9"],
      },
      {
        name: "is_marketing",
        type: "boolean",
        notNull: true,
        defaultSql: "false",
      },
      { name: "is_system", type: "boolean", notNull: true, defaultSql: "true" },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'ACTIVE'",
        checks: ["status in ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')"],
      },
      {
        name: "metadata",
        type: "jsonb",
        notNull: true,
        defaultSql: "'{}'::jsonb",
      },
      ...safetyFlagColumns,
      ...actorContextColumns,
      ...createdUpdatedColumns,
    ],
    constraints: [
      "constraint notification_templates_marketing_type_check check (is_marketing = false or type = 'AD_PROMOTION' or type = 'EVENT_REWARD')",
    ],
  },
  {
    name: "notifications",
    description:
      "사용자 앱 내 알림 원장. 푸시 여부와 무관하게 모든 알림은 이 테이블에 저장되어 알림 화면 최신순 목록과 읽음 처리를 지원한다.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: false,
    containsRawPushToken: false,
    columns: [
      {
        name: "notification_id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        defaultSql: "gen_random_uuid()",
      },
      {
        name: "user_id",
        type: "uuid",
        notNull: true,
        references: { table: "users", column: "user_id", onDelete: "cascade" },
      },
      {
        name: "type",
        type: "varchar(48)",
        notNull: true,
        checks: [enumCheck("type", notificationTypes)],
      },
      {
        name: "source_domain",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'system'",
        checks: [enumCheck("source_domain", notificationSourceDomains)],
      },
      {
        name: "source_event_id",
        type: "uuid",
        comment:
          "예산/지출/저축/성장/커뮤니티 등 원천 이벤트 식별자. 원천 payload 직접 복사 금지.",
      },
      {
        name: "trigger_kind",
        type: "varchar(48)",
        checks: [enumCheck("trigger_kind", notificationTriggerKinds)],
      },
      {
        name: "template_id",
        type: "uuid",
        references: {
          table: "notification_templates",
          column: "template_id",
          onDelete: "set null",
        },
      },
      {
        name: "dedupe_key",
        type: "varchar(256)",
        checks: [
          "dedupe_key is null or char_length(trim(dedupe_key)) between 8 and 256",
        ],
      },
      {
        name: "title",
        type: "varchar(140)",
        notNull: true,
        checks: [trimmedLengthBetweenCheck("title", 1, 140)],
      },
      {
        name: "body",
        type: "text",
        notNull: true,
        checks: [trimmedLengthBetweenCheck("body", 1, 1200)],
      },
      {
        name: "target_screen",
        type: "varchar(48)",
        checks: [enumCheck("target_screen", notificationTargetScreens)],
      },
      { name: "target_id", type: "uuid" },
      {
        name: "deep_link",
        type: "varchar(512)",
        checks: [
          "deep_link is null or deep_link ~ '^salaryhijacking://[a-zA-Z0-9/_?=&.-]+$'",
        ],
      },
      {
        name: "payload",
        type: "jsonb",
        notNull: true,
        defaultSql: "'{}'::jsonb",
      },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'CREATED'",
        checks: [enumCheck("status", notificationStatuses)],
      },
      {
        name: "read_status",
        type: "varchar(16)",
        notNull: true,
        defaultSql: "'UNREAD'",
        checks: [enumCheck("read_status", notificationReadStatuses)],
      },
      {
        name: "priority",
        type: "smallint",
        notNull: true,
        defaultSql: "5",
        checks: ["priority between 1 and 9"],
      },
      {
        name: "push_required",
        type: "boolean",
        notNull: true,
        defaultSql: "false",
      },
      {
        name: "marketing",
        type: "boolean",
        notNull: true,
        defaultSql: "false",
      },
      {
        name: "critical",
        type: "boolean",
        notNull: true,
        defaultSql: "false",
        comment:
          "예산/결제/보안 등 야간 방해금지 예외 후보. 서비스 정책에서 최종 판단한다.",
      },
      { name: "scheduled_at", type: "timestamptz" },
      { name: "queued_at", type: "timestamptz" },
      { name: "sent_at", type: "timestamptz" },
      { name: "delivered_at", type: "timestamptz" },
      { name: "read_at", type: "timestamptz" },
      { name: "suppressed_at", type: "timestamptz" },
      { name: "cancelled_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
      { name: "expires_at", type: "timestamptz" },
      ...safetyFlagColumns,
      ...actorContextColumns,
      ...createdUpdatedColumns,
    ],
    constraints: [
      "constraint notifications_dedupe_key_required_for_push check (push_required = false or dedupe_key is not null)",
      "constraint notifications_marketing_type_check check (marketing = false or type in ('AD_PROMOTION', 'EVENT_REWARD'))",
      "constraint notifications_ad_marketing_check check (type <> 'AD_PROMOTION' or marketing = true)",
      "constraint notifications_sent_status_consistency check (sent_at is null or status in ('SENT', 'DELIVERED', 'READ'))",
      "constraint notifications_delivered_status_consistency check (delivered_at is null or status in ('DELIVERED', 'READ'))",
      "constraint notifications_read_status_consistency check ((read_at is null and read_status <> 'READ') or (read_at is not null and read_status = 'READ' and status in ('READ', 'DELIVERED', 'SENT')))",
      "constraint notifications_deleted_status_consistency check ((deleted_at is null and read_status <> 'DELETED' and status <> 'DELETED') or (deleted_at is not null and read_status = 'DELETED' and status = 'DELETED'))",
      "constraint notifications_suppressed_status_consistency check (suppressed_at is null or status = 'SUPPRESSED')",
      "constraint notifications_cancelled_status_consistency check (cancelled_at is null or status = 'CANCELLED')",
      "constraint notifications_expire_after_create check (expires_at is null or expires_at >= created_at)",
    ],
  },
  {
    name: "notification_push_tokens",
    description:
      "푸시 발송 대상 토큰의 안전 참조. 토큰 원문은 저장하지 않고 hash/secret reference로만 추적한다.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: false,
    containsRawPushToken: false,
    columns: [
      {
        name: "push_token_id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        defaultSql: "gen_random_uuid()",
      },
      {
        name: "user_id",
        type: "uuid",
        notNull: true,
        references: { table: "users", column: "user_id", onDelete: "cascade" },
      },
      {
        name: "device_id",
        type: "uuid",
        references: {
          table: "user_devices",
          column: "device_id",
          onDelete: "set null",
        },
      },
      {
        name: "platform",
        type: "varchar(24)",
        notNull: true,
        checks: [enumCheck("platform", notificationDevicePlatforms)],
      },
      {
        name: "provider",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'FCM'",
        checks: [enumCheck("provider", notificationDeliveryProviders)],
      },
      {
        name: "token_hash",
        type: "varchar(512)",
        notNull: true,
        checks: ["char_length(trim(token_hash)) between 32 and 512"],
      },
      {
        name: "token_secret_ref",
        type: "varchar(512)",
        checks: [
          "token_secret_ref is null or char_length(trim(token_secret_ref)) between 8 and 512",
        ],
      },
      {
        name: "push_permission_status",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'NOT_DETERMINED'",
        checks: [
          enumCheck(
            "push_permission_status",
            notificationPushPermissionStatuses,
          ),
        ],
      },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'ACTIVE'",
        checks: [enumCheck("status", notificationPushTokenStatuses)],
      },
      { name: "app_version", type: "varchar(80)" },
      { name: "os_version", type: "varchar(120)" },
      { name: "last_seen_at", type: "timestamptz" },
      { name: "revoked_at", type: "timestamptz" },
      ...safetyFlagColumns,
      ...actorContextColumns,
      ...createdUpdatedColumns,
    ],
    constraints: [
      "constraint notification_push_tokens_no_raw_token_ref check (raw_push_token_included = false)",
      "constraint notification_push_tokens_revoked_status check (revoked_at is null or status in ('REVOKED', 'EXPIRED', 'BLOCKED'))",
      "constraint notification_push_tokens_permission_active check (status <> 'ACTIVE' or push_permission_status in ('AUTHORIZED', 'PROVISIONAL', 'EPHEMERAL'))",
    ],
  },
  {
    name: "notification_deliveries",
    description:
      "알림의 채널/기기별 발송 이력. FCM 요청, 실패 재시도, invalid token 정리, provider 응답 추적을 담당한다.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: false,
    containsRawPushToken: false,
    columns: [
      {
        name: "delivery_id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        defaultSql: "gen_random_uuid()",
      },
      {
        name: "notification_id",
        type: "uuid",
        notNull: true,
        references: {
          table: "notifications",
          column: "notification_id",
          onDelete: "cascade",
        },
      },
      {
        name: "push_token_id",
        type: "uuid",
        references: {
          table: "notification_push_tokens",
          column: "push_token_id",
          onDelete: "set null",
        },
      },
      {
        name: "device_id",
        type: "uuid",
        references: {
          table: "user_devices",
          column: "device_id",
          onDelete: "set null",
        },
      },
      {
        name: "channel",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'PUSH'",
        checks: [enumCheck("channel", notificationChannels)],
      },
      {
        name: "provider",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'FCM'",
        checks: [enumCheck("provider", notificationDeliveryProviders)],
      },
      {
        name: "status",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'PENDING'",
        checks: [enumCheck("status", notificationDeliveryStatuses)],
      },
      {
        name: "attempt_count",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [nonNegativeCheck("attempt_count")],
      },
      {
        name: "max_attempts",
        type: "integer",
        notNull: true,
        defaultSql: "5",
        checks: ["max_attempts between 1 and 20"],
      },
      { name: "provider_message_id", type: "varchar(256)" },
      { name: "provider_error_code", type: "varchar(120)" },
      {
        name: "failure_reason",
        type: "text",
        checks: [
          "failure_reason is null or char_length(failure_reason) <= 1000",
        ],
      },
      {
        name: "suppression_reason",
        type: "varchar(48)",
        checks: [
          enumCheck("suppression_reason", notificationSuppressionReasons),
        ],
      },
      { name: "next_retry_at", type: "timestamptz" },
      { name: "attempted_at", type: "timestamptz" },
      { name: "sent_at", type: "timestamptz" },
      { name: "delivered_at", type: "timestamptz" },
      { name: "failed_at", type: "timestamptz" },
      {
        name: "latency_ms",
        type: "integer",
        checks: [nonNegativeCheck("latency_ms")],
      },
      {
        name: "metadata",
        type: "jsonb",
        notNull: true,
        defaultSql: "'{}'::jsonb",
      },
      ...safetyFlagColumns,
      ...actorContextColumns,
      ...createdUpdatedColumns,
    ],
    constraints: [
      "constraint notification_deliveries_push_target_required check (channel <> 'PUSH' or push_token_id is not null or device_id is not null)",
      "constraint notification_deliveries_sent_status_consistency check (sent_at is null or status in ('SENT', 'DELIVERED'))",
      "constraint notification_deliveries_delivered_status_consistency check (delivered_at is null or status = 'DELIVERED')",
      "constraint notification_deliveries_failed_status_consistency check (failed_at is null or status in ('FAILED_RETRYABLE', 'FAILED_PERMANENT'))",
      "constraint notification_deliveries_suppressed_reason_consistency check (suppression_reason is null or status in ('SKIPPED', 'SUPPRESSED'))",
      "constraint notification_deliveries_retry_after_failure check (next_retry_at is null or status = 'FAILED_RETRYABLE')",
    ],
  },
  {
    name: "notification_preferences",
    description:
      "사용자별 알림 수신 설정. 전체 푸시, 예산/고정지출/저축/LV UP/커뮤니티/이벤트/공지/광고성 알림을 type·channel 단위로 제어한다.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: false,
    containsRawPushToken: false,
    columns: [
      {
        name: "preference_id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        defaultSql: "gen_random_uuid()",
      },
      {
        name: "user_id",
        type: "uuid",
        notNull: true,
        references: { table: "users", column: "user_id", onDelete: "cascade" },
      },
      {
        name: "preference_key",
        type: "varchar(40)",
        notNull: true,
        checks: [enumCheck("preference_key", notificationPreferenceKeys)],
      },
      {
        name: "notification_type",
        type: "varchar(48)",
        checks: [enumCheck("notification_type", notificationTypes)],
      },
      {
        name: "channel",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'PUSH'",
        checks: [enumCheck("channel", notificationChannels)],
      },
      { name: "enabled", type: "boolean", notNull: true, defaultSql: "true" },
      {
        name: "marketing_consent_required",
        type: "boolean",
        notNull: true,
        defaultSql: "false",
      },
      {
        name: "quiet_hours_enabled",
        type: "boolean",
        notNull: true,
        defaultSql: "true",
      },
      {
        name: "quiet_start_local_time",
        type: "varchar(5)",
        notNull: true,
        defaultSql: "'22:00'",
        checks: ["quiet_start_local_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'"],
      },
      {
        name: "quiet_end_local_time",
        type: "varchar(5)",
        notNull: true,
        defaultSql: "'08:00'",
        checks: ["quiet_end_local_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'"],
      },
      {
        name: "timezone",
        type: "varchar(64)",
        notNull: true,
        defaultSql: "'Asia/Seoul'",
        checks: ["timezone = 'Asia/Seoul'"],
      },
      {
        name: "locale",
        type: "varchar(16)",
        notNull: true,
        defaultSql: "'ko-KR'",
        checks: ["locale = 'ko-KR'"],
      },
      ...actorContextColumns,
      ...createdUpdatedColumns,
    ],
    constraints: [
      "constraint notification_preferences_type_or_key_required check (notification_type is not null or preference_key = 'PUSH_GLOBAL')",
      "constraint notification_preferences_marketing_key_check check (marketing_consent_required = false or preference_key in ('MARKETING', 'AD_PROMOTION'))",
      "constraint notification_preferences_user_key_channel_unique unique (user_id, preference_key, channel)",
    ],
  },
  {
    name: "notification_dedupe_records",
    description:
      "이벤트별 중복 알림 생성을 막는 멱등성 잠금. 같은 dedupe_key는 보존 기간 내 하나의 알림으로만 연결한다.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: false,
    containsRawPushToken: false,
    columns: [
      {
        name: "dedupe_record_id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        defaultSql: "gen_random_uuid()",
      },
      {
        name: "user_id",
        type: "uuid",
        notNull: true,
        references: { table: "users", column: "user_id", onDelete: "cascade" },
      },
      {
        name: "dedupe_key",
        type: "varchar(256)",
        notNull: true,
        unique: true,
        checks: ["char_length(trim(dedupe_key)) between 8 and 256"],
      },
      {
        name: "source_domain",
        type: "varchar(24)",
        notNull: true,
        checks: [enumCheck("source_domain", notificationSourceDomains)],
      },
      { name: "source_event_id", type: "uuid" },
      {
        name: "notification_id",
        type: "uuid",
        references: {
          table: "notifications",
          column: "notification_id",
          onDelete: "set null",
        },
      },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'ACTIVE'",
        checks: ["status in ('ACTIVE', 'CONSUMED', 'EXPIRED', 'CANCELLED')"],
      },
      {
        name: "first_seen_at",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
      { name: "expires_at", type: "timestamptz", notNull: true },
      ...safetyFlagColumns,
      ...actorContextColumns,
      ...createdUpdatedColumns,
    ],
    constraints: [
      "constraint notification_dedupe_expires_after_first_seen check (expires_at > first_seen_at)",
    ],
  },
  {
    name: "notification_dispatch_jobs",
    description:
      "예약·즉시 발송 queue. 스케줄러/notifications worker가 idempotency_key 기반으로 잠금, 재시도, 성공/실패를 처리한다.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: false,
    containsRawPushToken: false,
    columns: [
      {
        name: "dispatch_job_id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        defaultSql: "gen_random_uuid()",
      },
      {
        name: "notification_id",
        type: "uuid",
        notNull: true,
        references: {
          table: "notifications",
          column: "notification_id",
          onDelete: "cascade",
        },
      },
      {
        name: "channel",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'PUSH'",
        checks: [enumCheck("channel", notificationChannels)],
      },
      {
        name: "status",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'PENDING'",
        checks: [enumCheck("status", notificationJobStatuses)],
      },
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        unique: true,
        checks: ["char_length(trim(idempotency_key)) between 8 and 256"],
      },
      {
        name: "run_after",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
      { name: "locked_at", type: "timestamptz" },
      { name: "locked_by", type: "varchar(128)" },
      {
        name: "attempt_count",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [nonNegativeCheck("attempt_count")],
      },
      {
        name: "max_attempts",
        type: "integer",
        notNull: true,
        defaultSql: "5",
        checks: ["max_attempts between 1 and 20"],
      },
      {
        name: "last_error",
        type: "text",
        checks: ["last_error is null or char_length(last_error) <= 2000"],
      },
      { name: "succeeded_at", type: "timestamptz" },
      { name: "failed_at", type: "timestamptz" },
      { name: "cancelled_at", type: "timestamptz" },
      ...safetyFlagColumns,
      ...actorContextColumns,
      ...createdUpdatedColumns,
    ],
    constraints: [
      "constraint notification_dispatch_jobs_running_lock_required check (status <> 'RUNNING' or locked_at is not null)",
      "constraint notification_dispatch_jobs_success_consistency check (succeeded_at is null or status = 'SUCCEEDED')",
      "constraint notification_dispatch_jobs_failed_consistency check (failed_at is null or status in ('FAILED_RETRYABLE', 'FAILED_PERMANENT'))",
      "constraint notification_dispatch_jobs_cancelled_consistency check (cancelled_at is null or status = 'CANCELLED')",
    ],
  },
  {
    name: "notification_audit_events",
    description:
      "알림 생성·발송·읽음·삭제·수신설정·토큰 변경·관리자 발송 감사 로그. 운영/보안 추적용이며 원문 민감정보 저장을 금지한다.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: false,
    containsRawPushToken: false,
    columns: [
      {
        name: "audit_event_id",
        type: "uuid",
        primaryKey: true,
        notNull: true,
        defaultSql: "gen_random_uuid()",
      },
      {
        name: "event_type",
        type: "varchar(48)",
        notNull: true,
        checks: [enumCheck("event_type", notificationAuditEventTypes)],
      },
      { name: "actor_user_id", type: "uuid" },
      { name: "target_user_id", type: "uuid" },
      {
        name: "notification_id",
        type: "uuid",
        references: {
          table: "notifications",
          column: "notification_id",
          onDelete: "set null",
        },
      },
      {
        name: "delivery_id",
        type: "uuid",
        references: {
          table: "notification_deliveries",
          column: "delivery_id",
          onDelete: "set null",
        },
      },
      {
        name: "preference_id",
        type: "uuid",
        references: {
          table: "notification_preferences",
          column: "preference_id",
          onDelete: "set null",
        },
      },
      {
        name: "before_data",
        type: "jsonb",
        notNull: true,
        defaultSql: "'{}'::jsonb",
      },
      {
        name: "after_data",
        type: "jsonb",
        notNull: true,
        defaultSql: "'{}'::jsonb",
      },
      {
        name: "reason",
        type: "text",
        checks: ["reason is null or char_length(reason) <= 1000"],
      },
      { name: "request_id", type: "varchar(128)" },
      {
        name: "ip_hash",
        type: "varchar(256)",
        checks: ["ip_hash is null or char_length(ip_hash) between 32 and 256"],
      },
      {
        name: "user_agent_hash",
        type: "varchar(256)",
        checks: [
          "user_agent_hash is null or char_length(user_agent_hash) between 32 and 256",
        ],
      },
      ...safetyFlagColumns,
      {
        name: "created_at",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
    ],
  },
] as const satisfies readonly DbTableSpec[];

export const notificationsSchemaIndexes = [
  {
    name: "idx_notification_templates_type_status",
    table: "notification_templates",
    columns: ["type", "status", "created_at"],
  },
  {
    name: "idx_notification_templates_metadata_gin",
    table: "notification_templates",
    columns: ["metadata"],
    method: "gin",
  },
  {
    name: "uq_notifications_dedupe_key",
    table: "notifications",
    columns: ["dedupe_key"],
    unique: true,
    whereSql: "dedupe_key is not null",
  },
  {
    name: "idx_notifications_user_status_created",
    table: "notifications",
    columns: ["user_id", "status", "created_at"],
  },
  {
    name: "idx_notifications_user_read_created",
    table: "notifications",
    columns: ["user_id", "read_status", "created_at"],
  },
  {
    name: "idx_notifications_user_type_created",
    table: "notifications",
    columns: ["user_id", "type", "created_at"],
  },
  {
    name: "idx_notifications_schedule",
    table: "notifications",
    columns: ["status", "scheduled_at"],
    whereSql: "status in ('CREATED', 'SCHEDULED', 'QUEUED')",
  },
  {
    name: "idx_notifications_payload_gin",
    table: "notifications",
    columns: ["payload"],
    method: "gin",
  },
  {
    name: "uq_notification_push_tokens_token_hash_active",
    table: "notification_push_tokens",
    columns: ["token_hash"],
    unique: true,
    whereSql: "status = 'ACTIVE'",
  },
  {
    name: "idx_notification_push_tokens_user_status",
    table: "notification_push_tokens",
    columns: ["user_id", "status", "last_seen_at"],
  },
  {
    name: "idx_notification_push_tokens_device",
    table: "notification_push_tokens",
    columns: ["device_id", "status"],
    whereSql: "device_id is not null",
  },
  {
    name: "idx_notification_deliveries_notification",
    table: "notification_deliveries",
    columns: ["notification_id", "created_at"],
  },
  {
    name: "idx_notification_deliveries_status_retry",
    table: "notification_deliveries",
    columns: ["status", "next_retry_at"],
    whereSql: "status = 'FAILED_RETRYABLE'",
  },
  {
    name: "idx_notification_deliveries_push_token",
    table: "notification_deliveries",
    columns: ["push_token_id", "created_at"],
    whereSql: "push_token_id is not null",
  },
  {
    name: "idx_notification_preferences_user_channel",
    table: "notification_preferences",
    columns: ["user_id", "channel", "enabled"],
  },
  {
    name: "idx_notification_dedupe_user_source",
    table: "notification_dedupe_records",
    columns: ["user_id", "source_domain", "created_at"],
  },
  {
    name: "idx_notification_dedupe_expires",
    table: "notification_dedupe_records",
    columns: ["expires_at", "status"],
  },
  {
    name: "idx_notification_dispatch_jobs_due",
    table: "notification_dispatch_jobs",
    columns: ["status", "run_after", "attempt_count"],
    whereSql: "status in ('PENDING', 'FAILED_RETRYABLE')",
  },
  {
    name: "idx_notification_dispatch_jobs_locked",
    table: "notification_dispatch_jobs",
    columns: ["locked_by", "locked_at"],
    whereSql: "locked_at is not null",
  },
  {
    name: "idx_notification_audit_events_target",
    table: "notification_audit_events",
    columns: ["notification_id", "created_at"],
    whereSql: "notification_id is not null",
  },
  {
    name: "idx_notification_audit_events_actor",
    table: "notification_audit_events",
    columns: ["actor_user_id", "created_at"],
    whereSql: "actor_user_id is not null",
  },
] as const satisfies readonly DbIndexSpec[];

const currentUserSql = "user_id = public.current_app_user_id()";
const currentUserOrAdminSql = `${currentUserSql} or public.current_app_is_admin()`;
const serviceOrAdminSql =
  "public.current_app_is_admin() or current_user = 'service_role'";
const safetySql =
  "raw_financial_source_data_included = false and raw_push_token_included = false and raw_token_included = false and raw_secret_included = false and raw_pii_included = false";

export const notificationsSchemaPolicies = [
  {
    name: "notification_templates_read_active",
    table: "notification_templates",
    command: "select",
    role: "authenticated",
    usingSql: "status = 'ACTIVE'",
  },
  {
    name: "notification_templates_admin_all",
    table: "notification_templates",
    command: "all",
    role: "admin",
    usingSql: "public.current_app_is_admin()",
    checkSql: `public.current_app_is_admin() and ${safetySql}`,
  },
  {
    name: "notifications_owner_select",
    table: "notifications",
    command: "select",
    role: "authenticated",
    usingSql: currentUserOrAdminSql,
  },
  {
    name: "notifications_owner_mark_read_or_delete",
    table: "notifications",
    command: "update",
    role: "authenticated",
    usingSql: currentUserOrAdminSql,
    checkSql: `${currentUserOrAdminSql} and ${safetySql}`,
  },
  {
    name: "notifications_service_insert",
    table: "notifications",
    command: "insert",
    role: "service_role",
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  {
    name: "notifications_admin_all",
    table: "notifications",
    command: "all",
    role: "admin",
    usingSql: "public.current_app_is_admin()",
    checkSql: `public.current_app_is_admin() and ${safetySql}`,
  },
  {
    name: "notification_push_tokens_owner_all",
    table: "notification_push_tokens",
    command: "all",
    role: "authenticated",
    usingSql: currentUserOrAdminSql,
    checkSql: `${currentUserOrAdminSql} and ${safetySql}`,
  },
  {
    name: "notification_push_tokens_service_select",
    table: "notification_push_tokens",
    command: "select",
    role: "service_role",
    usingSql: serviceOrAdminSql,
  },
  {
    name: "notification_deliveries_owner_select",
    table: "notification_deliveries",
    command: "select",
    role: "authenticated",
    usingSql:
      "public.current_app_is_admin() or exists (select 1 from notifications n where n.notification_id = notification_deliveries.notification_id and n.user_id = public.current_app_user_id())",
  },
  {
    name: "notification_deliveries_service_all",
    table: "notification_deliveries",
    command: "all",
    role: "service_role",
    usingSql: serviceOrAdminSql,
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  {
    name: "notification_preferences_owner_all",
    table: "notification_preferences",
    command: "all",
    role: "authenticated",
    usingSql: currentUserOrAdminSql,
    checkSql: currentUserOrAdminSql,
  },
  {
    name: "notification_dedupe_service_all",
    table: "notification_dedupe_records",
    command: "all",
    role: "service_role",
    usingSql: serviceOrAdminSql,
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  {
    name: "notification_dispatch_jobs_service_all",
    table: "notification_dispatch_jobs",
    command: "all",
    role: "service_role",
    usingSql: serviceOrAdminSql,
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  {
    name: "notification_audit_events_admin_select",
    table: "notification_audit_events",
    command: "select",
    role: "admin",
    usingSql: "public.current_app_is_admin()",
  },
  {
    name: "notification_audit_events_service_insert",
    table: "notification_audit_events",
    command: "insert",
    role: "service_role",
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
] as const satisfies readonly DbPolicySpec[];

export const notificationTemplateSeeds = [
  {
    slug: "budget-over",
    type: "BUDGET_OVER",
    titleKo: "오늘의 예산을 초과했어요",
    bodyKo:
      "오늘 설정한 생활비보다 더 사용했습니다. 급여 홈에서 초과금액을 확인해보세요.",
    targetScreen: "DAILY_BUDGET",
    defaultChannel: "PUSH",
    defaultPriority: 2,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "budget-remaining-low",
    type: "BUDGET_REMAINING_LOW",
    titleKo: "오늘 남은 예산이 얼마 남지 않았어요",
    bodyKo: "남은 생활비가 낮습니다. 지출 전에 오늘 예산을 다시 확인해보세요.",
    targetScreen: "SALARY_HOME",
    defaultChannel: "PUSH",
    defaultPriority: 4,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "fixed-payment-due",
    type: "FIXED_PAYMENT_DUE",
    titleKo: "오늘 예정된 고정지출이 있어요",
    bodyKo: "구독료, 대출, 보험료 등 예정된 고정지출을 확인해보세요.",
    targetScreen: "FIXED_EXPENSE",
    defaultChannel: "PUSH",
    defaultPriority: 2,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "savings-transfer-due",
    type: "SAVINGS_TRANSFER_DUE",
    titleKo: "오늘 예정된 고정저축이 있어요",
    bodyKo: "청약, 적금, 투자 등 지켜낼 돈을 먼저 확보해보세요.",
    targetScreen: "SAVINGS",
    defaultChannel: "PUSH",
    defaultPriority: 3,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "hijack-goal-achieved",
    type: "HIJACK_GOAL_ACHIEVED",
    titleKo: "납치금액 목표를 달성했어요",
    bodyKo:
      "이번 달 목표 납치금액을 달성했습니다. 마이페이지에서 성과를 확인해보세요.",
    targetScreen: "ACHIEVEMENT",
    defaultChannel: "PUSH",
    defaultPriority: 3,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "growth-mission",
    type: "GROWTH_MISSION",
    titleKo: "오늘의 레벨업 미션이 도착했어요",
    bodyKo: "독서, 뉴스, 영어, 건강 미션으로 오늘의 레벨을 올려보세요.",
    targetScreen: "LEVEL_UP",
    defaultChannel: "PUSH",
    defaultPriority: 6,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "growth-level-up",
    type: "GROWTH_LEVEL_UP",
    titleKo: "레벨업에 성공했어요",
    bodyKo: "꾸준한 자기관리로 새로운 레벨에 도달했습니다.",
    targetScreen: "MY_PAGE",
    defaultChannel: "PUSH",
    defaultPriority: 4,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "community-comment",
    type: "COMMUNITY_COMMENT",
    titleKo: "내 글에 댓글이 달렸어요",
    bodyKo: "커뮤니티에서 새 댓글을 확인해보세요.",
    targetScreen: "POST_DETAIL",
    defaultChannel: "PUSH",
    defaultPriority: 5,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "community-like",
    type: "COMMUNITY_LIKE",
    titleKo: "내 글이 공감을 받았어요",
    bodyKo: "커뮤니티에서 받은 반응을 확인해보세요.",
    targetScreen: "POST_DETAIL",
    defaultChannel: "PUSH",
    defaultPriority: 6,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "event-reward",
    type: "EVENT_REWARD",
    titleKo: "이벤트 보상이 도착했어요",
    bodyKo: "목표 달성 이벤트 또는 포인트 보상을 확인해보세요.",
    targetScreen: "EVENT",
    defaultChannel: "PUSH",
    defaultPriority: 5,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "notice",
    type: "NOTICE",
    titleKo: "새 공지사항이 있어요",
    bodyKo: "급여납치 운영 공지와 업데이트 내용을 확인해보세요.",
    targetScreen: "NOTICE_DETAIL",
    defaultChannel: "ADMIN_NOTICE",
    defaultPriority: 5,
    marketing: false,
    isSystem: true,
  },
  {
    slug: "ad-promotion",
    type: "AD_PROMOTION",
    titleKo: "제휴 혜택 알림",
    bodyKo: "마케팅 수신 동의자에게만 발송되는 제휴 혜택입니다.",
    targetScreen: "AD_LANDING",
    defaultChannel: "PUSH",
    defaultPriority: 8,
    marketing: true,
    isSystem: true,
  },
] as const satisfies readonly NotificationTemplateSeed[];

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replace(/"/g, '""')}"`;

const renderColumnReference = (reference: DbColumnReferenceSpec): string => {
  const parts = [
    "references",
    quoteIdentifier(reference.table),
    `(${quoteIdentifier(reference.column)})`,
  ];

  if (reference.onDelete) {
    parts.push("on delete", reference.onDelete);
  }

  if (reference.onUpdate) {
    parts.push("on update", reference.onUpdate);
  }

  return parts.join(" ");
};

export const renderNotificationColumnSql = (column: DbColumnSpec): string => {
  const parts = [quoteIdentifier(column.name), column.type];

  if (column.primaryKey) {
    parts.push("primary key");
  }

  if (column.notNull) {
    parts.push("not null");
  }

  if (column.unique) {
    parts.push("unique");
  }

  if (column.defaultSql) {
    parts.push("default", column.defaultSql);
  }

  if (column.references) {
    parts.push(renderColumnReference(column.references));
  }

  for (const checkSql of column.checks ?? []) {
    parts.push(`check (${checkSql})`);
  }

  return parts.join(" ");
};

export const renderNotificationCreateTableSql = (
  table: DbTableSpec,
): string => {
  const columnSql = table.columns.map(renderNotificationColumnSql);
  const constraintSql = table.constraints ?? [];
  const body = [...columnSql, ...constraintSql]
    .map((line) => `  ${line}`)
    .join(",\n");

  return [
    `create table if not exists ${quoteIdentifier(table.name)} (`,
    body,
    ");",
  ].join("\n");
};

export const renderNotificationCreateIndexSql = (
  index: DbIndexSpec,
): string => {
  const unique = index.unique ? "unique " : "";
  const method = index.method ? ` using ${index.method}` : "";
  const columns = index.columns.map(quoteIdentifier).join(", ");
  const where = index.whereSql ? ` where ${index.whereSql}` : "";

  return `create ${unique}index if not exists ${quoteIdentifier(index.name)} on ${quoteIdentifier(index.table)}${method} (${columns})${where};`;
};

export const renderNotificationPolicySql = (policy: DbPolicySpec): string => {
  const command = policy.command.toUpperCase();
  const usingSql = policy.usingSql ? `\n  using (${policy.usingSql})` : "";
  const checkSql = policy.checkSql ? `\n  with check (${policy.checkSql})` : "";

  return `create policy ${quoteIdentifier(policy.name)} on ${quoteIdentifier(policy.table)} for ${command} to ${policy.role}${usingSql}${checkSql};`;
};

export const notificationsSchemaDdl = Object.freeze({
  extensions: ["create extension if not exists pgcrypto;"],
  tables: notificationsSchemaTables.map(renderNotificationCreateTableSql),
  indexes: notificationsSchemaIndexes.map(renderNotificationCreateIndexSql),
  rls: notificationsSchemaTables.map(
    (table) =>
      `alter table ${quoteIdentifier(table.name)} enable row level security;`,
  ),
  policies: notificationsSchemaPolicies.map(renderNotificationPolicySql),
});

export const notificationsSchemaRequiredTableNames = [
  "notification_templates",
  "notifications",
  "notification_push_tokens",
  "notification_deliveries",
  "notification_preferences",
  "notification_dedupe_records",
  "notification_dispatch_jobs",
  "notification_audit_events",
] as const;

export type NotificationTableName =
  (typeof notificationsSchemaRequiredTableNames)[number];

const getTable = (name: NotificationTableName): DbTableSpec | undefined =>
  notificationsSchemaTables.find((table) => table.name === name);

const getColumnNames = (tableName: NotificationTableName): Set<string> =>
  new Set(getTable(tableName)?.columns.map((column) => column.name) ?? []);

export const getNotificationsSchemaCompletenessReport =
  (): NotificationsSchemaCompletenessReport => {
    const tableNames = new Set(
      notificationsSchemaTables.map((table) => table.name),
    );
    const policyTables = new Set(
      notificationsSchemaPolicies.map((policy) => policy.table),
    );
    const missing: string[] = [];

    for (const requiredTableName of notificationsSchemaRequiredTableNames) {
      if (!tableNames.has(requiredTableName)) {
        missing.push(`missing table: ${requiredTableName}`);
      }
    }

    for (const table of notificationsSchemaTables) {
      if (table.rlsRequired !== true) {
        missing.push(`RLS must be required: ${table.name}`);
      }

      if (table.auditRequired !== true) {
        missing.push(`audit must be required: ${table.name}`);
      }

      if (table.containsFinancialSourceData !== false) {
        missing.push(`financial source data must be excluded: ${table.name}`);
      }

      if (table.containsRawPushToken !== false) {
        missing.push(`raw push token must be excluded: ${table.name}`);
      }

      if (!policyTables.has(table.name)) {
        missing.push(`missing policy coverage: ${table.name}`);
      }
    }

    for (const requiredType of requiredNotificationTypes) {
      if (!notificationTypes.includes(requiredType)) {
        missing.push(`missing required notification type: ${requiredType}`);
      }
    }

    for (const requiredStatus of [
      "CREATED",
      "SCHEDULED",
      "SENT",
      "DELIVERED",
      "READ",
      "FAILED",
      "SUPPRESSED",
      "DELETED",
    ] as const) {
      if (!notificationStatuses.includes(requiredStatus)) {
        missing.push(`missing required notification status: ${requiredStatus}`);
      }
    }

    const notificationColumns = getColumnNames("notifications");
    for (const requiredColumn of [
      "notification_id",
      "user_id",
      "type",
      "title",
      "body",
      "target_screen",
      "deep_link",
      "status",
      "read_status",
      "scheduled_at",
      "sent_at",
      "read_at",
      "dedupe_key",
      "payload",
    ] as const) {
      if (!notificationColumns.has(requiredColumn)) {
        missing.push(`missing notifications column: ${requiredColumn}`);
      }
    }

    const deliveryColumns = getColumnNames("notification_deliveries");
    for (const requiredColumn of [
      "delivery_id",
      "notification_id",
      "channel",
      "provider",
      "status",
      "attempt_count",
      "next_retry_at",
    ] as const) {
      if (!deliveryColumns.has(requiredColumn)) {
        missing.push(`missing notification delivery column: ${requiredColumn}`);
      }
    }

    const preferenceColumns = getColumnNames("notification_preferences");
    for (const requiredColumn of [
      "user_id",
      "preference_key",
      "channel",
      "enabled",
      "quiet_hours_enabled",
      "timezone",
    ] as const) {
      if (!preferenceColumns.has(requiredColumn)) {
        missing.push(
          `missing notification preference column: ${requiredColumn}`,
        );
      }
    }

    const pushTokenColumns = getColumnNames("notification_push_tokens");
    for (const requiredColumn of [
      "user_id",
      "device_id",
      "platform",
      "provider",
      "token_hash",
      "token_secret_ref",
      "push_permission_status",
      "status",
    ] as const) {
      if (!pushTokenColumns.has(requiredColumn)) {
        missing.push(
          `missing notification push token column: ${requiredColumn}`,
        );
      }
    }

    for (const tableName of [
      "notification_templates",
      "notifications",
      "notification_push_tokens",
      "notification_deliveries",
      "notification_dedupe_records",
      "notification_dispatch_jobs",
      "notification_audit_events",
    ] as const) {
      const columnNames = getColumnNames(tableName);

      for (const safetyColumn of safetyFlagColumns) {
        if (!columnNames.has(safetyColumn.name)) {
          missing.push(
            `missing safety column ${safetyColumn.name} on ${tableName}`,
          );
        }
      }
    }

    if (
      !notificationsSchemaIndexes.some(
        (index) =>
          index.name === "uq_notifications_dedupe_key" && index.unique === true,
      )
    ) {
      missing.push("missing unique dedupe index: uq_notifications_dedupe_key");
    }

    if (
      !notificationsSchemaIndexes.some(
        (index) => index.name === "idx_notification_dispatch_jobs_due",
      )
    ) {
      missing.push(
        "missing dispatch due index: idx_notification_dispatch_jobs_due",
      );
    }

    return {
      ok: missing.length === 0,
      tableCount: notificationsSchemaTables.length,
      indexCount: notificationsSchemaIndexes.length,
      policyCount: notificationsSchemaPolicies.length,
      seedCount: notificationTemplateSeeds.length,
      ddlStatementCount:
        notificationsSchemaDdl.extensions.length +
        notificationsSchemaDdl.tables.length +
        notificationsSchemaDdl.indexes.length +
        notificationsSchemaDdl.rls.length +
        notificationsSchemaDdl.policies.length,
      missing,
    };
  };

export const assertNotificationsSchemaCompleteness = (): void => {
  const report = getNotificationsSchemaCompletenessReport();

  if (!report.ok) {
    throw new Error(
      `Notifications schema is incomplete: ${report.missing.join(", ")}`,
    );
  }
};

assertNotificationsSchemaCompleteness();

export const notificationsSchema = Object.freeze({
  policy: notificationsSchemaPolicy,
  notificationTypes,
  requiredNotificationTypes,
  notificationStatuses,
  notificationReadStatuses,
  notificationChannels,
  notificationDeliveryProviders,
  notificationDeliveryStatuses,
  notificationPreferenceKeys,
  notificationTargetScreens,
  notificationSourceDomains,
  notificationTriggerKinds,
  notificationJobStatuses,
  notificationPushTokenStatuses,
  notificationDevicePlatforms,
  notificationPushPermissionStatuses,
  notificationSuppressionReasons,
  notificationAuditEventTypes,
  tables: notificationsSchemaTables,
  indexes: notificationsSchemaIndexes,
  policies: notificationsSchemaPolicies,
  templateSeeds: notificationTemplateSeeds,
  ddl: notificationsSchemaDdl,
  getCompletenessReport: getNotificationsSchemaCompletenessReport,
  assertCompleteness: assertNotificationsSchemaCompleteness,
});

export default notificationsSchema;
