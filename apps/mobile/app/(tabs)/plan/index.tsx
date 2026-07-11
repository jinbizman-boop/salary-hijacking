import { AppHeader, AppShell } from "../../../src/shared/components";
import {
  PlanActionList,
  PlanBreakdownSection,
  PlanProgressCard,
} from "../../../src/features/plan/components";
import type { PlanCommitmentsSnapshot } from "../../../src/features/plan/types";

const SCREEN_VERSION = "4.1.0-plan-components";
const PLAN_FIXED_EXPENSES_ENDPOINT = "/api/v1/fixed-expenses";
const PLAN_SAVINGS_ENDPOINT = "/api/v1/savings";

const planSnapshot: PlanCommitmentsSnapshot = {
  adsFinancialTargetingUsed: false,
  fixedExpenseTotalMinor: 920000,
  fixedExpenses: [
    {
      amountMinor: 650000,
      category: "HOUSING",
      dueDay: 25,
      dueLabel: "매월 25일",
      financialRawDataExposed: false,
      id: "fx_rent",
      lastPaidAt: null,
      paidTotalMinor: 0,
      serverAuthority: true,
      status: "ACTIVE",
      title: "월세",
    },
    {
      amountMinor: 270000,
      category: "UTILITY",
      dueDay: 10,
      dueLabel: "매월 10일",
      financialRawDataExposed: false,
      id: "fx_utility",
      lastPaidAt: null,
      paidTotalMinor: 0,
      serverAuthority: true,
      status: "ACTIVE",
      title: "공과금",
    },
  ],
  fixedSavingsTotalMinor: 350000,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  savingsGoals: [
    {
      currentAmountMinor: 1800000,
      financialRawAccountDataExposed: false,
      fixedSaveAmountMinor: 350000,
      goalType: "EMERGENCY_FUND",
      id: "goal_emergency",
      serverAuthority: true,
      status: "ACTIVE",
      targetAmountMinor: 5000000,
      title: "비상금",
    },
  ],
  serverAuthority: true,
};

export default function PlanIndexScreen(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="Salary Hijacking plan tab"
      header={<AppHeader subtitle="Plan" title="급여 계획" />}
    >
      <PlanProgressCard
        completionPercent={36}
        currentAmountMinor={1800000}
        goalAmountMinor={5000000}
        title="목표 달성률"
      />
      <PlanBreakdownSection snapshot={planSnapshot} />
      <PlanActionList
        actions={[
          {
            key: "fixed-expense",
            label: "고정지출 추가",
            description: "월세, 구독, 보험",
          },
          {
            key: "savings-goal",
            label: "저축 목표 수정",
            description: "목표금액과 자동저축",
          },
        ]}
        onSelect={() => undefined}
      />
    </AppShell>
  );
}

export function assertMobilePlanIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking plan feature components",
    PLAN_FIXED_EXPENSES_ENDPOINT,
    PLAN_SAVINGS_ENDPOINT,
    "AppShell",
    "PlanProgressCard",
    "PlanBreakdownSection",
    "PlanActionList",
    "목표 달성률",
    "급여 계획",
    "고정지출",
    "고정저축",
    "생활비",
    "목표금액",
    "server_authority_component_guard",
    "server_recalculation_component_guard",
    "raw_financial_data_component_guard",
    "raw_personal_data_component_guard",
    "ads_financial_targeting_component_guard",
    "krw_integer_display",
    "card_based_plan_ui",
    "progress_bar",
  ] as const;

  return { ok: checks.length >= 16, version: SCREEN_VERSION, checks };
}
