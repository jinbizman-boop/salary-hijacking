import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  AdBannerSlot,
  AppHeader,
  AppShell,
  ErrorState,
  LoadingSkeleton,
  SurfaceCard,
  componentColors,
  salaryHijackingDesignSystem,
} from "../../../src/shared/components";
import { createMobileGrowthApi } from "../../../src/shared/api/mobile-api";
import {
  GrowthHistoryList,
  GrowthMissionRow,
  GrowthResultPanel,
  MetricGrid,
  XpRewardToast,
} from "../../../src/features/level/components";
import {
  buildGrowthGoalCards,
} from "../../../src/features/level/goal-architecture";
import { levelDetailContent } from "../../../src/features/level/detail-content";
import {
  buildGrowthProductSnapshot,
  type GrowthMissionViewModel,
} from "../../../src/features/level/product-model";
import {
  loadGrowthContentForType,
  loadGrowthDashboardSnapshot,
  loadGrowthSummarySnapshot,
} from "../../../src/features/level/controller";
export {
  normalizeGrowthDashboardForLevel as normalizeGrowthDashboardForTest,
} from "../../../src/features/level/dashboard-normalization";
import type {
  GrowthContentItem,
  GrowthContentType,
  GrowthDashboard,
  GrowthSummary,
} from "../../../src/features/level/types";

const designSystem = salaryHijackingDesignSystem;
const fallbackDashboard: GrowthDashboard = {
  activeTaskCount: 4,
  completedContentCount: 8,
  completedTaskCount: 12,
  financialRawDataExposed: false,
  joinedChallengeCount: 2,
  profile: { level: 7, totalExp: 880 },
  todaySuggestion: "오늘은 독서와 운동을 먼저 채우면 균형이 좋아요.",
};

const fallbackWeekSummary: GrowthSummary = {
  badgeCount: 0,
  domainTotals: [
    {
      detail: "읽은 페이지",
      domain: "READING",
      label: "독서",
      quantity: 42,
      unit: "PAGE",
      value: "42페이지",
    },
    {
      detail: "읽은 기사",
      domain: "NEWS",
      label: "뉴스",
      quantity: 6,
      unit: "ARTICLE",
      value: "6개",
    },
    {
      detail: "학습 문장",
      domain: "LANGUAGE",
      label: "외국어",
      quantity: 28,
      unit: "SENTENCE",
      value: "28문장",
    },
    {
      detail: "운동 시간",
      domain: "HEALTH",
      label: "운동",
      quantity: 85,
      unit: "MINUTE",
      value: "85분",
    },
  ],
  endDate: "2026-09-07",
  expEarnedInPeriod: 120,
  financialRawDataExposed: false,
  level: 7,
  missionCompletionCount: 12,
  missionTargetCount: 16,
  progressRecordCount: 12,
  recentActivities: [
    {
      domain: "READING",
      id: "fallback-reading",
      label: "오늘 · 독서",
      title: "8페이지 읽음",
      xp: "+12 XP",
    },
    {
      domain: "HEALTH",
      id: "fallback-health",
      label: "오늘 · 운동",
      title: "홈트 15분 완료",
      xp: "+15 XP",
    },
  ],
  startDate: "2026-09-01",
  strongestDomain: "HEALTH",
  streakDays: 5,
  taskCount: 4,
  totalExp: 880,
};

const fallbackMonthSummary: GrowthSummary = {
  ...fallbackWeekSummary,
  expEarnedInPeriod: 360,
  progressRecordCount: 41,
  startDate: "2026-09-01",
};

type ContentMap = Partial<Record<GrowthContentType, GrowthContentItem | null>>;

export default function LevelIndexScreen(): React.ReactElement {
  const router = useRouter();
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [dashboard, setDashboard] = useState<GrowthDashboard>(fallbackDashboard);
  const [weekSummary, setWeekSummary] =
    useState<GrowthSummary>(fallbackWeekSummary);
  const [monthSummary, setMonthSummary] = useState<GrowthSummary>(
    fallbackMonthSummary,
  );
  const [contents, setContents] = useState<ContentMap>(levelDetailContent);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quickCompleteDomain, setQuickCompleteDomain] = useState<string | null>(
    null,
  );

  const goals = useMemo(() => buildGrowthGoalCards(), []);
  const snapshot = useMemo(
    () =>
      buildGrowthProductSnapshot({
        contents,
        dashboard,
        goals,
        monthSummary,
        weekSummary,
      }),
    [contents, dashboard, goals, monthSummary, weekSummary],
  );
  useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      try {
        const [
          nextDashboard,
          nextWeekSummary,
          nextMonthSummary,
          reading,
          news,
          english,
          health,
        ] = await Promise.all([
          loadGrowthDashboardSnapshot(growthApi),
          loadGrowthSummarySnapshot(growthApi, {
            endDate: todayIsoDate(),
            startDate: offsetIsoDate(-6),
          }),
          loadGrowthSummarySnapshot(growthApi, {
            endDate: todayIsoDate(),
            startDate: monthStartIsoDate(),
          }),
          loadGrowthContentForType(growthApi, "READING"),
          loadGrowthContentForType(growthApi, "NEWS"),
          loadGrowthContentForType(growthApi, "ENGLISH"),
          loadGrowthContentForType(growthApi, "HEALTH"),
        ]);
        if (!mounted) return;
        setDashboard(nextDashboard);
        setWeekSummary(nextWeekSummary);
        setMonthSummary(nextMonthSummary);
        setContents({
          ENGLISH: english ?? levelDetailContent.ENGLISH,
          HEALTH: health ?? levelDetailContent.HEALTH,
          NEWS: news ?? levelDetailContent.NEWS,
          READING: reading ?? levelDetailContent.READING,
        });
        setLoadError(null);
      } catch {
        if (!mounted) return;
        setDashboard(fallbackDashboard);
        setWeekSummary(fallbackWeekSummary);
        setMonthSummary(fallbackMonthSummary);
        setContents(levelDetailContent);
        setLoadError("캐시된 성장 콘텐츠로 먼저 보여드려요.");
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [growthApi]);

  const openMission = (mission: GrowthMissionViewModel): void => {
    router.push(mission.route as never);
  };
  const openGoalEditor = (mission: GrowthMissionViewModel): void => {
    router.push({
      pathname: "/level/goals",
      params: { domain: mission.domain },
    } as never);
  };

  return (
    <AppShell
      accessibilityLabel="LV UP"
      header={
        <AppHeader
          actionLabel="목표 관리"
          actionText="목표 관리"
          onAction={() => router.push("/level/goals" as never)}
          subtitle="오늘 할 일부터 기록까지"
          title="LV UP"
        />
      }
    >
      <AdBannerSlot
        description="오늘 성장 흐름을 방해하지 않는 작은 배너"
        label="광고"
        placement="AD-APP-LVUP-01"
        title="LV UP 추천"
      />

      <SurfaceCard accessibilityLabel="오늘 나 관리">
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.kicker}>오늘 무엇을 할까요?</Text>
            <Text style={styles.sectionTitle}>오늘 나 관리</Text>
          </View>
          <Text style={styles.completionText}>3 / 4 완료</Text>
        </View>
      </SurfaceCard>

      <View style={styles.missionStack}>
        {snapshot.missions.map((mission) => (
          <GrowthMissionRow
            key={mission.domain}
            mission={mission}
            onDetail={openMission}
            onEdit={openGoalEditor}
            onQuickComplete={(nextMission) => {
              setQuickCompleteDomain(nextMission.title);
            }}
          />
        ))}
      </View>

      <SurfaceCard accessibilityLabel="오늘의 성장">
        <Text style={styles.sectionTitle}>오늘의 성장</Text>
        <MetricGrid metrics={snapshot.todayMetrics} />
      </SurfaceCard>

      <SurfaceCard accessibilityLabel="이번 주 성장">
        <Text style={styles.sectionTitle}>이번 주 성장</Text>
        <View style={styles.weekDots}>
          {["월", "화", "수", "목", "금", "토", "일"].map((day, index) => (
            <View key={day} style={styles.weekDotItem}>
              <View
                style={[
                  styles.weekDot,
                  index < 4 && styles.weekDotDone,
                  index === 4 && styles.weekDotHalf,
                ]}
              />
              <Text style={styles.weekLabel}>{day}</Text>
            </View>
          ))}
        </View>
        <MetricGrid metrics={snapshot.weeklyMetrics} />
      </SurfaceCard>

      <SurfaceCard accessibilityLabel="이번 달 성장">
        <Text style={styles.sectionTitle}>이번 달 성장</Text>
        <MetricGrid metrics={snapshot.monthlyMetrics} />
      </SurfaceCard>

      <SurfaceCard accessibilityLabel="최근 성장 기록">
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 성장 기록</Text>
          <Pressable
            accessibilityLabel="전체 성장 기록 보기"
            accessibilityRole="button"
            onPress={() => router.push("/level/history" as never)}
          >
            <Text style={styles.linkText}>전체보기</Text>
          </Pressable>
        </View>
        <GrowthHistoryList rows={snapshot.recentHistory} />
      </SurfaceCard>

      <AdBannerSlot
        description="성장 기록 사이에 작게 배치되는 배너"
        label="광고"
        placement="AD-APP-LVUP-02"
        title="오늘의 성장"
      />

      <GrowthResultPanel {...snapshot.result} />

      <SurfaceCard accessibilityLabel="목표 관리 진입">
        <Text style={styles.sectionTitle}>목표 관리</Text>
        <Text style={styles.body}>
          기본 목표, 맞춤 추천, 내가 설정한 목표를 영역별로 관리해요.
        </Text>
        <Text style={styles.body}>
          추천은 설명을 확인한 뒤 수락, 수정, 거절할 수 있고 자동 적용되지 않아요.
        </Text>
      </SurfaceCard>

      {loadError ? (
        <ErrorState
          message={loadError}
          title="최신 성장 데이터를 다시 불러오는 중입니다"
        />
      ) : null}

      {dashboard.activeTaskCount === 0 ? (
        <LoadingSkeleton label="LV UP 데이터를 불러오는 중" />
      ) : null}

      {quickCompleteDomain ? (
        <XpRewardToast earnedXp={12} rewardSource={`${quickCompleteDomain} 완료`} />
      ) : null}
    </AppShell>
  );
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function offsetIsoDate(dayOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function monthStartIsoDate(): string {
  return `${todayIsoDate().slice(0, 8)}01`;
}

export const levelScreenProductContract = [
  "오늘 나 관리",
  "독서",
  "뉴스",
  "외국어",
  "운동",
  "오늘의 성장",
  "이번 주 성장",
  "이번 달 성장",
  "최근 성장 기록",
  "성장 결과",
  "목표 관리",
  "기본 목표",
  "맞춤 추천",
  "내가 설정",
  "AD-APP-LVUP-01",
  "AD-APP-LVUP-02",
] as const;

const styles = StyleSheet.create({
  body: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
  completionText: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
  kicker: {
    color: componentColors.textMuted,
    ...designSystem.typography.caption,
  },
  linkText: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
  missionStack: {
    gap: designSystem.spacing[2],
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[3],
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
  weekDot: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: designSystem.colors.border.default,
  },
  weekDotDone: {
    backgroundColor: componentColors.primaryGreen,
  },
  weekDotHalf: {
    backgroundColor: designSystem.colors.semantic.warning,
  },
  weekDotItem: {
    alignItems: "center",
    gap: designSystem.spacing[1],
  },
  weekDots: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekLabel: {
    color: componentColors.textMuted,
    ...designSystem.typography.caption,
  },
});
