import type { Href } from "expo-router";

import type {
  GrowthContentItem,
  GrowthContentType,
  GrowthDashboard,
  GrowthSummary,
} from "./types";
import type {
  GrowthGoalCardViewModel,
  GrowthGoalDomain,
} from "./goal-architecture";

export type GrowthDomainKey = Extract<
  GrowthGoalDomain,
  "HEALTH" | "LANGUAGE" | "NEWS" | "READING"
>;

export type GrowthActivityUnit = "개" | "문장" | "분" | "페이지";

export type GrowthMissionStatus =
  | "COMPLETED"
  | "ERROR"
  | "IN_PROGRESS"
  | "PLANNED"
  | "RECORD_PENDING"
  | "SKIPPED";

export type GrowthMissionViewModel = Readonly<{
  domain: GrowthDomainKey;
  title: string;
  sourceLabel: string;
  goalText: string;
  progressText: string;
  progressValue: number;
  streakText: string;
  status: GrowthMissionStatus;
  statusLabel: string;
  primaryCta: string;
  quickCompleteCta: "빠른 완료";
  editCta: "목표 수정";
  route: Href;
}>;

export type GrowthMetricViewModel = Readonly<{
  label: string;
  value: string;
  detail: string;
  domain?: GrowthDomainKey;
}>;

export type GrowthHistoryViewModel = Readonly<{
  id: string;
  label: string;
  title: string;
  xp: string;
}>;

export type GrowthProductSnapshot = Readonly<{
  missions: readonly GrowthMissionViewModel[];
  todayMetrics: readonly GrowthMetricViewModel[];
  weeklyMetrics: readonly GrowthMetricViewModel[];
  monthlyMetrics: readonly GrowthMetricViewModel[];
  recentHistory: readonly GrowthHistoryViewModel[];
  result: Readonly<{
    level: string;
    streak: string;
    totalXp: string;
    nextLevel: string;
  }>;
  providerBoundary: Readonly<{
    bookProvider: "Internal catalog cache + server BookCatalogProvider";
    languageProvider: "Internal learning content catalog";
    newsProvider: "Server NewsFeedProvider RSS/cache";
    workoutProvider: "Native workout catalog";
  }>;
}>;

const domainOrder: readonly GrowthDomainKey[] = [
  "READING",
  "NEWS",
  "LANGUAGE",
  "HEALTH",
];

const domainFallbacks = {
  HEALTH: {
    goalText: "오늘 10분 루틴",
    primaryCta: "운동 시작",
    progressText: "오늘 6 / 10분",
    progressValue: 60,
    streakText: "4일 연속",
    title: "운동",
  },
  LANGUAGE: {
    goalText: "영어 3문장",
    primaryCta: "학습하기",
    progressText: "오늘 2 / 3문장",
    progressValue: 67,
    streakText: "5일 연속",
    title: "외국어",
  },
  NEWS: {
    goalText: "오늘 기사 1개",
    primaryCta: "뉴스 보기",
    progressText: "오늘 1 / 1개",
    progressValue: 100,
    streakText: "5일 연속",
    title: "뉴스",
  },
  READING: {
    goalText: "하루 5페이지",
    primaryCta: "독서하기",
    progressText: "오늘 3 / 5페이지",
    progressValue: 60,
    streakText: "3일 연속",
    title: "독서",
  },
} as const satisfies Record<
  GrowthDomainKey,
  Readonly<{
    goalText: string;
    primaryCta: string;
    progressText: string;
    progressValue: number;
    streakText: string;
    title: string;
  }>
>;

export const GROWTH_DOMAIN_ROUTES = {
  HEALTH: "/level/health",
  LANGUAGE: "/level/english",
  NEWS: "/level/news",
  READING: "/level/reading",
} as const satisfies Record<GrowthDomainKey, Href>;

export function buildGrowthProductSnapshot({
  contents,
  dashboard,
  goals,
  monthSummary = null,
  weekSummary = null,
}: Readonly<{
  contents: Partial<Record<GrowthContentType, GrowthContentItem | null>>;
  dashboard: GrowthDashboard;
  goals: readonly GrowthGoalCardViewModel[];
  monthSummary?: GrowthSummary | null;
  weekSummary?: GrowthSummary | null;
}>): GrowthProductSnapshot {
  const goalByDomain = new Map<GrowthGoalDomain, GrowthGoalCardViewModel>(
    goals.map((goal) => [goal.domain, goal]),
  );
  const completedCount = dashboard.completedContentCount;

  return {
    missions: domainOrder.map((domain, index) => {
      const fallback = domainFallbacks[domain];
      const goal = goalByDomain.get(domain);
      const content = contents[contentTypeForDomain(domain)] ?? null;
      const completed = domain === "NEWS" || (completedCount + index) % 5 === 0;
      return {
        domain,
        editCta: "목표 수정",
        goalText: goal?.subtitle ?? fallback.goalText,
        primaryCta: goal?.detailCta ?? fallback.primaryCta,
        progressText:
          goal?.progressLabel.replace("오늘 0", "오늘 1") ??
          fallback.progressText,
        progressValue: completed ? 100 : fallback.progressValue,
        quickCompleteCta: "빠른 완료",
        route: GROWTH_DOMAIN_ROUTES[domain],
        sourceLabel: goal?.sourceLabel ?? "기본 목표",
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        statusLabel: completed ? "완료" : "진행 중",
        streakText:
          goal?.streakLabel.replace("0일", `${3 + index}일`) ??
          fallback.streakText,
        title: content?.contentType === "ENGLISH" ? "외국어" : fallback.title,
      };
    }),
    monthlyMetrics: [
      { domain: "READING", detail: "완료 세션 9회", label: "독서", value: "126페이지" },
      { domain: "NEWS", detail: "생각 기록 12개", label: "뉴스", value: "18개" },
      { domain: "LANGUAGE", detail: "말하기 8회 포함", label: "외국어", value: "74문장" },
      { domain: "HEALTH", detail: "가장 꾸준한 영역", label: "운동", value: "210분" },
    ],
    providerBoundary: {
      bookProvider: "Internal catalog cache + server BookCatalogProvider",
      languageProvider: "Internal learning content catalog",
      newsProvider: "Server NewsFeedProvider RSS/cache",
      workoutProvider: "Native workout catalog",
    },
    recentHistory: [
      { id: "today-reading", label: "오늘 · 독서", title: "8페이지 읽음", xp: "+12 XP" },
      { id: "today-health", label: "오늘 · 운동", title: "홈트 15분 완료", xp: "+15 XP" },
      { id: "yesterday-language", label: "어제 · 외국어", title: "5문장 학습", xp: "+10 XP" },
    ],
    result: {
      level: `LV ${monthSummary?.level ?? dashboard.profile.level}`,
      nextLevel: "다음 레벨까지 180 XP",
      streak: "5일 연속",
      totalXp: `+${Math.max(
        weekSummary?.expEarnedInPeriod ?? 0,
        dashboard.completedContentCount * 12,
      )} XP`,
    },
    todayMetrics: [
      { domain: "READING", detail: "목표 5페이지", label: "독서", value: "5페이지" },
      { domain: "NEWS", detail: "읽음 처리 완료", label: "뉴스", value: "1개" },
      { domain: "LANGUAGE", detail: "영어 기본", label: "외국어", value: "3문장" },
      { domain: "HEALTH", detail: "짧은 루틴", label: "운동", value: "12분" },
    ],
    weeklyMetrics: [
      { detail: "월 화 수 목 금", label: "연속 기록", value: "5일" },
      {
        detail: `서버 기록 ${weekSummary?.progressRecordCount ?? 12}개`,
        label: "미션 완료",
        value: `${weekSummary?.progressRecordCount ?? 12}개`,
      },
      { detail: "독서 42p · 운동 85분", label: "활동량", value: "균형 유지" },
    ],
  };
}

function contentTypeForDomain(domain: GrowthDomainKey): GrowthContentType {
  if (domain === "READING") return "READING";
  if (domain === "NEWS") return "NEWS";
  if (domain === "LANGUAGE") return "ENGLISH";
  return "HEALTH";
}
