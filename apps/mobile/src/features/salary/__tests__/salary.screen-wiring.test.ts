import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("salary tab screen wiring", () => {
  it("uses salary feature components instead of the clean fintech fallback", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(tabs)",
        "salary",
        "index.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("SalaryHeroCard");
    expect(source).toContain("SalaryMetricGrid");
    expect(source).toContain("DailyBudgetSection");
    expect(source).toContain("FixedExpenseSection");
    expect(source).toContain("VariableExpenseQuickAdd");
    expect(source).toContain("/api/v1/salary/summary");
    expect(source).toContain("server_authority_component_guard");
  });
});
