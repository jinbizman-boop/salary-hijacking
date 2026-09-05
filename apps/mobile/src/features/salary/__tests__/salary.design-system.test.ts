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
});
