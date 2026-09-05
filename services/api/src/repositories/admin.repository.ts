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

function optionalJsonString(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return JSON.stringify(value);
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
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

function adminContextCte(runtime: AdminRouteRuntime): string {
  return `
    _admin_context as (
      select
        set_config('app.current_user_id', ${sqlLiteral(assertUuid(runtime.principal.adminId, "adminId"))}, true),
        set_config('app.is_admin', 'true', true),
        set_config('app.request_id', ${sqlLiteral(runtime.requestId)}, true)
    )
  `;
}

function growthContentPrivacyFlags(): JsonRecord {
  return {
    auditReasonRequired: true,
    serverAuthority: true,
    financialRawDataExposed: false,
  };
}

function rowToUser(row: DbRow): JsonRecord {
  return {
    userId: text(row.user_id),
    email: optionalText(row.email),
    nickname: text(row.nickname, "급여납치러"),
    status: text(row.status, "ACTIVE"),
    emailVerifiedAt: iso(row.email_verified_at),
    lastLoginAt: iso(row.last_login_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    deletedAt: iso(row.deleted_at),
    rawPasswordIncluded: false,
    rawTokenIncluded: false,
    rawFinancialDataIncluded: false,
  };
}

function rowToCommunityPost(row: DbRow): JsonRecord {
  return {
    postId: text(row.post_id),
    userId: text(row.user_id),
    boardType: text(row.board_type),
    title: text(row.title),
    status: text(row.status),
    isAnonymous: bool(row.is_anonymous),
    isPinned: bool(row.is_pinned),
    reportCount: integer(row.report_count),
    moderationReason: optionalText(row.moderation_reason),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    deletedAt: iso(row.deleted_at),
    financialRawDataExposed: false,
  };
}

function rowToCommunityReport(row: DbRow): JsonRecord {
  return {
    reportId: text(row.report_id),
    reporterUserId: text(row.reporter_user_id),
    targetType: text(row.target_type),
    targetId: text(row.target_id),
    reasonCode: text(row.reason_code),
    status: text(row.status),
    resolvedBy: optionalText(row.resolved_by),
    resolvedAt: iso(row.resolved_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    financialRawDataExposed: false,
  };
}

function rowToNotice(row: DbRow): JsonRecord {
  return {
    noticeId: text(row.notice_id),
    title: text(row.title),
    body: text(row.body),
    audience: text(row.audience, "ALL"),
    status: text(row.status, "DRAFT"),
    isPinned: bool(row.is_pinned),
    publishedAt: iso(row.published_at),
    scheduledAt: iso(row.scheduled_at),
    expiresAt: iso(row.expires_at),
    archivedAt: iso(row.archived_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function rowToAdCampaign(row: DbRow): JsonRecord {
  return {
    campaignId: text(row.ad_campaign_id),
    partnerAccountId: text(row.partner_account_id),
    name: text(row.name),
    placement: text(row.placement),
    imageUrl: optionalText(row.image_url),
    landingUrl: text(row.landing_url),
    status: text(row.status, "DRAFT"),
    priority: integer(row.priority, 100),
    targetingPolicy: text(row.targeting_policy, "CONTEXTUAL_ONLY"),
    consentRequirement: text(row.consent_requirement, "NONE"),
    riskLevel: text(row.risk_level, "LOW"),
    startAt: iso(row.start_at),
    endAt: iso(row.end_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    financialTargetingUsed: false,
    rawFinancialDataExposed: false,
  };
}

function rowToGrowthTask(row: DbRow): JsonRecord {
  return {
    taskId: text(row.growth_task_id),
    type: text(row.type),
    category: text(row.category),
    title: text(row.title),
    description: text(row.description),
    contentUrl: optionalText(row.content_url),
    xpReward: integer(row.exp_reward),
    activeFrom: iso(row.active_from),
    activeTo: iso(row.active_to),
    status: text(row.status, "ACTIVE"),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
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

function rowToAuditLog(row: DbRow): JsonRecord {
  return {
    auditLogId: text(row.admin_audit_log_id),
    actorUserId: optionalText(row.actor_user_id),
    action: text(row.action),
    targetType: text(row.target_type),
    targetId: optionalText(row.target_id),
    result: text(row.result, "SUCCESS"),
    severity: text(row.severity, "INFO"),
    requestId: text(row.request_id),
    createdAt: iso(row.created_at),
    sensitivePayloadRedacted: true,
  };
}

function rowToRoleMember(row: DbRow): JsonRecord {
  return {
    adminRoleMemberId: text(row.admin_role_member_id),
    roleKey: text(row.role_key),
    userId: text(row.user_id),
    status: text(row.status, "ACTIVE"),
    assignedAt: iso(row.assigned_at),
    revokedAt: iso(row.revoked_at),
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
    async dashboard(runtime): Promise<JsonRecord> {
      const result = await queryText(
        runtime,
        "admin.dashboard",
        `
          with ${adminContextCte(runtime)}
          select
            (select count(*) from public.users) as user_count,
            (select count(*) from public.users where status = 'ACTIVE') as active_user_count,
            (select count(*) from public.community_reports where status in ('OPEN', 'IN_REVIEW')) as open_report_count,
            (select count(*) from public.ad_campaigns where status in ('SCHEDULED', 'LIVE')) as live_ad_campaign_count,
            (select count(*) from public.operational_incidents where status not in ('RESOLVED', 'CANCELLED')) as open_incident_count
          from _admin_context
        `,
        [],
      );
      const row = result.rows[0] ?? {};
      return {
        serverAuthority: true,
        financialRawDataExposure: false,
        dbBackedAdminOperations: true,
        users: integer(row.user_count),
        activeUsers: integer(row.active_user_count),
        openReports: integer(row.open_report_count),
        liveAdCampaigns: integer(row.live_ad_campaign_count),
        openIncidents: integer(row.open_incident_count),
      };
    },
    async listUsers(input, page, runtime): Promise<AdminListResult> {
      const status = optionalText(input.status)?.toUpperCase();
      const params: DbValue[] = [];
      const clauses = ["true"];
      if (status) {
        params.push(status);
        clauses.push(`u.status = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const result = await queryText(
        runtime,
        "admin.listUsers",
        `
          with ${adminContextCte(runtime)}
          select
            u.user_id,
            u.email,
            u.nickname,
            u.status,
            u.email_verified_at,
            u.last_login_at,
            u.created_at,
            u.updated_at,
            u.deleted_at,
            count(*) over() as total_count
          from public.users u, _admin_context
          where ${clauses.join(" and ")}
          order by u.created_at desc, u.user_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, rowToUser);
    },
    async getUser(userId, runtime): Promise<JsonRecord | null> {
      const result = await queryText(
        runtime,
        "admin.getUser",
        `
          with ${adminContextCte(runtime)}
          select
            u.user_id,
            u.email,
            u.nickname,
            u.status,
            u.email_verified_at,
            u.last_login_at,
            u.created_at,
            u.updated_at,
            u.deleted_at
          from public.users u, _admin_context
          where u.user_id = $1::uuid
        `,
        [assertUuid(userId, "userId")],
      );
      return result.rows[0] ? rowToUser(result.rows[0]) : null;
    },
    async updateUserStatus(userId, input, action, runtime): Promise<JsonRecord> {
      const status = action === "SUSPEND_USER" ? "SUSPENDED" : "ACTIVE";
      const reason = requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.updateUserStatus",
        `
          with ${adminContextCte(runtime)},
          updated as (
            update public.users u
            set status = $1,
                deleted_at = case when $1 = 'ACTIVE' then null else deleted_at end,
                updated_at = now()
            from _admin_context
            where u.user_id = $2::uuid
            returning u.*
          ),
          audit as (
            insert into public.admin_audit_logs (
              actor_user_id, actor_role_snapshot, action, target_type, target_id,
              after_data, metadata, result, severity, request_id
            )
            select
              $3::uuid,
              $4::jsonb,
              $5,
              'USER',
              $2::uuid,
              jsonb_build_object('status', $1),
              jsonb_build_object('reason', $6),
              'SUCCESS',
              'NOTICE',
              $7
            from updated
            returning admin_audit_log_id
          )
          select updated.*, (select admin_audit_log_id from audit) as admin_audit_log_id
          from updated
        `,
        [
          status,
          assertUuid(userId, "userId"),
          assertUuid(runtime.principal.adminId, "adminId"),
          JSON.stringify(runtime.principal.roles),
          action,
          reason,
          runtime.requestId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Admin user not found.");
      return {
        ...rowToUser(row),
        action,
        auditLogId: text(row.admin_audit_log_id),
      };
    },
    async forceLogoutUser(userId, input, runtime): Promise<JsonRecord> {
      const reason = requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.forceLogoutUser",
        `
          with ${adminContextCte(runtime)},
          revoked as (
            update public.auth_sessions s
            set status = 'REVOKED',
                revoked_at = now(),
                revoked_reason = $2,
                updated_by = $3::uuid,
                updated_at = now()
            from _admin_context
            where s.user_id = $1::uuid
              and s.status = 'ACTIVE'
              and s.revoked_at is null
            returning s.session_id
          ),
          audit as (
            insert into public.admin_audit_logs (
              actor_user_id, actor_role_snapshot, action, target_type, target_id,
              after_data, metadata, result, severity, request_id
            )
            values (
              $3::uuid,
              $4::jsonb,
              'FORCE_LOGOUT_USER',
              'USER',
              $1::uuid,
              jsonb_build_object('revokedSessions', (select count(*) from revoked)),
              jsonb_build_object('reason', $2),
              'SUCCESS',
              'NOTICE',
              $5
            )
            returning admin_audit_log_id
          )
          select
            (select count(*) from revoked) as revoked_sessions,
            (select admin_audit_log_id from audit) as admin_audit_log_id
        `,
        [
          assertUuid(userId, "userId"),
          reason,
          assertUuid(runtime.principal.adminId, "adminId"),
          JSON.stringify(runtime.principal.roles),
          runtime.requestId,
        ],
      );
      const row = result.rows[0] ?? {};
      return {
        userId,
        revokedSessions: integer(row.revoked_sessions),
        auditLogId: text(row.admin_audit_log_id),
        serverAuthority: true,
        financialRawDataExposed: false,
      };
    },
    async userActivitySummary(userId, runtime): Promise<JsonRecord> {
      const result = await queryText(
        runtime,
        "admin.userActivitySummary",
        `
          with ${adminContextCte(runtime)}
          select
            (select count(*) from public.payroll_plans where user_id = $1::uuid) as payroll_plan_count,
            (select count(*) from public.community_posts where user_id = $1::uuid) as post_count,
            (select count(*) from public.community_reports where reporter_user_id = $1::uuid) as report_count,
            (select count(*) from public.auth_sessions where user_id = $1::uuid and status = 'ACTIVE') as active_session_count
          from _admin_context
        `,
        [assertUuid(userId, "userId")],
      );
      const row = result.rows[0] ?? {};
      return {
        userId,
        payrollPlanCount: integer(row.payroll_plan_count),
        communityPostCount: integer(row.post_count),
        reportCount: integer(row.report_count),
        activeSessionCount: integer(row.active_session_count),
        financialValuesMasked: true,
      };
    },
    async listCommunityPosts(input, page, runtime): Promise<AdminListResult> {
      const status = optionalText(input.status)?.toUpperCase();
      const params: DbValue[] = [];
      const clauses = ["true"];
      if (status) {
        params.push(status);
        clauses.push(`p.status = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const result = await queryText(
        runtime,
        "admin.listCommunityPosts",
        `
          with ${adminContextCte(runtime)}
          select p.*, count(*) over() as total_count
          from public.community_posts p, _admin_context
          where ${clauses.join(" and ")}
          order by p.updated_at desc, p.created_at desc, p.post_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, rowToCommunityPost);
    },
    async getCommunityPost(postId, runtime): Promise<JsonRecord | null> {
      const result = await queryText(
        runtime,
        "admin.getCommunityPost",
        `
          with ${adminContextCte(runtime)}
          select p.*
          from public.community_posts p, _admin_context
          where p.post_id = $1::uuid
        `,
        [assertUuid(postId, "postId")],
      );
      return result.rows[0] ? rowToCommunityPost(result.rows[0]) : null;
    },
    async moderateCommunityPost(
      postId,
      input,
      action: AdminMutationAction,
      runtime,
    ): Promise<JsonRecord> {
      const status = action === "HIDE_POST" ? "HIDDEN" : "PUBLISHED";
      const reason = requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.moderateCommunityPost",
        `
          with ${adminContextCte(runtime)},
          updated as (
            update public.community_posts p
            set status = $1,
                moderation_reason = $2,
                updated_at = now()
            from _admin_context
            where p.post_id = $3::uuid
            returning p.*
          ),
          audit as (
            insert into public.admin_audit_logs (
              actor_user_id, actor_role_snapshot, action, target_type, target_id,
              after_data, metadata, result, severity, request_id
            )
            select $4::uuid, $5::jsonb, $6, 'COMMUNITY_POST', $3::uuid,
                   jsonb_build_object('status', $1),
                   jsonb_build_object('reason', $2),
                   'SUCCESS', 'NOTICE', $7
            from updated
            returning admin_audit_log_id
          )
          select updated.*, (select admin_audit_log_id from audit) as admin_audit_log_id
          from updated
        `,
        [
          status,
          reason,
          assertUuid(postId, "postId"),
          assertUuid(runtime.principal.adminId, "adminId"),
          JSON.stringify(runtime.principal.roles),
          action,
          runtime.requestId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Community post not found.");
      return {
        ...rowToCommunityPost(row),
        action,
        auditLogId: text(row.admin_audit_log_id),
      };
    },
    async deleteCommunityPost(postId, input, runtime): Promise<JsonRecord> {
      const reason = requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.deleteCommunityPost",
        `
          with ${adminContextCte(runtime)},
          updated as (
            update public.community_posts p
            set status = 'DELETED',
                moderation_reason = $2,
                deleted_at = coalesce(deleted_at, now()),
                updated_at = now()
            from _admin_context
            where p.post_id = $1::uuid
            returning p.*
          ),
          audit as (
            insert into public.admin_audit_logs (
              actor_user_id, actor_role_snapshot, action, target_type, target_id,
              after_data, metadata, result, severity, request_id
            )
            select $3::uuid, $4::jsonb, 'DELETE_POST', 'COMMUNITY_POST', $1::uuid,
                   jsonb_build_object('status', 'DELETED'),
                   jsonb_build_object('reason', $2),
                   'SUCCESS', 'WARNING', $5
            from updated
            returning admin_audit_log_id
          )
          select updated.*, (select admin_audit_log_id from audit) as admin_audit_log_id
          from updated
        `,
        [
          assertUuid(postId, "postId"),
          reason,
          assertUuid(runtime.principal.adminId, "adminId"),
          JSON.stringify(runtime.principal.roles),
          runtime.requestId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Community post not found.");
      return {
        ...rowToCommunityPost(row),
        action: "DELETE_POST",
        auditLogId: text(row.admin_audit_log_id),
      };
    },
    async listReports(input, page, runtime): Promise<AdminListResult> {
      const status = optionalText(input.status)?.toUpperCase();
      const params: DbValue[] = [];
      const clauses = ["true"];
      if (status) {
        params.push(status);
        clauses.push(`r.status = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const result = await queryText(
        runtime,
        "admin.listReports",
        `
          with ${adminContextCte(runtime)}
          select r.*, count(*) over() as total_count
          from public.community_reports r, _admin_context
          where ${clauses.join(" and ")}
          order by r.created_at asc, r.report_id asc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, rowToCommunityReport);
    },
    async resolveReport(reportId, input, runtime): Promise<JsonRecord> {
      const reason = requireReason(input, runtime);
      const status = text(input.status, "RESOLVED").toUpperCase();
      const result = await queryText(
        runtime,
        "admin.resolveReport",
        `
          with ${adminContextCte(runtime)},
          updated as (
            update public.community_reports r
            set status = $1,
                resolution_note = $2,
                resolved_by = $3::uuid,
                resolved_at = now(),
                updated_at = now()
            from _admin_context
            where r.report_id = $4::uuid
            returning r.*
          ),
          audit as (
            insert into public.admin_audit_logs (
              actor_user_id, actor_role_snapshot, action, target_type, target_id,
              after_data, metadata, result, severity, request_id
            )
            select $3::uuid, $5::jsonb, 'RESOLVE_REPORT', 'COMMUNITY_REPORT', $4::uuid,
                   jsonb_build_object('status', $1),
                   jsonb_build_object('reason', $2),
                   'SUCCESS', 'NOTICE', $6
            from updated
            returning admin_audit_log_id
          )
          select updated.*, (select admin_audit_log_id from audit) as admin_audit_log_id
          from updated
        `,
        [
          status,
          reason,
          assertUuid(runtime.principal.adminId, "adminId"),
          assertUuid(reportId, "reportId"),
          JSON.stringify(runtime.principal.roles),
          runtime.requestId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Community report not found.");
      return {
        ...rowToCommunityReport(row),
        auditLogId: text(row.admin_audit_log_id),
      };
    },
    async listNotices(input, page, runtime): Promise<AdminListResult> {
      const status = optionalText(input.status)?.toUpperCase();
      const params: DbValue[] = [];
      const clauses = ["true"];
      if (status) {
        params.push(status);
        clauses.push(`n.status = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const result = await queryText(
        runtime,
        "admin.listNotices",
        `
          with ${adminContextCte(runtime)}
          select n.*, count(*) over() as total_count
          from public.notices n, _admin_context
          where ${clauses.join(" and ")}
          order by n.is_pinned desc, n.updated_at desc, n.notice_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, rowToNotice);
    },
    async createNotice(input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.createNotice",
        `
          with ${adminContextCte(runtime)}
          insert into public.notices (
            author_user_id, audience, title, body, status, is_pinned,
            scheduled_at, expires_at
          )
          select
            $1::uuid, $2, $3, $4, $5, $6::boolean,
            $7::timestamptz, $8::timestamptz
          from _admin_context
          returning *
        `,
        [
          assertUuid(runtime.principal.adminId, "adminId"),
          text(input.audience, "ALL").toUpperCase(),
          text(input.title),
          text(input.body),
          text(input.status, "DRAFT").toUpperCase(),
          bool(input.isPinned),
          optionalText(input.scheduledAt),
          optionalText(input.expiresAt),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create notice.");
      return rowToNotice(row);
    },
    async updateNotice(noticeId, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.updateNotice",
        `
          with ${adminContextCte(runtime)}
          update public.notices n
          set
            audience = coalesce(nullif($2, ''), audience),
            title = coalesce(nullif($3, ''), title),
            body = coalesce(nullif($4, ''), body),
            is_pinned = coalesce($5::boolean, is_pinned),
            scheduled_at = coalesce($6::timestamptz, scheduled_at),
            expires_at = coalesce($7::timestamptz, expires_at),
            updated_at = now()
          from _admin_context
          where n.notice_id = $1::uuid
          returning n.*
        `,
        [
          assertUuid(noticeId, "noticeId"),
          optionalText(input.audience)?.toUpperCase() ?? "",
          optionalText(input.title) ?? "",
          optionalText(input.body) ?? "",
          typeof input.isPinned === "boolean" ? input.isPinned : null,
          optionalText(input.scheduledAt),
          optionalText(input.expiresAt),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Notice not found.");
      return rowToNotice(row);
    },
    async publishNotice(noticeId, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.publishNotice",
        `
          with ${adminContextCte(runtime)}
          update public.notices n
          set status = 'PUBLISHED',
              published_at = coalesce(published_at, now()),
              archived_at = null,
              updated_at = now()
          from _admin_context
          where n.notice_id = $1::uuid
          returning n.*
        `,
        [assertUuid(noticeId, "noticeId")],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Notice not found.");
      return rowToNotice(row);
    },
    async unpublishNotice(noticeId, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.unpublishNotice",
        `
          with ${adminContextCte(runtime)}
          update public.notices n
          set status = 'HIDDEN',
              updated_at = now()
          from _admin_context
          where n.notice_id = $1::uuid
          returning n.*
        `,
        [assertUuid(noticeId, "noticeId")],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Notice not found.");
      return rowToNotice(row);
    },
    async deleteNotice(noticeId, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.deleteNotice",
        `
          with ${adminContextCte(runtime)}
          update public.notices n
          set status = 'ARCHIVED',
              archived_at = coalesce(archived_at, now()),
              updated_at = now()
          from _admin_context
          where n.notice_id = $1::uuid
          returning n.*
        `,
        [assertUuid(noticeId, "noticeId")],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Notice not found.");
      return rowToNotice(row);
    },
    async listAdCampaigns(input, page, runtime): Promise<AdminListResult> {
      const status = optionalText(input.status)?.toUpperCase();
      const params: DbValue[] = [];
      const clauses = ["true"];
      if (status) {
        params.push(status);
        clauses.push(`ac.status = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const result = await queryText(
        runtime,
        "admin.listAdCampaigns",
        `
          with ${adminContextCte(runtime)}
          select ac.*, count(*) over() as total_count
          from public.ad_campaigns ac, _admin_context
          where ${clauses.join(" and ")}
          order by ac.updated_at desc, ac.ad_campaign_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, rowToAdCampaign);
    },
    async createAdCampaign(input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.createAdCampaign",
        `
          with ${adminContextCte(runtime)}
          insert into public.ad_campaigns (
            partner_account_id,
            name,
            placement,
            image_url,
            landing_url,
            start_at,
            end_at,
            status,
            targeting_policy,
            targeting_payload,
            consent_requirement,
            risk_level,
            created_by,
            updated_by
          )
          select
            $1::uuid, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz,
            $8, $9, $10::jsonb, $11, $12, $13::uuid, $13::uuid
          from _admin_context
          where $14::boolean = false
          returning *
        `,
        [
          assertUuid(text(input.partnerAccountId), "partnerAccountId"),
          text(input.name),
          text(input.placement, "HOME_TOP").toUpperCase(),
          optionalText(input.imageUrl),
          text(input.landingUrl),
          text(input.startAt),
          text(input.endAt),
          text(input.status, "DRAFT").toUpperCase(),
          text(input.targetingPolicy, "CONTEXTUAL_ONLY").toUpperCase(),
          jsonString(input.targetingPayload),
          text(input.consentRequirement, "NONE").toUpperCase(),
          text(input.riskLevel, "LOW").toUpperCase(),
          assertUuid(runtime.principal.adminId, "adminId"),
          false,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create ad campaign.");
      return rowToAdCampaign(row);
    },
    async updateAdCampaign(campaignId, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.updateAdCampaign",
        `
          with ${adminContextCte(runtime)}
          update public.ad_campaigns ac
          set
            name = coalesce(nullif($2, ''), name),
            image_url = coalesce($3, image_url),
            landing_url = coalesce(nullif($4, ''), landing_url),
            targeting_payload = coalesce($5::jsonb, targeting_payload),
            updated_by = $6::uuid,
            updated_at = now()
          from _admin_context
          where ac.ad_campaign_id = $1::uuid
          returning ac.*
        `,
        [
          assertUuid(campaignId, "campaignId"),
          optionalText(input.name) ?? "",
          optionalText(input.imageUrl),
          optionalText(input.landingUrl) ?? "",
          optionalJsonString(input.targetingPayload),
          assertUuid(runtime.principal.adminId, "adminId"),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Ad campaign not found.");
      return rowToAdCampaign(row);
    },
    async changeAdCampaignStatus(campaignId, status, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const dbStatus = status === "ACTIVE" ? "LIVE" : "PAUSED";
      const result = await queryText(
        runtime,
        "admin.changeAdCampaignStatus",
        `
          with ${adminContextCte(runtime)}
          update public.ad_campaigns ac
          set status = $2,
              paused_at = case when $2 = 'PAUSED' then now() else paused_at end,
              approved_at = case when $2 = 'LIVE' then coalesce(approved_at, now()) else approved_at end,
              updated_by = $3::uuid,
              updated_at = now()
          from _admin_context
          where ac.ad_campaign_id = $1::uuid
          returning ac.*
        `,
        [
          assertUuid(campaignId, "campaignId"),
          dbStatus,
          assertUuid(runtime.principal.adminId, "adminId"),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Ad campaign not found.");
      return rowToAdCampaign(row);
    },
    async adReports(_input, runtime): Promise<JsonRecord> {
      const result = await queryText(
        runtime,
        "admin.adReports",
        `
          with ${adminContextCte(runtime)}
          select
            count(*) filter (where event_type = 'IMPRESSION') as impressions,
            count(*) filter (where event_type = 'CLICK') as clicks,
            count(*) filter (where event_type = 'CONVERSION') as conversions
          from public.ad_events, _admin_context
        `,
        [],
      );
      const row = result.rows[0] ?? {};
      return {
        impressions: integer(row.impressions),
        clicks: integer(row.clicks),
        conversions: integer(row.conversions),
        containsPersonalFinancialData: false,
      };
    },
    async listGrowthTasks(input, page, runtime): Promise<AdminListResult> {
      const status = optionalText(input.status)?.toUpperCase();
      const params: DbValue[] = [];
      const clauses = ["true"];
      if (status) {
        params.push(status);
        clauses.push(`gt.status = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const result = await queryText(
        runtime,
        "admin.listGrowthTasks",
        `
          with ${adminContextCte(runtime)}
          select gt.*, count(*) over() as total_count
          from public.growth_tasks gt, _admin_context
          where ${clauses.join(" and ")}
          order by gt.updated_at desc, gt.active_from desc, gt.growth_task_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, rowToGrowthTask);
    },
    async createGrowthTask(input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.createGrowthTask",
        `
          with ${adminContextCte(runtime)}
          insert into public.growth_tasks (
            type, category, title, description, content_url, exp_reward,
            active_from, active_to, status
          )
          select
            $1, $2, $3, $4, $5, $6::int,
            coalesce($7::timestamptz, now()), $8::timestamptz, $9
          from _admin_context
          returning *
        `,
        [
          text(input.type, "ROUTINE").toUpperCase(),
          text(input.category, "GENERAL"),
          text(input.title),
          text(input.description),
          optionalText(input.contentUrl),
          integer(input.xpReward),
          optionalText(input.activeFrom),
          optionalText(input.activeTo),
          text(input.status, "DRAFT").toUpperCase(),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create growth task.");
      return rowToGrowthTask(row);
    },
    async updateGrowthTask(taskId, input, runtime): Promise<JsonRecord> {
      requireReason(input, runtime);
      const result = await queryText(
        runtime,
        "admin.updateGrowthTask",
        `
          with ${adminContextCte(runtime)}
          update public.growth_tasks gt
          set
            category = coalesce(nullif($2, ''), category),
            title = coalesce(nullif($3, ''), title),
            description = coalesce(nullif($4, ''), description),
            content_url = coalesce($5, content_url),
            exp_reward = coalesce($6::int, exp_reward),
            active_to = coalesce($7::timestamptz, active_to),
            status = coalesce(nullif($8, ''), status),
            updated_at = now()
          from _admin_context
          where gt.growth_task_id = $1::uuid
          returning gt.*
        `,
        [
          assertUuid(taskId, "taskId"),
          optionalText(input.category) ?? "",
          optionalText(input.title) ?? "",
          optionalText(input.description) ?? "",
          optionalText(input.contentUrl),
          typeof input.xpReward === "number" ? integer(input.xpReward) : null,
          optionalText(input.activeTo),
          optionalText(input.status)?.toUpperCase() ?? "",
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Growth task not found.");
      return rowToGrowthTask(row);
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
    async listAuditLogs(input, page, runtime): Promise<AdminListResult> {
      const severity = optionalText(input.severity)?.toUpperCase();
      const params: DbValue[] = [];
      const clauses = ["true"];
      if (severity) {
        params.push(severity);
        clauses.push(`al.severity = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const result = await queryText(
        runtime,
        "admin.listAuditLogs",
        `
          with ${adminContextCte(runtime)}
          select al.*, count(*) over() as total_count
          from public.admin_audit_logs al, _admin_context
          where ${clauses.join(" and ")}
          order by al.created_at desc, al.admin_audit_log_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, rowToAuditLog);
    },
    async listRoleMembers(input, page, runtime): Promise<AdminListResult> {
      const status = optionalText(input.status)?.toUpperCase();
      const params: DbValue[] = [];
      const clauses = ["true"];
      if (status) {
        params.push(status);
        clauses.push(`arm.status = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const result = await queryText(
        runtime,
        "admin.listRoleMembers",
        `
          with ${adminContextCte(runtime)}
          select
            arm.admin_role_member_id,
            ar.role_key,
            arm.user_id,
            arm.status,
            arm.assigned_at,
            arm.revoked_at,
            count(*) over() as total_count
          from public.admin_role_members arm
          join public.admin_roles ar on ar.admin_role_id = arm.admin_role_id,
               _admin_context
          where ${clauses.join(" and ")}
          order by arm.assigned_at desc, arm.admin_role_member_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, rowToRoleMember);
    },
    async updateRoleMember(adminId, input, runtime): Promise<JsonRecord> {
      const reason = requireReason(input, runtime);
      const status = text(input.status, "ACTIVE").toUpperCase();
      const result = await queryText(
        runtime,
        "admin.updateRoleMember",
        `
          with ${adminContextCte(runtime)},
          updated as (
            update public.admin_role_members arm
            set status = $2,
                revoked_at = case when $2 in ('REVOKED', 'SUSPENDED') then coalesce(revoked_at, now()) else null end,
                revoked_by = case when $2 in ('REVOKED', 'SUSPENDED') then $3::uuid else null end,
                updated_at = now()
            from _admin_context
            where arm.admin_role_member_id = $1::uuid
            returning arm.*
          ),
          audit as (
            insert into public.admin_audit_logs (
              actor_user_id, actor_role_snapshot, action, target_type, target_id,
              after_data, metadata, result, severity, request_id
            )
            select $3::uuid, $4::jsonb, 'UPDATE_ROLE_MEMBER', 'ADMIN_ROLE_MEMBER', $1::uuid,
                   jsonb_build_object('status', $2),
                   jsonb_build_object('reason', $5),
                   'SUCCESS', 'WARNING', $6
            from updated
            returning admin_audit_log_id
          )
          select
            updated.admin_role_member_id,
            ar.role_key,
            updated.user_id,
            updated.status,
            updated.assigned_at,
            updated.revoked_at,
            (select admin_audit_log_id from audit) as admin_audit_log_id
          from updated
          join public.admin_roles ar on ar.admin_role_id = updated.admin_role_id
        `,
        [
          assertUuid(adminId, "adminRoleMemberId"),
          status,
          assertUuid(runtime.principal.adminId, "adminId"),
          JSON.stringify(runtime.principal.roles),
          reason,
          runtime.requestId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Admin role member not found.");
      return {
        ...rowToRoleMember(row),
        auditLogId: text(row.admin_audit_log_id),
      };
    },
  };
}
