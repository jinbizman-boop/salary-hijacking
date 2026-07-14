# Iteration 113 - Variable Expense Duplicate Submission Guard

Date: 2026-07-14 KST

## Purpose

Closed another code-verifiable Salary Home reliability gap before physical phone QA by preventing duplicate variable-expense mutations when a user taps the save button repeatedly before the server-authoritative API responds.

## Root Cause

`SalaryHomeReferenceScreen` submitted variable-expense create/update requests directly from the save button without an in-flight guard. Because React state updates are asynchronous, a fast second tap could enter the same save path before the first server request resolved.

## Change

- Added a synchronous `variableSaveInFlightRef` guard around the variable-expense save path.
- Added a visible pending state for the save button.
- Disabled the save button while the server save is pending.
- Preserved retry behavior by clearing the guard in `finally`, including rejection paths.
- Added a regression test that first failed with two API calls, then passed with a single API call.

## Verification

- RED: `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand`
  - Failed before implementation because `createVariableExpense` was called twice.
- GREEN: `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand`
  - PASS, 21 tests.
- Regression: `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/preview/__tests__/interactive-state.test.ts --runInBand`
  - PASS, 45 tests.
- Typecheck: `corepack pnpm --filter @salary-hijacking/mobile run typecheck`
  - PASS.
- Format: `corepack pnpm run format:check`
  - PASS.
- Diff hygiene: `git diff --check`
  - PASS.

## Remaining

This reduces a code-level P1 duplicate-submit risk. It does not replace physical Android phone QA, logcat proof, or installed-app relaunch persistence proof.
