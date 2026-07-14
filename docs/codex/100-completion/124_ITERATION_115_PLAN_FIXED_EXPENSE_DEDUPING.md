# Iteration 115 - Plan Fixed Expense Duplicate Save Guard

Date: 2026-07-14 KST

## Scope

Closed another code-verifiable Plan reliability gap by preventing duplicate fixed-expense create/update requests when a user taps the plan item save button repeatedly before the server-authoritative API responds.

## Root Cause

`PlanReferenceScreen.savePlanItem` validated the draft and immediately entered the server mutation path, but it did not keep an in-flight guard for fixed/savings plan item saves. Rapid repeated taps could therefore call `createFixedExpense` more than once before the first request resolved.

## Change

- Added a `planItemSaveInFlightRef` single-flight guard around fixed/savings plan item saves.
- Added `planItemSavePending` UI state and propagated it to the editable plan form.
- Disabled the plan item save button while the authoritative save is pending.
- Added a failing-then-passing component regression test proving duplicate fixed-expense save taps produce only one server API call.

## Verification

- RED before implementation:
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/plan/__tests__/plan.components.test.tsx --runInBand --testNamePattern "blocks duplicate fixed expense"`
  - Failed because `createFixedExpense` was called 2 times instead of 1.
- GREEN after implementation:
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/plan/__tests__/plan.components.test.tsx --runInBand --testNamePattern "blocks duplicate fixed expense"`: PASS, 12 tests in the suite.
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/plan/__tests__/plan.components.test.tsx src/features/salary/__tests__/salary.components.test.tsx src/features/preview/__tests__/interactive-state.test.ts --runInBand`: PASS, 46 tests.
  - `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
  - `corepack pnpm run format:check`: PASS.

## Remaining

This reduces a code-level P1 duplicate-submit risk in Plan. It does not replace physical Android phone install/cold-start/navigation/persistence/keyboard/safe-area/no-fatal-logcat QA, production AAB approval, Play submission approval, or external market publication.
