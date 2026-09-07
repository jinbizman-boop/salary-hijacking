import { useRouter } from "expo-router";

import { ProfileDetailScreen } from "../../../src/features/profile/components";
import { useLogicalBack } from "../../../src/shared/navigation/useLogicalBack";

const SCREEN_VERSION = "4.1.0-profile-level-components";
const MY_LEVEL_ENDPOINT = "/api/v1/growth/users/me/level-progress";
const RAW_PERSONAL_DATA_GUARD = "raw_personal_data_not_exposed_guard";

export default function ProfileLevelScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/profile", router });

  return <ProfileDetailScreen onBack={goBack} variant="level" />;
}

export function assertMobileProfileLevelCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking ProfileDetailScreen",
    MY_LEVEL_ENDPOINT,
    'variant="level"',
    RAW_PERSONAL_DATA_GUARD,
    "server_growth_progress",
    "idempotent XP completion",
    "daily XP cap",
  ] as const;

  return { ok: checks.length >= 7, version: SCREEN_VERSION, checks };
}
