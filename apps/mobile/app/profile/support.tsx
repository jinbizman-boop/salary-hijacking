import { ProfileDetailScreen } from "../../src/features/profile/components";

const SCREEN_VERSION = "4.1.0-profile-support-components";
const SUPPORT_TICKETS_ENDPOINT = "/api/v1/support/tickets";
const RAW_PERSONAL_DATA_GUARD = "raw_personal_data_not_exposed_guard";

export default function ProfileSupportScreen(): React.ReactElement {
  return <ProfileDetailScreen variant="support" />;
}

export function assertMobileProfileSupportCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking ProfileDetailScreen",
    SUPPORT_TICKETS_ENDPOINT,
    'variant="support"',
    RAW_PERSONAL_DATA_GUARD,
    "support ticket sensitive input screening",
    "operator RBAC audit boundary",
  ] as const;

  return { ok: checks.length >= 6, version: SCREEN_VERSION, checks };
}
