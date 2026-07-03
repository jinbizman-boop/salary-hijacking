export type BudgetRiskLevel = "SAFE" | "WATCH" | "WARNING" | "OVER";
export type BudgetHintSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
export type VariableExpenseCategory =
  | "MEAL"
  | "TRANSPORT"
  | "CAFE"
  | "GROCERIES"
  | "SHOPPING"
  | "HEALTH"
  | "CONTENT"
  | "EDUCATION"
  | "FAMILY"
  | "GIFT"
  | "TRAVEL"
  | "ETC";
export type VariableExpensePaymentMethod =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "PAY"
  | "ETC";
export type VariableExpenseSource = "MANUAL" | "RECEIPT" | "IMPORT" | "SYSTEM";
export type VariableExpenseStatus =
  | "POSTED"
  | "REFUNDED"
  | "VOIDED"
  | "DELETED";

export type DailyBudgetSnapshot = Readonly<{
  date: string;
  timezone: "Asia/Seoul";
  currency: "KRW";
  dailyLimit: number;
  spentToday: number;
  remainingToday: number;
  overspentAmount: number;
  usageRate: number;
  riskLevel: BudgetRiskLevel;
  fixedExpenseReflected: boolean;
  savingsReflected: boolean;
  variableExpenseReflected: boolean;
  serverCalculatedAt: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

export type BudgetActionHint = Readonly<{
  id: string;
  title: string;
  description: string;
  severity: BudgetHintSeverity;
  route: string | null;
  eventName: string;
  rawFinancialDataExposed: false;
}>;

export type BudgetApiResponse = Readonly<{
  data: Readonly<{
    snapshot: DailyBudgetSnapshot;
    hints: readonly BudgetActionHint[];
  }>;
  error?: never;
}>;

export type BudgetRecalculateResult = Readonly<{
  periodStartDate: string;
  periodEndDate: string;
  totalDays: number;
  createdOrUpdatedCount: number;
  skippedCount: number;
  serverAuthority: true;
}>;

export type VariableExpenseCreateRequest = Readonly<{
  amountMinor: number;
  category: VariableExpenseCategory;
  title: string;
  spentAt: string;
  paymentMethod: VariableExpensePaymentMethod;
  merchantName: string | null;
  memo: string | null;
  tags: readonly string[];
  receiptAttachmentId: string | null;
  dailyBudgetId: string | null;
  source: VariableExpenseSource;
  idempotencyKey: string | null;
}>;

export type VariableExpenseRecord = Readonly<{
  expenseId: string;
  amountMinor: number;
  category: VariableExpenseCategory;
  title: string;
  spentAt: string;
  paymentMethod: VariableExpensePaymentMethod;
  merchantName: string | null;
  memo: string | null;
  dailyBudgetId: string | null;
  source: VariableExpenseSource;
  status: VariableExpenseStatus;
  netAmountMinor: number;
  serverAuthority: true;
  financialRawDataExposed: false;
  adTargetingSeparated: true;
}>;

export type VariableExpenseCreateResult = VariableExpenseRecord;

export type VariableExpenseListRequest = Readonly<{
  page: number;
  pageSize: number;
  startDate?: string | undefined;
  endDate?: string | undefined;
  category?: VariableExpenseCategory | undefined;
  status?: VariableExpenseStatus | undefined;
  q?: string | undefined;
}>;

export type VariableExpenseListResult = Readonly<{
  items: readonly VariableExpenseRecord[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type VariableExpenseUpdateRequest = Readonly<{
  amountMinor?: number | undefined;
  category?: VariableExpenseCategory | undefined;
  title?: string | undefined;
  spentAt?: string | undefined;
  paymentMethod?: VariableExpensePaymentMethod | undefined;
  merchantName?: string | null | undefined;
  memo?: string | null | undefined;
  tags?: readonly string[] | undefined;
  receiptAttachmentId?: string | null | undefined;
  dailyBudgetId?: string | null | undefined;
}>;

export type VariableExpenseDeleteRequest = Readonly<{
  reason: string;
}>;

export type VariableExpenseDeleteResult = Readonly<{
  expenseId: string;
  status: "DELETED";
  serverAuthority: true;
  financialRawDataExposed: false;
  adTargetingSeparated: true;
}>;

export type BudgetApiClient = Readonly<{
  getToday: () => Promise<BudgetApiResponse | null>;
  recalculate: (
    request: DailyBudgetRecalculateRequest,
  ) => Promise<BudgetRecalculateResult>;
  listVariableExpenses: (
    request: VariableExpenseListRequest,
  ) => Promise<VariableExpenseListResult>;
  createVariableExpense: (
    request: VariableExpenseCreateRequest,
  ) => Promise<VariableExpenseCreateResult>;
  updateVariableExpense: (
    expenseId: string,
    request: VariableExpenseUpdateRequest,
  ) => Promise<VariableExpenseRecord>;
  deleteVariableExpense: (
    expenseId: string,
    request: VariableExpenseDeleteRequest,
  ) => Promise<VariableExpenseDeleteResult>;
  recordChecked: () => Promise<void>;
}>;

export type BudgetMetrics = Readonly<{
  remainingToday: number;
  overspentAmount: number;
  usageRate: number;
}>;

export type BudgetViewModel = Readonly<{
  snapshot: DailyBudgetSnapshot;
  riskLabel: string;
  remainingLabel: string;
  spentLabel: string;
  dailyLimitLabel: string;
  overspentLabel: string | null;
  lastSyncedLabel: string;
}>;

export type BudgetCheckedEvent = Readonly<{
  type: "DAILY_BUDGET_CHECKED";
  source: "mobile_budget_feature";
  rawFinancialDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

export type DailyBudgetRecalculateRequest = Readonly<{
  periodStartDate: string;
  periodEndDate: string;
  availableAmountMinor: number;
  alreadySpentAmountMinor: number;
  carryOverAmountMinor: number;
  overwriteExisting: boolean;
  memo: string | null;
}>;

export type BudgetLoadState =
  | Readonly<{ status: "loading"; snapshot: null; error: null }>
  | Readonly<{ status: "ready"; snapshot: DailyBudgetSnapshot; error: null }>
  | Readonly<{ status: "empty"; snapshot: null; error: null }>
  | Readonly<{ status: "stale"; snapshot: DailyBudgetSnapshot; error: string }>
  | Readonly<{ status: "error"; snapshot: null; error: string }>;

export type BudgetController = Readonly<{
  state: BudgetLoadState;
  viewModel: BudgetViewModel | null;
  hints: readonly BudgetActionHint[];
  refreshing: boolean;
  recalculating: boolean;
  refresh: () => Promise<void>;
  recalculate: (request: DailyBudgetRecalculateRequest) => Promise<void>;
  recordChecked: () => Promise<void>;
}>;
