# Financial Formula Registry

Status: PASS

Canonical formula version: `payroll-v2-cycle-kst`

## Server Authority

- Authority: API/DB server calculation, not Mobile/Web/Admin client input.
- Money unit: integer KRW minor unit = won.
- Snapshot: `payroll_calculation_snapshots.formula_version` records the formula version.
- Close/finalization reason: `MONTH_CLOSED`, matching DB snapshot reason contract.

## Hijack Formula

The server computes payroll totals from DB-owned payroll, fixed expense, savings, daily budget, and variable expense records. Client-supplied calculated fields are either ignored or rejected by validation/ownership policy.

Runtime evidence:
- `docs/financial/STAGING_FINANCIAL_RUNTIME_CLOSURE_EVIDENCE.json`
- `docs/financial/FINANCIAL_IDEMPOTENCY_RUNTIME_MATRIX.csv`
- `docs/financial/FINANCIAL_ERROR_TAXONOMY_RUNTIME.csv`
