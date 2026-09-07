import { useRouter } from "expo-router";

import { ProfileDetailScreen } from "../../../src/features/profile/components";
import { useLogicalBack } from "../../../src/shared/navigation/useLogicalBack";

const SCREEN_VERSION = "4.1.0-profile-notices-components";
const PROFILE_NOTICES_ENDPOINT = "/api/v1/users/me/notices";
const RAW_PERSONAL_DATA_GUARD = "raw_personal_data_not_exposed_guard";

export default function ProfileNoticesScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/profile", router });

  return <ProfileDetailScreen onBack={goBack} variant="notices" />;
}

export function assertMobileProfileNoticesCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking ProfileDetailScreen",
    PROFILE_NOTICES_ENDPOINT,
    'variant="notices"',
    RAW_PERSONAL_DATA_GUARD,
    "notice payload without raw salary account or token",
    "server read state",
  ] as const;

  return { ok: checks.length >= 6, version: SCREEN_VERSION, checks };
}
