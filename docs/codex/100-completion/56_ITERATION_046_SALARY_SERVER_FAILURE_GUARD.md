# Iteration 046 - Salary Server Failure Guard

Date: 2026-07-14 KST

## Scope

- `apps/mobile/src/features/salary/components/SalaryHomeReferenceScreen.tsx`
- `apps/mobile/src/features/salary/__tests__/salary.components.test.tsx`

## Requirement

Salary Home must not show a variable expense, daily budget mutation, or planned reminder completion as saved when the server-authoritative API rejects the mutation. This directly protects the user-reported issue where entered data appears to work but later disappears or cannot be trusted.

## RED

Added a failing test:

- `keeps variable expense drafts unsaved when the server-authoritative API rejects`

RED showed that when `createVariableExpense` rejected, the UI still rendered `Rejected lunch` in the variable expense table.

## GREEN

- Added a Salary Home alert message for server save failures.
- Changed server-backed Salary Home mutations to stop after API rejection instead of falling through to local preview persistence.
- Kept local preview mutation only for no-client QA preview cases.

Covered server-backed paths:

- daily budget total save
- completed daily budget item update
- daily budget item completion/revert
- completed daily budget item delete
- fixed expense reminder completion
- savings reminder completion
- variable expense create/update/delete

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx -t "keeps variable expense drafts unsaved" --runInBand`: PASS
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/budget/__tests__/budget.utils.test.ts --runInBand`: PASS, 3 suites / 37 tests
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS

## Remaining Limits

- Deployed DB persistence and physical Android relaunch persistence still require their own evidence.
- Production AAB, EAS submit, and Play submission remain blocked by explicit approval gates.
