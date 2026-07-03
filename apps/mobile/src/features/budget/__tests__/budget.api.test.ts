import { createBudgetApi } from "../api";

describe("budget api", () => {
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
