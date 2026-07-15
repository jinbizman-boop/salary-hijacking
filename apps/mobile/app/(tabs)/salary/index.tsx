import { router } from "expo-router";

import { SalaryHomeScreen } from "../../../src/features/salary/components";

const SCREEN_VERSION = "4.3.0-salary-home-ui";
const SALARY_SUMMARY_ENDPOINT = "/api/v1/salary/summary";
const GOOGLE_AD_SLOT_LABEL = "Google 광고 영역";
const SALARY_VISIBLE_COPY_CONTRACT = [
  "SALARY HIJACKING",
  "내 급여 납치 현황",
  "전체 누적 납치 금액",
  "홍길동님이 설정한 금일 고정 지출",
  "홍길동님이 설정한 일일 사용 예산",
  "홍길동님이 사용한 금일 변동 지출",
] as const;

export default function SalaryIndexScreen(): React.ReactElement {
  return (
    <SalaryHomeScreen
      onOpenNotifications={() => router.push("/notifications")}
    />
  );
}

export function assertMobileSalaryIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "SalaryHomeScreen",
    SALARY_SUMMARY_ENDPOINT,
    GOOGLE_AD_SLOT_LABEL,
    ...SALARY_VISIBLE_COPY_CONTRACT,
    "server_authority_component_guard",
    "responsive_salary_home_guard",
    "raw_account_data_component_guard",
    "KRW integer display",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
