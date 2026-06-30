/**
 * packages/db/src/schema/community.schema.ts
 *
 * 급여납치 Salary Hijacking Platform · Community database schema contract.
 *
 * 목적
 * - 커뮤니티 게시판/게시글/글쓰기/댓글/대댓글/반응/북마크/공유/첨부/태그/신고/운영 조치/제재/지표/감사/멱등성 DB 계약 제공
 * - 외부 ORM/DB/Zod 정적 import 없이 typecheck·bootstrap 안정성 확보
 * - SQL DDL metadata, RLS/RBAC policy, seed, 자체 completeness 검증 제공
 * - 급여·예산·지출·저축 원천 데이터, token, secret, 원문 PII가 커뮤니티 payload/log/첨부 metadata에 섞이지 않도록 DB-level guard 설계
 * - 익명 글쓰기, 질문글, 레벨업 인증, 자유/취미/월급토크/소비통제/저축팁/공지/이벤트/FAQ, 관리자 모더레이션, 신고 처리, 소프트 삭제, 감사 추적 반영
 */

export const COMMUNITY_SCHEMA_CONTRACT_VERSION = "2.0.0";
export const COMMUNITY_SCHEMA_TIMEZONE = "Asia/Seoul";
export const COMMUNITY_SCHEMA_CURRENCY = "KRW";

export const communityBoardTypes = [
  "general",
  "free",
  "level_up_proof",
  "consumption_control",
  "saving_tip",
  "salary_talk",
  "hobby",
  "notice",
  "event",
  "faq",
] as const;

export const communityPostStatuses = [
  "draft",
  "pending_review",
  "published",
  "hidden",
  "reported",
  "blocked",
  "archived",
  "deleted",
] as const;

export const communityCommentStatuses = [
  "published",
  "hidden",
  "reported",
  "blocked",
  "deleted",
] as const;

export const communityVisibilityLevels = [
  "public",
  "members_only",
  "moderators_only",
  "admin_only",
] as const;

export const communityReactionTypes = [
  "like",
  "cheer",
  "thanks",
  "useful",
  "empathy",
] as const;

export const communityTargetTypes = [
  "board",
  "post",
  "comment",
  "attachment",
  "user",
] as const;

export const communityReportReasons = [
  "spam",
  "abuse",
  "harassment",
  "hate",
  "misinformation",
  "financial_advice_risk",
  "privacy_leak",
  "raw_financial_data_leak",
  "token_or_secret_leak",
  "adult_or_illegal",
  "copyright",
  "other",
] as const;

export const communityReportStatuses = [
  "open",
  "triaged",
  "reviewing",
  "resolved",
  "rejected",
  "escalated",
] as const;

export const communityModerationActions = [
  "hide",
  "unhide",
  "block",
  "delete",
  "restore",
  "pin",
  "unpin",
  "lock_comments",
  "unlock_comments",
  "mark_answered",
  "unmark_answered",
  "resolve_report",
  "reject_report",
  "escalate_report",
  "warn_user",
  "mute_user",
  "ban_user",
] as const;

export const communityAttachmentScanStatuses = [
  "pending",
  "scanning",
  "clean",
  "blocked",
  "failed",
] as const;

export const communityShareChannels = [
  "copy_link",
  "native_share",
  "kakao",
  "line",
  "x",
  "facebook",
  "internal",
] as const;

export const communitySanctionKinds = [
  "warning",
  "post_restriction",
  "comment_restriction",
  "temporary_mute",
  "temporary_ban",
  "permanent_ban",
] as const;

export const communitySanctionStatuses = [
  "active",
  "expired",
  "revoked",
  "deleted",
] as const;

export const communityAuditEventTypes = [
  "community.board.created",
  "community.board.updated",
  "community.post.created",
  "community.post.updated",
  "community.post.published",
  "community.post.hidden",
  "community.post.deleted",
  "community.comment.created",
  "community.comment.hidden",
  "community.comment.deleted",
  "community.reaction.created",
  "community.reaction.deleted",
  "community.bookmark.created",
  "community.share.created",
  "community.report.created",
  "community.report.resolved",
  "community.moderation.applied",
  "community.sanction.applied",
  "community.sanction.revoked",
  "community.attachment.uploaded",
  "community.attachment.scan.completed",
  "community.idempotency.replayed",
] as const;

export const idempotencyRecordStatuses = [
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
] as const;

export type CommunityBoardType = (typeof communityBoardTypes)[number];
export type CommunityPostStatus = (typeof communityPostStatuses)[number];
export type CommunityCommentStatus = (typeof communityCommentStatuses)[number];
export type CommunityVisibilityLevel =
  (typeof communityVisibilityLevels)[number];
export type CommunityReactionType = (typeof communityReactionTypes)[number];
export type CommunityTargetType = (typeof communityTargetTypes)[number];
export type CommunityReportReason = (typeof communityReportReasons)[number];
export type CommunityReportStatus = (typeof communityReportStatuses)[number];
export type CommunityModerationAction =
  (typeof communityModerationActions)[number];
export type CommunityAttachmentScanStatus =
  (typeof communityAttachmentScanStatuses)[number];
export type CommunityShareChannel = (typeof communityShareChannels)[number];
export type CommunitySanctionKind = (typeof communitySanctionKinds)[number];
export type CommunitySanctionStatus =
  (typeof communitySanctionStatuses)[number];
export type CommunityAuditEventType = (typeof communityAuditEventTypes)[number];
export type IdempotencyRecordStatus =
  (typeof idempotencyRecordStatuses)[number];

export type DbColumnType =
  | "uuid"
  | "text"
  | "boolean"
  | "smallint"
  | "integer"
  | "bigint"
  | "date"
  | "timestamptz"
  | "jsonb"
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
  readonly sensitivity?:
    | "public"
    | "internal"
    | "confidential"
    | "restricted"
    | "secret";
  readonly containsRawFinancialData?: boolean;
  readonly containsRawToken?: boolean;
  readonly containsRawSecret?: boolean;
  readonly containsRawPii?: boolean;
}

export interface DbTableSpec {
  readonly name: string;
  readonly description: string;
  readonly columns: readonly DbColumnSpec[];
  readonly constraints?: readonly string[];
  readonly rlsRequired: true;
  readonly auditRequired: true;
  readonly serverAuthorityRequired: true;
  readonly containsFinancialSourceData: false;
  readonly containsRawToken: false;
  readonly containsRawSecret: false;
  readonly containsRawPii: false;
  readonly idempotencyRequired?: boolean;
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
  readonly role: "authenticated" | "service_role" | "moderator" | "admin";
  readonly usingSql?: string;
  readonly checkSql?: string;
}

export interface CommunityBoardSeed {
  readonly slug: string;
  readonly type: CommunityBoardType;
  readonly nameKo: string;
  readonly descriptionKo: string;
  readonly sortOrder: number;
  readonly isSystem: true;
}

export interface CommunitySchemaCompletenessReport {
  readonly ok: boolean;
  readonly tableCount: number;
  readonly indexCount: number;
  readonly policyCount: number;
  readonly seedCount: number;
  readonly ddlStatementCount: number;
  readonly missing: readonly string[];
}

export const communitySchemaPolicy = Object.freeze({
  project: "salary-hijacking-platform",
  packageScope: "packages/db",
  file: "packages/db/src/schema/community.schema.ts",
  contractVersion: COMMUNITY_SCHEMA_CONTRACT_VERSION,
  timezone: COMMUNITY_SCHEMA_TIMEZONE,
  currency: COMMUNITY_SCHEMA_CURRENCY,
  schemaAuthority: "server-database-contract",
  serverAuthorityRequired: true,
  browserDirectDatabaseAccessAllowed: false,
  anonymousPostingAllowed: true,
  questionPostAllowed: true,
  attachmentRequiredToBeScanned: true,
  softDeleteDefault: true,
  moderationRequired: true,
  reportWorkflowRequired: true,
  adminRbacRequired: true,
  rawFinancialDataInCommunityPayloadAllowed: false,
  rawFinancialDataInAdsEventAllowed: false,
  rawFinancialDataInLogsAllowed: false,
  rawTokenInResponseAllowed: false,
  rawSecretInResponseAllowed: false,
  rawPiiInLogsAllowed: false,
  rlsRequired: true,
  auditRequired: true,
  seedDataMustExcludePersonalData: true,
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

const uuidPrimaryKey = (name = "id"): DbColumnSpec => ({
  name,
  type: "uuid",
  primaryKey: true,
  notNull: true,
  defaultSql: "gen_random_uuid()",
});

const uuidRef = (
  name: string,
  table: string,
  column = "id",
  onDelete: DbColumnReferenceSpec["onDelete"] = "cascade",
  notNull = true,
): DbColumnSpec => ({
  name,
  type: "uuid",
  notNull,
  references: { table, column, onDelete },
});

const textColumn = (
  name: string,
  max?: number,
  notNull = false,
): DbColumnSpec => ({
  name,
  type: max ? `varchar(${max})` : "text",
  notNull,
  checks:
    max && notNull ? [trimmedLengthBetweenCheck(name, 1, max)] : undefined,
});

const jsonColumn = (name: string): DbColumnSpec => ({
  name,
  type: "jsonb",
  notNull: true,
  defaultSql: "'{}'::jsonb",
});

const boolColumn = (name: string, defaultSql = "false"): DbColumnSpec => ({
  name,
  type: "boolean",
  notNull: true,
  defaultSql,
});

const counterColumn = (name: string): DbColumnSpec => ({
  name,
  type: "integer",
  notNull: true,
  defaultSql: "0",
  checks: [nonNegativeCheck(name)],
});

const safetyFlagColumns = [
  {
    name: "raw_financial_source_data_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_financial_source_data_included")],
    comment:
      "커뮤니티 payload에는 급여·예산·지출·저축 원천 데이터를 저장하지 않는다.",
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
    comment: "API key, DB URL, webhook secret 원문 저장 금지.",
  },
  {
    name: "raw_pii_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_pii_included")],
    comment: "주민번호, 계좌번호, 전화번호, 이메일 등 원문 PII 저장 금지.",
  },
  {
    name: "ads_payload_linked",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("ads_payload_linked")],
    comment: "광고 타겟팅 payload와 커뮤니티 payload 직접 결합 금지.",
  },
] as const satisfies readonly DbColumnSpec[];

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

const actorColumns = [
  { name: "request_id", type: "varchar(128)" },
  {
    name: "created_by",
    type: "uuid",
    references: { table: "users", column: "user_id", onDelete: "set null" },
  },
  {
    name: "updated_by",
    type: "uuid",
    references: { table: "users", column: "user_id", onDelete: "set null" },
  },
] as const satisfies readonly DbColumnSpec[];

const operationalColumns = [
  ...safetyFlagColumns,
  ...actorColumns,
  ...createdUpdatedColumns,
] as const;

const secureTable = (
  table: Omit<
    DbTableSpec,
    | "rlsRequired"
    | "auditRequired"
    | "serverAuthorityRequired"
    | "containsFinancialSourceData"
    | "containsRawToken"
    | "containsRawSecret"
    | "containsRawPii"
  >,
): DbTableSpec => ({
  ...table,
  rlsRequired: true,
  auditRequired: true,
  serverAuthorityRequired: true,
  containsFinancialSourceData: false,
  containsRawToken: false,
  containsRawSecret: false,
  containsRawPii: false,
});

export const communitySchemaTables = [
  secureTable({
    name: "community_boards",
    description:
      "커뮤니티 게시판 정의. 전체/자유/레벨업 인증/소비통제/저축팁/월급토크/취미/공지/이벤트/FAQ를 관리한다.",
    columns: [
      uuidPrimaryKey("board_id"),
      textColumn("slug", 64, true),
      {
        name: "type",
        type: "varchar(32)",
        notNull: true,
        checks: [enumCheck("type", communityBoardTypes)],
      },
      textColumn("name_ko", 80, true),
      textColumn("description_ko", undefined, true),
      {
        name: "sort_order",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [nonNegativeCheck("sort_order")],
      },
      boolColumn("is_active", "true"),
      boolColumn("is_system", "true"),
      boolColumn("allow_anonymous", "true"),
      boolColumn("allow_questions", "true"),
      boolColumn("allow_attachments", "true"),
      boolColumn("moderation_pre_required"),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_boards_slug_unique unique (slug)",
      "constraint community_boards_slug_format check (slug ~ '^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$')",
    ],
  }),
  secureTable({
    name: "community_posts",
    description:
      "커뮤니티 게시글. 익명 글쓰기, 질문글, 레벨업 인증, 운영자 공지, 이벤트, FAQ, 소프트 삭제를 지원한다.",
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("post_id"),
      uuidRef("board_id", "community_boards", "board_id", "restrict"),
      uuidRef("author_id", "users", "user_id", "cascade"),
      textColumn("author_display_name_snapshot", 80),
      textColumn("anonymous_author_key", 128),
      boolColumn("is_anonymous"),
      boolColumn("is_question"),
      boolColumn("is_answered"),
      textColumn("title", 140, true),
      textColumn("body", undefined, true),
      {
        name: "body_plain_text_hash",
        type: "varchar(256)",
        comment:
          "중복/도배 탐지를 위한 본문 hash. 본문 원문 대체가 아니며 PII 원문 저장 금지.",
      },
      {
        name: "status",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'published'",
        checks: [enumCheck("status", communityPostStatuses)],
      },
      {
        name: "visibility",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'members_only'",
        checks: [enumCheck("visibility", communityVisibilityLevels)],
      },
      counterColumn("view_count"),
      counterColumn("like_count"),
      counterColumn("cheer_count"),
      counterColumn("comment_count"),
      counterColumn("bookmark_count"),
      counterColumn("share_count"),
      counterColumn("report_count"),
      {
        name: "quality_score",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: ["quality_score between -100000 and 100000"],
      },
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [trimmedLengthBetweenCheck("idempotency_key", 8, 256)],
      },
      {
        name: "published_at",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
      { name: "pinned_at", type: "timestamptz" },
      { name: "locked_at", type: "timestamptz" },
      { name: "hidden_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_posts_user_idempotency_unique unique (author_id, idempotency_key)",
      "constraint community_posts_body_length check (char_length(trim(body)) between 1 and 20000)",
      "constraint community_posts_anonymous_key_required check (is_anonymous = false or anonymous_author_key is not null)",
      "constraint community_posts_deleted_status_consistency check ((deleted_at is null and status <> 'deleted') or (deleted_at is not null and status = 'deleted'))",
      "constraint community_posts_hidden_status_consistency check (hidden_at is null or status in ('hidden', 'reported', 'blocked'))",
      "constraint community_posts_locked_comments_check check (locked_at is null or status in ('published', 'hidden', 'reported', 'blocked', 'archived'))",
    ],
  }),
  secureTable({
    name: "community_comments",
    description:
      "게시글 댓글 및 대댓글. 익명 댓글, 운영 숨김, 소프트 삭제를 지원한다.",
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("comment_id"),
      uuidRef("post_id", "community_posts", "post_id"),
      uuidRef(
        "parent_comment_id",
        "community_comments",
        "comment_id",
        "cascade",
        false,
      ),
      uuidRef("author_id", "users", "user_id", "cascade"),
      textColumn("anonymous_author_key", 128),
      boolColumn("is_anonymous"),
      textColumn("body", undefined, true),
      { name: "body_plain_text_hash", type: "varchar(256)" },
      {
        name: "status",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'published'",
        checks: [enumCheck("status", communityCommentStatuses)],
      },
      counterColumn("like_count"),
      counterColumn("report_count"),
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [trimmedLengthBetweenCheck("idempotency_key", 8, 256)],
      },
      {
        name: "published_at",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
      { name: "hidden_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_comments_user_idempotency_unique unique (author_id, idempotency_key)",
      "constraint community_comments_body_length check (char_length(trim(body)) between 1 and 5000)",
      "constraint community_comments_anonymous_key_required check (is_anonymous = false or anonymous_author_key is not null)",
      "constraint community_comments_deleted_status_consistency check ((deleted_at is null and status <> 'deleted') or (deleted_at is not null and status = 'deleted'))",
      "constraint community_comments_hidden_status_consistency check (hidden_at is null or status in ('hidden', 'reported', 'blocked'))",
    ],
  }),
  secureTable({
    name: "community_post_attachments",
    description:
      "게시글 첨부 metadata. 파일 원문은 object storage에 저장하며 DB에는 검증된 metadata만 저장한다.",
    columns: [
      uuidPrimaryKey("attachment_id"),
      uuidRef("post_id", "community_posts", "post_id"),
      uuidRef("uploader_id", "users", "user_id", "cascade"),
      textColumn("storage_key", 512, true),
      textColumn("public_url"),
      textColumn("mime_type", 128, true),
      {
        name: "byte_size",
        type: "integer",
        notNull: true,
        checks: ["byte_size between 1 and 10485760"],
      },
      { name: "width", type: "integer", checks: [nonNegativeCheck("width")] },
      { name: "height", type: "integer", checks: [nonNegativeCheck("height")] },
      textColumn("alt_text", 160),
      {
        name: "scan_status",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'pending'",
        checks: [enumCheck("scan_status", communityAttachmentScanStatuses)],
      },
      textColumn("scan_provider", 80),
      textColumn("blocked_reason"),
      { name: "scanned_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_post_attachments_storage_key_unique unique (storage_key)",
      "constraint community_post_attachments_scan_block_check check (blocked_reason is null or scan_status = 'blocked')",
      "constraint community_post_attachments_scan_time_check check (scanned_at is null or scan_status in ('clean', 'blocked', 'failed'))",
    ],
  }),
  secureTable({
    name: "community_tags",
    description:
      "커뮤니티 태그 사전. 운영자가 허용한 태그만 게시글에 연결한다.",
    columns: [
      uuidPrimaryKey("tag_id"),
      textColumn("slug", 64, true),
      textColumn("name_ko", 40, true),
      boolColumn("is_active", "true"),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_tags_slug_unique unique (slug)",
      "constraint community_tags_slug_format check (slug ~ '^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$')",
    ],
  }),
  secureTable({
    name: "community_post_tags",
    description: "게시글-태그 연결 테이블.",
    columns: [
      uuidPrimaryKey("post_tag_id"),
      uuidRef("post_id", "community_posts", "post_id"),
      uuidRef("tag_id", "community_tags", "tag_id", "restrict"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_post_tags_unique unique (post_id, tag_id)",
    ],
  }),
  secureTable({
    name: "community_reactions",
    description:
      "게시글/댓글 반응. 좋아요·응원·감사·유용함 등 중복 방지 가능한 사용자 반응 저장소.",
    columns: [
      uuidPrimaryKey("reaction_id"),
      {
        name: "target_type",
        type: "varchar(32)",
        notNull: true,
        checks: ["target_type in ('post', 'comment')"],
      },
      { name: "target_id", type: "uuid", notNull: true },
      uuidRef("user_id", "users", "user_id", "cascade"),
      {
        name: "reaction_type",
        type: "varchar(32)",
        notNull: true,
        checks: [enumCheck("reaction_type", communityReactionTypes)],
      },
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_reactions_target_user_type_unique unique (target_type, target_id, user_id, reaction_type)",
    ],
  }),
  secureTable({
    name: "community_bookmarks",
    description: "게시글 북마크. 사용자가 나중에 볼 게시글을 저장한다.",
    columns: [
      uuidPrimaryKey("bookmark_id"),
      uuidRef("post_id", "community_posts", "post_id"),
      uuidRef("user_id", "users", "user_id", "cascade"),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_bookmarks_post_user_unique unique (post_id, user_id)",
    ],
  }),
  secureTable({
    name: "community_shares",
    description:
      "게시글 공유 이벤트. 외부 채널 공유와 내부 공유 지표를 저장한다.",
    columns: [
      uuidPrimaryKey("share_id"),
      uuidRef("post_id", "community_posts", "post_id"),
      uuidRef("user_id", "users", "user_id", "set null", false),
      {
        name: "share_channel",
        type: "varchar(32)",
        notNull: true,
        checks: [enumCheck("share_channel", communityShareChannels)],
      },
      textColumn("share_context", 120),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
  }),
  secureTable({
    name: "community_reports",
    description:
      "게시글/댓글/첨부/사용자 신고. 개인정보 유출, 원천 금융 데이터 유출, 오정보, 불법정보 신고를 포함한다.",
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("report_id"),
      {
        name: "target_type",
        type: "varchar(32)",
        notNull: true,
        checks: [enumCheck("target_type", communityTargetTypes)],
      },
      { name: "target_id", type: "uuid", notNull: true },
      uuidRef("reporter_id", "users", "user_id", "cascade"),
      {
        name: "reason",
        type: "varchar(64)",
        notNull: true,
        checks: [enumCheck("reason", communityReportReasons)],
      },
      textColumn("detail"),
      {
        name: "status",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'open'",
        checks: [enumCheck("status", communityReportStatuses)],
      },
      uuidRef("assigned_moderator_id", "users", "user_id", "set null", false),
      uuidRef("resolved_by", "users", "user_id", "set null", false),
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [trimmedLengthBetweenCheck("idempotency_key", 8, 256)],
      },
      { name: "triaged_at", type: "timestamptz" },
      { name: "resolved_at", type: "timestamptz" },
      textColumn("resolution_note"),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_reports_target_reporter_unique unique (target_type, target_id, reporter_id)",
      "constraint community_reports_reporter_idempotency_unique unique (reporter_id, idempotency_key)",
      "constraint community_reports_detail_length check (detail is null or char_length(detail) <= 3000)",
      "constraint community_reports_resolution_consistency check ((status in ('resolved', 'rejected') and resolved_at is not null and resolved_by is not null) or (status in ('open', 'triaged', 'reviewing', 'escalated') and resolved_at is null))",
    ],
  }),
  secureTable({
    name: "community_moderation_actions",
    description:
      "운영자 모더레이션 이력. 숨김, 차단, 삭제, 복구, 신고 처리, 댓글 잠금, 사용자 제재를 감사 가능하게 기록한다.",
    columns: [
      uuidPrimaryKey("moderation_action_id"),
      {
        name: "target_type",
        type: "varchar(32)",
        notNull: true,
        checks: [enumCheck("target_type", communityTargetTypes)],
      },
      { name: "target_id", type: "uuid", notNull: true },
      uuidRef("moderator_id", "users", "user_id", "restrict"),
      uuidRef("report_id", "community_reports", "report_id", "set null", false),
      {
        name: "action",
        type: "varchar(48)",
        notNull: true,
        checks: [enumCheck("action", communityModerationActions)],
      },
      textColumn("reason", undefined, true),
      jsonColumn("before_data"),
      jsonColumn("after_data"),
      {
        name: "effective_at",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_moderation_actions_reason_length check (char_length(trim(reason)) between 3 and 2000)",
    ],
  }),
  secureTable({
    name: "community_user_sanctions",
    description:
      "커뮤니티 사용자 제재. 경고, 글쓰기 제한, 댓글 제한, 임시/영구 차단을 기록한다.",
    columns: [
      uuidPrimaryKey("sanction_id"),
      uuidRef("user_id", "users", "user_id", "cascade"),
      uuidRef("moderator_id", "users", "user_id", "restrict"),
      uuidRef(
        "moderation_action_id",
        "community_moderation_actions",
        "moderation_action_id",
        "set null",
        false,
      ),
      {
        name: "kind",
        type: "varchar(40)",
        notNull: true,
        checks: [enumCheck("kind", communitySanctionKinds)],
      },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'active'",
        checks: [enumCheck("status", communitySanctionStatuses)],
      },
      textColumn("reason", undefined, true),
      {
        name: "starts_at",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
      { name: "expires_at", type: "timestamptz" },
      { name: "revoked_at", type: "timestamptz" },
      uuidRef("revoked_by", "users", "user_id", "set null", false),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_user_sanctions_reason_length check (char_length(trim(reason)) between 3 and 2000)",
      "constraint community_user_sanctions_expiry_check check (expires_at is null or expires_at > starts_at)",
      "constraint community_user_sanctions_revoked_check check (revoked_at is null or status = 'revoked')",
    ],
  }),
  secureTable({
    name: "community_post_metrics_daily",
    description:
      "게시글 일별 운영 지표. 조회, 반응, 댓글, 공유, 신고율, 모더레이션 상태 추적에 사용한다.",
    columns: [
      uuidPrimaryKey("metric_id"),
      uuidRef("post_id", "community_posts", "post_id"),
      { name: "metric_date", type: "date", notNull: true },
      counterColumn("view_count"),
      counterColumn("reaction_count"),
      counterColumn("comment_count"),
      counterColumn("share_count"),
      counterColumn("report_count"),
      {
        name: "health_score",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: ["health_score between -100000 and 100000"],
      },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_post_metrics_daily_unique unique (post_id, metric_date)",
    ],
  }),
  secureTable({
    name: "community_idempotency_records",
    description: "글쓰기/댓글/신고/반응/북마크/공유 API의 멱등성 원장.",
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("idempotency_record_id"),
      uuidRef("user_id", "users", "user_id", "cascade"),
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [trimmedLengthBetweenCheck("idempotency_key", 8, 256)],
      },
      textColumn("operation", 80, true),
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'PROCESSING'",
        checks: [enumCheck("status", idempotencyRecordStatuses)],
      },
      {
        name: "request_hash",
        type: "varchar(128)",
        notNull: true,
        checks: [trimmedLengthBetweenCheck("request_hash", 16, 128)],
      },
      { name: "response_reference_id", type: "uuid" },
      textColumn("error_code", 120),
      { name: "expires_at", type: "timestamptz", notNull: true },
      ...operationalColumns,
    ],
    constraints: [
      "constraint community_idempotency_records_user_key_unique unique (user_id, idempotency_key)",
      "constraint community_idempotency_records_expiry_check check (expires_at > created_at)",
    ],
  }),
  secureTable({
    name: "community_audit_events",
    description:
      "커뮤니티 게시판/글/댓글/반응/신고/제재/첨부/운영 변경 감사 로그. 원문 민감정보 저장 금지.",
    columns: [
      uuidPrimaryKey("audit_event_id"),
      {
        name: "event_type",
        type: "varchar(80)",
        notNull: true,
        checks: [enumCheck("event_type", communityAuditEventTypes)],
      },
      uuidRef("actor_user_id", "users", "user_id", "set null", false),
      uuidRef("target_user_id", "users", "user_id", "set null", false),
      {
        name: "target_type",
        type: "varchar(32)",
        checks: [enumCheck("target_type", communityTargetTypes)],
      },
      { name: "target_id", type: "uuid" },
      uuidRef("post_id", "community_posts", "post_id", "set null", false),
      uuidRef(
        "comment_id",
        "community_comments",
        "comment_id",
        "set null",
        false,
      ),
      uuidRef("report_id", "community_reports", "report_id", "set null", false),
      uuidRef(
        "moderation_action_id",
        "community_moderation_actions",
        "moderation_action_id",
        "set null",
        false,
      ),
      jsonColumn("before_data"),
      jsonColumn("after_data"),
      textColumn("reason"),
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
    constraints: [
      "constraint community_audit_events_target_shape check ((target_type is null and target_id is null) or (target_type is not null and target_id is not null))",
    ],
  }),
] as const satisfies readonly DbTableSpec[];

export const communitySchemaIndexes = [
  {
    name: "idx_community_boards_active_sort",
    table: "community_boards",
    columns: ["is_active", "sort_order", "slug"],
  },
  {
    name: "idx_community_boards_metadata_gin",
    table: "community_boards",
    columns: ["metadata"],
    method: "gin",
  },
  {
    name: "idx_community_posts_board_status_published",
    table: "community_posts",
    columns: ["board_id", "status", "published_at"],
  },
  {
    name: "idx_community_posts_author_created",
    table: "community_posts",
    columns: ["author_id", "created_at"],
  },
  {
    name: "idx_community_posts_popular",
    table: "community_posts",
    columns: [
      "status",
      "quality_score",
      "like_count",
      "comment_count",
      "published_at",
    ],
    whereSql: "deleted_at is null",
  },
  {
    name: "idx_community_posts_question",
    table: "community_posts",
    columns: ["is_question", "is_answered", "published_at"],
    whereSql: "is_question = true and deleted_at is null",
  },
  {
    name: "idx_community_posts_metadata_gin",
    table: "community_posts",
    columns: ["metadata"],
    method: "gin",
  },
  {
    name: "idx_community_comments_post_status_created",
    table: "community_comments",
    columns: ["post_id", "status", "created_at"],
  },
  {
    name: "idx_community_comments_author_created",
    table: "community_comments",
    columns: ["author_id", "created_at"],
  },
  {
    name: "idx_community_attachments_post_scan",
    table: "community_post_attachments",
    columns: ["post_id", "scan_status", "created_at"],
  },
  {
    name: "idx_community_tags_active",
    table: "community_tags",
    columns: ["is_active", "slug"],
  },
  {
    name: "idx_community_post_tags_tag",
    table: "community_post_tags",
    columns: ["tag_id", "post_id"],
  },
  {
    name: "idx_community_reactions_target",
    table: "community_reactions",
    columns: ["target_type", "target_id", "reaction_type"],
  },
  {
    name: "idx_community_reactions_user",
    table: "community_reactions",
    columns: ["user_id", "created_at"],
  },
  {
    name: "idx_community_bookmarks_user_created",
    table: "community_bookmarks",
    columns: ["user_id", "created_at"],
  },
  {
    name: "idx_community_shares_post_created",
    table: "community_shares",
    columns: ["post_id", "created_at"],
  },
  {
    name: "idx_community_reports_status_created",
    table: "community_reports",
    columns: ["status", "created_at"],
  },
  {
    name: "idx_community_reports_target",
    table: "community_reports",
    columns: ["target_type", "target_id", "created_at"],
  },
  {
    name: "idx_community_moderation_target",
    table: "community_moderation_actions",
    columns: ["target_type", "target_id", "created_at"],
  },
  {
    name: "idx_community_moderation_moderator",
    table: "community_moderation_actions",
    columns: ["moderator_id", "created_at"],
  },
  {
    name: "idx_community_sanctions_user_status",
    table: "community_user_sanctions",
    columns: ["user_id", "status", "expires_at"],
  },
  {
    name: "idx_community_metrics_daily_post_date",
    table: "community_post_metrics_daily",
    columns: ["post_id", "metric_date"],
  },
  {
    name: "idx_community_idempotency_status_expiry",
    table: "community_idempotency_records",
    columns: ["status", "expires_at"],
  },
  {
    name: "idx_community_audit_target",
    table: "community_audit_events",
    columns: ["target_type", "target_id", "created_at"],
    whereSql: "target_type is not null and target_id is not null",
  },
  {
    name: "idx_community_audit_actor",
    table: "community_audit_events",
    columns: ["actor_user_id", "created_at"],
    whereSql: "actor_user_id is not null",
  },
] as const satisfies readonly DbIndexSpec[];

const ownerUserSql = "public.current_app_user_id()";
const adminSql = "public.current_app_is_admin()";
const moderatorSql =
  "public.current_app_is_admin() or public.current_app_has_role('moderator')";
const serviceOrAdminSql =
  "current_user = 'service_role' or public.current_app_is_admin()";
const safetySql =
  "raw_financial_source_data_included = false and raw_token_included = false and raw_secret_included = false and raw_pii_included = false and ads_payload_linked = false";
const authorPostSql = `author_id = ${ownerUserSql}`;
const authorCommentSql = `author_id = ${ownerUserSql}`;
const userOwnerSql = `user_id = ${ownerUserSql}`;
const reporterSql = `reporter_id = ${ownerUserSql}`;

export const communitySchemaPolicies = [
  {
    name: "community_boards_read_active",
    table: "community_boards",
    command: "select",
    role: "authenticated",
    usingSql: "is_active = true or public.current_app_is_admin()",
  },
  {
    name: "community_boards_admin_all",
    table: "community_boards",
    command: "all",
    role: "admin",
    usingSql: adminSql,
    checkSql: `${adminSql} and ${safetySql}`,
  },
  {
    name: "community_posts_read_published",
    table: "community_posts",
    command: "select",
    role: "authenticated",
    usingSql:
      "(status = 'published' and visibility in ('public', 'members_only') and deleted_at is null) or author_id = public.current_app_user_id() or public.current_app_is_admin()",
  },
  {
    name: "community_posts_author_insert_safe",
    table: "community_posts",
    command: "insert",
    role: "authenticated",
    checkSql: `${authorPostSql} and ${safetySql}`,
  },
  {
    name: "community_posts_author_update_own",
    table: "community_posts",
    command: "update",
    role: "authenticated",
    usingSql: `${authorPostSql} and status in ('draft', 'published')`,
    checkSql: `${authorPostSql} and ${safetySql}`,
  },
  {
    name: "community_posts_moderator_all",
    table: "community_posts",
    command: "all",
    role: "moderator",
    usingSql: moderatorSql,
    checkSql: `${moderatorSql} and ${safetySql}`,
  },
  {
    name: "community_comments_read_published",
    table: "community_comments",
    command: "select",
    role: "authenticated",
    usingSql:
      "status = 'published' or author_id = public.current_app_user_id() or public.current_app_is_admin()",
  },
  {
    name: "community_comments_author_insert_safe",
    table: "community_comments",
    command: "insert",
    role: "authenticated",
    checkSql: `${authorCommentSql} and ${safetySql}`,
  },
  {
    name: "community_comments_author_update_own",
    table: "community_comments",
    command: "update",
    role: "authenticated",
    usingSql: `${authorCommentSql} and status = 'published'`,
    checkSql: `${authorCommentSql} and ${safetySql}`,
  },
  {
    name: "community_comments_moderator_all",
    table: "community_comments",
    command: "all",
    role: "moderator",
    usingSql: moderatorSql,
    checkSql: `${moderatorSql} and ${safetySql}`,
  },
  {
    name: "community_attachments_read_clean",
    table: "community_post_attachments",
    command: "select",
    role: "authenticated",
    usingSql:
      "scan_status = 'clean' or uploader_id = public.current_app_user_id() or public.current_app_is_admin()",
  },
  {
    name: "community_attachments_uploader_insert",
    table: "community_post_attachments",
    command: "insert",
    role: "authenticated",
    checkSql: `uploader_id = ${ownerUserSql} and ${safetySql}`,
  },
  {
    name: "community_attachments_service_all",
    table: "community_post_attachments",
    command: "all",
    role: "service_role",
    usingSql: serviceOrAdminSql,
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  {
    name: "community_tags_read_active",
    table: "community_tags",
    command: "select",
    role: "authenticated",
    usingSql: "is_active = true or public.current_app_is_admin()",
  },
  {
    name: "community_tags_admin_all",
    table: "community_tags",
    command: "all",
    role: "admin",
    usingSql: adminSql,
    checkSql: `${adminSql} and ${safetySql}`,
  },
  {
    name: "community_post_tags_read",
    table: "community_post_tags",
    command: "select",
    role: "authenticated",
    usingSql: "true",
  },
  {
    name: "community_post_tags_service_all",
    table: "community_post_tags",
    command: "all",
    role: "service_role",
    usingSql: serviceOrAdminSql,
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  {
    name: "community_reactions_owner_all",
    table: "community_reactions",
    command: "all",
    role: "authenticated",
    usingSql: `${userOwnerSql} or public.current_app_is_admin()`,
    checkSql: `${userOwnerSql} and ${safetySql}`,
  },
  {
    name: "community_bookmarks_owner_all",
    table: "community_bookmarks",
    command: "all",
    role: "authenticated",
    usingSql: `${userOwnerSql} or public.current_app_is_admin()`,
    checkSql: `${userOwnerSql} and ${safetySql}`,
  },
  {
    name: "community_shares_owner_insert",
    table: "community_shares",
    command: "insert",
    role: "authenticated",
    checkSql: `(user_id is null or ${userOwnerSql}) and ${safetySql}`,
  },
  {
    name: "community_shares_owner_select",
    table: "community_shares",
    command: "select",
    role: "authenticated",
    usingSql: `(user_id is null or ${userOwnerSql}) or public.current_app_is_admin()`,
  },
  {
    name: "community_reports_reporter_insert",
    table: "community_reports",
    command: "insert",
    role: "authenticated",
    checkSql: `${reporterSql} and ${safetySql}`,
  },
  {
    name: "community_reports_owner_or_moderator_select",
    table: "community_reports",
    command: "select",
    role: "authenticated",
    usingSql: `${reporterSql} or ${moderatorSql}`,
  },
  {
    name: "community_reports_moderator_all",
    table: "community_reports",
    command: "all",
    role: "moderator",
    usingSql: moderatorSql,
    checkSql: `${moderatorSql} and ${safetySql}`,
  },
  {
    name: "community_moderation_moderator_all",
    table: "community_moderation_actions",
    command: "all",
    role: "moderator",
    usingSql: moderatorSql,
    checkSql: `${moderatorSql} and ${safetySql}`,
  },
  {
    name: "community_sanctions_owner_select",
    table: "community_user_sanctions",
    command: "select",
    role: "authenticated",
    usingSql: `${userOwnerSql} or ${moderatorSql}`,
  },
  {
    name: "community_sanctions_moderator_all",
    table: "community_user_sanctions",
    command: "all",
    role: "moderator",
    usingSql: moderatorSql,
    checkSql: `${moderatorSql} and ${safetySql}`,
  },
  {
    name: "community_metrics_read",
    table: "community_post_metrics_daily",
    command: "select",
    role: "authenticated",
    usingSql: "true",
  },
  {
    name: "community_metrics_service_all",
    table: "community_post_metrics_daily",
    command: "all",
    role: "service_role",
    usingSql: serviceOrAdminSql,
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  {
    name: "community_idempotency_service_all",
    table: "community_idempotency_records",
    command: "all",
    role: "service_role",
    usingSql: serviceOrAdminSql,
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  {
    name: "community_audit_admin_select",
    table: "community_audit_events",
    command: "select",
    role: "admin",
    usingSql: adminSql,
  },
  {
    name: "community_audit_service_insert",
    table: "community_audit_events",
    command: "insert",
    role: "service_role",
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
] as const satisfies readonly DbPolicySpec[];

export const communityBoardSeeds = [
  {
    slug: "general",
    type: "general",
    nameKo: "전체 게시판",
    descriptionKo: "급여납치 커뮤니티 전체 게시글을 확인하는 기본 게시판",
    sortOrder: 10,
    isSystem: true,
  },
  {
    slug: "free",
    type: "free",
    nameKo: "자유 게시판",
    descriptionKo: "직장인 일상, 소비 통제, 월급 루틴을 자유롭게 나누는 게시판",
    sortOrder: 20,
    isSystem: true,
  },
  {
    slug: "level-up-proof",
    type: "level_up_proof",
    nameKo: "레벨업 인증",
    descriptionKo: "독서, 뉴스, 영어, 건강 미션 완료를 인증하는 게시판",
    sortOrder: 30,
    isSystem: true,
  },
  {
    slug: "consumption-control",
    type: "consumption_control",
    nameKo: "소비통제",
    descriptionKo: "일일 예산, 변동지출, 무지출 챌린지를 공유하는 게시판",
    sortOrder: 35,
    isSystem: true,
  },
  {
    slug: "saving-tip",
    type: "saving_tip",
    nameKo: "저축 팁",
    descriptionKo: "고정저축, 적금, 목표저축 루틴을 공유하는 게시판",
    sortOrder: 40,
    isSystem: true,
  },
  {
    slug: "salary-talk",
    type: "salary_talk",
    nameKo: "월급 토크",
    descriptionKo: "급여일, 고정지출, 생활비 계획을 안전하게 논의하는 게시판",
    sortOrder: 45,
    isSystem: true,
  },
  {
    slug: "hobby",
    type: "hobby",
    nameKo: "취미 게시판",
    descriptionKo: "퇴근 후 취미와 자기계발 경험을 공유하는 게시판",
    sortOrder: 50,
    isSystem: true,
  },
  {
    slug: "notice",
    type: "notice",
    nameKo: "공지사항",
    descriptionKo: "서비스 운영 공지와 정책 변경 안내 게시판",
    sortOrder: 90,
    isSystem: true,
  },
  {
    slug: "event",
    type: "event",
    nameKo: "이벤트",
    descriptionKo: "포인트, 제휴, 챌린지 이벤트 안내 게시판",
    sortOrder: 95,
    isSystem: true,
  },
  {
    slug: "faq",
    type: "faq",
    nameKo: "FAQ",
    descriptionKo: "급여납치 사용법과 자주 묻는 질문 게시판",
    sortOrder: 100,
    isSystem: true,
  },
] as const satisfies readonly CommunityBoardSeed[];

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replace(/"/g, '""')}"`;

const renderColumnReference = (reference: DbColumnReferenceSpec): string => {
  const parts = [
    "references",
    quoteIdentifier(reference.table),
    `(${quoteIdentifier(reference.column)})`,
  ];
  if (reference.onDelete) parts.push("on delete", reference.onDelete);
  if (reference.onUpdate) parts.push("on update", reference.onUpdate);
  return parts.join(" ");
};

export const renderCommunityColumnSql = (column: DbColumnSpec): string => {
  const parts = [quoteIdentifier(column.name), column.type];
  if (column.primaryKey) parts.push("primary key");
  if (column.notNull) parts.push("not null");
  if (column.unique) parts.push("unique");
  if (column.defaultSql) parts.push("default", column.defaultSql);
  if (column.references) parts.push(renderColumnReference(column.references));
  for (const checkSql of column.checks ?? []) parts.push(`check (${checkSql})`);
  return parts.join(" ");
};

export const renderCommunityCreateTableSql = (table: DbTableSpec): string => {
  const body = [
    ...table.columns.map(renderCommunityColumnSql),
    ...(table.constraints ?? []),
  ]
    .map((line) => `  ${line}`)
    .join(",\n");
  return [
    `create table if not exists ${quoteIdentifier(table.name)} (`,
    body,
    ");",
  ].join("\n");
};

export const renderCommunityCreateIndexSql = (index: DbIndexSpec): string => {
  const unique = index.unique ? "unique " : "";
  const method = index.method ? ` using ${index.method}` : "";
  const columns = index.columns.map(quoteIdentifier).join(", ");
  const where = index.whereSql ? ` where ${index.whereSql}` : "";
  return `create ${unique}index if not exists ${quoteIdentifier(index.name)} on ${quoteIdentifier(index.table)}${method} (${columns})${where};`;
};

export const renderCommunityPolicySql = (policy: DbPolicySpec): string => {
  const command = policy.command.toUpperCase();
  const usingSql = policy.usingSql ? `\n  using (${policy.usingSql})` : "";
  const checkSql = policy.checkSql ? `\n  with check (${policy.checkSql})` : "";
  return `create policy ${quoteIdentifier(policy.name)} on ${quoteIdentifier(policy.table)} for ${command} to ${policy.role}${usingSql}${checkSql};`;
};

export const communitySchemaDdl = Object.freeze({
  extensions: ["create extension if not exists pgcrypto;"],
  tables: communitySchemaTables.map(renderCommunityCreateTableSql),
  indexes: communitySchemaIndexes.map(renderCommunityCreateIndexSql),
  rls: communitySchemaTables.map(
    (table) =>
      `alter table ${quoteIdentifier(table.name)} enable row level security;`,
  ),
  policies: communitySchemaPolicies.map(renderCommunityPolicySql),
});

export const communitySchemaRequiredTableNames = [
  "community_boards",
  "community_posts",
  "community_comments",
  "community_post_attachments",
  "community_tags",
  "community_post_tags",
  "community_reactions",
  "community_bookmarks",
  "community_shares",
  "community_reports",
  "community_moderation_actions",
  "community_user_sanctions",
  "community_post_metrics_daily",
  "community_idempotency_records",
  "community_audit_events",
] as const;

export type CommunityTableName =
  (typeof communitySchemaRequiredTableNames)[number];

const getTable = (name: CommunityTableName): DbTableSpec | undefined =>
  communitySchemaTables.find((table) => table.name === name);

const getColumnNames = (tableName: CommunityTableName): Set<string> =>
  new Set(getTable(tableName)?.columns.map((column) => column.name) ?? []);

export const getCommunitySchemaCompletenessReport =
  (): CommunitySchemaCompletenessReport => {
    const tableNames = new Set(
      communitySchemaTables.map((table) => table.name),
    );
    const policyTables = new Set<string>(
      communitySchemaPolicies.map((policy) => policy.table),
    );
    const missing: string[] = [];

    for (const requiredTableName of communitySchemaRequiredTableNames) {
      if (!tableNames.has(requiredTableName))
        missing.push(`missing table: ${requiredTableName}`);
    }

    for (const table of communitySchemaTables) {
      if (table.containsFinancialSourceData !== false)
        missing.push(`financial source data flag must be false: ${table.name}`);
      if (table.containsRawToken !== false)
        missing.push(`raw token flag must be false: ${table.name}`);
      if (table.containsRawSecret !== false)
        missing.push(`raw secret flag must be false: ${table.name}`);
      if (table.containsRawPii !== false)
        missing.push(`raw pii flag must be false: ${table.name}`);
      if (table.rlsRequired !== true)
        missing.push(`RLS must be required: ${table.name}`);
      if (table.auditRequired !== true)
        missing.push(`audit must be required: ${table.name}`);
      if (table.serverAuthorityRequired !== true)
        missing.push(`server authority must be required: ${table.name}`);
      if (!policyTables.has(table.name))
        missing.push(`missing policy coverage: ${table.name}`);
    }

    for (const tableName of communitySchemaRequiredTableNames) {
      const columns = getColumnNames(tableName);
      for (const safetyColumn of safetyFlagColumns) {
        if (!columns.has(safetyColumn.name))
          missing.push(
            `missing safety column ${safetyColumn.name} on ${tableName}`,
          );
      }
    }

    const postColumns = getColumnNames("community_posts");
    for (const required of [
      "post_id",
      "board_id",
      "author_id",
      "is_anonymous",
      "is_question",
      "title",
      "body",
      "status",
      "visibility",
      "view_count",
      "like_count",
      "comment_count",
      "share_count",
      "report_count",
      "idempotency_key",
      "deleted_at",
    ] as const) {
      if (!postColumns.has(required))
        missing.push(`missing community_posts column: ${required}`);
    }

    const commentColumns = getColumnNames("community_comments");
    for (const required of [
      "comment_id",
      "post_id",
      "parent_comment_id",
      "author_id",
      "is_anonymous",
      "body",
      "status",
      "like_count",
      "report_count",
      "idempotency_key",
      "deleted_at",
    ] as const) {
      if (!commentColumns.has(required))
        missing.push(`missing community_comments column: ${required}`);
    }

    const reportColumns = getColumnNames("community_reports");
    for (const required of [
      "report_id",
      "target_type",
      "target_id",
      "reporter_id",
      "reason",
      "status",
      "resolved_by",
      "resolved_at",
      "idempotency_key",
    ] as const) {
      if (!reportColumns.has(required))
        missing.push(`missing community_reports column: ${required}`);
    }

    if (
      !communitySchemaIndexes.some(
        (index) => index.name === "idx_community_posts_popular",
      )
    )
      missing.push("missing popular posts index");
    if (
      !communitySchemaIndexes.some(
        (index) => index.name === "idx_community_reports_status_created",
      )
    )
      missing.push("missing reports status index");
    if (
      !communitySchemaIndexes.some(
        (index) => index.name === "idx_community_sanctions_user_status",
      )
    )
      missing.push("missing user sanctions index");

    for (const requiredBoard of communityBoardTypes) {
      if (!communityBoardSeeds.some((seed) => seed.type === requiredBoard))
        missing.push(`missing board seed: ${requiredBoard}`);
    }

    return {
      ok: missing.length === 0,
      tableCount: communitySchemaTables.length,
      indexCount: communitySchemaIndexes.length,
      policyCount: communitySchemaPolicies.length,
      seedCount: communityBoardSeeds.length,
      ddlStatementCount:
        communitySchemaDdl.extensions.length +
        communitySchemaDdl.tables.length +
        communitySchemaDdl.indexes.length +
        communitySchemaDdl.rls.length +
        communitySchemaDdl.policies.length,
      missing,
    };
  };

export const assertCommunitySchemaCompleteness = (): void => {
  const report = getCommunitySchemaCompletenessReport();
  if (!report.ok)
    throw new Error(
      `Community schema is incomplete: ${report.missing.join(", ")}`,
    );
};

assertCommunitySchemaCompleteness();

export const communitySchema = Object.freeze({
  policy: communitySchemaPolicy,
  boardTypes: communityBoardTypes,
  postStatuses: communityPostStatuses,
  commentStatuses: communityCommentStatuses,
  visibilityLevels: communityVisibilityLevels,
  reactionTypes: communityReactionTypes,
  targetTypes: communityTargetTypes,
  reportReasons: communityReportReasons,
  reportStatuses: communityReportStatuses,
  moderationActions: communityModerationActions,
  attachmentScanStatuses: communityAttachmentScanStatuses,
  shareChannels: communityShareChannels,
  sanctionKinds: communitySanctionKinds,
  sanctionStatuses: communitySanctionStatuses,
  auditEventTypes: communityAuditEventTypes,
  idempotencyRecordStatuses,
  tables: communitySchemaTables,
  indexes: communitySchemaIndexes,
  policies: communitySchemaPolicies,
  boardSeeds: communityBoardSeeds,
  ddl: communitySchemaDdl,
  getCompletenessReport: getCommunitySchemaCompletenessReport,
  assertCompleteness: assertCommunitySchemaCompleteness,
});

export default communitySchema;
