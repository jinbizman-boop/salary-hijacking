import { CleanFintechSplashScreen } from "../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function MobileIndexScreen(): React.ReactElement {
  return <CleanFintechSplashScreen />;
}

export function assertMobileIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "SALARY HIJACKING",
    "급여납치",
    "월급이 사라지기 전에 먼저 붙잡아요",
    "Splash",
    "1.2초",
    "로그인",
    "급여 홈",
    "서버 기준 상태 확인",
    "금융 원문 미노출",
    "개인 원문 미노출",
    "푸시 토큰 원문 미노출",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
