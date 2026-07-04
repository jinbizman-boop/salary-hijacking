import { fireEvent, render } from "@testing-library/react-native";

import { DailyBudgetCard } from "../components/DailyBudgetCard";
import type { BudgetViewModel } from "../types";

const viewModel: BudgetViewModel = {
  snapshot: {
    date: "2026-06-25",
    timezone: "Asia/Seoul",
    currency: "KRW",
    dailyLimit: 10_000,
    spentToday: 12_000,
    remainingToday: 0,
    overspentAmount: 2_000,
    usageRate: 120,
    riskLevel: "OVER",
    fixedExpenseReflected: true,
    savingsReflected: true,
    variableExpenseReflected: true,
    serverCalculatedAt: "2026-06-25T01:00:00.000Z",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  },
  riskLabel: "예산 초과",
  remainingLabel: "₩0",
  spentLabel: "₩12,000",
  dailyLimitLabel: "₩10,000",
  overspentLabel: "₩2,000",
  lastSyncedLabel: "6월 25일 오전 10:00",
};

describe("budget components", () => {
  it("renders server-authoritative amounts and an actionable overspend notice", () => {
    const onOpenPlan = jest.fn();
    const screen = render(
      <DailyBudgetCard viewModel={viewModel} onOpenPlan={onOpenPlan} />,
    );

    expect(screen.getByText("오늘 남은 예산")).toBeTruthy();
    expect(screen.getByText("₩0")).toBeTruthy();
    expect(screen.getAllByText("예산 초과")).toHaveLength(2);
    fireEvent.press(screen.getByRole("button", { name: "예산 계획 열기" }));
    expect(onOpenPlan).toHaveBeenCalledTimes(1);
  });

  it("renders a stable loading skeleton without fake financial values", () => {
    const screen = render(<DailyBudgetCard loading />);
    expect(screen.getByLabelText("오늘 예산을 불러오는 중")).toBeTruthy();
    expect(screen.queryByText(/₩\d/u)).toBeNull();
  });
});

describe("daily budget action accessibility", () => {
  it("exposes disabled state for refresh and non-actionable hints", () => {
    const screen = render(
      <DailyBudgetCard
        hints={[
          {
            description: "서버 예산 계획에서 다시 확인하세요.",
            eventName: "daily_budget_hint_open",
            id: "hint-plan",
            rawFinancialDataExposed: false,
            route: null,
            severity: "WARNING",
            title: "예산 계획 확인",
          },
        ]}
        onRefresh={jest.fn()}
        refreshing
        viewModel={viewModel}
      />,
    );

    expect(
      screen.getByRole("button", { name: "오늘 예산 새로고침" }).props
        .accessibilityState,
    ).toEqual({ disabled: true });
    expect(
      screen.getByLabelText("예산 계획 확인").props.accessibilityState,
    ).toEqual({ disabled: true });
  });

  it("locks empty-state refresh while a budget refresh is already running", () => {
    const onRefresh = jest.fn();
    const screen = render(
      <DailyBudgetCard onRefresh={onRefresh} refreshing viewModel={null} />,
    );
    const refreshButton = screen.getByRole("button", {
      name: "오늘 예산 다시 불러오기",
    });

    expect(refreshButton.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(refreshButton);
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
