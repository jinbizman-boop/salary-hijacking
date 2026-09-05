# Iteration 124 - Android Local Build Timeout Guard

Date: 2026-07-15 KST

## Scope

- `apps/mobile/scripts/expo-local-android-debug-build.mjs`
- `apps/mobile/scripts/expo-local-android-debug-build.test.mjs`

## Why

The previous current-source Android debug APK refresh attempt timed out from the outer Codex command after roughly 30 minutes. Because the local Android build wrapper did not distinguish a Gradle timeout from a generic Gradle failure, the outer timeout could leave native build children and a Windows `subst` alias behind before the wrapper reached its cleanup path.

## Change

- Added `SALARY_HIJACKING_ANDROID_BUILD_GRADLE_TIMEOUT_MS` support for Gradle invocations inside the local Android debug build wrapper.
- A Gradle spawn timeout is now reported as status `124` with the exact Gradle task arguments.
- Timeout results bypass the Windows repair/retry path so the wrapper can fail clearly instead of masking the timeout as a generic status `1`.
- Added a regression test that fails without the timeout guard and passes with the new timeout handling.

## Verification

- RED: `node --test --test-name-pattern "Gradle timeout" apps\mobile\scripts\expo-local-android-debug-build.test.mjs`
  - Failed before implementation with `1 !== 124`.
- GREEN: `node --test --test-name-pattern "Gradle timeout" apps\mobile\scripts\expo-local-android-debug-build.test.mjs`
  - PASS.
- Regression: `node --test apps\mobile\scripts\expo-local-android-debug-build.test.mjs`
  - PASS, 23 tests.
- Formatting: `corepack pnpm run format:check`
  - PASS.

## Remaining

- This change does not itself produce a current-source APK.
- A fresh phone-target APK and `release/mobile-preview-evidence.json` refresh are still required after this source commit.
- Physical Android phone install, cold start, persistence, safe-area, keyboard, and logcat proof remain pending.
