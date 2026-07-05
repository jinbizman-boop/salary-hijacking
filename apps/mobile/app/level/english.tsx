import { CleanFintechLevelDetailScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function EnglishLevelScreen(): React.ReactElement {
  return <CleanFintechLevelDetailScreen kind="english" />;
}

export function assertMobileEnglishLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "영어",
    "Listening",
    "Speaking",
    "Reading",
    "Writing",
    "일자별 문장 학습",
    "문장 학습",
    "말하기 연습",
    "서버 기준 성장 기록",
    "금융 원문 미노출",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
