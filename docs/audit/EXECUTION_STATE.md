# Execution State

Updated: 2026-07-26 KST

## 2026-07-26 Master-Goal Correction

- The previous safe-entry, direct-entry, and patched debug APK records below are retained only as historical crash-triage evidence.
- They are no longer accepted as final QA APK, release-like APK, Stitch production UI, or launch-readiness evidence.
- Current source removed `apps/mobile/src/android-safe-entry.tsx`.
- Current Android entry is full Expo Router: `react-native-gesture-handler` plus `expo-router/entry`.
- Local Android debug build cleanup now restores the Expo Router entry instead of restoring safe-entry after timeout or termination.
- Static APK inspection now treats `1.0.1-android-safe-entry`, `android-safe-entry`, and `android-direct-entry` bundle markers as forbidden.
- D-013 remains FAIL until Stitch 304 states are proven through production-route visual/accessibility/runtime evidence.
- D-026 remains FAIL until the exact clean full Expo Router release-like APK passes the required runtime checks.

## Repository

- Root: `C:/Users/PC/Desktop/salary-hijacking-platform`
- Branch: `codex/payroll-reminder-launch-ready-100-20260714`
- HEAD: `bbb7410fbbaeb784b9a4026f65154f94794ac0b4`
- Remote: `https://github.com/jinbizman-boop/salary-hijacking.git`

## Current Phase

- Phase: master objective reset / Phase 0 baseline re-audit
- Status: IN_PROGRESS; updated objective file read and decoded as UTF-8.
- Latest objective source: `C:/Users/PC/.codex/attachments/1faab0fc-410e-4c62-b577-b8802280b6de/goal-objective.md`
- Scope lock: APK generation is not the first-priority completion target. The current target is strict runtime completion across requirements, Stitch UI, mobile/API/DB/Admin/operations/security/QA, with APK generated only after required gates pass.

## Important Constraint

Android physical-device crash verification is not complete until `adb logcat`, install, cold start, and background/resume evidence are captured against the latest APK on the user's ARM64 Samsung phone or an equivalent connected ARM64 device.

## Latest Diagnostic APK Evidence

- ARM64 diagnostic APK path: `artifacts/android/salary-hijacking-original-safe-current-arm64.apk`
- ARM64 SHA-256: `8EEDCF261C1B511D2E0BE901E14497ACBDA3487877BBF54F1ED71D5AB7255701`
- ARM64 package: `com.salaryhijacking.mobile`, versionCode `202607241`, versionName `1.0.0`, min SDK 24, target SDK 35, ABI `arm64-v8a`
- ARM64 signing: PASS via APK Signature Scheme v2 debug cert (`artifacts/qa/build-original-safe-current-arm64-after-cmake-repair-20260723-bbb7410.log`)
- x86_64 emulator diagnostic APK path: `artifacts/android/salary-hijacking-original-safe-current-x86_64.apk`
- x86_64 SHA-256: `AE2737F1F09BE30082543E884AA9F5F45A5DAC68E0D5C68BB5BEDB7622DD2256`
- x86_64 package: `com.salaryhijacking.mobile`, versionCode `202607244`, versionName `1.0.0`, min SDK 24, target SDK 35, ABI `x86_64`
- x86_64 signing: PASS via APK Signature Scheme v2 debug cert
- x86_64 emulator install: PASS (`artifacts/qa/adb-install-x86_64-current-20260724-bbb7410.txt`)
- x86_64 emulator cold start: PASS 10/10 (`artifacts/qa/adb-cold-start-10x-x86_64-current-20260724-bbb7410.txt`)
- x86_64 emulator fatal scan: PASS, no `FATAL EXCEPTION` in captured logcat (`artifacts/qa/logcat-cold-start-10x-x86_64-current-20260724-bbb7410.txt`)

## Latest Direct App APK Evidence

- x86_64 direct APK path: `artifacts/android/salary-hijacking-direct-current-x86_64.apk`
- x86_64 SHA-256: `53FE8BA9768379EFF1CA2A84FA068F769AEDB31D77D27CE03BCDACF089658C04`
- x86_64 package: `com.salaryhijacking.mobile`, versionCode `202607247`, versionName `1.0.0`, min SDK 24, target SDK 35, ABI `x86_64`
- x86_64 signing: PASS via APK Signature Scheme v2 debug cert
- x86_64 emulator clean install: PASS (`artifacts/qa/install-direct-current-x86_64-20260724-bbb7410.txt`)
- x86_64 emulator cold start: PASS 10/10 (`artifacts/qa/startup-direct-current-x86_64-10x-20260724-bbb7410.csv`)
- x86_64 emulator background/resume: PASS 10/10 (`artifacts/qa/resume-direct-current-x86_64-10x-20260724-bbb7410.csv`)
- x86_64 emulator launcher/monkey start: PASS (`artifacts/qa/launcher-monkey-direct-current-x86_64-20260724-bbb7410.txt`)
- x86_64 emulator package fatal scan: PASS, 0 target package `FATAL EXCEPTION` / `AndroidRuntime` / `ReactNativeJS` fatal matches (`artifacts/qa/logcat-direct-current-x86_64-10x-20260724-bbb7410.txt`, `artifacts/qa/logcat-direct-current-x86_64-resume-10x-20260724-bbb7410.txt`)
- ARM64 direct APK path: `artifacts/android/salary-hijacking-direct-current-arm64.apk`
- ARM64 SHA-256: `F599B556B6C98A7DBB284CE21830672E38B9959952C92CF05B93335EBB7674F1`
- ARM64 package: `com.salaryhijacking.mobile`, versionCode `202607248`, versionName `1.0.0`, min SDK 24, target SDK 35, ABI `arm64-v8a`
- ARM64 signing: PASS via APK Signature Scheme v2 debug cert
- ARM64 physical device install/cold-start/logcat: NOT VERIFIED; no ARM64 phone is connected to adb in this workspace.

## Latest Direct App Splash-Hide APK Evidence

- Code fix: `apps/mobile/src/android-direct-entry.tsx` now calls `SplashScreen.preventAutoHideAsync()` defensively and hides native splash from the first root layout with a 2.5s fallback timeout. The catch paths are non-fatal.
- x86_64 splash-hide direct APK path: `artifacts/android/salary-hijacking-direct-current-x86_64-splash-hide.apk`
- x86_64 splash-hide SHA-256: `0F3B5108FA978F965BDFB701033099E31B92584E149F9FA79ED6333ABA0F6F28`
- x86_64 package: `com.salaryhijacking.mobile`, versionCode `202607249`, versionName `1.0.0`, min SDK 24, target SDK 35, ABI `x86_64`
- x86_64 signing: PASS via APK Signature Scheme v2 debug cert
- x86_64 emulator clean install: PASS (`artifacts/qa/install-direct-x86_64-splash-hide-20260725-bbb7410.txt`)
- x86_64 emulator cold start: PASS 10/10 (`artifacts/qa/startup-direct-x86_64-splash-hide-10x-20260725-bbb7410.csv`)
- x86_64 emulator package fatal scan: PASS, 0 target package fatal-like matches (`artifacts/qa/logcat-direct-x86_64-splash-hide-10x-20260725-bbb7410.txt`)
- x86_64 emulator lifecycle rerun after cleanup: PASS, clean install, cold start 10/10, background/resume 10/10, fatal marker count 0 (`artifacts/qa/direct-x86_64-splash-hide-lifecycle-20260725-rerun/summary.json`)
- ARM64 splash-hide direct APK path: `artifacts/android/salary-hijacking-direct-current-arm64-splash-hide.apk`
- ARM64 splash-hide direct APK Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-direct-current-arm64-splash-hide.apk`
- ARM64 splash-hide SHA-256: `F838C2968698CB4A109116382A037C0E0DB2AEE402082A33503ED047C1E9E050`
- ARM64 package: `com.salaryhijacking.mobile`, versionCode `202607250`, versionName `1.0.0`, min SDK 24, target SDK 35, ABI `arm64-v8a`
- ARM64 signing: PASS via APK Signature Scheme v2 debug cert
- ARM64 physical device install/cold-start/logcat: NOT VERIFIED; no ARM64 phone is connected to adb in this workspace.
- Universal direct splash-hide rebuild attempt: TIMED_OUT in Reanimated CMake warmup with no output APK (`artifacts/qa/build-universal-splash-hide-timeout-20260725.txt`); orphaned build-chain processes were terminated.
- Timeout cleanup follow-up: `apps/mobile/index.android.js` was restored to `android-safe-entry`, and `apps/mobile/scripts/expo-local-android-debug-build.mjs` now installs best-effort SIGINT/SIGTERM/exit restore hooks so future external termination is less likely to poison later builds.

## Latest Safe Splash-Hide Universal QA Candidate

- Code fix: `apps/mobile/src/android-safe-entry.tsx` now also calls `SplashScreen.preventAutoHideAsync()` defensively and hides native splash from the first root layout with a 2.5s fallback timeout.
- APK path: `artifacts/android/salary-hijacking-qa-safe-current-splash-hide-universal.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-qa-safe-current-splash-hide-universal.apk`
- SHA-256: `EFBE90AE9E0E864C658D630FA0163238A1824848D2C93C1C64789E79856D9CDD`
- Build info: `artifacts/android/build-info-safe-current-splash-hide-universal.json`
- Package: `com.salaryhijacking.mobile`, versionCode `202607223`, versionName `1.0.0`, min SDK 24, target SDK 35, ABI `arm64-v8a` + `x86_64`
- Signing: PASS via APK Signature Scheme v2/v3 debug cert (`artifacts/qa/apk-safe-current-splash-hide-universal-apksigner-verify-20260725.log`)
- Static metadata: PASS (`artifacts/qa/apk-safe-current-splash-hide-universal-aapt-badging-20260725.log`)
- x86_64 emulator lifecycle: PASS, clean install, cold start 10/10, background/resume 10/10, fatal marker count 0 (`artifacts/qa/safe-current-splash-hide-universal-lifecycle-20260725/summary.json`)
- Build method: current safe-entry Hermes bundle patched into an existing verified universal APK shell and re-signed after the full ARM64 Gradle rebuild timed out. This is a QA rescue APK candidate, not a production AAB.
- Physical Samsung/ARM64 install/cold-start/logcat: NOT VERIFIED; no physical Android phone is connected to adb in this workspace.

## Immediate Confirmed / Resolved Items

- RESOLVED: Windows local CMake/Ninja dirty loop for `expo-modules-core` prefab inputs was reproduced and repaired for ARM64 by converting existing relative prefab CMake inputs in `build.ninja` to Windows absolute Ninja paths before the native build.
- RESOLVED: Windows local CMake/Ninja stale absolute-path failures for direct app builds were repaired by patching generated Expo Modules Core and Reanimated CMake/Ninja paths away from `Z:` and long `.gradle-local-debug*` paths and clearing stale `.ninja_deps` / `.ninja_log` files before native build tasks.
- RESOLVED: Direct Android entry now hides native splash after the first React root layout and also has a timeout fallback so native splash stuck does not block runtime verification.
- RESOLVED: Safe Android entry now also hides native splash after the first React root layout and has a timeout fallback.
- RESOLVED: x86_64 emulator direct APK installs, cold-starts 10/10, resumes 10/10, and launcher-starts without target package fatal exceptions.
- RESOLVED: x86_64 emulator splash-hide direct APK installs and cold-starts 10/10 without target package fatal exceptions.
- RESOLVED: x86_64 emulator diagnostic APK installs and cold-starts 10/10 on the connected emulator without package fatal exceptions.
- RESOLVED: Android local debug build script now has regression coverage for restoring the safe Android entry on termination signals after a timeout or external kill.
- CONFIRMED: latest ARM64 diagnostic APK has not been installed and logcat-verified on the user's physical Samsung phone.
- CONFIRMED: ARM64 direct APK is built and signed, but has not been installed and logcat-verified on the user's physical Samsung phone.
- CONFIRMED: ARM64 splash-hide direct APK is built and signed, but has not been installed and logcat-verified on the user's physical Samsung phone.
- CONFIRMED: safe splash-hide universal QA candidate is built, signed, and emulator-verified, but has not been installed and logcat-verified on the user's physical Samsung phone.
- CONFIRMED: these APKs are debug-signed diagnostic/direct artifacts, not final full-app release-like QA APK evidence under the updated master objective.

## Current-HEAD Safe Universal QA APK

- Commit packaged: `9cba4f83d609a67c282393a3ecd3ed11e779c818`
- APK path: `artifacts/android/salary-hijacking-qa-universal.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-qa-universal.apk`
- Safe-current alias: `C:/Users/PC/Downloads/salary-hijacking-qa-safe-current-splash-hide-universal.apk`
- D: mirror: `D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-universal.apk`
- SHA-256: `DE4C6F4FC339680822FDEE54E4BF694BB6948C4D0F4AA63461D64931FAC4B482`
- Package: `com.salaryhijacking.mobile`, versionCode `202607223`, versionName `1.0.0`, min SDK 24, target SDK 35, ABI `arm64-v8a` + `x86_64`
- Signing: PASS via APK Signature Scheme v2/v3 debug cert (`artifacts/qa/apk-current-head-9cba4f8-apksigner-verify-20260725.log`)
- Static metadata: PASS (`artifacts/qa/apk-current-head-9cba4f8-aapt-badging-20260725.log`)
- Static bundle/native inspection: PASS (`artifacts/qa/apk-current-head-9cba4f8-static-inspection-20260725.json`)
- x86_64 emulator clean-install lifecycle: PASS, cold start 10/10, background/resume 10/10, fatal marker count 0 (`artifacts/qa/current-head-9cba4f8-universal-lifecycle-20260725/summary.json`)
- x86_64 emulator same-version upgrade lifecycle: PASS, `install -r`, launcher monkey, cold start 10/10, background/resume 10/10, fatal marker count 0 (`artifacts/qa/current-head-9cba4f8-universal-upgrade-20260725/summary.json`)
- x86_64 emulator rerun after current HEAD/evidence cleanup: PASS, clean install, cold start 10/10, background/resume 10/10, fatal marker count 0 (`artifacts/qa/current-head-c3b019c-emulator-rerun-20260725/summary.json`)
- Physical Samsung/ARM64 install/cold-start/logcat: NOT VERIFIED; no physical Android phone is connected to adb in this workspace.

## Next Exact Action

Strict release readiness is now blocked by external approval gates, origin/main policy, and physical Samsung/ARM64 phone QA. Continue only with work that can be verified locally; do not claim the phone crash gate PASS until the affected phone is connected and redacted logcat proves it.
