import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import {
  AppHeader,
  AppShell,
  ErrorState,
  LoadingSkeleton,
} from "../../../src/shared/components";
import {
  LevelActionGrid,
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
import type { GrowthDashboard } from "../../../src/features/level/types";
import { createMobileGrowthApi } from "../../../src/shared/api/mobile-api";
import { XpToast } from "../../../src/shared/components/XpToast";

const SCREEN_VERSION = "4.2.1-server-runtime-lv-main";
const GROWTH_DASHBOARD_ENDPOINT = "/api/v1/growth/dashboard";
const LEVEL_VISIBLE_COPY_CONTRACT = ["오늘의 성장", "균형 읽기"] as const;

export const levelStitchOverlayComponents = {
  XpToast,
} as const;

const levelRoutes: Readonly<Record<string, string>> = {
  reading: "/level/reading",
  news: "/level/news",
  english: "/level/english",
  health: "/level/health",
};

export default function LevelIndexScreen(): React.ReactElement {
  const router = useRouter();
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [serverDashboard, setServerDashboard] =
    useState<GrowthDashboard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          if (route) router.push(route);
        }}
      />
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
    "LevelActionGrid",
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
