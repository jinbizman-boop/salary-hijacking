export type GrowthGoalDomain = "HEALTH" | "LANGUAGE" | "NEWS" | "READING";
export type GrowthGoalSource = "CUSTOM" | "DEFAULT" | "RECOMMENDED";
export type GrowthGoalUnit = "article" | "minute" | "page" | "sentence";
export type GrowthGoalFrequency = "DAILY" | "WEEKDAYS" | "WEEKLY";
export type GrowthRecommendationDecision =
  | "ACCEPTED"
  | "DECLINED"
  | "EDITED"
  | "PENDING";

export type GrowthGoalDefinition = Readonly<{
  activeDays: readonly string[];
  domain: GrowthGoalDomain;
  frequency: GrowthGoalFrequency;
  source: GrowthGoalSource;
  targetUnit: GrowthGoalUnit;
  targetValue: number;
  title: string;
}>;

export type GrowthGoalCardViewModel = Readonly<{
  detailCta: string;
  domain: GrowthGoalDomain;
  editCta: "목표 수정";
  progressLabel: string;
  quickCompleteCta: "빠른 완료";
  sourceLabel: string;
  streakLabel: string;
  subtitle: string;
  title: string;
}>;

export type GrowthGoalRecommendation = Readonly<{
  autoApply: false;
  basisSummary: string;
  decision: GrowthRecommendationDecision;
  domain: GrowthGoalDomain;
  financialRawDataUsed: false;
  source: "RECOMMENDED";
  suggestedTarget: number;
  suggestedUnit: GrowthGoalUnit;
}>;

export const GROWTH_GOAL_SOURCE_LABELS = {
  CUSTOM: "내가 설정",
  DEFAULT: "기본 목표",
  RECOMMENDED: "맞춤 추천",
} as const satisfies Record<GrowthGoalSource, string>;

export const LVUP_DEFAULT_GOALS = [
  {
    activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    domain: "READING",
    frequency: "DAILY",
    source: "DEFAULT",
    targetUnit: "page",
    targetValue: 1,
    title: "독서",
  },
  {
    activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    domain: "NEWS",
    frequency: "DAILY",
    source: "DEFAULT",
    targetUnit: "article",
    targetValue: 1,
    title: "뉴스",
  },
  {
    activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    domain: "LANGUAGE",
    frequency: "DAILY",
    source: "DEFAULT",
    targetUnit: "sentence",
    targetValue: 3,
    title: "외국어",
  },
  {
    activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    domain: "HEALTH",
    frequency: "DAILY",
    source: "DEFAULT",
    targetUnit: "minute",
    targetValue: 10,
    title: "운동",
  },
] as const satisfies readonly GrowthGoalDefinition[];

export function buildInitialGrowthGoalChoice(): {
  readonly options: readonly [
    "기본으로 시작",
    "나에게 맞게 추천받기",
    "직접 설정",
  ];
  readonly recommendationRequired: false;
  readonly title: "가볍게 기본 목표로 시작할까요?";
} {
  return {
    options: ["기본으로 시작", "나에게 맞게 추천받기", "직접 설정"],
    recommendationRequired: false,
    title: "가볍게 기본 목표로 시작할까요?",
  };
}

export function buildGrowthGoalCards(
  goals: readonly GrowthGoalDefinition[] = LVUP_DEFAULT_GOALS,
): readonly GrowthGoalCardViewModel[] {
  return goals.map((goal) => ({
    detailCta: detailCtaForDomain(goal.domain),
    domain: goal.domain,
    editCta: "목표 수정",
    progressLabel: `오늘 0 / ${goal.targetValue}${unitLabel(goal.targetUnit)}`,
    quickCompleteCta: "빠른 완료",
    sourceLabel: GROWTH_GOAL_SOURCE_LABELS[goal.source],
    streakLabel: "0일 연속",
    subtitle: `하루 ${goal.targetValue}${unitLabel(goal.targetUnit)}`,
    title: goal.title,
  }));
}

export function createColdStartRecommendation(
  domain: GrowthGoalDomain,
): GrowthGoalRecommendation {
  const defaultGoal = LVUP_DEFAULT_GOALS.find((goal) => goal.domain === domain);
  if (!defaultGoal) throw new Error("UNKNOWN_GROWTH_GOAL_DOMAIN");

  return {
    autoApply: false,
    basisSummary:
      "활동 기록이 충분하지 않아 기본 목표를 기준으로 추천을 준비했어요.",
    decision: "PENDING",
    domain,
    financialRawDataUsed: false,
    source: "RECOMMENDED",
    suggestedTarget: defaultGoal.targetValue,
    suggestedUnit: defaultGoal.targetUnit,
  };
}

function detailCtaForDomain(domain: GrowthGoalDomain): string {
  if (domain === "READING") return "독서하기";
  if (domain === "NEWS") return "뉴스 보기";
  if (domain === "LANGUAGE") return "학습하기";
  return "운동 시작";
}

function unitLabel(unit: GrowthGoalUnit): string {
  if (unit === "page") return "페이지";
  if (unit === "article") return "개";
  if (unit === "sentence") return "문장";
  return "분";
}
