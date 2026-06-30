export type BudgetRiskLevel = "SAFE" | "WATCH" | "WARNING" | "OVER";
export type BudgetHintSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

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

export type BudgetApiClient = Readonly<{
  getToday: () => Promise<BudgetApiResponse | null>;
  recalculate: (
    request: DailyBudgetRecalculateRequest,
  ) => Promise<BudgetRecalculateResult>;
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
