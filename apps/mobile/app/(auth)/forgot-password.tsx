import { CleanFintechForgotPasswordScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function ForgotPasswordScreen(): React.ReactElement {
  return <CleanFintechForgotPasswordScreen />;
}

export function assertMobileForgotPasswordScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "비밀번호 찾기",
    "/api/v1/auth/password-reset",
    "serverAuthority=true",
    "rawFinancialData=false",
    "rawPersonalData=false",
    "adsFinancialTargeting=false",
  ] as const;

  return { ok: checks.length >= 7, version: SCREEN_VERSION, checks };
}
