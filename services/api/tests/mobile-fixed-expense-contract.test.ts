import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type {
  FixedExpenseRepository,
  FixedExpensesRoutesOptions,
} from "../src/routes/fixed-expenses.routes";

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
  "x-correlation-id": "mobile-fixed-expense-contract",
});

function createMobileFixedExpenseRepository(): FixedExpenseRepository<unknown> {
  const notUsed = async (): Promise<Record<string, never>> => ({});
  return {
    name: "mobile-contract-fixed-expense-repository",
    listExpenses: async () => ({
      items: [
        {
          expenseId: "22222222-2222-4222-8222-222222222222",
          title: "DB-backed fixed expense repository is wired",
          category: "SUBSCRIPTION",
          amountMinor: 17_000,
          frequency: "MONTHLY",
          paymentDay: 15,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
    getExpense: async () => null,
    createExpense: notUsed,
    updateExpense: notUsed,
    deleteExpense: notUsed,
    pauseExpense: notUsed,
    resumeExpense: notUsed,
    endExpense: notUsed,
    recordPayment: notUsed,
    upcoming: notUsed,
    summary: notUsed,
    calendar: notUsed,
    impact: notUsed,
  };
}

describe("mobile fixed expense API contract", () => {
  it("lets the app gateway inject a fixed expense repository for DB-backed runtime wiring", async () => {
    const options = {
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      fixedExpensesRoutesOptions: {
        repository: createMobileFixedExpenseRepository(),
        exposeRepositoryName: true,
      },
    } satisfies AppOptions<unknown> & {
      readonly fixedExpensesRoutesOptions: FixedExpensesRoutesOptions<unknown>;
    };
    const app = createApp(options);

    const response = await app.fetch(
      new Request("https://api.test/api/v1/fixed-expenses", {
        headers: authHeaders,
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: { readonly items?: readonly Record<string, unknown>[] };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-fixed-expense-repository")).toBe(
      "mobile-contract-fixed-expense-repository",
    );
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.items?.[0]).toMatchObject({
      title: "DB-backed fixed expense repository is wired",
      serverAuthority: true,
      financialRawDataExposed: false,
    });
  });
});
