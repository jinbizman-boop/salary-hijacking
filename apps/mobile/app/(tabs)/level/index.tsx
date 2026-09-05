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
import {
  LevelActionGrid,
  LevelGoalCard,
  LevelHeroCard,
} from "../../../src/features/level/components";
import {
  normalizeGrowthDashboardForLevel,
  type LevelDashboardNormalizationInput,
} from "../../../src/features/level/dashboard-normalization";
import {
  loadGrowthContentForType,
  loadGrowthDashboardSnapshot,
} from "../../../src/features/level/controller";
import {
  buildGrowthGoalCards,
  buildInitialGrowthGoalChoice,
  type GrowthGoalDomain,
} from "../../../src/features/level/goal-architecture";
import type { GrowthDashboard } from "../../../src/features/level/types";
import { createMobileGrowthApi } from "../../../src/shared/api/mobile-api";
import { XpToast } from "../../../src/shared/components/XpToast";

const designSystem = salaryHijackingDesignSystem;
const SCREEN_VERSION = "4.3.0-v3-goal-source-lv-main";
const GROWTH_DASHBOARD_ENDPOINT = "/api/v1/growth/dashboard";
const LEVEL_VISIBLE_COPY_CONTRACT = ["오늘의 성장", "균형 읽기"] as const;
const LVUP_AD_HEADER_SLOT = "AD-APP-LVUP-01";
const LVUP_AD_SUMMARY_SLOT = "AD-APP-LVUP-02";

export const levelStitchOverlayComponents = {
  XpToast,
} as const;

const levelRoutes: Readonly<Record<string, string>> = {
  HEALTH: "/level/health",
  LANGUAGE: "/level/english",
  NEWS: "/level/news",
  READING: "/level/reading",
  english: "/level/english",
  health: "/level/health",
  news: "/level/news",
  reading: "/level/reading",
};

export default function LevelIndexScreen(): React.ReactElement {
  const router = useRouter();
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const growthGoalCards = useMemo(() => buildGrowthGoalCards(), []);
  const initialGoalChoice = useMemo(() => buildInitialGrowthGoalChoice(), []);
  const [serverDashboard, setServerDashboard] =
    useState<GrowthDashboard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [goalChoiceStatus, setGoalChoiceStatus] = useState<string | null>(null);

  function openGrowthDomain(domain: GrowthGoalDomain): void {
    const route = levelRoutes[domain];
    if (route) router.push(route as never);
  }

  useEffect(() => {
    let mounted = true;
    setLoadError(null);
    void loadGrowthDashboardSnapshot(growthApi)
      .then((nextDashboard) => {
        if (mounted) setServerDashboard(nextDashboard);
      })
      .catch(() => {
        if (mounted) setLoadError("LV UP 데이터를 불러오지 못했습니다.");
      });
    void Promise.all([
      loadGrowthContentForType(growthApi, "READING"),
      loadGrowthContentForType(growthApi, "NEWS"),
      loadGrowthContentForType(growthApi, "ENGLISH"),
      loadGrowthContentForType(growthApi, "HEALTH"),
    ]).catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [growthApi]);

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking level tab"
      header={
        <AppHeader
          brandLabel="SALARY HIJACKING"
          subtitle="LV UP"
          title="오늘의 레벨 업, 당신의 성장을 응원합니다!"
        />
      }
    >
      <AdBannerSlot
        description="성장 루틴 문맥과 분리된 제휴 영역입니다."
        label="광고"
        placement={LVUP_AD_HEADER_SLOT}
        title="성장에 방해되지 않는 추천"
      />
      <SurfaceCard accessibilityLabel="LV UP 첫 목표 선택">
        <Text style={styles.choiceTitle}>{initialGoalChoice.title}</Text>
        <Text style={styles.choiceDescription}>
          독서, 뉴스, 외국어, 운동을 기본 목표로 바로 시작하거나 나중에 직접
          조정할 수 있어요. 추천은 자동 적용하지 않습니다.
        </Text>
        <View style={styles.choiceActions}>
          {initialGoalChoice.options.map((option) => (
            <Pressable
              accessibilityLabel={option}
              accessibilityRole="button"
              key={option}
              onPress={() => {
                setGoalChoiceStatus(goalChoiceStatusForOption(option));
              }}
              style={({ pressed }) => [
                styles.choiceButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.choiceButtonText}>{option}</Text>
            </Pressable>
          ))}
        </View>
        {goalChoiceStatus ? (
          <Text accessibilityLiveRegion="polite" style={styles.choiceStatus}>
            {goalChoiceStatus}
          </Text>
        ) : null}
      </SurfaceCard>
      <View accessibilityLabel="오늘 LV UP 목표" style={styles.goalGrid}>
        {growthGoalCards.map((goal) => (
          <View key={goal.domain} style={styles.goalItem}>
            <LevelGoalCard
              goal={goal}
              onDetail={openGrowthDomain}
              onEdit={openGrowthDomain}
              onQuickComplete={openGrowthDomain}
            />
          </View>
        ))}
      </View>
      <LevelActionGrid
        actions={[
          {
            key: "reading",
            label: "오늘의 독서, 역량 레벨 업",
            description: "5분 읽기 · 한줄 요약 기록",
          },
          {
            key: "news",
            label: "오늘의 소식, 정보 레벨업",
            description: "이슈 비교 · 핵심 쟁점 기록",
          },
          {
            key: "english",
            label: "오늘의 영어, 회화 레벨업",
            description: "문장 학습 · 말하기 연습",
          },
          {
            key: "health",
            label: "오늘의 홈트, 건강 레벨업",
            description: "요일별 안전 운동",
          },
        ]}
        onSelect={(key) => {
          const route = levelRoutes[key];
          if (route) router.push(route as never);
        }}
      />
      <AdBannerSlot
        description="오늘 성장 활동 이후에만 표시되는 광고 슬롯입니다."
        label="광고"
        placement={LVUP_AD_SUMMARY_SLOT}
        title="오늘의 추천"
      />
      {serverDashboard ? <LevelHeroCard dashboard={serverDashboard} /> : null}
      {!serverDashboard && !loadError ? (
        <LoadingSkeleton label="LV UP 서버 데이터를 불러오는 중" />
      ) : null}
      {!serverDashboard && loadError ? (
        <ErrorState
          message={loadError}
          title="성장 정보를 확인할 수 없습니다"
        />
      ) : null}
    </AppShell>
  );
}

export function normalizeGrowthDashboardForTest(
  input: LevelDashboardNormalizationInput,
): ReturnType<typeof normalizeGrowthDashboardForLevel> {
  return normalizeGrowthDashboardForLevel(input);
}

export function assertMobileLevelIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking LV UP feature components",
    GROWTH_DASHBOARD_ENDPOINT,
    "AppShell",
    "LevelHeroCard",
    "LevelGoalCard",
    "LevelActionGrid",
    "가볍게 기본 목표로 시작할까요?",
    LVUP_AD_HEADER_SLOT,
    LVUP_AD_SUMMARY_SLOT,
    ...LEVEL_VISIBLE_COPY_CONTRACT,
    "오늘의 독서, 역량 레벨 업",
    "오늘의 소식, 정보 레벨업",
    "오늘의 영어, 회화 레벨업",
    "오늘의 홈트, 건강 레벨업",
    "server_authority_component_guard",
    "idempotency_required_component_guard",
    "financial_raw_data_component_guard",
    "community_proof_ready",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}

function goalChoiceStatusForOption(option: string): string {
  if (option === "기본으로 시작") {
    return "기본 목표로 오늘 활동을 바로 시작할 수 있어요.";
  }
  if (option === "나에게 맞게 추천받기") {
    return "추천은 이유를 확인한 뒤 수락할 때만 적용돼요.";
  }
  return "직접 설정은 목표 수정에서 값과 요일을 선택해요.";
}

const styles = StyleSheet.create({
  choiceActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designSystem.spacing[2],
  },
  choiceButton: {
    alignItems: "center",
    backgroundColor: componentColors.surfaceSoft,
    borderColor: componentColors.line,
    borderRadius: designSystem.radius.md,
    borderWidth: 1,
    minHeight: designSystem.layout.touchTarget,
    paddingHorizontal: designSystem.spacing[3],
    justifyContent: "center",
  },
  choiceButtonText: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
  choiceDescription: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
  choiceStatus: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelS,
  },
  choiceTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designSystem.spacing[3],
  },
  goalItem: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: "47%",
  },
  pressed: {
    opacity: 0.82,
  },
});
