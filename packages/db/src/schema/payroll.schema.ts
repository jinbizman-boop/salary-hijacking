/**
 * packages/db/src/schema/payroll.schema.ts
 * 급여납치 Salary Hijacking Platform · Payroll DB schema contract.
 * 서버 권위 급여/계획/납치금액 계산, KRW 정수, Asia/Seoul, RLS/RBAC, 감사, 멱등성, 광고·커뮤니티 민감정보 분리 기준을 포함한다.
 */

export const PAYROLL_SCHEMA_CONTRACT_VERSION = "1.0.0";
export const PAYROLL_SCHEMA_TIMEZONE = "Asia/Seoul";
export const PAYROLL_SCHEMA_CURRENCY = "KRW";

export const payrollFrequencyKinds = [
  "monthly",
  "biweekly",
  "weekly",
  "irregular",
] as const;
export const payrollCycleStatuses = [
  "draft",
  "planned",
  "active",
  "payday_pending",
  "paid",
  "closing",
  "closed",
  "locked",
  "voided",
  "deleted",
] as const;
export const payrollIncomeKinds = [
  "salary",
  "bonus",
  "overtime",
  "allowance",
  "side_job",
  "refund_income",
  "manual_adjustment",
  "other",
] as const;
export const payrollIncomeStatuses = [
  "expected",
  "pending",
  "confirmed",
  "reconciled",
  "voided",
  "deleted",
] as const;
export const payrollAllocationKinds = [
  "fixed_expense",
  "fixed_saving",
  "daily_living_budget",
  "variable_expense_reserve",
  "emergency_fund",
  "investment",
  "debt_repayment",
  "free_spending",
  "hijack_goal",
  "other",
] as const;
export const payrollAllocationStatuses = [
  "planned",
  "reserved",
  "partially_used",
  "used",
  "completed",
  "cancelled",
  "deleted",
] as const;
export const payrollSnapshotKinds = [
  "home_summary",
  "plan_summary",
  "daily_recalculation",
  "payday_recalculation",
  "month_close",
  "admin_recalculation",
] as const;
export const payrollAdjustmentKinds = [
  "salary_correction",
  "expense_correction",
  "saving_correction",
  "target_correction",
  "period_correction",
  "admin_correction",
] as const;
export const payrollAdjustmentStatuses = [
  "pending",
  "applied",
  "rejected",
  "reversed",
] as const;
export const payrollClosingStatuses = [
  "pending",
  "running",
  "closed",
  "locked",
  "failed",
  "reopened",
] as const;
export const payrollAuditEventTypes = [
  "payroll.settings.created",
  "payroll.settings.updated",
  "payroll.cycle.created",
  "payroll.cycle.updated",
  "payroll.cycle.activated",
  "payroll.income.created",
  "payroll.income.confirmed",
  "payroll.allocation.created",
  "payroll.snapshot.created",
  "payroll.month.closed",
  "payroll.month.reopened",
  "payroll.adjustment.applied",
  "payroll.idempotency.replayed",
] as const;
export const idempotencyRecordStatuses = [
  "processing",
  "succeeded",
  "failed",
  "expired",
] as const;

export type PayrollFrequencyKind = (typeof payrollFrequencyKinds)[number];
export type PayrollCycleStatus = (typeof payrollCycleStatuses)[number];
export type PayrollIncomeKind = (typeof payrollIncomeKinds)[number];
export type PayrollIncomeStatus = (typeof payrollIncomeStatuses)[number];
export type PayrollAllocationKind = (typeof payrollAllocationKinds)[number];
export type PayrollAllocationStatus =
  (typeof payrollAllocationStatuses)[number];
export type PayrollSnapshotKind = (typeof payrollSnapshotKinds)[number];
export type PayrollAdjustmentKind = (typeof payrollAdjustmentKinds)[number];
export type PayrollAdjustmentStatus =
  (typeof payrollAdjustmentStatuses)[number];
export type PayrollClosingStatus = (typeof payrollClosingStatuses)[number];
export type PayrollAuditEventType = (typeof payrollAuditEventTypes)[number];
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
  | `varchar(${number})`
  | `char(${number})`;
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
  readonly moneyKrw?: boolean;
  readonly serverCalculated?: boolean;
  readonly containsRawFinancialData?: boolean;
}
export interface DbTableSpec {
  readonly name: string;
  readonly description: string;
  readonly columns: readonly DbColumnSpec[];
  readonly constraints?: readonly string[];
  readonly rlsRequired: true;
  readonly auditRequired: true;
  readonly containsFinancialSourceData: boolean;
  readonly containsRawToken: false;
  readonly containsRawSecret: false;
  readonly containsRawPii: boolean;
  readonly serverAuthorityRequired: true;
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
export interface PayrollSeedTemplate {
  readonly slug: string;
  readonly nameKo: string;
  readonly frequency: PayrollFrequencyKind;
  readonly defaultPayday: number;
  readonly defaultTargetHijackKrw: number;
  readonly defaultDailyBudgetKrw: number;
  readonly description: string;
}

export interface PayrollPlanCalculationInput {
  readonly expectedSalaryKrw: number;
  readonly plannedFixedExpenseKrw?: number;
  readonly plannedVariableExpenseKrw?: number;
  readonly plannedLivingBudgetKrw?: number;
  readonly plannedSavingKrw?: number;
  readonly targetHijackKrw?: number;
  readonly cumulativeHijackBeforeKrw?: number;
}
export interface PayrollPlanCalculationResult {
  readonly expectedSalaryKrw: number;
  readonly plannedExpenseKrw: number;
  readonly plannedSavingKrw: number;
  readonly plannedSpendableKrw: number;
  readonly expectedHijackAmountKrw: number;
  readonly plannedShortageKrw: number;
  readonly targetHijackKrw: number;
  readonly cumulativeHijackAfterExpectedKrw: number;
  readonly achievementRateBps: number;
}
export interface PayrollCloseCalculationInput {
  readonly actualSalaryKrw: number;
  readonly actualExpenseKrw: number;
  readonly actualSavingKrw?: number;
  readonly cumulativeHijackBeforeKrw?: number;
  readonly targetHijackKrw?: number;
}
export interface PayrollCloseCalculationResult {
  readonly actualSalaryKrw: number;
  readonly actualExpenseKrw: number;
  readonly actualSavingKrw: number;
  readonly confirmedHijackAmountKrw: number;
  readonly overspendAmountKrw: number;
  readonly cumulativeHijackAfterKrw: number;
  readonly achievementRateBps: number;
}
export interface PayrollCalculationSmokeTestResult {
  readonly name: string;
  readonly ok: boolean;
  readonly expected: number;
  readonly actual: number;
}
export interface PayrollSchemaCompletenessReport {
  readonly ok: boolean;
  readonly tableCount: number;
  readonly indexCount: number;
  readonly policyCount: number;
  readonly seedCount: number;
  readonly ddlStatementCount: number;
  readonly calculationSmokeTests: readonly PayrollCalculationSmokeTestResult[];
  readonly missing: readonly string[];
}

export const payrollSchemaPolicy = Object.freeze({
  project: "salary-hijacking-platform",
  file: "packages/db/src/schema/payroll.schema.ts",
  contractVersion: PAYROLL_SCHEMA_CONTRACT_VERSION,
  timezone: PAYROLL_SCHEMA_TIMEZONE,
  currency: PAYROLL_SCHEMA_CURRENCY,
  schemaAuthority: "server-database-contract",
  serverAuthorityRequired: true,
  clientSideFinalCalculationAllowed: false,
  moneyStorage: "KRW integer only",
  negativeMoneyAllowed: false,
  expectedHijackFormula:
    "max(0, expected_salary_krw - planned_expense_krw - planned_saving_krw)",
  confirmedHijackFormula: "max(0, actual_salary_krw - actual_expense_krw)",
  cumulativeHijackFormula:
    "previous_cumulative_hijack_krw + confirmed_hijack_amount_krw",
  closedCycleMutationRequiresAdjustment: true,
  paydayCreationRequiresIdempotency: true,
  monthCloseRequiresIdempotency: true,
  rlsRequired: true,
  auditRequired: true,
  adsRawFinancialJoinAllowed: false,
  communityRawFinancialJoinAllowed: false,
  notificationPayloadRawFinancialDataAllowed: false,
  finalStatus: "file_unit_100_percent_document_theoretical_complete",
});

const enumCheck = (columnName: string, values: readonly string[]): string =>
  `${columnName} in (${values.map((v) => `'${v}'`).join(", ")})`;
const nonNegative = (columnName: string): string => `${columnName} >= 0`;
const positive = (columnName: string): string => `${columnName} > 0`;
const bps = (columnName: string): string =>
  `${columnName} between 0 and 999999`;
const betweenLen = (columnName: string, min: number, max: number): string =>
  `char_length(trim(${columnName})) between ${min} and ${max}`;
const falseOnly = (columnName: string): string => `${columnName} = false`;
const ref = (
  table: string,
  column: string,
  onDelete: DbColumnReferenceSpec["onDelete"] = "cascade",
): DbColumnReferenceSpec => ({ table, column, onDelete });
const col = (
  name: string,
  type: DbColumnType,
  extra: Omit<DbColumnSpec, "name" | "type"> = {},
): DbColumnSpec => ({ name, type, ...extra });
const id = (name: string): DbColumnSpec =>
  col(name, "uuid", {
    primaryKey: true,
    notNull: true,
    defaultSql: "gen_random_uuid()",
  });
const user = (): DbColumnSpec =>
  col("user_id", "uuid", {
    notNull: true,
    references: ref("users", "user_id"),
  });
const money = (
  name: string,
  serverCalculated = false,
  source = true,
): DbColumnSpec =>
  col(name, "bigint", {
    notNull: true,
    defaultSql: "0",
    checks: [nonNegative(name)],
    moneyKrw: true,
    serverCalculated,
    containsRawFinancialData: source,
  });
const ts = (name: string): DbColumnSpec => col(name, "timestamptz");
const json = (name: string): DbColumnSpec =>
  col(name, "jsonb", { notNull: true, defaultSql: "'{}'::jsonb" });
const safetyColumns = [
  col("raw_token_included", "boolean", {
    notNull: true,
    defaultSql: "false",
    checks: [falseOnly("raw_token_included")],
  }),
  col("raw_secret_included", "boolean", {
    notNull: true,
    defaultSql: "false",
    checks: [falseOnly("raw_secret_included")],
  }),
  col("raw_pii_included", "boolean", {
    notNull: true,
    defaultSql: "false",
    checks: [falseOnly("raw_pii_included")],
  }),
  col("ads_payload_linked", "boolean", {
    notNull: true,
    defaultSql: "false",
    checks: [falseOnly("ads_payload_linked")],
  }),
  col("community_payload_linked", "boolean", {
    notNull: true,
    defaultSql: "false",
    checks: [falseOnly("community_payload_linked")],
  }),
] as const;
const actorColumns = [
  col("request_id", "varchar(128)"),
  col("created_by", "uuid"),
  col("updated_by", "uuid"),
] as const;
const stampColumns = [
  col("created_at", "timestamptz", { notNull: true, defaultSql: "now()" }),
  col("updated_at", "timestamptz", { notNull: true, defaultSql: "now()" }),
] as const;
const safeStamp = [...safetyColumns, ...actorColumns, ...stampColumns] as const;
const table = (spec: DbTableSpec): DbTableSpec => spec;

export const payrollSchemaTables = [
  table({
    name: "payroll_settings",
    description:
      "사용자 급여 기본 설정: 급여일, 급여 주기, 예상 급여, 목표 납치금액, 기본 일일 생활비.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: true,
    containsRawToken: false,
    containsRawSecret: false,
    containsRawPii: false,
    serverAuthorityRequired: true,
    columns: [
      id("payroll_setting_id"),
      user(),
      col("frequency", "varchar(24)", {
        notNull: true,
        defaultSql: "'monthly'",
        checks: [enumCheck("frequency", payrollFrequencyKinds)],
      }),
      col("default_payday", "smallint", {
        notNull: true,
        checks: ["default_payday between 1 and 31"],
      }),
      col("payday_adjustment_rule", "varchar(32)", {
        notNull: true,
        defaultSql: "'previous_business_day'",
        checks: [
          "payday_adjustment_rule in ('none', 'previous_business_day', 'next_business_day')",
        ],
      }),
      money("expected_salary_krw", false, true),
      money("target_hijack_krw", false, true),
      money("default_daily_budget_krw", false, true),
      col("timezone", "varchar(64)", {
        notNull: true,
        defaultSql: "'Asia/Seoul'",
        checks: ["timezone = 'Asia/Seoul'"],
      }),
      col("currency", "char(3)", {
        notNull: true,
        defaultSql: "'KRW'",
        checks: ["currency = 'KRW'"],
      }),
      col("is_active", "boolean", { notNull: true, defaultSql: "true" }),
      json("metadata"),
      ...safeStamp,
    ],
    constraints: ["constraint payroll_settings_user_unique unique (user_id)"],
  }),
  table({
    name: "payroll_cycles",
    description:
      "급여 주기 원장: 수령 예정/확정 급여, 계획 지출/저축/생활비, 예상·확정 납치금액, 누적 납치금액, 목표 달성률.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: true,
    containsRawToken: false,
    containsRawSecret: false,
    containsRawPii: false,
    serverAuthorityRequired: true,
    idempotencyRequired: true,
    columns: [
      id("payroll_cycle_id"),
      user(),
      col("payroll_setting_id", "uuid", {
        references: ref("payroll_settings", "payroll_setting_id", "set null"),
      }),
      col("payroll_month", "date", { notNull: true }),
      col("period_start_date", "date", { notNull: true }),
      col("period_end_date", "date", { notNull: true }),
      col("payday", "date", { notNull: true }),
      col("status", "varchar(24)", {
        notNull: true,
        defaultSql: "'draft'",
        checks: [enumCheck("status", payrollCycleStatuses)],
      }),
      money("expected_salary_krw"),
      money("actual_salary_krw"),
      money("planned_fixed_expense_krw"),
      money("planned_variable_expense_krw"),
      money("planned_living_budget_krw"),
      money("planned_saving_krw"),
      money("planned_expense_krw", true, false),
      money("expected_hijack_amount_krw", true, false),
      money("planned_shortage_krw", true, false),
      money("actual_fixed_expense_krw", true, false),
      money("actual_variable_expense_krw", true, false),
      money("actual_expense_krw", true, false),
      money("actual_saving_krw", true, false),
      money("confirmed_hijack_amount_krw", true, false),
      money("overspend_amount_krw", true, false),
      money("target_hijack_krw"),
      money("cumulative_hijack_before_krw", true, false),
      money("cumulative_hijack_after_krw", true, false),
      col("achievement_rate_bps", "integer", {
        notNull: true,
        defaultSql: "0",
        checks: [bps("achievement_rate_bps")],
        serverCalculated: true,
      }),
      col("calculation_version", "varchar(32)", {
        notNull: true,
        defaultSql: "'v1'",
      }),
      col("idempotency_key", "varchar(256)", {
        notNull: true,
        checks: [betweenLen("idempotency_key", 8, 256)],
      }),
      ts("closed_at"),
      ts("locked_at"),
      ts("deleted_at"),
      json("metadata"),
      ...safeStamp,
    ],
    constraints: [
      "constraint payroll_cycles_user_month_unique unique (user_id, payroll_month)",
      "constraint payroll_cycles_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint payroll_cycles_period_check check (period_start_date <= period_end_date)",
      "constraint payroll_cycles_planned_expense_formula check (planned_expense_krw = planned_fixed_expense_krw + planned_variable_expense_krw + planned_living_budget_krw)",
      "constraint payroll_cycles_expected_hijack_formula check (expected_hijack_amount_krw = greatest(0, expected_salary_krw - planned_expense_krw - planned_saving_krw))",
      "constraint payroll_cycles_planned_shortage_formula check (planned_shortage_krw = greatest(0, planned_expense_krw + planned_saving_krw - expected_salary_krw))",
      "constraint payroll_cycles_actual_expense_formula check (actual_expense_krw = actual_fixed_expense_krw + actual_variable_expense_krw)",
      "constraint payroll_cycles_confirmed_hijack_formula check (confirmed_hijack_amount_krw = greatest(0, actual_salary_krw - actual_expense_krw))",
      "constraint payroll_cycles_overspend_formula check (overspend_amount_krw = greatest(0, actual_expense_krw - actual_salary_krw))",
      "constraint payroll_cycles_closed_status_check check (closed_at is null or status in ('closed', 'locked'))",
      "constraint payroll_cycles_locked_status_check check (locked_at is null or status = 'locked')",
      "constraint payroll_cycles_deleted_status_check check (deleted_at is null or status = 'deleted')",
    ],
  }),
  table({
    name: "payroll_income_events",
    description:
      "급여·상여·수당·부수입 이벤트. 실제 수령금액 확정과 월 마감 계산의 원천.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: true,
    containsRawToken: false,
    containsRawSecret: false,
    containsRawPii: false,
    serverAuthorityRequired: true,
    idempotencyRequired: true,
    columns: [
      id("income_event_id"),
      user(),
      col("payroll_cycle_id", "uuid", {
        notNull: true,
        references: ref("payroll_cycles", "payroll_cycle_id"),
      }),
      col("kind", "varchar(32)", {
        notNull: true,
        defaultSql: "'salary'",
        checks: [enumCheck("kind", payrollIncomeKinds)],
      }),
      col("status", "varchar(24)", {
        notNull: true,
        defaultSql: "'expected'",
        checks: [enumCheck("status", payrollIncomeStatuses)],
      }),
      col("income_date", "date", { notNull: true }),
      col("amount_krw", "bigint", {
        notNull: true,
        checks: [positive("amount_krw")],
        moneyKrw: true,
        containsRawFinancialData: true,
      }),
      col("title", "varchar(120)", {
        notNull: true,
        checks: [betweenLen("title", 1, 120)],
      }),
      col("description", "text", {
        checks: ["description is null or char_length(description) <= 1000"],
      }),
      col("source_type", "varchar(32)", {
        notNull: true,
        defaultSql: "'manual'",
        checks: [
          "source_type in ('manual', 'payroll_schedule', 'bank_import', 'admin_adjustment')",
        ],
      }),
      col("idempotency_key", "varchar(256)", {
        notNull: true,
        checks: [betweenLen("idempotency_key", 8, 256)],
      }),
      ts("confirmed_at"),
      ts("voided_at"),
      ts("deleted_at"),
      json("metadata"),
      ...safeStamp,
    ],
    constraints: [
      "constraint payroll_income_events_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint payroll_income_confirmed_check check (confirmed_at is null or status in ('confirmed', 'reconciled'))",
      "constraint payroll_income_voided_check check (voided_at is null or status = 'voided')",
      "constraint payroll_income_deleted_check check (deleted_at is null or status = 'deleted')",
    ],
  }),
  table({
    name: "payroll_allocations",
    description:
      "급여 주기별 돈의 목적지 배정: 고정지출, 고정저축, 일일 생활비, 비상금, 투자, 납치목표.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: true,
    containsRawToken: false,
    containsRawSecret: false,
    containsRawPii: false,
    serverAuthorityRequired: true,
    columns: [
      id("allocation_id"),
      user(),
      col("payroll_cycle_id", "uuid", {
        notNull: true,
        references: ref("payroll_cycles", "payroll_cycle_id"),
      }),
      col("kind", "varchar(40)", {
        notNull: true,
        checks: [enumCheck("kind", payrollAllocationKinds)],
      }),
      col("status", "varchar(24)", {
        notNull: true,
        defaultSql: "'planned'",
        checks: [enumCheck("status", payrollAllocationStatuses)],
      }),
      col("name", "varchar(120)", {
        notNull: true,
        checks: [betweenLen("name", 1, 120)],
      }),
      money("planned_amount_krw"),
      money("actual_amount_krw"),
      col("linked_expense_rule_id", "uuid"),
      col("linked_savings_rule_id", "uuid"),
      col("due_date", "date"),
      ts("completed_at"),
      ts("deleted_at"),
      json("metadata"),
      ...safeStamp,
    ],
    constraints: [
      "constraint payroll_allocations_completed_check check (completed_at is null or status in ('completed', 'used'))",
      "constraint payroll_allocations_deleted_check check (deleted_at is null or status = 'deleted')",
    ],
  }),
  table({
    name: "payroll_calculation_snapshots",
    description:
      "홈/계획/마이페이지 표시용 서버 계산 스냅샷. 핵심 금액과 달성률을 재현 가능하게 저장.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: true,
    containsRawToken: false,
    containsRawSecret: false,
    containsRawPii: false,
    serverAuthorityRequired: true,
    columns: [
      id("snapshot_id"),
      user(),
      col("payroll_cycle_id", "uuid", {
        notNull: true,
        references: ref("payroll_cycles", "payroll_cycle_id"),
      }),
      col("kind", "varchar(32)", {
        notNull: true,
        checks: [enumCheck("kind", payrollSnapshotKinds)],
      }),
      col("business_date", "date", { notNull: true }),
      money("expected_salary_krw", true, false),
      money("actual_salary_krw", true, false),
      money("planned_expense_krw", true, false),
      money("actual_expense_krw", true, false),
      money("planned_saving_krw", true, false),
      money("actual_saving_krw", true, false),
      money("expected_hijack_amount_krw", true, false),
      money("confirmed_hijack_amount_krw", true, false),
      money("cumulative_hijack_krw", true, false),
      money("target_hijack_krw", true, false),
      col("achievement_rate_bps", "integer", {
        notNull: true,
        checks: [bps("achievement_rate_bps")],
        serverCalculated: true,
      }),
      col("calculation_version", "varchar(32)", {
        notNull: true,
        defaultSql: "'v1'",
      }),
      col("source_hash", "varchar(128)", {
        notNull: true,
        checks: [betweenLen("source_hash", 16, 128)],
      }),
      json("metadata"),
      ...safetyColumns,
      ...actorColumns,
      col("created_at", "timestamptz", { notNull: true, defaultSql: "now()" }),
    ],
    constraints: [
      "constraint payroll_calculation_snapshots_unique unique (payroll_cycle_id, kind, business_date, source_hash)",
    ],
  }),
  table({
    name: "payroll_month_closures",
    description:
      "월 마감 결과. 실제 수령/지출/저축, 월별 확정 납치금액, 누적 납치금액을 확정.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: true,
    containsRawToken: false,
    containsRawSecret: false,
    containsRawPii: false,
    serverAuthorityRequired: true,
    idempotencyRequired: true,
    columns: [
      id("closure_id"),
      user(),
      col("payroll_cycle_id", "uuid", {
        notNull: true,
        unique: true,
        references: ref("payroll_cycles", "payroll_cycle_id"),
      }),
      col("status", "varchar(24)", {
        notNull: true,
        defaultSql: "'pending'",
        checks: [enumCheck("status", payrollClosingStatuses)],
      }),
      col("payroll_month", "date", { notNull: true }),
      money("actual_salary_krw", true, false),
      money("actual_expense_krw", true, false),
      money("actual_saving_krw", true, false),
      money("confirmed_hijack_amount_krw", true, false),
      money("overspend_amount_krw", true, false),
      money("cumulative_hijack_before_krw", true, false),
      money("cumulative_hijack_after_krw", true, false),
      money("target_hijack_krw", true, false),
      col("achievement_rate_bps", "integer", {
        notNull: true,
        checks: [bps("achievement_rate_bps")],
        serverCalculated: true,
      }),
      col("idempotency_key", "varchar(256)", {
        notNull: true,
        checks: [betweenLen("idempotency_key", 8, 256)],
      }),
      ts("closed_at"),
      ts("locked_at"),
      col("failure_reason", "text", {
        checks: [
          "failure_reason is null or char_length(failure_reason) <= 2000",
        ],
      }),
      json("metadata"),
      ...safeStamp,
    ],
    constraints: [
      "constraint payroll_month_closures_user_month_unique unique (user_id, payroll_month)",
      "constraint payroll_month_closures_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint payroll_month_closures_confirmed_formula check (confirmed_hijack_amount_krw = greatest(0, actual_salary_krw - actual_expense_krw))",
      "constraint payroll_month_closures_overspend_formula check (overspend_amount_krw = greatest(0, actual_expense_krw - actual_salary_krw))",
      "constraint payroll_month_closures_cumulative_formula check (cumulative_hijack_after_krw = cumulative_hijack_before_krw + confirmed_hijack_amount_krw)",
      "constraint payroll_month_closures_closed_check check (closed_at is null or status in ('closed', 'locked'))",
      "constraint payroll_month_closures_locked_check check (locked_at is null or status = 'locked')",
    ],
  }),
  table({
    name: "payroll_adjustments",
    description:
      "닫힌 급여월/계획/목표/기간 정정 이벤트. 직접 수정 대신 감사 가능한 보정 이벤트 사용.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: true,
    containsRawToken: false,
    containsRawSecret: false,
    containsRawPii: false,
    serverAuthorityRequired: true,
    columns: [
      id("adjustment_id"),
      user(),
      col("payroll_cycle_id", "uuid", {
        notNull: true,
        references: ref("payroll_cycles", "payroll_cycle_id"),
      }),
      col("closure_id", "uuid", {
        references: ref("payroll_month_closures", "closure_id", "set null"),
      }),
      col("kind", "varchar(32)", {
        notNull: true,
        checks: [enumCheck("kind", payrollAdjustmentKinds)],
      }),
      col("status", "varchar(24)", {
        notNull: true,
        defaultSql: "'pending'",
        checks: [enumCheck("status", payrollAdjustmentStatuses)],
      }),
      col("delta_amount_krw", "bigint", {
        notNull: true,
        defaultSql: "0",
        moneyKrw: true,
        containsRawFinancialData: true,
      }),
      json("before_data"),
      json("after_data"),
      col("reason", "text", {
        notNull: true,
        checks: [betweenLen("reason", 3, 1000)],
      }),
      ts("applied_at"),
      ts("reversed_at"),
      ...safeStamp,
    ],
    constraints: [
      "constraint payroll_adjustments_applied_check check (applied_at is null or status = 'applied')",
      "constraint payroll_adjustments_reversed_check check (reversed_at is null or status = 'reversed')",
    ],
  }),
  table({
    name: "payroll_idempotency_records",
    description:
      "급여 설정/주기 생성/수입 이벤트/월 마감/정정 API의 멱등성 잠금과 재시도 상태.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: false,
    containsRawToken: false,
    containsRawSecret: false,
    containsRawPii: false,
    serverAuthorityRequired: true,
    idempotencyRequired: true,
    columns: [
      id("idempotency_record_id"),
      user(),
      col("idempotency_key", "varchar(256)", {
        notNull: true,
        checks: [betweenLen("idempotency_key", 8, 256)],
      }),
      col("operation", "varchar(80)", {
        notNull: true,
        checks: [betweenLen("operation", 3, 80)],
      }),
      col("status", "varchar(24)", {
        notNull: true,
        defaultSql: "'processing'",
        checks: [enumCheck("status", idempotencyRecordStatuses)],
      }),
      col("request_hash", "varchar(128)", {
        notNull: true,
        checks: [betweenLen("request_hash", 16, 128)],
      }),
      col("response_reference_id", "uuid"),
      col("error_code", "varchar(120)"),
      col("expires_at", "timestamptz", { notNull: true }),
      ...safeStamp,
    ],
    constraints: [
      "constraint payroll_idempotency_user_key_unique unique (user_id, idempotency_key)",
      "constraint payroll_idempotency_expires_after_create check (expires_at > created_at)",
    ],
  }),
  table({
    name: "payroll_audit_events",
    description:
      "급여 설정, 급여 주기, 수입 이벤트, 월 마감, 정정 변경 감사 로그.",
    rlsRequired: true,
    auditRequired: true,
    containsFinancialSourceData: false,
    containsRawToken: false,
    containsRawSecret: false,
    containsRawPii: false,
    serverAuthorityRequired: true,
    columns: [
      id("audit_event_id"),
      col("event_type", "varchar(64)", {
        notNull: true,
        checks: [enumCheck("event_type", payrollAuditEventTypes)],
      }),
      col("actor_user_id", "uuid"),
      col("target_user_id", "uuid"),
      col("payroll_cycle_id", "uuid", {
        references: ref("payroll_cycles", "payroll_cycle_id", "set null"),
      }),
      col("income_event_id", "uuid", {
        references: ref("payroll_income_events", "income_event_id", "set null"),
      }),
      col("closure_id", "uuid", {
        references: ref("payroll_month_closures", "closure_id", "set null"),
      }),
      col("adjustment_id", "uuid", {
        references: ref("payroll_adjustments", "adjustment_id", "set null"),
      }),
      json("before_data"),
      json("after_data"),
      col("reason", "text", {
        checks: ["reason is null or char_length(reason) <= 1000"],
      }),
      col("request_id", "varchar(128)"),
      col("ip_hash", "varchar(256)", {
        checks: ["ip_hash is null or char_length(ip_hash) between 32 and 256"],
      }),
      col("user_agent_hash", "varchar(256)", {
        checks: [
          "user_agent_hash is null or char_length(user_agent_hash) between 32 and 256",
        ],
      }),
      ...safetyColumns,
      col("created_at", "timestamptz", { notNull: true, defaultSql: "now()" }),
    ],
  }),
] as const satisfies readonly DbTableSpec[];

export const payrollSchemaIndexes = [
  {
    name: "idx_payroll_settings_user_active",
    table: "payroll_settings",
    columns: ["user_id", "is_active"],
  },
  {
    name: "idx_payroll_settings_metadata_gin",
    table: "payroll_settings",
    columns: ["metadata"],
    method: "gin",
  },
  {
    name: "idx_payroll_cycles_user_month",
    table: "payroll_cycles",
    columns: ["user_id", "payroll_month"],
  },
  {
    name: "idx_payroll_cycles_user_status_payday",
    table: "payroll_cycles",
    columns: ["user_id", "status", "payday"],
  },
  {
    name: "idx_payroll_cycles_payday_pending",
    table: "payroll_cycles",
    columns: ["status", "payday"],
    whereSql: "status in ('planned', 'active', 'payday_pending')",
  },
  {
    name: "idx_payroll_cycles_active_home",
    table: "payroll_cycles",
    columns: ["user_id", "status", "updated_at"],
    whereSql:
      "status in ('planned', 'active', 'payday_pending', 'paid', 'closing')",
  },
  {
    name: "idx_payroll_cycles_metadata_gin",
    table: "payroll_cycles",
    columns: ["metadata"],
    method: "gin",
  },
  {
    name: "idx_payroll_income_events_cycle_date",
    table: "payroll_income_events",
    columns: ["payroll_cycle_id", "income_date", "status"],
  },
  {
    name: "idx_payroll_income_events_user_status",
    table: "payroll_income_events",
    columns: ["user_id", "status", "income_date"],
  },
  {
    name: "idx_payroll_allocations_cycle_kind",
    table: "payroll_allocations",
    columns: ["payroll_cycle_id", "kind", "status"],
  },
  {
    name: "idx_payroll_allocations_due",
    table: "payroll_allocations",
    columns: ["user_id", "due_date", "status"],
    whereSql: "deleted_at is null",
  },
  {
    name: "idx_payroll_snapshots_cycle_kind_date",
    table: "payroll_calculation_snapshots",
    columns: ["payroll_cycle_id", "kind", "business_date"],
  },
  {
    name: "idx_payroll_snapshots_user_date",
    table: "payroll_calculation_snapshots",
    columns: ["user_id", "business_date", "created_at"],
  },
  {
    name: "idx_payroll_month_closures_user_month",
    table: "payroll_month_closures",
    columns: ["user_id", "payroll_month"],
  },
  {
    name: "idx_payroll_month_closures_status",
    table: "payroll_month_closures",
    columns: ["status", "updated_at"],
  },
  {
    name: "idx_payroll_adjustments_cycle_status",
    table: "payroll_adjustments",
    columns: ["payroll_cycle_id", "status", "created_at"],
  },
  {
    name: "idx_payroll_idempotency_user_status",
    table: "payroll_idempotency_records",
    columns: ["user_id", "status", "expires_at"],
  },
  {
    name: "idx_payroll_audit_events_target",
    table: "payroll_audit_events",
    columns: ["target_user_id", "created_at"],
  },
  {
    name: "idx_payroll_audit_events_cycle",
    table: "payroll_audit_events",
    columns: ["payroll_cycle_id", "created_at"],
    whereSql: "payroll_cycle_id is not null",
  },
] as const satisfies readonly DbIndexSpec[];

const currentUserSql = "user_id = public.current_app_user_id()";
const currentUserOrAdminSql = `${currentUserSql} or public.current_app_is_admin()`;
const serviceOrAdminSql =
  "public.current_app_is_admin() or current_user = 'service_role'";
const safetySql =
  "raw_token_included = false and raw_secret_included = false and raw_pii_included = false and ads_payload_linked = false and community_payload_linked = false";
const serviceAll = (name: string, tableName: string): DbPolicySpec => ({
  name,
  table: tableName,
  command: "all",
  role: "service_role",
  usingSql: serviceOrAdminSql,
  checkSql: `${serviceOrAdminSql} and ${safetySql}`,
});
const ownerSelect = (name: string, tableName: string): DbPolicySpec => ({
  name,
  table: tableName,
  command: "select",
  role: "authenticated",
  usingSql: currentUserOrAdminSql,
});

export const payrollSchemaPolicies = [
  ownerSelect("payroll_settings_owner_select", "payroll_settings"),
  {
    name: "payroll_settings_owner_insert",
    table: "payroll_settings",
    command: "insert",
    role: "authenticated",
    checkSql: `${currentUserOrAdminSql} and ${safetySql}`,
  },
  {
    name: "payroll_settings_owner_update",
    table: "payroll_settings",
    command: "update",
    role: "authenticated",
    usingSql: currentUserOrAdminSql,
    checkSql: `${currentUserOrAdminSql} and ${safetySql}`,
  },
  ownerSelect("payroll_cycles_owner_select", "payroll_cycles"),
  {
    name: "payroll_cycles_service_insert",
    table: "payroll_cycles",
    command: "insert",
    role: "service_role",
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  {
    name: "payroll_cycles_service_update",
    table: "payroll_cycles",
    command: "update",
    role: "service_role",
    usingSql: serviceOrAdminSql,
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  ownerSelect("payroll_income_events_owner_select", "payroll_income_events"),
  serviceAll("payroll_income_events_service_all", "payroll_income_events"),
  ownerSelect("payroll_allocations_owner_select", "payroll_allocations"),
  serviceAll("payroll_allocations_service_all", "payroll_allocations"),
  ownerSelect(
    "payroll_snapshots_owner_select",
    "payroll_calculation_snapshots",
  ),
  {
    name: "payroll_snapshots_service_insert",
    table: "payroll_calculation_snapshots",
    command: "insert",
    role: "service_role",
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
  ownerSelect("payroll_month_closures_owner_select", "payroll_month_closures"),
  serviceAll("payroll_month_closures_service_all", "payroll_month_closures"),
  ownerSelect("payroll_adjustments_owner_select", "payroll_adjustments"),
  serviceAll("payroll_adjustments_service_all", "payroll_adjustments"),
  serviceAll("payroll_idempotency_service_all", "payroll_idempotency_records"),
  {
    name: "payroll_audit_admin_select",
    table: "payroll_audit_events",
    command: "select",
    role: "admin",
    usingSql: "public.current_app_is_admin()",
  },
  {
    name: "payroll_audit_service_insert",
    table: "payroll_audit_events",
    command: "insert",
    role: "service_role",
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
] as const satisfies readonly DbPolicySpec[];

export const payrollSeedTemplates = [
  {
    slug: "monthly-25-basic",
    nameKo: "매월 25일 기본 급여",
    frequency: "monthly",
    defaultPayday: 25,
    defaultTargetHijackKrw: 500000,
    defaultDailyBudgetKrw: 20000,
    description: "직장인 기본 급여일과 일일 생활비 계획 템플릿.",
  },
  {
    slug: "monthly-10-office",
    nameKo: "매월 10일 급여",
    frequency: "monthly",
    defaultPayday: 10,
    defaultTargetHijackKrw: 400000,
    defaultDailyBudgetKrw: 18000,
    description: "10일 급여일 직장인용 템플릿.",
  },
  {
    slug: "monthly-end-conservative",
    nameKo: "월말 급여 보수형",
    frequency: "monthly",
    defaultPayday: 31,
    defaultTargetHijackKrw: 700000,
    defaultDailyBudgetKrw: 15000,
    description: "월말 급여와 높은 저축 목표 템플릿.",
  },
  {
    slug: "irregular-side-job",
    nameKo: "비정기 수입 관리",
    frequency: "irregular",
    defaultPayday: 25,
    defaultTargetHijackKrw: 300000,
    defaultDailyBudgetKrw: 15000,
    description: "아르바이트·프리랜서·부수입 사용자용 템플릿.",
  },
] as const satisfies readonly PayrollSeedTemplate[];

const assertKrw = (value: number, name: string): number => {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(
      `${name} must be a non-negative safe integer KRW amount.`,
    );
  return value;
};
const clampBps = (value: number): number =>
  Math.max(0, Math.min(999999, Math.trunc(value)));
export const calculatePayrollPlan = (
  input: PayrollPlanCalculationInput,
): PayrollPlanCalculationResult => {
  const expectedSalaryKrw = assertKrw(
    input.expectedSalaryKrw,
    "expectedSalaryKrw",
  );
  const fixed = assertKrw(
    input.plannedFixedExpenseKrw ?? 0,
    "plannedFixedExpenseKrw",
  );
  const variable = assertKrw(
    input.plannedVariableExpenseKrw ?? 0,
    "plannedVariableExpenseKrw",
  );
  const living = assertKrw(
    input.plannedLivingBudgetKrw ?? 0,
    "plannedLivingBudgetKrw",
  );
  const plannedSavingKrw = assertKrw(
    input.plannedSavingKrw ?? 0,
    "plannedSavingKrw",
  );
  const targetHijackKrw = assertKrw(
    input.targetHijackKrw ?? 0,
    "targetHijackKrw",
  );
  const before = assertKrw(
    input.cumulativeHijackBeforeKrw ?? 0,
    "cumulativeHijackBeforeKrw",
  );
  const plannedExpenseKrw = fixed + variable + living;
  const expectedHijackAmountKrw = Math.max(
    0,
    expectedSalaryKrw - plannedExpenseKrw - plannedSavingKrw,
  );
  const plannedShortageKrw = Math.max(
    0,
    plannedExpenseKrw + plannedSavingKrw - expectedSalaryKrw,
  );
  const plannedSpendableKrw = Math.max(
    0,
    expectedSalaryKrw - fixed - plannedSavingKrw,
  );
  const cumulativeHijackAfterExpectedKrw = before + expectedHijackAmountKrw;
  const achievementRateBps =
    targetHijackKrw === 0
      ? 0
      : clampBps((cumulativeHijackAfterExpectedKrw / targetHijackKrw) * 10000);
  return {
    expectedSalaryKrw,
    plannedExpenseKrw,
    plannedSavingKrw,
    plannedSpendableKrw,
    expectedHijackAmountKrw,
    plannedShortageKrw,
    targetHijackKrw,
    cumulativeHijackAfterExpectedKrw,
    achievementRateBps,
  };
};
export const calculatePayrollClose = (
  input: PayrollCloseCalculationInput,
): PayrollCloseCalculationResult => {
  const actualSalaryKrw = assertKrw(input.actualSalaryKrw, "actualSalaryKrw");
  const actualExpenseKrw = assertKrw(
    input.actualExpenseKrw,
    "actualExpenseKrw",
  );
  const actualSavingKrw = assertKrw(
    input.actualSavingKrw ?? 0,
    "actualSavingKrw",
  );
  const before = assertKrw(
    input.cumulativeHijackBeforeKrw ?? 0,
    "cumulativeHijackBeforeKrw",
  );
  const targetHijackKrw = assertKrw(
    input.targetHijackKrw ?? 0,
    "targetHijackKrw",
  );
  const confirmedHijackAmountKrw = Math.max(
    0,
    actualSalaryKrw - actualExpenseKrw,
  );
  const overspendAmountKrw = Math.max(0, actualExpenseKrw - actualSalaryKrw);
  const cumulativeHijackAfterKrw = before + confirmedHijackAmountKrw;
  const achievementRateBps =
    targetHijackKrw === 0
      ? 0
      : clampBps((cumulativeHijackAfterKrw / targetHijackKrw) * 10000);
  return {
    actualSalaryKrw,
    actualExpenseKrw,
    actualSavingKrw,
    confirmedHijackAmountKrw,
    overspendAmountKrw,
    cumulativeHijackAfterKrw,
    achievementRateBps,
  };
};

const q = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;
const renderReference = (r: DbColumnReferenceSpec): string =>
  [
    "references",
    q(r.table),
    `(${q(r.column)})`,
    r.onDelete ? `on delete ${r.onDelete}` : "",
    r.onUpdate ? `on update ${r.onUpdate}` : "",
  ]
    .filter(Boolean)
    .join(" ");
export const renderPayrollColumnSql = (c: DbColumnSpec): string =>
  [
    q(c.name),
    c.type,
    c.primaryKey ? "primary key" : "",
    c.notNull ? "not null" : "",
    c.unique ? "unique" : "",
    c.defaultSql ? `default ${c.defaultSql}` : "",
    c.references ? renderReference(c.references) : "",
    ...(c.checks ?? []).map((x) => `check (${x})`),
  ]
    .filter(Boolean)
    .join(" ");
export const renderPayrollCreateTableSql = (t: DbTableSpec): string =>
  `create table if not exists ${q(t.name)} (\n${[...t.columns.map(renderPayrollColumnSql), ...(t.constraints ?? [])].map((line) => `  ${line}`).join(",\n")}\n);`;
export const renderPayrollCreateIndexSql = (i: DbIndexSpec): string =>
  `create ${i.unique ? "unique " : ""}index if not exists ${q(i.name)} on ${q(i.table)}${i.method ? ` using ${i.method}` : ""} (${i.columns.map(q).join(", ")})${i.whereSql ? ` where ${i.whereSql}` : ""};`;
export const renderPayrollPolicySql = (p: DbPolicySpec): string =>
  `create policy ${q(p.name)} on ${q(p.table)} for ${p.command.toUpperCase()} to ${p.role}${p.usingSql ? `\n  using (${p.usingSql})` : ""}${p.checkSql ? `\n  with check (${p.checkSql})` : ""};`;
export const payrollSchemaDdl = Object.freeze({
  extensions: ["create extension if not exists pgcrypto;"],
  tables: payrollSchemaTables.map(renderPayrollCreateTableSql),
  indexes: payrollSchemaIndexes.map(renderPayrollCreateIndexSql),
  rls: payrollSchemaTables.map(
    (t) => `alter table ${q(t.name)} enable row level security;`,
  ),
  policies: payrollSchemaPolicies.map(renderPayrollPolicySql),
});

export const payrollSchemaRequiredTableNames = [
  "payroll_settings",
  "payroll_cycles",
  "payroll_income_events",
  "payroll_allocations",
  "payroll_calculation_snapshots",
  "payroll_month_closures",
  "payroll_adjustments",
  "payroll_idempotency_records",
  "payroll_audit_events",
] as const;
export type PayrollTableName = (typeof payrollSchemaRequiredTableNames)[number];
const getTable = (name: PayrollTableName): DbTableSpec | undefined =>
  payrollSchemaTables.find((t) => t.name === name);
const getColumnNames = (name: PayrollTableName): Set<string> =>
  new Set(getTable(name)?.columns.map((c) => c.name) ?? []);
const smokeTests = (): readonly PayrollCalculationSmokeTestResult[] => {
  const plan = calculatePayrollPlan({
    expectedSalaryKrw: 2700000,
    plannedFixedExpenseKrw: 300000,
    plannedVariableExpenseKrw: 150000,
    plannedLivingBudgetKrw: 600000,
    plannedSavingKrw: 400000,
    targetHijackKrw: 6600000,
    cumulativeHijackBeforeKrw: 5780000,
  });
  const close = calculatePayrollClose({
    actualSalaryKrw: 2700000,
    actualExpenseKrw: 1050000,
    actualSavingKrw: 400000,
    cumulativeHijackBeforeKrw: 5780000,
    targetHijackKrw: 6600000,
  });
  const over = calculatePayrollClose({
    actualSalaryKrw: 1000000,
    actualExpenseKrw: 1250000,
    cumulativeHijackBeforeKrw: 100000,
    targetHijackKrw: 500000,
  });
  return [
    {
      name: "expected_hijack_amount",
      expected: 1250000,
      actual: plan.expectedHijackAmountKrw,
      ok: plan.expectedHijackAmountKrw === 1250000,
    },
    {
      name: "planned_shortage_zero",
      expected: 0,
      actual: plan.plannedShortageKrw,
      ok: plan.plannedShortageKrw === 0,
    },
    {
      name: "confirmed_hijack_amount",
      expected: 1650000,
      actual: close.confirmedHijackAmountKrw,
      ok: close.confirmedHijackAmountKrw === 1650000,
    },
    {
      name: "cumulative_after_close",
      expected: 7430000,
      actual: close.cumulativeHijackAfterKrw,
      ok: close.cumulativeHijackAfterKrw === 7430000,
    },
    {
      name: "overspend_hijack_floor",
      expected: 0,
      actual: over.confirmedHijackAmountKrw,
      ok: over.confirmedHijackAmountKrw === 0,
    },
    {
      name: "overspend_amount",
      expected: 250000,
      actual: over.overspendAmountKrw,
      ok: over.overspendAmountKrw === 250000,
    },
  ];
};
export const getPayrollSchemaCompletenessReport =
  (): PayrollSchemaCompletenessReport => {
    const tableNames = new Set(payrollSchemaTables.map((t) => t.name));
    const policyTables = new Set(payrollSchemaPolicies.map((p) => p.table));
    const calculationSmokeTests = smokeTests();
    const missing: string[] = [];
    for (const name of payrollSchemaRequiredTableNames)
      if (!tableNames.has(name)) missing.push(`missing table: ${name}`);
    for (const t of payrollSchemaTables) {
      if (!t.rlsRequired) missing.push(`RLS must be required: ${t.name}`);
      if (!t.auditRequired) missing.push(`audit must be required: ${t.name}`);
      if (t.containsRawToken !== false)
        missing.push(`raw token must be excluded: ${t.name}`);
      if (t.containsRawSecret !== false)
        missing.push(`raw secret must be excluded: ${t.name}`);
      if (!t.serverAuthorityRequired)
        missing.push(`server authority must be required: ${t.name}`);
      if (!policyTables.has(t.name))
        missing.push(`missing policy coverage: ${t.name}`);
    }
    const cycleColumns = getColumnNames("payroll_cycles");
    for (const c of [
      "user_id",
      "payroll_month",
      "payday",
      "expected_salary_krw",
      "actual_salary_krw",
      "planned_expense_krw",
      "planned_saving_krw",
      "expected_hijack_amount_krw",
      "confirmed_hijack_amount_krw",
      "cumulative_hijack_after_krw",
      "target_hijack_krw",
      "achievement_rate_bps",
      "idempotency_key",
    ] as const)
      if (!cycleColumns.has(c))
        missing.push(`missing payroll_cycles column: ${c}`);
    const closureColumns = getColumnNames("payroll_month_closures");
    for (const c of [
      "actual_salary_krw",
      "actual_expense_krw",
      "actual_saving_krw",
      "confirmed_hijack_amount_krw",
      "overspend_amount_krw",
      "cumulative_hijack_before_krw",
      "cumulative_hijack_after_krw",
      "achievement_rate_bps",
      "idempotency_key",
    ] as const)
      if (!closureColumns.has(c))
        missing.push(`missing payroll_month_closures column: ${c}`);
    for (const name of payrollSchemaRequiredTableNames) {
      const cols = getColumnNames(name);
      for (const c of [
        "raw_token_included",
        "raw_secret_included",
        "raw_pii_included",
        "ads_payload_linked",
        "community_payload_linked",
      ] as const)
        if (!cols.has(c)) missing.push(`missing ${c} safety column: ${name}`);
    }
    if (
      !payrollSchemaIndexes.some(
        (i) => i.name === "idx_payroll_cycles_active_home",
      )
    )
      missing.push("missing active home index");
    if (
      !payrollSchemaIndexes.some(
        (i) => i.name === "idx_payroll_month_closures_user_month",
      )
    )
      missing.push("missing closure lookup index");
    for (const test of calculationSmokeTests)
      if (!test.ok) missing.push(`calculation smoke test failed: ${test.name}`);
    return {
      ok: missing.length === 0,
      tableCount: payrollSchemaTables.length,
      indexCount: payrollSchemaIndexes.length,
      policyCount: payrollSchemaPolicies.length,
      seedCount: payrollSeedTemplates.length,
      ddlStatementCount:
        payrollSchemaDdl.extensions.length +
        payrollSchemaDdl.tables.length +
        payrollSchemaDdl.indexes.length +
        payrollSchemaDdl.rls.length +
        payrollSchemaDdl.policies.length,
      calculationSmokeTests,
      missing,
    };
  };
export const assertPayrollSchemaCompleteness = (): void => {
  const report = getPayrollSchemaCompletenessReport();
  if (!report.ok)
    throw new Error(
      `Payroll schema is incomplete: ${report.missing.join(", ")}`,
    );
};
assertPayrollSchemaCompleteness();
export const payrollSchema = Object.freeze({
  policy: payrollSchemaPolicy,
  payrollFrequencyKinds,
  payrollCycleStatuses,
  payrollIncomeKinds,
  payrollIncomeStatuses,
  payrollAllocationKinds,
  payrollAllocationStatuses,
  payrollSnapshotKinds,
  payrollAdjustmentKinds,
  payrollAdjustmentStatuses,
  payrollClosingStatuses,
  payrollAuditEventTypes,
  idempotencyRecordStatuses,
  tables: payrollSchemaTables,
  indexes: payrollSchemaIndexes,
  policies: payrollSchemaPolicies,
  seedTemplates: payrollSeedTemplates,
  ddl: payrollSchemaDdl,
  calculatePayrollPlan,
  calculatePayrollClose,
  getCompletenessReport: getPayrollSchemaCompletenessReport,
  assertCompleteness: assertPayrollSchemaCompleteness,
});
export default payrollSchema;
