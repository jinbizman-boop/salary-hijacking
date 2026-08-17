# Payroll Cycle Policy

Status: PARTIAL

- Default business timezone: Asia/Seoul.
- DB timestamp storage remains UTC; business date attribution is done in the user/business timezone.
- Payday policy implemented in Phase 4: day 1-31, clamped to the concrete month end.
- Example: payday 25 for payroll month 2026-09 covers 2026-08-26 through 2026-09-25.
- Example: payday 31 in February 2026 resolves to 2026-02-28.
- Migration evidence: `database/migrations/0017_payroll_cycle_recalculation.sql`.
- Staging evidence: Neon staging branch br-fragrant-sky-aj5kk2c3 helper calls returned expected boundaries.

Remaining blocker: financial direct-ID matrix plus finalization/cumulative lifecycle verification.
