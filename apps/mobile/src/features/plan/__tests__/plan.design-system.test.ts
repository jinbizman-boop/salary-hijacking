import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("plan screen design system integration", () => {
  const source = readFileSync(
    join(__dirname, "..", "components", "PlanScreen.tsx"),
    "utf8",
  );

  it("uses the canonical Salary Hijacking design system instead of local color constants", () => {
    expect(source).toContain("salaryHijackingDesignSystem");
    expect(source).not.toContain("const BRAND_GREEN =");
    expect(source).not.toContain("const TEXT_BLACK =");
    expect(source).not.toContain("const LINE =");
    expect(source).not.toContain("const MUTED =");
    expect(source).not.toContain("const DANGER_RED =");
  });
});
