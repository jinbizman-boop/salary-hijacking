import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("level tab screen wiring", () => {
  it("uses level feature components instead of the clean fintech fallback", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(tabs)",
        "level",
        "index.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).not.toContain("clean-fintech-screens");
    expect(source).not.toContain("normalizeGrowthDashboardForCleanFintech");
    expect(source).toContain("AppShell");
    expect(source).toContain("LevelHeroCard");
    expect(source).toContain("LevelActionGrid");
    expect(source).not.toContain("<XpRewardToast");
    expect(source).toContain("/api/v1/growth/dashboard");
    expect(source).toContain("normalizeGrowthDashboardForLevel");
    expect(source).toContain("normalizeGrowthDashboardForTest");
  });
});
