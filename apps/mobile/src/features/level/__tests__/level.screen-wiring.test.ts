import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("level tab screen wiring", () => {
  it("uses level feature components instead of the clean fintech fallback", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(tabs)",
        "level",
        "index.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).not.toContain("clean-fintech-screens");
    expect(source).not.toContain("normalizeGrowthDashboardForCleanFintech");
    expect(source).toContain("AppShell");
    expect(source).toContain("GrowthMissionRow");
    expect(source).toContain("GrowthResultPanel");
    expect(source).not.toContain("LevelActionGrid");
    expect(source).not.toContain("goalGrid");
    expect(source).toContain("오늘 나 관리");
    expect(source).toContain("오늘의 성장");
    expect(source).toContain("이번 주 성장");
    expect(source).toContain("이번 달 성장");
    expect(source).toContain("최근 성장 기록");
    expect(source).toContain("기본 목표");
    expect(source).toContain("맞춤 추천");
    expect(source).toContain("내가 설정");
    expect(source).toContain("buildGrowthGoalCards");
    expect(source).not.toContain("가볍게 기본 목표로 시작할까요?");
    expect(source).not.toContain("균형 대기");
    expect(source).not.toContain("LV 준비");
    expect(source).toContain("AD-APP-LVUP-01");
    expect(source).toContain("AD-APP-LVUP-02");
    expect(source).toContain("<XpRewardToast");
    expect(source.indexOf("오늘 나 관리")).toBeLessThan(
      source.indexOf("<GrowthResultPanel"),
    );
    expect(source).toContain("createMobileGrowthApi");
    expect(source).toContain("loadGrowthDashboardSnapshot");
    expect(source).toContain("loadGrowthContentForType");
    expect(source).toContain("GROWTH_DASHBOARD_PATH");
    expect(source).toContain("normalizeGrowthDashboardForLevel");
    expect(source).toContain("normalizeGrowthDashboardForTest");
  });

  it("keeps goal source management progressive instead of repeating onboarding on the main screen", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(tabs)",
        "level",
        "index.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("목표 관리");
    expect(source).toContain("수락, 수정, 거절");
    expect(source).not.toContain("추천 수락");
    expect(source).not.toContain("추천 수정 적용");
    expect(source).not.toContain("추천 거절");
    expect(source).not.toContain("직접 목표 저장");
    expect(source).not.toContain("recommendationAutoApplied=");
    expect(source).not.toContain("오늘 미션 snapshot");
  });
});
