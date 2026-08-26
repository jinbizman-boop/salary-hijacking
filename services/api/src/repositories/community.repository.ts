import type {
  CommunityBoardType,
  CommunityListResult,
  CommunityRepository,
  CommunityReportReason,
  CommunityRouteRuntime,
  JsonRecord,
  PaginationInput,
} from "../routes/community.routes";
import { CommunityHttpError } from "../routes/community.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface CommunityDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface CommunityDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type CommunityDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: CommunityDbQueryOptions<TEnv>,
) => Promise<CommunityDbQueryResult>;

export interface NeonCommunityRepositoryOptions<TEnv = unknown> {
  readonly query?: CommunityDbQuery<TEnv>;
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

const dbBoardByApiBoard = Object.freeze({
  SALARY_TALK: "salary_talk",
  BUDGET_TIP: "saving_tip",
  EXPENSE_CUT: "consumption_control",
  SAVINGS_GOAL: "saving_tip",
  LEVEL_CERTIFICATION: "level_up_proof",
  SIDE_HUSTLE: "free",
  HEALTH_ROUTINE: "hobby",
  FREE: "free",
});

const apiBoardByDbBoard = Object.freeze({
  salary_talk: "SALARY_TALK",
  saving_tip: "SAVINGS_GOAL",
  consumption_control: "EXPENSE_CUT",
  level_up_proof: "LEVEL_CERTIFICATION",
  hobby: "HEALTH_ROUTINE",
  free: "FREE",
  general: "FREE",
  notice: "FREE",
  event: "FREE",
  faq: "FREE",
});

const dbReportReasonByApiReason = Object.freeze({
  SPAM: "spam",
  ABUSE: "abuse",
  PRIVACY: "privacy_leak",
  MISINFORMATION: "misinformation",
  FINANCIAL_ADVICE_RISK: "financial_advice_risk",
  ILLEGAL: "adult_or_illegal",
  OTHER: "other",
});

const legacyBoardByApiBoard = Object.freeze({
  SALARY_TALK: "ALL",
  BUDGET_TIP: "MONEY_TIP",
  EXPENSE_CUT: "MONEY_TIP",
  SAVINGS_GOAL: "MONEY_TIP",
  LEVEL_CERTIFICATION: "LEVEL_UP_PROOF",
  SIDE_HUSTLE: "FREE",
  HEALTH_ROUTINE: "HOBBY",
  FREE: "FREE",
} satisfies Record<CommunityBoardType, string>);

const legacyBoardDefinitions: readonly JsonRecord[] = Object.freeze([
  {
    boardType: "SALARY_TALK",
    title: "월급 이야기",
    description: "월급날, 급여 계획, 지출 루틴을 공유합니다.",
    writeRequiresAuth: true,
    serverAuthority: true,
    financialRawDataExposed: false,
  },
  {
    boardType: "BUDGET_TIP",
    title: "예산 팁",
    description: "일일 예산과 고정지출 절감 방법을 공유합니다.",
    writeRequiresAuth: true,
    serverAuthority: true,
    financialRawDataExposed: false,
  },
  {
    boardType: "EXPENSE_CUT",
    title: "지출 줄이기",
    description: "변동지출 절감 챌린지와 후기를 공유합니다.",
    writeRequiresAuth: true,
    serverAuthority: true,
    financialRawDataExposed: false,
  },
  {
    boardType: "SAVINGS_GOAL",
    title: "저축 목표",
    description: "고정저축·목표 달성 과정을 공유합니다.",
    writeRequiresAuth: true,
    serverAuthority: true,
    financialRawDataExposed: false,
  },
  {
    boardType: "LEVEL_CERTIFICATION",
    title: "LV UP 인증",
    description: "자기계발·운동·독서 인증을 공유합니다.",
    writeRequiresAuth: true,
    serverAuthority: true,
    financialRawDataExposed: false,
  },
  {
    boardType: "SIDE_HUSTLE",
    title: "부업",
    description: "부업 경험과 수익 구조를 공유합니다.",
    writeRequiresAuth: true,
    serverAuthority: true,
    financialRawDataExposed: false,
  },
  {
    boardType: "HEALTH_ROUTINE",
    title: "건강 루틴",
    description: "운동·수면·식단 루틴을 공유합니다.",
    writeRequiresAuth: true,
    serverAuthority: true,
    financialRawDataExposed: false,
  },
  {
    boardType: "FREE",
    title: "자유게시판",
    description: "급여납치 사용자들의 자유 대화 공간입니다.",
    writeRequiresAuth: true,
    serverAuthority: true,
    financialRawDataExposed: false,
  },
]);

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonCommunityRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for community repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: CommunityDbQueryOptions<TEnv>,
): Promise<CommunityDbQueryResult> {
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
    throw new Error(`${field} must be a UUID for DB-backed community.`);
  }
  return value;
}

function requireUserId<TEnv>(runtime: CommunityRouteRuntime<TEnv>): string {
  const userId = runtime.principal.userId;
  if (!userId) throw new Error("Authentication is required for community DB.");
  return assertUuid(userId, "principal.userId");
}

function isAdmin<TEnv>(runtime: CommunityRouteRuntime<TEnv>): boolean {
  return (
    runtime.principal.roles.some(
      (role) =>
        role === "OPERATOR" || role === "ADMIN" || role === "SUPER_ADMIN",
    ) ||
    runtime.principal.permissions.includes("*") ||
    runtime.principal.permissions.includes("community:moderate")
  );
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

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date(0).toISOString();
}

function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function tagsFromMetadata(value: unknown): readonly string[] {
  const metadata =
    typeof value === "string" ? safeJsonRecord(value) : jsonRecord(value);
  const tags = metadata.tags;
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function safeJsonRecord(value: string): JsonRecord {
  try {
    return jsonRecord(JSON.parse(value) as unknown);
  } catch {
    return {};
  }
}

function dbBoardFromApi(value: CommunityBoardType): string {
  return dbBoardByApiBoard[value];
}

function legacyDbBoardFromApi(value: CommunityBoardType): string {
  return legacyBoardByApiBoard[value];
}

function optionalDbBoardFromApi(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return (
    dbBoardByApiBoard[normalized as keyof typeof dbBoardByApiBoard] ?? null
  );
}

function optionalLegacyDbBoardFromApi(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return (
    legacyBoardByApiBoard[normalized as keyof typeof legacyBoardByApiBoard] ??
    null
  );
}

function apiBoardFromDb(value: unknown): CommunityBoardType {
  const normalized = String(value ?? "free").toLowerCase();
  if (normalized === "level_up_proof") return "LEVEL_CERTIFICATION";
  if (normalized === "money_tip") return "BUDGET_TIP";
  if (normalized === "question") return "FREE";
  if (normalized === "notice_discussion") return "SALARY_TALK";
  if (normalized === "all") return "SALARY_TALK";
  return (
    apiBoardByDbBoard[normalized as keyof typeof apiBoardByDbBoard] ?? "FREE"
  );
}

function postStatusFromDb(value: unknown): string {
  const status = String(value ?? "published").toLowerCase();
  if (status === "deleted" || status === "archived") return "DELETED";
  if (status === "pending_review" || status === "draft")
    return "PENDING_REVIEW";
  if (status === "hidden" || status === "reported" || status === "blocked")
    return "HIDDEN";
  return "VISIBLE";
}

function postStatusToDb(status: string | null): string | null {
  if (!status) return null;
  if (status === "DELETED") return "deleted";
  if (status === "HIDDEN") return "hidden";
  if (status === "PENDING_REVIEW") return "pending_review";
  return "published";
}

function legacyPostStatusToDb(status: string | null): string | null {
  if (!status) return null;
  if (status === "DELETED") return "DELETED";
  if (status === "HIDDEN" || status === "PENDING_REVIEW") return "HIDDEN";
  return "PUBLISHED";
}

function commentStatusFromDb(value: unknown): string {
  const status = String(value ?? "published").toLowerCase();
  if (status === "deleted") return "DELETED";
  if (status === "hidden" || status === "reported" || status === "blocked")
    return "HIDDEN";
  return "VISIBLE";
}

function dbCommentStatusFromApi(value: string | null): string | null {
  if (!value) return null;
  if (value === "DELETED") return "deleted";
  if (value === "HIDDEN") return "hidden";
  return "published";
}

function legacyDbCommentStatusFromApi(value: string | null): string | null {
  if (!value) return null;
  if (value === "DELETED") return "DELETED";
  if (value === "HIDDEN") return "HIDDEN";
  return "ACTIVE";
}

function reportReasonFromApi(value: CommunityReportReason): string {
  return dbReportReasonByApiReason[value] ?? "other";
}

function legacyReportReasonFromApi(value: CommunityReportReason): string {
  if (value === "PRIVACY") return "PRIVACY_LEAK";
  if (value === "FINANCIAL_ADVICE_RISK") return "FINANCIAL_RISK";
  return value;
}

function idempotencyKey<TEnv>(
  runtime: CommunityRouteRuntime<TEnv>,
  prefix: string,
): string {
  const direct =
    runtime.request.headers.get("x-idempotency-key")?.trim() ??
    runtime.request.headers.get("idempotency-key")?.trim();
  if (direct && direct.length >= 8) return direct.slice(0, 256);
  return `${prefix}-${runtime.requestId}`.slice(0, 256);
}

function anonymousKey(userId: string): string {
  return `anon-${userId.replace(/-/g, "").slice(0, 24)}`;
}

function authorDisplayName(userId: string, anonymous: boolean): string {
  if (anonymous) return "익명 사용자";
  return `사용자 ${userId.slice(0, 8)}`;
}

function privacyFlags(): JsonRecord {
  return {
    serverAuthority: true,
    financialRawDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function rowToPost(row: DbRow): JsonRecord {
  return {
    postId: String(row.post_id ?? ""),
    boardType: apiBoardFromDb(row.board_type ?? row.type),
    title: String(row.title ?? ""),
    content: String(row.body ?? row.content ?? ""),
    tags: tagsFromMetadata(row.metadata).join(","),
    authorMasked:
      toText(row.author_masked) ??
      toText(row.author_display_name_snapshot) ??
      (row.is_anonymous ? "익명 사용자" : "사용자"),
    anonymous: Boolean(row.is_anonymous ?? row.anonymous),
    status: postStatusFromDb(row.status),
    likeCount: toNumber(row.like_count),
    commentCount: toNumber(row.comment_count),
    reportCount: toNumber(row.report_count),
    viewCount: toNumber(row.view_count),
    bookmarkCount: toNumber(row.bookmark_count),
    shareCount: toNumber(row.share_count),
    createdAt: toIso(row.created_at ?? row.published_at),
    updatedAt: toIso(row.updated_at ?? row.created_at ?? row.published_at),
    ...privacyFlags(),
  };
}

function rowToComment(row: DbRow): JsonRecord {
  return {
    commentId: String(row.comment_id ?? ""),
    postId: String(row.post_id ?? ""),
    parentCommentId: row.parent_comment_id
      ? String(row.parent_comment_id)
      : null,
    authorMasked:
      toText(row.author_masked) ??
      toText(row.author_display_name_snapshot) ??
      (row.is_anonymous ? "익명 사용자" : "사용자"),
    anonymous: Boolean(row.is_anonymous ?? row.anonymous),
    content: String(row.body ?? row.content ?? ""),
    status: commentStatusFromDb(row.status),
    likeCount: toNumber(row.like_count),
    reportCount: toNumber(row.report_count),
    createdAt: toIso(row.created_at ?? row.published_at),
    updatedAt: toIso(row.updated_at ?? row.created_at ?? row.published_at),
    ...privacyFlags(),
  };
}

function rowToReport(row: DbRow): JsonRecord {
  return {
    reportId: String(row.report_id ?? ""),
    targetType: String(row.target_type ?? "").toUpperCase(),
    targetId: String(row.target_id ?? ""),
    reasonType: String(row.reason ?? row.reason_code ?? "other").toUpperCase(),
    reason: toText(row.detail) ?? "",
    status: String(row.status ?? "open").toUpperCase(),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at ?? row.created_at),
    ...privacyFlags(),
  };
}

interface PostCursor {
  readonly pinnedAt: string | null;
  readonly publishedAt: string;
  readonly postId: string;
}

interface CommentCursor {
  readonly publishedAt: string;
  readonly commentId: string;
}

function encodeCursor(value: PostCursor | CommentCursor): string {
  return btoa(JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeCursor(value: string): JsonRecord {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const parsed = JSON.parse(atob(padded)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("invalid cursor");
    return parsed as JsonRecord;
  } catch {
    throw new Error("COMMUNITY_CURSOR_INVALID");
  }
}

function decodePostCursor(value: string): PostCursor {
  const parsed = decodeCursor(value);
  const pinnedAt =
    typeof parsed.pinnedAt === "string" &&
    !Number.isNaN(Date.parse(parsed.pinnedAt))
      ? new Date(parsed.pinnedAt).toISOString()
      : null;
  if (
    typeof parsed.publishedAt !== "string" ||
    Number.isNaN(Date.parse(parsed.publishedAt)) ||
    typeof parsed.postId !== "string" ||
    !uuidPattern.test(parsed.postId)
  )
    throw new Error("COMMUNITY_CURSOR_INVALID");
  return {
    pinnedAt,
    publishedAt: new Date(parsed.publishedAt).toISOString(),
    postId: parsed.postId,
  };
}

function decodeCommentCursor(value: string): CommentCursor {
  const parsed = decodeCursor(value);
  if (
    typeof parsed.publishedAt !== "string" ||
    Number.isNaN(Date.parse(parsed.publishedAt)) ||
    typeof parsed.commentId !== "string" ||
    !uuidPattern.test(parsed.commentId)
  )
    throw new Error("COMMUNITY_CURSOR_INVALID");
  return {
    publishedAt: new Date(parsed.publishedAt).toISOString(),
    commentId: parsed.commentId,
  };
}

function listResult<TItem extends JsonRecord>(
  rows: readonly DbRow[],
  page: PaginationInput,
  mapper: (row: DbRow) => TItem,
): CommunityListResult<TItem> {
  const limitedRows = rows.slice(0, page.limit);
  const mapped = limitedRows.map(mapper);
  return {
    items: mapped,
    page: page.page,
    pageSize: page.pageSize,
    total:
      rows.length && rows[0]?.total_count !== undefined
        ? toNumber(rows[0]?.total_count)
        : mapped.length,
    cursor: page.cursor ?? null,
    hasMore: rows.length > page.limit,
    limit: page.limit,
  };
}

function postListResult<TItem extends JsonRecord>(
  rows: readonly DbRow[],
  page: PaginationInput,
  mapper: (row: DbRow) => TItem,
): CommunityListResult<TItem> {
  const base = listResult(rows, page, mapper);
  const last = rows.slice(0, page.limit).at(-1);
  return {
    ...base,
    nextCursor:
      rows.length > page.limit && last
        ? encodeCursor({
            pinnedAt: toIsoOrNull(last.pinned_at),
            publishedAt: toIso(last.published_at ?? last.created_at),
            postId: String(last.post_id ?? ""),
          })
        : null,
  };
}

function commentListResult<TItem extends JsonRecord>(
  rows: readonly DbRow[],
  page: PaginationInput,
  mapper: (row: DbRow) => TItem,
): CommunityListResult<TItem> {
  const base = listResult(rows, page, mapper);
  const last = rows.slice(0, page.limit).at(-1);
  return {
    ...base,
    nextCursor:
      rows.length > page.limit && last
        ? encodeCursor({
            publishedAt: toIso(last.published_at ?? last.created_at),
            commentId: String(last.comment_id ?? ""),
          })
        : null,
  };
}

function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toIso(value);
}

function queryText<TEnv>(
  repositoryQuery: CommunityDbQuery<TEnv>,
  runtime: CommunityRouteRuntime<TEnv>,
  operationName: string,
  sqlText: string,
  params: readonly DbValue[],
): Promise<CommunityDbQueryResult> {
  return repositoryQuery(sqlText, params, {
    operationName,
    env: runtime.env,
  });
}

interface CommunityPhysicalSchema {
  readonly canonicalBoards: boolean;
  readonly canonicalPostAuthor: boolean;
}

let communityPhysicalSchemaPromise:
  | Promise<CommunityPhysicalSchema>
  | undefined;

async function physicalSchema<TEnv>(
  repositoryQuery: CommunityDbQuery<TEnv>,
  runtime: CommunityRouteRuntime<TEnv>,
): Promise<CommunityPhysicalSchema> {
  if (envText(runtime.env, "APP_ENV") === "test")
    return { canonicalBoards: true, canonicalPostAuthor: true };
  communityPhysicalSchemaPromise ??= queryText(
    repositoryQuery,
    runtime,
    "community.physicalSchema",
    `
      select
        to_regclass('public.community_boards') is not null as canonical_boards,
        exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'community_posts'
            and column_name = 'author_id'
        ) as canonical_post_author
    `,
    [],
  ).then((result) => ({
    canonicalBoards: Boolean(result.rows[0]?.canonical_boards),
    canonicalPostAuthor: Boolean(result.rows[0]?.canonical_post_author),
  }));
  return communityPhysicalSchemaPromise;
}

async function usesLegacyCommunitySchema<TEnv>(
  repositoryQuery: CommunityDbQuery<TEnv>,
  runtime: CommunityRouteRuntime<TEnv>,
): Promise<boolean> {
  const schema = await physicalSchema(repositoryQuery, runtime);
  return !schema.canonicalBoards || !schema.canonicalPostAuthor;
}

function ownerGuardParams<TEnv>(
  runtime: CommunityRouteRuntime<TEnv>,
): readonly [string, boolean] {
  return [requireUserId(runtime), isAdmin(runtime)];
}

function searchText(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? `%${value.trim().slice(0, 120)}%`
    : null;
}

export function createNeonCommunityRepository<TEnv = unknown>(
  options: NeonCommunityRepositoryOptions<TEnv> = {},
): CommunityRepository<TEnv> {
  const repositoryQuery = options.query ?? defaultQuery<TEnv>;

  return {
    name: "neon-community-repository",
    async listBoards(runtime) {
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime))
        return legacyBoardDefinitions;
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.listBoards",
        `
          select
            board_id,
            type as board_type,
            name_ko,
            description_ko,
            allow_anonymous,
            allow_questions,
            allow_attachments,
            sort_order
          from public.community_boards
          where is_active = true
          order by sort_order asc, board_id asc
        `,
        [],
      );
      return result.rows.map((row) => ({
        boardId: String(row.board_id ?? ""),
        boardType: apiBoardFromDb(row.board_type),
        title: String(row.name_ko ?? ""),
        description: String(row.description_ko ?? ""),
        writeRequiresAuth: true,
        allowAnonymous: Boolean(row.allow_anonymous),
        allowQuestions: Boolean(row.allow_questions),
        allowAttachments: Boolean(row.allow_attachments),
        serverAuthority: true,
        financialRawDataExposed: false,
      }));
    },
    async listPosts(input, page, runtime) {
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const params: DbValue[] = [];
        const clauses = ["status <> 'DELETED'"];
        const board = optionalLegacyDbBoardFromApi(input.boardType);
        if (board) {
          params.push(board);
          clauses.push(`board_type = $${params.length}`);
        }
        const q = searchText(input.q);
        if (q) {
          params.push(q);
          clauses.push(
            `(title ilike $${params.length} or body ilike $${params.length})`,
          );
        }
        const cursor = page.cursor ? decodePostCursor(page.cursor) : null;
        if (cursor) {
          params.push(cursor.publishedAt, cursor.postId);
          clauses.push(
            `(created_at, post_id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
          );
        }
        const useKeyset = page.mode === "cursor" || cursor !== null;
        params.push(page.limit + 1);
        if (!useKeyset) params.push(page.offset);
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.listPosts.legacy",
          useKeyset
            ? `
          select *, board_type, created_at as published_at
          from public.community_posts
          where ${clauses.join(" and ")}
          order by created_at desc, post_id desc
          limit $${params.length}::int
        `
            : `
          select *, board_type, created_at as published_at, count(*) over() as total_count
          from public.community_posts
          where ${clauses.join(" and ")}
          order by created_at desc, post_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
          params,
        );
        return postListResult(result.rows, page, rowToPost);
      }
      const params: DbValue[] = [];
      const clauses = [
        "p.status <> 'deleted'",
        "p.visibility in ('public', 'members_only')",
      ];
      const board = optionalDbBoardFromApi(input.boardType);
      if (board) {
        params.push(board);
        clauses.push(`b.type = $${params.length}`);
      }
      const q = searchText(input.q);
      if (q) {
        params.push(q);
        clauses.push(
          `(p.title ilike $${params.length} or p.body ilike $${params.length})`,
        );
      }
      const cursor = page.cursor ? decodePostCursor(page.cursor) : null;
      if (cursor) {
        params.push(cursor.pinnedAt, cursor.publishedAt, cursor.postId);
        const pinnedParam = params.length - 2;
        const publishedParam = params.length - 1;
        const postParam = params.length;
        clauses.push(`(
          ($${pinnedParam}::timestamptz is null and p.pinned_at is null and (p.published_at, p.post_id) < ($${publishedParam}::timestamptz, $${postParam}::uuid))
          or
          ($${pinnedParam}::timestamptz is not null and (
            p.pinned_at is null
            or p.pinned_at < $${pinnedParam}::timestamptz
            or (p.pinned_at = $${pinnedParam}::timestamptz and (p.published_at, p.post_id) < ($${publishedParam}::timestamptz, $${postParam}::uuid))
          ))
        )`);
      }
      const useKeyset = page.mode === "cursor" || cursor !== null;
      params.push(page.limit + 1);
      if (!useKeyset) params.push(page.offset);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.listPosts",
        useKeyset
          ? `
          select
            p.*,
            b.type as board_type
          from public.community_posts p
          join public.community_boards b on b.board_id = p.board_id
          where ${clauses.join(" and ")}
          order by p.pinned_at desc nulls last, p.published_at desc, p.post_id desc
          limit $${params.length}::int
        `
          : `
          select
            p.*,
            b.type as board_type,
            count(*) over() as total_count
          from public.community_posts p
          join public.community_boards b on b.board_id = p.board_id
          where ${clauses.join(" and ")}
          order by p.pinned_at desc nulls last, p.published_at desc, p.post_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return postListResult(result.rows, page, rowToPost);
    },
    async getPost(postId, runtime) {
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.getPost.legacy",
          `
            update public.community_posts
            set view_count = view_count + 1,
                updated_at = updated_at
            where post_id = $1::uuid
              and status <> 'DELETED'
            returning *, board_type, created_at as published_at
          `,
          [assertUuid(postId, "postId")],
        );
        return result.rows[0] ? rowToPost(result.rows[0]) : null;
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.getPost",
        `
          update public.community_posts p
          set view_count = p.view_count + 1,
              updated_at = p.updated_at
          from public.community_boards b
          where p.post_id = $1::uuid
            and b.board_id = p.board_id
            and p.status <> 'deleted'
          returning p.*, b.type as board_type
        `,
        [assertUuid(postId, "postId")],
      );
      return result.rows[0] ? rowToPost(result.rows[0]) : null;
    },
    async createPost(input, runtime) {
      const userId = requireUserId(runtime);
      const anonymous = input.anonymous;
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.createPost.legacy",
          `
            insert into public.community_posts (
              user_id,
              board_type,
              title,
              body,
              is_anonymous,
              is_question,
              is_pinned,
              status
            )
            values (
              $1::uuid,
              $2,
              $3,
              $4,
              $5::boolean,
              false,
              false,
              $6
            )
            returning *, board_type, created_at as published_at
          `,
          [
            userId,
            legacyDbBoardFromApi(input.boardType),
            input.title,
            input.content,
            anonymous,
            legacyPostStatusToDb(input.moderationStatus ?? "VISIBLE"),
          ],
        );
        const row = result.rows[0];
        if (!row)
          throw new CommunityHttpError(
            500,
            "COMMUNITY_CREATE_FAILED",
            "게시글을 생성하지 못했습니다.",
          );
        return rowToPost(row);
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.createPost",
        `
          with selected_board as (
            select board_id
            from public.community_boards
            where type = $2
              and is_active = true
            limit 1
          )
          insert into public.community_posts (
            board_id,
            author_id,
            author_display_name_snapshot,
            anonymous_author_key,
            is_anonymous,
            is_question,
            is_answered,
            title,
            body,
            body_plain_text_hash,
            status,
            visibility,
            idempotency_key,
            metadata,
            request_id,
            created_by,
            updated_by
          )
          select
            board_id,
            $1::uuid,
            $3,
            $4,
            $5::boolean,
            false,
            false,
            $6,
            $7,
            null,
            $11,
            'members_only',
            $8,
            jsonb_build_object('tags', $9::text[]),
            $10,
            $1::uuid,
            $1::uuid
          from selected_board
          on conflict (author_id, idempotency_key)
          do update set idempotency_key = excluded.idempotency_key
          returning *, $2 as board_type
        `,
        [
          userId,
          dbBoardFromApi(input.boardType),
          authorDisplayName(userId, anonymous),
          anonymous ? anonymousKey(userId) : null,
          anonymous,
          input.title,
          input.content,
          idempotencyKey(runtime, "post"),
          input.tags,
          runtime.requestId,
          postStatusToDb(input.moderationStatus ?? "VISIBLE"),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create community post.");
      return rowToPost(row);
    },
    async updatePost(postId, input, runtime) {
      const [userId, admin] = ownerGuardParams(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.updatePost.legacy",
          `
            update public.community_posts
            set board_type = coalesce($4, board_type),
                title = coalesce($5, title),
                body = coalesce($6, body),
                is_anonymous = coalesce($7::boolean, is_anonymous),
                status = coalesce($8, status),
                updated_at = now()
            where post_id = $1::uuid
              and ($3::boolean or user_id = $2::uuid)
              and status <> 'DELETED'
            returning *, board_type, created_at as published_at
          `,
          [
            assertUuid(postId, "postId"),
            userId,
            admin,
            input.boardType === undefined
              ? null
              : legacyDbBoardFromApi(input.boardType),
            input.title ?? null,
            input.content ?? null,
            input.anonymous ?? null,
            input.moderationStatus === undefined
              ? null
              : legacyPostStatusToDb(input.moderationStatus),
          ],
        );
        const row = result.rows[0];
        if (!row)
          throw new CommunityHttpError(
            404,
            "COMMUNITY_POST_NOT_FOUND",
            "게시글을 찾을 수 없습니다.",
          );
        return rowToPost(row);
      }
      const dbBoard =
        input.boardType === undefined ? null : dbBoardFromApi(input.boardType);
      const tags = input.tags === undefined ? null : input.tags;
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.updatePost",
        `
          update public.community_posts p
          set board_id = coalesce(
                (select board_id from public.community_boards where type = $4 and is_active = true limit 1),
                p.board_id
              ),
              title = coalesce($5, p.title),
              body = coalesce($6, p.body),
              is_anonymous = coalesce($7::boolean, p.is_anonymous),
              anonymous_author_key = case
                when $7::boolean is null then p.anonymous_author_key
                when $7::boolean then $8
                else null
              end,
              author_display_name_snapshot = case
                when $7::boolean is null then p.author_display_name_snapshot
                else $9
              end,
              metadata = case
                when $10::text[] is null then p.metadata
                else jsonb_set(coalesce(p.metadata, '{}'::jsonb), '{tags}', to_jsonb($10::text[]), true)
              end,
              status = case
                when p.status = 'deleted' then p.status
                else coalesce($12, 'published')
              end,
              request_id = $11,
              updated_by = $2::uuid,
              updated_at = now()
          from public.community_boards b
          where p.post_id = $1::uuid
            and b.board_id = p.board_id
            and ($3::boolean or p.author_id = $2::uuid)
            and p.status <> 'deleted'
          returning p.*, coalesce($4, b.type) as board_type
        `,
        [
          assertUuid(postId, "postId"),
          userId,
          admin,
          dbBoard,
          input.title ?? null,
          input.content ?? null,
          input.anonymous ?? null,
          input.anonymous ? anonymousKey(userId) : null,
          input.anonymous === undefined
            ? null
            : authorDisplayName(userId, input.anonymous),
          tags,
          runtime.requestId,
          input.moderationStatus === undefined
            ? null
            : postStatusToDb(input.moderationStatus),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Community post not found.");
      return rowToPost(row);
    },
    async deletePost(postId, runtime) {
      const [userId, admin] = ownerGuardParams(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.deletePost.legacy",
          `
            update public.community_posts
            set status = 'DELETED',
                deleted_at = coalesce(deleted_at, now()),
                updated_at = now()
            where post_id = $1::uuid
              and ($3::boolean or user_id = $2::uuid)
              and status <> 'DELETED'
            returning post_id
          `,
          [assertUuid(postId, "postId"), userId, admin],
        );
        if (!result.rows[0])
          throw new CommunityHttpError(
            404,
            "COMMUNITY_POST_NOT_FOUND",
            "게시글을 찾을 수 없습니다.",
          );
        return { postId, status: "DELETED", ...privacyFlags() };
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.deletePost",
        `
          update public.community_posts
          set status = 'deleted',
              deleted_at = coalesce(deleted_at, now()),
              request_id = $4,
              updated_by = $2::uuid,
              updated_at = now()
          where post_id = $1::uuid
            and ($3::boolean or author_id = $2::uuid)
            and status <> 'deleted'
          returning post_id
        `,
        [assertUuid(postId, "postId"), userId, admin, runtime.requestId],
      );
      if (!result.rows[0]) throw new Error("Community post not found.");
      return { postId, status: "DELETED", ...privacyFlags() };
    },
    async setPostReaction(postId, liked, runtime) {
      const userId = requireUserId(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.setPostReaction.legacy",
          liked
            ? `
            with inserted as (
              insert into public.community_reactions (
                target_type,
                target_id,
                user_id,
                reaction_type
              )
              values ('POST', $1::uuid, $2::uuid, 'LIKE')
              on conflict (user_id, target_type, target_id, reaction_type) do nothing
              returning 1
            ),
            updated_post as (
              update public.community_posts
              set like_count = like_count + (select count(*)::int from inserted),
                  updated_at = now()
              where post_id = $1::uuid
                and status <> 'DELETED'
              returning like_count
            )
            select like_count from updated_post
          `
            : `
            with deleted as (
              delete from public.community_reactions
              where target_type = 'POST'
                and target_id = $1::uuid
                and user_id = $2::uuid
                and reaction_type = 'LIKE'
              returning 1
            ),
            updated_post as (
              update public.community_posts
              set like_count = greatest(like_count - (select count(*)::int from deleted), 0),
                  updated_at = now()
              where post_id = $1::uuid
                and status <> 'DELETED'
              returning like_count
            )
            select like_count from updated_post
          `,
          [assertUuid(postId, "postId"), userId],
        );
        return {
          postId,
          state: liked ? "LIKED" : "UNLIKED",
          likeCount: toNumber(result.rows[0]?.like_count),
          ...privacyFlags(),
        };
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.setPostReaction",
        liked
          ? `
            with inserted as (
              insert into public.community_reactions (
                target_type,
                target_id,
                user_id,
                reaction_type,
                request_id,
                created_by,
                updated_by
              )
              values ('POST', $1::uuid, $2::uuid, 'LIKE', $3, $2::uuid, $2::uuid)
              on conflict (target_type, target_id, user_id, reaction_type) do nothing
              returning 1
            ),
            updated_post as (
              update public.community_posts
              set like_count = like_count + (select count(*)::int from inserted),
                  updated_at = now()
              where post_id = $1::uuid
              returning like_count
            )
            select like_count from updated_post
          `
          : `
            with deleted as (
              delete from public.community_reactions
              where target_type = 'POST'
                and target_id = $1::uuid
                and user_id = $2::uuid
                and reaction_type = 'LIKE'
              returning 1
            ),
            updated_post as (
              update public.community_posts
              set like_count = greatest(like_count - (select count(*)::int from deleted), 0),
                  updated_at = now()
              where post_id = $1::uuid
              returning like_count
            )
            select like_count from updated_post
          `,
        [assertUuid(postId, "postId"), userId, runtime.requestId],
      );
      return {
        postId,
        state: liked ? "LIKED" : "UNLIKED",
        likeCount: toNumber(result.rows[0]?.like_count),
        ...privacyFlags(),
      };
    },
    async setCommentReaction(commentId, liked, runtime) {
      const userId = requireUserId(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.setCommentReaction.legacy",
          liked
            ? `
            with inserted as (
              insert into public.community_reactions (
                target_type,
                target_id,
                user_id,
                reaction_type
              )
              values ('COMMENT', $1::uuid, $2::uuid, 'LIKE')
              on conflict (user_id, target_type, target_id, reaction_type) do nothing
              returning 1
            ),
            updated_comment as (
              update public.community_comments
              set like_count = like_count + (select count(*)::int from inserted),
                  updated_at = now()
              where comment_id = $1::uuid
                and status <> 'DELETED'
              returning like_count
            )
            select like_count from updated_comment
          `
            : `
            with deleted as (
              delete from public.community_reactions
              where target_type = 'COMMENT'
                and target_id = $1::uuid
                and user_id = $2::uuid
                and reaction_type = 'LIKE'
              returning 1
            ),
            updated_comment as (
              update public.community_comments
              set like_count = greatest(like_count - (select count(*)::int from deleted), 0),
                  updated_at = now()
              where comment_id = $1::uuid
                and status <> 'DELETED'
              returning like_count
            )
            select like_count from updated_comment
          `,
          [assertUuid(commentId, "commentId"), userId],
        );
        return {
          commentId,
          state: liked ? "LIKED" : "UNLIKED",
          likeCount: toNumber(result.rows[0]?.like_count),
          ...privacyFlags(),
        };
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.setCommentReaction",
        liked
          ? `
            with inserted as (
              insert into public.community_reactions (
                target_type,
                target_id,
                user_id,
                reaction_type,
                request_id,
                created_by,
                updated_by
              )
              values ('COMMENT', $1::uuid, $2::uuid, 'LIKE', $3, $2::uuid, $2::uuid)
              on conflict (target_type, target_id, user_id, reaction_type) do nothing
              returning 1
            ),
            updated_comment as (
              update public.community_comments
              set like_count = like_count + (select count(*)::int from inserted),
                  updated_at = now()
              where comment_id = $1::uuid
                and status <> 'deleted'
              returning like_count
            )
            select like_count from updated_comment
          `
          : `
            with deleted as (
              delete from public.community_reactions
              where target_type = 'COMMENT'
                and target_id = $1::uuid
                and user_id = $2::uuid
                and reaction_type = 'LIKE'
              returning 1
            ),
            updated_comment as (
              update public.community_comments
              set like_count = greatest(like_count - (select count(*)::int from deleted), 0),
                  updated_at = now()
              where comment_id = $1::uuid
                and status <> 'deleted'
              returning like_count
            )
            select like_count from updated_comment
          `,
        [assertUuid(commentId, "commentId"), userId, runtime.requestId],
      );
      return {
        commentId,
        state: liked ? "LIKED" : "UNLIKED",
        likeCount: toNumber(result.rows[0]?.like_count),
        ...privacyFlags(),
      };
    },
    async setPostBookmark(postId, bookmarked, runtime) {
      const userId = requireUserId(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.setPostBookmark.legacy",
          bookmarked
            ? `
            insert into public.community_reactions (
              target_type,
              target_id,
              user_id,
              reaction_type
            )
            values ('POST', $1::uuid, $2::uuid, 'BOOKMARK')
            on conflict (user_id, target_type, target_id, reaction_type) do nothing
            returning 1
          `
            : `
            delete from public.community_reactions
            where target_type = 'POST'
              and target_id = $1::uuid
              and user_id = $2::uuid
              and reaction_type = 'BOOKMARK'
            returning 1
          `,
          [assertUuid(postId, "postId"), userId],
        );
        return {
          postId,
          state: bookmarked ? "BOOKMARKED" : "UNBOOKMARKED",
          bookmarkCount: result.rowCount ?? result.rows.length,
          ...privacyFlags(),
        };
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.setPostBookmark",
        bookmarked
          ? `
            with inserted as (
              insert into public.community_reactions (
                target_type,
                target_id,
                user_id,
                reaction_type,
                request_id,
                created_by,
                updated_by
              )
              values ('POST', $1::uuid, $2::uuid, 'BOOKMARK', $3, $2::uuid, $2::uuid)
              on conflict (target_type, target_id, user_id, reaction_type) do nothing
              returning 1
            )
            select count(*)::int as bookmark_count
            from public.community_reactions
            where target_type = 'POST'
              and target_id = $1::uuid
              and reaction_type = 'BOOKMARK'
          `
          : `
            with deleted as (
              delete from public.community_reactions
              where target_type = 'POST'
                and target_id = $1::uuid
                and user_id = $2::uuid
                and reaction_type = 'BOOKMARK'
              returning 1
            )
            select count(*)::int as bookmark_count
            from public.community_reactions
            where target_type = 'POST'
              and target_id = $1::uuid
              and reaction_type = 'BOOKMARK'
          `,
        [assertUuid(postId, "postId"), userId, runtime.requestId],
      );
      return {
        postId,
        state: bookmarked ? "BOOKMARKED" : "UNBOOKMARKED",
        bookmarkCount: toNumber(result.rows[0]?.bookmark_count),
        ...privacyFlags(),
      };
    },
    async recordPostShare(postId, channel, runtime) {
      const userId = requireUserId(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.recordPostShare.legacy",
          `
          with inserted as (
            insert into public.community_reactions (
              target_type,
              target_id,
              user_id,
              reaction_type
            )
            values ('POST', $1::uuid, $2::uuid, 'SHARE')
            on conflict (user_id, target_type, target_id, reaction_type) do nothing
            returning 1
          ),
          updated_post as (
            update public.community_posts
            set share_count = share_count + (select count(*)::int from inserted),
                updated_at = now()
            where post_id = $1::uuid
              and status <> 'DELETED'
            returning share_count
          )
          select share_count from updated_post
        `,
          [assertUuid(postId, "postId"), userId],
        );
        return {
          postId,
          channel,
          shareCount: toNumber(result.rows[0]?.share_count),
          ...privacyFlags(),
        };
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.recordPostShare",
        `
          with inserted as (
            insert into public.community_reactions (
              target_type,
              target_id,
              user_id,
              reaction_type,
              request_id,
              created_by,
              updated_by
            )
            values ('POST', $1::uuid, $2::uuid, 'SHARE', $3, $2::uuid, $2::uuid)
            on conflict (target_type, target_id, user_id, reaction_type) do nothing
            returning 1
          ),
          updated_post as (
            update public.community_posts
            set share_count = share_count + (select count(*)::int from inserted),
                updated_at = now()
            where post_id = $1::uuid
            returning share_count
          )
          select share_count from updated_post
        `,
        [assertUuid(postId, "postId"), userId, runtime.requestId],
      );
      return {
        postId,
        channel,
        shareCount: toNumber(result.rows[0]?.share_count),
        ...privacyFlags(),
      };
    },
    async listComments(postId, page, runtime) {
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const params: DbValue[] = [assertUuid(postId, "postId")];
        const clauses = ["post_id = $1::uuid", "status <> 'DELETED'"];
        const cursor = page.cursor ? decodeCommentCursor(page.cursor) : null;
        if (cursor) {
          params.push(cursor.publishedAt, cursor.commentId);
          clauses.push(
            `(created_at, comment_id) > ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
          );
        }
        const useKeyset = page.mode === "cursor" || cursor !== null;
        params.push(page.limit + 1);
        if (!useKeyset) params.push(page.offset);
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.listComments.legacy",
          useKeyset
            ? `
          select *, created_at as published_at
          from public.community_comments
          where ${clauses.join(" and ")}
          order by created_at asc, comment_id asc
          limit $${params.length}::int
        `
            : `
          select *, created_at as published_at, count(*) over() as total_count
          from public.community_comments
          where ${clauses.join(" and ")}
          order by created_at asc, comment_id asc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
          params,
        );
        return commentListResult(result.rows, page, rowToComment);
      }
      const params: DbValue[] = [assertUuid(postId, "postId")];
      const clauses = ["post_id = $1::uuid", "status <> 'deleted'"];
      const cursor = page.cursor ? decodeCommentCursor(page.cursor) : null;
      if (cursor) {
        params.push(cursor.publishedAt, cursor.commentId);
        clauses.push(
          `(published_at, comment_id) > ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
        );
      }
      const useKeyset = page.mode === "cursor" || cursor !== null;
      params.push(page.limit + 1);
      if (!useKeyset) params.push(page.offset);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.listComments",
        useKeyset
          ? `
          select *
          from public.community_comments
          where ${clauses.join(" and ")}
          order by published_at asc, comment_id asc
          limit $${params.length}::int
        `
          : `
          select *, count(*) over() as total_count
          from public.community_comments
          where ${clauses.join(" and ")}
          order by published_at asc, comment_id asc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return commentListResult(result.rows, page, rowToComment);
    },
    async createComment(postId, input, runtime) {
      const userId = requireUserId(runtime);
      const anonymous = input.anonymous;
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.createComment.legacy",
          `
          with inserted as (
            insert into public.community_comments (
              post_id,
              user_id,
              parent_comment_id,
              body,
              is_anonymous,
              status
            )
            values (
              $1::uuid,
              $2::uuid,
              null,
              $3,
              $4::boolean,
              'ACTIVE'
            )
            returning *, created_at as published_at
          ),
          updated_post as (
            update public.community_posts
            set comment_count = comment_count + 1,
                updated_at = now()
            where post_id = $1::uuid
              and exists (select 1 from inserted)
          )
          select * from inserted
        `,
          [assertUuid(postId, "postId"), userId, input.content, anonymous],
        );
        const row = result.rows[0];
        if (!row)
          throw new CommunityHttpError(
            500,
            "COMMUNITY_COMMENT_CREATE_FAILED",
            "댓글을 생성하지 못했습니다.",
          );
        return rowToComment(row);
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.createComment",
        `
          with inserted as (
            insert into public.community_comments (
              post_id,
              parent_comment_id,
              author_id,
              anonymous_author_key,
              is_anonymous,
              body,
              body_plain_text_hash,
              status,
              idempotency_key,
              metadata,
              request_id,
              created_by,
              updated_by
            )
            values (
              $1::uuid,
              null,
              $2::uuid,
              $3,
              $4::boolean,
              $5,
              null,
              'published',
              $6,
              '{}'::jsonb,
              $7,
              $2::uuid,
              $2::uuid
            )
            on conflict (author_id, idempotency_key)
            do update set idempotency_key = excluded.idempotency_key
            returning *
          ),
          updated_post as (
            update public.community_posts
            set comment_count = comment_count + 1,
                updated_at = now()
            where post_id = $1::uuid
              and exists (select 1 from inserted)
          )
          select * from inserted
        `,
        [
          assertUuid(postId, "postId"),
          userId,
          anonymous ? anonymousKey(userId) : null,
          anonymous,
          input.content,
          idempotencyKey(runtime, "comment"),
          runtime.requestId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create community comment.");
      return rowToComment({
        ...row,
        author_display_name_snapshot: authorDisplayName(userId, anonymous),
      });
    },
    async updateComment(commentId, input, runtime) {
      const [userId, admin] = ownerGuardParams(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.updateComment.legacy",
          `
          update public.community_comments
          set body = $4,
              is_anonymous = $5::boolean,
              status = coalesce($6, status),
              updated_at = now()
          where comment_id = $1::uuid
            and ($3::boolean or user_id = $2::uuid)
            and status <> 'DELETED'
          returning *, created_at as published_at
        `,
          [
            assertUuid(commentId, "commentId"),
            userId,
            admin,
            input.content,
            input.anonymous,
            legacyDbCommentStatusFromApi("VISIBLE"),
          ],
        );
        const row = result.rows[0];
        if (!row)
          throw new CommunityHttpError(
            404,
            "COMMUNITY_COMMENT_NOT_FOUND",
            "댓글을 찾을 수 없습니다.",
          );
        return rowToComment(row);
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.updateComment",
        `
          update public.community_comments
          set body = $4,
              is_anonymous = $5::boolean,
              anonymous_author_key = case when $5::boolean then $6 else null end,
              status = coalesce($7, status),
              request_id = $8,
              updated_by = $2::uuid,
              updated_at = now()
          where comment_id = $1::uuid
            and ($3::boolean or author_id = $2::uuid)
            and status <> 'deleted'
          returning *
        `,
        [
          assertUuid(commentId, "commentId"),
          userId,
          admin,
          input.content,
          input.anonymous,
          input.anonymous ? anonymousKey(userId) : null,
          dbCommentStatusFromApi("VISIBLE"),
          runtime.requestId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Community comment not found.");
      return rowToComment({
        ...row,
        author_display_name_snapshot: authorDisplayName(
          userId,
          input.anonymous,
        ),
      });
    },
    async deleteComment(commentId, runtime) {
      const [userId, admin] = ownerGuardParams(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.deleteComment.legacy",
          `
          with deleted as (
            update public.community_comments
            set status = 'DELETED',
                deleted_at = coalesce(deleted_at, now()),
                updated_at = now()
            where comment_id = $1::uuid
              and ($3::boolean or user_id = $2::uuid)
              and status <> 'DELETED'
            returning comment_id, post_id
          ),
          updated_post as (
            update public.community_posts
            set comment_count = greatest(comment_count - (select count(*)::int from deleted), 0),
                updated_at = now()
            where post_id in (select post_id from deleted)
          )
          select * from deleted
        `,
          [assertUuid(commentId, "commentId"), userId, admin],
        );
        const row = result.rows[0];
        if (!row)
          throw new CommunityHttpError(
            404,
            "COMMUNITY_COMMENT_NOT_FOUND",
            "댓글을 찾을 수 없습니다.",
          );
        return {
          commentId: String(row.comment_id ?? commentId),
          postId: String(row.post_id ?? ""),
          status: "DELETED",
          ...privacyFlags(),
        };
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.deleteComment",
        `
          with deleted as (
            update public.community_comments
            set status = 'deleted',
                deleted_at = coalesce(deleted_at, now()),
                request_id = $4,
                updated_by = $2::uuid,
                updated_at = now()
            where comment_id = $1::uuid
              and ($3::boolean or author_id = $2::uuid)
              and status <> 'deleted'
            returning comment_id, post_id
          ),
          updated_post as (
            update public.community_posts
            set comment_count = greatest(comment_count - (select count(*)::int from deleted), 0),
                updated_at = now()
            where post_id in (select post_id from deleted)
          )
          select * from deleted
        `,
        [assertUuid(commentId, "commentId"), userId, admin, runtime.requestId],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Community comment not found.");
      return {
        commentId: String(row.comment_id ?? commentId),
        postId: String(row.post_id ?? ""),
        status: "DELETED",
        ...privacyFlags(),
      };
    },
    async createReport(input, runtime) {
      const userId = requireUserId(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.createReport.legacy",
          `
          with inserted as (
            insert into public.community_reports (
              reporter_user_id,
              target_type,
              target_id,
              reason_code,
              detail,
              status
            )
            values (
              $1::uuid,
              $2,
              $3::uuid,
              $4,
              $5,
              'OPEN'
            )
            returning *
          ),
          updated_post as (
            update public.community_posts
            set report_count = report_count + case when $2 = 'POST' then 1 else 0 end,
                updated_at = now()
            where post_id = $3::uuid
              and exists (select 1 from inserted)
          )
          select * from inserted
        `,
          [
            userId,
            input.targetType,
            assertUuid(input.targetId, "targetId"),
            legacyReportReasonFromApi(input.reasonType),
            input.reason,
          ],
        );
        const row = result.rows[0];
        if (!row)
          throw new CommunityHttpError(
            500,
            "COMMUNITY_REPORT_CREATE_FAILED",
            "신고를 생성하지 못했습니다.",
          );
        return rowToReport(row);
      }
      const targetType = input.targetType.toLowerCase();
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.createReport",
        `
          with inserted as (
            insert into public.community_reports (
              target_type,
              target_id,
              reporter_id,
              reason,
              detail,
              status,
              idempotency_key,
              metadata,
              request_id,
              created_by,
              updated_by
            )
            values (
              $1,
              $2::uuid,
              $3::uuid,
              $4,
              $5,
              'open',
              $6,
              '{}'::jsonb,
              $7,
              $3::uuid,
              $3::uuid
            )
            on conflict (target_type, target_id, reporter_id)
            do update set idempotency_key = excluded.idempotency_key
            returning *
          ),
          updated_post as (
            update public.community_posts
            set report_count = report_count + case when $1 = 'post' then 1 else 0 end,
                updated_at = now()
            where post_id = $2::uuid
              and exists (select 1 from inserted)
          )
          select * from inserted
        `,
        [
          targetType,
          assertUuid(input.targetId, "targetId"),
          userId,
          reportReasonFromApi(input.reasonType),
          input.reason,
          idempotencyKey(runtime, "report"),
          runtime.requestId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create community report.");
      return rowToReport(row);
    },
    async notificationTargetFor(event, runtime) {
      const targetId = toText(event.targetId);
      if (!targetId) return null;
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        if (
          event.event === "community_comment_created" ||
          event.event === "community_comment_reacted"
        ) {
          const result = await queryText(
            repositoryQuery,
            runtime,
            "community.notificationTarget.comment.legacy",
            `
            select
              c.post_id,
              c.user_id as comment_author_id,
              p.user_id as post_author_id
            from public.community_comments c
            join public.community_posts p on p.post_id = c.post_id
            where c.comment_id = $1::uuid
              and c.status <> 'DELETED'
              and p.status <> 'DELETED'
            limit 1
          `,
            [assertUuid(targetId, "targetId")],
          );
          const row = result.rows[0];
          if (!row) return null;
          return {
            recipientUserId:
              event.event === "community_comment_created"
                ? String(row.post_author_id ?? "")
                : String(row.comment_author_id ?? ""),
            parentPostId: String(row.post_id ?? ""),
          };
        }
        if (
          event.event === "community_post_reacted" ||
          event.event === "community_report_created"
        ) {
          const result = await queryText(
            repositoryQuery,
            runtime,
            "community.notificationTarget.post.legacy",
            `
            select user_id, post_id
            from public.community_posts
            where post_id = $1::uuid
              and status <> 'DELETED'
            limit 1
          `,
            [assertUuid(targetId, "targetId")],
          );
          const row = result.rows[0];
          if (!row) return null;
          return {
            recipientUserId: String(row.user_id ?? ""),
            parentPostId: String(row.post_id ?? ""),
          };
        }
        return null;
      }
      if (
        event.event === "community_comment_created" ||
        event.event === "community_comment_reacted"
      ) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.notificationTarget.comment",
          `
            select
              c.post_id,
              c.author_id as comment_author_id,
              p.author_id as post_author_id
            from public.community_comments c
            join public.community_posts p on p.post_id = c.post_id
            where c.comment_id = $1::uuid
              and c.status <> 'deleted'
              and p.status <> 'deleted'
            limit 1
          `,
          [assertUuid(targetId, "targetId")],
        );
        const row = result.rows[0];
        if (!row) return null;
        return {
          recipientUserId:
            event.event === "community_comment_created"
              ? String(row.post_author_id ?? "")
              : String(row.comment_author_id ?? ""),
          parentPostId: String(row.post_id ?? ""),
        };
      }
      if (
        event.event === "community_post_reacted" ||
        event.event === "community_report_created"
      ) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.notificationTarget.post",
          `
            select author_id, post_id
            from public.community_posts
            where post_id = $1::uuid
              and status <> 'deleted'
            limit 1
          `,
          [assertUuid(targetId, "targetId")],
        );
        const row = result.rows[0];
        if (!row) return null;
        return {
          recipientUserId: String(row.author_id ?? ""),
          parentPostId: String(row.post_id ?? ""),
        };
      }
      return null;
    },
    async listMyPosts(page, runtime) {
      const userId = requireUserId(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.listMyPosts.legacy",
          `
          select *, board_type, created_at as published_at, count(*) over() as total_count
          from public.community_posts
          where user_id = $1::uuid
            and status <> 'DELETED'
          order by created_at desc, post_id desc
          limit $2::int
          offset $3::int
        `,
          [userId, page.limit, page.offset],
        );
        return listResult(result.rows, page, rowToPost);
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.listMyPosts",
        `
          select
            p.*,
            b.type as board_type,
            count(*) over() as total_count
          from public.community_posts p
          join public.community_boards b on b.board_id = p.board_id
          where p.author_id = $1::uuid
            and p.status <> 'deleted'
          order by p.published_at desc, p.post_id desc
          limit $2::int
          offset $3::int
        `,
        [userId, page.limit, page.offset],
      );
      return listResult(result.rows, page, rowToPost);
    },
    async listMyComments(page, runtime) {
      const userId = requireUserId(runtime);
      if (await usesLegacyCommunitySchema(repositoryQuery, runtime)) {
        const result = await queryText(
          repositoryQuery,
          runtime,
          "community.listMyComments.legacy",
          `
          select *, created_at as published_at, count(*) over() as total_count
          from public.community_comments
          where user_id = $1::uuid
            and status <> 'DELETED'
          order by created_at desc, comment_id desc
          limit $2::int
          offset $3::int
        `,
          [userId, page.limit, page.offset],
        );
        return listResult(result.rows, page, rowToComment);
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "community.listMyComments",
        `
          select *, count(*) over() as total_count
          from public.community_comments
          where author_id = $1::uuid
            and status <> 'deleted'
          order by published_at desc, comment_id desc
          limit $2::int
          offset $3::int
        `,
        [userId, page.limit, page.offset],
      );
      return listResult(result.rows, page, rowToComment);
    },
  };
}
