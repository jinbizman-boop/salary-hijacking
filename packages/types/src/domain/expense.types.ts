/**
 * packages/types/src/domain/expense.types.ts
 *
 * 급여납치 Salary Hijacking Platform · Expense Domain Types
 *
 * 파일 목적
 * - 모바일 앱, 관리자 콘솔, API 서버, DB 계층이 공유하는 지출 도메인 타입 SSOT를 제공한다.
 * - 고정지출, 일일예산, 변동지출, 영수증/첨부, 예산 초과, 멱등성, 서버 권위 재계산,
 *   관리자 감사·운영·정산 지표까지 지출 도메인에서 필요한 계약을 한 파일에 고정한다.
 * - 급여·저축·광고·커뮤니티 도메인과 연결되지만, 지출 파일 자체는 외부 런타임 의존성 없는
 *   순수 TypeScript 타입/상수/가드만 제공한다.
 */

/* -----------------------------------------------------------------------------
 * 1. Contract metadata and primitive aliases
 * -------------------------------------------------------------------------- */

export const EXPENSE_TYPES_CONTRACT_VERSION = "2.0.0" as const;
export const EXPENSE_TYPES_PACKAGE = "@salary-hijacking/types" as const;
export const EXPENSE_TYPES_DOMAIN = "expense" as const;
export const EXPENSE_TIMEZONE = "Asia/Seoul" as const;
export const EXPENSE_LOCALE = "ko-KR" as const;
export const EXPENSE_CURRENCY = "KRW" as const;
export const EXPENSE_MONEY_UNIT = "KRW_1" as const;
export const EXPENSE_FORMULA_VERSION = "expense-v1" as const;

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
export type Locale = typeof EXPENSE_LOCALE | "en-US";
export type Timezone = typeof EXPENSE_TIMEZONE;
export type Currency = typeof EXPENSE_CURRENCY;
export type MoneyUnit = typeof EXPENSE_MONEY_UNIT;

/**
 * KRW 1원 단위 정수 금액.
 * DB는 BIGINT이지만 JS/TS 전송 계약은 number 또는 string 직렬화를 프로젝트 정책에 따라 선택할 수 있다.
 * 이 파일의 기본 UI/API 타입은 기존 코드 호환성을 위해 number를 사용한다.
 */
export type Won = number;
export type PositiveWon = number;
export type NonNegativeWon = number;
export type Percentage = number;

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepReadonly<T[K]>
      : T[K];
};

export interface ExpenseDomainEntity {
  readonly id: UUID;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

export interface ExpenseSoftDeletable {
  readonly deletedAt?: Nullable<ISODateTimeString>;
  readonly deletionReason?: Nullable<string>;
}

export interface ExpenseTraceableMutation {
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly idempotencyKey?: IdempotencyKey;
}

/* -----------------------------------------------------------------------------
 * 2. Enum constants and literal unions
 * -------------------------------------------------------------------------- */

export const EXPENSE_DOMAINS = [
  "FIXED_EXPENSE",
  "DAILY_BUDGET",
  "VARIABLE_EXPENSE",
] as const;
export type ExpenseDomain = (typeof EXPENSE_DOMAINS)[number];

export const FIXED_EXPENSE_CATEGORIES = [
  "SUBSCRIPTION",
  "LOAN",
  "INSURANCE",
  "TELECOM",
  "RENT",
  "TRANSPORT",
  "CARD",
  "TAX",
  "EDUCATION",
  "HEALTHCARE",
  "ETC",
] as const;
export type FixedExpenseCategory = (typeof FIXED_EXPENSE_CATEGORIES)[number];

export const VARIABLE_EXPENSE_CATEGORIES = [
  "FOOD",
  "CAFE",
  "TRANSPORT",
  "SHOPPING",
  "CULTURE",
  "HEALTHCARE",
  "EDUCATION",
  "LIVING",
  "GIFT",
  "TRAVEL",
  "ETC",
] as const;
export type VariableExpenseCategory =
  (typeof VARIABLE_EXPENSE_CATEGORIES)[number];

export const EXPENSE_RECURRENCE_TYPES = [
  "ONCE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
] as const;
export type ExpenseRecurrenceType = (typeof EXPENSE_RECURRENCE_TYPES)[number];

export const FIXED_EXPENSE_STATUSES = [
  "SCHEDULED",
  "PAID",
  "SKIPPED",
  "CANCELLED",
] as const;
export type FixedExpenseStatus = (typeof FIXED_EXPENSE_STATUSES)[number];

export const DAILY_BUDGET_STATUSES = ["OPEN", "OVER", "CLOSED"] as const;
export type DailyBudgetStatus = (typeof DAILY_BUDGET_STATUSES)[number];

export const VARIABLE_EXPENSE_STATUSES = [
  "ACTIVE",
  "CANCELLED",
  "DELETED",
] as const;
export type VariableExpenseStatus = (typeof VARIABLE_EXPENSE_STATUSES)[number];

export const EXPENSE_PAYMENT_METHODS = [
  "UNKNOWN",
  "CASH",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "BANK_TRANSFER",
  "SIMPLE_PAY",
  "POINT",
  "GIFT_CARD",
  "OTHER",
] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export const EXPENSE_INPUT_SOURCES = [
  "MANUAL_QUICK_ADD",
  "MANUAL_DETAIL",
  "TEMPLATE_COPY",
  "CARD_IMPORT",
  "BANK_IMPORT",
  "RECEIPT_UPLOAD",
  "SYSTEM_GENERATED",
  "ADMIN_ADJUSTMENT",
] as const;
export type ExpenseInputSource = (typeof EXPENSE_INPUT_SOURCES)[number];

export const EXPENSE_ATTACHMENT_TYPES = [
  "RECEIPT_IMAGE",
  "RECEIPT_PDF",
  "INVOICE",
  "MEMO_IMAGE",
] as const;
export type ExpenseAttachmentType = (typeof EXPENSE_ATTACHMENT_TYPES)[number];

export const EXPENSE_ATTACHMENT_SCAN_STATUSES = [
  "PENDING",
  "SCANNING",
  "CLEAN",
  "QUARANTINED",
  "REJECTED",
  "FAILED",
] as const;
export type ExpenseAttachmentScanStatus =
  (typeof EXPENSE_ATTACHMENT_SCAN_STATUSES)[number];

export const EXPENSE_CALCULATION_REASONS = [
  "PAYROLL_PLAN_CREATED",
  "PAYROLL_PLAN_UPDATED",
  "FIXED_EXPENSE_CHANGED",
  "SAVINGS_PLAN_CHANGED",
  "DAILY_BUDGET_CHANGED",
  "VARIABLE_EXPENSE_CHANGED",
  "MONTH_CLOSED",
  "RECALCULATE",
  "MIGRATION",
  "ADMIN_ADJUSTMENT",
] as const;
export type ExpenseCalculationReason =
  (typeof EXPENSE_CALCULATION_REASONS)[number];

export const EXPENSE_SORT_OPTIONS = [
  "latest",
  "oldest",
  "amount_desc",
  "amount_asc",
  "category",
  "status",
] as const;
export type ExpenseSortBy = (typeof EXPENSE_SORT_OPTIONS)[number];

export const EXPENSE_ADMIN_SORT_OPTIONS = [
  "latest",
  "amount_desc",
  "over_amount_desc",
  "cancelled_latest",
  "deleted_latest",
  "risk_desc",
] as const;
export type ExpenseAdminSortBy = (typeof EXPENSE_ADMIN_SORT_OPTIONS)[number];

export const EXPENSE_AUDIT_EVENT_TYPES = [
  "expense.fixed.created",
  "expense.fixed.updated",
  "expense.fixed.paid",
  "expense.fixed.skipped",
  "expense.fixed.cancelled",
  "expense.daily_budget.created",
  "expense.daily_budget.updated",
  "expense.daily_budget.recalculated",
  "expense.daily_budget.closed",
  "expense.variable.created",
  "expense.variable.updated",
  "expense.variable.cancelled",
  "expense.variable.deleted",
  "expense.attachment.uploaded",
  "expense.attachment.scan.completed",
  "expense.calculation.snapshot.created",
  "expense.idempotency.replayed",
  "expense.admin.adjusted",
] as const;
export type ExpenseAuditEventType = (typeof EXPENSE_AUDIT_EVENT_TYPES)[number];

export const EXPENSE_IDEMPOTENCY_STATUSES = [
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
] as const;
export type ExpenseIdempotencyStatus =
  (typeof EXPENSE_IDEMPOTENCY_STATUSES)[number];

export const EXPENSE_RISK_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
export type ExpenseRiskLevel = (typeof EXPENSE_RISK_LEVELS)[number];

/* -----------------------------------------------------------------------------
 * 3. Category descriptors for UI and API
 * -------------------------------------------------------------------------- */

export interface ExpenseCategoryDescriptor<TCategory extends string> {
  readonly category: TCategory;
  readonly nameKo: string;
  readonly descriptionKo: string;
  readonly emoji: string;
  readonly sortOrder: number;
  readonly active: boolean;
}

export const FIXED_EXPENSE_CATEGORY_DESCRIPTORS: readonly ExpenseCategoryDescriptor<FixedExpenseCategory>[] =
  Object.freeze([
    {
      category: "SUBSCRIPTION",
      nameKo: "구독료",
      descriptionKo: "정기 구독·멤버십 결제",
      emoji: "▶️",
      sortOrder: 10,
      active: true,
    },
    {
      category: "LOAN",
      nameKo: "대출금",
      descriptionKo: "학자금·신용·담보 대출 상환",
      emoji: "🏦",
      sortOrder: 20,
      active: true,
    },
    {
      category: "INSURANCE",
      nameKo: "보험료",
      descriptionKo: "실손·건강·자동차 보험",
      emoji: "🛡️",
      sortOrder: 30,
      active: true,
    },
    {
      category: "TELECOM",
      nameKo: "통신비",
      descriptionKo: "휴대폰·인터넷·IPTV",
      emoji: "📱",
      sortOrder: 40,
      active: true,
    },
    {
      category: "RENT",
      nameKo: "주거비",
      descriptionKo: "월세·관리비·공과금",
      emoji: "🏠",
      sortOrder: 50,
      active: true,
    },
    {
      category: "TRANSPORT",
      nameKo: "교통 고정비",
      descriptionKo: "정기권·주차·차량 유지",
      emoji: "🚇",
      sortOrder: 60,
      active: true,
    },
    {
      category: "CARD",
      nameKo: "카드대금",
      descriptionKo: "월별 카드 청구 고정분",
      emoji: "💳",
      sortOrder: 70,
      active: true,
    },
    {
      category: "TAX",
      nameKo: "세금",
      descriptionKo: "지방세·국세·보험성 납부",
      emoji: "🧾",
      sortOrder: 80,
      active: true,
    },
    {
      category: "EDUCATION",
      nameKo: "교육비",
      descriptionKo: "강의·학원·자격증",
      emoji: "📚",
      sortOrder: 90,
      active: true,
    },
    {
      category: "HEALTHCARE",
      nameKo: "의료/건강",
      descriptionKo: "병원·약·건강관리 고정 지출",
      emoji: "🏥",
      sortOrder: 100,
      active: true,
    },
    {
      category: "ETC",
      nameKo: "기타",
      descriptionKo: "분류되지 않은 고정 지출",
      emoji: "📌",
      sortOrder: 999,
      active: true,
    },
  ]);

export const VARIABLE_EXPENSE_CATEGORY_DESCRIPTORS: readonly ExpenseCategoryDescriptor<VariableExpenseCategory>[] =
  Object.freeze([
    {
      category: "FOOD",
      nameKo: "식비",
      descriptionKo: "식사·배달·간식",
      emoji: "🍱",
      sortOrder: 10,
      active: true,
    },
    {
      category: "CAFE",
      nameKo: "카페",
      descriptionKo: "커피·음료·디저트",
      emoji: "☕",
      sortOrder: 20,
      active: true,
    },
    {
      category: "TRANSPORT",
      nameKo: "교통",
      descriptionKo: "버스·지하철·택시·주유",
      emoji: "🚕",
      sortOrder: 30,
      active: true,
    },
    {
      category: "SHOPPING",
      nameKo: "쇼핑",
      descriptionKo: "의류·생활용품·온라인 쇼핑",
      emoji: "🛍️",
      sortOrder: 40,
      active: true,
    },
    {
      category: "CULTURE",
      nameKo: "문화/취미",
      descriptionKo: "영화·게임·공연·콘텐츠",
      emoji: "🎮",
      sortOrder: 50,
      active: true,
    },
    {
      category: "HEALTHCARE",
      nameKo: "의료/건강",
      descriptionKo: "병원·약국·운동",
      emoji: "💊",
      sortOrder: 60,
      active: true,
    },
    {
      category: "EDUCATION",
      nameKo: "교육",
      descriptionKo: "도서·강의·학습",
      emoji: "📖",
      sortOrder: 70,
      active: true,
    },
    {
      category: "LIVING",
      nameKo: "생활",
      descriptionKo: "생활소모품·세탁·수리",
      emoji: "🧺",
      sortOrder: 80,
      active: true,
    },
    {
      category: "GIFT",
      nameKo: "선물/경조",
      descriptionKo: "선물·축의금·조의금",
      emoji: "🎁",
      sortOrder: 90,
      active: true,
    },
    {
      category: "TRAVEL",
      nameKo: "여행",
      descriptionKo: "숙박·항공·여행 지출",
      emoji: "✈️",
      sortOrder: 100,
      active: true,
    },
    {
      category: "ETC",
      nameKo: "기타",
      descriptionKo: "분류되지 않은 변동 지출",
      emoji: "🧾",
      sortOrder: 999,
      active: true,
    },
  ]);

/* -----------------------------------------------------------------------------
 * 4. Policy, request context, ownership and privacy
 * -------------------------------------------------------------------------- */

export interface ExpensePolicyGuard {
  readonly rawPiiIncluded: false;
  readonly rawSecretIncluded: false;
  readonly rawTokenIncluded: false;
  readonly rawFinancialSourceDataIncluded: false;
  readonly adsFinancialJoinAllowed: false;
  readonly communityFinancialJoinAllowed: false;
  readonly amountStoredAsIntegerWon: true;
  readonly negativeUserInputAllowed: false;
  readonly decimalUserInputAllowed: false;
}

export const EXPENSE_SAFE_POLICY_GUARD: ExpensePolicyGuard = Object.freeze({
  rawPiiIncluded: false,
  rawSecretIncluded: false,
  rawTokenIncluded: false,
  rawFinancialSourceDataIncluded: false,
  adsFinancialJoinAllowed: false,
  communityFinancialJoinAllowed: false,
  amountStoredAsIntegerWon: true,
  negativeUserInputAllowed: false,
  decimalUserInputAllowed: false,
});

export interface ExpenseRequestContext {
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
    | "UNKNOWN";
}

export interface ExpenseOwnerTrace {
  readonly ownerUserId: UUID;
  readonly ownerHash: HashString;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly deviceHash?: HashString;
  readonly retainedUntil: ISODateTimeString;
  readonly serverOnly: true;
}

export interface ExpenseAdminActor {
  readonly adminUserId: UUID;
  readonly displayName: string;
  readonly role: "OWNER" | "ADMIN" | "OPERATOR" | "FINANCE_OPERATOR" | "VIEWER";
}

/* -----------------------------------------------------------------------------
 * 5. Core domain entities
 * -------------------------------------------------------------------------- */

export interface ExpenseMoney {
  readonly amount: NonNegativeWon;
  readonly currency: Currency;
  readonly unit: MoneyUnit;
}

export interface FixedExpense extends ExpenseDomainEntity {
  readonly fixedExpenseId: UUID;
  readonly userId: UUID;
  readonly payrollPlanId: UUID;
  readonly expenseDay: number;
  readonly category: FixedExpenseCategory;
  readonly name: string;
  readonly amount: PositiveWon;
  readonly recurrenceType: ExpenseRecurrenceType;
  readonly status: FixedExpenseStatus;
  readonly paidAt?: Nullable<ISODateTimeString>;
  readonly cancelledAt?: Nullable<ISODateTimeString>;
  readonly policy: ExpensePolicyGuard;
}

export interface FixedExpenseView extends FixedExpense {
  readonly categoryNameKo: string;
  readonly categoryEmoji: string;
  readonly displayAmount: string;
  readonly dueDate?: ISODateString;
  readonly isDueToday: boolean;
  readonly isOverdue: boolean;
}

export interface DailyBudget extends ExpenseDomainEntity {
  readonly dailyBudgetId: UUID;
  readonly userId: UUID;
  readonly budgetDate: ISODateString;
  readonly dailyLimitAmount: NonNegativeWon;
  readonly usedAmount: NonNegativeWon;
  readonly remainingAmount: NonNegativeWon;
  readonly overAmount: NonNegativeWon;
  readonly status: DailyBudgetStatus;
  readonly calculatedAt?: Nullable<ISODateTimeString>;
  readonly closedAt?: Nullable<ISODateTimeString>;
  readonly policy: ExpensePolicyGuard;
}

export interface DailyBudgetView extends DailyBudget {
  readonly displayRemainingAmount: Won;
  readonly progressRate: Percentage;
  readonly isOver: boolean;
  readonly statusLabelKo: string;
  readonly variableExpenseCount: number;
}

export interface VariableExpense
  extends ExpenseDomainEntity, ExpenseSoftDeletable {
  readonly variableExpenseId: UUID;
  readonly userId: UUID;
  readonly dailyBudgetId: UUID;
  readonly spentAt: ISODateTimeString;
  readonly spentDate: ISODateString;
  readonly category: VariableExpenseCategory;
  readonly merchantName?: Nullable<string>;
  readonly memo?: Nullable<string>;
  readonly amount: PositiveWon;
  readonly paymentMethod: ExpensePaymentMethod;
  readonly inputSource: ExpenseInputSource;
  readonly status: VariableExpenseStatus;
  readonly idempotencyKey?: Nullable<IdempotencyKey>;
  readonly cancelledAt?: Nullable<ISODateTimeString>;
  readonly attachmentIds: readonly UUID[];
  readonly policy: ExpensePolicyGuard;
}

export interface VariableExpenseView extends VariableExpense {
  readonly categoryNameKo: string;
  readonly categoryEmoji: string;
  readonly displayAmount: string;
  readonly displayTitle: string;
  readonly editable: boolean;
  readonly cancellable: boolean;
  readonly deletable: boolean;
}

export interface ExpenseAttachment
  extends ExpenseDomainEntity, ExpenseSoftDeletable {
  readonly attachmentId: UUID;
  readonly userId: UUID;
  readonly variableExpenseId?: UUID;
  readonly fixedExpenseId?: UUID;
  readonly type: ExpenseAttachmentType;
  readonly url?: UrlString;
  readonly storageKey?: string;
  readonly fileName?: string;
  readonly contentType?: string;
  readonly sizeBytes?: number;
  readonly checksumSha256?: HashString;
  readonly scanStatus: ExpenseAttachmentScanStatus;
  readonly extractedMerchantName?: string;
  readonly extractedAmount?: NonNegativeWon;
  readonly extractedSpentAt?: ISODateTimeString;
  readonly scannedAt?: ISODateTimeString;
  readonly policy: ExpensePolicyGuard;
}

/* -----------------------------------------------------------------------------
 * 6. Calculation contracts
 * -------------------------------------------------------------------------- */

export interface ExpenseTotals {
  readonly fixedExpenseTotal: NonNegativeWon;
  readonly variableExpenseTotal: NonNegativeWon;
  readonly dailyBudgetTotal: NonNegativeWon;
  readonly activeVariableExpenseTotal: NonNegativeWon;
  readonly scheduledOrPaidFixedExpenseTotal: NonNegativeWon;
  readonly usedAmount: NonNegativeWon;
  readonly remainingAmount: NonNegativeWon;
  readonly overAmount: NonNegativeWon;
}

export interface DailyBudgetCalculationInput {
  readonly dailyBudgetId: UUID;
  readonly dailyLimitAmount: NonNegativeWon;
  readonly activeVariableExpenses: readonly Pick<
    VariableExpense,
    "variableExpenseId" | "amount" | "status"
  >[];
}

export interface DailyBudgetCalculationOutput {
  readonly dailyBudgetId: UUID;
  readonly usedAmount: NonNegativeWon;
  readonly remainingAmount: NonNegativeWon;
  readonly overAmount: NonNegativeWon;
  readonly status: DailyBudgetStatus;
  readonly formulaVersion: typeof EXPENSE_FORMULA_VERSION;
  readonly calculatedAt: ISODateTimeString;
}

export interface ExpensePayrollCalculationInput {
  readonly payrollPlanId: UUID;
  readonly userId: UUID;
  readonly yearMonth: YearMonthString;
  readonly expectedSalaryAmount: NonNegativeWon;
  readonly fixedExpenses: readonly Pick<
    FixedExpense,
    "fixedExpenseId" | "amount" | "status"
  >[];
  readonly savingsTotal: NonNegativeWon;
  readonly dailyBudgets: readonly Pick<
    DailyBudget,
    "dailyBudgetId" | "dailyLimitAmount" | "budgetDate" | "status"
  >[];
  readonly variableExpenses: readonly Pick<
    VariableExpense,
    "variableExpenseId" | "amount" | "status" | "spentAt"
  >[];
}

export interface ExpensePayrollCalculationOutput {
  readonly payrollPlanId: UUID;
  readonly userId: UUID;
  readonly yearMonth: YearMonthString;
  readonly salaryAmount: NonNegativeWon;
  readonly fixedExpenseTotal: NonNegativeWon;
  readonly savingsTotal: NonNegativeWon;
  readonly variableExpenseTotal: NonNegativeWon;
  readonly dailyBudgetTotal: NonNegativeWon;
  readonly expectedExpenseAmount: NonNegativeWon;
  readonly expectedHijackAmount: NonNegativeWon;
  readonly confirmedHijackAmount: NonNegativeWon;
  readonly formulaVersion: typeof EXPENSE_FORMULA_VERSION;
  readonly calculationReason: ExpenseCalculationReason;
  readonly calculatedAt: ISODateTimeString;
}

export interface ExpenseCalculationSnapshot extends ExpenseDomainEntity {
  readonly snapshotId: UUID;
  readonly userId: UUID;
  readonly payrollPlanId: UUID;
  readonly yearMonth: YearMonthString;
  readonly salaryAmount: NonNegativeWon;
  readonly fixedExpenseTotal: NonNegativeWon;
  readonly savingsTotal: NonNegativeWon;
  readonly variableExpenseTotal: NonNegativeWon;
  readonly dailyBudgetTotal: NonNegativeWon;
  readonly expectedExpenseAmount: NonNegativeWon;
  readonly expectedHijackAmount: NonNegativeWon;
  readonly confirmedHijackAmount: NonNegativeWon;
  readonly formulaVersion: typeof EXPENSE_FORMULA_VERSION | string;
  readonly calculationReason: ExpenseCalculationReason;
  readonly calculationInput: Record<string, unknown>;
  readonly calculationOutput: Record<string, unknown>;
  readonly calculatedAt: ISODateTimeString;
  readonly policy: ExpensePolicyGuard;
}

/* -----------------------------------------------------------------------------
 * 7. Aggregate screen contracts
 * -------------------------------------------------------------------------- */

export interface ExpenseHomeSummary {
  readonly userId: UUID;
  readonly date: ISODateString;
  readonly yearMonth: YearMonthString;
  readonly salaryAmount: NonNegativeWon;
  readonly fixedExpenseTotal: NonNegativeWon;
  readonly variableExpenseTotal: NonNegativeWon;
  readonly usedAmountToday: NonNegativeWon;
  readonly dailyLimitAmountToday: NonNegativeWon;
  readonly remainingAmountToday: NonNegativeWon;
  readonly overAmountToday: NonNegativeWon;
  readonly expectedHijackAmount: NonNegativeWon;
  readonly confirmedHijackAmount: NonNegativeWon;
  readonly totalHijackAmount: NonNegativeWon;
  readonly fixedExpensesDueToday: readonly FixedExpenseView[];
  readonly latestVariableExpenses: readonly VariableExpenseView[];
  readonly dailyBudget: DailyBudgetView;
  readonly policy: ExpensePolicyGuard;
}

export interface ExpenseCalendarDaySummary {
  readonly date: ISODateString;
  readonly dailyLimitAmount: NonNegativeWon;
  readonly usedAmount: NonNegativeWon;
  readonly remainingAmount: NonNegativeWon;
  readonly overAmount: NonNegativeWon;
  readonly variableExpenseCount: number;
  readonly status: DailyBudgetStatus;
}

export interface ExpenseMonthlySummary {
  readonly userId: UUID;
  readonly yearMonth: YearMonthString;
  readonly fixedExpenseTotal: NonNegativeWon;
  readonly variableExpenseTotal: NonNegativeWon;
  readonly dailyBudgetTotal: NonNegativeWon;
  readonly dailyUsedTotal: NonNegativeWon;
  readonly dailyOverTotal: NonNegativeWon;
  readonly noSpendDayCount: number;
  readonly overBudgetDayCount: number;
  readonly categoryTotals: readonly ExpenseCategoryTotal[];
  readonly calculatedAt: ISODateTimeString;
}

export interface ExpenseCategoryTotal {
  readonly category: FixedExpenseCategory | VariableExpenseCategory;
  readonly domain: ExpenseDomain;
  readonly amount: NonNegativeWon;
  readonly count: number;
  readonly ratio: Percentage;
}

/* -----------------------------------------------------------------------------
 * 8. API request/response contracts
 * -------------------------------------------------------------------------- */

export interface ExpenseListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly cursor?: string;
  readonly sortBy?: ExpenseSortBy;
}

export interface ExpenseAdminListQuery extends Omit<
  ExpenseListQuery,
  "sortBy"
> {
  readonly sortBy?: ExpenseAdminSortBy;
}

export interface ExpensePageInfo {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount?: number;
  readonly nextCursor?: string;
  readonly hasNextPage: boolean;
}

export interface ExpenseSuccessResponse<TData> {
  readonly ok: true;
  readonly data: TData;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface ExpenseListResponse<TItem> {
  readonly ok: true;
  readonly data: readonly TItem[];
  readonly pageInfo: ExpensePageInfo;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface ExpenseMutationResponse<
  TData,
> extends ExpenseSuccessResponse<TData> {
  readonly mutation: {
    readonly idempotencyKey?: IdempotencyKey;
    readonly replayed: boolean;
    readonly committedAt: ISODateTimeString;
  };
}

export interface ExpenseErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  };
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export type ExpenseApiResponse<TData> =
  | ExpenseSuccessResponse<TData>
  | ExpenseErrorResponse;
export type ExpenseMutationApiResponse<TData> =
  | ExpenseMutationResponse<TData>
  | ExpenseErrorResponse;

export interface ListFixedExpensesRequest extends ExpenseListQuery {
  readonly payrollPlanId?: UUID;
  readonly yearMonth?: YearMonthString;
  readonly category?: FixedExpenseCategory;
  readonly status?: FixedExpenseStatus;
  readonly context?: ExpenseRequestContext;
}

export interface CreateFixedExpenseRequest extends ExpenseTraceableMutation {
  readonly payrollPlanId: UUID;
  readonly expenseDay: number;
  readonly category: FixedExpenseCategory;
  readonly name: string;
  readonly amount: PositiveWon;
  readonly recurrenceType?: ExpenseRecurrenceType;
  readonly context?: ExpenseRequestContext;
}

export interface UpdateFixedExpenseRequest extends ExpenseTraceableMutation {
  readonly fixedExpenseId: UUID;
  readonly expenseDay?: number;
  readonly category?: FixedExpenseCategory;
  readonly name?: string;
  readonly amount?: PositiveWon;
  readonly recurrenceType?: ExpenseRecurrenceType;
  readonly status?: FixedExpenseStatus;
  readonly context?: ExpenseRequestContext;
}

export interface MarkFixedExpensePaidRequest extends ExpenseTraceableMutation {
  readonly fixedExpenseId: UUID;
  readonly paidAt?: ISODateTimeString;
  readonly context?: ExpenseRequestContext;
}

export interface SkipFixedExpenseRequest extends ExpenseTraceableMutation {
  readonly fixedExpenseId: UUID;
  readonly reason?: string;
  readonly context?: ExpenseRequestContext;
}

export interface CancelFixedExpenseRequest extends ExpenseTraceableMutation {
  readonly fixedExpenseId: UUID;
  readonly reason?: string;
  readonly cancelledAt?: ISODateTimeString;
  readonly context?: ExpenseRequestContext;
}

export interface GetDailyBudgetRequest {
  readonly budgetDate: ISODateString;
  readonly includeExpenses?: boolean;
  readonly context?: ExpenseRequestContext;
}

export interface ListDailyBudgetsRequest extends ExpenseListQuery {
  readonly from?: ISODateString;
  readonly to?: ISODateString;
  readonly status?: DailyBudgetStatus;
  readonly context?: ExpenseRequestContext;
}

export interface UpsertDailyBudgetRequest extends ExpenseTraceableMutation {
  readonly budgetDate: ISODateString;
  readonly dailyLimitAmount: NonNegativeWon;
  readonly context?: ExpenseRequestContext;
}

export interface CloseDailyBudgetRequest extends ExpenseTraceableMutation {
  readonly dailyBudgetId: UUID;
  readonly closedAt?: ISODateTimeString;
  readonly context?: ExpenseRequestContext;
}

export interface RecalculateDailyBudgetRequest extends ExpenseTraceableMutation {
  readonly dailyBudgetId: UUID;
  readonly reason?: Extract<
    ExpenseCalculationReason,
    | "DAILY_BUDGET_CHANGED"
    | "VARIABLE_EXPENSE_CHANGED"
    | "RECALCULATE"
    | "ADMIN_ADJUSTMENT"
  >;
  readonly context?: ExpenseRequestContext;
}

export interface ListVariableExpensesRequest extends ExpenseListQuery {
  readonly dailyBudgetId?: UUID;
  readonly from?: ISODateTimeString;
  readonly to?: ISODateTimeString;
  readonly category?: VariableExpenseCategory;
  readonly status?: VariableExpenseStatus;
  readonly minAmount?: NonNegativeWon;
  readonly maxAmount?: NonNegativeWon;
  readonly search?: string;
  readonly context?: ExpenseRequestContext;
}

export interface CreateVariableExpenseRequest extends ExpenseTraceableMutation {
  readonly dailyBudgetId: UUID;
  readonly spentAt: ISODateTimeString;
  readonly category: VariableExpenseCategory;
  readonly merchantName?: string;
  readonly memo?: string;
  readonly amount: PositiveWon;
  readonly paymentMethod?: ExpensePaymentMethod;
  readonly inputSource?: ExpenseInputSource;
  readonly attachments?: readonly ExpenseAttachmentInput[];
  readonly context?: ExpenseRequestContext;
}

export interface QuickAddVariableExpenseRequest extends ExpenseTraceableMutation {
  readonly budgetDate: ISODateString;
  readonly quickText: string;
  readonly fallbackCategory?: VariableExpenseCategory;
  readonly fallbackAmount?: PositiveWon;
  readonly context?: ExpenseRequestContext;
}

export interface UpdateVariableExpenseRequest extends ExpenseTraceableMutation {
  readonly variableExpenseId: UUID;
  readonly spentAt?: ISODateTimeString;
  readonly category?: VariableExpenseCategory;
  readonly merchantName?: Nullable<string>;
  readonly memo?: Nullable<string>;
  readonly amount?: PositiveWon;
  readonly paymentMethod?: ExpensePaymentMethod;
  readonly attachments?: readonly ExpenseAttachmentInput[];
  readonly context?: ExpenseRequestContext;
}

export interface CancelVariableExpenseRequest extends ExpenseTraceableMutation {
  readonly variableExpenseId: UUID;
  readonly reason?: string;
  readonly cancelledAt?: ISODateTimeString;
  readonly context?: ExpenseRequestContext;
}

export interface DeleteVariableExpenseRequest extends ExpenseTraceableMutation {
  readonly variableExpenseId: UUID;
  readonly reason?: string;
  readonly hardDelete?: false;
  readonly context?: ExpenseRequestContext;
}

export interface BulkCreateVariableExpensesRequest extends ExpenseTraceableMutation {
  readonly dailyBudgetId: UUID;
  readonly items: readonly Omit<
    CreateVariableExpenseRequest,
    "dailyBudgetId" | "context" | "idempotencyKey" | "requestId" | "traceId"
  >[];
  readonly context?: ExpenseRequestContext;
}

export interface ExpenseAttachmentInput {
  readonly type: ExpenseAttachmentType;
  readonly uploadId?: UUID;
  readonly url?: UrlString;
  readonly fileName?: string;
  readonly contentType?: string;
  readonly sizeBytes?: number;
  readonly checksumSha256?: HashString;
}

export interface UploadExpenseAttachmentRequest extends ExpenseTraceableMutation {
  readonly targetDomain: Extract<
    ExpenseDomain,
    "FIXED_EXPENSE" | "VARIABLE_EXPENSE"
  >;
  readonly targetId?: UUID;
  readonly attachment: ExpenseAttachmentInput;
  readonly context?: ExpenseRequestContext;
}

export interface GetExpenseHomeSummaryRequest {
  readonly date?: ISODateString;
  readonly yearMonth?: YearMonthString;
  readonly context?: ExpenseRequestContext;
}

export interface GetExpenseMonthlySummaryRequest {
  readonly yearMonth: YearMonthString;
  readonly context?: ExpenseRequestContext;
}

export interface RecalculateExpensePayrollRequest extends ExpenseTraceableMutation {
  readonly payrollPlanId: UUID;
  readonly reason: ExpenseCalculationReason;
  readonly context?: ExpenseRequestContext;
}

export interface ListExpenseAuditLogsAdminRequest extends ExpenseAdminListQuery {
  readonly targetDomain?: ExpenseDomain;
  readonly targetId?: UUID;
  readonly actorUserId?: UUID;
  readonly eventType?: ExpenseAuditEventType;
  readonly from?: ISODateTimeString;
  readonly to?: ISODateTimeString;
  readonly context?: ExpenseRequestContext;
}

export interface AdjustExpenseAdminRequest extends ExpenseTraceableMutation {
  readonly targetDomain: ExpenseDomain;
  readonly targetId: UUID;
  readonly reason: string;
  readonly patch: Record<string, unknown>;
  readonly context?: ExpenseRequestContext;
}

export interface GetExpenseMetricsAdminRequest {
  readonly from?: ISODateString;
  readonly to?: ISODateString;
  readonly yearMonth?: YearMonthString;
  readonly context?: ExpenseRequestContext;
}

export interface ExpenseDeleteResult {
  readonly id: UUID;
  readonly deleted: true;
  readonly deletedAt: ISODateTimeString;
}

export type ListFixedExpensesResponse = ExpenseListResponse<FixedExpenseView>;
export type CreateFixedExpenseResponse = ExpenseMutationResponse<FixedExpense>;
export type UpdateFixedExpenseResponse = ExpenseMutationResponse<FixedExpense>;
export type MarkFixedExpensePaidResponse =
  ExpenseMutationResponse<FixedExpense>;
export type SkipFixedExpenseResponse = ExpenseMutationResponse<FixedExpense>;
export type CancelFixedExpenseResponse = ExpenseMutationResponse<FixedExpense>;
export type GetDailyBudgetResponse = ExpenseSuccessResponse<
  DailyBudgetView & { readonly expenses?: readonly VariableExpenseView[] }
>;
export type ListDailyBudgetsResponse =
  ExpenseListResponse<ExpenseCalendarDaySummary>;
export type UpsertDailyBudgetResponse = ExpenseMutationResponse<DailyBudget>;
export type CloseDailyBudgetResponse = ExpenseMutationResponse<DailyBudget>;
export type RecalculateDailyBudgetResponse =
  ExpenseMutationResponse<DailyBudgetCalculationOutput>;
export type ListVariableExpensesResponse =
  ExpenseListResponse<VariableExpenseView>;
export type CreateVariableExpenseResponse =
  ExpenseMutationResponse<VariableExpense>;
export type QuickAddVariableExpenseResponse =
  ExpenseMutationResponse<VariableExpense>;
export type UpdateVariableExpenseResponse =
  ExpenseMutationResponse<VariableExpense>;
export type CancelVariableExpenseResponse =
  ExpenseMutationResponse<VariableExpense>;
export type DeleteVariableExpenseResponse =
  ExpenseMutationResponse<ExpenseDeleteResult>;
export type BulkCreateVariableExpensesResponse = ExpenseMutationResponse<
  readonly VariableExpense[]
>;
export type UploadExpenseAttachmentResponse =
  ExpenseMutationResponse<ExpenseAttachment>;
export type GetExpenseHomeSummaryResponse =
  ExpenseSuccessResponse<ExpenseHomeSummary>;
export type GetExpenseMonthlySummaryResponse =
  ExpenseSuccessResponse<ExpenseMonthlySummary>;
export type RecalculateExpensePayrollResponse =
  ExpenseMutationResponse<ExpensePayrollCalculationOutput>;

export type ExpenseMutationOperation =
  | "CREATE_FIXED_EXPENSE"
  | "UPDATE_FIXED_EXPENSE"
  | "MARK_FIXED_EXPENSE_PAID"
  | "SKIP_FIXED_EXPENSE"
  | "CANCEL_FIXED_EXPENSE"
  | "UPSERT_DAILY_BUDGET"
  | "CLOSE_DAILY_BUDGET"
  | "RECALCULATE_DAILY_BUDGET"
  | "CREATE_VARIABLE_EXPENSE"
  | "QUICK_ADD_VARIABLE_EXPENSE"
  | "UPDATE_VARIABLE_EXPENSE"
  | "CANCEL_VARIABLE_EXPENSE"
  | "DELETE_VARIABLE_EXPENSE"
  | "BULK_CREATE_VARIABLE_EXPENSES"
  | "UPLOAD_EXPENSE_ATTACHMENT"
  | "RECALCULATE_EXPENSE_PAYROLL"
  | "ADMIN_ADJUST_EXPENSE";

/* -----------------------------------------------------------------------------
 * 9. Admin, audit, metrics, idempotency
 * -------------------------------------------------------------------------- */

export interface ExpenseAuditLog extends ExpenseDomainEntity {
  readonly auditLogId: UUID;
  readonly eventType: ExpenseAuditEventType;
  readonly actorUserId?: UUID;
  readonly adminActor?: ExpenseAdminActor;
  readonly targetDomain: ExpenseDomain;
  readonly targetId: UUID;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  readonly reason?: string;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly policy: ExpensePolicyGuard;
}

export interface ExpenseIdempotencyRecord extends ExpenseDomainEntity {
  readonly userId: UUID;
  readonly idempotencyKey: IdempotencyKey;
  readonly operation: ExpenseMutationOperation;
  readonly status: ExpenseIdempotencyStatus;
  readonly requestHash: HashString;
  readonly responseReferenceId?: UUID;
  readonly errorCode?: string;
  readonly expiresAt: ISODateTimeString;
}

export interface ExpenseAdminRecord<TRecord> {
  readonly record: TRecord;
  readonly ownerTrace: ExpenseOwnerTrace;
  readonly riskLevel: ExpenseRiskLevel;
  readonly riskLabels: readonly string[];
  readonly internalNotes: readonly string[];
}

export type FixedExpenseAdminRecord = ExpenseAdminRecord<FixedExpense>;
export type DailyBudgetAdminRecord = ExpenseAdminRecord<DailyBudget>;
export type VariableExpenseAdminRecord = ExpenseAdminRecord<VariableExpense>;

export interface ExpenseMetricsAdmin {
  readonly fixedExpenseCount: number;
  readonly variableExpenseCount: number;
  readonly dailyBudgetCount: number;
  readonly totalFixedExpenseAmount: NonNegativeWon;
  readonly totalVariableExpenseAmount: NonNegativeWon;
  readonly totalDailyBudgetAmount: NonNegativeWon;
  readonly overBudgetDayCount: number;
  readonly noSpendDayCount: number;
  readonly cancelledVariableExpenseCount: number;
  readonly deletedVariableExpenseCount: number;
  readonly averageDailyUsedAmount: NonNegativeWon;
  readonly topVariableCategories: readonly ExpenseCategoryTotal[];
  readonly topFixedCategories: readonly ExpenseCategoryTotal[];
  readonly measuredAt: ISODateTimeString;
}

export type ListExpenseAuditLogsAdminResponse =
  ExpenseListResponse<ExpenseAuditLog>;
export type AdjustExpenseAdminResponse = ExpenseMutationResponse<
  FixedExpenseAdminRecord | DailyBudgetAdminRecord | VariableExpenseAdminRecord
>;
export type GetExpenseMetricsAdminResponse =
  ExpenseSuccessResponse<ExpenseMetricsAdmin>;

/* -----------------------------------------------------------------------------
 * 10. API path registry
 * -------------------------------------------------------------------------- */

export const EXPENSE_API_PATHS = Object.freeze({
  listFixedExpenses: "/expenses/fixed",
  createFixedExpense: "/expenses/fixed",
  updateFixedExpense: "/expenses/fixed/:fixedExpenseId",
  markFixedExpensePaid: "/expenses/fixed/:fixedExpenseId/paid",
  skipFixedExpense: "/expenses/fixed/:fixedExpenseId/skip",
  cancelFixedExpense: "/expenses/fixed/:fixedExpenseId/cancel",
  getDailyBudget: "/expenses/daily-budgets/:budgetDate",
  listDailyBudgets: "/expenses/daily-budgets",
  upsertDailyBudget: "/expenses/daily-budgets",
  closeDailyBudget: "/expenses/daily-budgets/:dailyBudgetId/close",
  recalculateDailyBudget: "/expenses/daily-budgets/:dailyBudgetId/recalculate",
  listVariableExpenses: "/expenses/variable",
  createVariableExpense: "/expenses/variable",
  quickAddVariableExpense: "/expenses/variable/quick-add",
  updateVariableExpense: "/expenses/variable/:variableExpenseId",
  cancelVariableExpense: "/expenses/variable/:variableExpenseId/cancel",
  deleteVariableExpense: "/expenses/variable/:variableExpenseId",
  bulkCreateVariableExpenses: "/expenses/variable/bulk",
  uploadExpenseAttachment: "/expenses/attachments",
  getExpenseHomeSummary: "/expenses/home-summary",
  getExpenseMonthlySummary: "/expenses/monthly-summary/:yearMonth",
  recalculateExpensePayroll: "/expenses/payroll/:payrollPlanId/recalculate",
  adminListAuditLogs: "/admin/expenses/audit-logs",
  adminAdjustExpense: "/admin/expenses/adjust",
  adminMetrics: "/admin/expenses/metrics",
} as const);

export type ExpenseApiPathName = keyof typeof EXPENSE_API_PATHS;
export type ExpenseApiPath = (typeof EXPENSE_API_PATHS)[ExpenseApiPathName];
export type ExpenseHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ExpenseEndpointDescriptor<TRequest, TResponse> {
  readonly method: ExpenseHttpMethod;
  readonly path: ExpenseApiPath;
  readonly request: TRequest;
  readonly response: TResponse;
  readonly authRequired: boolean;
  readonly adminRequired: boolean;
  readonly idempotencyRequired: boolean;
  readonly serverAuthorityCalculation: boolean;
}

export interface ExpenseEndpointTypes {
  readonly listFixedExpenses: ExpenseEndpointDescriptor<
    ListFixedExpensesRequest,
    ListFixedExpensesResponse
  >;
  readonly createFixedExpense: ExpenseEndpointDescriptor<
    CreateFixedExpenseRequest,
    CreateFixedExpenseResponse
  >;
  readonly updateFixedExpense: ExpenseEndpointDescriptor<
    UpdateFixedExpenseRequest,
    UpdateFixedExpenseResponse
  >;
  readonly markFixedExpensePaid: ExpenseEndpointDescriptor<
    MarkFixedExpensePaidRequest,
    MarkFixedExpensePaidResponse
  >;
  readonly skipFixedExpense: ExpenseEndpointDescriptor<
    SkipFixedExpenseRequest,
    SkipFixedExpenseResponse
  >;
  readonly cancelFixedExpense: ExpenseEndpointDescriptor<
    CancelFixedExpenseRequest,
    CancelFixedExpenseResponse
  >;
  readonly getDailyBudget: ExpenseEndpointDescriptor<
    GetDailyBudgetRequest,
    GetDailyBudgetResponse
  >;
  readonly listDailyBudgets: ExpenseEndpointDescriptor<
    ListDailyBudgetsRequest,
    ListDailyBudgetsResponse
  >;
  readonly upsertDailyBudget: ExpenseEndpointDescriptor<
    UpsertDailyBudgetRequest,
    UpsertDailyBudgetResponse
  >;
  readonly closeDailyBudget: ExpenseEndpointDescriptor<
    CloseDailyBudgetRequest,
    CloseDailyBudgetResponse
  >;
  readonly recalculateDailyBudget: ExpenseEndpointDescriptor<
    RecalculateDailyBudgetRequest,
    RecalculateDailyBudgetResponse
  >;
  readonly listVariableExpenses: ExpenseEndpointDescriptor<
    ListVariableExpensesRequest,
    ListVariableExpensesResponse
  >;
  readonly createVariableExpense: ExpenseEndpointDescriptor<
    CreateVariableExpenseRequest,
    CreateVariableExpenseResponse
  >;
  readonly quickAddVariableExpense: ExpenseEndpointDescriptor<
    QuickAddVariableExpenseRequest,
    QuickAddVariableExpenseResponse
  >;
  readonly updateVariableExpense: ExpenseEndpointDescriptor<
    UpdateVariableExpenseRequest,
    UpdateVariableExpenseResponse
  >;
  readonly cancelVariableExpense: ExpenseEndpointDescriptor<
    CancelVariableExpenseRequest,
    CancelVariableExpenseResponse
  >;
  readonly deleteVariableExpense: ExpenseEndpointDescriptor<
    DeleteVariableExpenseRequest,
    DeleteVariableExpenseResponse
  >;
  readonly bulkCreateVariableExpenses: ExpenseEndpointDescriptor<
    BulkCreateVariableExpensesRequest,
    BulkCreateVariableExpensesResponse
  >;
  readonly uploadExpenseAttachment: ExpenseEndpointDescriptor<
    UploadExpenseAttachmentRequest,
    UploadExpenseAttachmentResponse
  >;
  readonly getExpenseHomeSummary: ExpenseEndpointDescriptor<
    GetExpenseHomeSummaryRequest,
    GetExpenseHomeSummaryResponse
  >;
  readonly getExpenseMonthlySummary: ExpenseEndpointDescriptor<
    GetExpenseMonthlySummaryRequest,
    GetExpenseMonthlySummaryResponse
  >;
  readonly recalculateExpensePayroll: ExpenseEndpointDescriptor<
    RecalculateExpensePayrollRequest,
    RecalculateExpensePayrollResponse
  >;
  readonly adminListAuditLogs: ExpenseEndpointDescriptor<
    ListExpenseAuditLogsAdminRequest,
    ListExpenseAuditLogsAdminResponse
  >;
  readonly adminAdjustExpense: ExpenseEndpointDescriptor<
    AdjustExpenseAdminRequest,
    AdjustExpenseAdminResponse
  >;
  readonly adminMetrics: ExpenseEndpointDescriptor<
    GetExpenseMetricsAdminRequest,
    GetExpenseMetricsAdminResponse
  >;
}

/* -----------------------------------------------------------------------------
 * 11. Runtime-free utility guards and calculators
 * -------------------------------------------------------------------------- */

const includesString = <TValue extends string>(
  values: readonly TValue[],
  value: string,
): value is TValue => (values as readonly string[]).includes(value);

export const isFixedExpenseCategory = (
  value: string,
): value is FixedExpenseCategory =>
  includesString(FIXED_EXPENSE_CATEGORIES, value);

export const isVariableExpenseCategory = (
  value: string,
): value is VariableExpenseCategory =>
  includesString(VARIABLE_EXPENSE_CATEGORIES, value);

export const isFixedExpenseStatus = (
  value: string,
): value is FixedExpenseStatus => includesString(FIXED_EXPENSE_STATUSES, value);

export const isDailyBudgetStatus = (
  value: string,
): value is DailyBudgetStatus => includesString(DAILY_BUDGET_STATUSES, value);

export const isVariableExpenseStatus = (
  value: string,
): value is VariableExpenseStatus =>
  includesString(VARIABLE_EXPENSE_STATUSES, value);

export const isExpenseRecurrenceType = (
  value: string,
): value is ExpenseRecurrenceType =>
  includesString(EXPENSE_RECURRENCE_TYPES, value);

export const isPositiveWon = (value: number): value is PositiveWon =>
  Number.isSafeInteger(value) && value > 0;

export const isNonNegativeWon = (value: number): value is NonNegativeWon =>
  Number.isSafeInteger(value) && value >= 0;

export const assertExpensePolicyGuard = (guard: ExpensePolicyGuard): void => {
  if (
    guard.rawPiiIncluded !== false ||
    guard.rawSecretIncluded !== false ||
    guard.rawTokenIncluded !== false ||
    guard.rawFinancialSourceDataIncluded !== false ||
    guard.adsFinancialJoinAllowed !== false ||
    guard.communityFinancialJoinAllowed !== false ||
    guard.amountStoredAsIntegerWon !== true ||
    guard.negativeUserInputAllowed !== false ||
    guard.decimalUserInputAllowed !== false
  ) {
    throw new Error(
      "Unsafe expense policy guard: expense payload must keep raw PII, secrets, tokens, financial source joins, negative amounts, and decimal amounts out of public contracts.",
    );
  }
};

export const createExpensePolicyGuard = (): ExpensePolicyGuard => ({
  ...EXPENSE_SAFE_POLICY_GUARD,
});

export const getFixedExpenseCategoryDescriptor = (
  category: FixedExpenseCategory,
): ExpenseCategoryDescriptor<FixedExpenseCategory> => {
  const descriptor = FIXED_EXPENSE_CATEGORY_DESCRIPTORS.find(
    (item) => item.category === category,
  );
  if (!descriptor)
    throw new Error(`Unknown fixed expense category: ${category}`);
  return descriptor;
};

export const getVariableExpenseCategoryDescriptor = (
  category: VariableExpenseCategory,
): ExpenseCategoryDescriptor<VariableExpenseCategory> => {
  const descriptor = VARIABLE_EXPENSE_CATEGORY_DESCRIPTORS.find(
    (item) => item.category === category,
  );
  if (!descriptor)
    throw new Error(`Unknown variable expense category: ${category}`);
  return descriptor;
};

export const calculateDailyBudget = (
  input: DailyBudgetCalculationInput,
  calculatedAt: ISODateTimeString,
): DailyBudgetCalculationOutput => {
  const usedAmount = input.activeVariableExpenses
    .filter((item) => item.status === "ACTIVE")
    .reduce((sum, item) => sum + item.amount, 0);
  const remainingAmount = Math.max(input.dailyLimitAmount - usedAmount, 0);
  const overAmount = Math.max(usedAmount - input.dailyLimitAmount, 0);
  return {
    dailyBudgetId: input.dailyBudgetId,
    usedAmount,
    remainingAmount,
    overAmount,
    status: overAmount > 0 ? "OVER" : "OPEN",
    formulaVersion: EXPENSE_FORMULA_VERSION,
    calculatedAt,
  };
};

export const calculateDisplayRemainingAmount = (
  dailyLimitAmount: NonNegativeWon,
  usedAmount: NonNegativeWon,
): Won => dailyLimitAmount - usedAmount;

export const normalizeExpensePageSize = (
  pageSize: number | undefined,
  fallback = 20,
  max = 100,
): number => {
  if (typeof pageSize !== "number" || !Number.isFinite(pageSize))
    return fallback;
  return Math.max(1, Math.min(Math.floor(pageSize), max));
};

/* -----------------------------------------------------------------------------
 * 12. Completeness report
 * -------------------------------------------------------------------------- */

export interface ExpenseTypesCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof EXPENSE_TYPES_CONTRACT_VERSION;
  readonly fixedCategoryCount: number;
  readonly variableCategoryCount: number;
  readonly fixedStatusCount: number;
  readonly dailyBudgetStatusCount: number;
  readonly variableStatusCount: number;
  readonly apiPathCount: number;
  readonly hasServerAuthorityCalculationContract: boolean;
  readonly hasIdempotencyContract: boolean;
  readonly hasPrivacyGuard: boolean;
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

export const getExpenseTypesCompletenessReport =
  (): ExpenseTypesCompletenessReport => {
    const missing: string[] = [];

    requireEvery(
      FIXED_EXPENSE_CATEGORIES,
      [
        "SUBSCRIPTION",
        "LOAN",
        "INSURANCE",
        "TELECOM",
        "RENT",
        "CARD",
        "ETC",
      ] as const,
      "fixed category",
      missing,
    );
    requireEvery(
      VARIABLE_EXPENSE_CATEGORIES,
      [
        "FOOD",
        "CAFE",
        "TRANSPORT",
        "SHOPPING",
        "CULTURE",
        "LIVING",
        "ETC",
      ] as const,
      "variable category",
      missing,
    );
    requireEvery(
      FIXED_EXPENSE_STATUSES,
      ["SCHEDULED", "PAID", "SKIPPED", "CANCELLED"] as const,
      "fixed status",
      missing,
    );
    requireEvery(
      DAILY_BUDGET_STATUSES,
      ["OPEN", "OVER", "CLOSED"] as const,
      "daily budget status",
      missing,
    );
    requireEvery(
      VARIABLE_EXPENSE_STATUSES,
      ["ACTIVE", "CANCELLED", "DELETED"] as const,
      "variable status",
      missing,
    );
    requireEvery(
      EXPENSE_CALCULATION_REASONS,
      [
        "FIXED_EXPENSE_CHANGED",
        "DAILY_BUDGET_CHANGED",
        "VARIABLE_EXPENSE_CHANGED",
        "RECALCULATE",
      ] as const,
      "calculation reason",
      missing,
    );

    for (const pathName of [
      "listFixedExpenses",
      "createFixedExpense",
      "upsertDailyBudget",
      "recalculateDailyBudget",
      "listVariableExpenses",
      "createVariableExpense",
      "quickAddVariableExpense",
      "cancelVariableExpense",
      "getExpenseHomeSummary",
      "getExpenseMonthlySummary",
      "recalculateExpensePayroll",
      "adminAdjustExpense",
      "adminMetrics",
    ] as const satisfies readonly ExpenseApiPathName[]) {
      if (!EXPENSE_API_PATHS[pathName])
        missing.push(`missing API path: ${pathName}`);
    }

    if (!EXPENSE_SAFE_POLICY_GUARD.amountStoredAsIntegerWon)
      missing.push("missing integer KRW policy");
    if (EXPENSE_SAFE_POLICY_GUARD.negativeUserInputAllowed)
      missing.push("negative user input must not be allowed");
    if (EXPENSE_SAFE_POLICY_GUARD.decimalUserInputAllowed)
      missing.push("decimal user input must not be allowed");

    return {
      ok: missing.length === 0,
      contractVersion: EXPENSE_TYPES_CONTRACT_VERSION,
      fixedCategoryCount: FIXED_EXPENSE_CATEGORIES.length,
      variableCategoryCount: VARIABLE_EXPENSE_CATEGORIES.length,
      fixedStatusCount: FIXED_EXPENSE_STATUSES.length,
      dailyBudgetStatusCount: DAILY_BUDGET_STATUSES.length,
      variableStatusCount: VARIABLE_EXPENSE_STATUSES.length,
      apiPathCount: Object.keys(EXPENSE_API_PATHS).length,
      hasServerAuthorityCalculationContract: true,
      hasIdempotencyContract: true,
      hasPrivacyGuard: true,
      missing,
    };
  };

export const assertExpenseTypesCompleteness = (): void => {
  const report = getExpenseTypesCompletenessReport();
  if (!report.ok)
    throw new Error(
      `Expense types are incomplete: ${report.missing.join(", ")}`,
    );
};

export const EXPENSE_TYPES_COMPLETENESS_REPORT = Object.freeze(
  getExpenseTypesCompletenessReport(),
);

export const expenseTypes = Object.freeze({
  contractVersion: EXPENSE_TYPES_CONTRACT_VERSION,
  packageName: EXPENSE_TYPES_PACKAGE,
  domain: EXPENSE_TYPES_DOMAIN,
  timezone: EXPENSE_TIMEZONE,
  locale: EXPENSE_LOCALE,
  currency: EXPENSE_CURRENCY,
  moneyUnit: EXPENSE_MONEY_UNIT,
  formulaVersion: EXPENSE_FORMULA_VERSION,
  domains: EXPENSE_DOMAINS,
  fixedCategories: FIXED_EXPENSE_CATEGORIES,
  variableCategories: VARIABLE_EXPENSE_CATEGORIES,
  recurrenceTypes: EXPENSE_RECURRENCE_TYPES,
  fixedStatuses: FIXED_EXPENSE_STATUSES,
  dailyBudgetStatuses: DAILY_BUDGET_STATUSES,
  variableStatuses: VARIABLE_EXPENSE_STATUSES,
  paymentMethods: EXPENSE_PAYMENT_METHODS,
  inputSources: EXPENSE_INPUT_SOURCES,
  attachmentTypes: EXPENSE_ATTACHMENT_TYPES,
  attachmentScanStatuses: EXPENSE_ATTACHMENT_SCAN_STATUSES,
  calculationReasons: EXPENSE_CALCULATION_REASONS,
  sortOptions: EXPENSE_SORT_OPTIONS,
  adminSortOptions: EXPENSE_ADMIN_SORT_OPTIONS,
  auditEventTypes: EXPENSE_AUDIT_EVENT_TYPES,
  idempotencyStatuses: EXPENSE_IDEMPOTENCY_STATUSES,
  riskLevels: EXPENSE_RISK_LEVELS,
  fixedCategoryDescriptors: FIXED_EXPENSE_CATEGORY_DESCRIPTORS,
  variableCategoryDescriptors: VARIABLE_EXPENSE_CATEGORY_DESCRIPTORS,
  apiPaths: EXPENSE_API_PATHS,
  safePolicyGuard: EXPENSE_SAFE_POLICY_GUARD,
  completenessReport: EXPENSE_TYPES_COMPLETENESS_REPORT,
  getCompletenessReport: getExpenseTypesCompletenessReport,
  assertCompleteness: assertExpenseTypesCompleteness,
});

export default expenseTypes;
