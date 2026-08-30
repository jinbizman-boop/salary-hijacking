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
    expect(source).not.toContain("SalaryHomeReferenceScreen");
    expect(source).toContain("/api/v1/salary/summary");
    expect(source).toContain("Sponsored 광고 영역");
    expect(source).toContain("server_authority_component_guard");
    expect(source).toContain("responsive_salary_home_guard");
  });

  it("exports the production salary screen without reference-screen aliases", () => {
    const componentIndex = readFileSync(
      join(__dirname, "..", "components", "index.ts"),
      "utf8",
    );

    expect(componentIndex).toContain("SalaryHomeScreen");
    expect(componentIndex).not.toContain("SalaryHomeReferenceScreen");
    expect(componentIndex).not.toContain("./SalaryHomeReferenceScreen");
  });

  it("does not wire the production salary screen to preview-state runtime boundaries", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "SalaryHomeScreen.tsx"),
      "utf8",
    );

    expect(source).not.toContain("../../preview/interactive-state");
    expect(source).not.toContain("PreviewState");
    expect(source).not.toContain("getPreviewState");
    expect(source).not.toContain("updatePreviewState");
  });

  it("does not hardcode production salary hero amounts in the screen component", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "SalaryHomeScreen.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(
      /5,780,000|2,700,000|1,927,000|773,000|2700000|773000/u,
    );
  });

  it("matches the final salary-home reference hierarchy without internal architecture copy", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "SalaryHomeScreen.tsx"),
      "utf8",
    );
    const heroIndex = source.indexOf("<ProtectedMoneyHeroCard");
    const dailyIndex = source.indexOf("DailySafeToSpendCard");
    const fixedIndex = source.indexOf("UpcomingFixedExpenseSection");
    const variableIndex = source.indexOf("VariableExpenseSection");
    const adIndex = source.indexOf("<SponsoredSlot");

    expect(source).toContain("BrandHeader");
    expect(source).toContain("Salary Hijacking");
    expect(source).toContain("SALARY HIJACKING");
    expect(source).toContain("지켜낸 돈");
    expect(source).toContain("오늘 사용 가능 금액");
    expect(source).toContain("예정 고정지출");
    expect(source).toContain("변동지출");
    expect(source).toContain("Sponsored");
    expect(source).not.toContain("서버 권위 급여 홈");
    expect(source).not.toContain("server authority");
    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(dailyIndex).toBeGreaterThan(heroIndex);
    expect(fixedIndex).toBeGreaterThan(dailyIndex);
    expect(variableIndex).toBeGreaterThan(fixedIndex);
    expect(adIndex).toBeGreaterThan(variableIndex);
  });
});
