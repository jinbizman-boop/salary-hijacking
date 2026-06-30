import {
  parseDailyBudgetSnapshot,
  validateRecalculateRequest,
} from "../validation";

const validSnapshot = {
  date: "2026-06-25",
  timezone: "Asia/Seoul",
  currency: "KRW",
  dailyLimit: 10_000,
  spentToday: 3_000,
  remainingToday: 7_000,
  overspentAmount: 0,
  usageRate: 30,
  riskLevel: "SAFE",
  fixedExpenseReflected: true,
  savingsReflected: true,
  variableExpenseReflected: true,
  serverCalculatedAt: "2026-06-24T15:00:00.000Z",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  adsFinancialTargetingUsed: false,
} as const;

describe("budget validation", () => {
  it("accepts a consistent server-authoritative snapshot", () => {
    expect(parseDailyBudgetSnapshot(validSnapshot)).toEqual(validSnapshot);
  });

  it.each([
    { ...validSnapshot, dailyLimit: -1 },
    { ...validSnapshot, spentToday: 1.5 },
    { ...validSnapshot, remainingToday: 6_999 },
    { ...validSnapshot, rawFinancialDataExposed: true },
    { ...validSnapshot, rawPersonalDataExposed: true },
    { ...validSnapshot, adsFinancialTargetingUsed: true },
    { ...validSnapshot, timezone: "UTC" },
  ])("rejects an unsafe or inconsistent snapshot", (candidate) => {
    expect(() => parseDailyBudgetSnapshot(candidate)).toThrow();
  });

  it("only accepts integer, non-negative recalculate inputs", () => {
    expect(
      validateRecalculateRequest({
        periodStartDate: "2026-06-25",
        periodEndDate: "2026-07-24",
        availableAmountMinor: 500_000,
        alreadySpentAmountMinor: 10_000,
        carryOverAmountMinor: 0,
        overwriteExisting: false,
        memo: null,
      }),
    ).toBe(true);

    expect(
      validateRecalculateRequest({
        periodStartDate: "2026-06-25",
        periodEndDate: "2026-07-24",
        availableAmountMinor: -1,
        alreadySpentAmountMinor: 0,
        carryOverAmountMinor: 0,
        overwriteExisting: false,
        memo: null,
      }),
    ).toBe(false);
  });
});
