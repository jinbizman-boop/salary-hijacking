import { describe, expect, it } from "vitest";
import { createNeonDailyBudgetsRepository } from "../src/repositories/daily-budgets.repository";
import type {
  DailyBudgetCreateInput,
  DailyBudgetRouteRuntime,
} from "../src/routes/daily-budgets.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const budgetId = "22222222-2222-4222-8222-222222222222";

function createRuntime(): DailyBudgetRouteRuntime<unknown> {
  return {
    request: new Request("https://api.test/api/v1/daily-budgets"),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL("https://api.test/api/v1/daily-budgets"),
    path: "/api/v1/daily-budgets",
    relativePath: "/",
    method: "POST",
    requestId: "daily-budget-db-repository-test",
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

const createInput: DailyBudgetCreateInput = {
  budgetDate: "2026-07-02",
  plannedAmountMinor: 20_000,
  memo: "mobile daily budget",
  source: "MANUAL",
};

describe("Neon daily budget repository", () => {
  it("creates a DB-backed daily budget through daily_budgets without returning owner identifiers", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonDailyBudgetsRepository({
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
                daily_budget_id: budgetId,
                budget_date: "2026-07-02",
                daily_limit_amount: "20000",
                used_amount: "0",
                remaining_amount: "20000",
                over_amount: "0",
                status: "OPEN",
                calculated_at: "2026-07-02T03:00:00.000Z",
                created_at: "2026-07-02T03:00:00.000Z",
                updated_at: "2026-07-02T03:00:00.000Z",
                closed_at: null,
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const created = await repository.createBudget(createInput, createRuntime());

    expect(created).toMatchObject({
      budgetId,
      budgetDate: "2026-07-02",
      plannedAmountMinor: 20_000,
      spentAmountMinor: 0,
      adjustmentAmountMinor: 0,
      availableAmountMinor: 20_000,
      remainingAmountMinor: 20_000,
      overAmountMinor: 0,
      status: "ACTIVE",
      serverAuthority: true,
      financialRawDataExposed: false,
      adTargetingSeparated: true,
    });
    expect(created).not.toHaveProperty("userId");
    expect(calls.map((call) => call.operationName)).toEqual([
      "dailyBudgets.create",
    ]);
    expect(calls[0]?.sqlText).toContain("insert into public.daily_budgets");
    expect(calls[0]?.params).toContain(userId);
    expect(JSON.stringify(created)).not.toContain(userId);
  });
});
