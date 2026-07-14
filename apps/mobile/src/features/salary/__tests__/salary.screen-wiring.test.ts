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
    expect(source).toContain("SalaryHomeReferenceScreen");
    expect(source).toContain("/api/v1/salary/summary");
    expect(source).toContain("Google 광고 영역");
    expect(source).toContain("server_authority_component_guard");
    expect(source).toContain("responsive_salary_home_reference_guard");
  });
});
