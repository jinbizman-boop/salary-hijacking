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
  GrowthGoalIcon,
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
  userIcon: GrowthGoalIcon;
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
  userIcon?: GrowthGoalIcon;
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
  const weekTotals = totalsByDomain(weekSummary);
  const monthTotals = totalsByDomain(monthSummary);

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
        userIcon: goal?.userIcon ?? {
          iconKey: "target",
          iconType: "SYSTEM_ICON",
        },
      };
    }),
    monthlyMetrics: domainOrder.map((domain) =>
      metricFromTotal(monthTotals.get(domain), monthlyFallback(domain)),
    ),
    providerBoundary: {
      bookProvider: "Internal catalog cache + server BookCatalogProvider",
      languageProvider: "Internal learning content catalog",
      newsProvider: "Server NewsFeedProvider RSS/cache",
      workoutProvider: "Native workout catalog",
    },
    recentHistory:
      weekSummary?.recentActivities.length ||
      monthSummary?.recentActivities.length
        ? [
            ...(weekSummary?.recentActivities ?? []),
            ...(monthSummary?.recentActivities ?? []),
          ]
            .slice(0, 3)
            .map((item) =>
              withHistoryIcon(item, goalByDomain.get(item.domain)?.userIcon),
            )
        : domainOrder
            .slice(0, 3)
            .map((domain) =>
              withHistoryIcon(
                {
                  id: `recent-${domain.toLowerCase()}`,
                  label: `최근 · ${domainFallbacks[domain].title}`,
                  title: fallbackActivityTitle(domain),
                  xp: "+0 XP",
                },
                goalByDomain.get(domain)?.userIcon,
              ),
            ),
    result: {
      level: `LV ${monthSummary?.level ?? dashboard.profile.level}`,
      nextLevel: "다음 레벨까지 서버 기준 계산",
      streak: `${weekSummary?.streakDays ?? 0}일 연속`,
      totalXp: `+${Math.max(
        weekSummary?.expEarnedInPeriod ?? 0,
        dashboard.completedContentCount * 12,
      )} XP`,
    },
    todayMetrics: domainOrder.map((domain) =>
      metricFromTotal(weekTotals.get(domain), todayFallback(domain)),
    ),
    weeklyMetrics: [
      {
        detail: `${weekSummary?.missionCompletionCount ?? 0} / ${
          weekSummary?.missionTargetCount ?? 0
        } 미션`,
        label: "연속 기록",
        value: `${weekSummary?.streakDays ?? 0}일`,
      },
      {
        detail: `서버 기록 ${weekSummary?.progressRecordCount ?? 0}개`,
        label: "미션 완료",
        value: `${weekSummary?.missionCompletionCount ?? 0}개`,
      },
      weeklyVolumeMetric(weekTotals),
    ],
  };
}

function totalsByDomain(
  summary: GrowthSummary | null | undefined,
): Map<GrowthDomainKey, GrowthMetricViewModel> {
  return new Map(
    (summary?.domainTotals ?? []).map((metric) => [
      metric.domain,
      {
        detail: metric.detail,
        domain: metric.domain,
        label: metric.label,
        value: metric.value,
      },
    ]),
  );
}

function metricFromTotal(
  metric: GrowthMetricViewModel | undefined,
  fallback: GrowthMetricViewModel,
): GrowthMetricViewModel {
  return metric ?? fallback;
}

function todayFallback(domain: GrowthDomainKey): GrowthMetricViewModel {
  const fallback = domainFallbacks[domain];
  return {
    detail: fallback.goalText,
    domain,
    label: fallback.title,
    value: defaultTodayValue(domain),
  };
}

function monthlyFallback(domain: GrowthDomainKey): GrowthMetricViewModel {
  const fallback = domainFallbacks[domain];
  return {
    detail: "서버 기록 0개",
    domain,
    label: fallback.title,
    value: "0",
  };
}

function weeklyVolumeMetric(
  weekTotals: Map<GrowthDomainKey, GrowthMetricViewModel>,
): GrowthMetricViewModel {
  const reading = weekTotals.get("READING")?.value ?? "0페이지";
  const health = weekTotals.get("HEALTH")?.value ?? "0분";
  return {
    detail: `독서 ${reading} · 운동 ${health}`,
    label: "활동량",
    value: `${weekTotals.size}개 영역`,
  };
}

function fallbackActivityTitle(domain: GrowthDomainKey): string {
  if (domain === "READING") return "독서 페이지를 기록해요";
  if (domain === "NEWS") return "읽은 기사를 기록해요";
  if (domain === "LANGUAGE") return "학습 문장을 기록해요";
  return "운동 시간을 기록해요";
}

function withHistoryIcon(
  item: Omit<GrowthHistoryViewModel, "userIcon">,
  userIcon: GrowthGoalIcon | undefined,
): GrowthHistoryViewModel {
  return userIcon ? { ...item, userIcon } : item;
}

function defaultTodayValue(domain: GrowthDomainKey): string {
  if (domain === "READING") return "5페이지";
  if (domain === "NEWS") return "1개";
  if (domain === "LANGUAGE") return "3문장";
  return "12분";
}

function contentTypeForDomain(domain: GrowthDomainKey): GrowthContentType {
  if (domain === "READING") return "READING";
  if (domain === "NEWS") return "NEWS";
  if (domain === "LANGUAGE") return "ENGLISH";
  return "HEALTH";
}
