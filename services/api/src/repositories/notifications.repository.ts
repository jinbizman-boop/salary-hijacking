import type {
  JsonRecord,
  JsonValue,
  NotificationChannel,
  NotificationCreateInput,
  NotificationDeviceInput,
  NotificationListResult,
  NotificationPreferenceInput,
  NotificationPriority,
  NotificationRulePreviewInput,
  NotificationStatus,
  NotificationType,
  NotificationsRepository,
  NotificationsRouteRuntime,
  PaginationInput,
} from "../routes/notifications.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface NotificationsDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface NotificationsDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type NotificationsDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: NotificationsDbQueryOptions<TEnv>,
) => Promise<NotificationsDbQueryResult>;

export interface NeonNotificationsRepositoryOptions<TEnv = unknown> {
  readonly query?: NotificationsDbQuery<TEnv>;
}

const DATABASE_URL_ENV_KEYS = [
  "SALARY_HIJACKING_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "NEON_DATABASE_URL",
  "NEON_POSTGRES_URL",
  "DIRECT_DATABASE_URL",
] as const;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const dbTypesByApiType = Object.freeze({
  PAYDAY: ["PAYDAY"],
  PAYMENT_DUE: ["FIXED_PAYMENT_DUE"],
  BUDGET_WARNING: ["BUDGET_REMAINING_LOW", "BUDGET_REMAINING"],
  BUDGET_EXCEEDED: ["BUDGET_OVER"],
  SAVINGS_GOAL: ["SAVINGS_DUE", "SAVINGS_TRANSFER_DUE", "HIJACK_GOAL"],
  LEVEL_UP: ["GROWTH_LEVEL_UP"],
  GROWTH_REMINDER: ["GROWTH_TASK", "GROWTH_MISSION"],
  COMMUNITY: [
    "COMMUNITY_COMMENT",
    "COMMUNITY_REACTION",
    "COMMUNITY_LIKE",
    "COMMUNITY_REPORT_RESULT",
  ],
  NOTICE: ["NOTICE", "SYSTEM"],
  SECURITY: ["SECURITY"],
  CONTENT_RECOMMENDATION: ["NOTICE"],
  AD_PARTNER: ["NOTICE", "AD_PROMOTION"],
} satisfies Record<NotificationType, readonly string[]>);

const apiTypeByDbType = Object.freeze({
  PAYDAY: "PAYDAY",
  FIXED_PAYMENT_DUE: "PAYMENT_DUE",
  PAYMENT_DUE: "PAYMENT_DUE",
  SAVINGS_DUE: "SAVINGS_GOAL",
  SAVINGS_TRANSFER_DUE: "SAVINGS_GOAL",
  HIJACK_GOAL: "SAVINGS_GOAL",
  HIJACK_GOAL_ACHIEVED: "SAVINGS_GOAL",
  BUDGET_OVER: "BUDGET_EXCEEDED",
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  BUDGET_REMAINING: "BUDGET_WARNING",
  BUDGET_REMAINING_LOW: "BUDGET_WARNING",
  BUDGET_WARNING: "BUDGET_WARNING",
  GROWTH_TASK: "GROWTH_REMINDER",
  GROWTH_MISSION: "GROWTH_REMINDER",
  GROWTH_LEVEL_UP: "LEVEL_UP",
  LEVEL_UP: "LEVEL_UP",
  COMMUNITY_COMMENT: "COMMUNITY",
  COMMUNITY_REACTION: "COMMUNITY",
  COMMUNITY_LIKE: "COMMUNITY",
  COMMUNITY_REPORT_RESULT: "COMMUNITY",
  COMMUNITY: "COMMUNITY",
  CONTENT_RECOMMENDATION: "CONTENT_RECOMMENDATION",
  EVENT_REWARD: "NOTICE",
  AD_PROMOTION: "AD_PARTNER",
  NOTICE: "NOTICE",
  SECURITY: "SECURITY",
  SYSTEM: "NOTICE",
} satisfies Record<string, NotificationType>);

const sensitiveKeyPattern =
  /salary|payroll|income|expense|saving|savings|hijack|amount|loan|debt|token|secret|password|phone|email|card|account|resident|deviceid|device_id/iu;

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonNotificationsRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for notifications repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: NotificationsDbQueryOptions<TEnv>,
): Promise<NotificationsDbQueryResult> {
  const moduleValue = (await import("@neondatabase/serverless")) as unknown as {
    readonly Pool: new (config: Record<string, unknown>) => {
      query: (
        text: string,
        values?: readonly DbValue[],
      ) => Promise<{
        readonly rows: readonly DbRow[];
        readonly rowCount: number | null;
      }>;
      end: () => Promise<void>;
    };
    readonly neonConfig?: { fetchConnectionCache?: boolean };
  };

  if (moduleValue.neonConfig)
    moduleValue.neonConfig.fetchConnectionCache = true;
  const pool = new moduleValue.Pool({
    connectionString: databaseUrl(options.env),
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  });
  try {
    return await pool.query(sqlText, [...params]);
  } finally {
    await pool.end();
  }
}

function assertUuid(value: string, field: string): string {
  if (!uuidPattern.test(value)) {
    throw new Error(`${field} must be a UUID for DB-backed notifications.`);
  }
  return value;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? new Date(0).toISOString()
      : parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toIso(value);
}

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toJsonRecord(value: unknown): JsonRecord {
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return toJsonRecord(parsed);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function sanitizeJson(value: unknown, depth = 0): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") return value.slice(0, 2_000);
  if (typeof value !== "object" || depth > 6) return null;
  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item) => sanitizeJson(item, depth + 1)) as JsonValue[];
  }
  const out: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value).slice(0, 80)) {
    if (sensitiveKeyPattern.test(key)) continue;
    out[key.slice(0, 120)] = sanitizeJson(item, depth + 1);
  }
  return out;
}

function sanitizeRecord(value: unknown): JsonRecord {
  const sanitized = sanitizeJson(value);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? (sanitized as JsonRecord)
    : {};
}

function dbTypeFromApi(value: NotificationType): string {
  const mapped = dbTypesByApiType[value][0];
  if (mapped === "AD_PROMOTION") return "NOTICE";
  return mapped ?? "NOTICE";
}

function dbTypesFromApi(value: string): readonly string[] {
  const mapped = dbTypesByApiType[value as NotificationType];
  return mapped?.length ? mapped : [value.toUpperCase()];
}

function apiTypeFromDb(value: unknown): NotificationType {
  const type = String(value ?? "NOTICE").toUpperCase();
  return apiTypeByDbType[type as keyof typeof apiTypeByDbType] ?? "NOTICE";
}

function apiStatusFromDb(row: DbRow): NotificationStatus {
  const readStatus = String(row.read_status ?? "").toUpperCase();
  if (readStatus === "READ") return "READ";
  if (readStatus === "DELETED") return "DELETED";

  const status = String(row.status ?? "SENT").toUpperCase();
  if (status === "READ" || row.read_at) return "READ";
  if (status === "DELETED") return "DELETED";
  if (["CANCELLED", "EXPIRED", "FAILED", "SUPPRESSED"].includes(status)) {
    return "ARCHIVED";
  }
  return "UNREAD";
}

function dbPriorityFromApi(value: NotificationPriority): number {
  if (value === "URGENT") return 9;
  if (value === "HIGH") return 7;
  if (value === "LOW") return 3;
  return 5;
}

function apiPriorityFromDb(value: unknown): NotificationPriority {
  const priority = toNumber(value);
  if (priority >= 8) return "URGENT";
  if (priority >= 6) return "HIGH";
  if (priority <= 3) return "LOW";
  return "NORMAL";
}

function normalizeChannel(value: unknown): NotificationChannel | null {
  const channel = String(value ?? "").toUpperCase();
  if (channel === "IN_APP" || channel === "PUSH" || channel === "EMAIL") {
    return channel;
  }
  return null;
}

function channelsFromRow(
  row: DbRow,
  payload: JsonRecord,
): NotificationChannel[] {
  const channels = Array.isArray(payload.channels)
    ? payload.channels
        .map(normalizeChannel)
        .filter((channel): channel is NotificationChannel => Boolean(channel))
    : [];
  if (row.push_required === true) channels.push("PUSH");
  return channels.length ? [...new Set(channels)] : ["IN_APP"];
}

function deeplinkFromRow(row: DbRow, payload: JsonRecord): string | null {
  const value = toText(row.deep_link) ?? toText(payload.deeplink);
  return value?.startsWith("salaryhijacking://") ? value : null;
}

function privacyFlags(): JsonRecord {
  return {
    serverAuthority: true,
    sensitiveFinancialDataExposed: false,
    adTargetingSeparated: true,
  };
}

function rowToNotification(row: DbRow): JsonRecord {
  const payload = toJsonRecord(row.payload);
  return {
    notificationId: String(row.notification_id ?? ""),
    type: apiTypeFromDb(row.type),
    title: String(row.title ?? ""),
    message: String(row.body ?? row.message ?? ""),
    priority: apiPriorityFromDb(row.priority),
    channels: channelsFromRow(row, payload),
    deeplink: deeplinkFromRow(row, payload),
    status: apiStatusFromDb(row),
    scheduledAt: toIsoOrNull(row.scheduled_at),
    expiresAt: toIsoOrNull(row.expires_at),
    metadata: sanitizeRecord(payload),
    createdAt: toIso(row.created_at),
    readAt: toIsoOrNull(row.read_at),
    archivedAt: toIsoOrNull(row.cancelled_at ?? row.deleted_at),
    ...privacyFlags(),
  };
}

function listResult<TItem extends JsonRecord>(
  rows: readonly DbRow[],
  page: PaginationInput,
  mapper: (row: DbRow) => TItem,
): NotificationListResult<TItem> {
  return {
    items: rows.map(mapper),
    page: page.page,
    pageSize: page.pageSize,
    total: rows.length ? toNumber(rows[0]?.total_count) : 0,
  };
}

function queryText<TEnv>(
  repositoryQuery: NotificationsDbQuery<TEnv>,
  runtime: NotificationsRouteRuntime<TEnv>,
  operationName: string,
  sqlText: string,
  params: readonly DbValue[],
): Promise<NotificationsDbQueryResult> {
  return repositoryQuery(sqlText, params, {
    operationName,
    env: runtime.env,
  });
}

function userIdFromRuntime<TEnv>(
  runtime: NotificationsRouteRuntime<TEnv>,
): string {
  return assertUuid(runtime.principal.userId, "principal.userId");
}

function listWhere(
  input: JsonRecord,
  runtime: NotificationsRouteRuntime,
): { readonly sql: string; readonly params: DbValue[] } {
  const params: DbValue[] = [userIdFromRuntime(runtime)];
  const clauses = ["n.user_id = $1::uuid"];

  const status = toText(input.status)?.toUpperCase();
  if (status === "UNREAD") {
    clauses.push("n.status in ('SCHEDULED', 'SENT') and n.read_at is null");
  } else if (status === "READ") {
    clauses.push("(n.status = 'READ' or n.read_at is not null)");
  } else if (status === "ARCHIVED" || status === "DELETED") {
    clauses.push("n.status in ('FAILED', 'CANCELLED', 'EXPIRED')");
  }

  const type = toText(input.type);
  if (type) {
    params.push(dbTypesFromApi(type));
    clauses.push(`n.type = any($${params.length}::text[])`);
  }

  return { sql: clauses.join(" and "), params };
}

async function queryNotificationById<TEnv>(
  repositoryQuery: NotificationsDbQuery<TEnv>,
  notificationId: string,
  runtime: NotificationsRouteRuntime<TEnv>,
  operationName = "notifications.get",
): Promise<JsonRecord | null> {
  const result = await queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select n.*
      from public.notifications n
      where n.notification_id = $1::uuid
        and n.user_id = $2::uuid
      limit 1
    `,
    [assertUuid(notificationId, "notificationId"), userIdFromRuntime(runtime)],
  );
  const row = result.rows[0];
  return row ? rowToNotification(row) : null;
}

function defaultPreferences(userId: string, now: Date): JsonRecord {
  return {
    userId,
    inAppEnabled: true,
    pushEnabled: true,
    emailEnabled: false,
    paydayEnabled: true,
    paymentDueEnabled: true,
    budgetWarningEnabled: true,
    budgetExceededEnabled: true,
    savingsGoalEnabled: true,
    levelUpEnabled: true,
    communityEnabled: true,
    securityEnabled: true,
    contentRecommendationEnabled: false,
    adPartnerEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    timezone: "Asia/Seoul",
    sensitiveFinancialTargetingConsent: false,
    updatedAt: now.toISOString(),
  };
}

function suppressed(input: NotificationCreateInput, now: Date): JsonRecord {
  return {
    notificationId: null,
    suppressed: true,
    type: input.type,
    reason: "PRIVACY_OR_PREFERENCE_DISABLED",
    createdAt: now.toISOString(),
    ...privacyFlags(),
  };
}

function payloadForCreate(input: NotificationCreateInput): string {
  return JSON.stringify(
    sanitizeRecord({
      ...input.metadata,
      channels: input.channels,
      deeplink: input.deeplink,
    }),
  );
}

function targetScreenFromType(value: NotificationType): string {
  if (value === "BUDGET_EXCEEDED" || value === "BUDGET_WARNING")
    return "DAILY_BUDGET";
  if (value === "PAYMENT_DUE") return "FIXED_EXPENSE";
  if (value === "SAVINGS_GOAL") return "SAVINGS";
  if (value === "LEVEL_UP" || value === "GROWTH_REMINDER") return "LEVEL_UP";
  if (value === "COMMUNITY") return "COMMUNITY";
  if (value === "SECURITY") return "SECURITY_CENTER";
  return "NOTIFICATIONS";
}

async function hashHex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function devicePlatform(value: string): string {
  return value === "IOS" || value === "ANDROID" || value === "WEB"
    ? value
    : "UNKNOWN";
}

export function createNeonNotificationsRepository<TEnv = unknown>(
  options: NeonNotificationsRepositoryOptions<TEnv> = {},
): NotificationsRepository<TEnv> {
  const repositoryQuery = options.query ?? defaultQuery<TEnv>;

  return {
    name: "neon-notifications-repository",
    async list(input, page, runtime) {
      const where = listWhere(input, runtime);
      const params = [...where.params, page.limit, page.offset];
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.list",
        `
          select n.*, count(*) over() as total_count
          from public.notifications n
          where ${where.sql}
          order by n.created_at desc, n.notification_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, rowToNotification);
    },
    async get(notificationId, runtime) {
      return queryNotificationById(repositoryQuery, notificationId, runtime);
    },
    async create(input, runtime) {
      if (
        input.type === "AD_PARTNER" ||
        input.type === "CONTENT_RECOMMENDATION"
      ) {
        return suppressed(input, runtime.now);
      }
      const scheduledAt = input.scheduledAt;
      const sentAt = scheduledAt ? null : runtime.now.toISOString();
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.create",
        `
          insert into public.notifications (
            user_id,
            type,
            title,
            body,
            target_screen,
            target_id,
            payload,
            status,
            priority,
            scheduled_at,
            sent_at,
            expires_at
          )
          values (
            $1::uuid,
            $2,
            $3,
            $4,
            $5,
            null,
            $6::jsonb,
            $7,
            $8::smallint,
            $9::timestamptz,
            $10::timestamptz,
            $11::timestamptz
          )
          returning *
        `,
        [
          userIdFromRuntime(runtime),
          dbTypeFromApi(input.type),
          input.title,
          input.message,
          targetScreenFromType(input.type),
          payloadForCreate(input),
          scheduledAt ? "SCHEDULED" : "SENT",
          dbPriorityFromApi(input.priority),
          scheduledAt,
          sentAt,
          input.expiresAt,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create notification.");
      return rowToNotification(row);
    },
    async markRead(notificationId, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.markRead",
        `
          update public.notifications
          set status = 'READ',
              read_at = coalesce(read_at, $3::timestamptz),
              updated_at = now()
          where notification_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(notificationId, "notificationId"),
          userIdFromRuntime(runtime),
          runtime.now.toISOString(),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Notification not found.");
      return rowToNotification(row);
    },
    async markAllRead(runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.markAllRead",
        `
          update public.notifications
          set status = 'READ',
              read_at = coalesce(read_at, $2::timestamptz),
              updated_at = now()
          where user_id = $1::uuid
            and status in ('SCHEDULED', 'SENT')
            and read_at is null
          returning notification_id
        `,
        [userIdFromRuntime(runtime), runtime.now.toISOString()],
      );
      return {
        markedReadCount: result.rowCount ?? result.rows.length,
        updatedAt: runtime.now.toISOString(),
      };
    },
    async archive(notificationId, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.archive",
        `
          update public.notifications
          set status = 'CANCELLED',
              cancelled_at = coalesce(cancelled_at, $3::timestamptz),
              updated_at = now()
          where notification_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(notificationId, "notificationId"),
          userIdFromRuntime(runtime),
          runtime.now.toISOString(),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Notification not found.");
      return rowToNotification(row);
    },
    async delete(notificationId, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.delete",
        `
          update public.notifications
          set status = 'CANCELLED',
              cancelled_at = coalesce(cancelled_at, $3::timestamptz),
              updated_at = now()
          where notification_id = $1::uuid
            and user_id = $2::uuid
          returning notification_id
        `,
        [
          assertUuid(notificationId, "notificationId"),
          userIdFromRuntime(runtime),
          runtime.now.toISOString(),
        ],
      );
      if (!result.rows[0]) throw new Error("Notification not found.");
      return { notificationId, status: "DELETED", ...privacyFlags() };
    },
    async unreadCount(runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.unreadCount",
        `
          select type, count(*)::int as count
          from public.notifications
          where user_id = $1::uuid
            and status in ('SCHEDULED', 'SENT')
            and read_at is null
          group by type
        `,
        [userIdFromRuntime(runtime)],
      );
      const byType: Record<string, number> = {};
      for (const row of result.rows) {
        const type = apiTypeFromDb(row.type);
        byType[type] = (byType[type] ?? 0) + toNumber(row.count);
      }
      return {
        unreadCount: Object.values(byType).reduce(
          (sum, count) => sum + count,
          0,
        ),
        byType,
        updatedAt: runtime.now.toISOString(),
      };
    },
    async summary(input, runtime) {
      const startDate =
        typeof input.startDate === "string"
          ? input.startDate
          : runtime.now.toISOString().slice(0, 10);
      const endDate =
        typeof input.endDate === "string"
          ? input.endDate
          : runtime.now.toISOString().slice(0, 10);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.summary",
        `
          select
            count(*)::int as total_count,
            count(*) filter (where status in ('SCHEDULED', 'SENT') and read_at is null)::int as unread_count,
            count(*) filter (where status in ('FAILED', 'CANCELLED', 'EXPIRED'))::int as archived_count,
            count(*) filter (where priority >= 8)::int as urgent_count
          from public.notifications
          where user_id = $1::uuid
            and created_at >= $2::timestamptz
            and created_at < ($3::date + interval '1 day')
        `,
        [userIdFromRuntime(runtime), `${startDate}T00:00:00.000Z`, endDate],
      );
      const row = result.rows[0] ?? {};
      return {
        startDate,
        endDate,
        totalCount: toNumber(row.total_count),
        unreadCount: toNumber(row.unread_count),
        archivedCount: toNumber(row.archived_count),
        urgentCount: toNumber(row.urgent_count),
        contentRecommendationEnabled: false,
        adPartnerEnabled: false,
        sensitiveFinancialDataExposed: false,
      };
    },
    async getPreferences(runtime) {
      const { userId: _userId, ...safePreferences } = defaultPreferences(
        userIdFromRuntime(runtime),
        runtime.now,
      );
      return safePreferences;
    },
    async updatePreferences(input: NotificationPreferenceInput, runtime) {
      const { userId: _userId, ...safePreferences } = defaultPreferences(
        userIdFromRuntime(runtime),
        runtime.now,
      );
      return {
        ...safePreferences,
        ...sanitizeRecord(input),
        adPartnerEnabled: input.adPartnerEnabled === true,
        contentRecommendationEnabled:
          input.contentRecommendationEnabled === true,
        sensitiveFinancialTargetingConsent: false,
        updatedAt: runtime.now.toISOString(),
      };
    },
    async registerDevice(input: NotificationDeviceInput, runtime) {
      const pushTokenHash = await hashHex(input.pushToken);
      const fingerprintHash = await hashHex(input.deviceId);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.registerDevice",
        `
          insert into public.user_devices (
            user_id,
            platform,
            push_token_hash,
            device_fingerprint_hash,
            app_version,
            status,
            last_seen_at
          )
          values (
            $1::uuid,
            $2,
            $3,
            $4,
            $5,
            'ACTIVE',
            $6::timestamptz
          )
          on conflict (user_id, device_fingerprint_hash)
            where device_fingerprint_hash is not null and status = 'ACTIVE'
          do update
            set platform = excluded.platform,
                push_token_hash = excluded.push_token_hash,
                app_version = excluded.app_version,
                last_seen_at = excluded.last_seen_at,
                updated_at = now()
          returning device_id, platform, app_version, status, last_seen_at, created_at, updated_at
        `,
        [
          userIdFromRuntime(runtime),
          devicePlatform(input.platform),
          pushTokenHash,
          fingerprintHash,
          input.appVersion,
          runtime.now.toISOString(),
        ],
      );
      const row = result.rows[0] ?? {};
      return {
        deviceId: String(row.device_id ?? input.deviceId),
        platform: String(row.platform ?? input.platform),
        pushTokenHashOnly: true,
        rawPushTokenExposed: false,
        appVersion: toText(row.app_version) ?? input.appVersion,
        locale: input.locale,
        status: String(row.status ?? "ACTIVE"),
        registeredAt: toIso(row.created_at ?? runtime.now),
        updatedAt: toIso(row.updated_at ?? runtime.now),
      };
    },
    async revokeDevice(deviceId, runtime) {
      const fingerprintHash = await hashHex(deviceId);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.revokeDevice",
        `
          update public.user_devices
          set status = 'REVOKED',
              revoked_at = coalesce(revoked_at, $3::timestamptz),
              updated_at = now()
          where user_id = $1::uuid
            and (device_id::text = $2 or device_fingerprint_hash = $4)
            and status = 'ACTIVE'
          returning device_id, status, revoked_at
        `,
        [
          userIdFromRuntime(runtime),
          deviceId,
          runtime.now.toISOString(),
          fingerprintHash,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Notification device not found.");
      return {
        deviceId: String(row.device_id ?? deviceId),
        status: String(row.status ?? "REVOKED"),
        revokedAt: toIso(row.revoked_at ?? runtime.now),
        rawPushTokenExposed: false,
      };
    },
    async listDevices(runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "notifications.listDevices",
        `
          select device_id, platform, app_version, status, last_seen_at, created_at, updated_at
          from public.user_devices
          where user_id = $1::uuid
            and status = 'ACTIVE'
          order by last_seen_at desc nulls last, created_at desc
        `,
        [userIdFromRuntime(runtime)],
      );
      return result.rows.map((row) => ({
        deviceId: String(row.device_id ?? ""),
        platform: String(row.platform ?? "UNKNOWN"),
        appVersion: toText(row.app_version),
        status: String(row.status ?? "ACTIVE"),
        lastSeenAt: toIsoOrNull(row.last_seen_at),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at ?? row.created_at),
        rawPushTokenExposed: false,
      }));
    },
    async test(input, runtime) {
      const notification = await this.create(
        { ...input, title: `[TEST] ${input.title}` },
        runtime,
      );
      return {
        delivered: notification.notificationId !== null,
        notification,
        dryRun: false,
        ...privacyFlags(),
      };
    },
    async previewRules(input: NotificationRulePreviewInput, runtime) {
      const candidates: JsonRecord[] = [];
      if (input.upcomingPaymentCount > 0) {
        candidates.push({
          type: "PAYMENT_DUE",
          title: "Fixed payment due",
          priority: "HIGH",
          enabled: true,
        });
      }
      if (input.budgetUsageRate >= 1) {
        candidates.push({
          type: "BUDGET_EXCEEDED",
          title: "Daily budget exceeded",
          priority: "URGENT",
          enabled: true,
        });
      } else if (input.budgetUsageRate >= 0.8) {
        candidates.push({
          type: "BUDGET_WARNING",
          title: "Daily budget warning",
          priority: "HIGH",
          enabled: true,
        });
      }
      if (input.savingsGoalRate >= 1) {
        candidates.push({
          type: "SAVINGS_GOAL",
          title: "Savings goal reached",
          priority: "NORMAL",
          enabled: true,
        });
      }
      if (input.levelChanged) {
        candidates.push({
          type: "LEVEL_UP",
          title: "LV UP achieved",
          priority: "NORMAL",
          enabled: true,
        });
      }
      return {
        today: input.today,
        candidates: candidates as unknown as JsonValue,
        source: "SERVER_RULE_PREVIEW",
        updatedAt: runtime.now.toISOString(),
        ...privacyFlags(),
      };
    },
  };
}
