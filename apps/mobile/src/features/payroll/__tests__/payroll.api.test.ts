import { createPayrollApi } from "../api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

const currentPlan = {
  planId: "plan_2026_07",
  title: "2026년 7월 급여 계획",
  incomeType: "NET",
  payrollCycle: "MONTHLY",
  payrollAmountMinor: 2_700_000,
  payday: 25,
  firstPayrollDate: "2026-07-25",
  periodStartDate: "2026-07-01",
  periodEndDate: "2026-07-31",
  fixedExpenseTotalMinor: 650_000,
  fixedSavingsTotalMinor: 500_000,
  variableExpenseReserveMinor: 620_000,
  emergencyBufferMinor: 100_000,
  carryOverAmountMinor: 50_000,
  reservePolicy: "ZERO_BASE",
  memo: null,
  status: "ACTIVE",
  calculation: {
    periodStartDate: "2026-07-01",
    periodEndDate: "2026-07-31",
    dayCount: 31,
    payrollAmountMinor: 2_700_000,
    fixedExpenseTotalMinor: 650_000,
    fixedSavingsTotalMinor: 500_000,
    variableExpenseReserveMinor: 620_000,
    emergencyBufferMinor: 100_000,
    carryOverAmountMinor: 50_000,
    alreadySpentAmountMinor: 0,
    totalDeductionsMinor: 1_870_000,
    availableBeforeSpentMinor: 880_000,
    availableForDailyBudgetMinor: 880_000,
    recommendedDailyBudgetMinor: 28_387,
    remainderMinor: 3,
    hijackRate: 0.6926,
    serverAuthority: true,
    financialRawDataExposed: false,
  },
  serverAuthority: true,
  financialRawDataExposed: false,
  adTargetingSeparated: true,
};

describe("payroll api", () => {
  it("normalizes the server-authoritative current payroll plan with privacy headers", async () => {
    const calls: Request[] = [];
    const api = createPayrollApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "payroll-test-correlation",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: currentPlan });
      },
      platform: "ios",
    });

    const result = await api.getCurrent();

    expect(result).toMatchObject({
      planId: "plan_2026_07",
      payrollAmountMinor: 2_700_000,
      calculation: {
        availableForDailyBudgetMinor: 880_000,
        recommendedDailyBudgetMinor: 28_387,
        serverAuthority: true,
        financialRawDataExposed: false,
      },
      serverAuthority: true,
      financialRawDataExposed: false,
      adTargetingSeparated: true,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/payroll/current",
    );
    expect(calls[0]?.headers.get("x-correlation-id")).toBe(
      "payroll-test-correlation",
    );
    expect(calls[0]?.headers.get("x-client-platform")).toBe("ios");
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
    expect(calls[0]?.headers.get("x-idempotency-key")).toBeNull();
    expect(JSON.stringify(result)).not.toContain("userId");
  });

  it("rejects unsafe payroll plan ids returned by the server", async () => {
    const api = createPayrollApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            ...currentPlan,
            planId: "../plan_2026_07",
          },
        }),
      platform: "android",
    });

    await expect(api.getCurrent()).rejects.toMatchObject({
      code: "PAYROLL_INVALID_RESPONSE",
    });
  });

  it("rejects payroll response title and memo values with raw sensitive data", async () => {
    const currentApi = createPayrollApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            ...currentPlan,
            title: "card 1234-5678-9012-3456 payroll",
          },
        }),
      platform: "android",
    });
    const recalculationApi = createPayrollApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            calculation: currentPlan.calculation,
            updatedPlan: {
              ...currentPlan,
              memo: "owner user@example.com",
            },
            overwritePlan: true,
            reason: "mobile plan preview",
            serverAuthority: true,
          },
        }),
      platform: "ios",
    });

    await expect(currentApi.getCurrent()).rejects.toMatchObject({
      code: "PAYROLL_INVALID_RESPONSE",
    });
    await expect(
      recalculationApi.recalculate({
        alreadySpentAmountMinor: 0,
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        overwritePlan: true,
        payrollAmountMinor: 2_700_000,
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: "plan_2026_07",
        reason: "mobile plan preview",
        variableExpenseReserveMinor: 620_000,
      }),
    ).rejects.toMatchObject({ code: "PAYROLL_INVALID_RESPONSE" });
  });

  it("posts a valid recalculation request and rejects invalid money before network access", async () => {
    const calls: Request[] = [];
    const api = createPayrollApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "payroll-recalculate-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            calculation: currentPlan.calculation,
            updatedPlan: currentPlan,
            overwritePlan: false,
            reason: "mobile plan preview",
            serverAuthority: true,
          },
        });
      },
      platform: "android",
    });

    await expect(
      api.recalculate({
        alreadySpentAmountMinor: 0,
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        overwritePlan: false,
        payrollAmountMinor: 2_700_000,
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: "plan_2026_07",
        reason: "mobile plan preview",
        variableExpenseReserveMinor: 620_000,
      }),
    ).resolves.toMatchObject({
      calculation: {
        availableForDailyBudgetMinor: 880_000,
        serverAuthority: true,
      },
      overwritePlan: false,
      serverAuthority: true,
    });

    await expect(
      api.recalculate({
        alreadySpentAmountMinor: 0,
        carryOverAmountMinor: 0,
        emergencyBufferMinor: 0,
        fixedExpenseTotalMinor: -1,
        fixedSavingsTotalMinor: 0,
        overwritePlan: false,
        payrollAmountMinor: 2_700_000,
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: null,
        reason: null,
        variableExpenseReserveMinor: 0,
      }),
    ).rejects.toMatchObject({ code: "PAYROLL_INVALID_RECALCULATE_REQUEST" });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/payroll/recalculate",
    );
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.headers.get("x-idempotency-key")).toMatch(
      /^mobile-payroll-payroll-recalculate-test-post-[a-z0-9]+$/u,
    );
  });

  it("saves a payroll plan through create or update without exposing raw data", async () => {
    const calls: Request[] = [];
    const api = createPayrollApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "payroll-save-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse(
          { data: currentPlan },
          normalized.method === "POST" ? 201 : 200,
        );
      },
      platform: "android",
    });

    await expect(
      api.savePlan({
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        firstPayrollDate: "2026-07-25",
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        incomeType: "NET",
        memo: "mobile payroll save",
        payday: 25,
        payrollAmountMinor: 2_700_000,
        payrollCycle: "MONTHLY",
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: null,
        reservePolicy: "ZERO_BASE",
        title: "July payroll plan",
        variableExpenseReserveMinor: 620_000,
      }),
    ).resolves.toMatchObject({
      payrollAmountMinor: 2_700_000,
      serverAuthority: true,
      financialRawDataExposed: false,
      adTargetingSeparated: true,
    });

    await expect(
      api.savePlan({
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        firstPayrollDate: "2026-07-25",
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        incomeType: "NET",
        memo: "mobile payroll update",
        payday: 25,
        payrollAmountMinor: 2_700_000,
        payrollCycle: "MONTHLY",
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: "plan_2026_07",
        reservePolicy: "ZERO_BASE",
        title: "July payroll plan",
        variableExpenseReserveMinor: 620_000,
      }),
    ).resolves.toMatchObject({
      planId: "plan_2026_07",
      serverAuthority: true,
    });

    await expect(
      api.savePlan({
        carryOverAmountMinor: 0,
        emergencyBufferMinor: 0,
        firstPayrollDate: "2026-07-25",
        fixedExpenseTotalMinor: 0,
        fixedSavingsTotalMinor: 0,
        incomeType: "NET",
        memo: null,
        payday: 25,
        payrollAmountMinor: 0,
        payrollCycle: "MONTHLY",
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: null,
        reservePolicy: "ZERO_BASE",
        title: "Bad payroll plan",
        variableExpenseReserveMinor: 0,
      }),
    ).rejects.toMatchObject({ code: "PAYROLL_INVALID_SAVE_REQUEST" });

    expect(calls.map((call) => [call.method, call.url])).toEqual([
      ["POST", "https://api.salaryhijacking.com/api/v1/payroll"],
      ["PATCH", "https://api.salaryhijacking.com/api/v1/payroll/plan_2026_07"],
    ]);
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
    for (const call of calls) {
      expect(call.headers.get("x-idempotency-key")).toMatch(
        /^mobile-payroll-payroll-save-test-(post|patch)-[a-z0-9]+$/u,
      );
    }
    expect(JSON.parse((await calls[0]?.clone().text()) ?? "{}")).toMatchObject({
      payrollAmountMinor: 2_700_000,
      payrollCycle: "MONTHLY",
      reservePolicy: "ZERO_BASE",
      title: "July payroll plan",
    });
  });

  it("rejects payroll plan text fields with raw sensitive data before network access", async () => {
    const calls: Request[] = [];
    const api = createPayrollApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: currentPlan });
      },
      platform: "android",
    });

    await expect(
      api.savePlan({
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        firstPayrollDate: "2026-07-25",
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        incomeType: "NET",
        memo: "payroll owner user@example.com",
        payday: 25,
        payrollAmountMinor: 2_700_000,
        payrollCycle: "MONTHLY",
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: null,
        reservePolicy: "ZERO_BASE",
        title: "July payroll plan",
        variableExpenseReserveMinor: 620_000,
      }),
    ).rejects.toMatchObject({ code: "PAYROLL_INVALID_SAVE_REQUEST" });

    await expect(
      api.savePlan({
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        firstPayrollDate: "2026-07-25",
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        incomeType: "NET",
        memo: null,
        payday: 25,
        payrollAmountMinor: 2_700_000,
        payrollCycle: "MONTHLY",
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: null,
        reservePolicy: "ZERO_BASE",
        title: "010-1234-5678 payroll plan",
        variableExpenseReserveMinor: 620_000,
      }),
    ).rejects.toMatchObject({ code: "PAYROLL_INVALID_SAVE_REQUEST" });

    await expect(
      api.recalculate({
        alreadySpentAmountMinor: 0,
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        overwritePlan: false,
        payrollAmountMinor: 2_700_000,
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: "plan_2026_07",
        reason: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
        variableExpenseReserveMinor: 620_000,
      }),
    ).rejects.toMatchObject({ code: "PAYROLL_INVALID_RECALCULATE_REQUEST" });

    expect(calls).toHaveLength(0);
  });

  it("rejects unknown payroll payload fields before they can reach server-authoritative APIs", async () => {
    const calls: Request[] = [];
    const api = createPayrollApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: currentPlan });
      },
      platform: "android",
    });

    await expect(
      api.savePlan({
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        firstPayrollDate: "2026-07-25",
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        incomeType: "NET",
        memo: null,
        payday: 25,
        payrollAmountMinor: 2_700_000,
        payrollCycle: "MONTHLY",
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: null,
        reservePolicy: "ZERO_BASE",
        title: "July payroll plan",
        userEmail: "owner@example.com",
        variableExpenseReserveMinor: 620_000,
      } as never),
    ).rejects.toMatchObject({ code: "PAYROLL_INVALID_SAVE_REQUEST" });

    await expect(
      api.recalculate({
        alreadySpentAmountMinor: 0,
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        overwritePlan: false,
        payrollAmountMinor: 2_700_000,
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: "plan_2026_07",
        rawSalaryMemo: "salary 2,700,000",
        reason: null,
        variableExpenseReserveMinor: 620_000,
      } as never),
    ).rejects.toMatchObject({ code: "PAYROLL_INVALID_RECALCULATE_REQUEST" });

    expect(calls).toHaveLength(0);
  });

  it("rejects unsafe payroll plan ids before network access", async () => {
    const calls: Request[] = [];
    const api = createPayrollApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: currentPlan });
      },
      platform: "android",
    });

    await expect(
      api.savePlan({
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        firstPayrollDate: "2026-07-25",
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        incomeType: "NET",
        memo: null,
        payday: 25,
        payrollAmountMinor: 2_700_000,
        payrollCycle: "MONTHLY",
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: "plan_2026_07@example.com",
        reservePolicy: "ZERO_BASE",
        title: "July payroll plan",
        variableExpenseReserveMinor: 620_000,
      }),
    ).rejects.toMatchObject({ code: "PAYROLL_INVALID_SAVE_REQUEST" });

    await expect(
      api.recalculate({
        alreadySpentAmountMinor: 0,
        carryOverAmountMinor: 50_000,
        emergencyBufferMinor: 100_000,
        fixedExpenseTotalMinor: 650_000,
        fixedSavingsTotalMinor: 500_000,
        overwritePlan: false,
        payrollAmountMinor: 2_700_000,
        periodEndDate: "2026-07-31",
        periodStartDate: "2026-07-01",
        planId: `plan_${"a".repeat(300)}`,
        reason: null,
        variableExpenseReserveMinor: 620_000,
      }),
    ).rejects.toMatchObject({
      code: "PAYROLL_INVALID_RECALCULATE_REQUEST",
    });

    expect(calls).toHaveLength(0);
  });
});
