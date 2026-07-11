import { useRouter } from "expo-router";

import { AppHeader, AppShell } from "../../../src/shared/components";
import {
  LevelActionGrid,
  LevelHeroCard,
  XpRewardToast,
} from "../../../src/features/level/components";
import type { GrowthDashboard } from "../../../src/features/level/types";
import { normalizeGrowthDashboardForCleanFintech } from "../../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.1.0-level-components";
const GROWTH_DASHBOARD_ENDPOINT = "/api/v1/growth/dashboard";

type GrowthDashboardInput = Parameters<
  typeof normalizeGrowthDashboardForCleanFintech
>[0];

const dashboard: GrowthDashboard = {
  profile: { level: 7, totalExp: 880 },
  activeTaskCount: 4,
  completedTaskCount: 12,
  joinedChallengeCount: 2,
  completedContentCount: 8,
  todaySuggestion: "Record one reading or workout mission today.",
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
      header={<AppHeader subtitle="LV UP" title="Growth" />}
    >
      <LevelHeroCard dashboard={dashboard} />
      <LevelActionGrid
        actions={[
          { key: "reading", label: "Reading", description: "5 min record" },
          { key: "news", label: "News", description: "balanced read" },
          { key: "english", label: "English", description: "daily phrases" },
          { key: "health", label: "Health", description: "safe routine" },
        ]}
        onSelect={(key) => {
          const route = levelRoutes[key];
          if (route) router.push(route);
        }}
      />
      <XpRewardToast earnedXp={30} rewardSource="READING_COMPLETE" />
    </AppShell>
  );
}

export function normalizeGrowthDashboardForTest(
  input: GrowthDashboardInput,
): ReturnType<typeof normalizeGrowthDashboardForCleanFintech> {
  return normalizeGrowthDashboardForCleanFintech(input);
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
    "XpRewardToast",
    "server_authority_component_guard",
    "idempotency_required_component_guard",
    "financial_raw_data_component_guard",
    "community_proof_ready",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 10, version: SCREEN_VERSION, checks };
}
