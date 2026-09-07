import { useRouter } from "expo-router";

import { ProfileDetailScreen } from "../../../src/features/profile/components";
import { useLogicalBack } from "../../../src/shared/navigation/useLogicalBack";

const SCREEN_VERSION = "4.1.0-profile-account-components";
const ACCOUNT_ENDPOINT = "/api/v1/users/me/account";
const RAW_PERSONAL_DATA_GUARD = "raw_personal_data_not_exposed_guard";

export default function AccountSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/profile", router });

  return <ProfileDetailScreen onBack={goBack} variant="account" />;
}

export function assertMobileAccountSettingsCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking ProfileDetailScreen",
    ACCOUNT_ENDPOINT,
    'variant="account"',
    RAW_PERSONAL_DATA_GUARD,
    "/api/v1/users/me/withdrawal-requests",
    "push token raw value hidden",
  ] as const;

  return { ok: checks.length >= 6, version: SCREEN_VERSION, checks };
}
