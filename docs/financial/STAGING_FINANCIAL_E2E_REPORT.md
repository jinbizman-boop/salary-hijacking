# Staging Financial E2E Report

Status: PASS_CORE_STAGING_RUNTIME

Completed in this pass:
- Neon staging branch br-fragrant-sky-aj5kk2c3 verified Phase 4 DB functions and migration ledger 18/18.
- Server-side payroll cycle recalculation no longer uses calendar-month boundaries in the DB function.
- Public staging synthetic E2E passed register/login, payroll create/activate/current/home, daily budget create/read, fixed expense create, savings create, variable expense create/delete, and duplicate idempotency replay.
- Root cause repaired: daily budget creation failed because live staging lacked `variable_expenses.refund_amount`; migration 0018 restored the missing column.

Evidence:
- `docs/financial/STAGING_FINANCIAL_E2E_EVIDENCE.json`
- `scripts/e2e/financial-staging-core.mjs`

Still not enough for PHASE_4=PASS:
- Financial direct-ID cross-user matrix pending.
- Broad 20-way concurrency and different-body idempotency conflict runtime pending.
- Payroll finalization/cumulative hijack runtime pending.
