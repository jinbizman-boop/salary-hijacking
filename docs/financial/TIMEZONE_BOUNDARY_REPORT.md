# Timezone Boundary Report

Status: PARTIAL

Phase 4 fixed the known server-side payroll recalculation drift where variable expenses and daily budgets were attributed by calendar month rather than KST payday-cycle.

Evidence:
- `recalculate_payroll_plan` now converts `variable_expenses.spent_at` with `at time zone 'Asia/Seoul'` before cycle filtering.
- `daily_budgets.budget_date` now uses cycleStart/cycleEndExclusive instead of calendar month.
- Staging branch br-fragrant-sky-aj5kk2c3 verified payday 25 inclusion/exclusion around 2026-08-25, 2026-08-26, 2026-09-25, and 2026-09-26.

Remaining blocker: DST timezone user tests and non-default user timezone runtime are not yet complete.
