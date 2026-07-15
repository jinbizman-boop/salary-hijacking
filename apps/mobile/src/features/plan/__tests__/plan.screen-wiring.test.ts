import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("plan tab screen wiring", () => {
  it("uses plan feature components instead of the clean fintech fallback", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(tabs)",
        "plan",
        "index.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).toContain("PlanScreen");
    expect(source).not.toContain("Plan" + "ReferenceScreen");
    expect(source).toContain("/api/v1/fixed-expenses");
    expect(source).toContain("/api/v1/savings");
    expect(source).toContain("server_authority_component_guard");
    expect(source).toContain("responsive_plan_guard");
    expect(source).toContain("safe_area_top_bottom_guard");
  });

  it("exports the production plan screen without reference-screen aliases", () => {
    const componentIndex = readFileSync(
      join(__dirname, "..", "components", "index.ts"),
      "utf8",
    );

    expect(componentIndex).toContain("PlanScreen");
    expect(componentIndex).not.toContain("Plan" + "ReferenceScreen");
    expect(componentIndex).not.toContain("./Plan" + "ReferenceScreen");
  });

  it("does not wire the production plan screen to preview-state runtime boundaries", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "PlanScreen.tsx"),
      "utf8",
    );

    expect(source).not.toContain("../../preview/interactive-state");
    expect(source).not.toContain("PreviewState");
    expect(source).not.toContain("get" + "PreviewState");
    expect(source).not.toContain("update" + "PreviewState");
  });

  it("does not seed production plan financial UI from prototype amounts", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "PlanScreen.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/500000|700000|2000000|2700000|2,500,000|88%/u);
  });
});
