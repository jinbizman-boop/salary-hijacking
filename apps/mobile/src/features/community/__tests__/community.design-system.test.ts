import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("community golden screen design system integration", () => {
  const popularPostSource = readFileSync(
    join(__dirname, "..", "components", "PopularPostSection.tsx"),
    "utf8",
  );

  it("uses the canonical Salary Hijacking design system for popular post cards", () => {
    expect(popularPostSource).toContain("salaryHijackingDesignSystem");
    expect(popularPostSource).not.toMatch(/#[0-9A-Fa-f]{6}/u);
    expect(popularPostSource).not.toContain("fontSize:");
    expect(popularPostSource).not.toContain("gap: 10");
    expect(popularPostSource).not.toContain("padding: 16");
  });
});
