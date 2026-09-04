import {
  GROWTH_GOAL_SOURCE_LABELS,
  LVUP_DEFAULT_GOALS,
  buildGrowthGoalCards,
  buildInitialGrowthGoalChoice,
  createColdStartRecommendation,
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
});
