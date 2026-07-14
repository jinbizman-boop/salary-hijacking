import {
  calculateBudgetMetrics,
  calculateOfflineDailyBudgetPreview,
  formatKrw,
  normalizeKrwAmount,
  parseKrwInputAmount,
  redactBudgetError,
  sanitizeKrwIntegerInput,
} from "../utils";
import { BUDGET_SAFE_ERROR_MESSAGE } from "../constants";

describe("budget utils", () => {
  it("calculates remaining and overspent amounts with a capped usage rate", () => {
    expect(calculateBudgetMetrics(10_000, 3_000)).toEqual({
      remainingToday: 7_000,
      overspentAmount: 0,
      usageRate: 30,
    });
    expect(calculateBudgetMetrics(10_000, 12_000)).toEqual({
      remainingToday: 0,
      overspentAmount: 2_000,
      usageRate: 120,
    });
    expect(calculateBudgetMetrics(1, 20)).toEqual({
      remainingToday: 0,
      overspentAmount: 19,
      usageRate: 999,
    });
  });

  it("normalizes invalid KRW values to zero", () => {
    expect(normalizeKrwAmount(-1)).toBe(0);
    expect(normalizeKrwAmount(1.5)).toBe(0);
    expect(normalizeKrwAmount(Number.NaN)).toBe(0);
    expect(normalizeKrwAmount(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeKrwAmount(Number.MAX_SAFE_INTEGER + 1)).toBe(0);
    expect(normalizeKrwAmount(12_345)).toBe(12_345);
  });

  it("parses positive KRW input for interactive expense entry", () => {
    expect(parseKrwInputAmount("5,000")).toBe(5_000);
    expect(parseKrwInputAmount(" 12000 ")).toBe(12_000);
    expect(parseKrwInputAmount("0")).toBeNull();
    expect(parseKrwInputAmount("-1000")).toBeNull();
    expect(parseKrwInputAmount("1.5")).toBeNull();
    expect(parseKrwInputAmount("abc500")).toBeNull();
    expect(parseKrwInputAmount(String(Number.MAX_SAFE_INTEGER + 1))).toBeNull();
  });

  it("rejects malformed comma grouping instead of silently changing KRW input", () => {
    expect(parseKrwInputAmount("1,,000")).toBeNull();
    expect(parseKrwInputAmount("12,34")).toBeNull();
    expect(parseKrwInputAmount("123,45,678")).toBeNull();
    expect(parseKrwInputAmount("1,234,567")).toBe(1_234_567);
  });

  it("sanitizes editable KRW fields without accepting negative or decimal text", () => {
    expect(sanitizeKrwIntegerInput("19000")).toBe("19000");
    expect(sanitizeKrwIntegerInput("")).toBe("");
    expect(sanitizeKrwIntegerInput("-1000")).toBeNull();
    expect(sanitizeKrwIntegerInput("1.5")).toBeNull();
    expect(sanitizeKrwIntegerInput("abc500")).toBeNull();
  });

  it("calculates an offline daily-budget preview without showing a negative remaining budget", () => {
    expect(
      calculateOfflineDailyBudgetPreview({
        addedExpenseAmounts: [5_000, 3_500, -1, 1.25],
        baseMonthHijack: 1_927_000,
        baseMonthlyExpense: 773_000,
        baseSpentToday: 13_000,
        dailyLimit: 20_000,
      }),
    ).toEqual({
      addedExpenseTotal: 8_500,
      dailyLimit: 20_000,
      monthHijack: 1_918_500,
      monthlyExpense: 781_500,
      overspentAmount: 1_500,
      remainingToday: 0,
      spentToday: 21_500,
      usageRate: 107.5,
    });
  });

  it("formats KRW and removes sensitive values from user-facing errors", () => {
    expect(formatKrw(12_345)).toContain("12,345");

    const redacted = redactBudgetError(
      "salary amount 5000000, account 123-456-789 and token secret-token",
    );
    expect(redacted).not.toContain("5000000");
    expect(redacted).not.toContain("123-456-789");
    expect(redacted).not.toContain("secret-token");
    expect(redacted).toBe(
      "예산 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("does not trust raw Error.message strings as user-facing budget copy", () => {
    const statusDerivedCopy = redactBudgetError({ status: 401 });

    expect(redactBudgetError(new Error(statusDerivedCopy))).toBe(
      BUDGET_SAFE_ERROR_MESSAGE,
    );
    expect(redactBudgetError({ message: statusDerivedCopy })).toBe(
      BUDGET_SAFE_ERROR_MESSAGE,
    );
    expect(redactBudgetError({ status: 401, message: statusDerivedCopy })).toBe(
      statusDerivedCopy,
    );
  });
});
