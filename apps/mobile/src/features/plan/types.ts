export type PlanFixedExpenseCommitment = Readonly<{
  amountMinor: number;
  category: string | null;
  dueDay: number | null;
  dueLabel: string;
  financialRawDataExposed: false;
  id: string;
  lastPaidAt: string | null;
  paidTotalMinor: number;
  serverAuthority: true;
  status: string;
  title: string;
}>;

export type PlanSavingsGoalCommitment = Readonly<{
  currentAmountMinor: number;
  financialRawAccountDataExposed: false;
  fixedSaveAmountMinor: number;
  goalType: string | null;
  id: string;
  serverAuthority: true;
  status: string;
  targetAmountMinor: number;
  title: string;
}>;

export type PlanCommitmentsSnapshot = Readonly<{
  adsFinancialTargetingUsed: false;
  fixedExpenseTotalMinor: number;
  fixedExpenses: readonly PlanFixedExpenseCommitment[];
  fixedSavingsTotalMinor: number;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  savingsGoals: readonly PlanSavingsGoalCommitment[];
  serverAuthority: true;
}>;

export type PlanFixedExpenseCreateRequest = Readonly<{
  amountMinor: number;
  category: string;
  paymentDay: number;
  title: string;
}>;

export type PlanFixedExpensePaymentRequest = Readonly<{
  amountMinor: number;
  idempotencyKey: string;
  memo?: string | null;
  paidAt?: string;
}>;

export type PlanSavingsDepositRequest = Readonly<{
  amountMinor: number;
  idempotencyKey: string;
  memo?: string | null;
  occurredAt?: string;
}>;

export type PlanSavingsGoalCreateRequest = Readonly<{
  fixedSaveAmountMinor: number;
  goalType: string;
  targetAmountMinor: number;
  title: string;
}>;

export type PlanDeleteResult = Readonly<{
  id: string;
  rawFinancialDataExposed: false;
  serverAuthority: true;
  status: "DELETED";
}>;

export type PlanCommitmentsApiClient = Readonly<{
  getCommitments: () => Promise<PlanCommitmentsSnapshot>;
  createFixedExpense: (
    request: PlanFixedExpenseCreateRequest,
  ) => Promise<PlanFixedExpenseCommitment>;
  recordFixedExpensePayment: (
    expenseId: string,
    request: PlanFixedExpensePaymentRequest,
  ) => Promise<PlanFixedExpenseCommitment>;
  recordSavingsDeposit: (
    goalId: string,
    request: PlanSavingsDepositRequest,
  ) => Promise<PlanSavingsGoalCommitment>;
  createSavingsGoal: (
    request: PlanSavingsGoalCreateRequest,
  ) => Promise<PlanSavingsGoalCommitment>;
  deleteFixedExpense: (expenseId: string) => Promise<PlanDeleteResult>;
  deleteSavingsGoal: (goalId: string) => Promise<PlanDeleteResult>;
}>;
