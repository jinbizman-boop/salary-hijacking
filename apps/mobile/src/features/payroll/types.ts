export type PayrollCycle = "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "CUSTOM";
export type PayrollIncomeType = "NET" | "GROSS";
export type PayrollPlanStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "ARCHIVED"
  | "DELETED";
export type PayrollReservePolicy = "ZERO_BASE" | "CARRY_OVER" | "FIXED_BUFFER";

export type PayrollCalculation = Readonly<{
  periodStartDate: string;
  periodEndDate: string;
  dayCount: number;
  payrollAmountMinor: number;
  fixedExpenseTotalMinor: number;
  fixedSavingsTotalMinor: number;
  variableExpenseReserveMinor: number;
  emergencyBufferMinor: number;
  carryOverAmountMinor: number;
  alreadySpentAmountMinor: number;
  totalDeductionsMinor: number;
  availableBeforeSpentMinor: number;
  availableForDailyBudgetMinor: number;
  recommendedDailyBudgetMinor: number;
  remainderMinor: number;
  hijackRate: number;
  serverAuthority: true;
  financialRawDataExposed: false;
}>;

export type PayrollPlanSnapshot = Readonly<{
  planId: string;
  title: string;
  incomeType: PayrollIncomeType;
  payrollCycle: PayrollCycle;
  payrollAmountMinor: number;
  payday: number | null;
  firstPayrollDate: string;
  periodStartDate: string;
  periodEndDate: string;
  fixedExpenseTotalMinor: number;
  fixedSavingsTotalMinor: number;
  variableExpenseReserveMinor: number;
  emergencyBufferMinor: number;
  carryOverAmountMinor: number;
  reservePolicy: PayrollReservePolicy;
  memo: string | null;
  status: PayrollPlanStatus;
  calculation: PayrollCalculation;
  serverAuthority: true;
  financialRawDataExposed: false;
  adTargetingSeparated: true;
}>;

export type PayrollRecalculateRequest = Readonly<{
  planId: string | null;
  periodStartDate: string;
  periodEndDate: string;
  payrollAmountMinor: number;
  fixedExpenseTotalMinor: number;
  fixedSavingsTotalMinor: number;
  variableExpenseReserveMinor: number;
  emergencyBufferMinor: number;
  carryOverAmountMinor: number;
  alreadySpentAmountMinor: number;
  overwritePlan: boolean;
  reason: string | null;
}>;

export type PayrollPlanSaveRequest = Readonly<{
  planId: string | null;
  title: string;
  incomeType: PayrollIncomeType;
  payrollCycle: PayrollCycle;
  payrollAmountMinor: number;
  payday: number | null;
  firstPayrollDate: string;
  periodStartDate: string;
  periodEndDate: string;
  fixedExpenseTotalMinor: number;
  fixedSavingsTotalMinor: number;
  variableExpenseReserveMinor: number;
  emergencyBufferMinor: number;
  carryOverAmountMinor: number;
  reservePolicy: PayrollReservePolicy;
  memo: string | null;
}>;

export type PayrollRecalculateResult = Readonly<{
  calculation: PayrollCalculation;
  updatedPlan: PayrollPlanSnapshot | null;
  overwritePlan: boolean;
  reason: string | null;
  serverAuthority: true;
}>;

export type PayrollApiClient = Readonly<{
  getCurrent: () => Promise<PayrollPlanSnapshot | null>;
  savePlan: (request: PayrollPlanSaveRequest) => Promise<PayrollPlanSnapshot>;
  recalculate: (
    request: PayrollRecalculateRequest,
  ) => Promise<PayrollRecalculateResult>;
}>;
