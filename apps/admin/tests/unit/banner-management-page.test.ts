import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const adminRoot = join(process.cwd());
const pagePath = join(adminRoot, "src/app/banners/page.tsx");
const packagePath = join(adminRoot, "package.json");

describe("admin banner and ad operations page", () => {
  it("keeps ad and partner campaigns separated from raw financial targeting", () => {
    const page = readFileSync(pagePath, "utf8");

    expect(page).toContain("blockedFinancialTargetTerms");
    expect(page).toContain("preventFinancialTargeting(form.targetingRule)");
    expect(page).toContain('"x-raw-financial-targeting-used": "false"');
    expect(page).toContain("rawFinancialTargetingUsed: false");
    expect(page).toContain("rawAmountPayloadUsed: false");
    expect(page).toContain("adsFinancialTargeting=separated");
    expect(page).toContain("contextual_segment_guard");
    expect(page).toContain("financial_targeting_blocked");
    expect(page).toContain("marketingConsentOnly");
    expect(page).toContain("labelVisible");
  });

  it("keeps the admin package policy aligned with ad privacy boundaries", () => {
    const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
      readonly metadata?: {
        readonly rawFinancialDataForAds?: boolean;
        readonly adsFinancialTargetingAllowed?: boolean;
        readonly adminReasonRequired?: boolean;
      };
    };

    expect(pkg.metadata?.rawFinancialDataForAds).toBe(false);
    expect(pkg.metadata?.adsFinancialTargetingAllowed).toBe(false);
    expect(pkg.metadata?.adminReasonRequired).toBe(true);
  });
});
