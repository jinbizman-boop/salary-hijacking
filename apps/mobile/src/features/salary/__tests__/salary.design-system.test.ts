import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("salary home design system integration", () => {
  const source = readFileSync(
    join(__dirname, "..", "components", "SalaryHomeScreen.tsx"),
    "utf8",
  );

  it("uses the canonical Salary Hijacking design system instead of local color constants", () => {
    expect(source).toContain("salaryHijackingDesignSystem");
    expect(source).not.toContain("const BRAND_GREEN =");
    expect(source).not.toContain("const HERO_GREEN =");
    expect(source).not.toContain("const TEXT_BLACK =");
    expect(source).not.toContain("const WARNING_ORANGE =");
    expect(source).not.toContain("const DANGER_RED =");
  });

  it("renders variable expenses as mobile-native rows instead of a spreadsheet table", () => {
    expect(source).toContain("VariableExpenseList");
    expect(source).not.toContain("function VariableExpenseTable");
    expect(source).not.toContain("styles.tableHeader");
    expect(source).not.toContain("styles.tableRow");
    expect(source).not.toContain("styles.tableText");
    expect(source).not.toContain("styles.tableMoney");
    expect(source).not.toContain("tableHeaderText");
  });

  it("preserves the current salary home structure while adding semantic color accents only", () => {
    const orderedStructure = [
      "ProtectedMoneyHeroCard",
      "PaydayCard",
      "HeroMetric",
      "SponsoredSlot",
      "DailySafeToSpendCard",
      "UpcomingFixedExpenseSection",
      "VariableExpenseSection",
      "FinanceInsightSection",
    ];

    let previousIndex = -1;
    for (const marker of orderedStructure) {
      const nextIndex = source.indexOf(marker);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }

    expect(source).toContain("salarySemanticColors");
    expect(source).toContain("incomeSoft");
    expect(source).toContain("expenseSoft");
    expect(source).toContain("savingSoft");
    expect(source).toContain("upcomingSoft");
    expect(source).not.toContain("massiveGreenHome");
    expect(source).not.toContain("fullScreenGreen");
  });
});
