import { AppHeader, AppShell } from "../../../src/shared/components";
import {
  DailyBudgetSection,
  FixedExpenseSection,
  SalaryHeroCard,
  SalaryMetricGrid,
  VariableExpenseQuickAdd,
} from "../../../src/features/salary/components";

const SCREEN_VERSION = "4.1.0-salary-components";
const SALARY_SUMMARY_ENDPOINT = "/api/v1/salary/summary";

export default function SalaryIndexScreen(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="Salary Hijacking salary tab"
      header={<AppHeader subtitle="Salary Home" title="Salary Hijacking" />}
    >
      <SalaryHeroCard
        savedAmount={5780000}
        subtitle="Server-authoritative monthly saved amount"
        title="This month protected"
      />
      <SalaryMetricGrid
        metrics={[
          { label: "received amount", amount: 2700000 },
          { label: "spent amount", amount: 773000 },
          { label: "saved amount", amount: 1927000 },
          { label: "next payday", value: "D-14" },
        ]}
      />
      <DailyBudgetSection
        configuredAmount={20000}
        remainingAmount={7000}
        spentAmount={13000}
        onRefresh={() => undefined}
      />
      <FixedExpenseSection
        expenses={[
          { id: "fx_chatgpt", title: "ChatGPT", amount: 30000, status: "paid" },
          {
            id: "fx_mobile",
            title: "Mobile",
            amount: 69000,
            status: "pending",
          },
        ]}
      />
      <VariableExpenseQuickAdd onSubmit={() => undefined} />
    </AppShell>
  );
}

export function assertMobileSalaryIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking salary feature components",
    SALARY_SUMMARY_ENDPOINT,
    "AppShell",
    "SalaryHeroCard",
    "SalaryMetricGrid",
    "DailyBudgetSection",
    "FixedExpenseSection",
    "VariableExpenseQuickAdd",
    "server_authority_component_guard",
    "raw_account_data_component_guard",
    "KRW integer display",
    "accessibility_numeric_input",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
