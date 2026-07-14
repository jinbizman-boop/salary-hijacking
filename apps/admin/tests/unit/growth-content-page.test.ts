import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const adminRoot = join(process.cwd());
const pagePath = join(adminRoot, "src/app/growth-content/page.tsx");
const layoutPath = join(adminRoot, "src/app/layout.tsx");
const packagePath = join(adminRoot, "package.json");

describe("admin LV UP growth content operations page", () => {
  it("exposes a routed admin console for the growth content lifecycle", () => {
    const page = readFileSync(pagePath, "utf8");

    expect(page).toContain('const API_BASE = "/admin/api/v1/growth/contents"');
    expect(page).toContain("createDraft");
    expect(page).toContain("saveEdit");
    expect(page).toContain("submitReview");
    expect(page).toContain("publishContent");
    expect(page).toContain("archiveContent");
    expect(page).toContain("x-admin-reason");
    expect(page).toContain('cache: "no-store"');
  });

  it("keeps source, license, copyright, health, news, and privacy gates visible in source", () => {
    const page = readFileSync(pagePath, "utf8");

    expect(page).toContain(
      'const contentTypes = ["READING", "NEWS", "ENGLISH", "HEALTH"] as const',
    );
    expect(page).toContain(
      'const contentStatuses = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const',
    );
    expect(page).toContain(
      'const difficultyLevels = ["EASY", "NORMAL", "HARD", "EXTREME"] as const',
    );
    expect(page).not.toContain("EXERCISE");
    expect(page).not.toContain("IN_REVIEW");
    expect(page).not.toContain("APPROVED");

    for (const marker of [
      "sourceUrl",
      "licenseType",
      "copyrightStatus",
      "fullTextStored",
      "noFullBookOrArticle",
      "safetyLevel",
      "medicalDisclaimer",
      "painStopNotice",
      "beginnerSafe",
      "viewpointTag",
      "adTargetingSeparated",
      "rawFinancialTargetingUsed=false",
      "rawPushTokenLogged=false",
    ]) {
      expect(page).toContain(marker);
    }
  });

  it("adds the page to the admin shell navigation and package route metadata", () => {
    const layout = readFileSync(layoutPath, "utf8");
    const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
      readonly metadata?: { readonly routes?: readonly string[] };
    };

    expect(layout).toContain('["/admin/growth-content", "LV UP"]');
    expect(pkg.metadata?.routes).toContain("/admin/growth-content");
  });
});
