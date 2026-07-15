import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import type { VariableExpenseRecord } from "../../budget/types";
import type {
  PayrollPlanSaveRequest,
  PayrollPlanSnapshot,
} from "../../payroll/types";
import type {
  PlanFixedExpenseCommitment,
  PlanSavingsGoalCommitment,
} from "../types";
import { resetSalaryHomePreviewCacheForTests } from "../../salary/components";
import { PlanScreen } from "../components";

describe("plan reference screen interactions", () => {
  beforeEach(() => {
    resetSalaryHomePreviewCacheForTests();
    jest.clearAllMocks();
  });

  it("opens section settings and exposes editable plan controls", () => {
    const screen = render(<PlanScreen />);

    fireEvent.press(screen.getByTestId("fixed-section-settings-button"));
    expect(screen.getByTestId("fixed-section-add-button")).toBeTruthy();
    expect(
      screen.getByTestId("fixed-item-edit-plan-fixed-chatgpt"),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId("fixed-item-edit-plan-fixed-chatgpt"));
    fireEvent.changeText(
      screen.getByLabelText("계획 항목 내용"),
      "ChatGPT Plus",
    );
    fireEvent.changeText(screen.getByLabelText("계획 항목 금액"), "33000");
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 저장" }));

    expect(screen.getByText("ChatGPT Plus")).toBeTruthy();
    expect(screen.getAllByText(/33,000/u).length).toBeGreaterThan(0);
  });

  it("submits new fixed expense rows to the server-authoritative plan API before local preview sync", async () => {
    const createFixedExpense = jest.fn().mockResolvedValue(
      fixedExpenseCommitment({
        amountMinor: 45_000,
        category: "subscription",
        dueDay: 10,
        id: "server-fixed-chatgpt-team",
        title: "ChatGPT Team",
      }),
    );
    const screen = render(
      <PlanScreen planCommitmentsApi={{ createFixedExpense }} />,
    );

    fireEvent.press(screen.getByTestId("fixed-section-settings-button"));
    fireEvent.press(screen.getByTestId("fixed-section-add-button"));
    fillPlanItem(screen, {
      amount: "45000",
      category: "\uAE30\uD0C0",
      content: "ChatGPT Team",
      day: "10",
    });
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 저장" }));

    await waitFor(() => expect(createFixedExpense).toHaveBeenCalledTimes(1));
    expect(createFixedExpense).toHaveBeenCalledWith({
      amountMinor: 45_000,
      category: "\uAE30\uD0C0",
      paymentDay: 10,
      title: "ChatGPT Team",
    });
    await waitFor(() => expect(screen.getByText("ChatGPT Team")).toBeTruthy());
    expect(screen.getAllByText(/45,000/u).length).toBeGreaterThan(0);
  });

  it("blocks duplicate fixed expense submissions while the server save is pending", async () => {
    const pendingSave = createDeferred<PlanFixedExpenseCommitment>();
    const createFixedExpense = jest.fn().mockReturnValue(pendingSave.promise);
    const screen = render(
      <PlanScreen planCommitmentsApi={{ createFixedExpense }} />,
    );

    fireEvent.press(screen.getByTestId("fixed-section-settings-button"));
    fireEvent.press(screen.getByTestId("fixed-section-add-button"));
    fillPlanItem(screen, {
      amount: "45000",
      category: "\uAE30\uD0C0",
      content: "ChatGPT Team",
      day: "10",
    });

    fireEvent.press(screen.getByTestId("plan-item-save-button"));
    fireEvent.press(screen.getByTestId("plan-item-save-button"));

    expect(createFixedExpense).toHaveBeenCalledTimes(1);
    await act(async () => {
      pendingSave.resolve(
        fixedExpenseCommitment({
          amountMinor: 45_000,
          category: "subscription",
          dueDay: 10,
          id: "server-fixed-chatgpt-team",
          title: "ChatGPT Team",
        }),
      );
      await pendingSave.promise;
    });
  });

  it("keeps fixed expense drafts unsaved when the server-authoritative plan API rejects", async () => {
    const createFixedExpense = jest
      .fn()
      .mockRejectedValue(new Error("offline"));
    const screen = render(
      <PlanScreen planCommitmentsApi={{ createFixedExpense }} />,
    );

    fireEvent.press(screen.getByTestId("fixed-section-settings-button"));
    fireEvent.press(screen.getByTestId("fixed-section-add-button"));
    fillPlanItem(screen, {
      amount: "45000",
      category: "\uAE30\uD0C0",
      content: "Rejected ChatGPT",
      day: "10",
    });
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 저장" }));

    await waitFor(() => expect(createFixedExpense).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Rejected ChatGPT")).toBeNull();
    expect(
      screen.getByText(
        "\uC11C\uBC84 \uC800\uC7A5\uC774 \uC2E4\uD328\uD574 \uACC4\uD68D\uC744 \uBC18\uC601\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.",
      ),
    ).toBeTruthy();
  });

  it("updates and deletes fixed expense rows through the server-authoritative plan API", async () => {
    const updateFixedExpense = jest.fn().mockResolvedValue(
      fixedExpenseCommitment({
        amountMinor: 33_000,
        category: "subscription",
        dueDay: 10,
        id: "plan-fixed-chatgpt",
        title: "ChatGPT Plus",
      }),
    );
    const deleteFixedExpense = jest.fn().mockResolvedValue({
      id: "plan-fixed-chatgpt",
      rawFinancialDataExposed: false,
      serverAuthority: true,
      status: "DELETED",
    });
    const screen = render(
      <PlanScreen
        planCommitmentsApi={{ deleteFixedExpense, updateFixedExpense }}
      />,
    );

    fireEvent.press(screen.getByTestId("fixed-section-settings-button"));
    fireEvent.press(screen.getByTestId("fixed-item-edit-plan-fixed-chatgpt"));
    fireEvent.changeText(
      screen.getByLabelText("계획 항목 내용"),
      "ChatGPT Plus",
    );
    fireEvent.changeText(screen.getByLabelText("계획 항목 금액"), "33000");
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 저장" }));

    await waitFor(() => expect(updateFixedExpense).toHaveBeenCalledTimes(1));
    expect(updateFixedExpense).toHaveBeenCalledWith(
      "plan-fixed-chatgpt",
      expect.objectContaining({ amountMinor: 33_000, title: "ChatGPT Plus" }),
    );
    await waitFor(() => expect(screen.getByText("ChatGPT Plus")).toBeTruthy());

    fireEvent.press(screen.getByTestId("fixed-item-edit-plan-fixed-chatgpt"));
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 삭제" }));

    await waitFor(() =>
      expect(deleteFixedExpense).toHaveBeenCalledWith("plan-fixed-chatgpt"),
    );
    await waitFor(() => expect(screen.queryByText("ChatGPT Plus")).toBeNull());
  });

  it("creates, updates, and deletes fixed savings rows through the server-authoritative plan API", async () => {
    const createSavingsGoal = jest.fn().mockResolvedValue(
      savingsGoalCommitment({
        amountMinor: 250_000,
        goalType: "saving",
        id: "server-saving-vacation",
        title: "Vacation saving",
      }),
    );
    const updateSavingsGoal = jest.fn().mockResolvedValue(
      savingsGoalCommitment({
        amountMinor: 260_000,
        goalType: "saving",
        id: "plan-saving-travel",
        title: "Travel upgrade",
      }),
    );
    const deleteSavingsGoal = jest.fn().mockResolvedValue({
      id: "plan-saving-travel",
      rawFinancialDataExposed: false,
      serverAuthority: true,
      status: "DELETED",
    });
    const screen = render(
      <PlanScreen
        planCommitmentsApi={{
          createSavingsGoal,
          deleteSavingsGoal,
          updateSavingsGoal,
        }}
      />,
    );

    fireEvent.press(screen.getByTestId("saving-section-settings-button"));
    fireEvent.press(screen.getByTestId("saving-section-add-button"));
    fillPlanItem(screen, {
      amount: "250000",
      category: "saving",
      content: "Vacation saving",
      day: "25",
    });
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 저장" }));

    await waitFor(() => expect(createSavingsGoal).toHaveBeenCalledTimes(1));
    expect(createSavingsGoal).toHaveBeenCalledWith({
      fixedSaveAmountMinor: 250_000,
      goalType: "\uAE30\uD0C0",
      targetAmountMinor: 250_000,
      title: "Vacation saving",
    });
    await waitFor(() =>
      expect(screen.getByText("Vacation saving")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("saving-item-edit-plan-saving-travel"));
    fireEvent.changeText(
      screen.getByLabelText("계획 항목 내용"),
      "Travel upgrade",
    );
    fireEvent.changeText(screen.getByLabelText("계획 항목 금액"), "260000");
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 저장" }));

    await waitFor(() =>
      expect(updateSavingsGoal).toHaveBeenCalledWith(
        "plan-saving-travel",
        expect.objectContaining({
          fixedSaveAmountMinor: 260_000,
          title: "Travel upgrade",
        }),
      ),
    );

    fireEvent.press(screen.getByTestId("saving-item-edit-plan-saving-travel"));
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 삭제" }));

    await waitFor(() =>
      expect(deleteSavingsGoal).toHaveBeenCalledWith("plan-saving-travel"),
    );
  });

  it("keeps daily living plan rows scheduled without posting actual variable expenses", async () => {
    const createVariableExpense = jest.fn().mockResolvedValue(
      variableExpenseRecord({
        amountMinor: 8_700,
        category: "ETC",
        expenseId: "server-daily-lunch",
        title: "Plan lunch",
      }),
    );
    const updateVariableExpense = jest.fn().mockResolvedValue(
      variableExpenseRecord({
        amountMinor: 9_100,
        category: "ETC",
        expenseId: "daily-coffee",
        title: "Morning coffee",
      }),
    );
    const screen = render(
      <PlanScreen
        budgetApi={{ createVariableExpense, updateVariableExpense }}
      />,
    );

    fireEvent.press(screen.getByTestId("living-section-settings-button"));
    fireEvent.press(screen.getByTestId("living-section-add-button"));
    fillPlanItem(screen, {
      amount: "8700",
      category: "cafe",
      content: "Plan lunch",
      day: "1",
    });
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 저장" }));

    expect(createVariableExpense).not.toHaveBeenCalled();
    expect(screen.getByText("Plan lunch")).toBeTruthy();

    fireEvent.press(screen.getByTestId("living-item-edit-daily-coffee"));
    fireEvent.changeText(
      screen.getByLabelText("계획 항목 내용"),
      "Morning coffee",
    );
    fireEvent.changeText(screen.getByLabelText("계획 항목 금액"), "9100");
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 저장" }));

    expect(updateVariableExpense).not.toHaveBeenCalled();
    expect(screen.getByText("Morning coffee")).toBeTruthy();
  });

  it("recalculates daily living plan rows through the budget API before preview sync", async () => {
    const createVariableExpense = jest.fn();
    const recalculate = jest.fn().mockResolvedValue({
      adTargetingSeparated: true,
      affectedBudgetCount: 30,
      financialRawDataExposed: false,
      periodEndDate: "2026-07-14",
      periodStartDate: "2026-07-13",
      recalculatedDailyAmountMinor: 9500,
      serverAuthority: true,
    });
    const screen = render(
      <PlanScreen budgetApi={{ createVariableExpense, recalculate }} />,
    );

    fireEvent.press(screen.getByTestId("living-section-settings-button"));
    fireEvent.press(screen.getByTestId("living-section-add-button"));
    fillPlanItem(screen, {
      amount: "9500",
      category: "food",
      content: "점심 샐러드",
      day: "1",
    });
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 저장" }));

    expect(createVariableExpense).not.toHaveBeenCalled();
    await waitFor(() => expect(recalculate).toHaveBeenCalledTimes(1));
    expect(recalculate).toHaveBeenCalledWith(
      expect.objectContaining({
        alreadySpentAmountMinor: 0,
        availableAmountMinor: 885_000,
        carryOverAmountMinor: 0,
        memo: "mobile plan daily living item recalculation",
        overwriteExisting: true,
      }),
    );
    await waitFor(() => expect(screen.getByText("점심 샐러드")).toBeTruthy());
  });

  it("blocks duplicate daily living recalculations while the server save is pending", async () => {
    const recalculationResult = {
      adTargetingSeparated: true,
      affectedBudgetCount: 30,
      financialRawDataExposed: false,
      periodEndDate: "2026-07-14",
      periodStartDate: "2026-07-13",
      recalculatedDailyAmountMinor: 12_000,
      serverAuthority: true,
    };
    const pendingRecalculation = createDeferred<typeof recalculationResult>();
    const recalculate = jest.fn().mockReturnValue(pendingRecalculation.promise);
    const screen = render(<PlanScreen budgetApi={{ recalculate }} />);

    fireEvent.press(screen.getByTestId("living-section-settings-button"));
    fireEvent.press(screen.getByTestId("living-section-add-button"));
    fillPlanItem(screen, {
      amount: "12000",
      category: "food",
      content: "Plan dinner",
      day: "1",
    });

    fireEvent.press(screen.getByTestId("plan-item-save-button"));
    fireEvent.press(screen.getByTestId("plan-item-save-button"));

    expect(recalculate).toHaveBeenCalledTimes(1);
    await act(async () => {
      pendingRecalculation.resolve(recalculationResult);
      await pendingRecalculation.promise;
    });
  });

  it("deletes daily living plan rows without deleting actual variable expenses", async () => {
    const deleteVariableExpense = jest.fn().mockResolvedValue({
      adTargetingSeparated: true,
      expenseId: "daily-coffee",
      financialRawDataExposed: false,
      serverAuthority: true,
      status: "DELETED",
    });
    const screen = render(<PlanScreen budgetApi={{ deleteVariableExpense }} />);

    fireEvent.press(screen.getByTestId("living-section-settings-button"));
    fireEvent.press(screen.getByTestId("living-item-edit-daily-coffee"));
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 삭제" }));

    expect(deleteVariableExpense).not.toHaveBeenCalled();
    expect(screen.queryByTestId("living-item-edit-daily-coffee")).toBeNull();
  });

  it("recalculates the daily living budget before deleting scheduled living rows", async () => {
    const deleteVariableExpense = jest.fn();
    const recalculate = jest.fn().mockResolvedValue({
      adTargetingSeparated: true,
      affectedBudgetCount: 30,
      financialRawDataExposed: false,
      periodEndDate: "2026-07-14",
      periodStartDate: "2026-07-13",
      recalculatedDailyAmountMinor: 18_000,
      serverAuthority: true,
    });
    const screen = render(
      <PlanScreen budgetApi={{ deleteVariableExpense, recalculate }} />,
    );

    fireEvent.press(screen.getByTestId("living-section-settings-button"));
    fireEvent.press(screen.getByTestId("living-item-edit-daily-coffee"));
    fireEvent.press(screen.getByRole("button", { name: "계획 항목 삭제" }));

    expect(deleteVariableExpense).not.toHaveBeenCalled();
    await waitFor(() => expect(recalculate).toHaveBeenCalledTimes(1));
    expect(recalculate).toHaveBeenCalledWith(
      expect.objectContaining({
        availableAmountMinor: 540_000,
        memo: "mobile plan daily living item recalculation",
        overwriteExisting: true,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId("living-item-edit-daily-coffee")).toBeNull(),
    );
  });

  it("saves payroll plan settings through the server-authoritative payroll API before local preview sync", async () => {
    const observedRequestRef: { current: PayrollPlanSaveRequest | null } = {
      current: null,
    };
    const resolveSavePlanRef: {
      current: ((value: PayrollPlanSnapshot) => void) | null;
    } = { current: null };
    const savePlan = jest.fn((request: PayrollPlanSaveRequest) => {
      observedRequestRef.current = request;
      return new Promise<PayrollPlanSnapshot>((resolve) => {
        resolveSavePlanRef.current = resolve;
      });
    });
    const plan = render(<PlanScreen payrollApi={{ savePlan }} />);

    fireEvent.press(plan.getByTestId("payroll-section-settings-button"));
    fireEvent.changeText(plan.getByLabelText("payroll-payday-input"), "24");
    fireEvent.changeText(
      plan.getByLabelText("payroll-amount-input"),
      "3200000",
    );
    fireEvent.changeText(
      plan.getByLabelText("payroll-expense-input"),
      "900000",
    );
    fireEvent.press(
      plan.getByRole("button", { name: "payroll-plan-save-button" }),
    );

    await waitFor(() => expect(savePlan).toHaveBeenCalledTimes(1));
    expect(savePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        fixedExpenseTotalMinor: 900_000,
        incomeType: "NET",
        payday: 24,
        payrollAmountMinor: 3_200_000,
        payrollCycle: "MONTHLY",
        reservePolicy: "ZERO_BASE",
      }),
    );
    expect(observedRequestRef.current?.periodStartDate).toMatch(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u,
    );
    expect(observedRequestRef.current?.periodEndDate).toMatch(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u,
    );
    expect(plan.queryByText(/2,300,000/u)).toBeNull();

    resolveSavePlanRef.current?.(
      payrollPlanSnapshot({
        fixedExpenseTotalMinor: 900_000,
        payday: 24,
        payrollAmountMinor: 3_200_000,
        remainderMinor: 2_300_000,
      }),
    );

    await waitFor(() => expect(plan.getByText(/3,200,000/u)).toBeTruthy());
    expect(plan.getByText(/900,000/u)).toBeTruthy();
    expect(plan.getByText(/2,300,000/u)).toBeTruthy();
  });

  it("clamps payroll save dates to the KST month end when payday exceeds the month length", async () => {
    jest.useFakeTimers({
      now: new Date("2026-02-10T00:00:00.000Z"),
    });
    try {
      const savePlan = jest.fn().mockResolvedValue(
        payrollPlanSnapshot({
          fixedExpenseTotalMinor: 700_000,
          payday: 31,
          payrollAmountMinor: 2_700_000,
          remainderMinor: 2_000_000,
        }),
      );
      const plan = render(<PlanScreen payrollApi={{ savePlan }} />);

      fireEvent.press(plan.getByTestId("payroll-section-settings-button"));
      fireEvent.changeText(plan.getByLabelText("payroll-payday-input"), "31");
      fireEvent.press(
        plan.getByRole("button", { name: "payroll-plan-save-button" }),
      );

      await waitFor(() => expect(savePlan).toHaveBeenCalledTimes(1));
      expect(savePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          firstPayrollDate: "2026-02-28",
          payday: 31,
          periodEndDate: "2026-02-28",
          periodStartDate: "2026-02-01",
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });
});

function createDeferred<T>(): {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
} {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

function fillPlanItem(
  screen: ReturnType<typeof render>,
  draft: Readonly<{
    amount: string;
    category: string;
    content: string;
    day: string;
  }>,
): void {
  fireEvent.changeText(
    screen.getByLabelText("계획 항목 카테고리"),
    draft.category,
  );
  fireEvent.changeText(screen.getByLabelText("계획 항목 내용"), draft.content);
  fireEvent.changeText(screen.getByLabelText("계획 항목 금액"), draft.amount);
  fireEvent.changeText(screen.getByLabelText("계획 항목 일자"), draft.day);
}

function fixedExpenseCommitment({
  amountMinor,
  category,
  dueDay,
  id,
  title,
}: Readonly<{
  amountMinor: number;
  category: string;
  dueDay: number;
  id: string;
  title: string;
}>): PlanFixedExpenseCommitment {
  return {
    amountMinor,
    category,
    dueDay,
    dueLabel: String(dueDay),
    financialRawDataExposed: false,
    id,
    lastPaidAt: null,
    paidTotalMinor: 0,
    serverAuthority: true,
    status: "ACTIVE",
    title,
  };
}

function savingsGoalCommitment({
  amountMinor,
  goalType,
  id,
  title,
}: Readonly<{
  amountMinor: number;
  goalType: string;
  id: string;
  title: string;
}>): PlanSavingsGoalCommitment {
  return {
    currentAmountMinor: 0,
    financialRawAccountDataExposed: false,
    fixedSaveAmountMinor: amountMinor,
    goalType,
    id,
    serverAuthority: true,
    status: "ACTIVE",
    targetAmountMinor: amountMinor,
    title,
  };
}

function variableExpenseRecord({
  amountMinor,
  category,
  expenseId,
  title,
}: Readonly<{
  amountMinor: number;
  category: VariableExpenseRecord["category"];
  expenseId: string;
  title: string;
}>): VariableExpenseRecord {
  return {
    adTargetingSeparated: true,
    amountMinor,
    category,
    dailyBudgetId: null,
    expenseId,
    financialRawDataExposed: false,
    memo: null,
    merchantName: null,
    netAmountMinor: amountMinor,
    paymentMethod: "CASH",
    serverAuthority: true,
    source: "MANUAL",
    spentAt: "2026-07-12T00:00:00.000Z",
    status: "POSTED",
    title,
  };
}

function payrollPlanSnapshot({
  fixedExpenseTotalMinor,
  payday,
  payrollAmountMinor,
  remainderMinor,
}: Readonly<{
  fixedExpenseTotalMinor: number;
  payday: number;
  payrollAmountMinor: number;
  remainderMinor: number;
}>): PayrollPlanSnapshot {
  return {
    adTargetingSeparated: true,
    calculation: {
      alreadySpentAmountMinor: 0,
      availableBeforeSpentMinor: payrollAmountMinor - fixedExpenseTotalMinor,
      availableForDailyBudgetMinor: remainderMinor,
      carryOverAmountMinor: 0,
      dayCount: 30,
      emergencyBufferMinor: 0,
      financialRawDataExposed: false,
      fixedExpenseTotalMinor,
      fixedSavingsTotalMinor: 0,
      hijackRate: 0.72,
      payrollAmountMinor,
      periodEndDate: "2026-07-31",
      periodStartDate: "2026-07-01",
      recommendedDailyBudgetMinor: Math.floor(remainderMinor / 30),
      remainderMinor,
      serverAuthority: true,
      totalDeductionsMinor: fixedExpenseTotalMinor,
      variableExpenseReserveMinor: 0,
    },
    carryOverAmountMinor: 0,
    emergencyBufferMinor: 0,
    financialRawDataExposed: false,
    firstPayrollDate: "2026-07-24",
    fixedExpenseTotalMinor,
    fixedSavingsTotalMinor: 0,
    incomeType: "NET",
    memo: "mobile plan payroll settings",
    payday,
    payrollAmountMinor,
    payrollCycle: "MONTHLY",
    periodEndDate: "2026-07-31",
    periodStartDate: "2026-07-01",
    planId: "server-payroll-plan",
    reservePolicy: "ZERO_BASE",
    serverAuthority: true,
    status: "ACTIVE",
    title: "Mobile payroll plan",
    variableExpenseReserveMinor: 0,
  };
}
