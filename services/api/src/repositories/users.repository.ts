import type {
  JsonRecord,
  UserSupportTicketInput,
  UsersRepository,
  UsersRouteRuntime,
} from "../routes/users.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface UsersDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface UsersDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type UsersDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: UsersDbQueryOptions<TEnv>,
) => Promise<UsersDbQueryResult>;

export interface NeonUsersRepositoryOptions<TEnv = unknown> {
  readonly query?: UsersDbQuery<TEnv>;
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

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonUsersRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for users repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: UsersDbQueryOptions<TEnv>,
): Promise<UsersDbQueryResult> {
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

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function bool(value: unknown): boolean {
  return value === true;
}

function nowIso(runtime: UsersRouteRuntime): string {
  return runtime.now.toISOString();
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function maskEmail(value: unknown, fallbackUserId: string): string {
  const email = text(value);
  const at = email.indexOf("@");
  if (at > 0 && at < email.length - 1) {
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const prefix = local.slice(0, Math.min(2, local.length));
    return `${prefix}***@${domain}`;
  }
  return `${fallbackUserId.slice(0, Math.min(4, fallbackUserId.length))}***@masked.local`;
}

function defaultUser(runtime: UsersRouteRuntime): JsonRecord {
  const userId = runtime.principal.userId;
  return {
    adTargetingSeparated: true,
    avatarAttachmentId: null,
    birthYear: null,
    createdAt: nowIso(runtime),
    displayBio: null,
    emailMasked: `${userId.slice(0, Math.min(4, userId.length))}***@masked.local`,
    financialRawDataExposed: false,
    lastLoginAt: null,
    level: 1,
    nickname: "급여납치 사용자",
    occupationCategory: null,
    status: "ACTIVE",
    updatedAt: nowIso(runtime),
    userId,
    withdrawalRequested: false,
    withdrawalRequestedAt: null,
  };
}

function userProfileFromRow(
  row: DbRow,
  runtime: UsersRouteRuntime,
): JsonRecord {
  const userId = text(row.user_id, runtime.principal.userId);
  const displayName = text(row.display_name, text(row.nickname, "Salary User"));
  return {
    adTargetingSeparated: true,
    avatarAttachmentId: nullableText(
      row.avatar_attachment_id ?? row.profile_image_url,
    ),
    birthYear: nullableInteger(row.birth_year),
    createdAt: text(row.created_at, nowIso(runtime)),
    displayBio: nullableText(row.display_bio ?? row.bio),
    emailMasked: maskEmail(row.email, userId),
    financialRawDataExposed: false,
    lastLoginAt: nullableText(row.last_login_at),
    level: rowNumber(row, "level", 1),
    nickname: displayName,
    occupationCategory: nullableText(row.occupation_category ?? row.job_title),
    status: text(row.status, "ACTIVE"),
    updatedAt: text(row.updated_at, nowIso(runtime)),
    userId,
    withdrawalRequested: rowBool(row, "withdrawal_requested"),
    withdrawalRequestedAt: nullableText(row.withdrawal_requested_at),
  };
}

function defaultSettings(runtime: UsersRouteRuntime): JsonRecord {
  return {
    dashboardCompactMode: false,
    language: "ko-KR",
    paydayReminderDaysBefore: 3,
    showAmountsInCommunity: false,
    theme: "SYSTEM",
    timezone: "Asia/Seoul",
    updatedAt: nowIso(runtime),
    userId: runtime.principal.userId,
    weekStartsOnMonday: false,
  };
}

function defaultConsents(runtime: UsersRouteRuntime): JsonRecord {
  return {
    adPartnerAccepted: false,
    adPartnerFinancialRawDataUsed: false,
    analyticsAccepted: false,
    consentVersion: "v3.1",
    contentRecommendationAccepted: false,
    marketingAccepted: false,
    privacyAccepted: true,
    sensitiveFinancialTargetingAccepted: false,
    termsAccepted: true,
    updatedAt: nowIso(runtime),
    userId: runtime.principal.userId,
  };
}

function listResult(
  items: readonly JsonRecord[],
  page: { readonly page: number; readonly pageSize: number },
) {
  return {
    items,
    page: page.page,
    pageSize: page.pageSize,
    total: items.length,
  };
}

function ticketFromRow(row: DbRow): JsonRecord {
  return {
    adsFinancialTargetingUsed: row.ads_financial_targeting_used === true,
    category: text(row.category, "OTHER"),
    createdAt: text(row.created_at, new Date().toISOString()),
    id: text(row.ticket_id),
    rawFinancialDataExposed: row.raw_financial_data_exposed === true,
    rawPersonalDataExposed: row.raw_personal_data_exposed === true,
    rawPushTokenExposed: row.raw_push_token_exposed === true,
    status: text(row.status, "OPEN"),
    subject: text(row.subject, "문의"),
  };
}

function exportFromRow(row: DbRow): JsonRecord {
  return {
    adsFinancialTargetingUsed: row.ads_financial_targeting_used === true,
    createdAt: text(row.created_at, new Date().toISOString()),
    downloadUrl:
      typeof row.download_url === "string" && row.download_url.trim()
        ? row.download_url.trim()
        : null,
    expiresAt: text(row.expires_at, ""),
    exportId: text(row.export_id),
    financialRawDataIncluded: row.financial_raw_data_included === true,
    includeCommunity: row.include_community === true,
    includeConsents: row.include_consents === true,
    includeFinancialSummaryOnly: row.include_financial_summary_only !== false,
    includeGrowth: row.include_growth === true,
    includeProfile: row.include_profile === true,
    includeSettings: row.include_settings === true,
    rawPersonalDataIncluded: row.raw_personal_data_included === true,
    rawTokenIncluded: row.raw_token_included === true,
    status: text(row.status, "REQUESTED"),
  };
}

function withdrawalRequestFromRow(row: DbRow): JsonRecord {
  return {
    deleteCommunityContent: row.delete_community_content === true,
    status: "ACTIVE",
    withdrawalRequested: true,
    withdrawalRequestedAt: text(row.requested_at, new Date().toISOString()),
  };
}

function rowBool(row: DbRow, key: string, fallback = false): boolean {
  return typeof row[key] === "boolean" ? row[key] === true : fallback;
}

function rowNumber(row: DbRow, key: string, fallback: number): number {
  const value = row[key];
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : fallback;
}

function settingsFromRow(row: DbRow): JsonRecord {
  return {
    dashboardCompactMode: rowBool(row, "dashboard_compact_mode"),
    language: text(row.language, text(row.locale, "ko-KR")),
    paydayReminderDaysBefore: rowNumber(row, "payday_reminder_days_before", 3),
    showAmountsInCommunity: rowBool(row, "show_amounts_in_community"),
    theme: text(row.theme, "SYSTEM"),
    timezone: text(row.timezone, "Asia/Seoul"),
    updatedAt: text(row.updated_at, new Date().toISOString()),
    weekStartsOnMonday: rowBool(row, "week_starts_on_monday"),
  };
}

function consentsFromRows(rows: readonly DbRow[]): JsonRecord {
  const result: Record<string, boolean | string> = {
    adPartnerAccepted: false,
    adPartnerFinancialRawDataUsed: false,
    analyticsAccepted: false,
    consentVersion: "v3.1",
    contentRecommendationAccepted: false,
    marketingAccepted: false,
    privacyAccepted: true,
    sensitiveFinancialTargetingAccepted: false,
    termsAccepted: true,
    updatedAt: new Date().toISOString(),
  };
  for (const row of rows) {
    const granted = row.granted === true;
    const version = text(row.consent_version, "");
    const updatedAt = text(row.updated_at, "");
    if (version) result.consentVersion = version;
    if (updatedAt) result.updatedAt = updatedAt;
    switch (text(row.consent_type)) {
      case "TERMS_OF_SERVICE":
        result.termsAccepted = granted;
        break;
      case "PRIVACY_POLICY":
        result.privacyAccepted = granted;
        break;
      case "MARKETING":
        result.marketingAccepted = granted;
        break;
      case "ANALYTICS":
        result.analyticsAccepted = granted;
        break;
      case "ADS_PARTNER":
        result.adPartnerAccepted = granted;
        break;
      case "CONTENT_RECOMMENDATION":
        result.contentRecommendationAccepted = granted;
        break;
    }
  }
  return result;
}

function consentsFromAggregateRow(row: DbRow): JsonRecord {
  return {
    adPartnerAccepted: rowBool(row, "ad_partner_accepted"),
    adPartnerFinancialRawDataUsed: false,
    analyticsAccepted: rowBool(row, "analytics_accepted"),
    consentVersion: text(row.consent_version, "v3.1"),
    contentRecommendationAccepted: rowBool(
      row,
      "content_recommendation_accepted",
    ),
    marketingAccepted: rowBool(row, "marketing_accepted"),
    privacyAccepted: rowBool(row, "privacy_accepted", true),
    sensitiveFinancialTargetingAccepted: false,
    termsAccepted: rowBool(row, "terms_accepted", true),
    updatedAt: text(row.updated_at, new Date().toISOString()),
  };
}

export function createNeonUsersRepository<TEnv = unknown>(
  options: NeonUsersRepositoryOptions<TEnv> = {},
): UsersRepository<TEnv> {
  const query = options.query ?? defaultQuery<TEnv>;

  return {
    name: "neon-users-repository",

    async getMe(runtime) {
      const result = await query(
        `
          select
            u.user_id,
            u.email,
            u.nickname,
            u.status,
            u.last_login_at,
            u.created_at,
            u.updated_at,
            coalesce(p.display_name, u.nickname) as display_name,
            p.bio as display_bio,
            p.profile_image_url,
            p.avatar_attachment_id,
            p.birth_year,
            p.occupation_category,
            1 as level,
            false as withdrawal_requested,
            null::timestamptz as withdrawal_requested_at
          from public.users u
          left join public.user_profiles p
            on p.user_id = u.user_id
          where u.user_id = $1
          limit 1
        `,
        [runtime.principal.userId],
        { env: runtime.env, operationName: "users.getMe" },
      );
      const row = result.rows[0];
      const profile = row
        ? userProfileFromRow(row, runtime)
        : defaultUser(runtime);
      return {
        ...profile,
        consents: defaultConsents(runtime),
        settings: defaultSettings(runtime),
      };
    },

    async updateMe(input, runtime) {
      const result = await query(
        `
          with updated_user as (
            update public.users
            set
              nickname = coalesce($2, nickname),
              updated_at = $7::timestamptz
            where user_id = $1
            returning
              user_id,
              email,
              nickname,
              status,
              last_login_at,
              created_at,
              updated_at
          ),
          upsert_profile as (
            insert into public.user_profiles (
              user_id,
              display_name,
              bio,
              profile_image_url,
              avatar_attachment_id,
              birth_year,
              occupation_category,
              updated_at
            )
            select
              $1,
              coalesce($2, nickname),
              $3,
              $4,
              $4,
              $5,
              $6,
              $7::timestamptz
            from updated_user
            on conflict (user_id) do update
            set
              display_name = excluded.display_name,
              bio = excluded.bio,
              profile_image_url = excluded.profile_image_url,
              avatar_attachment_id = excluded.avatar_attachment_id,
              birth_year = excluded.birth_year,
              occupation_category = excluded.occupation_category,
              updated_at = excluded.updated_at
            returning
              user_id,
              display_name,
              bio as display_bio,
              profile_image_url,
              avatar_attachment_id,
              birth_year,
              occupation_category
          )
          select
            u.user_id,
            u.email,
            u.nickname,
            u.status,
            u.last_login_at,
            u.created_at,
            u.updated_at,
            coalesce(p.display_name, u.nickname) as display_name,
            p.display_bio,
            p.profile_image_url,
            p.avatar_attachment_id,
            p.birth_year,
            p.occupation_category,
            1 as level,
            false as withdrawal_requested,
            null::timestamptz as withdrawal_requested_at
          from updated_user u
          left join upsert_profile p
            on p.user_id = u.user_id
        `,
        [
          runtime.principal.userId,
          nullableText(input.nickname),
          nullableText(input.displayBio),
          nullableText(input.avatarAttachmentId),
          typeof input.birthYear === "number" ? input.birthYear : null,
          nullableText(input.occupationCategory),
          nowIso(runtime),
        ],
        { env: runtime.env, operationName: "users.updateMe" },
      );
      const row = result.rows[0];
      if (!row) throw new Error("Profile update returned no row.");
      return userProfileFromRow(row, runtime);
    },

    async withdraw(input, runtime) {
      return {
        deleteCommunityContent: bool(input.deleteCommunityContent),
        status: "WITHDRAWN",
        userId: runtime.principal.userId,
        withdrawnAt: nowIso(runtime),
      };
    },

    async requestWithdrawal(input, runtime) {
      const result = await query(
        `
          insert into public.user_withdrawal_requests (
            user_id,
            reason,
            delete_community_content,
            status,
            request_trace_id,
            requested_at,
            created_at,
            updated_at
          )
          values ($1, $2, $3, 'REQUESTED', $4, $5::timestamptz, $5::timestamptz, $5::timestamptz)
          returning
            request_id,
            status,
            delete_community_content,
            requested_at
        `,
        [
          runtime.principal.userId,
          input.reason,
          bool(input.deleteCommunityContent),
          runtime.requestId,
          nowIso(runtime),
        ],
        { env: runtime.env, operationName: "users.requestWithdrawal" },
      );
      const row = result.rows[0];
      if (!row) throw new Error("Withdrawal request insert returned no row.");
      return withdrawalRequestFromRow(row);
    },

    async createSupportTicket(
      input: UserSupportTicketInput,
      runtime: UsersRouteRuntime<TEnv>,
    ) {
      const result = await query(
        `
          insert into public.user_support_tickets (
            user_id,
            category,
            subject,
            message_body,
            status,
            raw_financial_data_exposed,
            raw_personal_data_exposed,
            raw_push_token_exposed,
            ads_financial_targeting_used,
            request_id,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, 'OPEN', false, false, false, false, $5, $6::timestamptz, $6::timestamptz)
          returning
            ticket_id,
            category,
            subject,
            status,
            raw_financial_data_exposed,
            raw_personal_data_exposed,
            raw_push_token_exposed,
            ads_financial_targeting_used,
            created_at
        `,
        [
          runtime.principal.userId,
          input.category,
          input.subject,
          input.message,
          runtime.requestId,
          nowIso(runtime),
        ],
        { env: runtime.env, operationName: "users.createSupportTicket" },
      );
      const row = result.rows[0];
      if (!row) throw new Error("Support ticket insert returned no row.");
      return ticketFromRow(row);
    },

    async restore(runtime) {
      return { ...defaultUser(runtime), restoredAt: nowIso(runtime) };
    },

    async summary(runtime) {
      return {
        adPartnerAccepted: false,
        contentRecommendationAccepted: false,
        financialRawDataExposed: false,
        level: 1,
        nextActions: "급여계획 최신화, 일일 예산 확인, LV UP 루틴 인증",
        profileCompleted: false,
        sensitiveFinancialTargetingAccepted: false,
        status: "ACTIVE",
        theme: "SYSTEM",
        userId: runtime.principal.userId,
      };
    },

    async activity(_input, page, runtime) {
      return listResult(
        [
          {
            action: "USER_SUPPORT_TICKET_CREATED",
            activityId: `act_${runtime.requestId}`,
            createdAt: nowIso(runtime),
            financialRawDataExposed: false,
            requestId: runtime.requestId,
            targetId: null,
            userId: runtime.principal.userId,
          },
        ],
        page,
      );
    },

    async getSettings(runtime) {
      const result = await query(
        `
          select
            user_id,
            theme,
            locale as language,
            timezone,
            week_starts_on_monday,
            show_amounts_in_community,
            dashboard_compact_mode,
            payday_reminder_days_before,
            updated_at
          from public.user_settings
          where user_id = $1
          limit 1
        `,
        [runtime.principal.userId],
        { env: runtime.env, operationName: "users.getSettings" },
      );
      const row = result.rows[0];
      return row ? settingsFromRow(row) : defaultSettings(runtime);
    },

    async updateSettings(input, runtime) {
      const base = defaultSettings(runtime);
      const merged = { ...base, ...(input as JsonRecord) };
      const result = await query(
        `
          insert into public.user_settings (
            user_id,
            timezone,
            locale,
            theme,
            week_starts_on_monday,
            show_amounts_in_community,
            dashboard_compact_mode,
            payday_reminder_days_before,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
          on conflict (user_id) do update
          set
            timezone = excluded.timezone,
            locale = excluded.locale,
            theme = excluded.theme,
            week_starts_on_monday = excluded.week_starts_on_monday,
            show_amounts_in_community = excluded.show_amounts_in_community,
            dashboard_compact_mode = excluded.dashboard_compact_mode,
            payday_reminder_days_before = excluded.payday_reminder_days_before,
            updated_at = excluded.updated_at
          returning
            user_id,
            theme,
            locale as language,
            timezone,
            week_starts_on_monday,
            show_amounts_in_community,
            dashboard_compact_mode,
            payday_reminder_days_before,
            updated_at
        `,
        [
          runtime.principal.userId,
          text(merged.timezone, "Asia/Seoul"),
          text(merged.language, "ko-KR"),
          text(merged.theme, "SYSTEM"),
          bool(merged.weekStartsOnMonday),
          bool(merged.showAmountsInCommunity),
          bool(merged.dashboardCompactMode),
          rowNumber(
            { payday_reminder_days_before: merged.paydayReminderDaysBefore },
            "payday_reminder_days_before",
            3,
          ),
          nowIso(runtime),
        ],
        { env: runtime.env, operationName: "users.updateSettings" },
      );
      const row = result.rows[0];
      if (!row) throw new Error("Settings upsert returned no row.");
      return settingsFromRow(row);
    },

    async getConsents(runtime) {
      const result = await query(
        `
          select distinct on (consent_type)
            consent_type,
            granted,
            consent_version,
            created_at as updated_at
          from public.user_consents
          where user_id = $1
          order by consent_type, created_at desc
        `,
        [runtime.principal.userId],
        { env: runtime.env, operationName: "users.getConsents" },
      );
      return result.rows.length
        ? consentsFromRows(result.rows)
        : defaultConsents(runtime);
    },

    async updateConsents(input, runtime) {
      const merged = {
        ...defaultConsents(runtime),
        ...(input as JsonRecord),
      };
      const consentTypes = [
        "TERMS_OF_SERVICE",
        "PRIVACY_POLICY",
        "MARKETING",
        "ANALYTICS",
        "ADS_PARTNER",
        "CONTENT_RECOMMENDATION",
      ] as const;
      const grantedValues = [
        bool(merged.termsAccepted),
        bool(merged.privacyAccepted),
        bool(merged.marketingAccepted),
        bool(merged.analyticsAccepted),
        bool(merged.adPartnerAccepted),
        bool(merged.contentRecommendationAccepted),
      ] as const;
      const result = await query(
        `
          with inserted as (
            insert into public.user_consents (
              user_id,
              consent_type,
              granted,
              consent_version,
              source,
              granted_at,
              revoked_at,
              created_at
            )
            select
              $1::uuid,
              consent_type,
              granted,
              $4,
              'APP',
              case when granted then $5::timestamptz else null end,
              case when granted then null else $5::timestamptz end,
              $5::timestamptz
            from unnest($2::text[], $3::boolean[]) as input(consent_type, granted)
            returning consent_type, granted, consent_version, created_at
          )
          select
            bool_or(consent_type = 'TERMS_OF_SERVICE' and granted) as terms_accepted,
            bool_or(consent_type = 'PRIVACY_POLICY' and granted) as privacy_accepted,
            bool_or(consent_type = 'MARKETING' and granted) as marketing_accepted,
            bool_or(consent_type = 'ANALYTICS' and granted) as analytics_accepted,
            bool_or(consent_type = 'ADS_PARTNER' and granted) as ad_partner_accepted,
            bool_or(consent_type = 'CONTENT_RECOMMENDATION' and granted) as content_recommendation_accepted,
            max(consent_version) as consent_version,
            max(created_at) as updated_at
          from inserted
        `,
        [
          runtime.principal.userId,
          consentTypes,
          grantedValues,
          text(merged.consentVersion, "v3.1"),
          nowIso(runtime),
        ],
        { env: runtime.env, operationName: "users.updateConsents" },
      );
      const row = result.rows[0];
      if (!row) throw new Error("Consent update returned no row.");
      return consentsFromAggregateRow(row);
    },

    async requestExport(input, runtime) {
      const result = await query(
        `
          insert into public.user_privacy_exports (
            user_id,
            status,
            include_profile,
            include_settings,
            include_consents,
            include_community,
            include_growth,
            include_financial_summary_only,
            reason,
            financial_raw_data_included,
            raw_personal_data_included,
            raw_token_included,
            ads_financial_targeting_used,
            request_id,
            expires_at,
            created_at,
            updated_at
          )
          values (
            $1,
            'REQUESTED',
            $2,
            $3,
            $4,
            $5,
            $6,
            true,
            $7,
            false,
            false,
            false,
            false,
            $8,
            $9::timestamptz,
            $10::timestamptz,
            $10::timestamptz
          )
          returning
            export_id,
            status,
            include_profile,
            include_settings,
            include_consents,
            include_community,
            include_growth,
            include_financial_summary_only,
            financial_raw_data_included,
            download_url,
            expires_at,
            created_at
        `,
        [
          runtime.principal.userId,
          bool(input.includeProfile),
          bool(input.includeSettings),
          bool(input.includeConsents),
          bool(input.includeCommunity),
          bool(input.includeGrowth),
          nullableText(input.reason),
          runtime.requestId,
          new Date(runtime.now.getTime() + 86_400_000).toISOString(),
          nowIso(runtime),
        ],
        { env: runtime.env, operationName: "users.requestExport" },
      );
      const row = result.rows[0];
      if (!row) throw new Error("Privacy export insert returned no row.");
      return exportFromRow(row);
    },

    async getExport(exportId, runtime) {
      const result = await query(
        `
          select
            export_id,
            status,
            include_profile,
            include_settings,
            include_consents,
            include_community,
            include_growth,
            include_financial_summary_only,
            download_url,
            expires_at,
            financial_raw_data_included,
            raw_personal_data_included,
            raw_token_included,
            ads_financial_targeting_used,
            created_at
          from public.user_privacy_exports
          where user_id = $1
            and export_id = $2
          limit 1
        `,
        [runtime.principal.userId, exportId],
        { env: runtime.env, operationName: "users.getExport" },
      );
      const row = result.rows[0];
      return row ? exportFromRow(row) : null;
    },

    async listExports(page, runtime) {
      const result = await query(
        `
          select
            export_id,
            status,
            include_profile,
            include_settings,
            include_consents,
            include_community,
            include_growth,
            include_financial_summary_only,
            download_url,
            expires_at,
            financial_raw_data_included,
            raw_personal_data_included,
            raw_token_included,
            ads_financial_targeting_used,
            created_at,
            count(*) over() as total_count
          from public.user_privacy_exports
          where user_id = $1
          order by created_at desc, export_id desc
          limit $2
          offset $3
        `,
        [runtime.principal.userId, page.limit, page.offset],
        { env: runtime.env, operationName: "users.listExports" },
      );
      return {
        items: result.rows.map(exportFromRow),
        page: page.page,
        pageSize: page.pageSize,
        total: rowNumber(result.rows[0] ?? {}, "total_count", 0),
      };
    },
  };
}
