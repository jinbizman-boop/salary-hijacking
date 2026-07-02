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
});
