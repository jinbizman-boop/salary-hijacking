import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type {
  VariableExpensesRepository,
  VariableExpensesRouteRuntime,
} from "../src/routes/variable-expenses.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const authHeaders = Object.freeze({
  "content-type": "application/json",
  "x-auth-context-source": "auth.middleware",
  "x-authenticated-user-id": "user_mobile_expense_contract",
  "x-auth-primary-role": "USER",
  "x-authenticated-roles": "USER",
  "x-auth-account-status": "ACTIVE",
  "x-auth-mfa-verified": "false",
  "x-correlation-id": "mobile-variable-expense-contract",
});

function createExpenseContractApp() {
  return createApp({
    enableAuth: false,
    enableAuditGate: false,
    enableRateLimit: false,
    now: () => new Date("2026-07-02T03:00:00.000Z"),
  });
}

function createMobileContractRepository(): VariableExpensesRepository<unknown> {
  const notUsed = async (): Promise<Record<string, never>> => ({});
  return {
    name: "mobile-contract-variable-expenses-repository",
    list: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
    recent: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
    get: async () => null,
    create: notUsed,
    update: notUsed,
    delete: notUsed,
    refund: notUsed,
    void: notUsed,
    today: async (_runtime: VariableExpensesRouteRuntime<unknown>) => ({
      date: "2026-07-02",
      usedAmountMinor: 0,
      serverAuthority: true,
      financialRawDataExposed: false,
    }),
    summary: notUsed,
    calendar: notUsed,
    categoryBreakdown: notUsed,
    budgetImpact: notUsed,
  };
}

describe("mobile variable expense API contract", () => {
  it("creates a server-authoritative variable expense without exposing owner identifiers", async () => {
    const app = createExpenseContractApp();

    const response = await app.fetch(
      new Request("https://api.test/api/v1/variable-expenses", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
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
        }),
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(201);
    expect(response.headers.get("x-server-authority")).toBe("true");
    expect(response.headers.get("x-financial-raw-data-exposed")).toBe("false");
    expect(response.headers.get("x-ad-financial-targeting")).toBe("separated");
    expect(body.error?.code).toBeUndefined();
    expect(body.data).toMatchObject({
      expenseId: expect.stringMatching(/^vex_/),
      amountMinor: 5000,
      category: "CAFE",
      title: "Coffee",
      paymentMethod: "CARD",
      source: "MANUAL",
      status: "POSTED",
      netAmountMinor: 5000,
      serverAuthority: true,
      financialRawDataExposed: false,
    });
    expect(body.data).not.toHaveProperty("userId");
    expect(JSON.stringify(body)).not.toContain("user_mobile_expense_contract");
  });

  it("lets the app gateway inject a variable expense repository for DB-backed runtime wiring", async () => {
    const options = {
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      variableExpensesRoutesOptions: {
        repository: createMobileContractRepository(),
        exposeRepositoryName: true,
      },
    } satisfies AppOptions<unknown>;
    const app = createApp(options);

    const response = await app.fetch(
      new Request("https://api.test/api/v1/variable-expenses/today", {
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
    expect(response.headers.get("x-variable-expenses-repository")).toBe(
      "mobile-contract-variable-expenses-repository",
    );
    expect(body.error?.code).toBeUndefined();
    expect(body.data).toMatchObject({
      date: "2026-07-02",
      serverAuthority: true,
      financialRawDataExposed: false,
    });
  });
});
