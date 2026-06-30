import {
  createBudgetActionHints,
  createBudgetCheckedEvent,
  resolveBudgetRiskLevel,
  selectBudgetViewModel,
} from "../selectors";
import type { DailyBudgetSnapshot } from "../types";

const snapshot = (usageRate: number): DailyBudgetSnapshot => ({
  date: "2026-06-25",
  timezone: "Asia/Seoul",
  currency: "KRW",
  dailyLimit: 10_000,
  spentToday: Math.round((10_000 * usageRate) / 100),
  remainingToday: Math.max(0, 10_000 - Math.round((10_000 * usageRate) / 100)),
  overspentAmount: Math.max(0, Math.round((10_000 * usageRate) / 100) - 10_000),
  usageRate,
  riskLevel: resolveBudgetRiskLevel(usageRate),
  fixedExpenseReflected: true,
  savingsReflected: true,
  variableExpenseReflected: true,
  serverCalculatedAt: "2026-06-24T15:00:00.000Z",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  adsFinancialTargetingUsed: false,
});

describe("budget selectors", () => {
  it.each([
    [0, "SAFE"],
    [64.99, "SAFE"],
    [65, "WATCH"],
    [85, "WARNING"],
    [100, "OVER"],
    [999, "OVER"],
  ] as const)("maps %s percent to %s", (usageRate, expected) => {
    expect(resolveBudgetRiskLevel(usageRate)).toBe(expected);
  });

  it("builds a Korean view model without changing authoritative amounts", () => {
    const source = snapshot(120);
    const viewModel = selectBudgetViewModel(source);

    expect(viewModel.snapshot).toBe(source);
    expect(viewModel.riskLabel).toBe("예산 초과");
    expect(viewModel.remainingLabel).toContain("0");
    expect(viewModel.overspentLabel).toContain("2,000");
  });

  it("creates privacy-safe hints and analytics events", () => {
    const hints = createBudgetActionHints(snapshot(90));
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({
      severity: "WARNING",
      rawFinancialDataExposed: false,
    });
    expect(JSON.stringify(hints)).not.toContain("10000");

    expect(createBudgetCheckedEvent()).toEqual({
      type: "DAILY_BUDGET_CHECKED",
      source: "mobile_budget_feature",
      rawFinancialDataExposed: false,
      adsFinancialTargetingUsed: false,
    });
  });
});
