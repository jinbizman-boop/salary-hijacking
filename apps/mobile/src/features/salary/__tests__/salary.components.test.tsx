import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type {
  BudgetApiResponse,
  DailyBudgetSaveRequest,
  VariableExpenseRecord,
  VariableExpenseUpdateRequest,
} from "../../budget/types";
import {
  getPreviewState,
  updatePreviewState,
  type PlanItem,
} from "../../preview/interactive-state";
import {
  resetSalaryHomePreviewCacheForTests,
  SalaryHomeReferenceScreen,
} from "../components";

describe("salary reference screen interactions", () => {
  beforeEach(() => {
    resetSalaryHomePreviewCacheForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses KST date copy and keeps reminder labels in the requested direction", () => {
    const screen = render(<SalaryHomeReferenceScreen />);

    expect(screen.getByText(/20\d{2}년 \d{1,2}월 \d{1,2}일/u)).toBeTruthy();
    expect(screen.getAllByText("사용 예정").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("사용 완료").length).toBeGreaterThanOrEqual(1);

    const scheduled = screen.getByRole("button", {
      name: "빽다방 아이스 아메리카노 사용 완료로 변경",
    });
    expect(scheduled.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: "#209252" }),
      ]),
    );
  });

  it("derives payday cards from the current KST salary cycle instead of static design dates", () => {
    jest.useFakeTimers({
      now: new Date("2026-07-13T00:30:00.000Z"),
    });

    const screen = render(<SalaryHomeReferenceScreen />);

    expect(screen.getByText(/^6.+25.+$/u)).toBeTruthy();
    expect(screen.getByText(/^7.+24.+$/u)).toBeTruthy();
    expect(screen.queryByText(/^11.+25.+$/u)).toBeNull();
    expect(screen.queryByText(/^12.+24.+$/u)).toBeNull();
  });

  it("announces overdue planned reminders when their scheduled day has passed in KST", () => {
    jest.useFakeTimers({
      now: new Date("2026-07-13T00:30:00.000Z"),
    });

    const screen = render(<SalaryHomeReferenceScreen />);

    const overdueReminder = screen.getByRole("button", {
      name: "기한 지남: ChatGPT 사용 완료 처리",
    });
    expect(overdueReminder.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: "#E9872F" }),
      ]),
    );
  });

  it("marks planned daily budget items completed through the server-authoritative API", async () => {
    const createVariableExpense = jest.fn().mockResolvedValue({
      adTargetingSeparated: true,
      amountMinor: 2000,
      category: "CAFE",
      dailyBudgetId: null,
      expenseId: "server-daily-coffee",
      financialRawDataExposed: false,
      memo: null,
      merchantName: "카페",
      netAmountMinor: 2000,
      paymentMethod: "ETC",
      serverAuthority: true,
      source: "MANUAL",
      spentAt: "2026-07-13T01:00:00.000Z",
      status: "POSTED",
      title: "빽다방 아이스 아메리카노",
    });
    const screen = render(
      <SalaryHomeReferenceScreen
        variableExpenseApi={{ createVariableExpense } as never}
      />,
    );

    fireEvent.press(
      screen.getByRole("button", {
        name: "빽다방 아이스 아메리카노 사용 완료로 변경",
      }),
    );

    await waitFor(() => expect(createVariableExpense).toHaveBeenCalledTimes(1));
    expect(createVariableExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 2000,
        category: "CAFE",
        merchantName: "카페",
        paymentMethod: "ETC",
        source: "MANUAL",
        title: "빽다방 아이스 아메리카노",
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "빽다방 아이스 아메리카노 사용 예정으로 변경",
        }),
      ).toBeTruthy(),
    );
  });

  it("reverts completed daily budget items through the server-authoritative API", async () => {
    const deleteVariableExpense = jest.fn().mockResolvedValue({
      adTargetingSeparated: true,
      expenseId: "daily-hot-coffee",
      financialRawDataExposed: false,
      serverAuthority: true,
      status: "DELETED",
    });
    const screen = render(
      <SalaryHomeReferenceScreen
        variableExpenseApi={{ deleteVariableExpense } as never}
      />,
    );

    fireEvent.press(
      screen.getByRole("button", {
        name: "크라제버거 Hot 아메리카노 사용 예정으로 변경",
      }),
    );

    await waitFor(() => expect(deleteVariableExpense).toHaveBeenCalledTimes(1));
    expect(deleteVariableExpense).toHaveBeenCalledWith("daily-hot-coffee", {
      reason: "USER_REVERTED_DAILY_BUDGET_COMPLETION",
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "크라제버거 Hot 아메리카노 사용 완료로 변경",
        }),
      ).toBeTruthy(),
    );
  });

  it("lets users edit and add daily budget detail items from the setting panel", () => {
    const screen = render(<SalaryHomeReferenceScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "일일 사용 예산 설정하기" }),
    );
    expect(screen.getByText("세부 항목 추가")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: "빽다방 아이스 아메리카노 수정하기" }),
    );
    fireEvent.changeText(screen.getByLabelText("일일 항목 카테고리"), "음식");
    fireEvent.changeText(screen.getByLabelText("일일 항목 내용"), "김밥 점심");
    fireEvent.changeText(screen.getByLabelText("일일 항목 금액"), "7200");
    fireEvent.press(screen.getByRole("button", { name: "일일 항목 저장" }));

    expect(screen.getByText("김밥 점심")).toBeTruthy();
    expect(screen.getByText("7,200원")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "세부 항목 추가" }));
    fireEvent.changeText(screen.getByLabelText("일일 항목 카테고리"), "교통");
    fireEvent.changeText(screen.getByLabelText("일일 항목 내용"), "택시 이동");
    fireEvent.changeText(screen.getByLabelText("일일 항목 금액"), "9800");
    fireEvent.press(screen.getByRole("button", { name: "일일 항목 저장" }));

    expect(screen.getByText("택시 이동")).toBeTruthy();
    expect(screen.getByText("9,800원")).toBeTruthy();
  });

  it("saves daily budget total through the server-authoritative API before updating the home summary", async () => {
    const serverDailyBudgetResponse: BudgetApiResponse = {
      data: {
        hints: [],
        snapshot: {
          adsFinancialTargetingUsed: false,
          currency: "KRW",
          dailyLimit: 31000,
          date: "2026-07-13",
          fixedExpenseReflected: false,
          overspentAmount: 0,
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          remainingToday: 18000,
          riskLevel: "SAFE",
          savingsReflected: false,
          serverCalculatedAt: "2026-07-13T00:00:00.000Z",
          spentToday: 13000,
          timezone: "Asia/Seoul",
          usageRate: 0.4194,
          variableExpenseReflected: true,
        },
      },
    };
    const observedRequestRef: { current: DailyBudgetSaveRequest | null } = {
      current: null,
    };
    const resolveSaveRef: {
      current: ((value: BudgetApiResponse) => void) | null;
    } = { current: null };
    const saveDailyBudget = jest.fn((request: DailyBudgetSaveRequest) => {
      observedRequestRef.current = request;
      return new Promise<BudgetApiResponse>((resolve) => {
        resolveSaveRef.current = resolve;
      });
    });
    const screen = render(
      <SalaryHomeReferenceScreen
        variableExpenseApi={{ saveDailyBudget } as never}
      />,
    );

    fireEvent.press(
      screen.getByRole("button", { name: "일일 사용 예산 설정하기" }),
    );
    fireEvent.changeText(screen.getByLabelText("일일 사용 총 금액"), "31000");

    await waitFor(() => expect(saveDailyBudget).toHaveBeenCalledTimes(1));
    expect(saveDailyBudget).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetId: null,
        plannedAmountMinor: 31000,
      }),
    );
    expect(observedRequestRef.current?.budgetDate).toMatch(
      /^\d{4}-\d{2}-\d{2}$/u,
    );
    expect(screen.queryByText("31,000원")).toBeNull();

    resolveSaveRef.current?.(serverDailyBudgetResponse);

    await waitFor(() => expect(screen.getByText("31,000원")).toBeTruthy());
  });

  it("updates completed daily budget detail items through the server-authoritative API before replacing the row", async () => {
    const observedRequestRef: {
      current: VariableExpenseUpdateRequest | null;
    } = { current: null };
    const resolveUpdateRef: {
      current: ((value: VariableExpenseRecord) => void) | null;
    } = { current: null };
    const updateVariableExpense = jest.fn(
      (_expenseId: string, request: VariableExpenseUpdateRequest) => {
        observedRequestRef.current = request;
        return new Promise<VariableExpenseRecord>((resolve) => {
          resolveUpdateRef.current = resolve;
        });
      },
    );
    const screen = render(
      <SalaryHomeReferenceScreen
        variableExpenseApi={{ updateVariableExpense } as never}
      />,
    );

    fireEvent.press(
      screen.getByRole("button", { name: "일일 사용 예산 설정하기" }),
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "크라제버거 Hot 아메리카노 수정하기",
      }),
    );
    fireEvent.changeText(screen.getByLabelText("일일 항목 카테고리"), "음식");
    fireEvent.changeText(screen.getByLabelText("일일 항목 내용"), "김밥 점심");
    fireEvent.changeText(screen.getByLabelText("일일 항목 금액"), "7200");
    fireEvent.press(screen.getByRole("button", { name: "일일 항목 저장" }));

    await waitFor(() =>
      expect(updateVariableExpense).toHaveBeenCalledWith(
        "daily-hot-coffee",
        expect.objectContaining({
          amountMinor: 7200,
          category: "MEAL",
          merchantName: "음식",
          paymentMethod: "ETC",
          title: "김밥 점심",
        }),
      ),
    );
    expect(observedRequestRef.current?.spentAt).toBeUndefined();
    expect(screen.queryByText("김밥 점심")).toBeNull();

    resolveUpdateRef.current?.({
      adTargetingSeparated: true,
      amountMinor: 7200,
      category: "MEAL",
      dailyBudgetId: null,
      expenseId: "daily-hot-coffee",
      financialRawDataExposed: false,
      memo: null,
      merchantName: "음식",
      netAmountMinor: 7200,
      paymentMethod: "ETC",
      serverAuthority: true,
      source: "MANUAL",
      spentAt: "2026-07-13T01:00:00.000Z",
      status: "POSTED",
      title: "김밥 점심",
    });

    await waitFor(() => expect(screen.getByText("김밥 점심")).toBeTruthy());
  });

  it("lets users delete planned daily budget detail items without creating an expense", () => {
    const createVariableExpense = jest.fn();
    const screen = render(
      <SalaryHomeReferenceScreen
        variableExpenseApi={{ createVariableExpense }}
      />,
    );

    fireEvent.press(
      screen.getByRole("button", { name: "일일 사용 예산 설정하기" }),
    );
    fireEvent.press(
      screen.getByRole("button", { name: "빽다방 아이스 아메리카노 삭제하기" }),
    );

    expect(createVariableExpense).not.toHaveBeenCalled();
    expect(screen.queryByText("빽다방 아이스 아메리카노")).toBeNull();
  });

  it("deletes completed daily budget detail items through the server-authoritative API before removing them", async () => {
    const deleteVariableExpense = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <SalaryHomeReferenceScreen
        variableExpenseApi={{ deleteVariableExpense }}
      />,
    );

    fireEvent.press(
      screen.getByRole("button", { name: "일일 사용 예산 설정하기" }),
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "크라제버거 Hot 아메리카노 삭제하기",
      }),
    );

    await waitFor(() =>
      expect(deleteVariableExpense).toHaveBeenCalledWith("daily-hot-coffee", {
        reason: "USER_DELETED_DAILY_BUDGET_DETAIL",
      }),
    );
    expect(screen.queryByText("크라제버거 Hot 아메리카노")).toBeNull();
  });

  it("keeps the variable expense form above the table and preserves saved rows across remounts", () => {
    const first = render(<SalaryHomeReferenceScreen />);

    fireEvent.press(first.getByRole("button", { name: "변동 지출 추가하기" }));
    fireEvent.changeText(first.getByLabelText("변동 지출 항목 입력"), "게임");
    fireEvent.changeText(
      first.getByLabelText("변동 지출 세부 내용 입력"),
      "퍼스콘 구입",
    );
    fireEvent.changeText(first.getByLabelText("변동 지출 금액 입력"), "15000");
    fireEvent.press(first.getByRole("button", { name: "변동 지출 저장" }));

    expect(first.getByText("퍼스콘 구입")).toBeTruthy();
    first.unmount();

    const second = render(<SalaryHomeReferenceScreen />);
    expect(second.getByText("퍼스콘 구입")).toBeTruthy();
    expect(second.getByLabelText("변동 지출 합계 30,000원")).toBeTruthy();
  });

  it("submits variable expenses to the server-authoritative API before keeping the preview row", async () => {
    const createVariableExpense = jest.fn().mockResolvedValue({
      adTargetingSeparated: true,
      amountMinor: 12000,
      category: "MEAL",
      dailyBudgetId: null,
      expenseId: "server-variable-001",
      financialRawDataExposed: false,
      memo: null,
      merchantName: "음식",
      netAmountMinor: 12000,
      paymentMethod: "ETC",
      serverAuthority: true,
      source: "MANUAL",
      spentAt: "2026-07-13T01:00:00.000Z",
      status: "POSTED",
      title: "김밥 점심",
    });
    const screen = render(
      <SalaryHomeReferenceScreen
        variableExpenseApi={{ createVariableExpense }}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "변동 지출 추가하기" }));
    fireEvent.changeText(screen.getByLabelText("변동 지출 항목 입력"), "음식");
    fireEvent.changeText(
      screen.getByLabelText("변동 지출 세부 내용 입력"),
      "김밥 점심",
    );
    fireEvent.changeText(screen.getByLabelText("변동 지출 금액 입력"), "12000");
    fireEvent.press(screen.getByRole("button", { name: "변동 지출 저장" }));

    await waitFor(() => expect(createVariableExpense).toHaveBeenCalledTimes(1));
    expect(createVariableExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 12000,
        category: "MEAL",
        merchantName: "음식",
        paymentMethod: "ETC",
        source: "MANUAL",
        title: "김밥 점심",
      }),
    );
    await waitFor(() => expect(screen.getByText("김밥 점심")).toBeTruthy());
    expect(screen.getByLabelText("변동 지출 합계 27,000원")).toBeTruthy();
  });

  it("keeps variable expense drafts unsaved when the server-authoritative API rejects", async () => {
    const createVariableExpense = jest
      .fn()
      .mockRejectedValue(new Error("offline"));
    const screen = render(
      <SalaryHomeReferenceScreen
        variableExpenseApi={{ createVariableExpense }}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "변동 지출 추가하기" }));
    fireEvent.changeText(
      screen.getByTestId("variable-expense-category-input"),
      "외식",
    );
    fireEvent.changeText(
      screen.getByTestId("variable-expense-content-input"),
      "Rejected lunch",
    );
    fireEvent.changeText(
      screen.getByTestId("variable-expense-amount-input"),
      "12000",
    );
    fireEvent.press(screen.getByTestId("variable-expense-save-button"));

    await waitFor(() => expect(createVariableExpense).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Rejected lunch")).toBeNull();
    expect(
      screen.getByText(
        "\uC11C\uBC84 \uC800\uC7A5\uC774 \uC2E4\uD328\uD574 \uC9C0\uCD9C\uC744 \uBC18\uC601\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.",
      ),
    ).toBeTruthy();
  });

  it("submits variable expense edits to the server-authoritative API before replacing the preview row", async () => {
    const updateVariableExpense = jest.fn().mockResolvedValue({
      adTargetingSeparated: true,
      amountMinor: 18000,
      category: "CONTENT",
      dailyBudgetId: null,
      expenseId: "variable-game",
      financialRawDataExposed: false,
      memo: null,
      merchantName: "게임",
      netAmountMinor: 18000,
      paymentMethod: "ETC",
      serverAuthority: true,
      source: "MANUAL",
      spentAt: "2026-07-13T01:00:00.000Z",
      status: "POSTED",
      title: "게임 패스 변경",
    });
    const screen = render(
      <SalaryHomeReferenceScreen
        variableExpenseApi={{ updateVariableExpense } as never}
      />,
    );

    fireEvent.press(screen.getByTestId("variable-expense-edit-variable-game"));
    fireEvent.changeText(
      screen.getByTestId("variable-expense-category-input"),
      "게임",
    );
    fireEvent.changeText(
      screen.getByTestId("variable-expense-content-input"),
      "게임 패스 변경",
    );
    fireEvent.changeText(
      screen.getByTestId("variable-expense-amount-input"),
      "18000",
    );
    fireEvent.press(screen.getByTestId("variable-expense-save-button"));

    await waitFor(() => expect(updateVariableExpense).toHaveBeenCalledTimes(1));
    expect(updateVariableExpense).toHaveBeenCalledWith(
      "variable-game",
      expect.objectContaining({
        amountMinor: 18000,
        category: "CONTENT",
        merchantName: "게임",
        paymentMethod: "ETC",
        title: "게임 패스 변경",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText("게임 패스 변경")).toBeTruthy(),
    );
    expect(screen.queryByText("폴드센스 파스콘 구입")).toBeNull();
  });

  it("submits variable expense deletes to the server-authoritative API before removing the preview row", async () => {
    const deleteVariableExpense = jest.fn().mockResolvedValue({
      adTargetingSeparated: true,
      expenseId: "variable-game",
      financialRawDataExposed: false,
      serverAuthority: true,
      status: "DELETED",
    });
    const screen = render(
      <SalaryHomeReferenceScreen
        variableExpenseApi={{ deleteVariableExpense } as never}
      />,
    );

    expect(screen.getByText("폴드센스 파스콘 구입")).toBeTruthy();
    fireEvent.press(
      screen.getByTestId("variable-expense-delete-variable-game"),
    );

    await waitFor(() => expect(deleteVariableExpense).toHaveBeenCalledTimes(1));
    expect(deleteVariableExpense).toHaveBeenCalledWith("variable-game", {
      reason: "USER_REQUESTED_DELETE",
    });
    await waitFor(() =>
      expect(screen.queryByText("폴드센스 파스콘 구입")).toBeNull(),
    );
  });

  it("removes a fixed plan reminder from the current month after the user marks it completed", () => {
    const screen = render(<SalaryHomeReferenceScreen />);

    expect(screen.getByText("ChatGPT")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: /ChatGPT 사용 완료 처리$/u }),
    );

    expect(screen.queryByText("ChatGPT")).toBeNull();
  });

  it("does not show future-dated fixed or savings reminders before their scheduled KST day", () => {
    jest.useFakeTimers({ now: new Date("2026-07-14T03:00:00.000Z") });
    const seeded = getPreviewState();
    const fixedCategory = seeded.planItems.find(
      (item) => item.section === "fixed",
    )?.category;
    const savingCategory = seeded.planItems.find(
      (item) => item.section === "saving",
    )?.category;
    if (!fixedCategory || !savingCategory) {
      throw new Error("Seeded fixed and saving categories are required");
    }
    const rows: readonly PlanItem[] = [
      {
        amount: 32000,
        category: fixedCategory,
        content: "TodayDue",
        day: 10,
        id: "fixed-today-due",
        section: "fixed",
      },
      {
        amount: 200000,
        category: savingCategory,
        content: "FutureSaving",
        day: 25,
        id: "saving-future-hidden",
        section: "saving",
      },
    ];
    updatePreviewState((previous) => ({
      ...previous,
      planItems: rows,
    }));

    const screen = render(<SalaryHomeReferenceScreen />);

    expect(screen.getByText("TodayDue")).toBeTruthy();
    expect(screen.queryByText("FutureSaving")).toBeNull();
    jest.useRealTimers();
  });

  it("records fixed plan reminder completion through the server-authoritative plan API before hiding it", async () => {
    const recordFixedExpensePayment = jest.fn().mockResolvedValue({
      amountMinor: 32000,
      category: "구독",
      dueDay: 10,
      dueLabel: "10일",
      financialRawDataExposed: false,
      id: "plan-fixed-chatgpt",
      lastPaidAt: "2026-07-13T00:00:00.000Z",
      paidTotalMinor: 32000,
      serverAuthority: true,
      status: "ACTIVE",
      title: "ChatGPT",
    });
    const screen = render(
      <SalaryHomeReferenceScreen
        planCommitmentsApi={{ recordFixedExpensePayment }}
      />,
    );

    expect(screen.getByText("ChatGPT")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: /ChatGPT 사용 완료 처리$/u }),
    );

    await waitFor(() =>
      expect(recordFixedExpensePayment).toHaveBeenCalledWith(
        "plan-fixed-chatgpt",
        expect.objectContaining({
          amountMinor: 32000,
          idempotencyKey: expect.stringContaining(
            "fixed-payment-plan-fixed-chatgpt-",
          ),
          memo: "Salary Home fixed reminder completed",
          paidAt: expect.any(String),
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByText("ChatGPT")).toBeNull());
  });

  it("records fixed savings reminders through the server-authoritative savings API before hiding them", async () => {
    jest.useFakeTimers({ now: new Date("2026-07-25T03:00:00.000Z") });
    const recordSavingsDeposit = jest.fn().mockResolvedValue({
      currentAmountMinor: 200000,
      financialRawAccountDataExposed: false,
      fixedSaveAmountMinor: 200000,
      goalType: "적금",
      id: "plan-saving-travel",
      serverAuthority: true,
      status: "ACTIVE",
      targetAmountMinor: 200000,
      title: "여행, 방학",
    });
    const screen = render(
      <SalaryHomeReferenceScreen
        planCommitmentsApi={{ recordSavingsDeposit } as never}
      />,
    );

    expect(screen.getByText("여행, 방학")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: "여행, 방학 사용 완료 처리" }),
    );

    await waitFor(() =>
      expect(recordSavingsDeposit).toHaveBeenCalledWith(
        "plan-saving-travel",
        expect.objectContaining({
          amountMinor: 200000,
          idempotencyKey: expect.stringContaining(
            "savings-deposit-plan-saving-travel-",
          ),
          memo: "Salary Home savings reminder completed",
          occurredAt: expect.any(String),
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByText("여행, 방학")).toBeNull());
  });
});
