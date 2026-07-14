# Iteration 017 Status - Plan Savings Server-First Save

Observed at: 2026-07-13T15:41:21+09:00

## Scope

- Restored the plan component interaction regression test file to valid UTF-8 labels so it can execute instead of failing at parse time.
- Added a regression test for monthly fixed savings creation from the plan screen.
- Updated `PlanReferenceScreen` so new fixed savings rows call the server-authoritative `createSavingsGoal` API before syncing the preview state.
- Refreshed the latest-source Android phone-target preview/debug APK evidence.

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.components.test.tsx --runInBand`
  - PASS: 7 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.components.test.tsx src/features/plan/__tests__/plan.api.test.ts src/features/salary/__tests__/salary.components.test.tsx --runInBand`
  - PASS: 28 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`
  - PASS.
- `corepack pnpm exec prettier --check apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`
  - PASS.
- `git diff --check -- apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`
  - PASS.
- `node scripts/expo-local-android-debug-build.mjs --architecture arm64-v8a --output build/phone/android/salary-hijacking-phone-arm64-iteration017-debug.apk --check`
  - PASS.
- `node scripts/expo-local-android-debug-build.mjs --architecture arm64-v8a --output build/phone/android/salary-hijacking-phone-arm64-iteration017-debug.apk`
  - PASS.
- `apksigner verify --verbose`
  - PASS, APK Signature Scheme v2 verified, 1 signer.
- ABI inspection
  - PASS, `arm64-v8a` only.
- `node scripts/release/check-release-readiness.mjs --soft`
  - PASS/READY after evidence refresh.
- `corepack pnpm run clean:junk`
  - PASS, removed 23 generated paths and freed 1.62 GB.
- `corepack pnpm run clean:junk:dry-run`
  - PASS, 0 generated paths remain.

## APK

- Downloads: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration017-debug.apk`
- Evidence copy: `D:/salary-hijacking-artifacts/20260713/iteration-017-plan-server-first-savings/salary-hijacking-phone-arm64-iteration017-debug.apk`
- SHA256: `EF5355CB5FD1996ACD8A6E2261111B76AFC837165C098C9B811749EA7FF0D965`
- Size: 65,072,921 bytes

## Cleanup

- Removed prior iteration 016 APK from Downloads.
- Removed prior iteration 016 artifact folder from `D:/salary-hijacking-artifacts/20260713/`.
- Retained only the latest iteration 017 phone APK and its no-secret summary evidence for this work unit.

## Remaining Limits

- Physical Android phone install/cold-start/keyboard/safe-area/logcat QA is still pending because no physical phone is attached to this Codex Windows environment.
- Production AAB, Google Play upload/submit, new keystore, new EAS project, secret rotation, and destructive DB operations were not executed.
