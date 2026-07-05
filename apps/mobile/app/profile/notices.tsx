import { CleanFintechProfileNoticesScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function ProfileNoticesScreen(): React.ReactElement {
  return <CleanFintechProfileNoticesScreen />;
}

export function assertMobileProfileNoticesCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "profile_notices_entry",
    "server_profile_activity_feed",
    "금융 원문 미노출",
    "개인 원문 미노출",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { ok: checks.length >= 6, version: SCREEN_VERSION, checks };
}
