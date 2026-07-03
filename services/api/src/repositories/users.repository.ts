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

export function createNeonUsersRepository<TEnv = unknown>(
  options: NeonUsersRepositoryOptions<TEnv> = {},
): UsersRepository<TEnv> {
  const query = options.query ?? defaultQuery<TEnv>;

  return {
    name: "neon-users-repository",

    async getMe(runtime) {
      return {
        ...defaultUser(runtime),
        consents: defaultConsents(runtime),
        settings: defaultSettings(runtime),
      };
    },

    async updateMe(input, runtime) {
      return {
        ...defaultUser(runtime),
        ...(input as JsonRecord),
        updatedAt: nowIso(runtime),
      };
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
      return defaultSettings(runtime);
    },

    async updateSettings(input, runtime) {
      return {
        ...defaultSettings(runtime),
        ...(input as JsonRecord),
        updatedAt: nowIso(runtime),
      };
    },

    async getConsents(runtime) {
      return defaultConsents(runtime);
    },

    async updateConsents(input, runtime) {
      return {
        ...defaultConsents(runtime),
        ...(input as JsonRecord),
        adPartnerFinancialRawDataUsed: false,
        sensitiveFinancialTargetingAccepted: false,
        updatedAt: nowIso(runtime),
      };
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
      return {
        createdAt: nowIso(runtime),
        exportId,
        financialRawDataIncluded: false,
        status: "READY",
        userId: runtime.principal.userId,
      };
    },

    async listExports(page, runtime) {
      return listResult(
        [
          {
            createdAt: nowIso(runtime),
            exportId: `uex_${runtime.requestId}`,
            financialRawDataIncluded: false,
            status: "READY",
            userId: runtime.principal.userId,
          },
        ],
        page,
      );
    },
  };
}
