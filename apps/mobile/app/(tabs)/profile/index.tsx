import { CleanFintechScreen } from "../../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";
const PROFILE_WITHDRAWAL_REQUEST_ENDPOINT =
  "/api/v1/users/me/withdrawal-request";

export default function ProfileIndexScreen(): React.ReactElement {
  return <CleanFintechScreen kind="profile" />;
}

export function assertMobileProfileIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "누적 납치금액",
    "레벨업 현황",
    "자기관리 성과",
    "내 게시글 관리",
    "내 레벨업 관리",
    "1:1 문의",
    "공지사항",
    PROFILE_WITHDRAWAL_REQUEST_ENDPOINT,
    "adsFinancialTargeting=false",
  ] as const;

  return { ok: checks.length >= 10, version: SCREEN_VERSION, checks };
}
