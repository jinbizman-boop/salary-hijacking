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

  it("keeps salary home route and screen imports narrow for emulator startup", () => {
    const route = readFileSync(
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
    const screen = readFileSync(
      join(__dirname, "..", "components", "SalaryHomeScreen.tsx"),
      "utf8",
    );

    expect(route).not.toContain("../../../src/features/salary/components\";");
    expect(route).toContain(
      "../../../src/features/salary/components/SalaryHomeScreen",
    );
    expect(screen).not.toContain("../../../shared/components\";");
    expect(screen).toContain("../../../shared/components/tokens");
  });

  it("emits the release home-shell marker from the rendered salary home screen", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "SalaryHomeScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("markReleasePerf");
    expect(source).toContain('"route.home.shell_interactive"');
    expect(source).toContain('{ route: "salary" }');
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

  it("renders the HOME-002 hero summary as received, spent, and saved amounts", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "SalaryHomeScreen.tsx"),
      "utf8",
    );

    const receivedIndex = source.indexOf('label="수령 금액"');
    const spentIndex = source.indexOf('label="지출 금액"');
    const savedIndex = source.indexOf('label="저축 금액"');
    const dailySafeIndex = source.indexOf("DailySafeToSpendCard");

    expect(receivedIndex).toBeGreaterThanOrEqual(0);
    expect(spentIndex).toBeGreaterThan(receivedIndex);
    expect(savedIndex).toBeGreaterThan(spentIndex);
    expect(savedIndex).toBeLessThan(dailySafeIndex);
    expect(source).not.toContain('label="목표 달성률"');
  });

  it("places the HOME-006 finance insight before the sponsored slot", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "SalaryHomeScreen.tsx"),
      "utf8",
    );

    const variableIndex = source.indexOf("VariableExpenseSection");
    const insightIndex = source.indexOf("<FinanceInsightSection");
    const adIndex = source.indexOf("<SponsoredSlot");

    expect(source).toContain("성과/위험 인사이트");
    expect(insightIndex).toBeGreaterThan(variableIndex);
    expect(insightIndex).toBeLessThan(adIndex);
  });
});
