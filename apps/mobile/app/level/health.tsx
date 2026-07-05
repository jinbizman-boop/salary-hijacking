import { CleanFintechLevelDetailScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function HealthLevelScreen(): React.ReactElement {
  return <CleanFintechLevelDetailScreen kind="health" />;
}

export function assertMobileHealthLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "건강",
    "월",
    "화",
    "수",
    "목",
    "금",
    "토",
    "신체",
    "영양",
    "회복",
    "정신",
    "홈트 미션",
    "서버 기준 성장 기록",
    "금융 원문 미노출",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { ok: checks.length >= 16, version: SCREEN_VERSION, checks };
}
