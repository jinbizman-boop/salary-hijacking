# Iteration 103 Date-Gated Plan Reminders

Date: 2026-07-14 KST

## Scope

Strengthened the Salary Home and Plan synchronization contract for recurring fixed expenses and fixed savings. The home screen now filters plan reminders by the current KST day, so future-dated fixed or savings occurrences do not appear before their scheduled day.

## User Requirement Covered

- Plan settings must synchronize into Salary Home by the configured date.
- Future fixed expense/savings occurrences must not appear early on the main screen.
- If a configured date has passed and the item is still pending, Salary Home keeps the overdue/orange warning behavior.
- Completion continues to hide only the current-month occurrence while allowing the next month to reappear.

## Code Changes

- `apps/mobile/src/features/preview/interactive-state.ts`
  - `getVisiblePlanReminderItems` now accepts the current KST day and excludes future-dated fixed/savings rows.
- `apps/mobile/src/features/salary/components/SalaryHomeReferenceScreen.tsx`
  - Salary Home now passes `kst.day` into the reminder visibility helper.
- `apps/mobile/src/features/preview/__tests__/interactive-state.test.ts`
  - Added RED/GREEN coverage for future-dated occurrence suppression.
- `apps/mobile/src/features/salary/__tests__/salary.components.test.tsx`
  - Added RED/GREEN component coverage proving Salary Home does not render future reminders before the scheduled KST day.
  - Updated the savings completion test to run on the configured due date.

## Verification

- RED helper test failed as expected when a day-25 saving item appeared on day 14.
- RED Salary Home component test failed as expected when `FutureSaving` appeared on day 14.
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/preview/__tests__/interactive-state.test.ts --runInBand`: PASS, 9 tests
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand`: PASS, 19 tests
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/preview/__tests__/interactive-state.test.ts src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/plan/__tests__/plan.launch-readiness.test.tsx --runInBand`: PASS, 40 tests
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS

## Remaining Blockers

This improves GAP-004/GAP-005 but does not close them. Physical Android phone relaunch QA, installed-app persistence proof, production AAB approval, Play submission approval, and external market publication remain blocked or unapproved.
