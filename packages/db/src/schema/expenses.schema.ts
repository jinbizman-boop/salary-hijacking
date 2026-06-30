/**
 * packages/db/src/schema/expenses.schema.ts
 * 급여납치 Salary Hijacking Platform · Expenses DB schema contract.
 *
 * 고정지출, 변동지출, 일일 예산, 환불/취소, 반복 지출 생성, 첨부, 가져오기, 스냅샷,
 * 멱등성, 감사, 서버 권위 계산, KRW 정수, Asia/Seoul 기준 운영 정책을 포함한다.
 */

export const EXPENSES_SCHEMA_CONTRACT_VERSION = "2.0.0";
export const EXPENSES_SCHEMA_TIMEZONE = "Asia/Seoul";
export const EXPENSES_SCHEMA_CURRENCY = "KRW";

export const expenseCategoryKinds = [
  "fixed_expense",
  "variable_expense",
  "daily_living",
  "transportation",
  "food",
  "cafe",
  "subscription",
  "loan_repayment",
  "insurance",
  "housing",
  "communication",
  "shopping",
  "health",
  "education",
  "hobby",
  "family",
  "tax",
  "medical",
  "gift",
  "pet",
  "beauty",
  "travel",
  "other",
] as const;

export const expenseEventKinds = [
  "fixed",
  "variable",
  "daily_living",
  "refund",
  "adjustment",
] as const;

export const fixedExpenseRuleStatuses = [
  "active",
  "paused",
  "ended",
  "deleted",
] as const;

export const expenseEventStatuses = [
  "draft",
  "pending",
  "posted",
  "voided",
  "partially_refunded",
  "refunded",
  "deleted",
] as const;

export const expenseSourceTypes = [
  "manual",
  "recurring_rule",
  "quick_add",
  "imported_bank",
  "imported_card",
  "admin_adjustment",
  "refund_workflow",
] as const;

export const recurringFrequencies = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export const expensePaymentMethods = [
  "cash",
  "debit_card",
  "credit_card",
  "bank_transfer",
  "simple_pay",
  "automatic_payment",
  "unknown",
] as const;

export const expenseAttachmentScanStatuses = [
  "pending",
  "scanning",
  "clean",
  "blocked",
  "failed",
] as const;

export const budgetPeriodStatuses = [
  "open",
  "closed",
  "locked",
  "deleted",
] as const;

export const budgetSnapshotKinds = [
  "home_summary",
  "daily_budget",
  "fixed_expense_summary",
  "variable_expense_summary",
  "payroll_cycle_summary",
  "admin_recalculation",
] as const;

export const importBatchStatuses = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export const importItemStatuses = [
  "pending",
  "matched",
  "imported",
  "skipped",
  "failed",
] as const;

export const reconciliationStatuses = [
  "unmatched",
  "candidate",
  "matched",
  "manually_matched",
  "ignored",
] as const;

export const idempotencyRecordStatuses = [
  "processing",
  "succeeded",
  "failed",
  "expired",
] as const;

export const expenseAuditEventTypes = [
  "expense.category.created",
  "expense.category.updated",
  "fixed_rule.created",
  "fixed_rule.updated",
  "fixed_rule.paused",
  "fixed_rule.ended",
  "expense.created",
  "expense.updated",
  "expense.posted",
  "expense.voided",
  "expense.refunded",
  "daily_budget.created",
  "daily_budget.recalculated",
  "daily_budget.closed",
  "snapshot.created",
  "attachment.uploaded",
  "attachment.scanned",
  "import.batch.created",
  "import.item.imported",
  "reconciliation.matched",
  "idempotency.replayed",
] as const;

export type ExpenseCategoryKind = (typeof expenseCategoryKinds)[number];
export type ExpenseEventKind = (typeof expenseEventKinds)[number];
export type FixedExpenseRuleStatus = (typeof fixedExpenseRuleStatuses)[number];
export type ExpenseEventStatus = (typeof expenseEventStatuses)[number];
export type ExpenseSourceType = (typeof expenseSourceTypes)[number];
export type RecurringFrequency = (typeof recurringFrequencies)[number];
export type ExpensePaymentMethod = (typeof expensePaymentMethods)[number];
export type ExpenseAttachmentScanStatus =
  (typeof expenseAttachmentScanStatuses)[number];
export type BudgetPeriodStatus = (typeof budgetPeriodStatuses)[number];
export type BudgetSnapshotKind = (typeof budgetSnapshotKinds)[number];
export type ImportBatchStatus = (typeof importBatchStatuses)[number];
export type ImportItemStatus = (typeof importItemStatuses)[number];
export type ReconciliationStatus = (typeof reconciliationStatuses)[number];
export type IdempotencyRecordStatus =
  (typeof idempotencyRecordStatuses)[number];
export type ExpenseAuditEventType = (typeof expenseAuditEventTypes)[number];

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
  readonly moneyKrw?: boolean;
  readonly serverCalculated?: boolean;
}

export interface DbTableSpec {
  readonly name: string;
  readonly description: string;
  readonly columns: readonly DbColumnSpec[];
  readonly constraints?: readonly string[];
  readonly rlsRequired: true;
  readonly auditRequired: true;
  readonly serverAuthorityRequired: true;
  readonly containsFinancialSourceData: boolean;
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

export interface ExpenseCategorySeed {
  readonly slug: string;
  readonly kind: ExpenseCategoryKind;
  readonly nameKo: string;
  readonly descriptionKo: string;
  readonly sortOrder: number;
  readonly isSystem: true;
}

export interface DailyBudgetCalculationInput {
  readonly plannedAmountKrw: number;
  readonly fixedExpenseAmountKrw?: number;
  readonly variableExpenseAmountKrw?: number;
  readonly refundAmountKrw?: number;
}

export interface DailyBudgetCalculationResult {
  readonly plannedAmountKrw: number;
  readonly fixedExpenseAmountKrw: number;
  readonly variableExpenseAmountKrw: number;
  readonly refundAmountKrw: number;
  readonly usedAmountKrw: number;
  readonly remainingAmountKrw: number;
  readonly overAmountKrw: number;
  readonly usageRateBps: number;
}

export interface MonthlyExpenseCalculationInput {
  readonly plannedFixedExpenseKrw?: number;
  readonly plannedVariableExpenseKrw?: number;
  readonly plannedLivingBudgetKrw?: number;
  readonly actualFixedExpenseKrw?: number;
  readonly actualVariableExpenseKrw?: number;
  readonly refundAmountKrw?: number;
}

export interface MonthlyExpenseCalculationResult {
  readonly plannedExpenseKrw: number;
  readonly actualExpenseKrw: number;
  readonly refundAmountKrw: number;
  readonly netExpenseKrw: number;
  readonly savedAgainstPlanKrw: number;
  readonly overPlanAmountKrw: number;
}

export interface ExpenseCalculationSmokeTestResult {
  readonly name: string;
  readonly ok: boolean;
  readonly expected: number;
  readonly actual: number;
}

export interface ExpensesSchemaCompletenessReport {
  readonly ok: boolean;
  readonly tableCount: number;
  readonly indexCount: number;
  readonly policyCount: number;
  readonly seedCount: number;
  readonly ddlStatementCount: number;
  readonly calculationSmokeTests: readonly ExpenseCalculationSmokeTestResult[];
  readonly missing: readonly string[];
}

export const expensesSchemaPolicy = Object.freeze({
  project: "salary-hijacking-platform",
  packageScope: "packages/db",
  file: "packages/db/src/schema/expenses.schema.ts",
  contractVersion: EXPENSES_SCHEMA_CONTRACT_VERSION,
  timezone: EXPENSES_SCHEMA_TIMEZONE,
  currency: EXPENSES_SCHEMA_CURRENCY,
  schemaAuthority: "server-database-contract",
  serverAuthorityRequired: true,
  browserDirectDatabaseAccessAllowed: false,
  clientFinalExpenseCalculationAllowed: false,
  clientFinalPayrollCalculationAllowed: false,
  krwIntegerMoneyOnly: true,
  moneyColumnSqlType: "bigint",
  expenseWritesRequireIdempotency: true,
  fixedExpenseRulesRequired: true,
  variableExpenseEventsRequired: true,
  dailyBudgetPeriodsRequired: true,
  dailyBudgetSnapshotsRequired: true,
  refundAndVoidWorkflowRequired: true,
  attachmentScanRequired: true,
  importAndReconciliationSupported: true,
  budgetOverspendUsesOverAmount: true,
  negativeRemainingBudgetAllowed: false,
  rawFinancialDataAllowedOnlyInsideExpenseDomain: true,
  rawFinancialDataInAuthAllowed: false,
  rawFinancialDataInCommunityPayloadAllowed: false,
  rawFinancialDataInAdsEventAllowed: false,
  rawFinancialDataInNotificationPayloadAllowed: false,
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
const bpsCheck = (columnName: string): string =>
  `${columnName} between 0 and 1000000`;
const lenCheck = (columnName: string, min: number, max: number): string =>
  `char_length(trim(${columnName})) between ${min} and ${max}`;

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

const moneyColumn = (
  name: string,
  options: {
    readonly positive?: boolean;
    readonly defaultZero?: boolean;
    readonly serverCalculated?: boolean;
    readonly comment?: string;
  } = {},
): DbColumnSpec => ({
  name,
  type: "bigint",
  notNull: true,
  defaultSql: options.defaultZero ? "0" : undefined,
  checks: [options.positive ? positiveCheck(name) : nonNegativeCheck(name)],
  moneyKrw: true,
  serverCalculated: options.serverCalculated,
  comment:
    options.comment ??
    "KRW integer money column. Decimal and negative values are forbidden.",
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
    comment:
      "계좌번호, 카드번호, 주민번호, 전화번호, 이메일 등 원문 PII 저장 금지. 필요한 값은 hash/masking으로 분리한다.",
  },
  {
    name: "ads_payload_linked",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("ads_payload_linked")],
    comment: "광고/제휴 타겟팅 payload와 지출 원천 데이터 직접 결합 금지.",
  },
  {
    name: "community_payload_linked",
    type: "boolean",
    notNull: true,
    defaultSql: "false",
    checks: [falseOnlyCheck("community_payload_linked")],
    comment: "커뮤니티 payload와 지출 원천 데이터 직접 결합 금지.",
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
    | "containsRawToken"
    | "containsRawSecret"
    | "containsRawPii"
  >,
): DbTableSpec => ({
  ...table,
  rlsRequired: true,
  auditRequired: true,
  serverAuthorityRequired: true,
  containsRawToken: false,
  containsRawSecret: false,
  containsRawPii: false,
});

export const expensesSchemaTables = [
  secureTable({
    name: "expense_categories",
    description:
      "지출 카테고리. 고정지출, 변동지출, 생활비, 교통, 식비, 카페, 구독료 등 시스템 카테고리를 관리한다.",
    containsFinancialSourceData: false,
    columns: [
      uuidPrimaryKey("category_id"),
      textColumn("slug", 80, true),
      {
        name: "kind",
        type: "varchar(40)",
        notNull: true,
        checks: [enumCheck("kind", expenseCategoryKinds)],
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
      "constraint expense_categories_slug_unique unique (slug)",
      "constraint expense_categories_slug_format check (slug ~ '^[a-z0-9][a-z0-9_-]{1,78}[a-z0-9]$')",
    ],
  }),
  secureTable({
    name: "fixed_expense_rules",
    description:
      "월별 반복 고정지출 규칙. 구독료, 대출상환, 보험료, 통신비, 주거비 등 자동 반복 지출을 정의한다.",
    containsFinancialSourceData: true,
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("fixed_expense_rule_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef(
        "payroll_cycle_id",
        "payroll_cycles",
        "payroll_cycle_id",
        "set null",
        false,
      ),
      uuidRef("category_id", "expense_categories", "category_id", "restrict"),
      textColumn("name", 120, true),
      moneyColumn("amount_krw", { positive: true }),
      {
        name: "frequency",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'monthly'",
        checks: [enumCheck("frequency", recurringFrequencies)],
      },
      {
        name: "day_of_month",
        type: "integer",
        checks: ["day_of_month is null or day_of_month between 1 and 31"],
      },
      {
        name: "weekday",
        type: "smallint",
        checks: ["weekday is null or weekday between 0 and 6"],
      },
      { name: "start_date", type: "date", notNull: true },
      { name: "end_date", type: "date" },
      { name: "next_due_date", type: "date" },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'active'",
        checks: [enumCheck("status", fixedExpenseRuleStatuses)],
      },
      {
        name: "payment_method",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'automatic_payment'",
        checks: [enumCheck("payment_method", expensePaymentMethods)],
      },
      textColumn("merchant_name", 120),
      textColumn("memo"),
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [lenCheck("idempotency_key", 8, 256)],
      },
      { name: "paused_at", type: "timestamptz" },
      { name: "ended_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint fixed_expense_rules_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint fixed_expense_rules_name_length check (char_length(trim(name)) between 1 and 120)",
      "constraint fixed_expense_rules_memo_length check (memo is null or char_length(memo) <= 1000)",
      "constraint fixed_expense_rules_date_range check (end_date is null or end_date >= start_date)",
      "constraint fixed_expense_rules_paused_check check (paused_at is null or status = 'paused')",
      "constraint fixed_expense_rules_ended_check check (ended_at is null or status = 'ended')",
      "constraint fixed_expense_rules_deleted_check check ((deleted_at is null and status <> 'deleted') or (deleted_at is not null and status = 'deleted'))",
    ],
  }),
  secureTable({
    name: "fixed_expense_occurrences",
    description:
      "고정지출 규칙에서 생성된 예정/완료 발생 건. 급여 홈의 금일 고정지출 카드와 알림 예약의 기준이다.",
    containsFinancialSourceData: true,
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("fixed_expense_occurrence_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef(
        "fixed_expense_rule_id",
        "fixed_expense_rules",
        "fixed_expense_rule_id",
        "cascade",
      ),
      uuidRef(
        "expense_event_id",
        "expense_events",
        "expense_event_id",
        "set null",
        false,
      ),
      { name: "due_date", type: "date", notNull: true },
      moneyColumn("planned_amount_krw", { positive: true }),
      moneyColumn("posted_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'pending'",
        checks: [
          "status in ('pending', 'posted', 'skipped', 'failed', 'deleted')",
        ],
      },
      textColumn("failure_reason"),
      { name: "posted_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
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
      "constraint fixed_expense_occurrences_rule_date_unique unique (fixed_expense_rule_id, due_date)",
      "constraint fixed_expense_occurrences_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint fixed_expense_occurrences_posted_check check (posted_at is null or status = 'posted')",
    ],
  }),
  secureTable({
    name: "daily_budget_periods",
    description:
      "Asia/Seoul 기준 일일 예산 기간. 남은 금액은 0 미만으로 내려가지 않고 초과분은 over_amount_krw에 저장한다.",
    containsFinancialSourceData: true,
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("daily_budget_period_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef(
        "payroll_cycle_id",
        "payroll_cycles",
        "payroll_cycle_id",
        "set null",
        false,
      ),
      { name: "budget_date", type: "date", notNull: true },
      moneyColumn("planned_amount_krw", { positive: true }),
      moneyColumn("fixed_expense_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("variable_expense_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("refund_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("used_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("remaining_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
        comment: "Remaining amount is floored at 0.",
      }),
      moneyColumn("over_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
        comment: "Overspend amount. This replaces negative remaining budget.",
      }),
      {
        name: "usage_rate_bps",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [bpsCheck("usage_rate_bps")],
        serverCalculated: true,
      },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'open'",
        checks: [enumCheck("status", budgetPeriodStatuses)],
      },
      {
        name: "calculated_at",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
      { name: "closed_at", type: "timestamptz" },
      { name: "locked_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
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
      "constraint daily_budget_periods_user_date_unique unique (user_id, budget_date)",
      "constraint daily_budget_periods_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint daily_budget_periods_used_formula check (used_amount_krw = greatest(0, fixed_expense_amount_krw + variable_expense_amount_krw - refund_amount_krw))",
      "constraint daily_budget_periods_remaining_formula check (remaining_amount_krw = greatest(0, planned_amount_krw - used_amount_krw))",
      "constraint daily_budget_periods_over_formula check (over_amount_krw = greatest(0, used_amount_krw - planned_amount_krw))",
      "constraint daily_budget_periods_closed_check check (closed_at is null or status in ('closed', 'locked'))",
      "constraint daily_budget_periods_locked_check check (locked_at is null or status = 'locked')",
      "constraint daily_budget_periods_deleted_check check (deleted_at is null or status = 'deleted')",
    ],
  }),
  secureTable({
    name: "expense_events",
    description:
      "변동지출 및 고정지출 발생 이벤트. 모든 write는 idempotency_key와 서버 권위 계산을 요구한다.",
    containsFinancialSourceData: true,
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("expense_event_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef("category_id", "expense_categories", "category_id", "restrict"),
      uuidRef(
        "daily_budget_period_id",
        "daily_budget_periods",
        "daily_budget_period_id",
        "set null",
        false,
      ),
      uuidRef(
        "fixed_expense_rule_id",
        "fixed_expense_rules",
        "fixed_expense_rule_id",
        "set null",
        false,
      ),
      uuidRef(
        "payroll_cycle_id",
        "payroll_cycles",
        "payroll_cycle_id",
        "set null",
        false,
      ),
      {
        name: "kind",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'variable'",
        checks: [enumCheck("kind", expenseEventKinds)],
      },
      {
        name: "status",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'posted'",
        checks: [enumCheck("status", expenseEventStatuses)],
      },
      {
        name: "source_type",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'manual'",
        checks: [enumCheck("source_type", expenseSourceTypes)],
      },
      {
        name: "payment_method",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'unknown'",
        checks: [enumCheck("payment_method", expensePaymentMethods)],
      },
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [lenCheck("idempotency_key", 8, 256)],
      },
      { name: "occurred_on", type: "date", notNull: true },
      { name: "occurred_at", type: "timestamptz", notNull: true },
      textColumn("name", 160, true),
      moneyColumn("amount_krw", { positive: true }),
      moneyColumn("refunded_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("net_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      textColumn("merchant_name", 120),
      textColumn("memo"),
      { name: "imported_source_id", type: "uuid" },
      { name: "posted_at", type: "timestamptz" },
      { name: "voided_at", type: "timestamptz" },
      { name: "refunded_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint expense_events_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint expense_events_name_length check (char_length(trim(name)) between 1 and 160)",
      "constraint expense_events_memo_length check (memo is null or char_length(memo) <= 1000)",
      "constraint expense_events_refund_not_over_amount check (refunded_amount_krw <= amount_krw)",
      "constraint expense_events_net_formula check (net_amount_krw = greatest(0, amount_krw - refunded_amount_krw))",
      "constraint expense_events_fixed_rule_required check (kind <> 'fixed' or fixed_expense_rule_id is not null)",
      "constraint expense_events_voided_check check (voided_at is null or status = 'voided')",
      "constraint expense_events_refunded_check check (refunded_at is null or status in ('partially_refunded', 'refunded'))",
      "constraint expense_events_deleted_check check (deleted_at is null or status = 'deleted')",
    ],
  }),
  secureTable({
    name: "expense_refunds",
    description:
      "지출 환불/취소 원장. 원 지출 금액을 초과하는 환불을 금지하고 순지출을 재계산한다.",
    containsFinancialSourceData: true,
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("refund_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef("expense_event_id", "expense_events", "expense_event_id"),
      uuidRef(
        "daily_budget_period_id",
        "daily_budget_periods",
        "daily_budget_period_id",
        "set null",
        false,
      ),
      { name: "refund_date", type: "date", notNull: true },
      { name: "refund_at", type: "timestamptz", notNull: true },
      moneyColumn("amount_krw", { positive: true }),
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'posted'",
        checks: ["status in ('pending', 'posted', 'voided', 'deleted')"],
      },
      textColumn("reason", undefined, true),
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [lenCheck("idempotency_key", 8, 256)],
      },
      { name: "posted_at", type: "timestamptz" },
      { name: "voided_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint expense_refunds_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint expense_refunds_reason_length check (char_length(trim(reason)) between 1 and 1000)",
      "constraint expense_refunds_voided_check check (voided_at is null or status = 'voided')",
      "constraint expense_refunds_deleted_check check (deleted_at is null or status = 'deleted')",
    ],
  }),
  secureTable({
    name: "monthly_expense_periods",
    description:
      "월별 지출 집계 기간. 급여 주기별 고정/변동/생활비 계획 대비 실제 지출과 절감액을 확정한다.",
    containsFinancialSourceData: true,
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("monthly_expense_period_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef(
        "payroll_cycle_id",
        "payroll_cycles",
        "payroll_cycle_id",
        "set null",
        false,
      ),
      { name: "period_month", type: "date", notNull: true },
      { name: "period_start_date", type: "date", notNull: true },
      { name: "period_end_date", type: "date", notNull: true },
      moneyColumn("planned_fixed_expense_krw", { defaultZero: true }),
      moneyColumn("planned_variable_expense_krw", { defaultZero: true }),
      moneyColumn("planned_living_budget_krw", { defaultZero: true }),
      moneyColumn("planned_expense_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("actual_fixed_expense_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("actual_variable_expense_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("refund_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("actual_expense_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("net_expense_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("saved_against_plan_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("over_plan_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'open'",
        checks: [enumCheck("status", budgetPeriodStatuses)],
      },
      {
        name: "calculated_at",
        type: "timestamptz",
        notNull: true,
        defaultSql: "now()",
      },
      { name: "closed_at", type: "timestamptz" },
      { name: "locked_at", type: "timestamptz" },
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
      "constraint monthly_expense_periods_user_month_unique unique (user_id, period_month)",
      "constraint monthly_expense_periods_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint monthly_expense_periods_date_range check (period_start_date <= period_end_date)",
      "constraint monthly_expense_periods_planned_formula check (planned_expense_krw = planned_fixed_expense_krw + planned_variable_expense_krw + planned_living_budget_krw)",
      "constraint monthly_expense_periods_actual_formula check (actual_expense_krw = actual_fixed_expense_krw + actual_variable_expense_krw)",
      "constraint monthly_expense_periods_net_formula check (net_expense_krw = greatest(0, actual_expense_krw - refund_amount_krw))",
      "constraint monthly_expense_periods_saved_formula check (saved_against_plan_krw = greatest(0, planned_expense_krw - net_expense_krw))",
      "constraint monthly_expense_periods_over_formula check (over_plan_amount_krw = greatest(0, net_expense_krw - planned_expense_krw))",
      "constraint monthly_expense_periods_closed_check check (closed_at is null or status in ('closed', 'locked'))",
      "constraint monthly_expense_periods_locked_check check (locked_at is null or status = 'locked')",
    ],
  }),
  secureTable({
    name: "expense_budget_snapshots",
    description:
      "서버 권위 지출/예산 계산 스냅샷. 홈/계획/알림/운영 콘솔에서 재현 가능한 계산 결과를 제공한다.",
    containsFinancialSourceData: true,
    columns: [
      uuidPrimaryKey("snapshot_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef(
        "daily_budget_period_id",
        "daily_budget_periods",
        "daily_budget_period_id",
        "set null",
        false,
      ),
      uuidRef(
        "monthly_expense_period_id",
        "monthly_expense_periods",
        "monthly_expense_period_id",
        "set null",
        false,
      ),
      uuidRef(
        "payroll_cycle_id",
        "payroll_cycles",
        "payroll_cycle_id",
        "set null",
        false,
      ),
      {
        name: "kind",
        type: "varchar(40)",
        notNull: true,
        checks: [enumCheck("kind", budgetSnapshotKinds)],
      },
      { name: "business_date", type: "date", notNull: true },
      moneyColumn("planned_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("fixed_expense_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("variable_expense_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("used_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("remaining_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      moneyColumn("over_amount_krw", {
        defaultZero: true,
        serverCalculated: true,
      }),
      {
        name: "usage_rate_bps",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [bpsCheck("usage_rate_bps")],
        serverCalculated: true,
      },
      {
        name: "calculation_version",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'v1'",
      },
      {
        name: "source_hash",
        type: "varchar(128)",
        notNull: true,
        checks: [lenCheck("source_hash", 16, 128)],
      },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint expense_budget_snapshots_unique unique (user_id, kind, business_date, source_hash)",
      "constraint expense_budget_snapshots_remaining_formula check (remaining_amount_krw = greatest(0, planned_amount_krw - used_amount_krw))",
      "constraint expense_budget_snapshots_over_formula check (over_amount_krw = greatest(0, used_amount_krw - planned_amount_krw))",
    ],
  }),
  secureTable({
    name: "expense_post_attachments",
    description:
      "지출 영수증/증빙 첨부 metadata. 파일 원문은 object storage에 저장하고 DB에는 검증된 metadata만 저장한다.",
    containsFinancialSourceData: true,
    columns: [
      uuidPrimaryKey("attachment_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef("expense_event_id", "expense_events", "expense_event_id"),
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
        checks: [enumCheck("scan_status", expenseAttachmentScanStatuses)],
      },
      textColumn("scan_provider", 80),
      textColumn("blocked_reason"),
      { name: "scanned_at", type: "timestamptz" },
      { name: "deleted_at", type: "timestamptz" },
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint expense_post_attachments_storage_key_unique unique (storage_key)",
      "constraint expense_post_attachments_scan_block_check check (blocked_reason is null or scan_status = 'blocked')",
      "constraint expense_post_attachments_scan_time_check check (scanned_at is null or scan_status in ('clean', 'blocked', 'failed'))",
    ],
  }),
  secureTable({
    name: "expense_import_batches",
    description:
      "은행/카드 가져오기 batch. 원본 파일과 토큰은 저장하지 않고 hash/reference만 저장한다.",
    containsFinancialSourceData: true,
    idempotencyRequired: true,
    columns: [
      uuidPrimaryKey("import_batch_id"),
      uuidRef("user_id", "users", "user_id"),
      {
        name: "source_type",
        type: "varchar(32)",
        notNull: true,
        checks: ["source_type in ('bank', 'card', 'manual_csv', 'admin')"],
      },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'pending'",
        checks: [enumCheck("status", importBatchStatuses)],
      },
      textColumn("provider_name", 120),
      {
        name: "file_hash",
        type: "varchar(128)",
        checks: [
          "file_hash is null or char_length(file_hash) between 16 and 128",
        ],
      },
      {
        name: "item_count",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [nonNegativeCheck("item_count")],
      },
      {
        name: "imported_count",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [nonNegativeCheck("imported_count")],
      },
      {
        name: "failed_count",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [nonNegativeCheck("failed_count")],
      },
      {
        name: "idempotency_key",
        type: "varchar(256)",
        notNull: true,
        checks: [lenCheck("idempotency_key", 8, 256)],
      },
      { name: "started_at", type: "timestamptz" },
      { name: "completed_at", type: "timestamptz" },
      textColumn("failure_reason"),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint expense_import_batches_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint expense_import_batches_completed_check check (completed_at is null or status in ('completed', 'failed', 'cancelled'))",
    ],
  }),
  secureTable({
    name: "expense_import_items",
    description:
      "가져오기 개별 항목. 계좌/카드번호 원문 대신 hash/masked snapshot만 허용한다.",
    containsFinancialSourceData: true,
    columns: [
      uuidPrimaryKey("import_item_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef("import_batch_id", "expense_import_batches", "import_batch_id"),
      uuidRef(
        "expense_event_id",
        "expense_events",
        "expense_event_id",
        "set null",
        false,
      ),
      { name: "occurred_on", type: "date", notNull: true },
      { name: "occurred_at", type: "timestamptz" },
      textColumn("merchant_name", 160),
      moneyColumn("amount_krw", { positive: true }),
      textColumn("source_row_hash", 128, true),
      textColumn("source_account_masked", 80),
      textColumn("source_account_hash", 256),
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'pending'",
        checks: [enumCheck("status", importItemStatuses)],
      },
      textColumn("failure_reason"),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint expense_import_items_batch_row_unique unique (import_batch_id, source_row_hash)",
      "constraint expense_import_items_source_hash_length check (char_length(trim(source_row_hash)) between 16 and 128)",
      "constraint expense_import_items_account_hash_length check (source_account_hash is null or char_length(source_account_hash) between 32 and 256)",
    ],
  }),
  secureTable({
    name: "expense_reconciliations",
    description:
      "가져오기 항목과 지출 이벤트 매칭 상태. 중복 지출 생성을 방지한다.",
    containsFinancialSourceData: true,
    columns: [
      uuidPrimaryKey("reconciliation_id"),
      uuidRef("user_id", "users", "user_id"),
      uuidRef("import_item_id", "expense_import_items", "import_item_id"),
      uuidRef(
        "expense_event_id",
        "expense_events",
        "expense_event_id",
        "set null",
        false,
      ),
      {
        name: "status",
        type: "varchar(32)",
        notNull: true,
        defaultSql: "'unmatched'",
        checks: [enumCheck("status", reconciliationStatuses)],
      },
      {
        name: "match_score_bps",
        type: "integer",
        notNull: true,
        defaultSql: "0",
        checks: [bpsCheck("match_score_bps")],
      },
      textColumn("match_reason"),
      { name: "matched_at", type: "timestamptz" },
      uuidRef("matched_by", "users", "user_id", "set null", false),
      jsonColumn("metadata"),
      ...operationalColumns,
    ],
    constraints: [
      "constraint expense_reconciliations_import_unique unique (import_item_id)",
      "constraint expense_reconciliations_matched_check check (matched_at is null or status in ('matched', 'manually_matched'))",
    ],
  }),
  secureTable({
    name: "expense_idempotency_records",
    description:
      "지출 write 멱등성 기록. 동일 request 재시도 시 중복 고정/변동지출 생성을 차단한다.",
    containsFinancialSourceData: false,
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
      { name: "response_hash", type: "varchar(128)" },
      textColumn("resource_type", 80),
      { name: "resource_id", type: "uuid" },
      {
        name: "status",
        type: "varchar(24)",
        notNull: true,
        defaultSql: "'processing'",
        checks: [enumCheck("status", idempotencyRecordStatuses)],
      },
      { name: "expires_at", type: "timestamptz", notNull: true },
      ...operationalColumns,
    ],
    constraints: [
      "constraint expense_idempotency_records_user_key_unique unique (user_id, idempotency_key)",
      "constraint expense_idempotency_records_expiry_check check (expires_at > created_at)",
    ],
  }),
  secureTable({
    name: "expense_audit_events",
    description:
      "지출 카테고리/고정지출/변동지출/환불/예산/첨부/가져오기 변경 감사 로그. 원문 민감정보 저장을 금지한다.",
    containsFinancialSourceData: false,
    columns: [
      uuidPrimaryKey("audit_event_id"),
      {
        name: "event_type",
        type: "varchar(80)",
        notNull: true,
        checks: [enumCheck("event_type", expenseAuditEventTypes)],
      },
      uuidRef("actor_user_id", "users", "user_id", "set null", false),
      uuidRef("target_user_id", "users", "user_id", "set null", false),
      uuidRef(
        "expense_event_id",
        "expense_events",
        "expense_event_id",
        "set null",
        false,
      ),
      uuidRef(
        "fixed_expense_rule_id",
        "fixed_expense_rules",
        "fixed_expense_rule_id",
        "set null",
        false,
      ),
      uuidRef(
        "daily_budget_period_id",
        "daily_budget_periods",
        "daily_budget_period_id",
        "set null",
        false,
      ),
      uuidRef(
        "monthly_expense_period_id",
        "monthly_expense_periods",
        "monthly_expense_period_id",
        "set null",
        false,
      ),
      uuidRef(
        "import_batch_id",
        "expense_import_batches",
        "import_batch_id",
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

export const expensesSchemaIndexes = [
  {
    name: "idx_expense_categories_active_sort",
    table: "expense_categories",
    columns: ["is_active", "sort_order", "slug"],
  },
  {
    name: "idx_fixed_expense_rules_user_status_due",
    table: "fixed_expense_rules",
    columns: ["user_id", "status", "next_due_date"],
  },
  {
    name: "idx_fixed_expense_rules_payroll",
    table: "fixed_expense_rules",
    columns: ["payroll_cycle_id", "status"],
    whereSql: "payroll_cycle_id is not null",
  },
  {
    name: "idx_fixed_expense_occurrences_due",
    table: "fixed_expense_occurrences",
    columns: ["user_id", "status", "due_date"],
  },
  {
    name: "idx_fixed_expense_occurrences_rule_date",
    table: "fixed_expense_occurrences",
    columns: ["fixed_expense_rule_id", "due_date"],
  },
  {
    name: "idx_daily_budget_periods_user_date",
    table: "daily_budget_periods",
    columns: ["user_id", "budget_date"],
  },
  {
    name: "idx_daily_budget_periods_status_date",
    table: "daily_budget_periods",
    columns: ["status", "budget_date"],
  },
  {
    name: "idx_expense_events_user_date_status",
    table: "expense_events",
    columns: ["user_id", "occurred_on", "status"],
  },
  {
    name: "idx_expense_events_daily_budget",
    table: "expense_events",
    columns: ["daily_budget_period_id", "status", "occurred_at"],
    whereSql: "daily_budget_period_id is not null",
  },
  {
    name: "idx_expense_events_fixed_rule",
    table: "expense_events",
    columns: ["fixed_expense_rule_id", "occurred_on"],
    whereSql: "fixed_expense_rule_id is not null",
  },
  {
    name: "idx_expense_events_payroll",
    table: "expense_events",
    columns: ["payroll_cycle_id", "kind", "status"],
    whereSql: "payroll_cycle_id is not null",
  },
  {
    name: "idx_expense_events_metadata_gin",
    table: "expense_events",
    columns: ["metadata"],
    method: "gin",
  },
  {
    name: "idx_expense_refunds_event",
    table: "expense_refunds",
    columns: ["expense_event_id", "status", "refund_at"],
  },
  {
    name: "idx_monthly_expense_periods_user_month",
    table: "monthly_expense_periods",
    columns: ["user_id", "period_month"],
  },
  {
    name: "idx_monthly_expense_periods_payroll",
    table: "monthly_expense_periods",
    columns: ["payroll_cycle_id", "status"],
    whereSql: "payroll_cycle_id is not null",
  },
  {
    name: "idx_expense_budget_snapshots_user_date",
    table: "expense_budget_snapshots",
    columns: ["user_id", "business_date", "kind"],
  },
  {
    name: "idx_expense_attachments_event_scan",
    table: "expense_post_attachments",
    columns: ["expense_event_id", "scan_status", "created_at"],
  },
  {
    name: "idx_expense_import_batches_user_status",
    table: "expense_import_batches",
    columns: ["user_id", "status", "created_at"],
  },
  {
    name: "idx_expense_import_items_batch_status",
    table: "expense_import_items",
    columns: ["import_batch_id", "status"],
  },
  {
    name: "idx_expense_reconciliations_status",
    table: "expense_reconciliations",
    columns: ["user_id", "status", "match_score_bps"],
  },
  {
    name: "idx_expense_idempotency_status_expiry",
    table: "expense_idempotency_records",
    columns: ["status", "expires_at"],
  },
  {
    name: "idx_expense_audit_target_user",
    table: "expense_audit_events",
    columns: ["target_user_id", "created_at"],
    whereSql: "target_user_id is not null",
  },
  {
    name: "idx_expense_audit_expense_event",
    table: "expense_audit_events",
    columns: ["expense_event_id", "created_at"],
    whereSql: "expense_event_id is not null",
  },
] as const satisfies readonly DbIndexSpec[];

const currentUserSql = "public.current_app_user_id()";
const adminSql = "public.current_app_is_admin()";
const serviceOrAdminSql =
  "current_user = 'service_role' or public.current_app_is_admin()";
const safetySql =
  "raw_token_included = false and raw_secret_included = false and raw_pii_included = false and ads_payload_linked = false and community_payload_linked = false";
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

export const expensesSchemaPolicies = [
  {
    name: "expense_categories_read_active",
    table: "expense_categories",
    command: "select",
    role: "authenticated",
    usingSql: "is_active = true or public.current_app_is_admin()",
  },
  {
    name: "expense_categories_admin_all",
    table: "expense_categories",
    command: "all",
    role: "admin",
    usingSql: adminSql,
    checkSql: adminSql,
  },
  ownerSelect("fixed_expense_rules_owner_select", "fixed_expense_rules"),
  ownerInsert("fixed_expense_rules_owner_insert", "fixed_expense_rules"),
  ownerUpdate("fixed_expense_rules_owner_update", "fixed_expense_rules"),
  serviceAll("fixed_expense_rules_service_all", "fixed_expense_rules"),
  ownerSelect(
    "fixed_expense_occurrences_owner_select",
    "fixed_expense_occurrences",
  ),
  serviceAll(
    "fixed_expense_occurrences_service_all",
    "fixed_expense_occurrences",
  ),
  ownerSelect("daily_budget_periods_owner_select", "daily_budget_periods"),
  ownerInsert("daily_budget_periods_owner_insert", "daily_budget_periods"),
  ownerUpdate("daily_budget_periods_owner_update", "daily_budget_periods"),
  serviceAll("daily_budget_periods_service_all", "daily_budget_periods"),
  ownerSelect("expense_events_owner_select", "expense_events"),
  ownerInsert("expense_events_owner_insert", "expense_events"),
  ownerUpdate("expense_events_owner_update", "expense_events"),
  serviceAll("expense_events_service_all", "expense_events"),
  ownerSelect("expense_refunds_owner_select", "expense_refunds"),
  ownerInsert("expense_refunds_owner_insert", "expense_refunds"),
  serviceAll("expense_refunds_service_all", "expense_refunds"),
  ownerSelect(
    "monthly_expense_periods_owner_select",
    "monthly_expense_periods",
  ),
  serviceAll("monthly_expense_periods_service_all", "monthly_expense_periods"),
  ownerSelect(
    "expense_budget_snapshots_owner_select",
    "expense_budget_snapshots",
  ),
  serviceAll(
    "expense_budget_snapshots_service_all",
    "expense_budget_snapshots",
  ),
  ownerSelect("expense_attachments_owner_select", "expense_post_attachments"),
  ownerInsert("expense_attachments_owner_insert", "expense_post_attachments"),
  serviceAll("expense_attachments_service_all", "expense_post_attachments"),
  ownerSelect("expense_import_batches_owner_select", "expense_import_batches"),
  ownerInsert("expense_import_batches_owner_insert", "expense_import_batches"),
  serviceAll("expense_import_batches_service_all", "expense_import_batches"),
  ownerSelect("expense_import_items_owner_select", "expense_import_items"),
  serviceAll("expense_import_items_service_all", "expense_import_items"),
  ownerSelect(
    "expense_reconciliations_owner_select",
    "expense_reconciliations",
  ),
  serviceAll("expense_reconciliations_service_all", "expense_reconciliations"),
  serviceAll("expense_idempotency_service_all", "expense_idempotency_records"),
  {
    name: "expense_audit_events_admin_select",
    table: "expense_audit_events",
    command: "select",
    role: "admin",
    usingSql: adminSql,
  },
  {
    name: "expense_audit_events_service_insert",
    table: "expense_audit_events",
    command: "insert",
    role: "service_role",
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
] as const satisfies readonly DbPolicySpec[];

export const expenseCategorySeeds = [
  {
    slug: "fixed-expense",
    kind: "fixed_expense",
    nameKo: "고정지출",
    descriptionKo: "매월 반복되는 고정 지출",
    sortOrder: 10,
    isSystem: true,
  },
  {
    slug: "variable-expense",
    kind: "variable_expense",
    nameKo: "변동지출",
    descriptionKo: "일회성 또는 비정기 지출",
    sortOrder: 20,
    isSystem: true,
  },
  {
    slug: "daily-living",
    kind: "daily_living",
    nameKo: "일일 생활비",
    descriptionKo: "하루 단위 생활비 예산",
    sortOrder: 30,
    isSystem: true,
  },
  {
    slug: "transportation",
    kind: "transportation",
    nameKo: "교통",
    descriptionKo: "대중교통, 택시, 주유, 이동 비용",
    sortOrder: 40,
    isSystem: true,
  },
  {
    slug: "food",
    kind: "food",
    nameKo: "식비",
    descriptionKo: "식사, 장보기, 배달 음식",
    sortOrder: 50,
    isSystem: true,
  },
  {
    slug: "cafe",
    kind: "cafe",
    nameKo: "카페",
    descriptionKo: "커피, 음료, 디저트",
    sortOrder: 60,
    isSystem: true,
  },
  {
    slug: "subscription",
    kind: "subscription",
    nameKo: "구독료",
    descriptionKo: "OTT, AI, 앱, 멤버십 자동결제",
    sortOrder: 70,
    isSystem: true,
  },
  {
    slug: "loan-repayment",
    kind: "loan_repayment",
    nameKo: "대출 상환",
    descriptionKo: "학자금, 신용, 주택 등 대출 상환",
    sortOrder: 80,
    isSystem: true,
  },
  {
    slug: "insurance",
    kind: "insurance",
    nameKo: "보험",
    descriptionKo: "보험료 자동납부",
    sortOrder: 90,
    isSystem: true,
  },
  {
    slug: "housing",
    kind: "housing",
    nameKo: "주거",
    descriptionKo: "월세, 관리비, 공과금",
    sortOrder: 100,
    isSystem: true,
  },
  {
    slug: "communication",
    kind: "communication",
    nameKo: "통신",
    descriptionKo: "휴대폰, 인터넷, 통신비",
    sortOrder: 110,
    isSystem: true,
  },
  {
    slug: "shopping",
    kind: "shopping",
    nameKo: "쇼핑",
    descriptionKo: "의류, 생활용품, 온라인 구매",
    sortOrder: 120,
    isSystem: true,
  },
  {
    slug: "health",
    kind: "health",
    nameKo: "건강",
    descriptionKo: "운동, 건강관리, 헬스장",
    sortOrder: 130,
    isSystem: true,
  },
  {
    slug: "education",
    kind: "education",
    nameKo: "교육",
    descriptionKo: "강의, 도서, 학습 비용",
    sortOrder: 140,
    isSystem: true,
  },
  {
    slug: "hobby",
    kind: "hobby",
    nameKo: "취미",
    descriptionKo: "게임, 문화생활, 취미 활동",
    sortOrder: 150,
    isSystem: true,
  },
  {
    slug: "family",
    kind: "family",
    nameKo: "가족",
    descriptionKo: "가족 지원 및 경조사",
    sortOrder: 160,
    isSystem: true,
  },
  {
    slug: "tax",
    kind: "tax",
    nameKo: "세금",
    descriptionKo: "세금, 공과금, 수수료",
    sortOrder: 170,
    isSystem: true,
  },
  {
    slug: "medical",
    kind: "medical",
    nameKo: "의료",
    descriptionKo: "병원, 약국, 치료비",
    sortOrder: 180,
    isSystem: true,
  },
  {
    slug: "gift",
    kind: "gift",
    nameKo: "선물",
    descriptionKo: "선물, 기념일, 축하 비용",
    sortOrder: 190,
    isSystem: true,
  },
  {
    slug: "pet",
    kind: "pet",
    nameKo: "반려동물",
    descriptionKo: "반려동물 사료, 병원, 용품",
    sortOrder: 200,
    isSystem: true,
  },
  {
    slug: "beauty",
    kind: "beauty",
    nameKo: "미용",
    descriptionKo: "미용실, 화장품, 관리 비용",
    sortOrder: 210,
    isSystem: true,
  },
  {
    slug: "travel",
    kind: "travel",
    nameKo: "여행",
    descriptionKo: "숙박, 항공, 여행 경비",
    sortOrder: 220,
    isSystem: true,
  },
  {
    slug: "other",
    kind: "other",
    nameKo: "기타",
    descriptionKo: "분류되지 않은 기타 지출",
    sortOrder: 999,
    isSystem: true,
  },
] as const satisfies readonly ExpenseCategorySeed[];

const assertKrw = (value: number, name: string): number => {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(
      `${name} must be a non-negative safe integer KRW amount.`,
    );
  return value;
};

const clampBps = (value: number): number =>
  Math.max(0, Math.min(1000000, Math.trunc(value)));

export const calculateDailyBudget = (
  input: DailyBudgetCalculationInput,
): DailyBudgetCalculationResult => {
  const plannedAmountKrw = assertKrw(
    input.plannedAmountKrw,
    "plannedAmountKrw",
  );
  const fixedExpenseAmountKrw = assertKrw(
    input.fixedExpenseAmountKrw ?? 0,
    "fixedExpenseAmountKrw",
  );
  const variableExpenseAmountKrw = assertKrw(
    input.variableExpenseAmountKrw ?? 0,
    "variableExpenseAmountKrw",
  );
  const refundAmountKrw = assertKrw(
    input.refundAmountKrw ?? 0,
    "refundAmountKrw",
  );
  const usedAmountKrw = Math.max(
    0,
    fixedExpenseAmountKrw + variableExpenseAmountKrw - refundAmountKrw,
  );
  const remainingAmountKrw = Math.max(0, plannedAmountKrw - usedAmountKrw);
  const overAmountKrw = Math.max(0, usedAmountKrw - plannedAmountKrw);
  const usageRateBps =
    plannedAmountKrw === 0
      ? 0
      : clampBps((usedAmountKrw / plannedAmountKrw) * 10000);
  return {
    plannedAmountKrw,
    fixedExpenseAmountKrw,
    variableExpenseAmountKrw,
    refundAmountKrw,
    usedAmountKrw,
    remainingAmountKrw,
    overAmountKrw,
    usageRateBps,
  };
};

export const calculateMonthlyExpense = (
  input: MonthlyExpenseCalculationInput,
): MonthlyExpenseCalculationResult => {
  const plannedFixedExpenseKrw = assertKrw(
    input.plannedFixedExpenseKrw ?? 0,
    "plannedFixedExpenseKrw",
  );
  const plannedVariableExpenseKrw = assertKrw(
    input.plannedVariableExpenseKrw ?? 0,
    "plannedVariableExpenseKrw",
  );
  const plannedLivingBudgetKrw = assertKrw(
    input.plannedLivingBudgetKrw ?? 0,
    "plannedLivingBudgetKrw",
  );
  const actualFixedExpenseKrw = assertKrw(
    input.actualFixedExpenseKrw ?? 0,
    "actualFixedExpenseKrw",
  );
  const actualVariableExpenseKrw = assertKrw(
    input.actualVariableExpenseKrw ?? 0,
    "actualVariableExpenseKrw",
  );
  const refundAmountKrw = assertKrw(
    input.refundAmountKrw ?? 0,
    "refundAmountKrw",
  );
  const plannedExpenseKrw =
    plannedFixedExpenseKrw + plannedVariableExpenseKrw + plannedLivingBudgetKrw;
  const actualExpenseKrw = actualFixedExpenseKrw + actualVariableExpenseKrw;
  const netExpenseKrw = Math.max(0, actualExpenseKrw - refundAmountKrw);
  const savedAgainstPlanKrw = Math.max(0, plannedExpenseKrw - netExpenseKrw);
  const overPlanAmountKrw = Math.max(0, netExpenseKrw - plannedExpenseKrw);
  return {
    plannedExpenseKrw,
    actualExpenseKrw,
    refundAmountKrw,
    netExpenseKrw,
    savedAgainstPlanKrw,
    overPlanAmountKrw,
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

export const renderExpensesColumnSql = (column: DbColumnSpec): string => {
  const parts = [quoteIdentifier(column.name), column.type];
  if (column.primaryKey) parts.push("primary key");
  if (column.notNull) parts.push("not null");
  if (column.unique) parts.push("unique");
  if (column.defaultSql) parts.push("default", column.defaultSql);
  if (column.references) parts.push(renderColumnReference(column.references));
  for (const checkSql of column.checks ?? []) parts.push(`check (${checkSql})`);
  return parts.join(" ");
};

export const renderExpensesCreateTableSql = (table: DbTableSpec): string => {
  const body = [
    ...table.columns.map(renderExpensesColumnSql),
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

export const renderExpensesCreateIndexSql = (index: DbIndexSpec): string => {
  const unique = index.unique ? "unique " : "";
  const method = index.method ? ` using ${index.method}` : "";
  const columns = index.columns.map(quoteIdentifier).join(", ");
  const where = index.whereSql ? ` where ${index.whereSql}` : "";
  return `create ${unique}index if not exists ${quoteIdentifier(index.name)} on ${quoteIdentifier(index.table)}${method} (${columns})${where};`;
};

export const renderExpensesPolicySql = (policy: DbPolicySpec): string => {
  const command = policy.command.toUpperCase();
  const usingSql = policy.usingSql ? `\n  using (${policy.usingSql})` : "";
  const checkSql = policy.checkSql ? `\n  with check (${policy.checkSql})` : "";
  return `create policy ${quoteIdentifier(policy.name)} on ${quoteIdentifier(policy.table)} for ${command} to ${policy.role}${usingSql}${checkSql};`;
};

const orderExpensesTablesForDdl = (
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
    if (visiting.has(table.name)) {
      throw new Error(
        `Circular expenses schema table dependency detected: ${table.name}`,
      );
    }

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

export const expensesSchemaTablesInDdlOrder =
  orderExpensesTablesForDdl(expensesSchemaTables);

export const expensesSchemaDdl = Object.freeze({
  extensions: ["create extension if not exists pgcrypto;"],
  tables: expensesSchemaTablesInDdlOrder.map(renderExpensesCreateTableSql),
  indexes: expensesSchemaIndexes.map(renderExpensesCreateIndexSql),
  rls: expensesSchemaTables.map(
    (table) =>
      `alter table ${quoteIdentifier(table.name)} enable row level security;`,
  ),
  policies: expensesSchemaPolicies.map(renderExpensesPolicySql),
});

export const expensesSchemaRequiredTableNames = [
  "expense_categories",
  "fixed_expense_rules",
  "fixed_expense_occurrences",
  "daily_budget_periods",
  "expense_events",
  "expense_refunds",
  "monthly_expense_periods",
  "expense_budget_snapshots",
  "expense_post_attachments",
  "expense_import_batches",
  "expense_import_items",
  "expense_reconciliations",
  "expense_idempotency_records",
  "expense_audit_events",
] as const;

export type ExpenseTableName =
  (typeof expensesSchemaRequiredTableNames)[number];

const getTable = (name: ExpenseTableName): DbTableSpec | undefined =>
  expensesSchemaTables.find((table) => table.name === name);
const getColumnNames = (tableName: ExpenseTableName): Set<string> =>
  new Set(getTable(tableName)?.columns.map((column) => column.name) ?? []);

const getExpenseCalculationSmokeTests =
  (): readonly ExpenseCalculationSmokeTestResult[] => {
    const normal = calculateDailyBudget({
      plannedAmountKrw: 20000,
      fixedExpenseAmountKrw: 0,
      variableExpenseAmountKrw: 13000,
    });
    const over = calculateDailyBudget({
      plannedAmountKrw: 20000,
      variableExpenseAmountKrw: 35000,
      refundAmountKrw: 5000,
    });
    const monthly = calculateMonthlyExpense({
      plannedFixedExpenseKrw: 60000,
      plannedVariableExpenseKrw: 300000,
      plannedLivingBudgetKrw: 600000,
      actualFixedExpenseKrw: 60000,
      actualVariableExpenseKrw: 390000,
      refundAmountKrw: 20000,
    });
    return [
      {
        name: "daily_used_amount",
        expected: 13000,
        actual: normal.usedAmountKrw,
        ok: normal.usedAmountKrw === 13000,
      },
      {
        name: "daily_remaining_floor",
        expected: 7000,
        actual: normal.remainingAmountKrw,
        ok: normal.remainingAmountKrw === 7000,
      },
      {
        name: "daily_over_amount",
        expected: 10000,
        actual: over.overAmountKrw,
        ok: over.overAmountKrw === 10000,
      },
      {
        name: "daily_no_negative_remaining",
        expected: 0,
        actual: over.remainingAmountKrw,
        ok: over.remainingAmountKrw === 0,
      },
      {
        name: "monthly_net_expense",
        expected: 430000,
        actual: monthly.netExpenseKrw,
        ok: monthly.netExpenseKrw === 430000,
      },
      {
        name: "monthly_saved_against_plan",
        expected: 530000,
        actual: monthly.savedAgainstPlanKrw,
        ok: monthly.savedAgainstPlanKrw === 530000,
      },
    ];
  };

export const getExpensesSchemaCompletenessReport =
  (): ExpensesSchemaCompletenessReport => {
    const tableNames = new Set(expensesSchemaTables.map((table) => table.name));
    const policyTables = new Set(
      expensesSchemaPolicies.map((policy) => policy.table),
    );
    const calculationSmokeTests = getExpenseCalculationSmokeTests();
    const missing: string[] = [];

    for (const requiredTableName of expensesSchemaRequiredTableNames) {
      if (!tableNames.has(requiredTableName))
        missing.push(`missing table: ${requiredTableName}`);
    }

    for (const table of expensesSchemaTables) {
      if (table.rlsRequired !== true)
        missing.push(`RLS must be required: ${table.name}`);
      if (table.auditRequired !== true)
        missing.push(`audit must be required: ${table.name}`);
      if (table.serverAuthorityRequired !== true)
        missing.push(`server authority must be required: ${table.name}`);
      if (table.containsRawToken !== false)
        missing.push(`raw token flag must be false: ${table.name}`);
      if (table.containsRawSecret !== false)
        missing.push(`raw secret flag must be false: ${table.name}`);
      if (table.containsRawPii !== false)
        missing.push(`raw pii flag must be false: ${table.name}`);
      if (!policyTables.has(table.name))
        missing.push(`missing policy coverage: ${table.name}`);
    }

    for (const tableName of expensesSchemaRequiredTableNames) {
      const columns = getColumnNames(tableName);
      for (const safetyColumn of safetyFlagColumns) {
        if (!columns.has(safetyColumn.name))
          missing.push(
            `missing safety column ${safetyColumn.name} on ${tableName}`,
          );
      }
    }

    const eventColumns = getColumnNames("expense_events");
    for (const required of [
      "expense_event_id",
      "user_id",
      "category_id",
      "daily_budget_period_id",
      "kind",
      "status",
      "source_type",
      "payment_method",
      "idempotency_key",
      "occurred_on",
      "occurred_at",
      "name",
      "amount_krw",
      "refunded_amount_krw",
      "net_amount_krw",
    ] as const) {
      if (!eventColumns.has(required))
        missing.push(`missing expense_events column: ${required}`);
    }

    const dailyColumns = getColumnNames("daily_budget_periods");
    for (const required of [
      "planned_amount_krw",
      "fixed_expense_amount_krw",
      "variable_expense_amount_krw",
      "refund_amount_krw",
      "used_amount_krw",
      "remaining_amount_krw",
      "over_amount_krw",
      "usage_rate_bps",
    ] as const) {
      if (!dailyColumns.has(required))
        missing.push(`missing daily_budget_periods column: ${required}`);
    }

    const monthlyColumns = getColumnNames("monthly_expense_periods");
    for (const required of [
      "planned_expense_krw",
      "actual_expense_krw",
      "net_expense_krw",
      "saved_against_plan_krw",
      "over_plan_amount_krw",
    ] as const) {
      if (!monthlyColumns.has(required))
        missing.push(`missing monthly_expense_periods column: ${required}`);
    }

    for (const requiredKind of expenseCategoryKinds) {
      if (!expenseCategorySeeds.some((seed) => seed.kind === requiredKind))
        missing.push(`missing category seed: ${requiredKind}`);
    }

    if (
      !expensesSchemaIndexes.some(
        (index) => index.name === "idx_expense_events_daily_budget",
      )
    )
      missing.push("missing daily budget expense event index");
    if (
      !expensesSchemaIndexes.some(
        (index) => index.name === "idx_fixed_expense_rules_user_status_due",
      )
    )
      missing.push("missing fixed expense due index");
    if (
      !expensesSchemaIndexes.some(
        (index) => index.name === "idx_monthly_expense_periods_user_month",
      )
    )
      missing.push("missing monthly expense lookup index");

    const ddlOrder = new Map(
      expensesSchemaTablesInDdlOrder.map(
        (table, index) => [table.name, index] as const,
      ),
    );
    const internalTableNames = new Set(
      expensesSchemaTables.map((table) => table.name),
    );

    for (const table of expensesSchemaTables) {
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
      tableCount: expensesSchemaTables.length,
      indexCount: expensesSchemaIndexes.length,
      policyCount: expensesSchemaPolicies.length,
      seedCount: expenseCategorySeeds.length,
      ddlStatementCount:
        expensesSchemaDdl.extensions.length +
        expensesSchemaDdl.tables.length +
        expensesSchemaDdl.indexes.length +
        expensesSchemaDdl.rls.length +
        expensesSchemaDdl.policies.length,
      calculationSmokeTests,
      missing,
    };
  };

export const assertExpensesSchemaCompleteness = (): void => {
  const report = getExpensesSchemaCompletenessReport();
  if (!report.ok)
    throw new Error(
      `Expenses schema is incomplete: ${report.missing.join(", ")}`,
    );
};

assertExpensesSchemaCompleteness();

export const expensesSchema = Object.freeze({
  policy: expensesSchemaPolicy,
  categoryKinds: expenseCategoryKinds,
  eventKinds: expenseEventKinds,
  fixedExpenseRuleStatuses,
  expenseEventStatuses,
  sourceTypes: expenseSourceTypes,
  recurringFrequencies,
  paymentMethods: expensePaymentMethods,
  attachmentScanStatuses: expenseAttachmentScanStatuses,
  budgetPeriodStatuses,
  budgetSnapshotKinds,
  importBatchStatuses,
  importItemStatuses,
  reconciliationStatuses,
  idempotencyRecordStatuses,
  auditEventTypes: expenseAuditEventTypes,
  tables: expensesSchemaTables,
  ddlTables: expensesSchemaTablesInDdlOrder,
  indexes: expensesSchemaIndexes,
  policies: expensesSchemaPolicies,
  categorySeeds: expenseCategorySeeds,
  ddl: expensesSchemaDdl,
  calculateDailyBudget,
  calculateMonthlyExpense,
  getCompletenessReport: getExpensesSchemaCompletenessReport,
  assertCompleteness: assertExpensesSchemaCompleteness,
});

export default expensesSchema;
