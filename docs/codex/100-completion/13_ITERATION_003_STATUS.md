# Iteration 003 Status

## Requirement Matrix

- Total tracked launch requirements: 22
- Status counts: PASS 20 / BLOCKED 2
- Matrix pass ratio: 90.9%

## Evidence-Based PASS Reclassification

- `REQ-APP-001`: Expo Router index-tab route contract is covered by `app-screen-contract.test.ts`.
- `REQ-APP-002`: salary home planned/completed semantics are covered by salary launch readiness tests.
- `REQ-APP-003`: variable expense form persistence is covered by mobile tests and API contract tests.
- `REQ-APP-004`: plan detail CRUD is covered by plan launch readiness tests plus API persistence contracts.
- `REQ-APP-006`: notification stack, no bottom tab, and deep-link callback are covered by notification launch readiness tests.
- `REQ-FIN-001`: payroll, daily budget, fixed expense, variable expense, and savings server-authority contracts are covered by API and DB repository tests.
- `REQ-NOTI-001`: notification mobile/API behavior plus notifications/scheduler Worker dry-run evidence is present.
- `REQ-UI-001`: current HEAD web export and capture script generated 17 core mobile UI evidence screenshots.
- `REQ-APP-005`: auth/shared shells now use keyboard-aware and safe-area-aware containers; targeted contract tests pass.

## Remaining BLOCKED

- `REQ-UI-002`: 320-430px web overflow checks, keyboard/safe-area contract tests, and one Android 15 emulator visual safe-area pass exist, but the full physical-device safe-area and virtual-keyboard matrix is not fully proven.
- `REQ-APK-001`: current-HEAD ARM64 debug APK build/signing verification, verified temp.sh APK download link, and local Android 15 emulator install/cold-start/navigation QA pass. Physical phone install/cold-start/logcat proof remains blocked.

## Iteration 003 Verification

- `format:check`: PASS after Prettier cleanup.
- `@salary-hijacking/mobile typecheck`: PASS.
- `@salary-hijacking/mobile test`: PASS, 64 suites / 704 tests.
- `capture-mobile-clean-fintech-screenshots.test.mjs`: PASS.
- `@salary-hijacking/mobile export:web`: PASS.
- `capture-mobile-clean-fintech-screenshots.mjs`: PASS, 17 mobile UI screenshots and 105 responsive overflow checks.
- `pnpm run build`: PASS.
- `build:phone:android:local-debug`: PASS, generated `apps/mobile/build/phone/android/salary-hijacking-phone-arm64-debug.apk`.
- APK SHA256: `BD55D440BE081499FF743A3F25B45C91850FA42AC919CD4B80F8C9E0D40938E9`.
- `apksigner verify --verbose --print-certs`: PASS, APK Signature Scheme v2 verified.
- `aapt dump badging`: PASS, package `com.salaryhijacking.mobile`, versionName `1.0.0`, targetSdk `35`.
- ARM64 APK download URL: `https://temp.sh/juDjq/salary-hijacking-phone-arm64-debug.apk`.
- ARM64 APK temp.sh download verification: PASS, POST download HTTP 200, `application/vnd.android.package-archive`, 147,475,186 bytes, SHA256 matched local APK.
- `release/mobile-preview-evidence.json`: PASS, current-head debug APK build/signing/download, Android 15 emulator install, 5 cold starts, navigation, notification no-tab, and background/foreground QA are now first-class release readiness checks.
- `node --test scripts\release\check-release-readiness.test.mjs`: PASS, 64 tests including mobile preview evidence missing/pass/unsafe-data coverage.
- `check-release-readiness --strict` after preview evidence: expected FAIL with exitCode 1 because CLI warnings and dirty tree remain; new `mobile:preview:*` checks are PASS.
- `check-release-readiness` local Wrangler detection: PASS, workspace-local `node_modules/.bin/wrangler*` now satisfies the Cloudflare Wrangler CLI check without requiring global PATH installation.
- `node --test scripts\release\check-release-readiness.test.mjs` after Wrangler local-path guard: PASS, 65 tests.
- `check-release-readiness --strict` after local Wrangler guard: expected FAIL with exitCode 1; Cloudflare Wrangler is now PASS, remaining warnings are GitHub CLI missing, Neon CLI missing, and dirty git status.
- Android 15 emulator setup: PASS, created `salary_hijacking_api35_x86_64` with `system-images;android-35;google_apis;x86_64`.
- x86_64 emulator APK: PASS, generated `apps/mobile/build/phone/android/salary-hijacking-phone-x86_64-debug.apk`.
- x86_64 APK SHA256: `46A3D0E6C52D15417A1E74B782136C98F416F8E5FB19EDC714ADF7AAFC604A7F`.
- x86_64 `apksigner verify --verbose --print-certs`: PASS, APK Signature Scheme v2 verified.
- Android emulator `adb install -r`: PASS, `Success`.
- Android emulator cold start: PASS, 5/5 runs kept the app process alive with fatal log marker count `0`.
- Android emulator tab/navigation smoke: PASS, salary/plan/level/community/profile/notifications stayed running with fatal log marker count `0`.
- Notification screen visual QA: PASS, screenshot shows an independent stack screen without the bottom app tab bar.
- Android emulator background/foreground: PASS, 3/3 runs kept the app process alive with fatal log marker count `0`.
- `check-release-readiness --strict`: expected FAIL with exitCode 1 because CLI warnings and dirty tree remain.

## Blocked External/Environment Gates

- Physical Android phone QA: blocked because no physical Android phone is attached to adb in the current Windows environment.
- Remote EAS preview build: EAS CLI is not logged in. Secret/token values were not requested or printed. A verified temp.sh debug APK link is available for QA, but it is not EAS release evidence.
- Production AAB and Play submission remain explicitly unapproved by the user contract.

## Completion Statement

This iteration still does not claim 100%. It removes stale FAIL entries where current tests already prove the requirement, adds current-HEAD ARM64 and x86_64 debug APK build/signing evidence, proves local Android 15 emulator install/cold-start/navigation/background-foreground behavior, provides a verified debug APK download link, promotes that current-head preview QA into release readiness checks, removes the stale Cloudflare Wrangler CLI warning by recognizing workspace-local Wrangler, and leaves the remaining blockers limited to physical-device keyboard/phone QA, authenticated EAS release evidence, GitHub/Neon CLI local availability, and dirty worktree integration.
