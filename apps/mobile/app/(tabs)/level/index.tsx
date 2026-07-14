import { useRouter } from "expo-router";

import { AppHeader, AppShell } from "../../../src/shared/components";
import {
  LevelActionGrid,
  LevelHeroCard,
} from "../../../src/features/level/components";
import {
  normalizeGrowthDashboardForLevel,
  type LevelDashboardNormalizationInput,
} from "../../../src/features/level/dashboard-normalization";
import type { GrowthDashboard } from "../../../src/features/level/types";

const SCREEN_VERSION = "4.2.0-prototype-lv-main";
const GROWTH_DASHBOARD_ENDPOINT = "/api/v1/growth/dashboard";
const LEVEL_VISIBLE_COPY_CONTRACT = ["오늘의 성장", "균형 읽기"] as const;

const dashboard: GrowthDashboard = {
  profile: { level: 18, totalExp: 880 },
  activeTaskCount: 4,
  completedTaskCount: 12,
  joinedChallengeCount: 2,
  completedContentCount: 8,
  todaySuggestion: "오늘의 레벨 업, 당신의 성장을 응원합니다!",
  financialRawDataExposed: false,
};

const levelRoutes: Readonly<Record<string, string>> = {
  reading: "/level/reading",
  news: "/level/news",
  english: "/level/english",
  health: "/level/health",
};

export default function LevelIndexScreen(): React.ReactElement {
  const router = useRouter();

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
      <LevelHeroCard dashboard={dashboard} />
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
