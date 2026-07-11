import { fireEvent, render } from "@testing-library/react-native";

import {
  PlanActionList,
  PlanBreakdownSection,
  PlanProgressCard,
} from "../components";
import type { PlanCommitmentsSnapshot } from "../types";

const snapshot: PlanCommitmentsSnapshot = {
  adsFinancialTargetingUsed: false,
  fixedExpenseTotalMinor: 920000,
  fixedExpenses: [
    {
      amountMinor: 650000,
      category: "HOUSING",
      dueDay: 25,
      dueLabel: "매월 25일",
      financialRawDataExposed: false,
      id: "fx_rent",
      lastPaidAt: null,
      paidTotalMinor: 0,
      serverAuthority: true,
      status: "ACTIVE",
      title: "월세",
    },
    {
      amountMinor: 270000,
      category: "UTILITY",
      dueDay: 10,
      dueLabel: "매월 10일",
      financialRawDataExposed: false,
      id: "fx_utility",
      lastPaidAt: null,
      paidTotalMinor: 0,
      serverAuthority: true,
      status: "ACTIVE",
      title: "공과금",
    },
  ],
  fixedSavingsTotalMinor: 350000,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  savingsGoals: [
    {
      currentAmountMinor: 1800000,
      financialRawAccountDataExposed: false,
      fixedSaveAmountMinor: 350000,
      goalType: "EMERGENCY_FUND",
      id: "goal_emergency",
      serverAuthority: true,
      status: "ACTIVE",
      targetAmountMinor: 5000000,
      title: "비상금",
    },
  ],
  serverAuthority: true,
};

describe("plan feature components", () => {
  it("renders a server-authoritative plan progress card with KRW integer money", () => {
    const screen = render(
      <PlanProgressCard
        completionPercent={36}
        currentAmountMinor={1800000}
        goalAmountMinor={5000000}
        title="목표 달성률"
      />,
    );

    expect(screen.getByText("목표 달성률")).toBeTruthy();
    expect(screen.getByText("1,800,000원")).toBeTruthy();
    expect(screen.getByLabelText("목표 달성률 36%")).toBeTruthy();
    expect(screen.getByText("serverAuthority=true")).toBeTruthy();
    expect(screen.getByText("rawFinancialData=false")).toBeTruthy();
  });

  it("renders plan commitments without exposing raw account or personal data", () => {
    const screen = render(<PlanBreakdownSection snapshot={snapshot} />);

    expect(screen.getByText("고정지출")).toBeTruthy();
    expect(screen.getByText("920,000원")).toBeTruthy();
    expect(screen.getByText("고정저축")).toBeTruthy();
    expect(screen.getAllByText("350,000원").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("월세")).toBeTruthy();
    expect(screen.getByText("비상금")).toBeTruthy();
    expect(screen.getByText("rawPersonalData=false")).toBeTruthy();
    expect(screen.getByText("adsFinancialTargeting=false")).toBeTruthy();
  });

  it("renders plan actions as explicit edit/add entry points", () => {
    const onSelect = jest.fn();
    const screen = render(
      <PlanActionList
        actions={[
          {
            key: "fixed-expense",
            label: "고정지출 추가",
            description: "월세, 구독, 보험",
          },
          {
            key: "savings-goal",
            label: "저축 목표 수정",
            description: "목표금액과 자동저축",
          },
        ]}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(
      screen.getByRole("button", { name: "고정지출 추가 월세, 구독, 보험" }),
    );

    expect(onSelect).toHaveBeenCalledWith("fixed-expense");
    expect(screen.getByText("serverRecalculationRequired=true")).toBeTruthy();
  });
});
