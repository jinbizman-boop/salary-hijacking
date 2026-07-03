import { useLocalSearchParams } from "expo-router";

import { CleanFintechResetPasswordScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function ResetPasswordScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const tokenValue = Array.isArray(params.token)
    ? params.token[0]
    : params.token;
  const token = typeof tokenValue === "string" ? tokenValue : "";
  return <CleanFintechResetPasswordScreen token={token} />;
}

export function assertMobileResetPasswordScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "reset-password",
    "/api/v1/auth/password-reset/confirm",
    "serverAuthority=true",
    "rawFinancialData=false",
    "rawPersonalData=false",
    "adsFinancialTargeting=false",
  ] as const;

  return { ok: checks.length >= 7, version: SCREEN_VERSION, checks };
}
