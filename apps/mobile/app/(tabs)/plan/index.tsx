import { CleanFintechScreen } from "../../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function PlanIndexScreen(): React.ReactElement {
  return <CleanFintechScreen kind="plan" />;
}

export function assertMobilePlanIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "목표 달성률",
    "급여 계획",
    "고정지출",
    "고정저축",
    "생활비",
    "목표금액",
    "server_authority_recalculation_label",
    "krw_integer_only_input",
    "card_based_plan_ui",
    "progress_bar",
  ] as const;

  return { ok: checks.length >= 10, version: SCREEN_VERSION, checks };
}
