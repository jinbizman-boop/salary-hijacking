import { createBudgetApi } from "../api";
import { BUDGET_RISK_LABELS, BUDGET_SAFE_ERROR_MESSAGE } from "../constants";
import { formatBudgetSyncTime, redactBudgetError } from "../utils";

describe("budget api", () => {
  it("keeps budget status and safe error copy readable in Korean", () => {
    expect(BUDGET_RISK_LABELS).toEqual({
      SAFE: "안전",
      WATCH: "관찰 필요",
      WARNING: "주의",
      OVER: "예산 초과",
    });
    expect(BUDGET_SAFE_ERROR_MESSAGE).toBe(
      "예산 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
    expect(redactBudgetError({ status: 401 })).toBe("로그인이 필요합니다.");
    expect(redactBudgetError({ status: 409 })).toBe(
      "예산 상태가 변경되었습니다. 새로고침해 주세요.",
    );
    expect(formatBudgetSyncTime("not-a-date")).toBe("동기화 시간 확인 필요");
  });

  it("allows the Android emulator loopback API base for native E2E fallback", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: null }), {
          status: 200,
        }),
      );
    const api = createBudgetApi({
      baseUrl: "http://10.0.2.2:8787",
      fetcher,
      platform: "android",
    });

    await expect(api.getToday()).resolves.toBeNull();
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "http://10.0.2.2:8787/api/v1/daily-budgets/today",
    );
  });

  it("normalizes the server-authoritative daily budget without exposing raw data", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              budgetDate: "2026-06-25",
              plannedAmountMinor: 10_000,
              adjustmentAmountMinor: 0,
              availableAmountMinor: 10_000,
              spentAmountMinor: 12_000,
              remainingAmountMinor: -2_000,
              usageRate: 1.2,
              status: "OVERSPENT",
              updatedAt: "2026-06-25T08:30:00.000Z",
              serverAuthority: true,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
      createCorrelationId: () => "budget-correlation-1",
    });

    const result = await api.getToday();

    expect(result?.data.snapshot).toMatchObject({
      date: "2026-06-25",
      dailyLimit: 10_000,
      spentToday: 12_000,
      remainingToday: 0,
      overspentAmount: 2_000,
      usageRate: 120,
      riskLevel: "OVER",
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.test/api/v1/daily-budgets/today");
    expect(init?.credentials).toBe("include");
    expect(new Headers(init?.headers).get("x-raw-financial-data-exposed")).toBe(
      "false",
    );
    expect(new Headers(init?.headers).get("x-raw-personal-data-exposed")).toBe(
      "false",
    );
    expect(
      new Headers(init?.headers).get("x-ad-financial-targeting-used"),
    ).toBe("false");
  });

  it("validates recalculation requests before sending them", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              periodStartDate: "2026-06-25",
              periodEndDate: "2026-07-24",
              totalDays: 30,
              createdOrUpdatedCount: 30,
              skippedCount: 0,
              serverAuthority: true,
            },
          }),
          { status: 200 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "ios",
    });

    await expect(
      api.recalculate({
        periodStartDate: "2026-06-25",
        periodEndDate: "2026-07-24",
        availableAmountMinor: -1,
        alreadySpentAmountMinor: 0,
        carryOverAmountMinor: 0,
        overwriteExisting: false,
        memo: null,
      }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_RECALCULATE_REQUEST" });
    expect(fetcher).not.toHaveBeenCalled();

    await api.recalculate({
      periodStartDate: "2026-06-25",
      periodEndDate: "2026-07-24",
      availableAmountMinor: 300_000,
      alreadySpentAmountMinor: 0,
      carryOverAmountMinor: 0,
      overwriteExisting: false,
      memo: null,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      periodStartDate: "2026-06-25",
      periodEndDate: "2026-07-24",
      availableAmountMinor: 300_000,
      alreadySpentAmountMinor: 0,
      carryOverAmountMinor: 0,
      overwriteExisting: false,
      memo: null,
    });
  });

  it("rejects recalculation memo values with raw sensitive data before network access", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [input: URL | RequestInfo, init?: RequestInit]
    >();
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "ios",
    });

    await expect(
      api.recalculate({
        periodStartDate: "2026-06-25",
        periodEndDate: "2026-07-24",
        availableAmountMinor: 300_000,
        alreadySpentAmountMinor: 0,
        carryOverAmountMinor: 0,
        overwriteExisting: false,
        memo: "recalculate for account 123-456-789",
      }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_RECALCULATE_REQUEST" });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects unknown recalculation fields before they can enter budget payloads", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              createdOrUpdatedCount: 30,
              periodEndDate: "2026-07-24",
              periodStartDate: "2026-06-25",
              serverAuthority: true,
              skippedCount: 0,
              totalDays: 30,
            },
          }),
          { status: 200 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "ios",
    });

    await expect(
      api.recalculate({
        periodStartDate: "2026-06-25",
        periodEndDate: "2026-07-24",
        availableAmountMinor: 300_000,
        alreadySpentAmountMinor: 0,
        carryOverAmountMinor: 0,
        overwriteExisting: false,
        memo: null,
        rawSalaryMemo: "salary 2,700,000",
      } as never),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_RECALCULATE_REQUEST" });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("saves today's daily budget through create or update without raw data exposure", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              budgetId: "budget_today",
              budgetDate: "2026-07-03",
              plannedAmountMinor: 25_000,
              availableAmountMinor: 25_000,
              spentAmountMinor: 5_000,
              remainingAmountMinor: 20_000,
              usageRate: 0.2,
              status: "ACTIVE",
              updatedAt: "2026-07-03T01:00:00.000Z",
              serverAuthority: true,
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              budgetId: "budget_today",
              budgetDate: "2026-07-03",
              plannedAmountMinor: 30_000,
              availableAmountMinor: 30_000,
              spentAmountMinor: 5_000,
              remainingAmountMinor: 25_000,
              usageRate: 0.1667,
              status: "ACTIVE",
              updatedAt: "2026-07-03T02:00:00.000Z",
              serverAuthority: true,
            },
          }),
          { status: 200 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      createCorrelationId: () => "daily-budget-save-test",
      fetcher,
      platform: "android",
    });

    await expect(
      api.saveDailyBudget({
        budgetDate: "2026-07-03",
        budgetId: null,
        memo: "mobile daily budget create",
        plannedAmountMinor: 25_000,
      }),
    ).resolves.toMatchObject({
      data: {
        snapshot: {
          budgetId: "budget_today",
          dailyLimit: 25_000,
          rawFinancialDataExposed: false,
        },
      },
    });
    await expect(
      api.saveDailyBudget({
        budgetDate: "2026-07-03",
        budgetId: "budget_today",
        memo: "mobile daily budget update",
        plannedAmountMinor: 30_000,
      }),
    ).resolves.toMatchObject({
      data: {
        snapshot: {
          budgetId: "budget_today",
          dailyLimit: 30_000,
        },
      },
    });
    await expect(
      api.saveDailyBudget({
        budgetDate: "2026-07-03",
        budgetId: null,
        memo: null,
        plannedAmountMinor: -1,
      }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_DAILY_BUDGET_SAVE" });

    expect(
      fetcher.mock.calls.map((call) => [call[0], call[1]?.method]),
    ).toEqual([
      ["https://api.example.test/api/v1/daily-budgets", "POST"],
      ["https://api.example.test/api/v1/daily-budgets/budget_today", "PATCH"],
    ]);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      budgetDate: "2026-07-03",
      memo: "mobile daily budget create",
      plannedAmountMinor: 25_000,
      source: "MANUAL",
    });
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      memo: "mobile daily budget update",
      plannedAmountMinor: 30_000,
    });
    for (const [, init] of fetcher.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get("x-raw-financial-data-exposed")).toBe("false");
      expect(headers.get("x-ad-financial-targeting-used")).toBe("false");
    }
  });

  it("rejects daily budget memo values with raw sensitive data before network access", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [input: URL | RequestInfo, init?: RequestInit]
    >();
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
    });

    await expect(
      api.saveDailyBudget({
        budgetDate: "2026-07-03",
        budgetId: null,
        memo: "budget owner user@example.com",
        plannedAmountMinor: 25_000,
      }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_DAILY_BUDGET_SAVE" });

    await expect(
      api.saveDailyBudget({
        budgetDate: "2026-07-03",
        budgetId: "budget_today",
        memo: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
        plannedAmountMinor: 30_000,
      }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_DAILY_BUDGET_SAVE" });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects unknown daily budget save fields before they can enter budget payloads", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              availableAmountMinor: 25_000,
              budgetDate: "2026-07-03",
              budgetId: "budget_today",
              plannedAmountMinor: 25_000,
              remainingAmountMinor: 20_000,
              serverAuthority: true,
              spentAmountMinor: 5_000,
              status: "ACTIVE",
              updatedAt: "2026-07-03T01:00:00.000Z",
              usageRate: 0.2,
            },
          }),
          { status: 200 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
    });

    await expect(
      api.saveDailyBudget({
        budgetDate: "2026-07-03",
        budgetId: null,
        memo: "mobile daily budget create",
        plannedAmountMinor: 25_000,
        rawSalaryMemo: "salary 2,700,000",
      } as never),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_DAILY_BUDGET_SAVE" });

    await expect(
      api.saveDailyBudget({
        accountNumber: "123-456-789012",
        budgetDate: "2026-07-03",
        budgetId: "budget_today",
        memo: "mobile daily budget update",
        plannedAmountMinor: 30_000,
      } as never),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_DAILY_BUDGET_SAVE" });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("creates a server-authoritative variable expense before local preview fallback", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              expenseId: "vex_123",
              amountMinor: 5_000,
              category: "MEAL",
              title: "점심",
              spentAt: "2026-07-02T03:00:00.000Z",
              paymentMethod: "CARD",
              merchantName: null,
              memo: null,
              dailyBudgetId: null,
              source: "MANUAL",
              status: "POSTED",
              netAmountMinor: 5_000,
              serverAuthority: true,
              financialRawDataExposed: false,
              adTargetingSeparated: true,
            },
          }),
          { status: 201 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
      createCorrelationId: () => "expense-correlation-1",
    });

    await expect(
      api.createVariableExpense({
        amountMinor: 5_000,
        category: "MEAL",
        dailyBudgetId: null,
        idempotencyKey: "mobile-expense-1",
        memo: null,
        merchantName: null,
        paymentMethod: "CARD",
        receiptAttachmentId: null,
        source: "MANUAL",
        spentAt: "2026-07-02T03:00:00.000Z",
        tags: [],
        title: "점심",
      }),
    ).resolves.toMatchObject({
      amountMinor: 5_000,
      expenseId: "vex_123",
      serverAuthority: true,
      financialRawDataExposed: false,
    });

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.test/api/v1/variable-expenses");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("x-raw-financial-data-exposed")).toBe(
      "false",
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      amountMinor: 5_000,
      category: "MEAL",
      dailyBudgetId: null,
      idempotencyKey: "mobile-expense-1",
      memo: null,
      merchantName: null,
      paymentMethod: "CARD",
      receiptAttachmentId: null,
      source: "MANUAL",
      spentAt: "2026-07-02T03:00:00.000Z",
      tags: [],
      title: "점심",
    });
  });

  it("normalizes variable expense enum fields before mutation requests", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              expenseId: "vex_enum_1",
              amountMinor: 5_000,
              category: "MEAL",
              title: "Lunch",
              spentAt: "2026-07-02T03:00:00.000Z",
              paymentMethod: "CARD",
              merchantName: null,
              memo: null,
              dailyBudgetId: null,
              source: "MANUAL",
              status: "POSTED",
              netAmountMinor: 5_000,
              serverAuthority: true,
              financialRawDataExposed: false,
              adTargetingSeparated: true,
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              expenseId: "vex_enum_1",
              amountMinor: 5_500,
              category: "CAFE",
              title: "Coffee",
              spentAt: "2026-07-02T04:00:00.000Z",
              paymentMethod: "PAY",
              merchantName: null,
              memo: null,
              dailyBudgetId: null,
              source: "MANUAL",
              status: "POSTED",
              netAmountMinor: 5_500,
              serverAuthority: true,
              financialRawDataExposed: false,
              adTargetingSeparated: true,
            },
          }),
          { status: 200 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
    });

    await expect(
      api.createVariableExpense({
        amountMinor: 5_000,
        category: "meal" as never,
        dailyBudgetId: null,
        idempotencyKey: "mobile-expense-enum-create",
        memo: null,
        merchantName: null,
        paymentMethod: "card" as never,
        receiptAttachmentId: null,
        source: "manual" as never,
        spentAt: "2026-07-02T03:00:00.000Z",
        tags: [],
        title: "Lunch",
      }),
    ).resolves.toMatchObject({
      category: "MEAL",
      expenseId: "vex_enum_1",
      paymentMethod: "CARD",
    });
    await expect(
      api.updateVariableExpense("vex_enum_1", {
        amountMinor: 5_500,
        category: "cafe" as never,
        paymentMethod: "pay" as never,
        title: "Coffee",
      }),
    ).resolves.toMatchObject({
      category: "CAFE",
      expenseId: "vex_enum_1",
      paymentMethod: "PAY",
    });

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({
      category: "MEAL",
      paymentMethod: "CARD",
      source: "MANUAL",
    });
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toMatchObject({
      category: "CAFE",
      paymentMethod: "PAY",
    });
  });

  it("lists server-authoritative variable expenses for salary home hydration", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              items: [
                {
                  expenseId: "vex_list_1",
                  amountMinor: 6500,
                  category: "MEAL",
                  title: "Lunch",
                  spentAt: "2026-07-02T03:00:00.000Z",
                  paymentMethod: "CARD",
                  merchantName: null,
                  memo: null,
                  dailyBudgetId: null,
                  source: "MANUAL",
                  status: "POSTED",
                  netAmountMinor: 6500,
                  serverAuthority: true,
                  financialRawDataExposed: false,
                  adTargetingSeparated: true,
                },
              ],
              page: 1,
              pageSize: 20,
              total: 1,
            },
          }),
          { status: 200 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
    });

    await expect(
      api.listVariableExpenses({ page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({
      items: [
        {
          amountMinor: 6500,
          expenseId: "vex_list_1",
          serverAuthority: true,
          financialRawDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.example.test/api/v1/variable-expenses?page=1&pageSize=20",
    );
    expect(init?.method).toBeUndefined();
    expect(new Headers(init?.headers).get("x-raw-financial-data-exposed")).toBe(
      "false",
    );
  });

  it("rejects variable expense search queries with raw sensitive values before network access", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [input: URL | RequestInfo, init?: RequestInit]
    >();
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
    });

    await expect(
      api.listVariableExpenses({
        page: 1,
        pageSize: 20,
        q: "find receipt from user@example.com",
      }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_VARIABLE_EXPENSE_LIST" });

    await expect(
      api.listVariableExpenses({
        page: 1,
        pageSize: 20,
        q: "010-1234-5678",
      }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_VARIABLE_EXPENSE_LIST" });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects unknown variable expense list fields before URL construction", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [input: URL | RequestInfo, init?: RequestInit]
    >();
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
    });

    await expect(
      api.listVariableExpenses({
        page: 1,
        pageSize: 20,
        accountNumber: "123-456-789012",
      } as never),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_VARIABLE_EXPENSE_LIST" });

    await expect(
      api.listVariableExpenses({
        page: 1,
        pageSize: 20,
        rawSalaryMemo: "salary 2,700,000",
      } as never),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_VARIABLE_EXPENSE_LIST" });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects invalid variable expense ids returned by the server", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              expenseId: "../vex_123",
              amountMinor: 5_000,
              category: "MEAL",
              title: "Lunch",
              spentAt: "2026-07-02T03:00:00.000Z",
              paymentMethod: "CARD",
              merchantName: null,
              memo: null,
              dailyBudgetId: null,
              source: "MANUAL",
              status: "POSTED",
              netAmountMinor: 5_000,
              serverAuthority: true,
              financialRawDataExposed: false,
              adTargetingSeparated: true,
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              items: [
                {
                  expenseId: "vex_123\r\nAuthorization",
                  amountMinor: 6500,
                  category: "MEAL",
                  title: "Lunch",
                  spentAt: "2026-07-02T03:00:00.000Z",
                  paymentMethod: "CARD",
                  merchantName: null,
                  memo: null,
                  dailyBudgetId: null,
                  source: "MANUAL",
                  status: "POSTED",
                  netAmountMinor: 6500,
                  serverAuthority: true,
                  financialRawDataExposed: false,
                  adTargetingSeparated: true,
                },
              ],
              page: 1,
              pageSize: 20,
              total: 1,
            },
          }),
          { status: 200 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
    });

    await expect(
      api.createVariableExpense({
        amountMinor: 5_000,
        category: "MEAL",
        dailyBudgetId: null,
        idempotencyKey: "mobile-expense-invalid-server-id",
        memo: null,
        merchantName: null,
        paymentMethod: "CARD",
        receiptAttachmentId: null,
        source: "MANUAL",
        spentAt: "2026-07-02T03:00:00.000Z",
        tags: [],
        title: "Lunch",
      }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_RESPONSE" });
    await expect(
      api.listVariableExpenses({ page: 1, pageSize: 20 }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_RESPONSE" });
  });

  it("rejects variable expense response titles with raw sensitive values", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              items: [
                {
                  expenseId: "vex_sensitive_title",
                  amountMinor: 6500,
                  category: "MEAL",
                  title: "card 1234-5678-9012-3456",
                  spentAt: "2026-07-02T03:00:00.000Z",
                  paymentMethod: "CARD",
                  merchantName: null,
                  memo: null,
                  dailyBudgetId: null,
                  source: "MANUAL",
                  status: "POSTED",
                  netAmountMinor: 6500,
                  serverAuthority: true,
                  financialRawDataExposed: false,
                  adTargetingSeparated: true,
                },
              ],
              page: 1,
              pageSize: 20,
              total: 1,
            },
          }),
          { status: 200 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
    });

    await expect(
      api.listVariableExpenses({ page: 1, pageSize: 20 }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_RESPONSE" });
  });

  it("updates and deletes server-authoritative variable expenses without raw financial leakage", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              expenseId: "vex_edit_1",
              amountMinor: 7000,
              category: "ETC",
              title: "Corrected expense",
              spentAt: "2026-07-02T03:00:00.000Z",
              paymentMethod: "ETC",
              merchantName: null,
              memo: null,
              dailyBudgetId: null,
              source: "MANUAL",
              status: "POSTED",
              netAmountMinor: 7000,
              serverAuthority: true,
              financialRawDataExposed: false,
              adTargetingSeparated: true,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              expenseId: "vex_edit_1",
              status: "DELETED",
              serverAuthority: true,
              financialRawDataExposed: false,
              adTargetingSeparated: true,
            },
          }),
          { status: 200 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "ios",
    });

    await expect(
      api.updateVariableExpense("vex_edit_1", {
        amountMinor: 7000,
        memo: "mobile correction",
        title: "Corrected expense",
      }),
    ).resolves.toMatchObject({
      amountMinor: 7000,
      expenseId: "vex_edit_1",
      serverAuthority: true,
    });
    await expect(
      api.deleteVariableExpense("vex_edit_1", {
        reason: "mobile user deleted variable expense",
      }),
    ).resolves.toMatchObject({
      expenseId: "vex_edit_1",
      status: "DELETED",
      serverAuthority: true,
      financialRawDataExposed: false,
    });

    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/api/v1/variable-expenses/vex_edit_1",
    );
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      amountMinor: 7000,
      memo: "mobile correction",
      title: "Corrected expense",
    });
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "https://api.example.test/api/v1/variable-expenses/vex_edit_1",
    );
    expect(fetcher.mock.calls[1]?.[1]?.method).toBe("DELETE");
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      reason: "mobile user deleted variable expense",
    });
  });

  it("rejects invalid variable expense payloads before network access", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [input: URL | RequestInfo, init?: RequestInit]
    >();
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "ios",
    });

    await expect(
      api.createVariableExpense({
        amountMinor: 0,
        category: "MEAL",
        dailyBudgetId: null,
        idempotencyKey: "bad-expense",
        memo: null,
        merchantName: null,
        paymentMethod: "CARD",
        receiptAttachmentId: null,
        source: "MANUAL",
        spentAt: "2026-07-02T03:00:00.000Z",
        tags: [],
        title: "점심",
      }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_VARIABLE_EXPENSE" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects unknown variable expense fields before they can enter budget payloads", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              adTargetingSeparated: true,
              amountMinor: 5_000,
              category: "MEAL",
              dailyBudgetId: null,
              expenseId: "vex_guard_1",
              financialRawDataExposed: false,
              merchantName: null,
              memo: null,
              netAmountMinor: 5_000,
              paymentMethod: "CARD",
              source: "MANUAL",
              spentAt: "2026-07-02T03:00:00.000Z",
              status: "POSTED",
              title: "Lunch",
              serverAuthority: true,
            },
          }),
          { status: 200 },
        ),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "ios",
    });

    await expect(
      api.createVariableExpense({
        amountMinor: 5_000,
        category: "MEAL",
        dailyBudgetId: null,
        idempotencyKey: "unknown-expense-create",
        memo: null,
        merchantName: null,
        paymentMethod: "CARD",
        rawSalaryMemo: "salary 2,700,000",
        receiptAttachmentId: null,
        source: "MANUAL",
        spentAt: "2026-07-02T03:00:00.000Z",
        tags: [],
        title: "Lunch",
      } as never),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_VARIABLE_EXPENSE" });

    await expect(
      api.updateVariableExpense("vex_guard_1", {
        amountMinor: 5_000,
        accountNumber: "123-456-7890",
        title: "Lunch",
      } as never),
    ).rejects.toMatchObject({
      code: "BUDGET_INVALID_VARIABLE_EXPENSE_UPDATE",
    });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects variable expense text fields with raw sensitive values before network access", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [input: URL | RequestInfo, init?: RequestInit]
    >();
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "ios",
    });

    await expect(
      api.createVariableExpense({
        amountMinor: 5_000,
        category: "MEAL",
        dailyBudgetId: null,
        idempotencyKey: "sensitive-expense-create",
        memo: "receipt owner user@example.com",
        merchantName: null,
        paymentMethod: "CARD",
        receiptAttachmentId: null,
        source: "MANUAL",
        spentAt: "2026-07-02T03:00:00.000Z",
        tags: ["010-1234-5678"],
        title: "Lunch",
      }),
    ).rejects.toMatchObject({ code: "BUDGET_INVALID_VARIABLE_EXPENSE" });

    await expect(
      api.updateVariableExpense("vex_edit_1", {
        memo: "card 1234-5678-9012-3456",
        title: "Corrected expense",
      }),
    ).rejects.toMatchObject({
      code: "BUDGET_INVALID_VARIABLE_EXPENSE_UPDATE",
    });

    await expect(
      api.deleteVariableExpense("vex_edit_1", {
        reason:
          "Authorization Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
      }),
    ).rejects.toMatchObject({
      code: "BUDGET_INVALID_VARIABLE_EXPENSE_DELETE",
    });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects invalid variable expense path ids before network access", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [input: URL | RequestInfo, init?: RequestInit]
    >();
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "ios",
    });

    await expect(
      api.updateVariableExpense("vex_edit_1@example.com", {
        memo: "mobile correction",
      }),
    ).rejects.toMatchObject({
      code: "BUDGET_INVALID_VARIABLE_EXPENSE_ID",
    });

    await expect(
      api.deleteVariableExpense("vex_edit_1\r\nAuthorization", {
        reason: "mobile user deleted variable expense",
      }),
    ).rejects.toMatchObject({
      code: "BUDGET_INVALID_VARIABLE_EXPENSE_ID",
    });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("records a privacy-safe checked event without financial values", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { accepted: true } }), {
          status: 202,
        }),
      );
    const api = createBudgetApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "web",
    });

    await api.recordChecked();

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.test/api/v1/growth/events");
    const payload = String(init?.body);
    expect(payload).toContain("DAILY_BUDGET_CHECKED");
    expect(payload).not.toMatch(
      /dailyLimit|spentToday|remainingToday|amountMinor/i,
    );
  });
});
