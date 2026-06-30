/**
 * packages/api-contract/src/payroll/payroll.schema.ts
 *
 * 급여납치 Salary Hijacking Platform · Payroll / Budget / Expense API Contract
 *
 * 파일 목적:
 * - 모바일 앱, 관리자 콘솔, API 서버, scheduler, QA/E2E가 공유하는 급여관리 API 계약을 정의한다.
 * - 급여 홈, 급여계획, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액, 계산 스냅샷, 월마감, 관리자 재계산 계약을 포함한다.
 * - 급여·예산·지출·저축·납치금액 계산은 클라이언트가 아니라 서버/API/DB가 최종 확정한다.
 * - 모든 금액은 KRW 1원 단위 정수이며 음수 입력과 소수 입력을 허용하지 않는다.
 * - 납치금액 표시값은 0원 미만으로 내려가지 않는다.
 * - 예산 초과는 remainingAmount 음수가 아니라 overAmount로 표현한다.
 * - 광고/제휴 이벤트, 로그, issue, PR, 테스트 fixture에 급여액·지출액·저축액·납치금액 원문이 섞이지 않도록 계약 레벨에서 분리한다.
 */

import { z } from "zod";
import {
  IdempotencyKeySchema,
  IsoDateTimeSchema,
  KrwIntegerAmountSchema,
  ListQuerySchema,
  RequestIdSchema,
  UuidSchema,
  createListResponseSchema,
  createMutationResponseSchema,
  createSuccessResponseSchema,
} from "../common/response.schema";

/* -----------------------------------------------------------------------------
 * 1. Contract metadata
 * -------------------------------------------------------------------------- */

export const PAYROLL_CONTRACT_VERSION = "1.0.0" as const;
export const PAYROLL_TIMEZONE = "Asia/Seoul" as const;
export const PAYROLL_CURRENCY = "KRW" as const;
export const PAYROLL_MONEY_SCALE = 0 as const;

/* -----------------------------------------------------------------------------
 * 2. Primitive schemas
 * -------------------------------------------------------------------------- */

export const LocalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Local calendar date in Asia/Seoul. Format: YYYY-MM-DD.");

export const YearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .describe("Payroll month. Format: YYYY-MM.");

export const PayDaySchema = z.number().int().min(1).max(31);

export const PayrollTitleSchema = z.string().trim().min(1).max(80);

export const PayrollMemoSchema = z
  .string()
  .trim()
  .max(500)
  .describe(
    "Safe memo. Must not include token, secret, raw PII or ad payload data.",
  );

export const PayrollColorTokenSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const PayrollRevisionSchema = z.number().int().min(0);

export const PayrollPercentageBasisPointSchema = z
  .number()
  .int()
  .min(0)
  .max(10000)
  .describe("0~10000 basis points. 10000 means 100%.");

export const PayrollSignedKrwDeltaSchema = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER)
  .describe("Signed KRW delta for calculated difference only.");

export const PayrollSafeHashSchema = z
  .string()
  .trim()
  .min(16)
  .max(256)
  .regex(/^[a-zA-Z0-9._:$/-]+$/);

/* -----------------------------------------------------------------------------
 * 3. Enum schemas
 * -------------------------------------------------------------------------- */

export const PayrollPlanStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "CLOSED",
  "REOPENED",
  "ARCHIVED",
  "DELETED",
]);

export const PayrollIncomeTypeSchema = z.enum([
  "SALARY",
  "BONUS",
  "SIDE_JOB",
  "ALLOWANCE",
  "REFUND",
  "OTHER",
]);

export const PayrollCycleSchema = z.enum([
  "MONTHLY",
  "WEEKLY",
  "BIWEEKLY",
  "CUSTOM",
]);

export const FixedExpenseCategorySchema = z.enum([
  "HOUSING",
  "LOAN",
  "INSURANCE",
  "TELECOM",
  "SUBSCRIPTION",
  "TRANSPORTATION",
  "EDUCATION",
  "UTILITY",
  "TAX",
  "FAMILY",
  "HEALTH",
  "OTHER",
]);

export const FixedExpenseStatusSchema = z.enum([
  "ACTIVE",
  "PAID",
  "SKIPPED",
  "PAUSED",
  "DELETED",
]);

export const FixedExpensePaymentMethodSchema = z.enum([
  "BANK_TRANSFER",
  "CARD",
  "AUTO_DEBIT",
  "CASH",
  "OTHER",
]);

export const FixedSavingCategorySchema = z.enum([
  "EMERGENCY_FUND",
  "INVESTMENT",
  "DEPOSIT",
  "INSTALLMENT_SAVING",
  "RETIREMENT",
  "TRAVEL",
  "SELF_DEVELOPMENT",
  "OTHER",
]);

export const FixedSavingStatusSchema = z.enum([
  "ACTIVE",
  "TRANSFERRED",
  "SKIPPED",
  "PAUSED",
  "DELETED",
]);

export const DailyBudgetStatusSchema = z.enum([
  "PLANNED",
  "ACTIVE",
  "OVER",
  "CLOSED",
  "DELETED",
]);

export const VariableExpenseCategorySchema = z.enum([
  "MEAL",
  "CAFE",
  "GROCERY",
  "TRANSPORTATION",
  "SHOPPING",
  "ENTERTAINMENT",
  "HEALTH",
  "EDUCATION",
  "GIFT",
  "TRAVEL",
  "PET",
  "FEE",
  "OTHER",
]);

export const VariableExpenseStatusSchema = z.enum([
  "ACTIVE",
  "VOIDED",
  "DELETED",
]);

export const ExpensePaymentMethodSchema = z.enum([
  "CARD",
  "CASH",
  "BANK_TRANSFER",
  "PAY",
  "POINT",
  "OTHER",
]);

export const PayrollCalculationReasonSchema = z.enum([
  "PAYROLL_CREATED",
  "PAYROLL_UPDATED",
  "INCOME_CHANGED",
  "FIXED_EXPENSE_CREATED",
  "FIXED_EXPENSE_UPDATED",
  "FIXED_EXPENSE_PAID",
  "FIXED_EXPENSE_DELETED",
  "FIXED_SAVING_CREATED",
  "FIXED_SAVING_UPDATED",
  "FIXED_SAVING_TRANSFERRED",
  "FIXED_SAVING_DELETED",
  "DAILY_BUDGET_CREATED",
  "DAILY_BUDGET_UPDATED",
  "VARIABLE_EXPENSE_CREATED",
  "VARIABLE_EXPENSE_UPDATED",
  "VARIABLE_EXPENSE_DELETED",
  "MONTHLY_CLOSE",
  "MONTHLY_REOPEN",
  "ADMIN_RECALCULATION",
  "SYSTEM_RECONCILIATION",
]);

export const PayrollSnapshotTypeSchema = z.enum([
  "DRAFT",
  "RECALCULATION",
  "DAILY_CLOSE",
  "MONTHLY_CLOSE",
  "ADMIN_AUDIT",
  "SYSTEM_RECONCILIATION",
]);

export const PayrollCloseStatusSchema = z.enum([
  "OPEN",
  "CLOSING",
  "CLOSED",
  "REOPENED",
  "LOCKED",
]);

export const PayrollAdminActionSchema = z.enum([
  "RECALCULATE",
  "REOPEN_MONTH",
  "LOCK_MONTH",
  "UNLOCK_MONTH",
  "EXPORT_AUDIT",
]);

/* -----------------------------------------------------------------------------
 * 4. Context and policy schemas
 * -------------------------------------------------------------------------- */

export const PayrollRequestContextSchema = z
  .object({
    requestId: RequestIdSchema.optional(),
    userId: UuidSchema.optional(),
    adminUserId: UuidSchema.optional(),
    payrollPlanId: UuidSchema.optional(),
    idempotencyKey: IdempotencyKeySchema.optional(),
  })
  .strict();

export const PayrollPrivacyGuardSchema = z
  .object({
    rawPiiIncluded: z.literal(false).default(false),
    rawSecretIncluded: z.literal(false).default(false),
    rawTokenIncluded: z.literal(false).default(false),
    rawFinancialSourceDataIncludedInAdsEvent: z.literal(false).default(false),
    rawFinancialSourceDataIncludedInLogs: z.literal(false).default(false),
    rawFinancialSourceDataIncludedInCommunity: z.literal(false).default(false),
  })
  .strict();

export const PayrollCalculationPolicySchema = z
  .object({
    serverAuthority: z.literal(true),
    currency: z.literal(PAYROLL_CURRENCY),
    moneyScale: z.literal(PAYROLL_MONEY_SCALE),
    negativeMoneyInputAllowed: z.literal(false).default(false),
    decimalMoneyInputAllowed: z.literal(false).default(false),
    hijackDisplayFloorZero: z.literal(true).default(true),
    dailyBudgetOverAmountEnabled: z.literal(true).default(true),
    idempotencyRequiredForVariableExpenseWrites: z.literal(true).default(true),
    timezone: z.literal(PAYROLL_TIMEZONE),
  })
  .strict();

export const PayrollCalculationMetaSchema = z
  .object({
    serverAuthority: z.literal(true),
    currency: z.literal(PAYROLL_CURRENCY),
    moneyScale: z.literal(PAYROLL_MONEY_SCALE),
    calculatedAt: IsoDateTimeSchema,
    calculationVersion: z.string().trim().min(1).max(80),
    reason: PayrollCalculationReasonSchema,
    revision: PayrollRevisionSchema,
    snapshotId: UuidSchema.optional(),
    sourceHash: PayrollSafeHashSchema.optional(),
    policy: PayrollCalculationPolicySchema.default({
      serverAuthority: true,
      currency: "KRW",
      moneyScale: 0,
      negativeMoneyInputAllowed: false,
      decimalMoneyInputAllowed: false,
      hijackDisplayFloorZero: true,
      dailyBudgetOverAmountEnabled: true,
      idempotencyRequiredForVariableExpenseWrites: true,
      timezone: "Asia/Seoul",
    }),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 5. Core entity schemas
 * -------------------------------------------------------------------------- */

export const PayrollIncomeLineSchema = z
  .object({
    id: UuidSchema,
    type: PayrollIncomeTypeSchema,
    title: PayrollTitleSchema,
    amount: KrwIntegerAmountSchema,
    expectedDate: LocalDateSchema.optional(),
    receivedDate: LocalDateSchema.optional(),
    memo: PayrollMemoSchema.optional(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const PayrollPlanSummarySchema = z
  .object({
    id: UuidSchema,
    userId: UuidSchema,
    yearMonth: YearMonthSchema,
    title: PayrollTitleSchema,
    status: PayrollPlanStatusSchema,
    closeStatus: PayrollCloseStatusSchema.default("OPEN"),
    payCycle: PayrollCycleSchema,
    payDay: PayDaySchema,
    periodStartDate: LocalDateSchema,
    periodEndDate: LocalDateSchema,
    incomeAmount: KrwIntegerAmountSchema,
    targetSavingAmount: KrwIntegerAmountSchema.default(0),
    confirmedHijackAmount: KrwIntegerAmountSchema.default(0),
    estimatedHijackAmount: KrwIntegerAmountSchema.default(0),
    remainingDailyBudgetAmount: KrwIntegerAmountSchema.default(0),
    overAmount: KrwIntegerAmountSchema.default(0),
    revision: PayrollRevisionSchema,
    calculatedAt: IsoDateTimeSchema.optional(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const PayrollPlanSchema = PayrollPlanSummarySchema.extend({
  memo: PayrollMemoSchema.optional(),
  colorToken: PayrollColorTokenSchema.optional(),
  incomeLines: z.array(PayrollIncomeLineSchema).max(50).default([]),
  privacy: PayrollPrivacyGuardSchema.default({
    rawPiiIncluded: false,
    rawSecretIncluded: false,
    rawTokenIncluded: false,
    rawFinancialSourceDataIncludedInAdsEvent: false,
    rawFinancialSourceDataIncludedInLogs: false,
    rawFinancialSourceDataIncludedInCommunity: false,
  }),
}).strict();

export const FixedExpenseSchema = z
  .object({
    id: UuidSchema,
    payrollPlanId: UuidSchema,
    userId: UuidSchema,
    title: PayrollTitleSchema,
    category: FixedExpenseCategorySchema,
    amount: KrwIntegerAmountSchema,
    dueDay: PayDaySchema.optional(),
    dueDate: LocalDateSchema.optional(),
    paidDate: LocalDateSchema.optional(),
    status: FixedExpenseStatusSchema,
    paymentMethod: FixedExpensePaymentMethodSchema.default("OTHER"),
    vendorName: z.string().trim().min(1).max(80).optional(),
    memo: PayrollMemoSchema.optional(),
    revision: PayrollRevisionSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const FixedSavingSchema = z
  .object({
    id: UuidSchema,
    payrollPlanId: UuidSchema,
    userId: UuidSchema,
    title: PayrollTitleSchema,
    category: FixedSavingCategorySchema,
    amount: KrwIntegerAmountSchema,
    transferDay: PayDaySchema.optional(),
    transferDate: LocalDateSchema.optional(),
    status: FixedSavingStatusSchema,
    institutionName: z.string().trim().min(1).max(80).optional(),
    goalId: UuidSchema.optional(),
    memo: PayrollMemoSchema.optional(),
    revision: PayrollRevisionSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const DailyBudgetSchema = z
  .object({
    id: UuidSchema,
    payrollPlanId: UuidSchema,
    userId: UuidSchema,
    budgetDate: LocalDateSchema,
    assignedAmount: KrwIntegerAmountSchema,
    usedAmount: KrwIntegerAmountSchema.default(0),
    remainingAmount: KrwIntegerAmountSchema.default(0),
    overAmount: KrwIntegerAmountSchema.default(0),
    status: DailyBudgetStatusSchema,
    memo: PayrollMemoSchema.optional(),
    revision: PayrollRevisionSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const expectedRemaining = Math.max(
      0,
      value.assignedAmount - value.usedAmount,
    );
    const expectedOver = Math.max(0, value.usedAmount - value.assignedAmount);

    if (value.remainingAmount !== expectedRemaining) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["remainingAmount"],
        message: "remainingAmount must be max(0, assignedAmount - usedAmount).",
      });
    }

    if (value.overAmount !== expectedOver) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["overAmount"],
        message: "overAmount must be max(0, usedAmount - assignedAmount).",
      });
    }
  });

export const VariableExpenseSchema = z
  .object({
    id: UuidSchema,
    payrollPlanId: UuidSchema,
    dailyBudgetId: UuidSchema.optional(),
    userId: UuidSchema,
    expenseDate: LocalDateSchema,
    title: PayrollTitleSchema,
    category: VariableExpenseCategorySchema,
    amount: KrwIntegerAmountSchema,
    paymentMethod: ExpensePaymentMethodSchema.default("OTHER"),
    status: VariableExpenseStatusSchema,
    merchantName: z.string().trim().min(1).max(80).optional(),
    memo: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema.optional(),
    revision: PayrollRevisionSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const PayrollMonthlyCloseSchema = z
  .object({
    id: UuidSchema,
    payrollPlanId: UuidSchema,
    yearMonth: YearMonthSchema,
    status: PayrollCloseStatusSchema,
    closedAt: IsoDateTimeSchema.optional(),
    reopenedAt: IsoDateTimeSchema.optional(),
    lockedAt: IsoDateTimeSchema.optional(),
    revision: PayrollRevisionSchema,
    auditLogId: UuidSchema.optional(),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 6. Calculation schemas
 * -------------------------------------------------------------------------- */

export const PayrollCalculationInputSchema = z
  .object({
    payrollPlanId: UuidSchema,
    userId: UuidSchema,
    yearMonth: YearMonthSchema,
    incomeAmount: KrwIntegerAmountSchema,
    additionalIncomeAmount: KrwIntegerAmountSchema.default(0),
    fixedExpenseAmount: KrwIntegerAmountSchema.default(0),
    fixedSavingAmount: KrwIntegerAmountSchema.default(0),
    dailyBudgetAssignedAmount: KrwIntegerAmountSchema.default(0),
    variableExpenseAmount: KrwIntegerAmountSchema.default(0),
    targetSavingAmount: KrwIntegerAmountSchema.default(0),
    reason: PayrollCalculationReasonSchema,
    requestId: RequestIdSchema.optional(),
  })
  .strict();

export const PayrollCalculationResultSchema = z
  .object({
    payrollPlanId: UuidSchema,
    userId: UuidSchema,
    yearMonth: YearMonthSchema,
    totalIncomeAmount: KrwIntegerAmountSchema,
    totalFixedExpenseAmount: KrwIntegerAmountSchema,
    totalFixedSavingAmount: KrwIntegerAmountSchema,
    totalDailyBudgetAssignedAmount: KrwIntegerAmountSchema,
    totalVariableExpenseAmount: KrwIntegerAmountSchema,
    remainingDailyBudgetAmount: KrwIntegerAmountSchema,
    overAmount: KrwIntegerAmountSchema,
    estimatedHijackAmount: KrwIntegerAmountSchema,
    confirmedHijackAmount: KrwIntegerAmountSchema,
    availableAfterFixedAmount: KrwIntegerAmountSchema,
    availableAfterBudgetAmount: KrwIntegerAmountSchema,
    targetAchievementRateBasisPoints: PayrollPercentageBasisPointSchema,
    deltaFromPreviousSnapshotAmount: PayrollSignedKrwDeltaSchema.default(0),
    meta: PayrollCalculationMetaSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.estimatedHijackAmount < 0 || value.confirmedHijackAmount < 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimatedHijackAmount"],
        message: "Hijack amount display must never be below 0.",
      });
    }

    if (value.remainingDailyBudgetAmount > 0 && value.overAmount > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["overAmount"],
        message:
          "remainingDailyBudgetAmount and overAmount cannot both be positive.",
      });
    }
  });

export const PayrollCalculationSnapshotSchema = z
  .object({
    id: UuidSchema,
    payrollPlanId: UuidSchema,
    userId: UuidSchema,
    type: PayrollSnapshotTypeSchema,
    reason: PayrollCalculationReasonSchema,
    result: PayrollCalculationResultSchema,
    sourceHash: PayrollSafeHashSchema,
    revision: PayrollRevisionSchema,
    createdAt: IsoDateTimeSchema,
    createdByUserId: UuidSchema.optional(),
    createdByAdminId: UuidSchema.optional(),
  })
  .strict();

export const PayrollHomeSchema = z
  .object({
    activePlan: PayrollPlanSummarySchema.nullable(),
    calculation: PayrollCalculationResultSchema.nullable(),
    todayBudget: DailyBudgetSchema.nullable(),
    upcomingFixedExpenses: z.array(FixedExpenseSchema).max(20).default([]),
    upcomingFixedSavings: z.array(FixedSavingSchema).max(20).default([]),
    recentVariableExpenses: z.array(VariableExpenseSchema).max(30).default([]),
    unreadNotificationCount: z.number().int().min(0).default(0),
    serverTime: IsoDateTimeSchema,
  })
  .strict();

export const PayrollMonthlyReportSchema = z
  .object({
    payrollPlan: PayrollPlanSummarySchema,
    calculation: PayrollCalculationResultSchema,
    fixedExpenses: z.array(FixedExpenseSchema),
    fixedSavings: z.array(FixedSavingSchema),
    dailyBudgets: z.array(DailyBudgetSchema),
    variableExpenses: z.array(VariableExpenseSchema),
    snapshots: z.array(PayrollCalculationSnapshotSchema),
    close: PayrollMonthlyCloseSchema.optional(),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 7. Request schemas
 * -------------------------------------------------------------------------- */

export const GetPayrollHomeRequestSchema = z
  .object({
    yearMonth: YearMonthSchema.optional(),
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const ListPayrollPlansRequestSchema = ListQuerySchema.extend({
  status: PayrollPlanStatusSchema.optional(),
  yearMonth: YearMonthSchema.optional(),
  context: PayrollRequestContextSchema.optional(),
}).strict();

export const GetPayrollPlanRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    includeLines: z.boolean().default(true),
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const CreatePayrollPlanRequestSchema = z
  .object({
    yearMonth: YearMonthSchema,
    title: PayrollTitleSchema,
    payCycle: PayrollCycleSchema.default("MONTHLY"),
    payDay: PayDaySchema,
    periodStartDate: LocalDateSchema,
    periodEndDate: LocalDateSchema,
    incomeAmount: KrwIntegerAmountSchema,
    targetSavingAmount: KrwIntegerAmountSchema.default(0),
    memo: PayrollMemoSchema.optional(),
    colorToken: PayrollColorTokenSchema.optional(),
    incomeLines: z
      .array(
        z
          .object({
            type: PayrollIncomeTypeSchema,
            title: PayrollTitleSchema,
            amount: KrwIntegerAmountSchema,
            expectedDate: LocalDateSchema.optional(),
            memo: PayrollMemoSchema.optional(),
          })
          .strict(),
      )
      .max(50)
      .default([]),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const UpdatePayrollPlanRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    title: PayrollTitleSchema.optional(),
    payCycle: PayrollCycleSchema.optional(),
    payDay: PayDaySchema.optional(),
    periodStartDate: LocalDateSchema.optional(),
    periodEndDate: LocalDateSchema.optional(),
    incomeAmount: KrwIntegerAmountSchema.optional(),
    targetSavingAmount: KrwIntegerAmountSchema.optional(),
    memo: PayrollMemoSchema.optional(),
    colorToken: PayrollColorTokenSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasPatch =
      value.title !== undefined ||
      value.payCycle !== undefined ||
      value.payDay !== undefined ||
      value.periodStartDate !== undefined ||
      value.periodEndDate !== undefined ||
      value.incomeAmount !== undefined ||
      value.targetSavingAmount !== undefined ||
      value.memo !== undefined ||
      value.colorToken !== undefined;

    if (!hasPatch) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payrollPlanId"],
        message: "At least one payroll plan update field is required.",
      });
    }
  });

export const DeletePayrollPlanRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    reason: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const CreateFixedExpenseRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    title: PayrollTitleSchema,
    category: FixedExpenseCategorySchema,
    amount: KrwIntegerAmountSchema,
    dueDay: PayDaySchema.optional(),
    dueDate: LocalDateSchema.optional(),
    paymentMethod: FixedExpensePaymentMethodSchema.default("OTHER"),
    vendorName: z.string().trim().min(1).max(80).optional(),
    memo: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const UpdateFixedExpenseRequestSchema = z
  .object({
    fixedExpenseId: UuidSchema,
    title: PayrollTitleSchema.optional(),
    category: FixedExpenseCategorySchema.optional(),
    amount: KrwIntegerAmountSchema.optional(),
    dueDay: PayDaySchema.optional(),
    dueDate: LocalDateSchema.optional(),
    paymentMethod: FixedExpensePaymentMethodSchema.optional(),
    vendorName: z.string().trim().min(1).max(80).optional(),
    memo: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const MarkFixedExpensePaidRequestSchema = z
  .object({
    fixedExpenseId: UuidSchema,
    paidDate: LocalDateSchema,
    paymentMethod: FixedExpensePaymentMethodSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const DeleteFixedExpenseRequestSchema = z
  .object({
    fixedExpenseId: UuidSchema,
    reason: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const CreateFixedSavingRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    title: PayrollTitleSchema,
    category: FixedSavingCategorySchema,
    amount: KrwIntegerAmountSchema,
    transferDay: PayDaySchema.optional(),
    transferDate: LocalDateSchema.optional(),
    institutionName: z.string().trim().min(1).max(80).optional(),
    goalId: UuidSchema.optional(),
    memo: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const UpdateFixedSavingRequestSchema = z
  .object({
    fixedSavingId: UuidSchema,
    title: PayrollTitleSchema.optional(),
    category: FixedSavingCategorySchema.optional(),
    amount: KrwIntegerAmountSchema.optional(),
    transferDay: PayDaySchema.optional(),
    transferDate: LocalDateSchema.optional(),
    institutionName: z.string().trim().min(1).max(80).optional(),
    goalId: UuidSchema.optional(),
    memo: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const MarkFixedSavingTransferredRequestSchema = z
  .object({
    fixedSavingId: UuidSchema,
    transferDate: LocalDateSchema,
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const DeleteFixedSavingRequestSchema = z
  .object({
    fixedSavingId: UuidSchema,
    reason: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const CreateDailyBudgetRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    budgetDate: LocalDateSchema,
    assignedAmount: KrwIntegerAmountSchema,
    memo: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const UpdateDailyBudgetRequestSchema = z
  .object({
    dailyBudgetId: UuidSchema,
    assignedAmount: KrwIntegerAmountSchema.optional(),
    memo: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const ListDailyBudgetsRequestSchema = ListQuerySchema.extend({
  payrollPlanId: UuidSchema,
  from: LocalDateSchema.optional(),
  to: LocalDateSchema.optional(),
  status: DailyBudgetStatusSchema.optional(),
  context: PayrollRequestContextSchema.optional(),
}).strict();

export const CreateVariableExpenseRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    dailyBudgetId: UuidSchema.optional(),
    expenseDate: LocalDateSchema,
    title: PayrollTitleSchema,
    category: VariableExpenseCategorySchema,
    amount: KrwIntegerAmountSchema,
    paymentMethod: ExpensePaymentMethodSchema.default("OTHER"),
    merchantName: z.string().trim().min(1).max(80).optional(),
    memo: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const UpdateVariableExpenseRequestSchema = z
  .object({
    variableExpenseId: UuidSchema,
    dailyBudgetId: UuidSchema.optional(),
    expenseDate: LocalDateSchema.optional(),
    title: PayrollTitleSchema.optional(),
    category: VariableExpenseCategorySchema.optional(),
    amount: KrwIntegerAmountSchema.optional(),
    paymentMethod: ExpensePaymentMethodSchema.optional(),
    merchantName: z.string().trim().min(1).max(80).optional(),
    memo: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const DeleteVariableExpenseRequestSchema = z
  .object({
    variableExpenseId: UuidSchema,
    reason: PayrollMemoSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const ListVariableExpensesRequestSchema = ListQuerySchema.extend({
  payrollPlanId: UuidSchema,
  dailyBudgetId: UuidSchema.optional(),
  from: LocalDateSchema.optional(),
  to: LocalDateSchema.optional(),
  category: VariableExpenseCategorySchema.optional(),
  status: VariableExpenseStatusSchema.optional(),
  context: PayrollRequestContextSchema.optional(),
}).strict();

export const RecalculatePayrollRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    reason: PayrollCalculationReasonSchema.default("SYSTEM_RECONCILIATION"),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const ClosePayrollMonthRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    yearMonth: YearMonthSchema,
    confirm: z.literal(true),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const ReopenPayrollMonthRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    yearMonth: YearMonthSchema,
    reason: z.string().trim().min(1).max(1000),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const GetPayrollMonthlyReportRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    yearMonth: YearMonthSchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

export const PayrollAdminActionRequestSchema = z
  .object({
    payrollPlanId: UuidSchema,
    action: PayrollAdminActionSchema,
    reason: z.string().trim().min(1).max(1000),
    idempotencyKey: IdempotencyKeySchema,
    context: PayrollRequestContextSchema.optional(),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 8. Result schemas
 * -------------------------------------------------------------------------- */

export const PayrollDeleteResultSchema = z
  .object({
    id: UuidSchema,
    deleted: z.literal(true),
    deletedAt: IsoDateTimeSchema,
  })
  .strict();

export const PayrollMonthCloseResultSchema = z
  .object({
    close: PayrollMonthlyCloseSchema,
    calculation: PayrollCalculationResultSchema,
    snapshot: PayrollCalculationSnapshotSchema,
  })
  .strict();

export const PayrollAdminActionResultSchema = z
  .object({
    payrollPlanId: UuidSchema,
    action: PayrollAdminActionSchema,
    accepted: z.boolean(),
    auditLogId: UuidSchema,
    calculation: PayrollCalculationResultSchema.optional(),
    processedAt: IsoDateTimeSchema,
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 9. Response schemas
 * -------------------------------------------------------------------------- */

export const GetPayrollHomeResponseSchema =
  createSuccessResponseSchema(PayrollHomeSchema);

export const ListPayrollPlansResponseSchema = createListResponseSchema(
  PayrollPlanSummarySchema,
);

export const GetPayrollPlanResponseSchema =
  createSuccessResponseSchema(PayrollPlanSchema);

export const CreatePayrollPlanResponseSchema =
  createMutationResponseSchema(PayrollPlanSchema);

export const UpdatePayrollPlanResponseSchema =
  createMutationResponseSchema(PayrollPlanSchema);

export const DeletePayrollPlanResponseSchema = createMutationResponseSchema(
  PayrollDeleteResultSchema,
);

export const CreateFixedExpenseResponseSchema =
  createMutationResponseSchema(FixedExpenseSchema);

export const UpdateFixedExpenseResponseSchema =
  createMutationResponseSchema(FixedExpenseSchema);

export const MarkFixedExpensePaidResponseSchema =
  createMutationResponseSchema(FixedExpenseSchema);

export const DeleteFixedExpenseResponseSchema = createMutationResponseSchema(
  PayrollDeleteResultSchema,
);

export const CreateFixedSavingResponseSchema =
  createMutationResponseSchema(FixedSavingSchema);

export const UpdateFixedSavingResponseSchema =
  createMutationResponseSchema(FixedSavingSchema);

export const MarkFixedSavingTransferredResponseSchema =
  createMutationResponseSchema(FixedSavingSchema);

export const DeleteFixedSavingResponseSchema = createMutationResponseSchema(
  PayrollDeleteResultSchema,
);

export const CreateDailyBudgetResponseSchema =
  createMutationResponseSchema(DailyBudgetSchema);

export const UpdateDailyBudgetResponseSchema =
  createMutationResponseSchema(DailyBudgetSchema);

export const ListDailyBudgetsResponseSchema =
  createListResponseSchema(DailyBudgetSchema);

export const CreateVariableExpenseResponseSchema = createMutationResponseSchema(
  VariableExpenseSchema,
);

export const UpdateVariableExpenseResponseSchema = createMutationResponseSchema(
  VariableExpenseSchema,
);

export const DeleteVariableExpenseResponseSchema = createMutationResponseSchema(
  PayrollDeleteResultSchema,
);

export const ListVariableExpensesResponseSchema = createListResponseSchema(
  VariableExpenseSchema,
);

export const RecalculatePayrollResponseSchema = createMutationResponseSchema(
  PayrollCalculationResultSchema,
);

export const ClosePayrollMonthResponseSchema = createMutationResponseSchema(
  PayrollMonthCloseResultSchema,
);

export const ReopenPayrollMonthResponseSchema = createMutationResponseSchema(
  PayrollMonthCloseResultSchema,
);

export const GetPayrollMonthlyReportResponseSchema =
  createSuccessResponseSchema(PayrollMonthlyReportSchema);

export const PayrollAdminActionResponseSchema = createMutationResponseSchema(
  PayrollAdminActionResultSchema,
);

/* -----------------------------------------------------------------------------
 * 10. API paths and endpoint contract
 * -------------------------------------------------------------------------- */

export const PAYROLL_API_PATHS = Object.freeze({
  getHome: "/payroll/home",
  listPlans: "/payroll/plans",
  getPlan: "/payroll/plans/:payrollPlanId",
  createPlan: "/payroll/plans",
  updatePlan: "/payroll/plans/:payrollPlanId",
  deletePlan: "/payroll/plans/:payrollPlanId",
  createFixedExpense: "/payroll/fixed-expenses",
  updateFixedExpense: "/payroll/fixed-expenses/:fixedExpenseId",
  markFixedExpensePaid: "/payroll/fixed-expenses/:fixedExpenseId/pay",
  deleteFixedExpense: "/payroll/fixed-expenses/:fixedExpenseId",
  createFixedSaving: "/payroll/fixed-savings",
  updateFixedSaving: "/payroll/fixed-savings/:fixedSavingId",
  markFixedSavingTransferred: "/payroll/fixed-savings/:fixedSavingId/transfer",
  deleteFixedSaving: "/payroll/fixed-savings/:fixedSavingId",
  createDailyBudget: "/payroll/daily-budgets",
  updateDailyBudget: "/payroll/daily-budgets/:dailyBudgetId",
  listDailyBudgets: "/payroll/daily-budgets",
  createVariableExpense: "/payroll/variable-expenses",
  updateVariableExpense: "/payroll/variable-expenses/:variableExpenseId",
  deleteVariableExpense: "/payroll/variable-expenses/:variableExpenseId",
  listVariableExpenses: "/payroll/variable-expenses",
  recalculate: "/payroll/plans/:payrollPlanId/recalculate",
  closeMonth: "/payroll/plans/:payrollPlanId/close",
  reopenMonth: "/payroll/plans/:payrollPlanId/reopen",
  monthlyReport: "/payroll/plans/:payrollPlanId/report",
  adminAction: "/admin/payroll/action",
} as const);

export const PayrollEndpointContract = Object.freeze({
  getHome: {
    method: "GET",
    path: PAYROLL_API_PATHS.getHome,
    request: GetPayrollHomeRequestSchema,
    response: GetPayrollHomeResponseSchema,
  },
  listPlans: {
    method: "GET",
    path: PAYROLL_API_PATHS.listPlans,
    request: ListPayrollPlansRequestSchema,
    response: ListPayrollPlansResponseSchema,
  },
  getPlan: {
    method: "GET",
    path: PAYROLL_API_PATHS.getPlan,
    request: GetPayrollPlanRequestSchema,
    response: GetPayrollPlanResponseSchema,
  },
  createPlan: {
    method: "POST",
    path: PAYROLL_API_PATHS.createPlan,
    request: CreatePayrollPlanRequestSchema,
    response: CreatePayrollPlanResponseSchema,
  },
  updatePlan: {
    method: "PATCH",
    path: PAYROLL_API_PATHS.updatePlan,
    request: UpdatePayrollPlanRequestSchema,
    response: UpdatePayrollPlanResponseSchema,
  },
  deletePlan: {
    method: "DELETE",
    path: PAYROLL_API_PATHS.deletePlan,
    request: DeletePayrollPlanRequestSchema,
    response: DeletePayrollPlanResponseSchema,
  },
  createFixedExpense: {
    method: "POST",
    path: PAYROLL_API_PATHS.createFixedExpense,
    request: CreateFixedExpenseRequestSchema,
    response: CreateFixedExpenseResponseSchema,
  },
  updateFixedExpense: {
    method: "PATCH",
    path: PAYROLL_API_PATHS.updateFixedExpense,
    request: UpdateFixedExpenseRequestSchema,
    response: UpdateFixedExpenseResponseSchema,
  },
  markFixedExpensePaid: {
    method: "POST",
    path: PAYROLL_API_PATHS.markFixedExpensePaid,
    request: MarkFixedExpensePaidRequestSchema,
    response: MarkFixedExpensePaidResponseSchema,
  },
  deleteFixedExpense: {
    method: "DELETE",
    path: PAYROLL_API_PATHS.deleteFixedExpense,
    request: DeleteFixedExpenseRequestSchema,
    response: DeleteFixedExpenseResponseSchema,
  },
  createFixedSaving: {
    method: "POST",
    path: PAYROLL_API_PATHS.createFixedSaving,
    request: CreateFixedSavingRequestSchema,
    response: CreateFixedSavingResponseSchema,
  },
  updateFixedSaving: {
    method: "PATCH",
    path: PAYROLL_API_PATHS.updateFixedSaving,
    request: UpdateFixedSavingRequestSchema,
    response: UpdateFixedSavingResponseSchema,
  },
  markFixedSavingTransferred: {
    method: "POST",
    path: PAYROLL_API_PATHS.markFixedSavingTransferred,
    request: MarkFixedSavingTransferredRequestSchema,
    response: MarkFixedSavingTransferredResponseSchema,
  },
  deleteFixedSaving: {
    method: "DELETE",
    path: PAYROLL_API_PATHS.deleteFixedSaving,
    request: DeleteFixedSavingRequestSchema,
    response: DeleteFixedSavingResponseSchema,
  },
  createDailyBudget: {
    method: "POST",
    path: PAYROLL_API_PATHS.createDailyBudget,
    request: CreateDailyBudgetRequestSchema,
    response: CreateDailyBudgetResponseSchema,
  },
  updateDailyBudget: {
    method: "PATCH",
    path: PAYROLL_API_PATHS.updateDailyBudget,
    request: UpdateDailyBudgetRequestSchema,
    response: UpdateDailyBudgetResponseSchema,
  },
  listDailyBudgets: {
    method: "GET",
    path: PAYROLL_API_PATHS.listDailyBudgets,
    request: ListDailyBudgetsRequestSchema,
    response: ListDailyBudgetsResponseSchema,
  },
  createVariableExpense: {
    method: "POST",
    path: PAYROLL_API_PATHS.createVariableExpense,
    request: CreateVariableExpenseRequestSchema,
    response: CreateVariableExpenseResponseSchema,
  },
  updateVariableExpense: {
    method: "PATCH",
    path: PAYROLL_API_PATHS.updateVariableExpense,
    request: UpdateVariableExpenseRequestSchema,
    response: UpdateVariableExpenseResponseSchema,
  },
  deleteVariableExpense: {
    method: "DELETE",
    path: PAYROLL_API_PATHS.deleteVariableExpense,
    request: DeleteVariableExpenseRequestSchema,
    response: DeleteVariableExpenseResponseSchema,
  },
  listVariableExpenses: {
    method: "GET",
    path: PAYROLL_API_PATHS.listVariableExpenses,
    request: ListVariableExpensesRequestSchema,
    response: ListVariableExpensesResponseSchema,
  },
  recalculate: {
    method: "POST",
    path: PAYROLL_API_PATHS.recalculate,
    request: RecalculatePayrollRequestSchema,
    response: RecalculatePayrollResponseSchema,
  },
  closeMonth: {
    method: "POST",
    path: PAYROLL_API_PATHS.closeMonth,
    request: ClosePayrollMonthRequestSchema,
    response: ClosePayrollMonthResponseSchema,
  },
  reopenMonth: {
    method: "POST",
    path: PAYROLL_API_PATHS.reopenMonth,
    request: ReopenPayrollMonthRequestSchema,
    response: ReopenPayrollMonthResponseSchema,
  },
  monthlyReport: {
    method: "GET",
    path: PAYROLL_API_PATHS.monthlyReport,
    request: GetPayrollMonthlyReportRequestSchema,
    response: GetPayrollMonthlyReportResponseSchema,
  },
  adminAction: {
    method: "POST",
    path: PAYROLL_API_PATHS.adminAction,
    request: PayrollAdminActionRequestSchema,
    response: PayrollAdminActionResponseSchema,
  },
} as const);

/* -----------------------------------------------------------------------------
 * 11. Public schema registry
 * -------------------------------------------------------------------------- */

export type PayrollSchemaGroup = Readonly<Record<string, z.ZodTypeAny>>;

export type PayrollSchemaRegistry = Readonly<{
  enums: PayrollSchemaGroup;
  primitives: PayrollSchemaGroup;
  policy: PayrollSchemaGroup;
  entity: PayrollSchemaGroup;
  request: PayrollSchemaGroup;
  result: PayrollSchemaGroup;
  response: PayrollSchemaGroup;
}>;

export const PayrollSchemas: PayrollSchemaRegistry = Object.freeze({
  enums: {
    PayrollPlanStatusSchema,
    PayrollIncomeTypeSchema,
    PayrollCycleSchema,
    FixedExpenseCategorySchema,
    FixedExpenseStatusSchema,
    FixedExpensePaymentMethodSchema,
    FixedSavingCategorySchema,
    FixedSavingStatusSchema,
    DailyBudgetStatusSchema,
    VariableExpenseCategorySchema,
    VariableExpenseStatusSchema,
    ExpensePaymentMethodSchema,
    PayrollCalculationReasonSchema,
    PayrollSnapshotTypeSchema,
    PayrollCloseStatusSchema,
    PayrollAdminActionSchema,
  },
  primitives: {
    LocalDateSchema,
    YearMonthSchema,
    PayDaySchema,
    PayrollTitleSchema,
    PayrollMemoSchema,
    PayrollColorTokenSchema,
    PayrollRevisionSchema,
    PayrollPercentageBasisPointSchema,
    PayrollSignedKrwDeltaSchema,
    PayrollSafeHashSchema,
  },
  policy: {
    PayrollRequestContextSchema,
    PayrollPrivacyGuardSchema,
    PayrollCalculationPolicySchema,
    PayrollCalculationMetaSchema,
  },
  entity: {
    PayrollIncomeLineSchema,
    PayrollPlanSummarySchema,
    PayrollPlanSchema,
    FixedExpenseSchema,
    FixedSavingSchema,
    DailyBudgetSchema,
    VariableExpenseSchema,
    PayrollMonthlyCloseSchema,
    PayrollCalculationInputSchema,
    PayrollCalculationResultSchema,
    PayrollCalculationSnapshotSchema,
    PayrollHomeSchema,
    PayrollMonthlyReportSchema,
  },
  request: {
    GetPayrollHomeRequestSchema,
    ListPayrollPlansRequestSchema,
    GetPayrollPlanRequestSchema,
    CreatePayrollPlanRequestSchema,
    UpdatePayrollPlanRequestSchema,
    DeletePayrollPlanRequestSchema,
    CreateFixedExpenseRequestSchema,
    UpdateFixedExpenseRequestSchema,
    MarkFixedExpensePaidRequestSchema,
    DeleteFixedExpenseRequestSchema,
    CreateFixedSavingRequestSchema,
    UpdateFixedSavingRequestSchema,
    MarkFixedSavingTransferredRequestSchema,
    DeleteFixedSavingRequestSchema,
    CreateDailyBudgetRequestSchema,
    UpdateDailyBudgetRequestSchema,
    ListDailyBudgetsRequestSchema,
    CreateVariableExpenseRequestSchema,
    UpdateVariableExpenseRequestSchema,
    DeleteVariableExpenseRequestSchema,
    ListVariableExpensesRequestSchema,
    RecalculatePayrollRequestSchema,
    ClosePayrollMonthRequestSchema,
    ReopenPayrollMonthRequestSchema,
    GetPayrollMonthlyReportRequestSchema,
    PayrollAdminActionRequestSchema,
  },
  result: {
    PayrollDeleteResultSchema,
    PayrollMonthCloseResultSchema,
    PayrollAdminActionResultSchema,
  },
  response: {
    GetPayrollHomeResponseSchema,
    ListPayrollPlansResponseSchema,
    GetPayrollPlanResponseSchema,
    CreatePayrollPlanResponseSchema,
    UpdatePayrollPlanResponseSchema,
    DeletePayrollPlanResponseSchema,
    CreateFixedExpenseResponseSchema,
    UpdateFixedExpenseResponseSchema,
    MarkFixedExpensePaidResponseSchema,
    DeleteFixedExpenseResponseSchema,
    CreateFixedSavingResponseSchema,
    UpdateFixedSavingResponseSchema,
    MarkFixedSavingTransferredResponseSchema,
    DeleteFixedSavingResponseSchema,
    CreateDailyBudgetResponseSchema,
    UpdateDailyBudgetResponseSchema,
    ListDailyBudgetsResponseSchema,
    CreateVariableExpenseResponseSchema,
    UpdateVariableExpenseResponseSchema,
    DeleteVariableExpenseResponseSchema,
    ListVariableExpensesResponseSchema,
    RecalculatePayrollResponseSchema,
    ClosePayrollMonthResponseSchema,
    ReopenPayrollMonthResponseSchema,
    GetPayrollMonthlyReportResponseSchema,
    PayrollAdminActionResponseSchema,
  },
});

/* -----------------------------------------------------------------------------
 * 12. Parse helpers
 * -------------------------------------------------------------------------- */

export const parsePayrollPlan = (input: unknown): PayrollPlan =>
  PayrollPlanSchema.parse(input);

export const safeParsePayrollPlan = (
  input: unknown,
): ReturnType<typeof PayrollPlanSchema.safeParse> =>
  PayrollPlanSchema.safeParse(input);

export const parsePayrollCalculationResult = (
  input: unknown,
): PayrollCalculationResult => PayrollCalculationResultSchema.parse(input);

export const safeParsePayrollCalculationResult = (
  input: unknown,
): ReturnType<typeof PayrollCalculationResultSchema.safeParse> =>
  PayrollCalculationResultSchema.safeParse(input);

export const parseDailyBudget = (input: unknown): DailyBudget =>
  DailyBudgetSchema.parse(input);

export const safeParseDailyBudget = (
  input: unknown,
): ReturnType<typeof DailyBudgetSchema.safeParse> =>
  DailyBudgetSchema.safeParse(input);

export const parseVariableExpense = (input: unknown): VariableExpense =>
  VariableExpenseSchema.parse(input);

export const safeParseVariableExpense = (
  input: unknown,
): ReturnType<typeof VariableExpenseSchema.safeParse> =>
  VariableExpenseSchema.safeParse(input);

export type PayrollContractSafeParseResult<TSchema extends z.ZodTypeAny> =
  z.SafeParseReturnType<z.input<TSchema>, z.output<TSchema>>;

export const safeParsePayrollContractInput = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): PayrollContractSafeParseResult<TSchema> =>
  schema.safeParse(input) as PayrollContractSafeParseResult<TSchema>;

/* -----------------------------------------------------------------------------
 * 13. Type exports
 * -------------------------------------------------------------------------- */

export type PayrollPlanStatus = z.infer<typeof PayrollPlanStatusSchema>;
export type PayrollIncomeType = z.infer<typeof PayrollIncomeTypeSchema>;
export type PayrollCycle = z.infer<typeof PayrollCycleSchema>;
export type FixedExpenseCategory = z.infer<typeof FixedExpenseCategorySchema>;
export type FixedExpenseStatus = z.infer<typeof FixedExpenseStatusSchema>;
export type FixedExpensePaymentMethod = z.infer<
  typeof FixedExpensePaymentMethodSchema
>;
export type FixedSavingCategory = z.infer<typeof FixedSavingCategorySchema>;
export type FixedSavingStatus = z.infer<typeof FixedSavingStatusSchema>;
export type DailyBudgetStatus = z.infer<typeof DailyBudgetStatusSchema>;
export type VariableExpenseCategory = z.infer<
  typeof VariableExpenseCategorySchema
>;
export type VariableExpenseStatus = z.infer<typeof VariableExpenseStatusSchema>;
export type ExpensePaymentMethod = z.infer<typeof ExpensePaymentMethodSchema>;
export type PayrollCalculationReason = z.infer<
  typeof PayrollCalculationReasonSchema
>;
export type PayrollSnapshotType = z.infer<typeof PayrollSnapshotTypeSchema>;
export type PayrollCloseStatus = z.infer<typeof PayrollCloseStatusSchema>;
export type PayrollAdminAction = z.infer<typeof PayrollAdminActionSchema>;

export type PayrollRequestContext = z.infer<typeof PayrollRequestContextSchema>;
export type PayrollPrivacyGuard = z.infer<typeof PayrollPrivacyGuardSchema>;
export type PayrollCalculationPolicy = z.infer<
  typeof PayrollCalculationPolicySchema
>;
export type PayrollCalculationMeta = z.infer<
  typeof PayrollCalculationMetaSchema
>;

export type PayrollIncomeLine = z.infer<typeof PayrollIncomeLineSchema>;
export type PayrollPlanSummary = z.infer<typeof PayrollPlanSummarySchema>;
export type PayrollPlan = z.infer<typeof PayrollPlanSchema>;
export type FixedExpense = z.infer<typeof FixedExpenseSchema>;
export type FixedSaving = z.infer<typeof FixedSavingSchema>;
export type DailyBudget = z.infer<typeof DailyBudgetSchema>;
export type VariableExpense = z.infer<typeof VariableExpenseSchema>;
export type PayrollMonthlyClose = z.infer<typeof PayrollMonthlyCloseSchema>;
export type PayrollCalculationInput = z.infer<
  typeof PayrollCalculationInputSchema
>;
export type PayrollCalculationResult = z.infer<
  typeof PayrollCalculationResultSchema
>;
export type PayrollCalculationSnapshot = z.infer<
  typeof PayrollCalculationSnapshotSchema
>;
export type PayrollHome = z.infer<typeof PayrollHomeSchema>;
export type PayrollMonthlyReport = z.infer<typeof PayrollMonthlyReportSchema>;

export type GetPayrollHomeRequest = z.infer<typeof GetPayrollHomeRequestSchema>;
export type ListPayrollPlansRequest = z.infer<
  typeof ListPayrollPlansRequestSchema
>;
export type GetPayrollPlanRequest = z.infer<typeof GetPayrollPlanRequestSchema>;
export type CreatePayrollPlanRequest = z.infer<
  typeof CreatePayrollPlanRequestSchema
>;
export type UpdatePayrollPlanRequest = z.infer<
  typeof UpdatePayrollPlanRequestSchema
>;
export type DeletePayrollPlanRequest = z.infer<
  typeof DeletePayrollPlanRequestSchema
>;
export type CreateFixedExpenseRequest = z.infer<
  typeof CreateFixedExpenseRequestSchema
>;
export type UpdateFixedExpenseRequest = z.infer<
  typeof UpdateFixedExpenseRequestSchema
>;
export type MarkFixedExpensePaidRequest = z.infer<
  typeof MarkFixedExpensePaidRequestSchema
>;
export type DeleteFixedExpenseRequest = z.infer<
  typeof DeleteFixedExpenseRequestSchema
>;
export type CreateFixedSavingRequest = z.infer<
  typeof CreateFixedSavingRequestSchema
>;
export type UpdateFixedSavingRequest = z.infer<
  typeof UpdateFixedSavingRequestSchema
>;
export type MarkFixedSavingTransferredRequest = z.infer<
  typeof MarkFixedSavingTransferredRequestSchema
>;
export type DeleteFixedSavingRequest = z.infer<
  typeof DeleteFixedSavingRequestSchema
>;
export type CreateDailyBudgetRequest = z.infer<
  typeof CreateDailyBudgetRequestSchema
>;
export type UpdateDailyBudgetRequest = z.infer<
  typeof UpdateDailyBudgetRequestSchema
>;
export type ListDailyBudgetsRequest = z.infer<
  typeof ListDailyBudgetsRequestSchema
>;
export type CreateVariableExpenseRequest = z.infer<
  typeof CreateVariableExpenseRequestSchema
>;
export type UpdateVariableExpenseRequest = z.infer<
  typeof UpdateVariableExpenseRequestSchema
>;
export type DeleteVariableExpenseRequest = z.infer<
  typeof DeleteVariableExpenseRequestSchema
>;
export type ListVariableExpensesRequest = z.infer<
  typeof ListVariableExpensesRequestSchema
>;
export type RecalculatePayrollRequest = z.infer<
  typeof RecalculatePayrollRequestSchema
>;
export type ClosePayrollMonthRequest = z.infer<
  typeof ClosePayrollMonthRequestSchema
>;
export type ReopenPayrollMonthRequest = z.infer<
  typeof ReopenPayrollMonthRequestSchema
>;
export type GetPayrollMonthlyReportRequest = z.infer<
  typeof GetPayrollMonthlyReportRequestSchema
>;
export type PayrollAdminActionRequest = z.infer<
  typeof PayrollAdminActionRequestSchema
>;

export type PayrollDeleteResult = z.infer<typeof PayrollDeleteResultSchema>;
export type PayrollMonthCloseResult = z.infer<
  typeof PayrollMonthCloseResultSchema
>;
export type PayrollAdminActionResult = z.infer<
  typeof PayrollAdminActionResultSchema
>;

export type PayrollEndpointKey = keyof typeof PayrollEndpointContract;
export type PayrollApiPathKey = keyof typeof PAYROLL_API_PATHS;
