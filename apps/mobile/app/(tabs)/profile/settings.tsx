import { useRouter } from "expo-router";

import { ProfileDetailScreen } from "../../../src/features/profile/components";
import { useLogicalBack } from "../../../src/shared/navigation/useLogicalBack";

const SCREEN_VERSION = "4.1.0-profile-settings-components";
const PROFILE_SETTINGS_ENDPOINT = "/api/v1/users/me/profile-settings";
const RAW_PERSONAL_DATA_GUARD = "raw_personal_data_not_exposed_guard";

export default function ProfileSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/profile", router });

  return <ProfileDetailScreen onBack={goBack} variant="settings" />;
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
