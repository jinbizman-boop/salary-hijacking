import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("level golden screen design system integration", () => {
  const componentSources = [
    "LevelHeroCard.tsx",
    "LevelActionGrid.tsx",
  ].map((fileName) =>
    readFileSync(join(__dirname, "..", "components", fileName), "utf8"),
  );

  it("uses the canonical Salary Hijacking design system for LV UP hero and action cards", () => {
    for (const source of componentSources) {
      expect(source).toContain("salaryHijackingDesignSystem");
      expect(source).not.toContain("componentColors");
      expect(source).not.toContain("fontSize:");
      expect(source).not.toContain("gap: 10");
      expect(source).not.toContain("padding: 16");
    }
  });
});
