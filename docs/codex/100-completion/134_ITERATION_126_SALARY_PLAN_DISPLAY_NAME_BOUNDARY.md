# Iteration 126 - Salary/Plan Display Name Boundary

Date: 2026-07-15 KST

## Scope

This iteration narrows the launch-readiness hardcoded user-data cleanup for the Salary Home and Plan screens.

## Completed

- Added component tests proving Salary Home and Plan can render user-owned headings from a provided `displayName`.
- Replaced Salary Home user-owned section headings with a `displayName` prop and a neutral `사용자` fallback.
- Replaced Plan goal card heading with a `displayName` prop and a neutral `사용자` fallback.
- Updated route-level visible-copy contracts away from the previous `홍길동` fixture name.
- Updated prototype/API contract tests to reference the moved payroll reminder state boundary.

## Verification

- RED targeted Salary/Plan component tests failed before implementation because the screens still rendered `홍길동` fixture copy.
- GREEN targeted regression suite:
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/salary/__tests__/salary.launch-readiness.test.tsx src/features/salary/__tests__/salary.screen-wiring.test.ts src/features/plan/__tests__/plan.screen-wiring.test.ts src/shared/api/__tests__/app-screen-contract.test.ts src/shared/api/__tests__/prototype-ui-contract.test.ts --runInBand`
  - PASS, 7 suites and 76 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm run format:check`: PASS.
- `git diff --check`: PASS.

## Remaining

- `홍길동` demo copy still exists in Profile and Community route fixtures and must be handled in a separate cleanup slice.
- This source change makes the previous Iteration 125 APK evidence stale until the phone-target APK is rebuilt for the new source commit.
- Physical Android phone install, cold start, persistence, keyboard, safe-area, and logcat proof remain pending because no physical phone is attached.
