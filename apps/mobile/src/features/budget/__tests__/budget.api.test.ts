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
