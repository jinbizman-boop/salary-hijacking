import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type {
  DailyBudgetRepository,
  DailyBudgetRouteRuntime,
  DailyBudgetsRoutesOptions,
} from "../src/routes/daily-budgets.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const authHeaders = Object.freeze({
  "content-type": "application/json",
  "x-auth-context-source": "auth.middleware",
  "x-authenticated-user-id": "11111111-1111-4111-8111-111111111111",
  "x-auth-primary-role": "USER",
  "x-authenticated-roles": "USER",
  "x-auth-account-status": "ACTIVE",
  "x-auth-mfa-verified": "false",
  "x-correlation-id": "mobile-daily-budget-contract",
});

function createMobileDailyBudgetRepository(): DailyBudgetRepository<unknown> {
  const notUsed = async (): Promise<Record<string, never>> => ({});
  return {
    name: "mobile-contract-daily-budget-repository",
    listBudgets: async () => ({
      items: [],
      page: 1,
      pageSize: 31,
      total: 0,
    }),
    getBudgetById: async () => null,
    getBudgetByDate: async (
      budgetDate: string,
      _runtime: DailyBudgetRouteRuntime<unknown>,
    ) => ({
      budgetId: "22222222-2222-4222-8222-222222222222",
      budgetDate,
      plannedAmountMinor: 20_000,
      spentAmountMinor: 13_000,
      adjustmentAmountMinor: 0,
      availableAmountMinor: 20_000,
      remainingAmountMinor: 7_000,
      overAmountMinor: 0,
      status: "ACTIVE",
      serverAuthority: true,
      financialRawDataExposed: false,
      adTargetingSeparated: true,
    }),
    createBudget: notUsed,
    updateBudget: notUsed,
    deleteBudget: notUsed,
    recordSpend: notUsed,
    adjustBudget: notUsed,
    recalculate: notUsed,
    summary: notUsed,
    calendar: notUsed,
  };
}

describe("mobile daily budget API contract", () => {
  it("lets the app gateway inject a daily budget repository for DB-backed runtime wiring", async () => {
    const options = {
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-07-02T03:00:00.000Z"),
      dailyBudgetsRoutesOptions: {
        repository: createMobileDailyBudgetRepository(),
        exposeRepositoryName: true,
      },
    } satisfies AppOptions<unknown> & {
      readonly dailyBudgetsRoutesOptions: DailyBudgetsRoutesOptions<unknown>;
    };
    const app = createApp(options);

    const response = await app.fetch(
      new Request("https://api.test/api/v1/daily-budgets/today", {
        headers: authHeaders,
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-daily-budget-repository")).toBe(
      "mobile-contract-daily-budget-repository",
    );
    expect(body.error?.code).toBeUndefined();
    expect(body.data).toMatchObject({
      budgetDate: "2026-07-02",
      plannedAmountMinor: 20_000,
      spentAmountMinor: 13_000,
      remainingAmountMinor: 7_000,
      serverAuthority: true,
      financialRawDataExposed: false,
    });
  });
});
