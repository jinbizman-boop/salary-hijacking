export type GrowthGoalDomain = "HEALTH" | "LANGUAGE" | "NEWS" | "READING";
export type GrowthGoalSource = "CUSTOM" | "DEFAULT" | "RECOMMENDED";
export type GrowthGoalUnit = "article" | "minute" | "page" | "sentence";
export type GrowthGoalFrequency = "DAILY" | "WEEKDAYS" | "WEEKLY";
export type GrowthGoalEffectiveDateMode = "TODAY" | "TOMORROW";
export type GrowthGoalIcon =
  | Readonly<{ iconKey: GrowthSystemIconKey; iconType: "SYSTEM_ICON" }>
  | Readonly<{ emoji: string; iconType: "EMOJI" }>;
export type GrowthSystemIconKey =
  | "activity"
  | "book-open"
  | "briefcase"
  | "check"
  | "dumbbell"
  | "heart"
  | "languages"
  | "newspaper"
  | "piggy-bank"
  | "star"
  | "target"
  | "writing";
export type GrowthRecommendationDecision =
  | "ACCEPTED"
  | "DECLINED"
  | "EDITED"
  | "PENDING";

export type GrowthGoalDefinition = Readonly<{
  activeDays: readonly string[];
  domainOption?: string;
  domain: GrowthGoalDomain;
  frequency: GrowthGoalFrequency;
  icon?: GrowthGoalIcon;
  preferredTime?: string;
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
  userIcon: GrowthGoalIcon;
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

export type GrowthGoalSourceDecisionResult = Readonly<{
  decision: GrowthRecommendationDecision;
  effectiveDate: string;
  recommendationAutoApplied: false;
  recommendationFinancialRawDataUsed: false;
  selectedGoal: GrowthGoalDefinition;
}>;

export type GrowthDailyMissionSnapshot = Readonly<{
  domain: GrowthGoalDomain;
  goalSource: GrowthGoalSource;
  immutable: true;
  missionId: string;
  plannedDate: string;
  status: "PLANNED";
  targetUnit: GrowthGoalUnit;
  targetValue: number;
  title: string;
}>;

export type GrowthGoalFutureUpdate = Readonly<{
  historicalMissionMutationCount: 0;
  historicalMissions: readonly GrowthDailyMissionSnapshot[];
  nextGoal: GrowthGoalDefinition;
  nextGoalEffectiveDate: string;
}>;

export type GrowthGoalEditDraft = Readonly<{
  activeDays: readonly string[];
  domain: GrowthGoalDomain;
  domainOption: string;
  effectiveDateMode: GrowthGoalEffectiveDateMode;
  frequency: GrowthGoalFrequency;
  icon: GrowthGoalIcon;
  preferredTime: string;
  source: GrowthGoalSource;
  targetUnit: GrowthGoalUnit;
  targetValue: number;
  title: string;
}>;

export type GrowthGoalSaveRequest = Readonly<{
  activeDays: readonly string[];
  domain: GrowthGoalDomain;
  domainOption: string;
  effectiveDate: string;
  frequency: GrowthGoalFrequency;
  historicalMissionMutationCount: 0;
  icon: GrowthGoalIcon;
  preferredTime: string;
  source: GrowthGoalSource;
  targetUnit: GrowthGoalUnit;
  targetValue: number;
  title: string;
}>;

export type GrowthGoalSaveResult = Readonly<{
  activeGoal: GrowthGoalDefinition & Readonly<{ effectiveDate: string }>;
  historicalMissionMutationCount: 0;
  serverAuthority: true;
}>;

export const GROWTH_GOAL_SOURCE_LABELS = {
  CUSTOM: "내가 설정",
  DEFAULT: "기본 목표",
  RECOMMENDED: "맞춤 추천",
} as const satisfies Record<GrowthGoalSource, string>;

export const DEFAULT_GOAL_ICONS = {
  HEALTH: { iconKey: "dumbbell", iconType: "SYSTEM_ICON" },
  LANGUAGE: { iconKey: "languages", iconType: "SYSTEM_ICON" },
  NEWS: { iconKey: "newspaper", iconType: "SYSTEM_ICON" },
  READING: { iconKey: "book-open", iconType: "SYSTEM_ICON" },
} as const satisfies Record<GrowthGoalDomain, GrowthGoalIcon>;

export const LVUP_DEFAULT_GOALS = [
  {
    activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    domain: "READING",
    frequency: "DAILY",
    source: "DEFAULT",
    targetUnit: "page",
    targetValue: 1,
    title: "독서",
    icon: DEFAULT_GOAL_ICONS.READING,
    preferredTime: "08:00",
    domainOption: "경제·경영",
  },
  {
    activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    domain: "NEWS",
    frequency: "DAILY",
    source: "DEFAULT",
    targetUnit: "article",
    targetValue: 1,
    title: "뉴스",
    icon: DEFAULT_GOAL_ICONS.NEWS,
    preferredTime: "08:00",
    domainOption: "경제",
  },
  {
    activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    domain: "LANGUAGE",
    frequency: "DAILY",
    source: "DEFAULT",
    targetUnit: "sentence",
    targetValue: 3,
    title: "외국어",
    icon: DEFAULT_GOAL_ICONS.LANGUAGE,
    preferredTime: "19:00",
    domainOption: "영어",
  },
  {
    activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    domain: "HEALTH",
    frequency: "DAILY",
    source: "DEFAULT",
    targetUnit: "minute",
    targetValue: 10,
    title: "운동",
    icon: DEFAULT_GOAL_ICONS.HEALTH,
    preferredTime: "20:00",
    domainOption: "홈트",
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
    userIcon: goal.icon ?? DEFAULT_GOAL_ICONS[goal.domain],
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

export function createCustomGrowthGoal({
  activeDays,
  domain,
  domainOption,
  frequency,
  icon,
  preferredTime,
  targetUnit,
  targetValue,
  title,
}: Readonly<{
  activeDays: readonly string[];
  domain: GrowthGoalDomain;
  domainOption?: string;
  frequency: GrowthGoalFrequency;
  icon?: GrowthGoalIcon;
  preferredTime?: string;
  targetUnit: GrowthGoalUnit;
  targetValue: number;
  title: string;
}>): GrowthGoalDefinition {
  const optionalFields = {
    ...(domainOption === undefined ? {} : { domainOption }),
    ...(preferredTime === undefined ? {} : { preferredTime }),
  };
  return {
    activeDays,
    domain,
    frequency,
    icon: normalizeGrowthGoalIcon(icon, DEFAULT_GOAL_ICONS[domain]),
    source: "CUSTOM",
    targetUnit,
    targetValue,
    title,
    ...optionalFields,
  };
}

export function buildGrowthGoalEditDraft(
  goal: GrowthGoalDefinition,
  overrides: Partial<GrowthGoalEditDraft> = {},
): GrowthGoalEditDraft {
  return {
    activeDays: overrides.activeDays ?? goal.activeDays,
    domain: overrides.domain ?? goal.domain,
    domainOption:
      overrides.domainOption ?? goal.domainOption ?? defaultDomainOption(goal.domain),
    effectiveDateMode: overrides.effectiveDateMode ?? "TODAY",
    frequency: overrides.frequency ?? goal.frequency,
    icon: normalizeGrowthGoalIcon(
      overrides.icon ?? goal.icon,
      DEFAULT_GOAL_ICONS[goal.domain],
    ),
    preferredTime: overrides.preferredTime ?? goal.preferredTime ?? "08:00",
    source: overrides.source ?? "CUSTOM",
    targetUnit: overrides.targetUnit ?? goal.targetUnit,
    targetValue: overrides.targetValue ?? goal.targetValue,
    title: overrides.title ?? goal.title,
  };
}

export function buildGrowthGoalSaveRequest(
  draft: GrowthGoalEditDraft,
  today: string,
): GrowthGoalSaveRequest {
  const validation = validateGrowthGoalIcon(draft.icon);
  if (!validation.valid) throw new Error(validation.reason);
  return {
    activeDays: [...draft.activeDays],
    domain: draft.domain,
    domainOption: draft.domainOption,
    effectiveDate:
      draft.effectiveDateMode === "TOMORROW" ? addDays(today, 1) : today,
    frequency: draft.frequency,
    historicalMissionMutationCount: 0,
    icon: draft.icon,
    preferredTime: draft.preferredTime,
    source: draft.source,
    targetUnit: draft.targetUnit,
    targetValue: draft.targetValue,
    title: draft.title,
  };
}

export function validateGrowthGoalIcon(
  icon: GrowthGoalIcon,
): Readonly<{ valid: true } | { reason: string; valid: false }> {
  if (icon.iconType === "SYSTEM_ICON") {
    if (isSystemIconKey(icon.iconKey)) return { valid: true };
    return { reason: "INVALID_SYSTEM_ICON", valid: false };
  }
  if (!icon.emoji.trim()) return { reason: "EMOJI_REQUIRED", valid: false };
  if (icon.emoji.includes("<") || icon.emoji.includes("http")) {
    return { reason: "EMOJI_EXECUTABLE_OR_REMOTE_CONTENT", valid: false };
  }
  return emojiGraphemeCount(icon.emoji) === 1
    ? { valid: true }
    : { reason: "EMOJI_SINGLE_GRAPHEME_REQUIRED", valid: false };
}

export function normalizeGrowthGoalIcon(
  icon: GrowthGoalIcon | null | undefined,
  fallback: GrowthGoalIcon,
): GrowthGoalIcon {
  if (!icon) return fallback;
  return validateGrowthGoalIcon(icon).valid ? icon : fallback;
}

export function buildGrowthGoalSourceDecision({
  currentGoal,
  decision,
  editedGoal,
  effectiveDate,
  recommendation,
}: Readonly<{
  currentGoal: GrowthGoalDefinition;
  decision: GrowthRecommendationDecision;
  editedGoal?: GrowthGoalDefinition;
  effectiveDate: string;
  recommendation: GrowthGoalRecommendation;
}>): GrowthGoalSourceDecisionResult {
  return {
    decision,
    effectiveDate,
    recommendationAutoApplied: false,
    recommendationFinancialRawDataUsed: false,
    selectedGoal:
      decision === "ACCEPTED"
        ? {
            ...currentGoal,
            source: "RECOMMENDED",
            targetUnit: recommendation.suggestedUnit,
            targetValue: recommendation.suggestedTarget,
          }
        : decision === "EDITED" && editedGoal
          ? {
              ...editedGoal,
              source: "CUSTOM",
            }
          : currentGoal,
  };
}

export function materializeDailyMissionSnapshot({
  goal,
  plannedDate,
}: Readonly<{
  goal: GrowthGoalDefinition;
  plannedDate: string;
}>): GrowthDailyMissionSnapshot {
  return {
    domain: goal.domain,
    goalSource: goal.source,
    immutable: true,
    missionId: `mission-${goal.domain.toLowerCase()}-${plannedDate}`,
    plannedDate,
    status: "PLANNED",
    targetUnit: goal.targetUnit,
    targetValue: goal.targetValue,
    title: goal.title,
  };
}

export function updateGrowthGoalWithoutMutatingHistory({
  effectiveDate,
  historicalMissions,
  nextGoal,
}: Readonly<{
  effectiveDate: string;
  historicalMissions: readonly GrowthDailyMissionSnapshot[];
  nextGoal: GrowthGoalDefinition;
}>): GrowthGoalFutureUpdate {
  return {
    historicalMissionMutationCount: 0,
    historicalMissions,
    nextGoal,
    nextGoalEffectiveDate: effectiveDate,
  };
}

function detailCtaForDomain(domain: GrowthGoalDomain): string {
  if (domain === "READING") return "독서하기";
  if (domain === "NEWS") return "뉴스 보기";
  if (domain === "LANGUAGE") return "학습하기";
  return "운동 시작";
}

function defaultDomainOption(domain: GrowthGoalDomain): string {
  if (domain === "READING") return "추천";
  if (domain === "NEWS") return "경제";
  if (domain === "LANGUAGE") return "영어";
  return "홈트";
}

function isSystemIconKey(value: string): value is GrowthSystemIconKey {
  return [
    "activity",
    "book-open",
    "briefcase",
    "check",
    "dumbbell",
    "heart",
    "languages",
    "newspaper",
    "piggy-bank",
    "star",
    "target",
    "writing",
  ].includes(value);
}

function emojiGraphemeCount(value: string): number {
  const segmenter = (
    Intl as typeof Intl & {
      Segmenter?: new (
        locale: string,
        options: { granularity: "grapheme" },
      ) => { segment: (input: string) => Iterable<unknown> };
    }
  ).Segmenter;
  if (segmenter) {
    return [...new segmenter("ko", { granularity: "grapheme" }).segment(value)]
      .length;
  }
  return [...value].length;
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function unitLabel(unit: GrowthGoalUnit): string {
  if (unit === "page") return "페이지";
  if (unit === "article") return "개";
  if (unit === "sentence") return "문장";
  return "분";
}
