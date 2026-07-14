# Iteration 004 Status - Mobile Keyboard QA And Current APK Refresh

Date: 2026-07-13 KST

## Scope

- Work root: `C:/Users/PC/Desktop/salary-hijacking-platform`
- HEAD: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`
- Primary target: salary home variable-expense keyboard avoidance, root font-loading timeout fallback, ABI-filtered clean native x86_64 Android emulator APK, ABI-filtered clean native arm64-v8a phone APK, no-secret release evidence update, current-head emulator cold-start/navigation/notification/background-foreground proof.

## Implemented

- Updated `apps/mobile/src/features/salary/components/SalaryHomeReferenceScreen.tsx`.
- Reworked salary-screen Android keyboard avoidance to use padding-based IME handling.
- Added a `ScrollView` ref and variable-expense form anchor so focused inputs are scrolled above the keyboard.
- Added the workspace root to Metro `watchFolders` so the Android root entry file can be bundled outside `apps/mobile`.
- Added a root font-loading timeout fallback so the app does not stay on the white Freesentation loading screen if bundled custom fonts fail to resolve before startup.
- Generated a current-head clean native x86_64 Android debug APK through the local Expo/Gradle build script after the Windows build root and disk-space constraints were cleared.
- Fixed the local Windows ARM64 debug build path by making the Reanimated CMake repair follow the configured ABI and regenerate missing `CMakeFiles/rules.ninja` after `configureCMakeDebug[arm64-v8a]`.
- Generated a current-head clean native arm64-v8a-only Android debug APK for phone-side QA so Samsung/modern Android phones do not receive a stale mixed-ABI package.

## Verified

- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.launch-readiness.test.tsx --runInBand`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile typecheck`: PASS.
- `corepack pnpm run format:check`: PASS after formatting generated QA JSON.
- `node --test scripts\release\check-release-readiness.test.mjs`: PASS, 65 tests.
- Current-head clean native x86_64 debug APK build: PASS.
- Current-head clean native x86_64 debug APK signing verification: PASS with APK Signature Scheme v2.
- Current-head clean native arm64-v8a ABI-filter debug APK build: PASS.
- Current-head clean native arm64-v8a ABI-filter debug APK signing verification: PASS with APK Signature Scheme v2.
- Current-head clean native arm64-v8a ABI-filter debug APK temp.sh download verification: PASS, HTTP 200.
- Current-head clean native arm64-v8a ABI-filter debug APK ZIP inspection: PASS, exactly `arm64-v8a` ABI and `lib/arm64-v8a/libexpo-modules-core.so` present.
- Current-head x86_64 ABI-filter emulator APK route recheck: PASS, `salary`, `plan`, and `notifications` COLD deep links fatal count 0; notifications opened without bottom-tab labels.
- `node --test scripts\release\check-release-readiness.test.mjs`: PASS, 67 tests after adding phone-target preview APK evidence validation.
- `corepack pnpm --filter @salary-hijacking/mobile test`: PASS, 64 suites / 705 tests.
- `corepack pnpm run build`: PASS, 12/12 Turbo build tasks.
- Android 15 x86_64 emulator install: PASS.
- Android 15 x86_64 emulator cold start: PASS, 5/5 runs with fatal logcat count 0.
- Android 15 x86_64 emulator navigation smoke: PASS for salary, plan, level, community, profile, and notifications deep-link routes with fatal count 0.
- Android 15 x86_64 emulator notification stack: PASS, notifications opened without the bottom-tab label bundle.
- Android 15 x86_64 emulator background/foreground: PASS, 3/3 runs with fatal count 0.
- Android 15 x86_64 emulator keyboard QA: PASS for the salary variable-expense input path; the soft keyboard is visible, the active input stays visible, and the save CTA is above the IME.
- temp.sh POST download verification: PASS, HTTP 200, `application/vnd.android.package-archive`, SHA256 matched.
- `node scripts\release\check-release-readiness.mjs --strict`: exitCode 1 by strict-warning policy, status `READY`, with `mobile:preview:*` PASS and remaining non-zero status limited to warnings for missing local GitHub CLI, missing local Neon CLI, and dirty git status.

## APK

- Phone QA target local path: `D:/salary-hijacking-artifacts/20260713/salary-hijacking-phone-arm64-abi-filter-debug.apk`
- Phone QA target SHA256: `10C3FC2ED13C90F19DEFDE57062B88ED220D74623B3EC251C6CE03BBCC8101D8`
- Phone QA target temporary QA URL: `https://temp.sh/VAGAE/salary-hijacking-phone-arm64-abi-filter-debug.apk`
- Phone QA target ABI coverage: `arm64-v8a` only.
- Emulator QA local path: `D:/salary-hijacking-artifacts/20260713/salary-hijacking-phone-x86_64-abi-filter-debug.apk`
- Emulator QA SHA256: `01D95D5FA56A5278B325EB4423CFFB389375EBAB5247722B9D0879F3075AF395`
- Emulator QA temporary QA URL: `https://temp.sh/fnyMN/salary-hijacking-phone-x86_64-abi-filter-debug.apk`
- Download note: temp.sh GET shows a download page; POST downloads the APK. Mobile browser users can open the URL and press the download button.

## Device QA Evidence

- D-drive Android 15 x86_64 AVD booted successfully after the original C-drive AVD failed with insufficient disk space.
- Current-head x86_64 ABI-filter APK installed, cold-started 5/5 with fatal count 0, survived background/foreground 3/3 with fatal count 0, and passed a stricter COLD deep-link recheck for salary/plan/notifications with fatal count 0.
- Before the keyboard fix, emulator screenshot `android-keyboard-qa-variable-form-amount-keyboard-open.png` proved the amount field was visible but the save button was below the keyboard.
- After the keyboard and font-timeout fix, clean native emulator screenshot `docs/qa/100-completion/iteration-004-20260713/x86-clean-build/full-emulator-qa/keyboard-variable-expense.png` proves the soft keyboard is visible and the variable-expense input/save path is usable above the IME.
- This promotes the salary variable-expense keyboard path to emulator PASS. The broader all-screen/all-field physical keyboard and safe-area matrix remains blocked until a phone or device-farm run is available.

## Current Blockers

- Clean native x86_64 debug rebuild is no longer blocked; it passed on the Android 15 emulator with the current source.
- Clean native arm64-v8a debug rebuild is no longer blocked; it passed local build/sign/download/ABI-library inspection checks. It is not installed on the attached x86_64 emulator because that would be an ABI mismatch; equivalent runtime proof is supplied by the separate x86_64 ABI-filter APK from the same source.
- Release readiness now validates supplied phone-target preview APK evidence for build, signing, SHA256, download proof, single `arm64-v8a` ABI compatibility, and Expo native module library presence, while emulator runtime proof is validated through the x86_64 ABI-filter APK.
- No physical Android phone is attached to this Codex environment, so phone-side install, cold start, keyboard, persistence, and logcat QA remain BLOCKED.
- Strict release readiness warns about missing local GitHub CLI, missing local Neon CLI, and dirty worktree; connector evidence exists for account access, but strict mode intentionally keeps warnings non-zero.
- Production AAB, EAS submit, Play Console upload/submission, new EAS project, new keystore, Firebase reset, DB destructive migration, force push/rebase, and secret changes were not performed.

## Objective Status

- Source-level keyboard fix: PASS.
- Current-head clean native Android QA APK build/sign/download: PASS.
- Current-head clean native phone-target Android QA APK build/sign/download: PASS.
- Current-head emulator install/cold start/navigation/notification/background-foreground: PASS.
- Current-head emulator keyboard QA: PASS for the salary variable-expense input/save path.
- Physical phone QA: BLOCKED.
- Project 100% launch readiness: NOT ACHIEVED.
