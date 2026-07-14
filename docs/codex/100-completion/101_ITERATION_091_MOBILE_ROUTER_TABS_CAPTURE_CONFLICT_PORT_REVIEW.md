# Iteration 091 Mobile Router/Tabs/Capture Conflict Port Review

Date: 2026-07-14 KST

## Scope

Reviewed the mobile router, bottom-tab, capture-route, and route contract conflict archive rows:

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/salary/index.tsx`
- `apps/mobile/app/(tabs)/plan/index.tsx`
- `apps/mobile/app/(tabs)/level/index.tsx`
- `apps/mobile/app/(tabs)/community/index.tsx`
- `apps/mobile/app/(tabs)/profile/index.tsx`
- `apps/mobile/app/capture/[screen].tsx`
- `apps/mobile/src/features/capture/CapturePreviewScreen.tsx`
- `apps/mobile/src/shared/api/__tests__/app-screen-contract.test.ts`

## Decision

All 10 rows are `CURRENT_ACCEPTED`.

The current platform files supersede the archived copies because the current implementation preserves the latest launch-stability and visual-evidence contracts:

- The root layout keeps native splash hiding, auth/bootstrap fallback, deep-link preservation, capture-route handling, and safe retry behavior.
- The bottom-tab layout keeps the verified Expo Router child route names, safe-area-aware height, static tab icon assets, Korean visible labels, and privacy-boundary accessibility labels.
- The Salary, Plan, LV UP, Community, and MY tab routes point to the current feature/reference screens instead of reverting to older route-local or fallback implementations.
- The capture route and `CapturePreviewScreen` keep deterministic 17-screen mobile visual evidence coverage.
- `app-screen-contract.test.ts` now includes an explicit Korean bottom-tab copy regression guard so readable Korean tab labels cannot be replaced with mojibake or temporary English labels.

## Evidence

- `git diff --no-index --stat` was run for all 10 router/tabs/capture archive-current file pairs.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/shared/api/__tests__/app-screen-contract.test.ts --runInBand --testNamePattern "primary tab visible copy"`: PASS, 29 tests reported by the focused Jest invocation.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/shared/api/__tests__/app-screen-contract.test.ts --runInBand`: PASS, 29 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.screen-wiring.test.ts src/features/plan/__tests__/plan.screen-wiring.test.ts src/features/level/__tests__/level.screen-wiring.test.ts src/features/community/__tests__/community.screen-wiring.test.ts --runInBand`: PASS, 4 suites and 4 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run export:web`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `node scripts\release\classify-merge-conflict-archive.mjs`: PASS; decisions now show 76 `CURRENT_ACCEPTED`, 16 `REVIEW_REQUIRED`, 26 `EXCLUDE_RUNTIME`, and 14 `SUPERSEDED_BY_CURRENT_EVIDENCE`.

## Remaining Work

The merge archive remains a historical review source. It is not yet safe to delete because 16 mobile-source rows still require semantic port review.

This iteration does not prove full mobile E2E, physical Android phone QA, production AAB, Play submission, or market publication.
