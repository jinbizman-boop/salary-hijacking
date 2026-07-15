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
    expect(source).toContain("SalaryHomeScreen");
    expect(source).not.toContain("SalaryHome" + "ReferenceScreen");
    expect(source).toContain("/api/v1/salary/summary");
    expect(source).toContain("Google 광고 영역");
    expect(source).toContain("server_authority_component_guard");
    expect(source).toContain("responsive_salary_home_guard");
  });

  it("exports the production salary screen without reference-screen aliases", () => {
    const componentIndex = readFileSync(
      join(__dirname, "..", "components", "index.ts"),
      "utf8",
    );

    expect(componentIndex).toContain("SalaryHomeScreen");
    expect(componentIndex).not.toContain("SalaryHome" + "ReferenceScreen");
    expect(componentIndex).not.toContain("./SalaryHome" + "ReferenceScreen");
  });

  it("does not wire the production salary screen to preview-state runtime boundaries", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "SalaryHomeScreen.tsx"),
      "utf8",
    );

    expect(source).not.toContain("../../preview/interactive-state");
    expect(source).not.toContain("PreviewState");
    expect(source).not.toContain("get" + "PreviewState");
    expect(source).not.toContain("update" + "PreviewState");
  });
});
