import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type {
  PayrollRepository,
  PayrollRouteRuntime,
  PayrollRoutesOptions,
} from "../src/routes/payroll.routes";

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
  "x-correlation-id": "mobile-payroll-contract",
});

function createMobilePayrollRepository(): PayrollRepository<unknown> {
  const notUsed = async (): Promise<Record<string, never>> => ({});
  return {
    name: "mobile-contract-payroll-repository",
    listPlans: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
    getPlan: async () => null,
    getCurrentPlan: async () => null,
    createPlan: notUsed,
    updatePlan: notUsed,
    deletePlan: notUsed,
    activatePlan: notUsed,
    pausePlan: notUsed,
    archivePlan: notUsed,
    home: async (_runtime: PayrollRouteRuntime<unknown>) => ({
      currentPlan: null,
      headline: "DB-backed payroll repository is wired",
      nextAction: "급여 계획을 등록하세요.",
      recommendedDailyBudgetMinor: 0,
      availableForDailyBudgetMinor: 0,
      serverAuthority: true,
      financialRawDataExposed: false,
    }),
    summary: notUsed,
    calendar: notUsed,
    recalculate: notUsed,
    simulate: notUsed,
  };
}

describe("mobile payroll API contract", () => {
  it("lets the app gateway inject a payroll repository for DB-backed runtime wiring", async () => {
    const options = {
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      payrollRoutesOptions: {
        repository: createMobilePayrollRepository(),
        exposeRepositoryName: true,
      },
    } satisfies AppOptions<unknown> & {
      readonly payrollRoutesOptions: PayrollRoutesOptions<unknown>;
    };
    const app = createApp(options);

    const response = await app.fetch(
      new Request("https://api.test/api/v1/payroll/home", {
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
    expect(response.headers.get("x-payroll-repository")).toBe(
      "mobile-contract-payroll-repository",
    );
    expect(body.error?.code).toBeUndefined();
    expect(body.data).toMatchObject({
      headline: "DB-backed payroll repository is wired",
      serverAuthority: true,
      financialRawDataExposed: false,
    });
  });
});
