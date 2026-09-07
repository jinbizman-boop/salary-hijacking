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

  it("keeps the commercial runtime frame inside Android safe visual gutters", () => {
    expect(source).toContain("horizontalGutter");
    expect(source).toContain("width - horizontalGutter * 2");
    expect(source).toContain("StatusBar");
    expect(source).toContain('barStyle="dark-content"');
    expect(source).toContain("backgroundColor={planScreenColors.screen}");
  });

  it("keeps Plan section cards white while the page uses the global app background", () => {
    expect(source).toContain("screen: designSystem.colors.surface.subtle");
    expect(source).toContain("surface: designSystem.colors.surface.default");
    expect(source).toContain(
      'content: {\n    alignSelf: "center",\n    backgroundColor: planScreenColors.screen',
    );
    expect(source).toContain(
      "sectionCard: {\n    backgroundColor: planScreenColors.surface",
    );
  });

  it("uses mobile-native plan cards instead of spreadsheet-style tables", () => {
    expect(source).not.toContain("function PlanTable");
    expect(source).not.toContain(
      'headers={["지출일", "구분명", "소비명", "단가", "수량", "금액"]}',
    );
    expect(source).not.toContain("tableHeaderCell");
    expect(source).not.toContain("tableRow");
    expect(source).toContain("function PlanSummaryRows");
    expect(source).toContain("function PlanCommitmentList");
    expect(source).toContain("function MobilePlanSection");
  });

  it("preserves plan sections while refining them into compact scan rows", () => {
    const orderedSections = [
      'title="급여 계획"',
      'title="고정지출"',
      'title="고정저축"',
      'title="생활비"',
    ];

    let previousIndex = -1;
    for (const marker of orderedSections) {
      const nextIndex = source.indexOf(marker);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }

    expect(source).toContain("function PlanSummaryRows");
    expect(source).toContain("styles.sectionIconAnchor");
    expect(source).toContain("styles.compactManageButton");
    expect(source).toContain("관리 >");
    expect(source).not.toContain("function PlanSummaryGrid");
    expect(source).not.toContain("styles.summaryTile");
  });
});
