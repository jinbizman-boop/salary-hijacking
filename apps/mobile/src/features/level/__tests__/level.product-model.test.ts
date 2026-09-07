import { buildGrowthGoalCards } from "../goal-architecture";
import { levelDetailContent } from "../detail-content";
import { buildGrowthProductSnapshot } from "../product-model";
import type { GrowthDashboard, GrowthSummary } from "../types";

const dashboard: GrowthDashboard = {
  activeTaskCount: 4,
  completedContentCount: 8,
  completedTaskCount: 12,
  financialRawDataExposed: false,
  joinedChallengeCount: 2,
  profile: { level: 7, totalExp: 880 },
  todaySuggestion: "오늘은 독서와 운동을 먼저 채워요.",
};

const weekSummary: GrowthSummary = {
  badgeCount: 2,
  endDate: "2026-09-07",
  expEarnedInPeriod: 96,
  financialRawDataExposed: false,
  level: 8,
  progressRecordCount: 7,
  startDate: "2026-09-01",
  taskCount: 4,
  totalExp: 940,
};

const monthSummary: GrowthSummary = {
  ...weekSummary,
  expEarnedInPeriod: 312,
  level: 8,
  progressRecordCount: 31,
  startDate: "2026-09-01",
};

describe("LV UP product model", () => {
  it("builds a four-domain mission board before XP and level result data", () => {
    const snapshot = buildGrowthProductSnapshot({
      contents: levelDetailContent,
      dashboard,
      goals: buildGrowthGoalCards(),
    });

    expect(snapshot.missions.map((mission) => mission.domain)).toEqual([
      "READING",
      "NEWS",
      "LANGUAGE",
      "HEALTH",
    ]);
    expect(snapshot.todayMetrics.map((metric) => metric.value)).toEqual([
      "5페이지",
      "1개",
      "3문장",
      "12분",
    ]);
    expect(snapshot.result.level).toBe("LV 7");
  });

  it("uses server summary for visible progress totals when the API provides it", () => {
    const snapshot = buildGrowthProductSnapshot({
      contents: levelDetailContent,
      dashboard,
      goals: buildGrowthGoalCards(),
      monthSummary,
      weekSummary,
    });

    expect(snapshot.weeklyMetrics).toContainEqual({
      detail: "서버 기록 7개",
      label: "미션 완료",
      value: "7개",
    });
    expect(snapshot.result.level).toBe("LV 8");
    expect(snapshot.result.totalXp).toBe("+96 XP");
  });

  it("keeps growth content provider boundaries explicit without Naver Book API usage", () => {
    const snapshot = buildGrowthProductSnapshot({
      contents: levelDetailContent,
      dashboard,
      goals: buildGrowthGoalCards(),
    });

    expect(snapshot.providerBoundary.bookProvider).toContain(
      "BookCatalogProvider",
    );
    expect(snapshot.providerBoundary.newsProvider).toContain(
      "NewsFeedProvider",
    );
    expect(snapshot.providerBoundary.languageProvider).toContain(
      "Internal learning content catalog",
    );
    expect(snapshot.providerBoundary.workoutProvider).toContain(
      "Native workout catalog",
    );
    expect(JSON.stringify(snapshot)).not.toContain("Naver Book");
    expect(JSON.stringify(snapshot)).not.toContain("salary");
    expect(JSON.stringify(snapshot)).not.toContain("expense");
  });
});
