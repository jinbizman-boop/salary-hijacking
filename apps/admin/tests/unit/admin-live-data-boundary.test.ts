import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const adminRoot = join(process.cwd());
const growthContentPath = join(adminRoot, "src/app/growth-content/page.tsx");
const metricsPath = join(adminRoot, "src/app/metrics/page.tsx");

describe("admin live data boundary", () => {
  it("does not render LV UP sample content as live operations data", () => {
    const page = readFileSync(growthContentPath, "utf8");

    expect(page).not.toContain("fallbackItems");
    expect(page).not.toContain("growth-reading-sample");
    expect(page).not.toContain("growth-health-sample");
    expect(page).not.toContain("items: fallbackItems");
    expect(page).not.toContain("total: fallbackItems.length");
    expect(page).not.toContain("fallbackItems[0]");
    expect(page).toContain("EMPTY_GROWTH_ITEMS");
    expect(page).toContain("LIVE_DATA_UNAVAILABLE");
  });

  it("does not render synthetic metric cards as live operations metrics", () => {
    const page = readFileSync(metricsPath, "utf8");

    expect(page).not.toContain("fallbackDataset");
    expect(page).not.toContain("dataset: fallbackDataset");
    expect(page).not.toContain(
      "response.data ?? response.metrics ?? fallbackDataset",
    );
    expect(page).toContain("EMPTY_METRICS_DATASET");
    expect(page).toContain("LIVE_DATA_UNAVAILABLE");
  });
});
