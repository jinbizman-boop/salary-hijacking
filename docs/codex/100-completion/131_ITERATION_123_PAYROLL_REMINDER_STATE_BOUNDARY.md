# Iteration 123 - Payroll Reminder State Boundary

Date: 2026-07-15 KST

## Scope

Continued the latest goal objective cleanup for production mobile runtime paths:
Salary Home and Plan must not be wired to internal `PreviewState` /
`features/preview/interactive-state` boundaries.

This iteration moves the shared interactive money-reminder state module to a
payroll-reminder feature boundary and updates production Salary/Plan screens to
use that product-domain state naming.

## Changed

- Moved `apps/mobile/src/features/preview/interactive-state.ts` to
  `apps/mobile/src/features/payroll-reminders/interactive-state.ts`.
- Moved interactive-state tests to
  `apps/mobile/src/features/payroll-reminders/__tests__/`.
- Renamed exported state symbols from preview names to payroll-reminder names,
  including `PayrollReminderState`, `getPayrollReminderState`,
  `updatePayrollReminderState`, and
  `configurePayrollReminderStatePersistence`.
- Updated Salary Home and Plan production screens and related tests to import
  from `features/payroll-reminders`.
- Added screen-wiring regression tests that fail if production Salary/Plan
  screens reintroduce `features/preview/interactive-state` or `PreviewState`.

## Verification

- RED:
  `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.screen-wiring.test.ts src/features/plan/__tests__/plan.screen-wiring.test.ts --runInBand`
  failed because Salary Home and Plan still imported
  `../../preview/interactive-state` and `PreviewState` helpers.
- GREEN:
  `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/payroll-reminders/__tests__/interactive-state.test.ts src/features/payroll-reminders/__tests__/interactive-state.launch-readiness.test.ts src/features/salary/__tests__/salary.screen-wiring.test.ts src/features/plan/__tests__/plan.screen-wiring.test.ts src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/preview/__tests__/reference-screen-copy.test.tsx --runInBand`:
  PASS, 57 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm run format:check`: PASS.
- Runtime search excluding tests:
  `rg -n "PreviewState|PreviewCategory|features/preview/interactive-state|\\.\\./preview/interactive-state|\\.\\./\\.\\./preview/interactive-state|qa-preview-state|getPreviewState|updatePreviewState|hydratePreviewStateFromStorage|configurePreviewStatePersistence|resetPreviewStateForTests" apps/mobile/src apps/mobile/app -g "*.ts" -g "*.tsx" -g "!**/__tests__/**"`:
  no matches.

## Remaining

This removes one production preview-boundary blocker for GATE-051. It does not
yet replace all local persisted fallback data with deployed server-authoritative
data, does not close physical Android phone QA, and makes current APK evidence
stale until a fresh APK/evidence refresh is produced in a separate commit.
