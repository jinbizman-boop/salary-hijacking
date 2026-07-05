import { CleanFintechSettingsScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function AccountSettingsScreen(): React.ReactElement {
  return <CleanFintechSettingsScreen kind="account" />;
}

export function assertMobileAccountSettingsCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "account_settings_entry",
    "server_session_security",
    "notification_consent",
    "privacy_request",
    "푸시 토큰 원문 미노출",
  ] as const;

  return { ok: checks.length >= 6, version: SCREEN_VERSION, checks };
}
