# Financial Formula Registry

Status: PARTIAL

Source: `급여납치_풀스택_기능_성능_정의서_v2.0_최종본.pdf` sections 5, 7, and 21.

## FORMULA-PAYROLL-CYCLE-KST

- Inputs: payroll yearMonth, payday, user timezone default Asia/Seoul.
- Output: cycleStart, cycleEnd, cycleEndExclusive.
- Rule: cycle starts the day after the previous concrete payday and ends on the current concrete payday. Payday 29-31 clamps to month end.
- Implementation: `packages/utils/src/date.ts`, `services/api/src/repositories/payroll.repository.ts`, `database/migrations/0017_payroll_cycle_recalculation.sql`.
- Evidence: local regression tests pass; staging helper verified for 2026-02 payday 31 and 2026-09 payday 25 boundaries.

## FORMULA-HIJACK-AMOUNT

- Inputs: salary amount, fixed expense total, savings total, variable expense total.
- Output: expectedHijackAmount and confirmedHijackAmount.
- Rule: server recalculation uses KRW integer totals and clamps hijack amount to zero when allocations/spend exceed salary.
- Current implementation: `recalculate_payroll_plan` formula version `payroll-v2-cycle-kst`.
- Status: PARTIAL because finalization/cumulative and broad adversarial runtime remain pending.

## FORMULA-DAILY-BUDGET-RECALCULATION

- Inputs: daily budget row, active variable expenses, refund amount.
- Output: spent, remaining, over amount through DB recalculation guards.
- Status: PARTIAL; DB guard exists, but broad staging API mutation/runtime evidence remains pending.
