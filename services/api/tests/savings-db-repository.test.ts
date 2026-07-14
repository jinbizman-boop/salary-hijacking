import { describe, expect, it } from "vitest";
import {
  createNeonSavingsRepository,
  shouldUseNeonSavingsRepository,
} from "../src/repositories/savings.repository";
import type {
  SavingsGoalCreateInput,
  SavingsRouteRuntime,
} from "../src/routes/savings.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const goalId = "22222222-2222-4222-8222-222222222222";
const payrollPlanId = "33333333-3333-4333-8333-333333333333";

function createRuntime(path = "/api/v1/savings"): SavingsRouteRuntime<unknown> {
  return {
    request: new Request(`https://api.test${path}`, {
      headers: { "x-idempotency-key": "savings-test-key" },
    }),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL(`https://api.test${path}`),
    path,
    relativePath: path.replace("/api/v1/savings", "") || "/",
    method: "POST",
    requestId: "savings-db-repository-test",
    now: new Date("2026-07-03T04:00:00.000Z"),
    principal: {
      userId,
      roles: ["USER"],
      permissions: [],
      policyId: null,
    },
    repository: {} as never,
  };
}

const createInput: SavingsGoalCreateInput = {
  title: "Emergency fund",
  goalType: "EMERGENCY_FUND",
  targetAmountMinor: 1_000_000,
  currentAmountMinor: 0,
  fixedSaveAmountMinor: 100_000,
  frequency: "MONTHLY",
  saveDay: 25,
  startDate: "2026-07-01",
  targetDate: "2027-06-30",
  accountAlias: "Emergency",
  memo: "Fixed savings",
  autoSave: true,
  affectsDailyBudget: true,
};

describe("Neon savings repository", () => {
  it("uses Neon only when a supported database URL env is present", () => {
    expect(
      shouldUseNeonSavingsRepository({
        SALARY_HIJACKING_DATABASE_URL: "postgres://example.invalid/db",
      }),
    ).toBe(true);
    expect(shouldUseNeonSavingsRepository({ APP_ENV: "test" })).toBe(false);
  });

  it("creates a DB-backed savings plan through savings_plans without returning owner identifiers", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonSavingsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        if (options.operationName === "savings.createGoal") {
          return {
            rows: [
              {
                savings_plan_id: goalId,
                payroll_plan_id: payrollPlanId,
                saving_day: 25,
                category: "EMERGENCY_FUND",
                name: "Emergency fund",
                amount: "100000",
                recurrence_type: "MONTHLY",
                status: "SCHEDULED",
                transferred_at: null,
                created_at: "2026-07-03T04:00:00.000Z",
                updated_at: "2026-07-03T04:00:00.000Z",
                cancelled_at: null,
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const created = await repository.createGoal(createInput, createRuntime());

    expect(created).toMatchObject({
      goalId,
      title: "Emergency fund",
      goalType: "EMERGENCY_FUND",
      targetAmountMinor: 1_000_000,
      currentAmountMinor: 0,
      fixedSaveAmountMinor: 100_000,
      frequency: "MONTHLY",
      saveDay: 25,
      startDate: "2026-07-01",
      targetDate: "2027-06-30",
      accountAlias: "Emergency",
      autoSave: true,
      affectsDailyBudget: true,
      status: "ACTIVE",
      serverAuthority: true,
      financialRawAccountDataExposed: false,
    });
    expect(created).not.toHaveProperty("userId");
    expect(created).not.toHaveProperty("payrollPlanId");
    expect(JSON.stringify(created)).not.toContain(userId);
    expect(JSON.stringify(created)).not.toContain(payrollPlanId);
    expect(calls.map((call) => call.operationName)).toEqual([
      "savings.createGoal",
    ]);
    expect(calls[0]?.sqlText).toContain("insert into public.savings_plans");
    expect(calls[0]?.sqlText).toContain("public.payroll_plans");
    expect(calls[0]?.params).toContain(userId);
  });

  it("records a DB-backed savings transfer as a server-authoritative update", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonSavingsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        if (options.operationName === "savings.recordTransaction") {
          return {
            rows: [
              {
                savings_plan_id: goalId,
                saving_day: 25,
                category: "EMERGENCY_FUND",
                name: "Emergency fund",
                amount: "100000",
                recurrence_type: "MONTHLY",
                status: "TRANSFERRED",
                transferred_at: "2026-07-03T04:00:00.000Z",
                created_at: "2026-07-01T00:00:00.000Z",
                updated_at: "2026-07-03T04:00:00.000Z",
                cancelled_at: null,
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const result = await repository.recordTransaction(
      goalId,
      {
        transactionType: "DEPOSIT",
        amountMinor: 100_000,
        occurredAt: "2026-07-03T04:00:00.000Z",
        memo: "Auto save",
        reason: null,
        idempotencyKey: "savings-transfer-key",
      },
      createRuntime(`/api/v1/savings/${goalId}/deposit`),
    );

    expect(result).toMatchObject({
      transaction: {
        goalId,
        transactionType: "DEPOSIT",
        amountMinor: 100_000,
        signedAmountMinor: 100_000,
        occurredAt: "2026-07-03T04:00:00.000Z",
        serverAuthority: true,
        financialRawAccountDataExposed: false,
      },
      goal: {
        goalId,
        currentAmountMinor: 100_000,
        fixedSaveAmountMinor: 100_000,
        serverAuthority: true,
        financialRawAccountDataExposed: false,
      },
      serverAuthority: true,
      financialRawAccountDataExposed: false,
    });
    expect(result).not.toHaveProperty("userId");
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(calls.map((call) => call.operationName)).toEqual([
      "savings.recordTransaction",
    ]);
    expect(calls[0]?.sqlText).toContain("update public.savings_plans");
    expect(calls[0]?.params).toContain(userId);
  });

  it("generates month-end adjusted upcoming occurrences for DB-backed monthly savings goals", async () => {
    const repository = createNeonSavingsRepository({
      query: async (_sqlText, _params, options) => {
        if (options.operationName === "savings.upcoming") {
          return {
            rows: [
              {
                savings_plan_id: goalId,
                payroll_plan_id: payrollPlanId,
                saving_day: 31,
                category: "ETC",
                name: "Month-end travel fund",
                amount: "200000",
                recurrence_type: "MONTHLY",
                status: "SCHEDULED",
                transferred_at: null,
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
      createRuntime("/api/v1/savings/upcoming"),
    );

    expect(result).toMatchObject({
      fromDate: "2026-02-01",
      toDate: "2026-03-31",
      count: 2,
      totalAmountMinor: 400_000,
      serverAuthority: true,
      financialRawAccountDataExposed: false,
    });
    expect(result.items).toEqual([
      {
        goalId,
        title: "Month-end travel fund",
        goalType: "CUSTOM",
        dueDate: "2026-02-28",
        amountMinor: 200_000,
        autoSave: true,
        status: "SCHEDULED",
      },
      {
        goalId,
        title: "Month-end travel fund",
        goalType: "CUSTOM",
        dueDate: "2026-03-31",
        amountMinor: 200_000,
        autoSave: true,
        status: "SCHEDULED",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(JSON.stringify(result)).not.toContain(payrollPlanId);
  });
});
