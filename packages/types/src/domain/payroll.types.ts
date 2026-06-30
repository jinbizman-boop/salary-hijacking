/**
 * packages/types/src/domain/payroll.types.ts
 *
 * 급여납치 Salary Hijacking Platform · Payroll Domain Types
 *
 * 파일 목적
 * - 모바일 앱, 관리자 콘솔, API 서버, DB 계층이 공유하는 급여 도메인 타입 SSOT를 제공한다.
 * - 급여계획, 급여일, 수령금액, 지출예정금액, 저축예정금액, 일일예산총액, 예상/확정/누적 납치금액,
 *   목표달성률, 월마감, 계산 스냅샷, 감사로그, 멱등성, 관리자 조정, API 계약을 한 파일에 고정한다.
 * - 지출·저축·알림·광고·커뮤니티 도메인과 연결되지만, payroll.types.ts 자체는 외부 런타임 의존성 없는
 *   순수 TypeScript 타입/상수/가드/계산 유틸만 제공한다.
 */

/* -----------------------------------------------------------------------------
 * 1. Contract metadata and primitive aliases
 * -------------------------------------------------------------------------- */

export const PAYROLL_TYPES_CONTRACT_VERSION = "2.0.0" as const;
export const PAYROLL_TYPES_PACKAGE = "@salary-hijacking/types" as const;
export const PAYROLL_TYPES_DOMAIN = "payroll" as const;
export const PAYROLL_TIMEZONE = "Asia/Seoul" as const;
export const PAYROLL_LOCALE = "ko-KR" as const;
export const PAYROLL_CURRENCY = "KRW" as const;
export const PAYROLL_MONEY_UNIT = "KRW_1" as const;
export const PAYROLL_FORMULA_VERSION = "payroll-v1" as const;
export const PAYROLL_MIN_PAYDAY = 1 as const;
export const PAYROLL_MAX_PAYDAY = 31 as const;

export type UUID = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type YearMonthString =
  `${number}${number}${number}${number}-${number}${number}`;
export type UrlString = string;
export type HashString = string;
export type IdempotencyKey = string;
export type RequestId = string;
export type TraceId = string;
export type Locale = typeof PAYROLL_LOCALE | "en-US";
export type Timezone = typeof PAYROLL_TIMEZONE;
export type Currency = typeof PAYROLL_CURRENCY;
export type MoneyUnit = typeof PAYROLL_MONEY_UNIT;
export type Won = number;
export type PositiveWon = number;
export type NonNegativeWon = number;
export type Percentage = number;
export type NonNegativeInteger = number;
export type PositiveInteger = number;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepReadonly<T[K]>
      : T[K];
};

export interface PayrollDomainEntity {
  readonly id: UUID;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

export interface PayrollSoftDeletable {
  readonly deletedAt?: Nullable<ISODateTimeString>;
  readonly deletionReason?: Nullable<string>;
}

export interface PayrollTraceableMutation {
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly idempotencyKey?: IdempotencyKey;
}

/* -----------------------------------------------------------------------------
 * 2. Enum constants and literal unions
 * -------------------------------------------------------------------------- */

export const PAYROLL_PLAN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "LOCKED",
  "CLOSED",
  "ARCHIVED",
  "DELETED",
] as const;
export type PayrollPlanStatus = (typeof PAYROLL_PLAN_STATUSES)[number];

export const PAYROLL_CYCLE_STATUSES = [
  "PLANNED",
  "OPEN",
  "RECALCULATING",
  "READY_TO_CLOSE",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;
export type PayrollCycleStatus = (typeof PAYROLL_CYCLE_STATUSES)[number];

export const PAYROLL_INCOME_STATUSES = [
  "EXPECTED",
  "RECEIVED",
  "ADJUSTED",
  "CANCELLED",
] as const;
export type PayrollIncomeStatus = (typeof PAYROLL_INCOME_STATUSES)[number];

export const PAYROLL_PAYDAY_RULE_TYPES = [
  "DAY_OF_MONTH",
  "LAST_DAY_OF_MONTH",
  "CUSTOM_DATE",
] as const;
export type PayrollPaydayRuleType = (typeof PAYROLL_PAYDAY_RULE_TYPES)[number];

export const PAYROLL_FREQUENCIES = [
  "MONTHLY",
  "BI_WEEKLY",
  "WEEKLY",
  "CUSTOM",
] as const;
export type PayrollFrequency = (typeof PAYROLL_FREQUENCIES)[number];

export const PAYROLL_AMOUNT_MODES = ["GROSS", "NET", "MANUAL_NET"] as const;
export type PayrollAmountMode = (typeof PAYROLL_AMOUNT_MODES)[number];

export const PAYROLL_SOURCE_TYPES = [
  "USER_MANUAL",
  "TEMPLATE_COPY",
  "ADMIN_ADJUSTMENT",
  "MIGRATION",
  "SYSTEM_RECALCULATION",
  "MONTH_CLOSE",
] as const;
export type PayrollSourceType = (typeof PAYROLL_SOURCE_TYPES)[number];

export const PAYROLL_HIJACK_STATUSES = [
  "SAFE",
  "WARNING",
  "OVER_EXPENSE",
  "TARGET_REACHED",
  "TARGET_EXCEEDED",
] as const;
export type PayrollHijackStatus = (typeof PAYROLL_HIJACK_STATUSES)[number];

export const PAYROLL_CALCULATION_REASONS = [
  "PAYROLL_PLAN_CREATED",
  "PAYROLL_PLAN_UPDATED",
  "PAYROLL_INCOME_UPDATED",
  "FIXED_EXPENSE_CHANGED",
  "SAVINGS_CHANGED",
  "DAILY_BUDGET_CHANGED",
  "VARIABLE_EXPENSE_CHANGED",
  "GOAL_CHANGED",
  "MONTH_CLOSE",
  "MONTH_REOPEN",
  "RECALCULATE",
  "MIGRATION",
  "ADMIN_ADJUSTMENT",
] as const;
export type PayrollCalculationReason =
  (typeof PAYROLL_CALCULATION_REASONS)[number];

export const PAYROLL_GOAL_TYPES = [
  "MONTHLY_HIJACK",
  "CUMULATIVE_HIJACK",
  "NO_SPEND_DAYS",
  "CUSTOM",
] as const;
export type PayrollGoalType = (typeof PAYROLL_GOAL_TYPES)[number];

export const PAYROLL_NOTIFICATION_HINTS = [
  "PAYDAY_SOON",
  "PAYDAY_TODAY",
  "FIXED_PAYMENT_DUE",
  "SAVINGS_DUE",
  "BUDGET_OVER",
  "TARGET_NEAR",
  "TARGET_REACHED",
  "MONTH_CLOSE_READY",
] as const;
export type PayrollNotificationHint =
  (typeof PAYROLL_NOTIFICATION_HINTS)[number];

export const PAYROLL_SORT_OPTIONS = [
  "latest",
  "oldest",
  "payday",
  "salary_desc",
  "hijack_desc",
  "achievement_desc",
] as const;
export type PayrollSortBy = (typeof PAYROLL_SORT_OPTIONS)[number];

export const PAYROLL_ADMIN_SORT_OPTIONS = [
  "latest",
  "salary_desc",
  "hijack_desc",
  "over_expense_desc",
  "closed_latest",
  "risk_desc",
] as const;
export type PayrollAdminSortBy = (typeof PAYROLL_ADMIN_SORT_OPTIONS)[number];

export const PAYROLL_AUDIT_EVENT_TYPES = [
  "payroll.plan.created",
  "payroll.plan.updated",
  "payroll.plan.activated",
  "payroll.plan.paused",
  "payroll.plan.closed",
  "payroll.plan.reopened",
  "payroll.plan.deleted",
  "payroll.income.created",
  "payroll.income.updated",
  "payroll.income.received",
  "payroll.goal.created",
  "payroll.goal.updated",
  "payroll.calculation.snapshot.created",
  "payroll.month.close.requested",
  "payroll.month.closed",
  "payroll.month.reopened",
  "payroll.idempotency.replayed",
  "payroll.admin.adjusted",
] as const;
export type PayrollAuditEventType = (typeof PAYROLL_AUDIT_EVENT_TYPES)[number];

export const PAYROLL_IDEMPOTENCY_STATUSES = [
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
] as const;
export type PayrollIdempotencyStatus =
  (typeof PAYROLL_IDEMPOTENCY_STATUSES)[number];

export const PAYROLL_RISK_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
export type PayrollRiskLevel = (typeof PAYROLL_RISK_LEVELS)[number];

/* -----------------------------------------------------------------------------
 * 3. Policy, context and privacy boundary
 * -------------------------------------------------------------------------- */

export interface PayrollPolicyGuard {
  readonly rawPiiIncluded: false;
  readonly rawSecretIncluded: false;
  readonly rawTokenIncluded: false;
  readonly rawFinancialSourceDataIncluded: false;
  readonly rawPayrollProofIncluded: false;
  readonly adsFinancialJoinAllowed: false;
  readonly communityFinancialJoinAllowed: false;
  readonly growthRecommendationRawFinancialJoinAllowed: false;
  readonly amountStoredAsIntegerWon: true;
  readonly negativeUserInputAllowed: false;
  readonly decimalUserInputAllowed: false;
  readonly serverAuthorityCalculationRequired: true;
}

export const PAYROLL_SAFE_POLICY_GUARD: PayrollPolicyGuard = Object.freeze({
  rawPiiIncluded: false,
  rawSecretIncluded: false,
  rawTokenIncluded: false,
  rawFinancialSourceDataIncluded: false,
  rawPayrollProofIncluded: false,
  adsFinancialJoinAllowed: false,
  communityFinancialJoinAllowed: false,
  growthRecommendationRawFinancialJoinAllowed: false,
  amountStoredAsIntegerWon: true,
  negativeUserInputAllowed: false,
  decimalUserInputAllowed: false,
  serverAuthorityCalculationRequired: true,
});

export interface PayrollRequestContext {
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly viewerUserId?: UUID;
  readonly adminUserId?: UUID;
  readonly locale?: Locale;
  readonly timezone?: Timezone;
  readonly appVersion?: string;
  readonly platform?:
    | "IOS"
    | "ANDROID"
    | "WEB"
    | "ADMIN"
    | "SERVER"
    | "WORKER"
    | "UNKNOWN";
}

export interface PayrollOwnerTrace {
  readonly ownerUserId: UUID;
  readonly ownerHash: HashString;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly deviceHash?: HashString;
  readonly retainedUntil: ISODateTimeString;
  readonly serverOnly: true;
}

export interface PayrollAdminActor {
  readonly adminUserId: UUID;
  readonly displayName: string;
  readonly role:
    | "OWNER"
    | "ADMIN"
    | "OPERATOR"
    | "FINANCE_OPERATOR"
    | "CS_MANAGER"
    | "VIEWER";
}

/* -----------------------------------------------------------------------------
 * 4. Core domain entities
 * -------------------------------------------------------------------------- */

export interface PayrollMoney {
  readonly amount: NonNegativeWon;
  readonly currency: Currency;
  readonly unit: MoneyUnit;
}

export interface PayrollPaydayRule {
  readonly type: PayrollPaydayRuleType;
  readonly dayOfMonth?: number;
  readonly customDate?: ISODateString;
  readonly timezone: Timezone;
}

export interface PayrollPlan extends PayrollDomainEntity, PayrollSoftDeletable {
  readonly payrollPlanId: UUID;
  readonly userId: UUID;
  readonly status: PayrollPlanStatus;
  readonly name: string;
  readonly frequency: PayrollFrequency;
  readonly amountMode: PayrollAmountMode;
  readonly paydayRule: PayrollPaydayRule;
  readonly payday: number;
  readonly expectedSalaryAmount: NonNegativeWon;
  readonly expectedFixedExpenseAmount: NonNegativeWon;
  readonly expectedSavingsAmount: NonNegativeWon;
  readonly expectedDailyBudgetAmount: NonNegativeWon;
  readonly expectedVariableExpenseAmount: NonNegativeWon;
  readonly expectedExpenseAmount: NonNegativeWon;
  readonly expectedHijackAmount: NonNegativeWon;
  readonly targetHijackAmount: NonNegativeWon;
  readonly cumulativeHijackAmount: NonNegativeWon;
  readonly sourceType: PayrollSourceType;
  readonly activatedAt?: Nullable<ISODateTimeString>;
  readonly pausedAt?: Nullable<ISODateTimeString>;
  readonly closedAt?: Nullable<ISODateTimeString>;
  readonly policy: PayrollPolicyGuard;
}

export interface PayrollIncome
  extends PayrollDomainEntity, PayrollSoftDeletable {
  readonly payrollIncomeId: UUID;
  readonly payrollPlanId: UUID;
  readonly userId: UUID;
  readonly yearMonth: YearMonthString;
  readonly receivedDate: ISODateString;
  readonly expectedAmount: NonNegativeWon;
  readonly actualAmount?: Nullable<NonNegativeWon>;
  readonly status: PayrollIncomeStatus;
  readonly sourceType: PayrollSourceType;
  readonly memo?: Nullable<string>;
  readonly receivedAt?: Nullable<ISODateTimeString>;
  readonly cancelledAt?: Nullable<ISODateTimeString>;
  readonly policy: PayrollPolicyGuard;
}

export interface PayrollGoal extends PayrollDomainEntity, PayrollSoftDeletable {
  readonly payrollGoalId: UUID;
  readonly payrollPlanId: UUID;
  readonly userId: UUID;
  readonly goalType: PayrollGoalType;
  readonly yearMonth?: YearMonthString;
  readonly targetAmount: NonNegativeWon;
  readonly currentAmount: NonNegativeWon;
  readonly achievementRate: Percentage;
  readonly status: "ACTIVE" | "ACHIEVED" | "FAILED" | "CLOSED" | "DELETED";
  readonly achievedAt?: Nullable<ISODateTimeString>;
  readonly policy: PayrollPolicyGuard;
}

export interface PayrollCycle extends PayrollDomainEntity {
  readonly payrollCycleId: UUID;
  readonly payrollPlanId: UUID;
  readonly userId: UUID;
  readonly yearMonth: YearMonthString;
  readonly periodStartDate: ISODateString;
  readonly periodEndDate: ISODateString;
  readonly paydayDate: ISODateString;
  readonly status: PayrollCycleStatus;
  readonly expectedSalaryAmount: NonNegativeWon;
  readonly actualSalaryAmount: NonNegativeWon;
  readonly fixedExpenseTotal: NonNegativeWon;
  readonly savingsTotal: NonNegativeWon;
  readonly dailyBudgetTotal: NonNegativeWon;
  readonly variableExpenseTotal: NonNegativeWon;
  readonly expectedExpenseAmount: NonNegativeWon;
  readonly actualExpenseAmount: NonNegativeWon;
  readonly expectedHijackAmount: NonNegativeWon;
  readonly confirmedHijackAmount: NonNegativeWon;
  readonly overExpenseAmount: NonNegativeWon;
  readonly targetHijackAmount: NonNegativeWon;
  readonly achievementRate: Percentage;
  readonly cumulativeHijackAmountAfterClose?: Nullable<NonNegativeWon>;
  readonly closedAt?: Nullable<ISODateTimeString>;
  readonly reopenedAt?: Nullable<ISODateTimeString>;
  readonly calculationSnapshotId?: Nullable<UUID>;
  readonly policy: PayrollPolicyGuard;
}

export interface PayrollCalculationInput {
  readonly payrollPlanId: UUID;
  readonly userId: UUID;
  readonly yearMonth: YearMonthString;
  readonly expectedSalaryAmount: NonNegativeWon;
  readonly actualSalaryAmount?: Nullable<NonNegativeWon>;
  readonly fixedExpenseTotal: NonNegativeWon;
  readonly savingsTotal: NonNegativeWon;
  readonly dailyBudgetTotal: NonNegativeWon;
  readonly variableExpenseTotal: NonNegativeWon;
  readonly targetHijackAmount: NonNegativeWon;
  readonly previousCumulativeHijackAmount: NonNegativeWon;
  readonly calculationReason: PayrollCalculationReason;
}

export interface PayrollCalculationOutput {
  readonly payrollPlanId: UUID;
  readonly userId: UUID;
  readonly yearMonth: YearMonthString;
  readonly salaryAmount: NonNegativeWon;
  readonly expectedSalaryAmount: NonNegativeWon;
  readonly actualSalaryAmount: NonNegativeWon;
  readonly fixedExpenseTotal: NonNegativeWon;
  readonly savingsTotal: NonNegativeWon;
  readonly dailyBudgetTotal: NonNegativeWon;
  readonly variableExpenseTotal: NonNegativeWon;
  readonly expectedExpenseAmount: NonNegativeWon;
  readonly actualExpenseAmount: NonNegativeWon;
  readonly expectedHijackAmount: NonNegativeWon;
  readonly confirmedHijackAmount: NonNegativeWon;
  readonly overExpenseAmount: NonNegativeWon;
  readonly targetHijackAmount: NonNegativeWon;
  readonly achievementRate: Percentage;
  readonly cumulativeHijackAmount: NonNegativeWon;
  readonly hijackStatus: PayrollHijackStatus;
  readonly formulaVersion: typeof PAYROLL_FORMULA_VERSION;
  readonly calculationReason: PayrollCalculationReason;
  readonly calculatedAt: ISODateTimeString;
}

export interface PayrollCalculationSnapshot extends PayrollDomainEntity {
  readonly snapshotId: UUID;
  readonly payrollPlanId: UUID;
  readonly payrollCycleId?: UUID;
  readonly userId: UUID;
  readonly yearMonth: YearMonthString;
  readonly input: PayrollCalculationInput;
  readonly output: PayrollCalculationOutput;
  readonly formulaVersion: typeof PAYROLL_FORMULA_VERSION | string;
  readonly calculationReason: PayrollCalculationReason;
  readonly calculatedAt: ISODateTimeString;
  readonly policy: PayrollPolicyGuard;
}

export interface PayrollMonthCloseResult {
  readonly payrollCycleId: UUID;
  readonly payrollPlanId: UUID;
  readonly userId: UUID;
  readonly yearMonth: YearMonthString;
  readonly closed: true;
  readonly confirmedHijackAmount: NonNegativeWon;
  readonly cumulativeHijackAmount: NonNegativeWon;
  readonly achievementRate: Percentage;
  readonly closedAt: ISODateTimeString;
  readonly snapshotId: UUID;
}

/* -----------------------------------------------------------------------------
 * 5. UI aggregate contracts
 * -------------------------------------------------------------------------- */

export interface PayrollAmountCardView {
  readonly labelKo: string;
  readonly amount: NonNegativeWon;
  readonly displayAmount: string;
  readonly emphasis: "NORMAL" | "POSITIVE" | "WARNING" | "DANGER";
}

export interface PayrollHomeSummary {
  readonly userId: UUID;
  readonly payrollPlanId: UUID;
  readonly payrollCycleId?: UUID;
  readonly date: ISODateString;
  readonly yearMonth: YearMonthString;
  readonly currentPaydayDate: ISODateString;
  readonly nextPaydayDate: ISODateString;
  readonly daysUntilPayday: NonNegativeInteger;
  readonly salaryAmount: NonNegativeWon;
  readonly expenseAmount: NonNegativeWon;
  readonly fixedExpenseTotal: NonNegativeWon;
  readonly savingsTotal: NonNegativeWon;
  readonly dailyBudgetTotal: NonNegativeWon;
  readonly variableExpenseTotal: NonNegativeWon;
  readonly expectedHijackAmount: NonNegativeWon;
  readonly confirmedHijackAmount: NonNegativeWon;
  readonly totalCumulativeHijackAmount: NonNegativeWon;
  readonly targetHijackAmount: NonNegativeWon;
  readonly achievementRate: Percentage;
  readonly hijackStatus: PayrollHijackStatus;
  readonly notificationHints: readonly PayrollNotificationHint[];
  readonly cards: readonly PayrollAmountCardView[];
  readonly policy: PayrollPolicyGuard;
}

export interface PayrollPlanScreenSummary {
  readonly userId: UUID;
  readonly payrollPlan: PayrollPlan;
  readonly activeCycle?: PayrollCycle;
  readonly targetAchievementRate: Percentage;
  readonly salaryPlanRows: readonly PayrollPlanRow[];
  readonly fixedExpensePlanRows: readonly PayrollPlanRow[];
  readonly savingsPlanRows: readonly PayrollPlanRow[];
  readonly livingBudgetPlanRows: readonly PayrollPlanRow[];
  readonly policy: PayrollPolicyGuard;
}

export interface PayrollPlanRow {
  readonly rowId: UUID;
  readonly dateLabel: string;
  readonly categoryLabel: string;
  readonly name: string;
  readonly amount: NonNegativeWon;
  readonly displayAmount: string;
  readonly statusLabel: string;
}

export interface PayrollMyPageSummary {
  readonly userId: UUID;
  readonly displayName: string;
  readonly cumulativeHijackAmount: NonNegativeWon;
  readonly bestMonthlyHijackAmount: NonNegativeWon;
  readonly averageMonthlyHijackAmount: NonNegativeWon;
  readonly activePlanCount: NonNegativeInteger;
  readonly closedCycleCount: NonNegativeInteger;
  readonly latestAchievementRate: Percentage;
}

export interface PayrollCalendarMonthSummary {
  readonly yearMonth: YearMonthString;
  readonly paydayDate: ISODateString;
  readonly salaryAmount: NonNegativeWon;
  readonly expectedExpenseAmount: NonNegativeWon;
  readonly expectedHijackAmount: NonNegativeWon;
  readonly confirmedHijackAmount?: NonNegativeWon;
  readonly status: PayrollCycleStatus;
}

/* -----------------------------------------------------------------------------
 * 6. API request/response contracts
 * -------------------------------------------------------------------------- */

export interface PayrollListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly cursor?: string;
  readonly sortBy?: PayrollSortBy;
}

export interface PayrollAdminListQuery extends Omit<
  PayrollListQuery,
  "sortBy"
> {
  readonly sortBy?: PayrollAdminSortBy;
}

export interface PayrollPageInfo {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount?: number;
  readonly nextCursor?: string;
  readonly hasNextPage: boolean;
}

export interface PayrollSuccessResponse<TData> {
  readonly ok: true;
  readonly data: TData;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface PayrollListResponse<TItem> {
  readonly ok: true;
  readonly data: readonly TItem[];
  readonly pageInfo: PayrollPageInfo;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface PayrollMutationResponse<
  TData,
> extends PayrollSuccessResponse<TData> {
  readonly mutation: {
    readonly idempotencyKey?: IdempotencyKey;
    readonly replayed: boolean;
    readonly committedAt: ISODateTimeString;
  };
}

export interface PayrollErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  };
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export type PayrollApiResponse<TData> =
  | PayrollSuccessResponse<TData>
  | PayrollErrorResponse;
export type PayrollMutationApiResponse<TData> =
  | PayrollMutationResponse<TData>
  | PayrollErrorResponse;

export interface ListPayrollPlansRequest extends PayrollListQuery {
  readonly status?: PayrollPlanStatus;
  readonly context?: PayrollRequestContext;
}

export interface GetPayrollPlanRequest {
  readonly payrollPlanId: UUID;
  readonly includeLatestCycle?: boolean;
  readonly includeGoals?: boolean;
  readonly context?: PayrollRequestContext;
}

export interface CreatePayrollPlanRequest extends PayrollTraceableMutation {
  readonly name?: string;
  readonly frequency?: PayrollFrequency;
  readonly amountMode?: PayrollAmountMode;
  readonly paydayRule: PayrollPaydayRule;
  readonly expectedSalaryAmount: NonNegativeWon;
  readonly expectedFixedExpenseAmount?: NonNegativeWon;
  readonly expectedSavingsAmount?: NonNegativeWon;
  readonly expectedDailyBudgetAmount?: NonNegativeWon;
  readonly expectedVariableExpenseAmount?: NonNegativeWon;
  readonly targetHijackAmount?: NonNegativeWon;
  readonly activate?: boolean;
  readonly context?: PayrollRequestContext;
}

export interface UpdatePayrollPlanRequest extends PayrollTraceableMutation {
  readonly payrollPlanId: UUID;
  readonly name?: string;
  readonly frequency?: PayrollFrequency;
  readonly amountMode?: PayrollAmountMode;
  readonly paydayRule?: PayrollPaydayRule;
  readonly expectedSalaryAmount?: NonNegativeWon;
  readonly expectedFixedExpenseAmount?: NonNegativeWon;
  readonly expectedSavingsAmount?: NonNegativeWon;
  readonly expectedDailyBudgetAmount?: NonNegativeWon;
  readonly expectedVariableExpenseAmount?: NonNegativeWon;
  readonly targetHijackAmount?: NonNegativeWon;
  readonly context?: PayrollRequestContext;
}

export interface ActivatePayrollPlanRequest extends PayrollTraceableMutation {
  readonly payrollPlanId: UUID;
  readonly context?: PayrollRequestContext;
}

export interface PausePayrollPlanRequest extends PayrollTraceableMutation {
  readonly payrollPlanId: UUID;
  readonly reason?: string;
  readonly context?: PayrollRequestContext;
}

export interface DeletePayrollPlanRequest extends PayrollTraceableMutation {
  readonly payrollPlanId: UUID;
  readonly reason?: string;
  readonly hardDelete?: false;
  readonly context?: PayrollRequestContext;
}

export interface ListPayrollCyclesRequest extends PayrollListQuery {
  readonly payrollPlanId?: UUID;
  readonly fromYearMonth?: YearMonthString;
  readonly toYearMonth?: YearMonthString;
  readonly status?: PayrollCycleStatus;
  readonly context?: PayrollRequestContext;
}

export interface GetPayrollCycleRequest {
  readonly payrollCycleId?: UUID;
  readonly payrollPlanId?: UUID;
  readonly yearMonth?: YearMonthString;
  readonly context?: PayrollRequestContext;
}

export interface UpsertPayrollIncomeRequest extends PayrollTraceableMutation {
  readonly payrollPlanId: UUID;
  readonly yearMonth: YearMonthString;
  readonly receivedDate: ISODateString;
  readonly expectedAmount: NonNegativeWon;
  readonly actualAmount?: NonNegativeWon;
  readonly status?: PayrollIncomeStatus;
  readonly memo?: string;
  readonly context?: PayrollRequestContext;
}

export interface MarkPayrollIncomeReceivedRequest extends PayrollTraceableMutation {
  readonly payrollIncomeId: UUID;
  readonly actualAmount: NonNegativeWon;
  readonly receivedAt?: ISODateTimeString;
  readonly context?: PayrollRequestContext;
}

export interface CreatePayrollGoalRequest extends PayrollTraceableMutation {
  readonly payrollPlanId: UUID;
  readonly goalType: PayrollGoalType;
  readonly yearMonth?: YearMonthString;
  readonly targetAmount: NonNegativeWon;
  readonly context?: PayrollRequestContext;
}

export interface UpdatePayrollGoalRequest extends PayrollTraceableMutation {
  readonly payrollGoalId: UUID;
  readonly targetAmount?: NonNegativeWon;
  readonly currentAmount?: NonNegativeWon;
  readonly status?: PayrollGoal["status"];
  readonly context?: PayrollRequestContext;
}

export interface RecalculatePayrollRequest extends PayrollTraceableMutation {
  readonly payrollPlanId: UUID;
  readonly yearMonth: YearMonthString;
  readonly reason: PayrollCalculationReason;
  readonly context?: PayrollRequestContext;
}

export interface ClosePayrollMonthRequest extends PayrollTraceableMutation {
  readonly payrollPlanId: UUID;
  readonly yearMonth: YearMonthString;
  readonly actualSalaryAmount?: NonNegativeWon;
  readonly force?: boolean;
  readonly context?: PayrollRequestContext;
}

export interface ReopenPayrollMonthRequest extends PayrollTraceableMutation {
  readonly payrollCycleId: UUID;
  readonly reason: string;
  readonly context?: PayrollRequestContext;
}

export interface GetPayrollHomeSummaryRequest {
  readonly date?: ISODateString;
  readonly yearMonth?: YearMonthString;
  readonly context?: PayrollRequestContext;
}

export interface GetPayrollPlanScreenSummaryRequest {
  readonly payrollPlanId?: UUID;
  readonly yearMonth?: YearMonthString;
  readonly context?: PayrollRequestContext;
}

export interface GetPayrollMyPageSummaryRequest {
  readonly context?: PayrollRequestContext;
}

export interface ListPayrollAuditLogsAdminRequest extends PayrollAdminListQuery {
  readonly payrollPlanId?: UUID;
  readonly payrollCycleId?: UUID;
  readonly userId?: UUID;
  readonly eventType?: PayrollAuditEventType;
  readonly from?: ISODateTimeString;
  readonly to?: ISODateTimeString;
  readonly context?: PayrollRequestContext;
}

export interface AdjustPayrollAdminRequest extends PayrollTraceableMutation {
  readonly targetType: "PLAN" | "CYCLE" | "INCOME" | "GOAL";
  readonly targetId: UUID;
  readonly reason: string;
  readonly patch: Record<string, unknown>;
  readonly context?: PayrollRequestContext;
}

export interface GetPayrollMetricsAdminRequest {
  readonly from?: ISODateString;
  readonly to?: ISODateString;
  readonly yearMonth?: YearMonthString;
  readonly context?: PayrollRequestContext;
}

export interface PayrollDeleteResult {
  readonly id: UUID;
  readonly deleted: true;
  readonly deletedAt: ISODateTimeString;
}

export type ListPayrollPlansResponse = PayrollListResponse<PayrollPlan>;
export type GetPayrollPlanResponse = PayrollSuccessResponse<PayrollPlan>;
export type CreatePayrollPlanResponse = PayrollMutationResponse<PayrollPlan>;
export type UpdatePayrollPlanResponse = PayrollMutationResponse<PayrollPlan>;
export type ActivatePayrollPlanResponse = PayrollMutationResponse<PayrollPlan>;
export type PausePayrollPlanResponse = PayrollMutationResponse<PayrollPlan>;
export type DeletePayrollPlanResponse =
  PayrollMutationResponse<PayrollDeleteResult>;
export type ListPayrollCyclesResponse = PayrollListResponse<PayrollCycle>;
export type GetPayrollCycleResponse = PayrollSuccessResponse<PayrollCycle>;
export type UpsertPayrollIncomeResponse =
  PayrollMutationResponse<PayrollIncome>;
export type MarkPayrollIncomeReceivedResponse =
  PayrollMutationResponse<PayrollIncome>;
export type CreatePayrollGoalResponse = PayrollMutationResponse<PayrollGoal>;
export type UpdatePayrollGoalResponse = PayrollMutationResponse<PayrollGoal>;
export type RecalculatePayrollResponse =
  PayrollMutationResponse<PayrollCalculationOutput>;
export type ClosePayrollMonthResponse =
  PayrollMutationResponse<PayrollMonthCloseResult>;
export type ReopenPayrollMonthResponse = PayrollMutationResponse<PayrollCycle>;
export type GetPayrollHomeSummaryResponse =
  PayrollSuccessResponse<PayrollHomeSummary>;
export type GetPayrollPlanScreenSummaryResponse =
  PayrollSuccessResponse<PayrollPlanScreenSummary>;
export type GetPayrollMyPageSummaryResponse =
  PayrollSuccessResponse<PayrollMyPageSummary>;

export type PayrollMutationOperation =
  | "CREATE_PAYROLL_PLAN"
  | "UPDATE_PAYROLL_PLAN"
  | "ACTIVATE_PAYROLL_PLAN"
  | "PAUSE_PAYROLL_PLAN"
  | "DELETE_PAYROLL_PLAN"
  | "UPSERT_PAYROLL_INCOME"
  | "MARK_PAYROLL_INCOME_RECEIVED"
  | "CREATE_PAYROLL_GOAL"
  | "UPDATE_PAYROLL_GOAL"
  | "RECALCULATE_PAYROLL"
  | "CLOSE_PAYROLL_MONTH"
  | "REOPEN_PAYROLL_MONTH"
  | "ADMIN_ADJUST_PAYROLL";

/* -----------------------------------------------------------------------------
 * 7. Admin, audit, metrics and idempotency
 * -------------------------------------------------------------------------- */

export interface PayrollAuditLog extends PayrollDomainEntity {
  readonly auditLogId: UUID;
  readonly eventType: PayrollAuditEventType;
  readonly actorUserId?: UUID;
  readonly adminActor?: PayrollAdminActor;
  readonly targetType:
    | "PLAN"
    | "CYCLE"
    | "INCOME"
    | "GOAL"
    | "CALCULATION_SNAPSHOT";
  readonly targetId: UUID;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  readonly reason?: string;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly policy: PayrollPolicyGuard;
}

export interface PayrollIdempotencyRecord extends PayrollDomainEntity {
  readonly userId: UUID;
  readonly idempotencyKey: IdempotencyKey;
  readonly operation: PayrollMutationOperation;
  readonly status: PayrollIdempotencyStatus;
  readonly requestHash: HashString;
  readonly responseReferenceId?: UUID;
  readonly errorCode?: string;
  readonly expiresAt: ISODateTimeString;
}

export interface PayrollAdminRecord<TRecord> {
  readonly record: TRecord;
  readonly ownerTrace: PayrollOwnerTrace;
  readonly riskLevel: PayrollRiskLevel;
  readonly riskLabels: readonly string[];
  readonly internalNotes: readonly string[];
}

export type PayrollPlanAdminRecord = PayrollAdminRecord<PayrollPlan>;
export type PayrollCycleAdminRecord = PayrollAdminRecord<PayrollCycle>;
export type PayrollIncomeAdminRecord = PayrollAdminRecord<PayrollIncome>;
export type PayrollGoalAdminRecord = PayrollAdminRecord<PayrollGoal>;

export interface PayrollMetricsAdmin {
  readonly activePlanCount: NonNegativeInteger;
  readonly closedCycleCount: NonNegativeInteger;
  readonly totalExpectedSalaryAmount: NonNegativeWon;
  readonly totalActualSalaryAmount: NonNegativeWon;
  readonly totalExpectedHijackAmount: NonNegativeWon;
  readonly totalConfirmedHijackAmount: NonNegativeWon;
  readonly totalCumulativeHijackAmount: NonNegativeWon;
  readonly averageAchievementRate: Percentage;
  readonly overExpenseCycleCount: NonNegativeInteger;
  readonly targetReachedCycleCount: NonNegativeInteger;
  readonly monthCloseRate: Percentage;
  readonly recalculationCount: NonNegativeInteger;
  readonly byYearMonth: readonly {
    readonly yearMonth: YearMonthString;
    readonly cycleCount: NonNegativeInteger;
    readonly confirmedHijackAmount: NonNegativeWon;
    readonly achievementRate: Percentage;
  }[];
  readonly measuredAt: ISODateTimeString;
}

export type ListPayrollAuditLogsAdminResponse =
  PayrollListResponse<PayrollAuditLog>;
export type AdjustPayrollAdminResponse = PayrollMutationResponse<
  | PayrollPlanAdminRecord
  | PayrollCycleAdminRecord
  | PayrollIncomeAdminRecord
  | PayrollGoalAdminRecord
>;
export type GetPayrollMetricsAdminResponse =
  PayrollSuccessResponse<PayrollMetricsAdmin>;

/* -----------------------------------------------------------------------------
 * 8. API path registry
 * -------------------------------------------------------------------------- */

export const PAYROLL_API_PATHS = Object.freeze({
  listPlans: "/payroll/plans",
  getPlan: "/payroll/plans/:payrollPlanId",
  createPlan: "/payroll/plans",
  updatePlan: "/payroll/plans/:payrollPlanId",
  activatePlan: "/payroll/plans/:payrollPlanId/activate",
  pausePlan: "/payroll/plans/:payrollPlanId/pause",
  deletePlan: "/payroll/plans/:payrollPlanId",
  listCycles: "/payroll/cycles",
  getCycle: "/payroll/cycles/:payrollCycleId",
  upsertIncome: "/payroll/incomes",
  markIncomeReceived: "/payroll/incomes/:payrollIncomeId/received",
  createGoal: "/payroll/goals",
  updateGoal: "/payroll/goals/:payrollGoalId",
  recalculate: "/payroll/plans/:payrollPlanId/:yearMonth/recalculate",
  closeMonth: "/payroll/plans/:payrollPlanId/:yearMonth/close",
  reopenMonth: "/payroll/cycles/:payrollCycleId/reopen",
  homeSummary: "/payroll/home-summary",
  planScreenSummary: "/payroll/plan-screen-summary",
  myPageSummary: "/payroll/my-page-summary",
  adminAuditLogs: "/admin/payroll/audit-logs",
  adminAdjust: "/admin/payroll/adjust",
  adminMetrics: "/admin/payroll/metrics",
} as const);

export type PayrollApiPathName = keyof typeof PAYROLL_API_PATHS;
export type PayrollApiPath = (typeof PAYROLL_API_PATHS)[PayrollApiPathName];
export type PayrollHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface PayrollEndpointDescriptor<TRequest, TResponse> {
  readonly method: PayrollHttpMethod;
  readonly path: PayrollApiPath;
  readonly request: TRequest;
  readonly response: TResponse;
  readonly authRequired: boolean;
  readonly adminRequired: boolean;
  readonly idempotencyRequired: boolean;
  readonly serverAuthorityCalculation: boolean;
}

export interface PayrollEndpointTypes {
  readonly listPlans: PayrollEndpointDescriptor<
    ListPayrollPlansRequest,
    ListPayrollPlansResponse
  >;
  readonly getPlan: PayrollEndpointDescriptor<
    GetPayrollPlanRequest,
    GetPayrollPlanResponse
  >;
  readonly createPlan: PayrollEndpointDescriptor<
    CreatePayrollPlanRequest,
    CreatePayrollPlanResponse
  >;
  readonly updatePlan: PayrollEndpointDescriptor<
    UpdatePayrollPlanRequest,
    UpdatePayrollPlanResponse
  >;
  readonly activatePlan: PayrollEndpointDescriptor<
    ActivatePayrollPlanRequest,
    ActivatePayrollPlanResponse
  >;
  readonly pausePlan: PayrollEndpointDescriptor<
    PausePayrollPlanRequest,
    PausePayrollPlanResponse
  >;
  readonly deletePlan: PayrollEndpointDescriptor<
    DeletePayrollPlanRequest,
    DeletePayrollPlanResponse
  >;
  readonly listCycles: PayrollEndpointDescriptor<
    ListPayrollCyclesRequest,
    ListPayrollCyclesResponse
  >;
  readonly getCycle: PayrollEndpointDescriptor<
    GetPayrollCycleRequest,
    GetPayrollCycleResponse
  >;
  readonly upsertIncome: PayrollEndpointDescriptor<
    UpsertPayrollIncomeRequest,
    UpsertPayrollIncomeResponse
  >;
  readonly markIncomeReceived: PayrollEndpointDescriptor<
    MarkPayrollIncomeReceivedRequest,
    MarkPayrollIncomeReceivedResponse
  >;
  readonly createGoal: PayrollEndpointDescriptor<
    CreatePayrollGoalRequest,
    CreatePayrollGoalResponse
  >;
  readonly updateGoal: PayrollEndpointDescriptor<
    UpdatePayrollGoalRequest,
    UpdatePayrollGoalResponse
  >;
  readonly recalculate: PayrollEndpointDescriptor<
    RecalculatePayrollRequest,
    RecalculatePayrollResponse
  >;
  readonly closeMonth: PayrollEndpointDescriptor<
    ClosePayrollMonthRequest,
    ClosePayrollMonthResponse
  >;
  readonly reopenMonth: PayrollEndpointDescriptor<
    ReopenPayrollMonthRequest,
    ReopenPayrollMonthResponse
  >;
  readonly homeSummary: PayrollEndpointDescriptor<
    GetPayrollHomeSummaryRequest,
    GetPayrollHomeSummaryResponse
  >;
  readonly planScreenSummary: PayrollEndpointDescriptor<
    GetPayrollPlanScreenSummaryRequest,
    GetPayrollPlanScreenSummaryResponse
  >;
  readonly myPageSummary: PayrollEndpointDescriptor<
    GetPayrollMyPageSummaryRequest,
    GetPayrollMyPageSummaryResponse
  >;
  readonly adminAuditLogs: PayrollEndpointDescriptor<
    ListPayrollAuditLogsAdminRequest,
    ListPayrollAuditLogsAdminResponse
  >;
  readonly adminAdjust: PayrollEndpointDescriptor<
    AdjustPayrollAdminRequest,
    AdjustPayrollAdminResponse
  >;
  readonly adminMetrics: PayrollEndpointDescriptor<
    GetPayrollMetricsAdminRequest,
    GetPayrollMetricsAdminResponse
  >;
}

/* -----------------------------------------------------------------------------
 * 9. Runtime-free guards and calculators
 * -------------------------------------------------------------------------- */

const includesString = <TValue extends string>(
  values: readonly TValue[],
  value: string,
): value is TValue => (values as readonly string[]).includes(value);

export const isPayrollPlanStatus = (
  value: string,
): value is PayrollPlanStatus => includesString(PAYROLL_PLAN_STATUSES, value);
export const isPayrollCycleStatus = (
  value: string,
): value is PayrollCycleStatus => includesString(PAYROLL_CYCLE_STATUSES, value);
export const isPayrollIncomeStatus = (
  value: string,
): value is PayrollIncomeStatus =>
  includesString(PAYROLL_INCOME_STATUSES, value);
export const isPayrollPaydayRuleType = (
  value: string,
): value is PayrollPaydayRuleType =>
  includesString(PAYROLL_PAYDAY_RULE_TYPES, value);
export const isPayrollFrequency = (value: string): value is PayrollFrequency =>
  includesString(PAYROLL_FREQUENCIES, value);
export const isPayrollCalculationReason = (
  value: string,
): value is PayrollCalculationReason =>
  includesString(PAYROLL_CALCULATION_REASONS, value);

export const isNonNegativeWon = (value: number): value is NonNegativeWon =>
  Number.isSafeInteger(value) && value >= 0;
export const isPositiveWon = (value: number): value is PositiveWon =>
  Number.isSafeInteger(value) && value > 0;
export const isValidPayday = (value: number): boolean =>
  Number.isInteger(value) &&
  value >= PAYROLL_MIN_PAYDAY &&
  value <= PAYROLL_MAX_PAYDAY;

export const calculateExpectedExpenseAmount = (input: {
  readonly fixedExpenseTotal?: NonNegativeWon;
  readonly savingsTotal?: NonNegativeWon;
  readonly dailyBudgetTotal?: NonNegativeWon;
  readonly variableExpenseTotal?: NonNegativeWon;
}): NonNegativeWon =>
  (input.fixedExpenseTotal ?? 0) +
  (input.savingsTotal ?? 0) +
  (input.dailyBudgetTotal ?? 0) +
  (input.variableExpenseTotal ?? 0);

export const calculateExpectedHijackAmount = (
  salaryAmount: NonNegativeWon,
  expectedExpenseAmount: NonNegativeWon,
): NonNegativeWon => Math.max(salaryAmount - expectedExpenseAmount, 0);

export const calculateOverExpenseAmount = (
  salaryAmount: NonNegativeWon,
  expenseAmount: NonNegativeWon,
): NonNegativeWon => Math.max(expenseAmount - salaryAmount, 0);

export const calculateAchievementRate = (
  currentAmount: NonNegativeWon,
  targetAmount: NonNegativeWon,
): Percentage => {
  if (targetAmount <= 0) return currentAmount > 0 ? 100 : 0;
  return Math.max(0, Math.round((currentAmount / targetAmount) * 100));
};

export const calculatePayroll = (
  input: PayrollCalculationInput,
  calculatedAt: ISODateTimeString,
): PayrollCalculationOutput => {
  const actualSalaryAmount =
    input.actualSalaryAmount ?? input.expectedSalaryAmount;
  const expectedExpenseAmount = calculateExpectedExpenseAmount({
    fixedExpenseTotal: input.fixedExpenseTotal,
    savingsTotal: input.savingsTotal,
    dailyBudgetTotal: input.dailyBudgetTotal,
    variableExpenseTotal: 0,
  });
  const actualExpenseAmount = calculateExpectedExpenseAmount({
    fixedExpenseTotal: input.fixedExpenseTotal,
    savingsTotal: input.savingsTotal,
    dailyBudgetTotal: input.dailyBudgetTotal,
    variableExpenseTotal: input.variableExpenseTotal,
  });
  const expectedHijackAmount = calculateExpectedHijackAmount(
    input.expectedSalaryAmount,
    expectedExpenseAmount,
  );
  const confirmedHijackAmount = calculateExpectedHijackAmount(
    actualSalaryAmount,
    actualExpenseAmount,
  );
  const overExpenseAmount = calculateOverExpenseAmount(
    actualSalaryAmount,
    actualExpenseAmount,
  );
  const cumulativeHijackAmount =
    input.previousCumulativeHijackAmount + confirmedHijackAmount;
  const achievementRate = calculateAchievementRate(
    confirmedHijackAmount,
    input.targetHijackAmount,
  );
  const hijackStatus: PayrollHijackStatus =
    overExpenseAmount > 0
      ? "OVER_EXPENSE"
      : input.targetHijackAmount > 0 &&
          confirmedHijackAmount > input.targetHijackAmount
        ? "TARGET_EXCEEDED"
        : input.targetHijackAmount > 0 &&
            confirmedHijackAmount === input.targetHijackAmount
          ? "TARGET_REACHED"
          : achievementRate >= 80
            ? "SAFE"
            : "WARNING";

  return {
    payrollPlanId: input.payrollPlanId,
    userId: input.userId,
    yearMonth: input.yearMonth,
    salaryAmount: actualSalaryAmount,
    expectedSalaryAmount: input.expectedSalaryAmount,
    actualSalaryAmount,
    fixedExpenseTotal: input.fixedExpenseTotal,
    savingsTotal: input.savingsTotal,
    dailyBudgetTotal: input.dailyBudgetTotal,
    variableExpenseTotal: input.variableExpenseTotal,
    expectedExpenseAmount,
    actualExpenseAmount,
    expectedHijackAmount,
    confirmedHijackAmount,
    overExpenseAmount,
    targetHijackAmount: input.targetHijackAmount,
    achievementRate,
    cumulativeHijackAmount,
    hijackStatus,
    formulaVersion: PAYROLL_FORMULA_VERSION,
    calculationReason: input.calculationReason,
    calculatedAt,
  };
};

export const createPayrollPolicyGuard = (): PayrollPolicyGuard => ({
  ...PAYROLL_SAFE_POLICY_GUARD,
});

export const assertPayrollPolicyGuard = (guard: PayrollPolicyGuard): void => {
  if (
    guard.rawPiiIncluded !== false ||
    guard.rawSecretIncluded !== false ||
    guard.rawTokenIncluded !== false ||
    guard.rawFinancialSourceDataIncluded !== false ||
    guard.rawPayrollProofIncluded !== false ||
    guard.adsFinancialJoinAllowed !== false ||
    guard.communityFinancialJoinAllowed !== false ||
    guard.growthRecommendationRawFinancialJoinAllowed !== false ||
    guard.amountStoredAsIntegerWon !== true ||
    guard.negativeUserInputAllowed !== false ||
    guard.decimalUserInputAllowed !== false ||
    guard.serverAuthorityCalculationRequired !== true
  ) {
    throw new Error(
      "Unsafe payroll policy guard: payroll payload must not include raw PII, secrets, tokens, raw financial source data, ad/community/growth joins, negative/decimal money, or client-authority calculation.",
    );
  }
};

export const normalizePayrollPageSize = (
  pageSize: number | undefined,
  fallback = 20,
  max = 100,
): number => {
  if (typeof pageSize !== "number" || !Number.isFinite(pageSize))
    return fallback;
  return Math.max(1, Math.min(Math.floor(pageSize), max));
};

/* -----------------------------------------------------------------------------
 * 10. Completeness report
 * -------------------------------------------------------------------------- */

export interface PayrollTypesCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof PAYROLL_TYPES_CONTRACT_VERSION;
  readonly planStatusCount: number;
  readonly cycleStatusCount: number;
  readonly calculationReasonCount: number;
  readonly apiPathCount: number;
  readonly hasPlanContract: boolean;
  readonly hasCycleContract: boolean;
  readonly hasGoalContract: boolean;
  readonly hasCalculationSnapshotContract: boolean;
  readonly hasServerAuthorityCalculationContract: boolean;
  readonly hasPrivacyGuard: boolean;
  readonly hasIdempotencyContract: boolean;
  readonly missing: readonly string[];
}

const requireEvery = <TValue extends string>(
  source: readonly TValue[],
  required: readonly TValue[],
  label: string,
  missing: string[],
): void => {
  for (const value of required) {
    if (!source.includes(value)) missing.push(`missing ${label}: ${value}`);
  }
};

export const getPayrollTypesCompletenessReport =
  (): PayrollTypesCompletenessReport => {
    const missing: string[] = [];
    requireEvery(
      PAYROLL_PLAN_STATUSES,
      ["DRAFT", "ACTIVE", "LOCKED", "CLOSED", "DELETED"] as const,
      "plan status",
      missing,
    );
    requireEvery(
      PAYROLL_CYCLE_STATUSES,
      ["PLANNED", "OPEN", "READY_TO_CLOSE", "CLOSED", "REOPENED"] as const,
      "cycle status",
      missing,
    );
    requireEvery(
      PAYROLL_CALCULATION_REASONS,
      [
        "PAYROLL_PLAN_CREATED",
        "PAYROLL_PLAN_UPDATED",
        "FIXED_EXPENSE_CHANGED",
        "SAVINGS_CHANGED",
        "DAILY_BUDGET_CHANGED",
        "VARIABLE_EXPENSE_CHANGED",
        "MONTH_CLOSE",
        "RECALCULATE",
      ] as const,
      "calculation reason",
      missing,
    );
    requireEvery(
      PAYROLL_HIJACK_STATUSES,
      [
        "SAFE",
        "WARNING",
        "OVER_EXPENSE",
        "TARGET_REACHED",
        "TARGET_EXCEEDED",
      ] as const,
      "hijack status",
      missing,
    );

    for (const pathName of [
      "listPlans",
      "createPlan",
      "updatePlan",
      "activatePlan",
      "listCycles",
      "upsertIncome",
      "createGoal",
      "recalculate",
      "closeMonth",
      "homeSummary",
      "planScreenSummary",
      "myPageSummary",
      "adminAdjust",
      "adminMetrics",
    ] as const satisfies readonly PayrollApiPathName[]) {
      if (!PAYROLL_API_PATHS[pathName])
        missing.push(`missing API path: ${pathName}`);
    }

    if (!PAYROLL_SAFE_POLICY_GUARD.amountStoredAsIntegerWon)
      missing.push("missing integer KRW policy");
    if (!PAYROLL_SAFE_POLICY_GUARD.serverAuthorityCalculationRequired)
      missing.push("missing server authority calculation policy");
    if (PAYROLL_SAFE_POLICY_GUARD.negativeUserInputAllowed)
      missing.push("negative user input must not be allowed");
    if (PAYROLL_SAFE_POLICY_GUARD.decimalUserInputAllowed)
      missing.push("decimal user input must not be allowed");

    return {
      ok: missing.length === 0,
      contractVersion: PAYROLL_TYPES_CONTRACT_VERSION,
      planStatusCount: PAYROLL_PLAN_STATUSES.length,
      cycleStatusCount: PAYROLL_CYCLE_STATUSES.length,
      calculationReasonCount: PAYROLL_CALCULATION_REASONS.length,
      apiPathCount: Object.keys(PAYROLL_API_PATHS).length,
      hasPlanContract: true,
      hasCycleContract: true,
      hasGoalContract: true,
      hasCalculationSnapshotContract: true,
      hasServerAuthorityCalculationContract: true,
      hasPrivacyGuard: true,
      hasIdempotencyContract: true,
      missing,
    };
  };

export const assertPayrollTypesCompleteness = (): void => {
  const report = getPayrollTypesCompletenessReport();
  if (!report.ok)
    throw new Error(
      `Payroll types are incomplete: ${report.missing.join(", ")}`,
    );
};

export const PAYROLL_TYPES_COMPLETENESS_REPORT = Object.freeze(
  getPayrollTypesCompletenessReport(),
);

export const payrollTypes = Object.freeze({
  contractVersion: PAYROLL_TYPES_CONTRACT_VERSION,
  packageName: PAYROLL_TYPES_PACKAGE,
  domain: PAYROLL_TYPES_DOMAIN,
  timezone: PAYROLL_TIMEZONE,
  locale: PAYROLL_LOCALE,
  currency: PAYROLL_CURRENCY,
  moneyUnit: PAYROLL_MONEY_UNIT,
  formulaVersion: PAYROLL_FORMULA_VERSION,
  planStatuses: PAYROLL_PLAN_STATUSES,
  cycleStatuses: PAYROLL_CYCLE_STATUSES,
  incomeStatuses: PAYROLL_INCOME_STATUSES,
  paydayRuleTypes: PAYROLL_PAYDAY_RULE_TYPES,
  frequencies: PAYROLL_FREQUENCIES,
  amountModes: PAYROLL_AMOUNT_MODES,
  sourceTypes: PAYROLL_SOURCE_TYPES,
  hijackStatuses: PAYROLL_HIJACK_STATUSES,
  calculationReasons: PAYROLL_CALCULATION_REASONS,
  goalTypes: PAYROLL_GOAL_TYPES,
  notificationHints: PAYROLL_NOTIFICATION_HINTS,
  sortOptions: PAYROLL_SORT_OPTIONS,
  adminSortOptions: PAYROLL_ADMIN_SORT_OPTIONS,
  auditEventTypes: PAYROLL_AUDIT_EVENT_TYPES,
  idempotencyStatuses: PAYROLL_IDEMPOTENCY_STATUSES,
  riskLevels: PAYROLL_RISK_LEVELS,
  apiPaths: PAYROLL_API_PATHS,
  safePolicyGuard: PAYROLL_SAFE_POLICY_GUARD,
  completenessReport: PAYROLL_TYPES_COMPLETENESS_REPORT,
  getCompletenessReport: getPayrollTypesCompletenessReport,
  assertCompleteness: assertPayrollTypesCompleteness,
});

export default payrollTypes;
