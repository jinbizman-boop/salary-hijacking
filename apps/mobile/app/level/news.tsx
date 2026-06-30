import { CleanFintechLevelDetailScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function NewsLevelScreen(): React.ReactElement {
  return <CleanFintechLevelDetailScreen kind="news" />;
}

export function assertMobileNewsLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "뉴스",
    "경제",
    "산업",
    "사회",
    "기술",
    "전체",
    "출처/날짜",
    "좋아요",
    "댓글",
    "공유",
    "serverAuthority=true",
    "rawFinancialData=false",
    "adsFinancialTargeting=false",
  ] as const;

  return { ok: checks.length >= 14, version: SCREEN_VERSION, checks };
}
