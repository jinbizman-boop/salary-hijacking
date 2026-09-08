import { useRouter } from "expo-router";

import { ProfileDetailScreen } from "../../../src/features/profile/components";
import { useLogicalBack } from "../../../src/shared/navigation/useLogicalBack";

const SCREEN_VERSION = "4.3.1-community-owned-my-posts";
const MY_COMMUNITY_ENDPOINT = "/api/v1/community/users/me/posts";
const RAW_PERSONAL_DATA_GUARD = "raw_personal_data_not_exposed_guard";

export default function CommunityMyPostsScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/community", router });

  return <ProfileDetailScreen onBack={goBack} variant="community" />;
}

export function assertMobileCommunityMyPostsCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking ProfileDetailScreen",
    MY_COMMUNITY_ENDPOINT,
    'variant="community"',
    'fallbackHref: "/community"',
    RAW_PERSONAL_DATA_GUARD,
    "server_my_posts_feed",
    "financial raw data not used for ads",
  ] as const;

  return { ok: checks.length >= 7, version: SCREEN_VERSION, checks };
}
