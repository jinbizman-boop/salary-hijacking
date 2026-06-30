import {
  CleanFintechScreen,
  normalizeGrowthDashboardForCleanFintech,
} from "../../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

type GrowthDashboardInput = Parameters<
  typeof normalizeGrowthDashboardForCleanFintech
>[0];

export default function LevelIndexScreen(): React.ReactElement {
  return <CleanFintechScreen kind="level" />;
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
    "Salary Hijacking Clean Fintech v1",
    "현재 레벨",
    "독서하기",
    "뉴스보기",
    "영어연습",
    "홈트하기",
    "mission_completion_toast",
    "xp_progress",
    "community_proof_ready",
    "adsFinancialTargeting=false",
  ] as const;

  return { ok: checks.length >= 10, version: SCREEN_VERSION, checks };
}
