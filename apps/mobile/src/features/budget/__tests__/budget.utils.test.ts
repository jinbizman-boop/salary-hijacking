import {
  calculateBudgetMetrics,
  formatKrw,
  normalizeKrwAmount,
  redactBudgetError,
} from "../utils";

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
});
