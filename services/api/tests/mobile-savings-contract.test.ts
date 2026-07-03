import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type {
  SavingsRepository,
  SavingsRoutesOptions,
} from "../src/routes/savings.routes";

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
  "x-correlation-id": "mobile-savings-contract",
});

function createMobileSavingsRepository(): SavingsRepository<unknown> {
  const notUsed = async (): Promise<Record<string, never>> => ({});
  return {
    name: "mobile-contract-savings-repository",
    listGoals: async () => ({
      items: [
        {
          goalId: "22222222-2222-4222-8222-222222222222",
          title: "DB-backed savings repository is wired",
          goalType: "EMERGENCY_FUND",
          targetAmountMinor: 1_000_000,
          currentAmountMinor: 100_000,
          fixedSaveAmountMinor: 100_000,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawAccountDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
    getGoal: async () => null,
    createGoal: notUsed,
    updateGoal: notUsed,
    deleteGoal: notUsed,
    pauseGoal: notUsed,
    resumeGoal: notUsed,
    archiveGoal: notUsed,
    recordTransaction: notUsed,
    listTransactions: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    upcoming: notUsed,
    summary: notUsed,
    calendar: notUsed,
    impact: notUsed,
  };
}

describe("mobile savings API contract", () => {
  it("lets the app gateway inject a savings repository for DB-backed runtime wiring", async () => {
    const options = {
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      savingsRoutesOptions: {
        repository: createMobileSavingsRepository(),
        exposeRepositoryName: true,
      },
    } satisfies AppOptions<unknown> & {
      readonly savingsRoutesOptions: SavingsRoutesOptions<unknown>;
    };
    const app = createApp(options);

    const response = await app.fetch(
      new Request("https://api.test/api/v1/savings", {
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
    expect(response.headers.get("x-savings-repository")).toBe(
      "mobile-contract-savings-repository",
    );
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.items?.[0]).toMatchObject({
      title: "DB-backed savings repository is wired",
      serverAuthority: true,
      financialRawAccountDataExposed: false,
    });
  });
});
