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
    expect(source).toContain("LevelHeroCard");
    expect(source).not.toContain("LevelActionGrid");
    expect(source).not.toContain("goalGrid");
    expect(source).toContain("오늘 나 관리");
    expect(source).toContain("오늘의 성장");
    expect(source).toContain("이번 주 성장");
    expect(source).toContain("이번 달 성장");
    expect(source).toContain("최근 성장 기록");
    expect(source).toContain("기본 목표 · 맞춤 추천 · 내가 설정");
    expect(source).toContain("buildGrowthGoalCards");
    expect(source).toContain("가볍게 기본 목표로 시작할까요?");
    expect(source).toContain("AD-APP-LVUP-01");
    expect(source).toContain("AD-APP-LVUP-02");
    expect(source).not.toContain("<XpRewardToast");
    expect(source).toContain("createMobileGrowthApi");
    expect(source).toContain("loadGrowthDashboardSnapshot");
    expect(source).toContain("loadGrowthContentForType");
    expect(source).toContain("/api/v1/growth/dashboard");
    expect(source).toContain("normalizeGrowthDashboardForLevel");
    expect(source).toContain("normalizeGrowthDashboardForTest");
  });

  it("wires the V3 default, recommended, and custom goal decisions into the LV UP screen", () => {
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

    expect(source).toContain("buildGrowthGoalSourceDecision");
    expect(source).toContain("createCustomGrowthGoal");
    expect(source).toContain("materializeDailyMissionSnapshot");
    expect(source).toContain("추천 수락");
    expect(source).toContain("추천 수정 적용");
    expect(source).toContain("추천 거절");
    expect(source).toContain("직접 목표 저장");
    expect(source).toContain("오늘 기준 목표");
    expect(source).toContain("recommendationAutoApplied");
    expect(source).not.toContain("오늘 미션 snapshot");
  });
});
