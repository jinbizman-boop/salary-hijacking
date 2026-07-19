# Iteration 136 - Profile Server Summary Screen

## Scope

Reduced GATE-052 risk in the MY/Profile tab by removing prototype profile copy from the production tab route and moving the screen to a server-authoritative profile snapshot component.

## Changed Files

- `apps/mobile/app/(tabs)/profile/index.tsx`
- `apps/mobile/src/features/profile/components/ProfileScreen.tsx`
- `apps/mobile/src/features/profile/components/index.ts`
- `apps/mobile/src/features/profile/__tests__/profile.components.test.tsx`
- `apps/mobile/src/features/profile/__tests__/profile.screen-wiring.test.ts`
- `apps/mobile/src/shared/api/__tests__/app-screen-contract.test.ts`

## Result

- Added `ProfileScreen`, which loads `ProfileApiClient.getProfile()` when available and renders only the normalized profile snapshot.
- The profile tab route no longer renders `ProfileHeader`, `ProfileStatGrid`, and `ProfileMenuCard` with hardcoded prototype user copy.
- The runtime fallback now uses generic safe copy and zero-value aggregate stats instead of sample user data.
- Added regression coverage preventing the profile tab route from shipping `prototype-profile`, `사용자 기획자님`, `5,780,000`, `18Lv`, or `88%` sample values.

## Verification

- RED:
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/profile/__tests__/profile.screen-wiring.test.ts src/features/profile/__tests__/profile.components.test.tsx --runInBand`
  - Failed because `ProfileScreen` was not exported/used and the route still contained prototype profile copy.
- GREEN:
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/profile/__tests__/profile.screen-wiring.test.ts src/features/profile/__tests__/profile.components.test.tsx --runInBand`: PASS, 2 suites and 6 tests.
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/profile/__tests__/profile.screen-wiring.test.ts src/features/profile/__tests__/profile.components.test.tsx src/shared/api/__tests__/app-screen-contract.test.ts src/features/profile/__tests__/profile-detail-routes.screen-wiring.test.ts src/features/profile/__tests__/profile.api.test.ts --runInBand`: PASS, 5 suites and 67 tests.
  - `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
  - `corepack pnpm run format:check`: PASS.
  - `git diff --check`: PASS.
  - Profile runtime sample search for `prototype-profile`, `사용자 기획자님`, `짠테크 기획자님`, `5,780,000`, `5780000`, `18Lv`, and `88%`: no matches in the profile tab route or profile runtime components.
  - `node scripts/release/check-release-readiness.mjs --soft`: still BLOCKED as expected. New source changes make the previous APK evidence stale until the next APK/evidence refresh.

## Remaining

- GAP-003, GAP-004, GAP-005, GAP-006, and GAP-008 remain unresolved or blocked.
- Physical Android phone QA is still not verified in this Codex Windows environment.
- A fresh APK/evidence commit is required after this source commit because mobile source changed after iteration 135.
- No production AAB, Play submit, new EAS project, new keystore, secret rotation, destructive DB change, force push, rebase, or direct main push was performed.
