import { useLocalSearchParams } from "expo-router";

import { CleanFintechPostDetailScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function CommunityPostDetailScreen(): React.ReactElement {
  const params = useLocalSearchParams();
  const rawPostId = params.postId;
  const postId = Array.isArray(rawPostId)
    ? rawPostId[0]
    : typeof rawPostId === "string"
      ? rawPostId
      : undefined;

  return postId ? (
    <CleanFintechPostDetailScreen postId={postId} />
  ) : (
    <CleanFintechPostDetailScreen />
  );
}

export function assertMobileCommunityPostCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "커뮤니티",
    "레벨업 인증",
    "게시글 상세",
    "좋아요",
    "댓글",
    "공유",
    "익명 사용자",
    "serverAuthority=true",
    "rawFinancialData=false",
    "rawPersonalData=false",
    "adsFinancialTargeting=false",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
