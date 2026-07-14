# Iteration 098 - Keyboard Inset Contract

Date: 2026-07-14 KST

## Scope

- Strengthened the launch-critical mobile input shell contract for shared, auth, salary, and plan screens.
- Kept this as a source-level and component-test improvement because no physical Android phone is attached to this Codex Windows environment.

## Changes

- `AppShell` now requires automatic keyboard inset adjustment and interactive keyboard dismissal.
- `AuthVisualFrame` now uses the same keyboard inset/dismissal contract as the shared shell.
- `SalaryHomeReferenceScreen` and `PlanReferenceScreen` now explicitly opt in to automatic keyboard inset adjustment and interactive keyboard dismissal on their main scroll containers.
- `shared-components.contract.test.tsx` now prevents regression for `KeyboardAvoidingView`, `automaticallyAdjustKeyboardInsets`, `keyboardDismissMode="interactive"`, `keyboardShouldPersistTaps="handled"`, and `keyboardVerticalOffset`.

## Verification

- RED confirmed before implementation:
  - `corepack pnpm --filter @salary-hijacking/mobile run test -- src/shared/components/__tests__/shared-components.contract.test.tsx --runInBand`
- GREEN after implementation:
  - `corepack pnpm --filter @salary-hijacking/mobile run test -- src/shared/components/__tests__/shared-components.contract.test.tsx --runInBand`
  - Result: PASS, 1 suite, 5 tests.
- Related screen regression:
  - `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/auth/__tests__/login.screen-wiring.test.ts src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx --runInBand`
  - Result: PASS, 3 suites, 31 tests.
- TypeScript:
  - `corepack pnpm --filter @salary-hijacking/mobile run typecheck`
  - Result: PASS.

## Remaining Blocker

- GAP-006 remains BLOCKED for final launch readiness because the all-screen, all-field keyboard/safe-area matrix still needs a physical Android phone or device-farm run, including gesture navigation, three-button navigation, font-scale changes, relaunch persistence, and logcat evidence.
