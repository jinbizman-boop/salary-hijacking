# Payroll Cycle Policy

Status: PASS

- Default business timezone: Asia/Seoul.
- DB timestamp storage: UTC.
- Monthly payday cycles clamp payday 29-31 to the concrete last day of shorter months.
- Example: payday 25 cycle for September payroll runs 2026-08-26 through 2026-09-25.
- Closed cycle mutations are rejected by server-side DB/API guards.

Evidence: `database/migrations/0017_payroll_cycle_recalculation.sql`, `docs/financial/STAGING_FINANCIAL_RUNTIME_CLOSURE_EVIDENCE.json`.
