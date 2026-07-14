# Iteration 062 - Plan Item Form Labels

Date: 2026-07-14 KST
Repository: `C:\Users\PC\Desktop\salary-hijacking-platform`
HEAD: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`
Branch: `codex/commercialization-100`

## Scope

Reduced the GAP-005/GAP-006 overlap around the plan screen item editor. The daily living plan add/edit form previously exposed internal automation labels and mojibake placeholders such as `plan-item-content-input` and `??`, so users and accessibility tests could not reliably identify the fields.

## Changes

- `apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx`
  - Replaced internal accessibility labels with user-facing Korean labels:
    - `계획 항목 카테고리`
    - `계획 항목 내용`
    - `계획 항목 금액`
    - `계획 항목 일자`
    - `계획 항목 저장`
    - `계획 항목 삭제`
  - Preserved existing automation selectors as `testID` values.
  - Replaced broken placeholders/button copy with Korean UI text.
- `apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`
  - Updated component tests to use user-facing labels instead of internal labels.
  - Repaired a broken daily living row string literal and aligned it with the launch-readiness fixture.

## Verification

- RED before fix:
  - `node .\node_modules\jest\bin\jest.js src/features/plan/__tests__/plan.launch-readiness.test.tsx --runInBand --verbose`
  - Failed because `계획 항목 카테고리` was not exposed.
- GREEN after fix:
  - Plan launch readiness: PASS, 1 test.
  - Plan components: PASS, 11 tests.
  - Combined salary/plan/budget regression:
    - 5 suites PASS
    - 40 tests PASS
  - `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS
  - `corepack pnpm --filter @salary-hijacking/mobile run format:check`: PASS
  - `git diff --check -- apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`: PASS

## Remaining

This does not close GAP-005. Deployed DB persistence, full recurrence lifecycle, and physical relaunch QA are still open. It specifically removes one user-facing/accessibility failure in the plan item editor.
