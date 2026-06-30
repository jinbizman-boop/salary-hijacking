import { normalizeGrowthDashboardForTest } from "../../../../app/(tabs)/level/index";

describe("LevelIndexScreen growth dashboard normalization", () => {
  it("accepts the current API dashboard summary shape without throwing", () => {
    const payload = normalizeGrowthDashboardForTest({
      profile: {
        level: 1,
        totalExp: 0,
      },
      financialRawDataExposed: false,
    });

    expect(payload.profile.level).toBe(1);
    expect(payload.profile.title).toBe("루틴 지킴이");
    expect(payload.profile.totalXp).toBe(0);
    expect(payload.tasks).toHaveLength(0);
    expect(payload.stats.privacyPassRate).toBe("100.00%");
  });
});
