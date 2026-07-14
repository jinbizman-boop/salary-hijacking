# Iteration 039 Status - Plan Daily Living Item Server Recalculation

Date: 2026-07-14 KST

## Scope

- `apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx`
- `apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`

## Result

PASS at focused file level; overall launch readiness remains BLOCKED by clean release source, physical Android phone QA, production AAB approval, and Play submission approval.

## What Changed

- Added a regression test proving daily living plan item saves do not create real variable expenses.
- Added a regression test proving daily living plan item saves call the server-authoritative daily budget recalculation API before preview state is updated.
- Updated `saveLivingItem()` so the next daily living detail rows are calculated first, then `budgetApi.recalculate()` receives the row-sum daily total multiplied by the configured living-day count.
- Preserved the existing local QA fallback only when no Budget API is available or the staging/API call fails.

## Verification

- RED: `corepack pnpm --filter @salary-hijacking/mobile test -- apps/mobile/src/features/plan/__tests__/plan.components.test.tsx --runInBand --testNamePattern "recalculates daily living plan rows"` failed because `recalculate` was called 0 times.
- GREEN: same targeted command PASS, 8 tests.
- Broader focused regression: `corepack pnpm --filter @salary-hijacking/mobile test -- apps/mobile/src/features/plan/__tests__/plan.components.test.tsx apps/mobile/src/features/salary/__tests__/salary.components.test.tsx apps/mobile/src/features/budget/__tests__/budget.api.test.ts --runInBand` PASS, 3 suites and 48 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck` PASS.

## Remaining

- Deployed DB persistence smoke is still not proven.
- Full recurrence lifecycle across payroll cycles is still not proven end to end.
- Physical Android phone install/cold-start/persistence/keyboard/logcat QA is still blocked by no connected phone.
- No production AAB, EAS submit, Play submit, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, or Cloudflare secret mutation was performed.
