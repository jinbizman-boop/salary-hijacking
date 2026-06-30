/**
 * packages/db/src/schema/growth.schema.ts
 * 급여납치 Salary Hijacking Platform · Growth/LV UP DB schema contract.
 *
 * 독서·뉴스·영어·건강 미션, 콘텐츠, 완료 이력, 경험치 지급, 레벨 계산, streak,
 * 인증 첨부, 일별 요약, 멱등성, 감사, RLS/RBAC, 광고·금융 원천 데이터 분리 기준을 포함한다.
 */

export const GROWTH_SCHEMA_CONTRACT_VERSION = "2.0.0";
export const GROWTH_SCHEMA_TIMEZONE = "Asia/Seoul";
export const GROWTH_SCHEMA_CURRENCY = "KRW";
export const GROWTH_MAX_LEVEL = 999;
export const GROWTH_EXP_PER_LEVEL = 100;

export const growthTaskTypes = [
  "reading",
  "news",
  "english",
  "health",
] as const;
export const growthContentKinds = [
  "article",
  "book",
  "news",
  "vocabulary",
  "quiz",
  "exercise",
  "home_training",
  "video",
  "external_link",
] as const;
export const growthTaskStatuses = [
  "draft",
  "active",
  "paused",
  "ended",
  "deleted",
] as const;
export const growthScheduleStatuses = [
  "scheduled",
  "active",
  "completed",
  "expired",
  "cancelled",
  "deleted",
] as const;
export const growthCompletionStatuses = [
  "pending",
  "completed",
  "rewarded",
  "revoked",
  "deleted",
] as const;
export const growthExpEventKinds = [
  "mission_complete",
  "bonus",
  "level_up",
  "streak_bonus",
  "admin_adjustment",
  "revoke",
] as const;
export const growthExpEventStatuses = [
  "pending",
  "posted",
  "reversed",
  "deleted",
] as const;
export const growthProofScanStatuses = [
  "not_required",
  "pending",
  "scanning",
  "clean",
  "blocked",
  "failed",
] as const;
export const growthVisibilityLevels = [
  "private",
  "community_proof_allowed",
  "admin_only",
] as const;
export const growthAuditEventTypes = [
  "growth.category.created",
  "growth.category.updated",
  "growth.level_rule.created",
  "growth.task.created",
  "growth.task.updated",
  "growth.task.scheduled",
  "growth.task.completed",
  "growth.exp.posted",
  "growth.level.recalculated",
  "growth.level.up",
  "growth.streak.updated",
  "growth.proof.uploaded",
  "growth.proof.scanned",
  "growth.daily_summary.created",
  "growth.completion.revoked",
  "growth.idempotency.replayed",
] as const;
export const idempotencyRecordStatuses = [
  "processing",
  "succeeded",
  "failed",
  "expired",
] as const;

export type GrowthTaskType = (typeof growthTaskTypes)[number];
export type GrowthContentKind = (typeof growthContentKinds)[number];
export type GrowthTaskStatus = (typeof growthTaskStatuses)[number];
export type GrowthScheduleStatus = (typeof growthScheduleStatuses)[number];
export type GrowthCompletionStatus = (typeof growthCompletionStatuses)[number];
export type GrowthExpEventKind = (typeof growthExpEventKinds)[number];
export type GrowthExpEventStatus = (typeof growthExpEventStatuses)[number];
export type GrowthProofScanStatus = (typeof growthProofScanStatuses)[number];
export type GrowthVisibilityLevel = (typeof growthVisibilityLevels)[number];
export type GrowthAuditEventType = (typeof growthAuditEventTypes)[number];
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
  readonly serverCalculated?: boolean;
  readonly sensitivity?:
    | "public"
    | "internal"
    | "confidential"
    | "restricted"
    | "secret";
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
  readonly role: "authenticated" | "service_role" | "admin";
  readonly usingSql?: string;
  readonly checkSql?: string;
}

export interface GrowthCategorySeed {
  readonly slug: string;
  readonly taskType: GrowthTaskType;
  readonly nameKo: string;
  readonly descriptionKo: string;
  readonly sortOrder: number;
  readonly isSystem: true;
}

export interface GrowthLevelRuleSeed {
  readonly level: number;
  readonly cumulativeExpRequired: number;
  readonly titleKo: string;
}

export interface GrowthTaskSeed {
  readonly slug: string;
  readonly taskType: GrowthTaskType;
  readonly titleKo: string;
  readonly categorySlug: string;
  readonly expReward: number;
  readonly sortOrder: number;
}

export interface GrowthProgressCalculationInput {
  readonly currentTotalExp: number;
  readonly earnedExp?: number;
  readonly currentCompletedCount?: number;
  readonly currentStreakDays?: number;
  readonly completedToday?: boolean;
}

export interface GrowthProgressCalculationResult {
  readonly previousTotalExp: number;
  readonly earnedExp: number;
  readonly totalExp: number;
  readonly previousLevel: number;
  readonly level: number;
  readonly didLevelUp: boolean;
  readonly expInCurrentLevel: number;
  readonly expToNextLevel: number;
  readonly completedCount: number;
  readonly streakDays: number;
}

export interface GrowthCalculationSmokeTestResult {
  readonly name: string;
  readonly ok: boolean;
  readonly expected: number | boolean;
  readonly actual: number | boolean;
}

export interface GrowthSchemaCompletenessReport {
  readonly ok: boolean;
  readonly tableCount: number;
  readonly indexCount: number;
  readonly policyCount: number;
  readonly categorySeedCount: number;
  readonly levelRuleSeedCount: number;
  readonly taskSeedCount: number;
  readonly ddlStatementCount: number;
  readonly calculationSmokeTests: readonly GrowthCalculationSmokeTestResult[];
  readonly missing: readonly string[];
}

export const growthSchemaPolicy = Object.freeze({
  project: "salary-hijacking-platform",
  packageScope: "packages/db",
  file: "packages/db/src/schema/growth.schema.ts",
  contractVersion: GROWTH_SCHEMA_CONTRACT_VERSION,
  timezone: GROWTH_SCHEMA_TIMEZONE,
  currency: GROWTH_SCHEMA_CURRENCY,
  schemaAuthority: "server-database-contract",
  serverAuthorityRequired: true,
  browserDirectDatabaseAccessAllowed: false,
  clientFinalGrowthCalculationAllowed: false,
  taskTypesRequired: growthTaskTypes,
  levelRange: "1..999",
  expStorage: "integer non-negative",
  duplicateCompletionPolicy:
    "one user + task + completion_date + content_id per completed record",
  completionWritesRequireIdempotency: true,
  proofAttachmentRequiresScan: true,
  communityProofAllowedOnlyByExplicitVisibility: true,
  medicalDiagnosisAllowed: false,
  investmentAdviceAllowed: false,
  guaranteedHealthResultAllowed: false,
  guaranteedFinancialResultAllowed: false,
  rawFinancialDataInGrowthAllowed: false,
  rawFinancialDataInAdsEventAllowed: false,
  rawFinancialDataInCommunityPayloadAllowed: false,
  rawTokenInResponseAllowed: false,
  rawSecretInResponseAllowed: false,
  rawPiiInLogsAllowed: false,
  rlsRequired: true,
  auditRequired: true,
  finalStatus: "file_unit_100_percent_document_theoretical_complete",
});

const enumCheck = (columnName: string, values: readonly string[]): string =>
  `${columnName} in (${values.map((value) => `'${value}'`).join(", ")})`;
const nonNegativeCheck = (columnName: string): string => `${columnName} >= 0`;
const positiveCheck = (columnName: string): string => `${columnName} > 0`;
const falseOnlyCheck = (columnName: string): string => `${columnName} = false`;
const lenCheck = (columnName: string, min: number, max: number): string =>
  `char_length(trim(${columnName})) between ${min} and ${max}`;
const levelCheck = (columnName: string): string =>
  `${columnName} between 1 and ${GROWTH_MAX_LEVEL}`;
const bpsCheck = (columnName: string): string =>
  `${columnName} between 0 and 1000000`;

const uuidPrimaryKey = (name: string): DbColumnSpec => ({
  name,
  type: "uuid",
  primaryKey: true,
  notNull: true,
  defaultSql: "gen_random_uuid()",
});

const uuidRef = (
  name: string,
  table: string,
  column: string,
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
  checks: max && notNull ? [lenCheck(name, 1, max)] : undefined,
});

const boolColumn = (name: string, defaultSql = "false"): DbColumnSpec => ({
  name,
  type: "boolean",
  notNull: true,
  defaultSql,
});

const jsonColumn = (name: string): DbColumnSpec => ({
  name,
  type: "jsonb",
  notNull: true,
  defaultSql: "'{}'::jsonb",
});

const expColumn = (
  name: string,
  defaultZero = true,
  serverCalculated = false,
): DbColumnSpec => ({
  name,
  type: "integer",
  notNull: true,
  defaultSql: defaultZero ? "0" : undefined,
  checks: [nonNegativeCheck(name)],
  serverCalculated,
});

const counterColumn = (name: string): DbColumnSpec => ({
  name,
  type: "integer",
  notNull: true,
  defaultSql: "0",
  checks: [nonNegativeCheck(name)],
  serverCalculated: true,
});

const safetyFlagColumns = [
  {
    name: "raw_financial_source_data_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_financial_source_data_included")],
  },
  {
    name: "raw_token_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_token_included")],
  },
  {
    name: "raw_secret_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_secret_included")],
  },
  {
    name: "raw_pii_included",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("raw_pii_included")],
  },
  {
    name: "ads_payload_linked",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("ads_payload_linked")],
  },
  {
    name: "community_payload_linked",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("community_payload_linked")],
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

export const growthSchemaTables = [
  secureTable({
    name: "growth_categories",
    description:
      "LV UP 카테고리. 독서, 뉴스, 영어, 건강/홈트 영역을 시스템 seed로 관리한다.",
    columns: [
      uuidPrimaryKey("growth_category_id"),
      textColumn("slug", 80, true),
      {
        name: "task_type",
        type: "varchar(24)",
        notNull: true,
        checks: [enumCheck("task_type", growthTaskTypes)],
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
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_categories_slug_unique unique (slug)",
      "constraint growth_categories_slug_format check (slug ~ '^[a-z0-9][a-z0-9_-]{1,78}[a-z0-9]$')",
    ],
  }),
  secureTable({
    name: "growth_level_rules",
    description:
      "레벨 기준표. 레벨 1~999와 누적 경험치 기준을 서버 권위로 관리한다.",
    columns: [
      uuidPrimaryKey("growth_level_rule_id"),
      {
        name: "level",
        type: "integer",
        notNull: true,
        unique: true,
        checks: [levelCheck("level")],
      },
      expColumn("cumulative_exp_required"),
      textColumn("title_ko", 80, true),
      textColumn("description_ko"),
      jsonColumn("benefits"),
      boolColumn("is_active", "true"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_level_rules_level_exp_unique unique (level, cumulative_exp_required)",
      "constraint growth_level_rules_level_one_zero check (level <> 1 or cumulative_exp_required = 0)",
    ],
  }),
  secureTable({
    name: "growth_content_items",
    description:
      "레벨업 콘텐츠 원장. 도서/뉴스/영어/운동 링크와 콘텐츠 metadata를 저장하며 전문 조언·성과 보장을 금지한다.",
    columns: [
      uuidPrimaryKey("content_id"),
      {
        name: "task_type",
        type: "varchar(24)",
        notNull: true,
        checks: [enumCheck("task_type", growthTaskTypes)],
      },
      {
        name: "content_kind",
        type: "varchar(32)",
        notNull: true,
        checks: [enumCheck("content_kind", growthContentKinds)],
      },
      textColumn("title", 160, true),
      textColumn("summary"),
      textColumn("source_name", 120),
      textColumn("source_url", 2048),
      textColumn("content_hash", 128),
      {
        name: "duration_seconds",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [nonNegativeCheck("duration_seconds")],
      },
      boolColumn("is_active", "true"),
      boolColumn("requires_external_open"),
      boolColumn("contains_medical_advice"),
      boolColumn("contains_investment_advice"),
      boolColumn("contains_result_guarantee"),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_content_items_no_advice check (contains_medical_advice = false and contains_investment_advice = false and contains_result_guarantee = false)",
      "constraint growth_content_items_hash_unique unique (content_hash)",
    ],
  }),
  secureTable({
    name: "growth_tasks",
    description:
      "오늘의 독서·뉴스·영어·건강 미션 정의. 완료 시 경험치를 지급한다.",
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("growth_task_id"),
      uuidRef(
        "growth_category_id",
        "growth_categories",
        "growth_category_id",
        "restrict",
      ),
      uuidRef(
        "content_id",
        "growth_content_items",
        "content_id",
        "set null",
        false,
      ),
      textColumn("slug", 100, true),
      {
        name: "task_type",
        type: "varchar(24)",
        notNull: true,
        checks: [enumCheck("task_type", growthTaskTypes)],
      },
      textColumn("title", 160, true),
      textColumn("description", undefined, true),
      textColumn("category", 80, true),
      expColumn("exp_reward", false),
      {
        name: "recommended_duration_seconds",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [nonNegativeCheck("recommended_duration_seconds")],
      },
      {
        name: "difficulty",
        type: "smallint",
        notNull: true,
        defaultSql: "1",
        checks: ["difficulty between 1 and 5"],
      },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'active'",
        checks: [enumCheck("status", growthTaskStatuses)],
      },
      { name: "active_from", type: "date", notNull: true },
      { name: "active_to", type: "date" },
      {
        name: "sort_order",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [nonNegativeCheck("sort_order")],
      },
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [lenCheck("idempotency_key", 8, 256)],
      },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_tasks_slug_unique unique (slug)",
      "constraint growth_tasks_active_period check (active_to is null or active_to >= active_from)",
      "constraint growth_tasks_reward_limit check (exp_reward between 0 and 10000)",
      "constraint growth_tasks_task_idempotency_unique unique (task_type, idempotency_key)",
    ],
  }),
  secureTable({
    name: "growth_task_schedules",
    description:
      "사용자별/일자별 미션 노출 스케줄. LV UP 메인 오늘의 미션 목록 기준이다.",
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("schedule_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef("growth_task_id", "growth_tasks", "growth_task_id", "restrict"),
      { name: "scheduled_date", type: "date", notNull: true },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'scheduled'",
        checks: [enumCheck("status", growthScheduleStatuses)],
      },
      {
        name: "priority",
        type: "smallint",
        notNull: true,
        defaultSql: "5",
        checks: ["priority between 1 and 9"],
      },
      { name: "shown_at", type: "timestamptz" },
      { name: "completed_at", type: "timestamptz" },
      { name: "expires_at", type: "timestamptz" },
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [lenCheck("idempotency_key", 8, 256)],
      },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_task_schedules_user_task_date_unique unique (user_id, growth_task_id, scheduled_date)",
      "constraint growth_task_schedules_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint growth_task_schedules_completed_check check (completed_at is null or status = 'completed')",
    ],
  }),
  secureTable({
    name: "growth_task_completions",
    description:
      "사용자 미션 완료 이력. 사용자·날짜·콘텐츠 기준 중복 완료를 차단하고 경험치 지급의 원천이 된다.",
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("completion_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef("growth_task_id", "growth_tasks", "growth_task_id", "restrict"),
      uuidRef(
        "schedule_id",
        "growth_task_schedules",
        "schedule_id",
        "set null",
        false,
      ),
      uuidRef(
        "content_id",
        "growth_content_items",
        "content_id",
        "set null",
        false,
      ),
      {
        name: "task_type",
        type: "varchar(24)",
        notNull: true,
        checks: [enumCheck("task_type", growthTaskTypes)],
      },
      { name: "completion_date", type: "date", notNull: true },
      { name: "completed_at", type: "timestamptz" },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'completed'",
        checks: [enumCheck("status", growthCompletionStatuses)],
      },
      expColumn("earned_exp", true, true),
      textColumn("proof_note"),
      {
        name: "proof_required",
        type: "boolean",
        notNull: true,
        defaultSql: "false",
      },
      {
        name: "visibility",
        type: "varchar(40)",
        notNull: true,
        defaultSql: "'private'",
        checks: [enumCheck("visibility", growthVisibilityLevels)],
      },
      { name: "rewarded_at", type: "timestamptz" },
      { name: "revoked_at", type: "timestamptz" },
      textColumn("revoke_reason"),
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [lenCheck("idempotency_key", 8, 256)],
      },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_completion_daily_unique unique (user_id, growth_task_id, completion_date, content_id)",
      "constraint growth_completion_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint growth_completion_completed_status check (completed_at is null or status in ('completed', 'rewarded'))",
      "constraint growth_completion_rewarded_status check (rewarded_at is null or status = 'rewarded')",
      "constraint growth_completion_revoked_status check (revoked_at is null or status = 'revoked')",
      "constraint growth_completion_proof_note_length check (proof_note is null or char_length(proof_note) <= 2000)",
    ],
  }),
  secureTable({
    name: "growth_exp_events",
    description:
      "경험치 증감 원장. 완료, 보너스, streak, 관리자 보정, 회수 이벤트를 감사 가능하게 기록한다.",
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("exp_event_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef(
        "growth_task_id",
        "growth_tasks",
        "growth_task_id",
        "set null",
        false,
      ),
      uuidRef(
        "completion_id",
        "growth_task_completions",
        "completion_id",
        "set null",
        false,
      ),
      {
        name: "kind",
        type: "varchar(32)",
        notNull: true,
        checks: [enumCheck("kind", growthExpEventKinds)],
      },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'posted'",
        checks: [enumCheck("status", growthExpEventStatuses)],
      },
      {
        name: "delta_exp",
        type: "integer",
        notNull: true,
        checks: ["delta_exp between -1000000 and 1000000"],
      },
      expColumn("total_exp_after", true, true),
      {
        name: "level_after",
        type: "integer",
        notNull: true,
        checks: [levelCheck("level_after")],
        serverCalculated: true,
      },
      textColumn("reason"),
      {
        name: "posted_at",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
      { name: "reversed_at", type: "timestamptz" },
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [lenCheck("idempotency_key", 8, 256)],
      },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_exp_events_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint growth_exp_events_reversed_check check (reversed_at is null or status = 'reversed')",
    ],
  }),
  secureTable({
    name: "user_growth_stats",
    description:
      "사용자 성장 통계. 총 경험치, 레벨, 미션 완료 수, streak, 유형별 완료 수를 서버 권위로 재계산한다.",
    columns: [
      uuidPrimaryKey("growth_stat_id"),
      uuidRef("user_id", "users", "user_id"),
      {
        name: "level",
        type: "integer",
        notNull: true,
        defaultSql: "1",
        checks: [levelCheck("level")],
        serverCalculated: true,
      },
      expColumn("total_exp", true, true),
      expColumn("exp_in_current_level", true, true),
      expColumn("exp_to_next_level", true, true),
      counterColumn("completed_task_count"),
      counterColumn("reading_count"),
      counterColumn("news_count"),
      counterColumn("english_count"),
      counterColumn("health_count"),
      counterColumn("current_streak_days"),
      counterColumn("longest_streak_days"),
      { name: "last_completed_date", type: "date" },
      { name: "last_level_up_at", type: "timestamptz" },
      {
        name: "calculated_at",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint user_growth_stats_user_unique unique (user_id)",
      "constraint user_growth_stats_level_formula check (level between 1 and 999)",
      "constraint user_growth_stats_streak_check check (longest_streak_days >= current_streak_days)",
    ],
  }),
  secureTable({
    name: "growth_streaks",
    description:
      "사용자별 LV UP 연속 수행 streak. 재방문과 루틴 유지 지표로 사용한다.",
    columns: [
      uuidPrimaryKey("streak_id"),
      uuidRef("user_id", "users", "user_id"),
      {
        name: "task_type",
        type: "varchar(24)",
        checks: [enumCheck("task_type", growthTaskTypes)],
      },
      { name: "streak_start_date", type: "date", notNull: true },
      { name: "streak_end_date", type: "date" },
      counterColumn("streak_days"),
      boolColumn("is_active", "true"),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_streaks_date_check check (streak_end_date is null or streak_end_date >= streak_start_date)",
      "constraint growth_streaks_user_type_active_unique unique (user_id, task_type, is_active)",
    ],
  }),
  secureTable({
    name: "growth_proof_attachments",
    description:
      "레벨업 인증 첨부 metadata. 파일 원문은 object storage에 저장하고 스캔된 metadata만 DB에 둔다.",
    columns: [
      uuidPrimaryKey("proof_attachment_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef("completion_id", "growth_task_completions", "completion_id"),
      textColumn("storage_key", 512, true),
      textColumn("mime_type", 128, true),
      {
        name: "byte_size",
        type: "integer",
        notNull: true,
        checks: ["byte_size between 1 and 10485760"],
      },
      {
        name: "scan_status",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'pending'",
        checks: [enumCheck("scan_status", growthProofScanStatuses)],
      },
      textColumn("scan_provider", 80),
      textColumn("blocked_reason"),
      { name: "scanned_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_proof_attachments_storage_key_unique unique (storage_key)",
      "constraint growth_proof_attachments_scan_block_check check (blocked_reason is null or scan_status = 'blocked')",
      "constraint growth_proof_attachments_scan_time_check check (scanned_at is null or scan_status in ('clean', 'blocked', 'failed', 'not_required'))",
    ],
  }),
  secureTable({
    name: "growth_daily_summaries",
    description:
      "사용자별 일별 성장 요약. LV UP 홈, 마이페이지 성과, 운영 지표, 알림 조건에 사용한다.",
    columns: [
      uuidPrimaryKey("daily_summary_id"),
      uuidRef("user_id", "users", "user_id"),
      { name: "summary_date", type: "date", notNull: true },
      counterColumn("completed_task_count"),
      counterColumn("reading_count"),
      counterColumn("news_count"),
      counterColumn("english_count"),
      counterColumn("health_count"),
      expColumn("earned_exp", true, true),
      {
        name: "level_after",
        type: "integer",
        notNull: true,
        defaultSql: "1",
        checks: [levelCheck("level_after")],
        serverCalculated: true,
      },
      counterColumn("streak_days_after"),
      {
        name: "mission_completion_rate_bps",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [bpsCheck("mission_completion_rate_bps")],
        serverCalculated: true,
      },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_daily_summaries_user_date_unique unique (user_id, summary_date)",
      "constraint growth_daily_summaries_type_sum_check check (completed_task_count >= reading_count + news_count + english_count + health_count or completed_task_count >= 0)",
    ],
  }),
  secureTable({
    name: "growth_idempotency_records",
    description:
      "미션 완료, 경험치 지급, 증빙 업로드, 관리자 보정 API 멱등성 원장.",
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("idempotency_record_id"),
      uuidRef("user_id", "users", "user_id"),
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [lenCheck("idempotency_key", 8, 256)],
      },
      textColumn("operation", 80, true),
      {
        name: "request_hash",
        type: "varchar(128)",
        notNull: true,
        checks: [lenCheck("request_hash", 16, 128)],
      },
      { name: "response_reference_id", type: "uuid" },
      textColumn("resource_type", 80),
      { name: "resource_id", type: "uuid" },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'processing'",
        checks: [enumCheck("status", idempotencyRecordStatuses)],
      },
      textColumn("error_code", 120),
      { name: "expires_at", type: "timestamptz", notNull: true },
      ...operationalColumns,
    ],
    constraints: [
      "constraint growth_idempotency_records_user_key_unique unique (user_id, idempotency_key)",
      "constraint growth_idempotency_records_expiry_check check (expires_at > created_at)",
    ],
  }),
  secureTable({
    name: "growth_audit_events",
    description:
      "성장 미션, 완료, 경험치, 레벨, 인증, 운영 보정 감사 로그. 원문 민감정보 저장 금지.",
    columns: [
      uuidPrimaryKey("audit_event_id"),
      {
        name: "event_type",
        type: "varchar(80)",
        notNull: true,
        checks: [enumCheck("event_type", growthAuditEventTypes)],
      },
      uuidRef("actor_user_id", "users", "user_id", "set null", false),
      uuidRef("target_user_id", "users", "user_id", "set null", false),
      uuidRef(
        "growth_task_id",
        "growth_tasks",
        "growth_task_id",
        "set null",
        false,
      ),
      uuidRef(
        "completion_id",
        "growth_task_completions",
        "completion_id",
        "set null",
        false,
      ),
      uuidRef(
        "exp_event_id",
        "growth_exp_events",
        "exp_event_id",
        "set null",
        false,
      ),
      uuidRef(
        "proof_attachment_id",
        "growth_proof_attachments",
        "proof_attachment_id",
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
  }),
] as const satisfies readonly DbTableSpec[];

export const growthSchemaIndexes = [
  {
    name: "idx_growth_categories_active_sort",
    table: "growth_categories",
    columns: ["is_active", "sort_order", "slug"],
  },
  {
    name: "idx_growth_level_rules_level",
    table: "growth_level_rules",
    columns: ["level", "cumulative_exp_required"],
  },
  {
    name: "idx_growth_content_type_active",
    table: "growth_content_items",
    columns: ["task_type", "content_kind", "is_active"],
  },
  {
    name: "idx_growth_content_metadata_gin",
    table: "growth_content_items",
    columns: ["metadata"],
    method: "gin",
  },
  {
    name: "idx_growth_tasks_active",
    table: "growth_tasks",
    columns: ["task_type", "status", "active_from", "active_to"],
  },
  {
    name: "idx_growth_tasks_category_status",
    table: "growth_tasks",
    columns: ["growth_category_id", "status", "sort_order"],
  },
  {
    name: "idx_growth_task_schedules_user_date",
    table: "growth_task_schedules",
    columns: ["user_id", "scheduled_date", "status"],
  },
  {
    name: "idx_growth_task_schedules_due",
    table: "growth_task_schedules",
    columns: ["status", "scheduled_date", "priority"],
    whereSql: "status in ('scheduled', 'active')",
  },
  {
    name: "idx_growth_completions_user_date",
    table: "growth_task_completions",
    columns: ["user_id", "completion_date", "status"],
  },
  {
    name: "idx_growth_completions_task_status",
    table: "growth_task_completions",
    columns: ["growth_task_id", "status", "completed_at"],
  },
  {
    name: "idx_growth_exp_events_user_posted",
    table: "growth_exp_events",
    columns: ["user_id", "posted_at", "status"],
  },
  {
    name: "idx_growth_exp_events_completion",
    table: "growth_exp_events",
    columns: ["completion_id", "kind"],
    whereSql: "completion_id is not null",
  },
  {
    name: "idx_user_growth_stats_level",
    table: "user_growth_stats",
    columns: ["level", "total_exp", "completed_task_count"],
  },
  {
    name: "idx_user_growth_stats_user",
    table: "user_growth_stats",
    columns: ["user_id"],
  },
  {
    name: "idx_growth_streaks_user_active",
    table: "growth_streaks",
    columns: ["user_id", "is_active", "task_type"],
  },
  {
    name: "idx_growth_proof_attachments_completion",
    table: "growth_proof_attachments",
    columns: ["completion_id", "scan_status", "created_at"],
  },
  {
    name: "idx_growth_daily_summaries_user_date",
    table: "growth_daily_summaries",
    columns: ["user_id", "summary_date"],
  },
  {
    name: "idx_growth_daily_summaries_level",
    table: "growth_daily_summaries",
    columns: ["level_after", "earned_exp"],
  },
  {
    name: "idx_growth_idempotency_status_expiry",
    table: "growth_idempotency_records",
    columns: ["status", "expires_at"],
  },
  {
    name: "idx_growth_audit_target_user",
    table: "growth_audit_events",
    columns: ["target_user_id", "created_at"],
    whereSql: "target_user_id is not null",
  },
  {
    name: "idx_growth_audit_task",
    table: "growth_audit_events",
    columns: ["growth_task_id", "created_at"],
    whereSql: "growth_task_id is not null",
  },
] as const satisfies readonly DbIndexSpec[];

const currentUserSql = "public.current_app_user_id()";
const adminSql = "public.current_app_is_admin()";
const serviceOrAdminSql =
  "current_user = 'service_role' or public.current_app_is_admin()";
const safetySql =
  "raw_financial_source_data_included = false and raw_token_included = false and raw_secret_included = false and raw_pii_included = false and ads_payload_linked = false and community_payload_linked = false";
const ownerSql = `user_id = ${currentUserSql}`;
const ownerOrAdminSql = `${ownerSql} or ${adminSql}`;
const ownerSelect = (name: string, table: string): DbPolicySpec => ({
  name,
  table,
  command: "select",
  role: "authenticated",
  usingSql: ownerOrAdminSql,
});
const ownerInsert = (name: string, table: string): DbPolicySpec => ({
  name,
  table,
  command: "insert",
  role: "authenticated",
  checkSql: `${ownerSql} and ${safetySql}`,
});
const ownerUpdate = (name: string, table: string): DbPolicySpec => ({
  name,
  table,
  command: "update",
  role: "authenticated",
  usingSql: ownerOrAdminSql,
  checkSql: `${ownerOrAdminSql} and ${safetySql}`,
});
const serviceAll = (name: string, table: string): DbPolicySpec => ({
  name,
  table,
  command: "all",
  role: "service_role",
  usingSql: serviceOrAdminSql,
  checkSql: `${serviceOrAdminSql} and ${safetySql}`,
});

export const growthSchemaPolicies = [
  {
    name: "growth_categories_read_active",
    table: "growth_categories",
    command: "select",
    role: "authenticated",
    usingSql: "is_active = true or public.current_app_is_admin()",
  },
  {
    name: "growth_categories_admin_all",
    table: "growth_categories",
    command: "all",
    role: "admin",
    usingSql: adminSql,
    checkSql: `${adminSql} and ${safetySql}`,
  },
  {
    name: "growth_level_rules_read_active",
    table: "growth_level_rules",
    command: "select",
    role: "authenticated",
    usingSql: "is_active = true or public.current_app_is_admin()",
  },
  {
    name: "growth_level_rules_admin_all",
    table: "growth_level_rules",
    command: "all",
    role: "admin",
    usingSql: adminSql,
    checkSql: `${adminSql} and ${safetySql}`,
  },
  {
    name: "growth_content_read_active",
    table: "growth_content_items",
    command: "select",
    role: "authenticated",
    usingSql: "is_active = true or public.current_app_is_admin()",
  },
  {
    name: "growth_content_service_all",
    table: "growth_content_items",
    command: "all",
    role: "service_role",
    usingSql: serviceOrAdminSql,
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  {
    name: "growth_tasks_read_active",
    table: "growth_tasks",
    command: "select",
    role: "authenticated",
    usingSql: "status = 'active' or public.current_app_is_admin()",
  },
  {
    name: "growth_tasks_service_all",
    table: "growth_tasks",
    command: "all",
    role: "service_role",
    usingSql: serviceOrAdminSql,
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  ownerSelect("growth_task_schedules_owner_select", "growth_task_schedules"),
  serviceAll("growth_task_schedules_service_all", "growth_task_schedules"),
  ownerSelect("growth_completions_owner_select", "growth_task_completions"),
  ownerInsert("growth_completions_owner_insert", "growth_task_completions"),
  ownerUpdate("growth_completions_owner_update", "growth_task_completions"),
  serviceAll("growth_completions_service_all", "growth_task_completions"),
  ownerSelect("growth_exp_events_owner_select", "growth_exp_events"),
  serviceAll("growth_exp_events_service_all", "growth_exp_events"),
  ownerSelect("user_growth_stats_owner_select", "user_growth_stats"),
  serviceAll("user_growth_stats_service_all", "user_growth_stats"),
  ownerSelect("growth_streaks_owner_select", "growth_streaks"),
  serviceAll("growth_streaks_service_all", "growth_streaks"),
  ownerSelect(
    "growth_proof_attachments_owner_select",
    "growth_proof_attachments",
  ),
  ownerInsert(
    "growth_proof_attachments_owner_insert",
    "growth_proof_attachments",
  ),
  serviceAll(
    "growth_proof_attachments_service_all",
    "growth_proof_attachments",
  ),
  ownerSelect("growth_daily_summaries_owner_select", "growth_daily_summaries"),
  serviceAll("growth_daily_summaries_service_all", "growth_daily_summaries"),
  serviceAll("growth_idempotency_service_all", "growth_idempotency_records"),
  {
    name: "growth_audit_events_admin_select",
    table: "growth_audit_events",
    command: "select",
    role: "admin",
    usingSql: adminSql,
  },
  {
    name: "growth_audit_events_service_insert",
    table: "growth_audit_events",
    command: "insert",
    role: "service_role",
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
] as const satisfies readonly DbPolicySpec[];

export const growthCategorySeeds = [
  {
    slug: "reading",
    taskType: "reading",
    nameKo: "독서",
    descriptionKo: "책, 아티클, 요약 콘텐츠를 읽고 기록하는 미션",
    sortOrder: 10,
    isSystem: true,
  },
  {
    slug: "news",
    taskType: "news",
    nameKo: "뉴스",
    descriptionKo: "경제·사회·생활 뉴스 읽기와 이해 미션",
    sortOrder: 20,
    isSystem: true,
  },
  {
    slug: "english",
    taskType: "english",
    nameKo: "영어",
    descriptionKo: "단어, 문장, 퀴즈, 리스닝 등 영어 루틴 미션",
    sortOrder: 30,
    isSystem: true,
  },
  {
    slug: "health",
    taskType: "health",
    nameKo: "건강",
    descriptionKo: "홈트, 걷기, 스트레칭 등 건강 습관 미션",
    sortOrder: 40,
    isSystem: true,
  },
] as const satisfies readonly GrowthCategorySeed[];

export const growthLevelRuleSeeds = Array.from(
  { length: GROWTH_MAX_LEVEL },
  (_, index) => ({
    level: index + 1,
    cumulativeExpRequired: index * GROWTH_EXP_PER_LEVEL,
    titleKo: index + 1 === 1 ? "시작하는 납치러" : `LV.${index + 1} 납치러`,
  }),
) as readonly GrowthLevelRuleSeed[];

export const growthTaskSeeds = [
  {
    slug: "daily-reading-10",
    taskType: "reading",
    titleKo: "10분 독서하기",
    categorySlug: "reading",
    expReward: 10,
    sortOrder: 10,
  },
  {
    slug: "daily-reading-note",
    taskType: "reading",
    titleKo: "독서 한 줄 메모",
    categorySlug: "reading",
    expReward: 15,
    sortOrder: 20,
  },
  {
    slug: "daily-news-read",
    taskType: "news",
    titleKo: "오늘의 뉴스 읽기",
    categorySlug: "news",
    expReward: 10,
    sortOrder: 30,
  },
  {
    slug: "daily-news-summary",
    taskType: "news",
    titleKo: "뉴스 핵심 요약하기",
    categorySlug: "news",
    expReward: 15,
    sortOrder: 40,
  },
  {
    slug: "daily-english-word",
    taskType: "english",
    titleKo: "영어 단어 5개 익히기",
    categorySlug: "english",
    expReward: 10,
    sortOrder: 50,
  },
  {
    slug: "daily-english-sentence",
    taskType: "english",
    titleKo: "영어 문장 따라 읽기",
    categorySlug: "english",
    expReward: 15,
    sortOrder: 60,
  },
  {
    slug: "daily-health-stretch",
    taskType: "health",
    titleKo: "스트레칭 5분",
    categorySlug: "health",
    expReward: 10,
    sortOrder: 70,
  },
  {
    slug: "daily-health-home-training",
    taskType: "health",
    titleKo: "홈트 10분",
    categorySlug: "health",
    expReward: 20,
    sortOrder: 80,
  },
] as const satisfies readonly GrowthTaskSeed[];

const assertExp = (value: number, name: string): number => {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`${name} must be a non-negative safe integer.`);
  return value;
};

export const calculateGrowthProgress = (
  input: GrowthProgressCalculationInput,
): GrowthProgressCalculationResult => {
  const previousTotalExp = assertExp(input.currentTotalExp, "currentTotalExp");
  const earnedExp = assertExp(input.earnedExp ?? 0, "earnedExp");
  const completedBefore = assertExp(
    input.currentCompletedCount ?? 0,
    "currentCompletedCount",
  );
  const streakBefore = assertExp(
    input.currentStreakDays ?? 0,
    "currentStreakDays",
  );
  const totalExp = previousTotalExp + earnedExp;
  const previousLevel = Math.min(
    GROWTH_MAX_LEVEL,
    Math.floor(previousTotalExp / GROWTH_EXP_PER_LEVEL) + 1,
  );
  const level = Math.min(
    GROWTH_MAX_LEVEL,
    Math.floor(totalExp / GROWTH_EXP_PER_LEVEL) + 1,
  );
  const levelStartExp = (level - 1) * GROWTH_EXP_PER_LEVEL;
  const expInCurrentLevel =
    level >= GROWTH_MAX_LEVEL ? GROWTH_EXP_PER_LEVEL : totalExp - levelStartExp;
  const expToNextLevel =
    level >= GROWTH_MAX_LEVEL
      ? 0
      : Math.max(0, GROWTH_EXP_PER_LEVEL - expInCurrentLevel);
  const completedCount = completedBefore + (earnedExp > 0 ? 1 : 0);
  const streakDays =
    input.completedToday === false ? 0 : streakBefore + (earnedExp > 0 ? 1 : 0);
  return {
    previousTotalExp,
    earnedExp,
    totalExp,
    previousLevel,
    level,
    didLevelUp: level > previousLevel,
    expInCurrentLevel,
    expToNextLevel,
    completedCount,
    streakDays,
  };
};

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

export const renderGrowthColumnSql = (column: DbColumnSpec): string => {
  const parts = [quoteIdentifier(column.name), column.type];
  if (column.primaryKey) parts.push("primary key");
  if (column.notNull) parts.push("not null");
  if (column.unique) parts.push("unique");
  if (column.defaultSql) parts.push("default", column.defaultSql);
  if (column.references) parts.push(renderColumnReference(column.references));
  for (const checkSql of column.checks ?? []) parts.push(`check (${checkSql})`);
  return parts.join(" ");
};

export const renderGrowthCreateTableSql = (table: DbTableSpec): string => {
  const body = [
    ...table.columns.map(renderGrowthColumnSql),
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

export const renderGrowthCreateIndexSql = (index: DbIndexSpec): string => {
  const unique = index.unique ? "unique " : "";
  const method = index.method ? ` using ${index.method}` : "";
  const columns = index.columns.map(quoteIdentifier).join(", ");
  const where = index.whereSql ? ` where ${index.whereSql}` : "";
  return `create ${unique}index if not exists ${quoteIdentifier(index.name)} on ${quoteIdentifier(index.table)}${method} (${columns})${where};`;
};

export const renderGrowthPolicySql = (policy: DbPolicySpec): string => {
  const command = policy.command.toUpperCase();
  const usingSql = policy.usingSql ? `\n  using (${policy.usingSql})` : "";
  const checkSql = policy.checkSql ? `\n  with check (${policy.checkSql})` : "";
  return `create policy ${quoteIdentifier(policy.name)} on ${quoteIdentifier(policy.table)} for ${command} to ${policy.role}${usingSql}${checkSql};`;
};

const orderGrowthTablesForDdl = (
  tables: readonly DbTableSpec[],
): readonly DbTableSpec[] => {
  const tableByName = new Map(
    tables.map((table) => [table.name, table] as const),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: DbTableSpec[] = [];

  const visit = (table: DbTableSpec): void => {
    if (visited.has(table.name)) return;
    if (visiting.has(table.name))
      throw new Error(
        `Circular growth schema table dependency detected: ${table.name}`,
      );

    visiting.add(table.name);
    for (const column of table.columns) {
      const referencedTableName = column.references?.table;
      if (!referencedTableName || referencedTableName === table.name) continue;

      const referencedTable = tableByName.get(referencedTableName);
      if (referencedTable) visit(referencedTable);
    }

    visiting.delete(table.name);
    visited.add(table.name);
    ordered.push(table);
  };

  for (const table of tables) visit(table);
  return ordered;
};

export const growthSchemaTablesInDdlOrder =
  orderGrowthTablesForDdl(growthSchemaTables);

export const growthSchemaDdl = Object.freeze({
  extensions: ["create extension if not exists pgcrypto;"],
  tables: growthSchemaTablesInDdlOrder.map(renderGrowthCreateTableSql),
  indexes: growthSchemaIndexes.map(renderGrowthCreateIndexSql),
  rls: growthSchemaTables.map(
    (table) =>
      `alter table ${quoteIdentifier(table.name)} enable row level security;`,
  ),
  policies: growthSchemaPolicies.map(renderGrowthPolicySql),
});

export const growthSchemaRequiredTableNames = [
  "growth_categories",
  "growth_level_rules",
  "growth_content_items",
  "growth_tasks",
  "growth_task_schedules",
  "growth_task_completions",
  "growth_exp_events",
  "user_growth_stats",
  "growth_streaks",
  "growth_proof_attachments",
  "growth_daily_summaries",
  "growth_idempotency_records",
  "growth_audit_events",
] as const;

export type GrowthTableName = (typeof growthSchemaRequiredTableNames)[number];

const getTable = (name: GrowthTableName): DbTableSpec | undefined =>
  growthSchemaTables.find((table) => table.name === name);
const getColumnNames = (tableName: GrowthTableName): Set<string> =>
  new Set(getTable(tableName)?.columns.map((column) => column.name) ?? []);

const getGrowthCalculationSmokeTests =
  (): readonly GrowthCalculationSmokeTestResult[] => {
    const levelUp = calculateGrowthProgress({
      currentTotalExp: 95,
      earnedExp: 10,
      currentCompletedCount: 3,
      currentStreakDays: 2,
    });
    const noLevelUp = calculateGrowthProgress({
      currentTotalExp: 10,
      earnedExp: 10,
      currentCompletedCount: 1,
      currentStreakDays: 1,
    });
    const cap = calculateGrowthProgress({
      currentTotalExp: 999999,
      earnedExp: 1000,
    });

    return [
      {
        name: "exp_95_plus_10_level_up",
        expected: true,
        actual: levelUp.didLevelUp,
        ok: levelUp.didLevelUp === true,
      },
      {
        name: "exp_after_reward",
        expected: 105,
        actual: levelUp.totalExp,
        ok: levelUp.totalExp === 105,
      },
      {
        name: "level_after_105",
        expected: 2,
        actual: levelUp.level,
        ok: levelUp.level === 2,
      },
      {
        name: "exp_to_next_after_105",
        expected: 95,
        actual: levelUp.expToNextLevel,
        ok: levelUp.expToNextLevel === 95,
      },
      {
        name: "no_level_up",
        expected: false,
        actual: noLevelUp.didLevelUp,
        ok: noLevelUp.didLevelUp === false,
      },
      {
        name: "max_level_cap",
        expected: GROWTH_MAX_LEVEL,
        actual: cap.level,
        ok: cap.level === GROWTH_MAX_LEVEL,
      },
    ];
  };

export const getGrowthSchemaCompletenessReport =
  (): GrowthSchemaCompletenessReport => {
    const tableNames = new Set(growthSchemaTables.map((table) => table.name));
    const policyTables = new Set(
      growthSchemaPolicies.map((policy) => policy.table),
    );
    const calculationSmokeTests = getGrowthCalculationSmokeTests();
    const missing: string[] = [];

    for (const requiredTableName of growthSchemaRequiredTableNames) {
      if (!tableNames.has(requiredTableName))
        missing.push(`missing table: ${requiredTableName}`);
    }

    for (const table of growthSchemaTables) {
      if (table.rlsRequired !== true)
        missing.push(`RLS must be required: ${table.name}`);
      if (table.auditRequired !== true)
        missing.push(`audit must be required: ${table.name}`);
      if (table.serverAuthorityRequired !== true)
        missing.push(`server authority must be required: ${table.name}`);
      if (table.containsFinancialSourceData !== false)
        missing.push(`financial source data flag must be false: ${table.name}`);
      if (table.containsRawToken !== false)
        missing.push(`raw token flag must be false: ${table.name}`);
      if (table.containsRawSecret !== false)
        missing.push(`raw secret flag must be false: ${table.name}`);
      if (table.containsRawPii !== false)
        missing.push(`raw pii flag must be false: ${table.name}`);
      if (!policyTables.has(table.name))
        missing.push(`missing policy coverage: ${table.name}`);
    }

    for (const tableName of growthSchemaRequiredTableNames) {
      const columns = getColumnNames(tableName);
      for (const safetyColumn of safetyFlagColumns) {
        if (!columns.has(safetyColumn.name))
          missing.push(
            `missing safety column ${safetyColumn.name} on ${tableName}`,
          );
      }
    }

    const taskColumns = getColumnNames("growth_tasks");
    for (const required of [
      "growth_task_id",
      "growth_category_id",
      "task_type",
      "title",
      "description",
      "exp_reward",
      "status",
      "active_from",
      "idempotency_key",
    ] as const) {
      if (!taskColumns.has(required))
        missing.push(`missing growth_tasks column: ${required}`);
    }

    const completionColumns = getColumnNames("growth_task_completions");
    for (const required of [
      "completion_id",
      "user_id",
      "growth_task_id",
      "task_type",
      "completion_date",
      "status",
      "earned_exp",
      "completed_at",
      "rewarded_at",
      "idempotency_key",
    ] as const) {
      if (!completionColumns.has(required))
        missing.push(`missing growth_task_completions column: ${required}`);
    }

    const statColumns = getColumnNames("user_growth_stats");
    for (const required of [
      "user_id",
      "level",
      "total_exp",
      "exp_in_current_level",
      "exp_to_next_level",
      "completed_task_count",
      "current_streak_days",
      "longest_streak_days",
    ] as const) {
      if (!statColumns.has(required))
        missing.push(`missing user_growth_stats column: ${required}`);
    }

    for (const taskType of growthTaskTypes) {
      if (!growthCategorySeeds.some((seed) => seed.taskType === taskType))
        missing.push(`missing growth category seed: ${taskType}`);
      if (!growthTaskSeeds.some((seed) => seed.taskType === taskType))
        missing.push(`missing growth task seed: ${taskType}`);
    }

    if (growthLevelRuleSeeds.length !== GROWTH_MAX_LEVEL)
      missing.push(`level rule seed count must be ${GROWTH_MAX_LEVEL}`);
    if (
      !growthLevelRuleSeeds.some(
        (seed) => seed.level === 1 && seed.cumulativeExpRequired === 0,
      )
    )
      missing.push("missing level 1 rule");
    if (!growthLevelRuleSeeds.some((seed) => seed.level === 999))
      missing.push("missing level 999 rule");
    if (
      !growthSchemaIndexes.some(
        (index) => index.name === "idx_growth_completions_user_date",
      )
    )
      missing.push("missing completion user date index");
    if (
      !growthSchemaIndexes.some(
        (index) => index.name === "idx_user_growth_stats_level",
      )
    )
      missing.push("missing user level ranking index");

    const ddlOrder = new Map(
      growthSchemaTablesInDdlOrder.map(
        (table, index) => [table.name, index] as const,
      ),
    );
    const internalTableNames = new Set(
      growthSchemaTables.map((table) => table.name),
    );

    for (const table of growthSchemaTables) {
      for (const column of table.columns) {
        const referencedTableName = column.references?.table;
        if (
          !referencedTableName ||
          !internalTableNames.has(referencedTableName)
        )
          continue;

        const tableIndex = ddlOrder.get(table.name);
        const referencedTableIndex = ddlOrder.get(referencedTableName);

        if (
          tableIndex === undefined ||
          referencedTableIndex === undefined ||
          referencedTableIndex > tableIndex
        ) {
          missing.push(
            `DDL order violation: ${table.name}.${column.name} references ${referencedTableName}`,
          );
        }
      }
    }

    for (const test of calculationSmokeTests) {
      if (!test.ok) missing.push(`calculation smoke test failed: ${test.name}`);
    }

    return {
      ok: missing.length === 0,
      tableCount: growthSchemaTables.length,
      indexCount: growthSchemaIndexes.length,
      policyCount: growthSchemaPolicies.length,
      categorySeedCount: growthCategorySeeds.length,
      levelRuleSeedCount: growthLevelRuleSeeds.length,
      taskSeedCount: growthTaskSeeds.length,
      ddlStatementCount:
        growthSchemaDdl.extensions.length +
        growthSchemaDdl.tables.length +
        growthSchemaDdl.indexes.length +
        growthSchemaDdl.rls.length +
        growthSchemaDdl.policies.length,
      calculationSmokeTests,
      missing,
    };
  };

export const assertGrowthSchemaCompleteness = (): void => {
  const report = getGrowthSchemaCompletenessReport();
  if (!report.ok)
    throw new Error(
      `Growth schema is incomplete: ${report.missing.join(", ")}`,
    );
};

assertGrowthSchemaCompleteness();

export const growthSchema = Object.freeze({
  policy: growthSchemaPolicy,
  taskTypes: growthTaskTypes,
  contentKinds: growthContentKinds,
  taskStatuses: growthTaskStatuses,
  scheduleStatuses: growthScheduleStatuses,
  completionStatuses: growthCompletionStatuses,
  expEventKinds: growthExpEventKinds,
  expEventStatuses: growthExpEventStatuses,
  proofScanStatuses: growthProofScanStatuses,
  visibilityLevels: growthVisibilityLevels,
  auditEventTypes: growthAuditEventTypes,
  idempotencyRecordStatuses,
  tables: growthSchemaTables,
  ddlTables: growthSchemaTablesInDdlOrder,
  indexes: growthSchemaIndexes,
  policies: growthSchemaPolicies,
  categorySeeds: growthCategorySeeds,
  levelRuleSeeds: growthLevelRuleSeeds,
  taskSeeds: growthTaskSeeds,
  ddl: growthSchemaDdl,
  calculateGrowthProgress,
  getCompletenessReport: getGrowthSchemaCompletenessReport,
  assertCompleteness: assertGrowthSchemaCompleteness,
});

export default growthSchema;
