import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const appSource = readFileSync(
  new URL("../src/app.ts", import.meta.url),
  "utf8",
);

const routeRepositoryContracts = [
  {
    label: "admin",
    routeOption: "options.adminRoutesOptions ??",
    shouldUse: "shouldUseNeonAdminRepository(routeEnv)",
    create: "createNeonAdminRepository<TEnv>()",
  },
  {
    label: "payroll",
    routeOption: "options.payrollRoutesOptions ??",
    shouldUse: "shouldUseNeonPayrollRepository(routeEnv)",
    create: "createNeonPayrollRepository<TEnv>()",
  },
  {
    label: "daily budgets",
    routeOption: "options.dailyBudgetsRoutesOptions ??",
    shouldUse: "shouldUseNeonDailyBudgetsRepository(routeEnv)",
    create: "createNeonDailyBudgetsRepository<TEnv>()",
  },
  {
    label: "fixed expenses",
    routeOption: "options.fixedExpensesRoutesOptions ??",
    shouldUse: "shouldUseNeonFixedExpensesRepository(routeEnv)",
    create: "createNeonFixedExpensesRepository<TEnv>()",
  },
  {
    label: "variable expenses",
    routeOption: "options.variableExpensesRoutesOptions ??",
    shouldUse: "shouldUseNeonVariableExpensesRepository(routeEnv)",
    create: "createNeonVariableExpensesRepository<TEnv>()",
  },
  {
    label: "savings",
    routeOption: "options.savingsRoutesOptions ??",
    shouldUse: "shouldUseNeonSavingsRepository(routeEnv)",
    create: "createNeonSavingsRepository<TEnv>()",
  },
  {
    label: "growth",
    routeOption: "options.growthRoutesOptions ??",
    shouldUse: "shouldUseNeonGrowthRepository(routeEnv)",
    create: "createNeonGrowthRepository<TEnv>()",
  },
  {
    label: "notifications",
    routeOption: "options.notificationsRoutesOptions ??",
    shouldUse: "shouldUseNeonNotificationsRepository(routeEnv)",
    create: "createNeonNotificationsRepository<TEnv>()",
  },
  {
    label: "community",
    routeOption: "options.communityRoutesOptions ??",
    shouldUse: "shouldUseNeonCommunityRepository(routeEnv)",
    create: "createNeonCommunityRepository<TEnv>()",
  },
] as const;

describe("app DB repository selection", () => {
  it.each(routeRepositoryContracts)(
    "selects the Neon $label repository by default when a runtime database URL is present",
    ({ create, routeOption, shouldUse }) => {
      expect(appSource).toContain(routeOption);
      expect(appSource).toContain(shouldUse);
      expect(appSource).toContain(create);
    },
  );

  it.each([
    [
      "staging",
      "/api/v1/auth/register",
      {
        email: "qa-db-binding@example.invalid",
        password: "StrongPass123!",
        nickname: "QA User",
        termsAccepted: true,
        privacyAccepted: true,
      },
    ],
    [
      "production",
      "/api/v1/payroll/",
      {
        title: "QA payroll plan",
        incomeType: "MONTHLY_SALARY",
        payrollCycle: "MONTHLY",
        payrollAmountMinor: 2_700_000,
        payday: 25,
        firstPayrollDate: "2026-08-25",
        periodStartDate: "2026-08-01",
        periodEndDate: "2026-08-31",
      },
    ],
  ] as const)(
    "rejects %s persistent API requests when no database URL binding is configured",
    async (environment, path, requestBody) => {
      const app = createApp({
        enableAuth: false,
        enableAuditGate: false,
        enableRateLimit: false,
      });

      const response = await app.fetch(
        new Request(`https://api.test${path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-auth-context-source": "auth.middleware",
            "x-authenticated-user-id": "11111111-1111-4111-8111-111111111111",
            "x-auth-primary-role": "USER",
            "x-authenticated-roles": "USER",
            "x-auth-account-status": "ACTIVE",
          },
          body: JSON.stringify(requestBody),
        }),
        { APP_ENV: environment, ENVIRONMENT: environment },
        { waitUntil: () => undefined },
      );
      const responseBody = (await response.json()) as {
        readonly error?: { readonly code?: string };
      };

      expect(response.status).toBe(503);
      expect(responseBody.error?.code).toBe("APP_DATABASE_URL_REQUIRED");
    },
  );
});
