import type {
  AdminListResult,
  AdminMutationAction,
  AdminRepository,
  AdminRouteRuntime,
  JsonRecord,
  PaginationInput,
} from "../routes/admin.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface AdminDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface AdminDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type AdminDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: AdminDbQueryOptions<TEnv>,
) => Promise<AdminDbQueryResult>;

export interface NeonAdminRepositoryOptions<TEnv = unknown> {
  readonly query?: AdminDbQuery<TEnv>;
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

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonAdminRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for admin repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: AdminDbQueryOptions<TEnv>,
): Promise<AdminDbQueryResult> {
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

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function integer(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function iso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function textArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function jsonString(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "{}";
  return JSON.stringify(value);
}

function assertUuid(value: string, field: string): string {
  if (!uuidPattern.test(value)) {
    throw new Error(`${field} must be a UUID for DB-backed admin operations.`);
  }
  return value;
}

function requireReason(input: JsonRecord, runtime: AdminRouteRuntime): string {
  const headerReason = runtime.request.headers.get("x-admin-reason")?.trim();
  const bodyReason =
    typeof input.reason === "string" ? input.reason.trim() : "";
  const reason = headerReason || bodyReason;
  if (!reason) throw new Error("Admin mutation reason is required.");
  return reason.slice(0, 500);
}

function growthContentPrivacyFlags(): JsonRecord {
  return {
    auditReasonRequired: true,
    serverAuthority: true,
    financialRawDataExposed: false,
  };
}

function rowToGrowthContent(row: DbRow): JsonRecord {
  return {
    contentId: text(row.content_id),
    contentType: text(row.content_type),
    title: text(row.title),
    subtitle: optionalText(row.subtitle),
    category: text(row.category, "OTHER"),
    difficulty: text(row.difficulty, "NORMAL"),
    estimatedMinutes: integer(row.estimated_minutes, 5),
    topics: [...textArray(row.topics)],
    summary: text(row.summary),
    missionPrompt: text(row.mission_prompt),
    recordQuestion: text(row.record_question),
    sourceTitle: text(row.source_title),
    sourceAuthor: optionalText(row.source_author),
    sourceName: optionalText(row.source_name),
    sourceUrl: text(row.source_url),
    licenseType: text(row.license_type),
    safetyLevel: text(row.safety_level, "GENERAL"),
    viewpointTag: optionalText(row.viewpoint_tag),
    xpReward: integer(row.exp_reward),
    status: text(row.status, "DRAFT"),
    reviewRequired: bool(row.review_required, true),
    fullTextStored: bool(row.full_text_stored),
    adTargetingSeparated: bool(row.ad_targeting_separated, true),
    recommendationUsesSensitiveFinancialData: bool(
      row.recommendation_uses_sensitive_financial_data,
    ),
    publishedAt: iso(row.published_at),
    archivedAt: iso(row.archived_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    ...growthContentPrivacyFlags(),
  };
}

function listResult<TItem extends JsonRecord>(
  rows: readonly DbRow[],
  page: PaginationInput,
  mapper: (row: DbRow) => TItem,
): AdminListResult<TItem> {
  const total =
    rows.length > 0 ? integer(rows[0]?.total_count, rows.length) : rows.length;
  return {
    items: rows.map(mapper),
    page: page.page,
    pageSize: page.pageSize,
    total,
  };
}

function growthContentWhere(input: JsonRecord): {
  readonly sql: string;
  readonly params: readonly DbValue[];
} {
  const clauses = ["true"];
  const params: DbValue[] = [];
  const contentType = optionalText(input.contentType)?.toUpperCase();
  const status = optionalText(input.status)?.toUpperCase();
  const category = optionalText(input.category);

  if (contentType) {
    params.push(contentType);
    clauses.push(`gci.content_type = $${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`gci.status = $${params.length}`);
  }
  if (category) {
    params.push(category);
    clauses.push(`gci.category = $${params.length}`);
  }

  return { sql: clauses.join(" and "), params };
}

function contentInput(input: JsonRecord): readonly DbValue[] {
  return [
    text(input.contentType).toUpperCase(),
    text(input.title),
    optionalText(input.subtitle),
    text(input.category, "OTHER"),
    text(input.difficulty, "NORMAL").toUpperCase(),
    integer(input.estimatedMinutes, 5),
    textArray(input.topics),
    text(input.summary),
    text(input.missionPrompt),
    text(input.recordQuestion),
    text(input.sourceTitle),
    optionalText(input.sourceAuthor),
    optionalText(input.sourceName),
    text(input.sourceUrl),
    text(input.licenseType),
    text(input.safetyLevel, "GENERAL"),
    optionalText(input.viewpointTag)?.toUpperCase() ?? null,
    integer(input.xpReward),
    text(input.status, "DRAFT").toUpperCase(),
    bool(input.reviewRequired, true),
    false,
    true,
    false,
    jsonString(input.metadata),
  ];
}

function emptyList(page: PaginationInput): AdminListResult {
  return { items: [], page: page.page, pageSize: page.pageSize, total: 0 };
}

function placeholderResult(input: JsonRecord = {}): JsonRecord {
  return {
    ...input,
    serverAuthority: true,
    financialRawDataExposed: false,
  };
}

export function createNeonAdminRepository<TEnv = unknown>(
  options: NeonAdminRepositoryOptions<TEnv> = {},
): AdminRepository<TEnv> {
  const query = options.query ?? defaultQuery<TEnv>;
  const queryText = (
    runtime: AdminRouteRuntime<TEnv>,
    operationName: string,
    sqlText: string,
    params: readonly DbValue[],
  ) => query(sqlText, params, { operationName, env: runtime.env });

  return {
    name: "neon-admin-repository",
    async dashboard(): Promise<JsonRecord> {
      return {
        serverAuthority: true,
        financialRawDataExposure: false,
        dbBackedGrowthContentOperations: true,
      };
    },
    async listUsers(_input, page): Promise<AdminListResult> {
      return emptyList(page);
    },
    async getUser(): Promise<JsonRecord | null> {
      return null;
    },
    async updateUserStatus(userId, _input, action): Promise<JsonRecord> {
      return placeholderResult({ userId, action });
    },
    async forceLogoutUser(userId): Promise<JsonRecord> {
      return placeholderResult({ userId, revokedSessions: "ALL" });
    },
    async userActivitySummary(userId): Promise<JsonRecord> {
      return placeholderResult({ userId });
    },
    async listCommunityPosts(_input, page): Promise<AdminListResult> {
      return emptyList(page);
    },
    async getCommunityPost(): Promise<JsonRecord | null> {
      return null;
    },
    async moderateCommunityPost(
      postId,
      _input,
      action: AdminMutationAction,
    ): Promise<JsonRecord> {
      return placeholderResult({ postId, action });
    },
    async deleteCommunityPost(postId): Promise<JsonRecord> {
      return placeholderResult({ postId, status: "DELETED_BY_ADMIN" });
    },
    async listReports(_input, page): Promise<AdminListResult> {
      return emptyList(page);
    },
    async resolveReport(reportId): Promise<JsonRecord> {
      return placeholderResult({ reportId, status: "RESOLVED" });
    },
    async listNotices(_input, page): Promise<AdminListResult> {
      return emptyList(page);
    },
    async createNotice(input): Promise<JsonRecord> {
      return placeholderResult({ ...input, status: "DRAFT" });
    },
    async updateNotice(noticeId, input): Promise<JsonRecord> {
      return placeholderResult({ noticeId, ...input });
    },
    async publishNotice(noticeId): Promise<JsonRecord> {
      return placeholderResult({ noticeId, status: "PUBLISHED" });
    },
    async unpublishNotice(noticeId): Promise<JsonRecord> {
      return placeholderResult({ noticeId, status: "UNPUBLISHED" });
    },
    async deleteNotice(noticeId): Promise<JsonRecord> {
      return placeholderResult({ noticeId, status: "DELETED" });
    },
    async listAdCampaigns(_input, page): Promise<AdminListResult> {
      return emptyList(page);
    },
    async createAdCampaign(input): Promise<JsonRecord> {
      return placeholderResult({ ...input, status: "DRAFT" });
    },
    async updateAdCampaign(campaignId, input): Promise<JsonRecord> {
      return placeholderResult({ campaignId, ...input });
    },
    async changeAdCampaignStatus(campaignId, status): Promise<JsonRecord> {
      return placeholderResult({ campaignId, status });
    },
    async adReports(): Promise<JsonRecord> {
      return placeholderResult({ impressions: 0, clicks: 0 });
    },
    async listGrowthTasks(_input, page): Promise<AdminListResult> {
      return emptyList(page);
    },
    async createGrowthTask(input): Promise<JsonRecord> {
      return placeholderResult({ ...input, status: "DRAFT" });
    },
    async updateGrowthTask(taskId, input): Promise<JsonRecord> {
      return placeholderResult({ taskId, ...input });
    },
    async listGrowthContents(input, page, runtime): Promise<AdminListResult> {
      const where = growthContentWhere(input);
      const params = [...where.params, page.limit, page.offset];
      const result = await queryText(
        runtime,
        "admin.listGrowthContents",
        `
          select
            gci.*,
            count(*) over() as total_count
          from public.growth_content_items gci
          where ${where.sql}
          order by gci.updated_at desc,
                   gci.created_at desc,
                   gci.content_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, rowToGrowthContent);
    },
    async createGrowthContent(input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.createGrowthContent",
        `
          insert into public.growth_content_items (
            content_type,
            title,
            subtitle,
            category,
            difficulty,
            estimated_minutes,
            topics,
            summary,
            mission_prompt,
            record_question,
            source_title,
            source_author,
            source_name,
            source_url,
            license_type,
            safety_level,
            viewpoint_tag,
            exp_reward,
            status,
            review_required,
            full_text_stored,
            ad_targeting_separated,
            recommendation_uses_sensitive_financial_data,
            metadata
          ) values (
            $1, $2, $3, $4, $5, $6::int, $7::text[], $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18::int, $19, $20::boolean,
            $21::boolean, $22::boolean, $23::boolean, $24::jsonb
          )
          returning *
        `,
        contentInput(input),
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create LV UP content.");
      return rowToGrowthContent(row);
    },
    async updateGrowthContent(contentId, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.updateGrowthContent",
        `
          update public.growth_content_items
          set
            title = coalesce(nullif($3, ''), title),
            subtitle = $4,
            category = coalesce(nullif($5, ''), category),
            difficulty = coalesce(nullif($6, ''), difficulty),
            estimated_minutes = coalesce($7::int, estimated_minutes),
            topics = coalesce($8::text[], topics),
            summary = coalesce(nullif($9, ''), summary),
            mission_prompt = coalesce(nullif($10, ''), mission_prompt),
            record_question = coalesce(nullif($11, ''), record_question),
            source_title = coalesce(nullif($12, ''), source_title),
            source_author = $13,
            source_name = $14,
            source_url = coalesce(nullif($15, ''), source_url),
            license_type = coalesce(nullif($16, ''), license_type),
            safety_level = coalesce(nullif($17, ''), safety_level),
            viewpoint_tag = $18,
            exp_reward = coalesce($19::int, exp_reward),
            review_required = coalesce($21::boolean, review_required),
            full_text_stored = false,
            ad_targeting_separated = true,
            recommendation_uses_sensitive_financial_data = false,
            metadata = coalesce($25::jsonb, metadata),
            updated_at = now()
          where content_id = $1::uuid
          returning *
        `,
        [assertUuid(contentId, "contentId"), ...contentInput(input)],
      );
      const row = result.rows[0];
      if (!row) throw new Error("LV UP content not found.");
      return rowToGrowthContent(row);
    },
    async reviewGrowthContent(contentId, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.reviewGrowthContent",
        `
          update public.growth_content_items
          set status = 'REVIEW',
              updated_at = now()
          where content_id = $1::uuid
          returning *
        `,
        [assertUuid(contentId, "contentId")],
      );
      const row = result.rows[0];
      if (!row) throw new Error("LV UP content not found.");
      return rowToGrowthContent(row);
    },
    async publishGrowthContent(contentId, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.publishGrowthContent",
        `
          update public.growth_content_items
          set status = 'PUBLISHED',
              published_at = coalesce(published_at, now()),
              archived_at = null,
              full_text_stored = false,
              ad_targeting_separated = true,
              recommendation_uses_sensitive_financial_data = false,
              updated_at = now()
          where content_id = $1::uuid
          returning *
        `,
        [assertUuid(contentId, "contentId")],
      );
      const row = result.rows[0];
      if (!row) throw new Error("LV UP content not found.");
      return rowToGrowthContent(row);
    },
    async archiveGrowthContent(contentId, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.archiveGrowthContent",
        `
          update public.growth_content_items
          set status = 'ARCHIVED',
              archived_at = coalesce(archived_at, now()),
              updated_at = now()
          where content_id = $1::uuid
          returning *
        `,
        [assertUuid(contentId, "contentId")],
      );
      const row = result.rows[0];
      if (!row) throw new Error("LV UP content not found.");
      return rowToGrowthContent(row);
    },
    async listAuditLogs(_input, page): Promise<AdminListResult> {
      return emptyList(page);
    },
    async listRoleMembers(_input, page): Promise<AdminListResult> {
      return emptyList(page);
    },
    async updateRoleMember(adminId, input): Promise<JsonRecord> {
      return placeholderResult({ adminId, ...input });
    },
  };
}
