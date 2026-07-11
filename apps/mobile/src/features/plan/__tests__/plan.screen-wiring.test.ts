import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("plan tab screen wiring", () => {
  it("uses plan feature components instead of the clean fintech fallback", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(tabs)",
        "plan",
        "index.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("PlanProgressCard");
    expect(source).toContain("PlanBreakdownSection");
    expect(source).toContain("PlanActionList");
    expect(source).toContain("/api/v1/fixed-expenses");
    expect(source).toContain("/api/v1/savings");
    expect(source).toContain("server_authority_component_guard");
  });
});
