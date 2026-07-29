import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const mobileRoot = join(__dirname, "../../..");
const forbiddenSampleFinanceValues =
  /5,780,000|5,500,000|2,700,000|1,927,000|773,000|2700000|1927000|5780000/u;
const forbiddenFallbackDatasets = [
  "fallbackPlanFixedExpenseRows",
  "fallbackPlanSavingsRows",
  "fallbackNotifications",
  "fallbackMissions",
  "fallbackProfileSnapshot",
  "fallbackCommunityPosts",
  "fallbackPostDetail",
] as const;

function collectProductionFiles(
  ...roots: readonly string[]
): readonly string[] {
  const files: string[] = [];
  const ignoredSegments = new Set([
    "__tests__",
    "capture",
    "fixtures",
    "mocks",
    "preview",
  ]);

  function walk(directory: string): void {
    for (const entry of readdirSync(directory)) {
      if (ignoredSegments.has(entry)) continue;
      const absolutePath = join(directory, entry);
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      if (/\.(?:ts|tsx|js|jsx)$/u.test(entry)) files.push(absolutePath);
    }
  }

  for (const root of roots) walk(join(mobileRoot, root));
  return files.sort();
}

describe("production fixture separation", () => {
  it("keeps sample financial amounts out of production routes and feature components", () => {
    const violations = collectProductionFiles("app", "src/features").flatMap(
      (filePath) => {
        const source = readFileSync(filePath, "utf8");
        return forbiddenSampleFinanceValues.test(source)
          ? [relative(mobileRoot, filePath)]
          : [];
      },
    );

    expect(violations).toEqual([]);
  });

  it("keeps named fallback fixture datasets out of production routes and feature components", () => {
    const violations = collectProductionFiles("app", "src/features").flatMap(
      (filePath) => {
        const source = readFileSync(filePath, "utf8");
        return forbiddenFallbackDatasets
          .filter((marker) => source.includes(marker))
          .map(
            (marker) => `${relative(mobileRoot, filePath)} contains ${marker}`,
          );
      },
    );

    expect(violations).toEqual([]);
  });
});
