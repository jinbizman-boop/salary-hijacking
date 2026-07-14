# Iteration 052 Level Route Feature Boundary

Date: 2026-07-14 KST

## Scope

Continue removing production-route dependencies on Clean Fintech fallback modules. This iteration focuses on the LV UP tab route.

## Root Cause

`apps/mobile/app/(tabs)/level/index.tsx` no longer rendered a `CleanFintech*Screen`, but it still imported `normalizeGrowthDashboardForCleanFintech` from `src/shared/styles/clean-fintech-screens.tsx`.

That created a runtime dependency from a production route back into the large Clean Fintech fallback module, making the route boundary harder to audit for mock-only or fallback-only behavior.

## TDD Evidence

RED:

- Added `level.screen-wiring.test.ts` coverage requiring the LV UP tab route to avoid `clean-fintech-screens` and `normalizeGrowthDashboardForCleanFintech`.
- The test failed as expected because the route imported the helper directly from the Clean Fintech module.

GREEN:

- Added `apps/mobile/src/features/level/dashboard-normalization.ts`.
- Moved the dashboard normalization contract behind `normalizeGrowthDashboardForLevel`.
- Updated the LV UP tab route to import from the level feature package instead of `shared/styles/clean-fintech-screens`.
- Preserved the existing `normalizeGrowthDashboardForTest` export and output shape used by the dashboard normalization regression test.

## Verification

Commands:

- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/level/__tests__/level.screen-wiring.test.ts src/shared/api/__tests__/level-dashboard-normalization.test.ts --runInBand`
  - PASS, 2 suites, 2 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`
  - PASS.
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/level/__tests__/level.screen-wiring.test.ts src/features/level/__tests__/level-detail.screen-wiring.test.ts src/features/level/__tests__/level.components.test.tsx src/features/level/__tests__/growth.api.test.ts src/shared/api/__tests__/level-dashboard-normalization.test.ts --runInBand`
  - PASS, 5 suites, 23 tests.
- `rg -n "CleanFintech[A-Za-z]*Screen|clean-fintech-screens|normalizeGrowthDashboardForCleanFintech|function response\(" apps/mobile/app -S`
  - No matches in `apps/mobile/app`.

## Remaining Limits

This closes one route-boundary dependency on the Clean Fintech fallback module. It does not prove deployed growth API persistence, LV UP transaction idempotency on a deployed DB, physical-phone QA, production AAB, EAS submit, Play submission, or market publication.

No production AAB, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, or Cloudflare secret mutation was performed.
