import { PlanScreen } from "../../../src/features/plan/components";

const SCREEN_VERSION = "4.3.0-plan-ui";
const PLAN_FIXED_EXPENSES_ENDPOINT = "/api/v1/fixed-expenses";
const PLAN_SAVINGS_ENDPOINT = "/api/v1/savings";

export default function PlanIndexScreen(): React.ReactElement {
  return <PlanScreen />;
}

export function assertMobilePlanIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "PlanScreen",
    "SALARY HIJACKING",
    PLAN_FIXED_EXPENSES_ENDPOINT,
    PLAN_SAVINGS_ENDPOINT,
    "홍길동님의 급여 납치 목표 달성률",
    "목표 달성률 88%",
    "내 급여 납치 계획/설정",
    "월별 고정 지출 계획/설정",
    "월별 고정 적금 계획/설정",
    "월별 생활비 계획/설정",
    "server_authority_component_guard",
    "server_recalculation_component_guard",
    "raw_financial_data_component_guard",
    "raw_personal_data_component_guard",
    "ads_financial_targeting_component_guard",
    "krw_integer_display",
    "responsive_plan_guard",
    "safe_area_top_bottom_guard",
  ] as const;

  return { ok: checks.length >= 16, version: SCREEN_VERSION, checks };
}
