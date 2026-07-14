# Iteration 013 - Daily Budget Overspend Preview Guard

Date: 2026-07-13 KST

## Scope

- `apps/mobile/src/features/budget/utils.ts`
- `apps/mobile/src/features/budget/__tests__/budget.utils.test.ts`

## Result

Fixed the mobile offline daily-budget preview calculation so the user-facing
remaining budget never displays a negative KRW value. Overspend remains exposed
through `overspentAmount`, while `remainingToday` is clamped to `0`, matching
the server-authority rule and the documented budget UX contract.

## TDD Evidence

- RED:
  `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/budget/__tests__/budget.utils.test.ts --runInBand`
  failed because `remainingToday` returned `-1500`.
- GREEN:
  The same command passed after clamping `remainingToday`.

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/budget/__tests__/budget.utils.test.ts --runInBand`:
  PASS, 8 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/budget/__tests__/budget.api.test.ts src/features/budget/__tests__/budget.selectors.test.ts src/features/budget/__tests__/budget.components.test.tsx --runInBand`:
  PASS, 37 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm exec prettier --check apps/mobile/src/features/budget/utils.ts apps/mobile/src/features/budget/__tests__/budget.utils.test.ts`:
  PASS.
- `corepack pnpm run clean:junk:dry-run`: PASS, would remove 0 generated
  paths.
- `node scripts/expo-local-android-debug-build.mjs --architecture arm64-v8a --output build/phone/android/salary-hijacking-phone-arm64-iteration013-debug.apk --check`
  from `apps/mobile`: PASS.
- `node scripts/expo-local-android-debug-build.mjs --architecture arm64-v8a --output build/phone/android/salary-hijacking-phone-arm64-iteration013-debug.apk`
  from `apps/mobile`: PASS, local debug APK built.
- `apksigner verify --verbose`: PASS, v2 signature verified.
- `node scripts/release/check-release-readiness.mjs --soft`: READY; latest
  source APK gate PASS and phone-target APK gate PASS with SHA256
  `BA48DF05A77E89C645C7394E16CB21659C5D428C427E2174BA712C1E68353FB2`.

## APK Evidence

- Preserved artifact:
  `D:/salary-hijacking-artifacts/20260713/iteration-013-latest-source/salary-hijacking-phone-arm64-iteration013-debug.apk`
- User-download copy:
  `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration013-debug.apk`
- SHA256:
  `BA48DF05A77E89C645C7394E16CB21659C5D428C427E2174BA712C1E68353FB2`
- Evidence:
  `release/mobile-preview-evidence.json`
  `D:/salary-hijacking-artifacts/20260713/iteration-013-latest-source/apk-summary.json`

## Remaining Blockers

- This is a focused mobile budget correctness fix. It does not prove physical
  phone QA, production AAB, Play submission, deployed API/DB persistence, or
  full launch readiness.
- No production AAB, EAS submit, Play submission, new EAS project, new
  keystore, Firebase reset, secret rotation, destructive DB migration,
  force push/rebase, or Cloudflare secret mutation was performed.
