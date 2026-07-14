# Iteration 104 Daily Budget Completion Date Key

Date: 2026-07-14 KST

## Scope

Strengthened the Salary Home daily budget reminder contract. Daily budget detail rows now store the KST completion date for "사용 완료" state, so a row completed yesterday is shown as "사용 예정" again on the next KST day.

## User Requirement Covered

- Salary Home daily budget rows must behave like daily reminders.
- Grey buttons mean already used/completed for the current day.
- Green buttons mean still scheduled for the current day.
- Completed daily rows must not stay completed forever across later dates.
- Existing legacy preview rows without a completion date remain compatible.

## Code Changes

- `apps/mobile/src/features/preview/interactive-state.ts`
  - Added optional `usedDateKey` to daily budget rows.
  - Added `getKstParts().dateKey` for `YYYY-MM-DD` KST day identity.
  - Added `isDailyBudgetItemCompletedOnDate` to evaluate daily completion against the current KST date.
  - Added persisted `usedDateKey` validation.
- `apps/mobile/src/features/salary/components/SalaryHomeReferenceScreen.tsx`
  - Salary Home now renders daily rows through the current KST date filter.
  - Daily completion writes the current KST `usedDateKey`.
  - Daily completion revert removes the date key instead of storing `undefined`.
  - Daily edit preserves completion only when the row was completed for the current KST date.
- `apps/mobile/src/features/preview/__tests__/interactive-state.test.ts`
  - Added storage/domain tests for legacy completion compatibility, date mismatch reset, and malformed date-key rejection.
- `apps/mobile/src/features/salary/__tests__/salary.components.test.tsx`
  - Added RED/GREEN component coverage proving yesterday's completed row is scheduled again today.

## Verification

- RED Salary Home component test failed before implementation because yesterday's completed row still rendered with the grey completed button.
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand`: PASS, 20 tests
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/preview/__tests__/interactive-state.test.ts src/features/salary/__tests__/salary.components.test.tsx --runInBand`: PASS, 32 tests
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/preview/__tests__/interactive-state.test.ts src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/plan/__tests__/plan.launch-readiness.test.tsx --runInBand`: PASS, 44 tests
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS
- `corepack pnpm run format:check`: PASS
- `git diff --check`: PASS

## Storage Hygiene

- Windows reports only `C:` and `D:` logical drives in this Codex session.
- `cmd /c subst`: no mapped drive letters.
- `salary-hijacking-platform`: about 1.284 GB on C: excluding D-backed tool cache.
- `salary-hijacking-main` and `salary-hijacking-work`: hidden empty shell directories, 0 children, 0 GB. Immediate deletion is blocked by another Windows/Codex process handle.
- `corepack pnpm run clean:junk`: PASS, removed regenerated temp cache.

## Remaining Blockers

This improves GAP-004/GAP-005 but does not close them. Physical Android phone relaunch QA, installed-app persistence proof, production AAB approval, Play submission approval, and external market publication remain blocked or unapproved.
