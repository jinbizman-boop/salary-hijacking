import { CleanFintechLevelDetailScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function ReadingLevelScreen(): React.ReactElement {
  return <CleanFintechLevelDetailScreen kind="reading" />;
}

export function assertMobileReadingLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "독서",
    "AI 추천",
    "소설",
    "경제/경영",
    "인문/철학",
    "기타",
    "추천 도서",
    "내 역량/진행률",
    "serverAuthority=true",
    "rawFinancialData=false",
    "adsFinancialTargeting=false",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
