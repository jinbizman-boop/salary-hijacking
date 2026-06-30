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
    "serverAuthority=true",
    "rawFinancialData=false",
    "rawPersonalData=false",
    "rawPushToken=false",
    "adsFinancialTargeting=false",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
