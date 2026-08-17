import { describe, expect, it } from "vitest";
import { createNeonPayrollRepository } from "../src/repositories/payroll.repository";
import type {
  PayrollPlanCreateInput,
  PayrollRouteRuntime,
} from "../src/routes/payroll.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const planId = "22222222-2222-4222-8222-222222222222";

function createRuntime(): PayrollRouteRuntime<unknown> {
  return {
    request: new Request("https://api.test/api/v1/payroll"),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL("https://api.test/api/v1/payroll"),
    path: "/api/v1/payroll",
    relativePath: "/",
    method: "POST",
    requestId: "payroll-db-repository-test",
    now: new Date("2026-07-02T03:00:00.000Z"),
    principal: {
      userId,
      roles: ["USER"],
      permissions: [],
      policyId: null,
    },
    repository: {} as never,
  };
}

const createInput: PayrollPlanCreateInput = {
  title: "7월 급여 계획",
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
  memo: "mobile salary onboarding",
};

describe("Neon payroll repository", () => {
  it("creates a DB-backed payroll plan through payroll_plans without returning owner identifiers", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonPayrollRepository({
      query: async (sqlText, params, options) => {
        calls.push({
          operationName: options.operationName,
          sqlText,
          params,
        });
        if (options.operationName.endsWith(".create")) {
          return {
            rows: [
              {
                payroll_plan_id: planId,
                year_month: "2026-07",
                payday: 25,
                expected_salary_amount: "2700000",
                expected_expense_amount: "1370000",
                target_hijack_amount: "1870000",
                expected_hijack_amount: "1330000",
                confirmed_hijack_amount: "0",
                status: "DRAFT",
                created_at: "2026-07-02T03:00:00.000Z",
                updated_at: "2026-07-02T03:00:00.000Z",
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const created = await repository.createPlan(createInput, createRuntime());

    expect(created).toMatchObject({
      planId,
      title: "7월 급여 계획",
      payrollAmountMinor: 2_700_000,
      fixedExpenseTotalMinor: 650_000,
      fixedSavingsTotalMinor: 500_000,
      variableExpenseReserveMinor: 620_000,
      emergencyBufferMinor: 100_000,
      carryOverAmountMinor: 50_000,
      status: "DRAFT",
      serverAuthority: true,
      financialRawDataExposed: false,
    });
    expect(created).not.toHaveProperty("userId");
    expect(calls.map((call) => call.operationName)).toEqual(["payroll.create"]);
    expect(calls[0]?.sqlText).toContain("insert into public.payroll_plans");
    expect(calls[0]?.params).toContain(userId);
    expect(JSON.stringify(created)).not.toContain(userId);
  });

  it("stores payday-cycle plans under the payroll month, not the cycle start month", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonPayrollRepository({
      query: async (sqlText, params, options) => {
        calls.push({
          operationName: options.operationName,
          sqlText,
          params,
        });
        if (options.operationName.endsWith(".create")) {
          return {
            rows: [
              {
                payroll_plan_id: planId,
                year_month: "2026-09",
                payday: 25,
                expected_salary_amount: "2700000",
                expected_expense_amount: "1370000",
                target_hijack_amount: "1870000",
                expected_hijack_amount: "1330000",
                confirmed_hijack_amount: "0",
                status: "DRAFT",
                created_at: "2026-08-26T00:00:00.000Z",
                updated_at: "2026-08-26T00:00:00.000Z",
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    await repository.createPlan(
      {
        ...createInput,
        firstPayrollDate: "2026-09-25",
        periodStartDate: "2026-08-26",
        periodEndDate: "2026-09-25",
      },
      createRuntime(),
    );

    expect(calls[0]?.params[1]).toBe("2026-09");
  });

  it("closes payroll plans by recalculating once, locking daily budgets, and returning cumulative hijack", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonPayrollRepository({
      query: async (sqlText, params, options) => {
        calls.push({
          operationName: options.operationName,
          sqlText,
          params,
        });
        if (options.operationName.endsWith(".closeIdempotencyLookup")) {
          return {
            rows: [],
            rowCount: 0,
          };
        }
        if (options.operationName.endsWith(".close")) {
          return {
            rows: [
              {
                payroll_plan_id: planId,
                year_month: "2026-09",
                payday: 25,
                expected_salary_amount: "2700000",
                expected_expense_amount: "1200000",
                target_hijack_amount: "1000000",
                expected_hijack_amount: "1500000",
                confirmed_hijack_amount: "1300000",
                status: "CLOSED",
                closed_at: "2026-09-25T15:00:00.000Z",
                created_at: "2026-08-26T00:00:00.000Z",
                updated_at: "2026-09-25T15:00:00.000Z",
                snapshot_id: "44444444-4444-4444-8444-444444444444",
                cumulative_hijack_amount: "2500000",
                closed_budget_count: "31",
                close_reason: "phase4 finalization runtime",
                idempotency_key: "phase4-finalize-key",
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const closed = await repository.closePlan(
      planId,
      {
        reason: "phase4 finalization runtime",
        idempotencyKey: "phase4-finalize-key",
      },
      createRuntime(),
    );

    expect(closed).toMatchObject({
      planId,
      status: "CLOSED",
      confirmedHijackAmountMinor: 1_300_000,
      cumulativeHijackAmountMinor: 2_500_000,
      finalization: {
        snapshotId: "44444444-4444-4444-8444-444444444444",
        closedBudgetCount: 31,
        idempotencyKeyPresent: true,
      },
      serverAuthority: true,
      financialRawDataExposed: false,
    });
    expect(calls.map((call) => call.operationName)).toEqual([
      "payroll.closeIdempotencyLookup",
      "payroll.close",
    ]);
    expect(calls[1]?.sqlText).toContain("public.recalculate_payroll_plan");
    expect(calls[1]?.sqlText).toContain("'MONTH_CLOSED'");
    expect(calls[1]?.sqlText).toContain("status = 'CLOSED'");
    expect(calls[1]?.sqlText).toContain("public.payroll_cycle_contains_date");
    expect(calls[1]?.sqlText).toContain("close_request_hash");
    expect(calls[1]?.params).toContain("phase4-finalize-key");
    expect(JSON.stringify(closed)).not.toContain(userId);
  });
});
