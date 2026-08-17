# Financial Calculation Integrity Report

Status: PARTIAL

Closed drift:
- Payroll plan repository now stores the payroll month from `firstPayrollDate` or `periodEndDate`, rather than the cycle start month.
- DB recalculation now uses KST payday-cycle boundaries for daily budget and variable expense totals.
- Migration 0018 repaired the missing live `variable_expenses.refund_amount` column that blocked the daily-budget recalculation trigger in staging.
- Calculation snapshots include formula version `payroll-v2-cycle-kst`, cycle boundaries, payday, timezone, KRW currency, and KRW_1 unit.

Remaining internal blockers:
- Full financial direct-ID matrix.
- Finalized cycle immutability/reopen policy runtime.
- Cumulative hijack aggregation runtime.
- Goal/achievement runtime edge cases.
- Broad concurrency/idempotency harness.
