# Iteration 087 Mobile Profile Conflict Port Review

Date: 2026-07-14 KST

## Scope

Reviewed the mobile Profile/MY conflict archive rows:

- `apps/mobile/src/features/profile/__tests__/profile-detail-routes.screen-wiring.test.ts`
- `apps/mobile/src/features/profile/__tests__/profile.components.test.tsx`
- `apps/mobile/src/features/profile/components/ProfileDetailScreen.tsx`
- `apps/mobile/src/features/profile/components/ProfileHeader.tsx`
- `apps/mobile/src/features/profile/components/ProfileMenuCard.tsx`
- `apps/mobile/src/features/profile/components/ProfileStatGrid.tsx`

## Decision

All six rows are `CURRENT_ACCEPTED`.

The current platform files supersede the archived copies because they keep the same server-authoritative MY/Profile route boundaries while replacing older English/debug guard strings with Korean user-facing copy aligned to the PDF-derived MY page design. The current files preserve:

- Profile detail routes for account, community, level, notices, settings, and support.
- `/api/v1` endpoint references for server-owned profile, community, growth, notice, and support data.
- Masked personal-data display.
- Financial raw-data exclusion from MY menus, profile display, and advertising recommendations.
- Accessible Korean MY menu actions.
- Shared `AppShell`, `AppHeader`, `SurfaceCard`, `MoneyText`, and `ProgressBar` primitives.

## Evidence

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/profile/__tests__/profile-detail-routes.screen-wiring.test.ts apps/mobile/src/features/profile/__tests__/profile-detail-routes.screen-wiring.test.ts`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/profile/__tests__/profile.components.test.tsx apps/mobile/src/features/profile/__tests__/profile.components.test.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/profile/components/ProfileDetailScreen.tsx apps/mobile/src/features/profile/components/ProfileDetailScreen.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/profile/components/ProfileHeader.tsx apps/mobile/src/features/profile/components/ProfileHeader.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/profile/components/ProfileMenuCard.tsx apps/mobile/src/features/profile/components/ProfileMenuCard.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/profile/components/ProfileStatGrid.tsx apps/mobile/src/features/profile/components/ProfileStatGrid.tsx`
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/profile/__tests__/profile.components.test.tsx --runInBand`: PASS, 3 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/profile/__tests__/profile-detail-routes.screen-wiring.test.ts --runInBand`: PASS, 7 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `node scripts\release\classify-merge-conflict-archive.mjs`: PASS; decisions now show 34 `CURRENT_ACCEPTED`, 58 `REVIEW_REQUIRED`, 26 `EXCLUDE_RUNTIME`, and 14 `SUPERSEDED_BY_CURRENT_EVIDENCE`.

## Remaining Work

The merge archive remains a historical review source. It is not yet safe to delete because 58 mobile-source rows still require semantic port review.
