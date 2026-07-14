# Iteration 088 Mobile Plan Conflict Port Review

Date: 2026-07-14 KST

## Scope

Reviewed the mobile Plan conflict archive rows:

- `apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`
- `apps/mobile/src/features/plan/__tests__/plan.screen-wiring.test.ts`
- `apps/mobile/src/features/plan/components/index.ts`
- `apps/mobile/src/features/plan/components/PlanActionList.tsx`
- `apps/mobile/src/features/plan/components/PlanBreakdownSection.tsx`
- `apps/mobile/src/features/plan/components/PlanProgressCard.tsx`

## Decision

All six rows are `CURRENT_ACCEPTED`.

The current platform files supersede the archived copies because the current Plan implementation is no longer just a static card/action list. The route uses `PlanReferenceScreen`, which carries the interactive Plan UI and verifies the user-requested launch-critical behaviors:

- Section settings expose add/edit controls.
- Fixed expenses can be created, updated, and deleted through the server-authoritative plan API.
- Fixed savings can be created, updated, and deleted through the server-authoritative plan API.
- Daily living plan rows remain scheduled plan rows and do not post actual variable expenses.
- Daily living rows recalculate the daily budget before preview sync.
- Payroll plan settings save through the server-authoritative payroll API before local preview sync.
- Payday save dates clamp to the KST month end when a payday exceeds the month length.
- Sensitive money is not used for advertising targeting, and user-facing Korean guard copy replaces older debug marker text.

## Evidence

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/plan/__tests__/plan.components.test.tsx apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/plan/__tests__/plan.screen-wiring.test.ts apps/mobile/src/features/plan/__tests__/plan.screen-wiring.test.ts`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/plan/components/index.ts apps/mobile/src/features/plan/components/index.ts`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/plan/components/PlanActionList.tsx apps/mobile/src/features/plan/components/PlanActionList.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/plan/components/PlanBreakdownSection.tsx apps/mobile/src/features/plan/components/PlanBreakdownSection.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/plan/components/PlanProgressCard.tsx apps/mobile/src/features/plan/components/PlanProgressCard.tsx`
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.components.test.tsx --runInBand`: PASS, 11 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.screen-wiring.test.ts --runInBand`: PASS, 1 test.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.launch-readiness.test.tsx --runInBand`: PASS, 1 test.
- `node scripts\release\classify-merge-conflict-archive.mjs`: PASS; decisions now show 40 `CURRENT_ACCEPTED`, 52 `REVIEW_REQUIRED`, 26 `EXCLUDE_RUNTIME`, and 14 `SUPERSEDED_BY_CURRENT_EVIDENCE`.

## Remaining Work

The merge archive remains a historical review source. It is not yet safe to delete because 52 mobile-source rows still require semantic port review.
