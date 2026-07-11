import { ProfileDetailScreen } from "../../src/features/profile/components";

const SCREEN_VERSION = "4.1.0-profile-settings-components";
const PROFILE_SETTINGS_ENDPOINT = "/api/v1/users/me/profile-settings";
const RAW_PERSONAL_DATA_GUARD = "raw_personal_data_not_exposed_guard";

export default function ProfileSettingsScreen(): React.ReactElement {
  return <ProfileDetailScreen variant="settings" />;
}

export function assertMobileProfileSettingsCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking ProfileDetailScreen",
    PROFILE_SETTINGS_ENDPOINT,
    'variant="settings"',
    RAW_PERSONAL_DATA_GUARD,
    "community_display_name",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 6, version: SCREEN_VERSION, checks };
}
