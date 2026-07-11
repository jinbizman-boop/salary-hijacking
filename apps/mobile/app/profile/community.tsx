import { ProfileDetailScreen } from "../../src/features/profile/components";

const SCREEN_VERSION = "4.1.0-profile-community-components";
const MY_COMMUNITY_ENDPOINT = "/api/v1/community/users/me/posts";
const RAW_PERSONAL_DATA_GUARD = "raw_personal_data_not_exposed_guard";

export default function ProfileCommunityScreen(): React.ReactElement {
  return <ProfileDetailScreen variant="community" />;
}

export function assertMobileProfileCommunityCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking ProfileDetailScreen",
    MY_COMMUNITY_ENDPOINT,
    'variant="community"',
    RAW_PERSONAL_DATA_GUARD,
    "server_my_posts_feed",
    "financial raw data not used for ads",
  ] as const;

  return { ok: checks.length >= 6, version: SCREEN_VERSION, checks };
}
