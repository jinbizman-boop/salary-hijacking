import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(
  new URL("../src/app.ts", import.meta.url),
  "utf8",
);

const routeRepositoryContracts = [
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
});
