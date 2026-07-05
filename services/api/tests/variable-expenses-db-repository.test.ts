import { describe, expect, it } from "vitest";
import { createNeonVariableExpensesRepository } from "../src/repositories/variable-expenses.repository";
import type {
  VariableExpenseCreateInput,
  VariableExpensesRouteRuntime,
} from "../src/routes/variable-expenses.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const dailyBudgetId = "22222222-2222-4222-8222-222222222222";
const expenseId = "33333333-3333-4333-8333-333333333333";

function createRuntime(): VariableExpensesRouteRuntime<unknown> {
  return {
    request: new Request("https://api.test/api/v1/variable-expenses"),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL("https://api.test/api/v1/variable-expenses"),
    path: "/api/v1/variable-expenses",
    relativePath: "/",
    method: "POST",
    requestId: "variable-expense-db-repository-test",
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

const createInput: VariableExpenseCreateInput = {
  amountMinor: 5000,
  category: "CAFE",
  title: "Coffee",
  spentAt: "2026-07-02T03:00:00.000Z",
  paymentMethod: "CARD",
  merchantName: "Local cafe",
  memo: "mobile quick add",
  tags: ["mobile", "quick-add"],
  receiptAttachmentId: null,
  dailyBudgetId: null,
  source: "MANUAL",
  idempotencyKey: "mobile-variable-expense-contract-1",
};

describe("Neon variable expense repository", () => {
  it("creates a DB-backed variable expense through daily budget upsert without returning owner identifiers", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonVariableExpensesRepository({
      query: async (sqlText, params, options) => {
        calls.push({
          operationName: options.operationName,
          sqlText,
          params,
        });
        if (options.operationName.endsWith(".findByIdempotency")) {
          return { rows: [], rowCount: 0 };
        }
        if (options.operationName.endsWith(".ensureDailyBudget")) {
          return {
            rows: [{ daily_budget_id: dailyBudgetId }],
            rowCount: 1,
          };
        }
        if (options.operationName.endsWith(".create")) {
          return {
            rows: [
              {
                variable_expense_id: expenseId,
                daily_budget_id: dailyBudgetId,
                spent_at: "2026-07-02T03:00:00.000Z",
                category: "CAFE",
                merchant_name: "Local cafe",
                memo: "mobile quick add",
                amount: "5000",
                status: "ACTIVE",
                idempotency_key: "mobile-variable-expense-contract-1",
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

    const created = await repository.create(createInput, createRuntime());

    expect(created).toMatchObject({
      expenseId,
      dailyBudgetId,
      amountMinor: 5000,
      category: "CAFE",
      title: "Local cafe",
      merchantName: "Local cafe",
      memo: "mobile quick add",
      status: "POSTED",
      idempotencyKey: "mobile-variable-expense-contract-1",
      netAmountMinor: 5000,
      serverAuthority: true,
      financialRawDataExposed: false,
      adTargetingSeparated: true,
    });
    expect(created).not.toHaveProperty("userId");
    expect(calls.map((call) => call.operationName)).toEqual([
      "variableExpenses.findByIdempotency",
      "variableExpenses.ensureDailyBudget",
      "variableExpenses.create",
    ]);
    expect(calls[1]?.sqlText).toContain("insert into public.daily_budgets");
    expect(calls[2]?.sqlText).toContain("insert into public.variable_expenses");
    expect(JSON.stringify(created)).not.toContain(userId);
  });

  it("records partial refunds without treating the whole variable expense as cancelled", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonVariableExpensesRepository({
      query: async (sqlText, params, options) => {
        calls.push({
          operationName: options.operationName,
          sqlText,
          params,
        });
        if (options.operationName.endsWith(".findByIdempotency")) {
          return { rows: [], rowCount: 0 };
        }
        if (options.operationName.endsWith(".refund")) {
          return {
            rows: [
              {
                variable_expense_id: expenseId,
                daily_budget_id: dailyBudgetId,
                spent_at: "2026-07-02T03:00:00.000Z",
                category: "CAFE",
                merchant_name: "Local cafe",
                memo: "mobile quick add",
                amount: "5000",
                refund_amount: "1000",
                status: "ACTIVE",
                idempotency_key: "mobile-variable-expense-contract-1",
                last_refund_idempotency_key:
                  "mobile-variable-refund-contract-1",
                created_at: "2026-07-02T03:00:00.000Z",
                updated_at: "2026-07-02T03:01:00.000Z",
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const refunded = await repository.refund(
      expenseId,
      {
        refundAmountMinor: 1000,
        refundedAt: "2026-07-02T03:01:00.000Z",
        reason: "partial merchant refund",
        idempotencyKey: "mobile-variable-refund-contract-1",
      },
      createRuntime(),
    );

    expect(refunded).toMatchObject({
      refund: {
        expenseId,
        refundAmountMinor: 1000,
        refundedAt: "2026-07-02T03:01:00.000Z",
        reason: "partial merchant refund",
        serverAuthority: true,
        financialRawDataExposed: false,
      },
      expense: {
        expenseId,
        amountMinor: 5000,
        refundAmountMinor: 1000,
        netAmountMinor: 4000,
        status: "POSTED",
        serverAuthority: true,
        financialRawDataExposed: false,
      },
      idempotentReplay: false,
    });
    expect(calls.map((call) => call.operationName)).toEqual([
      "variableExpenses.findByIdempotency",
      "variableExpenses.refund",
    ]);
    expect(calls[1]?.sqlText).toContain("refund_amount");
    expect(calls[1]?.sqlText).toContain("last_refund_idempotency_key");
    expect(calls[1]?.params).toContain(1000);
    expect(calls[1]?.params).toContain("mobile-variable-refund-contract-1");
    expect(JSON.stringify(refunded)).not.toContain(userId);
  });
});
