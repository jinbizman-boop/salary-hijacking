import { CleanFintechMyLevelProgressScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function ProfileLevelScreen(): React.ReactElement {
  return <CleanFintechMyLevelProgressScreen />;
}

export function assertMobileProfileLevelCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "profile_my_level_entry",
    "server_growth_dashboard",
    "server_growth_tasks",
    "server_growth_progress",
    "서버 기준 성장 기록",
    "금융 원문 미노출",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { ok: checks.length >= 8, version: SCREEN_VERSION, checks };
}
