import { normalizeGrowthDashboardForTest } from "../../../../app/(tabs)/level/index";

describe("LevelIndexScreen growth dashboard normalization", () => {
  it("accepts the current API dashboard summary shape without throwing", () => {
    const payload = normalizeGrowthDashboardForTest({
      profile: {
        userId: "usr_local",
        level: 1,
        totalExp: 0,
      },
      activeTaskCount: 0,
      completedTaskCount: 0,
      joinedChallengeCount: 0,
      completedContentCount: 0,
      todaySuggestion:
        "오늘의 변동지출 기록과 10분 독서를 완료해 LV UP 경험치를 확보하세요.",
      financialRawDataExposed: false,
    });

    expect(payload.profile.level).toBe(1);
    expect(payload.profile.title).toBe("월급 지킴이");
    expect(payload.profile.totalXp).toBe(0);
    expect(payload.tasks).toHaveLength(0);
    expect(payload.stats.privacyPassRate).toBe("100.00%");
  });
});
