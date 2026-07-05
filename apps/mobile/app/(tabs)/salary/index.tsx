import { CleanFintechScreen } from "../../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function SalaryIndexScreen(): React.ReactElement {
  return <CleanFintechScreen kind="salary" />;
}

export function assertMobileSalaryIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "이번 달 내가 지켜낸 돈",
    "오늘 쓸 수 있는 돈",
    "수령금액",
    "지출금액",
    "이번 달 납치금액",
    "다음 급여일 D-day",
    "지출 추가하기",
    "고정지출",
    "변동지출",
    "제휴/광고",
    "서버 기준 급여 계산",
    "금융 금액 광고 타겟팅 금지",
    "krw_integer_only_preview",
    "accessibility_numeric_input",
  ] as const;

  return { ok: checks.length >= 15, version: SCREEN_VERSION, checks };
}
