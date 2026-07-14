import { describe, expect, it } from "vitest";
import {
  createNeonFixedExpensesRepository,
  shouldUseNeonFixedExpensesRepository,
} from "../src/repositories/fixed-expenses.repository";
import type {
  FixedExpenseCreateInput,
  FixedExpenseRouteRuntime,
} from "../src/routes/fixed-expenses.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const expenseId = "22222222-2222-4222-8222-222222222222";
const payrollPlanId = "33333333-3333-4333-8333-333333333333";

function createRuntime(
  path = "/api/v1/fixed-expenses",
): FixedExpenseRouteRuntime<unknown> {
  return {
    request: new Request(`https://api.test${path}`, {
      headers: { "x-idempotency-key": "fixed-expense-test-key" },
    }),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL(`https://api.test${path}`),
    path,
    relativePath: path.replace("/api/v1/fixed-expenses", "") || "/",
    method: "POST",
    requestId: "fixed-expense-db-repository-test",
    now: new Date("2026-07-03T03:00:00.000Z"),
    principal: {
      userId,
      roles: ["USER"],
      permissions: [],
      policyId: null,
    },
    repository: {} as never,
  };
}

const createInput: FixedExpenseCreateInput = {
  title: "Netflix",
  category: "SUBSCRIPTION",
  amountMinor: 17_000,
  frequency: "MONTHLY",
  paymentDay: 15,
  startDate: "2026-07-01",
  endDate: null,
  merchantName: "Netflix",
  memo: "Fixed subscription",
  autoPay: true,
  affectsDailyBudget: true,
};

describe("Neon fixed expenses repository", () => {
  it("uses Neon only when a supported database URL env is present", () => {
    expect(
      shouldUseNeonFixedExpensesRepository({
        SALARY_HIJACKING_DATABASE_URL: "postgres://example.invalid/db",
      }),
    ).toBe(true);
    expect(shouldUseNeonFixedExpensesRepository({ APP_ENV: "test" })).toBe(
      false,
    );
  });

  it("creates a DB-backed fixed expense through fixed_expenses without returning owner identifiers", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonFixedExpensesRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        if (options.operationName === "fixedExpenses.create") {
          return {
            rows: [
              {
                fixed_expense_id: expenseId,
                payroll_plan_id: payrollPlanId,
                expense_day: 15,
                category: "SUBSCRIPTION",
                name: "Netflix",
                amount: "17000",
                recurrence_type: "MONTHLY",
                status: "SCHEDULED",
                paid_at: null,
                created_at: "2026-07-03T03:00:00.000Z",
                updated_at: "2026-07-03T03:00:00.000Z",
                cancelled_at: null,
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const created = await repository.createExpense(
      createInput,
      createRuntime(),
    );

    expect(created).toMatchObject({
      expenseId,
      title: "Netflix",
      category: "SUBSCRIPTION",
      amountMinor: 17_000,
      frequency: "MONTHLY",
      paymentDay: 15,
      startDate: "2026-07-01",
      endDate: null,
      merchantName: "Netflix",
      autoPay: true,
      affectsDailyBudget: true,
      status: "ACTIVE",
      paidTotalMinor: 0,
      lastPaidAt: null,
      serverAuthority: true,
      financialRawDataExposed: false,
    });
    expect(created).not.toHaveProperty("userId");
    expect(created).not.toHaveProperty("payrollPlanId");
    expect(JSON.stringify(created)).not.toContain(userId);
    expect(JSON.stringify(created)).not.toContain(payrollPlanId);
    expect(calls.map((call) => call.operationName)).toEqual([
      "fixedExpenses.create",
    ]);
    expect(calls[0]?.sqlText).toContain("insert into public.fixed_expenses");
    expect(calls[0]?.sqlText).toContain("public.payroll_plans");
    expect(calls[0]?.params).toContain(userId);
  });

  it("records a DB-backed fixed expense payment as a server-authoritative update", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonFixedExpensesRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        if (options.operationName === "fixedExpenses.recordPayment") {
          return {
            rows: [
              {
                fixed_expense_id: expenseId,
                expense_day: 15,
                category: "SUBSCRIPTION",
                name: "Netflix",
                amount: "17000",
                recurrence_type: "MONTHLY",
                status: "PAID",
                paid_at: "2026-07-03T03:00:00.000Z",
                created_at: "2026-07-01T00:00:00.000Z",
                updated_at: "2026-07-03T03:00:00.000Z",
                cancelled_at: null,
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const result = await repository.recordPayment(
      expenseId,
      {
        paidAmountMinor: 17_000,
        paidAt: "2026-07-03T03:00:00.000Z",
        paymentStatus: "PAID",
        memo: "Auto payment",
        idempotencyKey: "fixed-expense-payment-key",
      },
      createRuntime(`/api/v1/fixed-expenses/${expenseId}/pay`),
    );

    expect(result).toMatchObject({
      payment: {
        expenseId,
        paidAmountMinor: 17_000,
        paidAt: "2026-07-03T03:00:00.000Z",
        paymentStatus: "PAID",
        serverAuthority: true,
        financialRawDataExposed: false,
      },
      expense: {
        expenseId,
        status: "ACTIVE",
        paidTotalMinor: 17_000,
        lastPaidAt: "2026-07-03T03:00:00.000Z",
        serverAuthority: true,
        financialRawDataExposed: false,
      },
      serverAuthority: true,
      financialRawDataExposed: false,
    });
    expect(result).not.toHaveProperty("userId");
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(calls.map((call) => call.operationName)).toEqual([
      "fixedExpenses.recordPayment",
    ]);
    expect(calls[0]?.sqlText).toContain("update public.fixed_expenses");
    expect(calls[0]?.params).toContain(userId);
  });

  it("generates month-end adjusted upcoming occurrences for DB-backed monthly fixed expenses", async () => {
    const repository = createNeonFixedExpensesRepository({
      query: async (_sqlText, _params, options) => {
        if (options.operationName === "fixedExpenses.upcoming") {
          return {
            rows: [
              {
                fixed_expense_id: expenseId,
                expense_day: 31,
                category: "SUBSCRIPTION",
                name: "Month-end subscription",
                amount: "17000",
                recurrence_type: "MONTHLY",
                status: "SCHEDULED",
                paid_at: null,
                created_at: "2026-01-31T00:00:00.000Z",
                updated_at: "2026-01-31T00:00:00.000Z",
                cancelled_at: null,
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const result = await repository.upcoming(
      { fromDate: "2026-02-01", toDate: "2026-03-31" },
      createRuntime("/api/v1/fixed-expenses/upcoming"),
    );

    expect(result).toMatchObject({
      fromDate: "2026-02-01",
      toDate: "2026-03-31",
      count: 2,
      totalAmountMinor: 34_000,
      serverAuthority: true,
      financialRawDataExposed: false,
    });
    expect(result.items).toEqual([
      {
        expenseId,
        title: "Month-end subscription",
        category: "SUBSCRIPTION",
        dueDate: "2026-02-28",
        amountMinor: 17_000,
        autoPay: true,
        status: "SCHEDULED",
      },
      {
        expenseId,
        title: "Month-end subscription",
        category: "SUBSCRIPTION",
        dueDate: "2026-03-31",
        amountMinor: 17_000,
        autoPay: true,
        status: "SCHEDULED",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(JSON.stringify(result)).not.toContain(payrollPlanId);
  });
});
