# Iteration 045 - Plan Payday Month-End Guard

Date: 2026-07-14 KST

## Scope

- `apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx`
- `apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`

## Requirement

Payroll plan save requests must use valid KST calendar dates when a user sets payday to 29, 30, or 31 in a shorter month. The user's payday preference can remain `31`, but the concrete `firstPayrollDate` sent to the server for a February cycle must clamp to that KST month end.

## RED

Added a failing test:

- `clamps payroll save dates to the KST month end when payday exceeds the month length`

RED showed that the request sent `firstPayrollDate: "2026-02-31"` while `periodEndDate` was `"2026-02-28"`.

## GREEN

- Derived the current KST month-end day from the computed `periodEndDate`.
- Clamped only the concrete `firstPayrollDate` day to the month end.
- Preserved the user's configured `payday` value in the request so recurrence policy remains explicit.

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/plan/__tests__/plan.components.test.tsx -t "clamps payroll save dates" --runInBand`: PASS
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/plan/__tests__/plan.components.test.tsx src/features/salary/__tests__/salary.components.test.tsx src/features/budget/__tests__/budget.utils.test.ts --runInBand`: PASS, 3 suites / 36 tests
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS

## Remaining Limits

- This validates the mobile payroll plan request date boundary.
- Deployed server recurrence generation and physical-phone relaunch QA still require their own evidence.
