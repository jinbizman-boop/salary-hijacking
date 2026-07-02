import { act, renderHook } from "@testing-library/react-native";

import { useDailyBudget } from "../hooks";
import type {
  BudgetApiClient,
  BudgetApiResponse,
  DailyBudgetSnapshot,
} from "../types";

const snapshot: DailyBudgetSnapshot = {
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
  serverCalculatedAt: "2026-06-25T01:00:00.000Z",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  adsFinancialTargetingUsed: false,
};

const response: BudgetApiResponse = {
  data: { snapshot, hints: [] },
};

describe("budget hooks", () => {
  it("loads a server snapshot and preserves it as stale on a later failure", async () => {
    const getToday = jest
      .fn<ReturnType<BudgetApiClient["getToday"]>, []>()
      .mockResolvedValueOnce(response)
      .mockRejectedValueOnce(new Error("network unavailable"));
    const api: BudgetApiClient = {
      createVariableExpense: jest.fn(),
      getToday,
      recalculate: jest.fn(),
      recordChecked: jest.fn(),
    };
    const { result } = renderHook(() =>
      useDailyBudget(api, { autoLoad: false }),
    );

    await act(async () => result.current.refresh());
    expect(result.current.state).toMatchObject({
      status: "ready",
      snapshot,
    });
    expect(result.current.viewModel?.remainingLabel).toContain("7,000");

    await act(async () => result.current.refresh());
    expect(result.current.state).toMatchObject({
      status: "stale",
      snapshot,
    });
  });

  it("deduplicates concurrent refresh requests", async () => {
    let resolveRequest: ((value: BudgetApiResponse) => void) | undefined;
    const getToday = jest.fn(
      () =>
        new Promise<BudgetApiResponse>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const api: BudgetApiClient = {
      createVariableExpense: jest.fn(),
      getToday,
      recalculate: jest.fn(),
      recordChecked: jest.fn(),
    };
    const { result } = renderHook(() =>
      useDailyBudget(api, { autoLoad: false }),
    );

    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    act(() => {
      first = result.current.refresh();
      second = result.current.refresh();
    });
    expect(first).toBe(second);
    expect(getToday).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest?.(response);
      await first;
    });
    expect(result.current.state.status).toBe("ready");
  });
});
