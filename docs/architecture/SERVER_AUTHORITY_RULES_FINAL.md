# Server Authority Rules Final

Generated: 2026-08-12T16:14:37.814Z

This file freezes FIN-001 through FIN-010 for PHASE 1. It does not implement PHASE 2 DB changes or PHASE 3 mobile behavior.

## FIN-001..FIN-010

- FIN-001: Finance calculations are server-authoritative.
- FIN-002: KRW is represented as integer won. Floating point authoritative money is forbidden.
- FIN-003: Income priority is actual net pay when confirmed, otherwise expected net pay.
- FIN-004: Spendable remaining formula is canonical.
- FIN-005: Daily recommended budget formula is canonical.
- FIN-006: Today available formula is canonical.
- FIN-007: Refunds use original transaction references, not negative expense input.
- FIN-008: Modification/delete keeps source event, revision, audit and deterministic recalculation.
- FIN-009: Multiple payroll profiles require active/primary plus cycle ownership; summary source set is server-decided.
- FIN-010: Achievement/kept-money metrics are separated from spendable cash.

## Calculation Version

Canonical calculationVersion: `salary-hijacking-finance-v1`.

## Formulas

`spendableRemaining = income - actualExpenses - reservedFixedExpenses - reservedSavings - mandatoryAllocations`

`dailyRecommendedBudget = max(0, spendableRemainingAfterToday / remainingBudgetDaysByPolicy)`

`todayAvailable = (dailyRecommendedBudget or userOverride) - todayActualSpend`

Negative spendable remaining and today available are allowed as overspend state. Display may floor achievement/hijack visualization, but server cash state must not be confused with achievement metrics.

## Time And Cycle

DB timestamps are UTC. User calculation boundary uses profile timezone with default Asia/Seoul. Payroll-cycle contract must handle month end, February, leap year, weekend, holiday strategy decision point, timezone boundary, DST-capable overseas timezones, multiple payroll profiles and mid-cycle payroll changes.

Holiday adjustment remains a policy decision point until explicitly decided; do not invent it in implementation.

## Client Boundary

Mobile/Admin/Web may format, validate input, show optimistic pending state, and compute clearly labeled offline estimates. They must not persist or present client-side finance calculations as authoritative.
