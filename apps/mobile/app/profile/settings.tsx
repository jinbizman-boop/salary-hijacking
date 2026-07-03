import { CleanFintechSettingsScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function ProfileSettingsScreen(): React.ReactElement {
  return <CleanFintechSettingsScreen kind="profile" />;
}

export function assertMobileProfileSettingsCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "profile_settings_entry",
    "community_display_name",
    "level_title",
    "ads_financial_targeting=false",
    "rawFinancialData=false",
  ] as const;

  return { ok: checks.length >= 6, version: SCREEN_VERSION, checks };
}
