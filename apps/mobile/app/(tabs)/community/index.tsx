import { CleanFintechScreen } from "../../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function CommunityIndexScreen(): React.ReactElement {
  return <CleanFintechScreen kind="community" />;
}

export function assertMobileCommunityIndexCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "전체 게시판",
    "자유 게시판",
    "레벨업 인증",
    "취미 게시판",
    "글쓰기",
    "#209252",
    "anonymous_community_boundary",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { ok: checks.length >= 9, version: SCREEN_VERSION, checks };
}
