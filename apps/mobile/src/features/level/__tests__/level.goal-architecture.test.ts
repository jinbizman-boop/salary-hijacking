import {
  GROWTH_GOAL_SOURCE_LABELS,
  LVUP_DEFAULT_GOALS,
  buildGrowthGoalCards,
  buildInitialGrowthGoalChoice,
  buildGrowthGoalSourceDecision,
  createCustomGrowthGoal,
  createColdStartRecommendation,
  materializeDailyMissionSnapshot,
  updateGrowthGoalWithoutMutatingHistory,
} from "../goal-architecture";

describe("LV UP goal architecture", () => {
  it("defines default, recommended, and custom goal sources with Korean labels", () => {
    expect(GROWTH_GOAL_SOURCE_LABELS).toEqual({
      CUSTOM: "내가 설정",
      DEFAULT: "기본 목표",
      RECOMMENDED: "맞춤 추천",
    });
  });

  it("keeps immediate default goals for reading, news, language, and health", () => {
    expect(LVUP_DEFAULT_GOALS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "READING",
          source: "DEFAULT",
          targetUnit: "page",
          targetValue: 1,
        }),
        expect.objectContaining({
          domain: "NEWS",
          source: "DEFAULT",
          targetUnit: "article",
          targetValue: 1,
        }),
        expect.objectContaining({
          domain: "LANGUAGE",
          source: "DEFAULT",
          targetUnit: "sentence",
          targetValue: 3,
        }),
        expect.objectContaining({
          domain: "HEALTH",
          source: "DEFAULT",
          targetUnit: "minute",
          targetValue: 10,
        }),
      ]),
    );
  });

  it("builds goal cards with separate detail, quick complete, and edit CTAs", () => {
    const cards = buildGrowthGoalCards();

    expect(cards).toHaveLength(4);
    expect(cards[0]).toMatchObject({
      detailCta: "독서하기",
      editCta: "목표 수정",
      quickCompleteCta: "빠른 완료",
      sourceLabel: "기본 목표",
    });
    expect(cards.map((card) => card.domain)).toEqual([
      "READING",
      "NEWS",
      "LANGUAGE",
      "HEALTH",
    ]);
  });

  it("keeps recommendation cold start explicit and never auto-applies it", () => {
    const recommendation = createColdStartRecommendation("READING");

    expect(recommendation).toMatchObject({
      autoApply: false,
      decision: "PENDING",
      domain: "READING",
      financialRawDataUsed: false,
      source: "RECOMMENDED",
    });
    expect(recommendation.basisSummary).toContain("기본 목표");
  });

  it("offers first-run default, recommendation, and custom choices without making recommendation mandatory", () => {
    const choice = buildInitialGrowthGoalChoice();

    expect(choice.title).toBe("가볍게 기본 목표로 시작할까요?");
    expect(choice.options).toEqual([
      "기본으로 시작",
      "나에게 맞게 추천받기",
      "직접 설정",
    ]);
    expect(choice.recommendationRequired).toBe(false);
  });

  it("turns recommended goals into explicit accept, edit, and decline decisions without auto-applying them", () => {
    const current = LVUP_DEFAULT_GOALS[0];
    const recommendation = createColdStartRecommendation("READING");

    const accepted = buildGrowthGoalSourceDecision({
      currentGoal: current,
      decision: "ACCEPTED",
      effectiveDate: "2026-09-05",
      recommendation,
    });
    const edited = buildGrowthGoalSourceDecision({
      currentGoal: current,
      decision: "EDITED",
      editedGoal: createCustomGrowthGoal({
        activeDays: ["MON", "WED", "FRI"],
        domain: "READING",
        frequency: "WEEKDAYS",
        targetUnit: "page",
        targetValue: 5,
        title: "출근 전 독서",
      }),
      effectiveDate: "2026-09-06",
      recommendation,
    });
    const declined = buildGrowthGoalSourceDecision({
      currentGoal: current,
      decision: "DECLINED",
      effectiveDate: "2026-09-05",
      recommendation,
    });

    expect(accepted).toMatchObject({
      decision: "ACCEPTED",
      effectiveDate: "2026-09-05",
      recommendationAutoApplied: false,
      recommendationFinancialRawDataUsed: false,
      selectedGoal: expect.objectContaining({ source: "RECOMMENDED" }),
    });
    expect(edited.selectedGoal).toMatchObject({
      activeDays: ["MON", "WED", "FRI"],
      source: "CUSTOM",
      targetValue: 5,
      title: "출근 전 독서",
    });
    expect(declined.selectedGoal).toEqual(current);
  });

  it("keeps already materialized daily missions immutable when a future goal edit is scheduled", () => {
    const todayMission = materializeDailyMissionSnapshot({
      goal: LVUP_DEFAULT_GOALS[0],
      plannedDate: "2026-09-05",
    });
    const nextGoal = createCustomGrowthGoal({
      activeDays: ["TUE", "THU"],
      domain: "READING",
      frequency: "WEEKLY",
      targetUnit: "page",
      targetValue: 7,
      title: "주 2회 집중 독서",
    });

    const update = updateGrowthGoalWithoutMutatingHistory({
      effectiveDate: "2026-09-06",
      historicalMissions: [todayMission],
      nextGoal,
    });

    expect(update.historicalMissions).toEqual([todayMission]);
    expect(update.historicalMissionMutationCount).toBe(0);
    expect(update.nextGoal).toBe(nextGoal);
    expect(update.nextGoalEffectiveDate).toBe("2026-09-06");
  });
});
