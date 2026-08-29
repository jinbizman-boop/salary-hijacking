import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

describe("community golden screen design system integration", () => {
  const popularPostSource = readFileSync(
    join(__dirname, "..", "components", "PopularPostSection.tsx"),
    "utf8",
  );
  const communityWriteRouteSource = readFileSync(
    join(__dirname, "..", "..", "..", "..", "app", "community", "write.tsx"),
    "utf8",
  );
  const communityDetailRouteSource = readFileSync(
    join(__dirname, "..", "..", "..", "..", "app", "community", "[postId].tsx"),
    "utf8",
  );

  it("uses the canonical Salary Hijacking design system for popular post cards", () => {
    expect(popularPostSource).toContain("salaryHijackingDesignSystem");
    expect(popularPostSource).not.toMatch(/#[0-9A-Fa-f]{6}/u);
    expect(popularPostSource).not.toContain("fontSize:");
    expect(popularPostSource).not.toContain("gap: 10");
    expect(popularPostSource).not.toContain("padding: 16");
  });

  it("uses semantic design tokens in community write and detail routes", () => {
    for (const source of [
      communityWriteRouteSource,
      communityDetailRouteSource,
    ]) {
      expect(source).toContain("salaryHijackingDesignSystem");
      expect(source).not.toMatch(/#[0-9A-Fa-f]{6}/u);
      expect(source).not.toMatch(/\bfontSize\s*:\s*\d+/u);
      expect(source).not.toMatch(/\blineHeight\s*:\s*\d+/u);
      expect(source).not.toMatch(
        /\b(?:padding|gap|margin|borderRadius)\s*:\s*\d+/u,
      );
    }
  });

  it("separates production style violations from capture/reference tooling", () => {
    const output = execFileSync(
      process.execPath,
      [
        join(
          __dirname,
          "..",
          "..",
          "..",
          "..",
          "scripts",
          "audit-design-system-usage.mjs",
        ),
      ],
      { encoding: "utf8" },
    );
    const report = JSON.parse(output) as {
      captureOnly: {
        productionCount: number;
        referenceCount: number;
        totalCount: number;
      };
      productionStyleViolations: {
        rawColorViolations: number;
        rawTypographyViolations: number;
        rawSpacingViolations: number;
      };
      referenceStyleViolations: {
        rawColorViolations: number;
        rawTypographyViolations: number;
        rawSpacingViolations: number;
      };
    };

    expect(report.captureOnly.totalCount).toBe(
      report.captureOnly.productionCount + report.captureOnly.referenceCount,
    );
    expect(report.captureOnly.productionCount).toBe(0);
    expect(report.productionStyleViolations).toEqual(
      expect.objectContaining({
        rawColorViolations: expect.any(Number),
        rawSpacingViolations: expect.any(Number),
        rawTypographyViolations: expect.any(Number),
      }),
    );
    expect(report.referenceStyleViolations).toEqual(
      expect.objectContaining({
        rawColorViolations: expect.any(Number),
        rawSpacingViolations: expect.any(Number),
        rawTypographyViolations: expect.any(Number),
      }),
    );
  });
});
