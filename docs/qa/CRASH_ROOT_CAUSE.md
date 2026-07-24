# Android Crash Root Cause

Status: ROOT_CAUSE_FIXED_STATIC_AND_X86_EMULATOR_VERIFIED_ARM64_PHONE_BLOCKED

## 2026-07-25 Direct Splash-Hide Recheck

- Current HEAD: `bbb7410fbbaeb784b9a4026f65154f94794ac0b4`.
- User-facing ARM64 diagnostic candidate: `C:/Users/PC/Downloads/salary-hijacking-direct-current-arm64-splash-hide.apk`.
- Repository ARM64 artifact: `artifacts/android/salary-hijacking-direct-current-arm64-splash-hide.apk`.
- ARM64 SHA-256: `F838C2968698CB4A109116382A037C0E0DB2AEE402082A33503ED047C1E9E050`.
- ARM64 package metadata: `com.salaryhijacking.mobile`, versionCode `202607250`, versionName `1.0.0`, min SDK 24, target SDK 35, ABI `arm64-v8a`.
- ARM64 static verification: PASS, APK Signature Scheme v2 debug signing and `aapt dump badging` metadata checks.
- Emulator runtime proof for matched x86_64 split artifact: PASS, `artifacts/qa/direct-x86_64-splash-hide-lifecycle-20260725-rerun/summary.json` records clean install, cold start 10/10, background/resume 10/10, fatal marker count 0.
- Universal rebuild attempt: `artifacts/qa/build-universal-splash-hide-timeout-20260725.txt` records a timeout in Reanimated CMake warmup; no universal output APK was produced.
- Remaining physical-phone status: BLOCKED. The only connected Android device is an x86_64 emulator. The user-reported Samsung/ARM64 crash cannot be closed as fixed until the current ARM64 APK is installed on that phone and redacted logcat/exit-info shows no startup fatal exception.
- Scope note: these are direct-entry debug-signed diagnostic APKs to isolate Android startup failure. They are not the final release-like full-app QA APK required by the current master goal.

## 2026-07-22 Original Package Safe-Entry Patched APK Recheck

- Recommended APK: `artifacts/android/salary-hijacking-original-safe-patched-current-universal.apk`
- Mobile copy: `C:/Users/PC/Downloads/salary-hijacking-original-safe-patched-current-universal.apk`
- SHA-256: `FC220C4250A0A511F7DEFB7A8B6B7A42E1BAF3559DBBF42F2548839D3F6124D8`
- applicationId: `com.salaryhijacking.mobile`
- Launcher activity: `com.salaryhijacking.mobile.MainActivity`
- ABI: `arm64-v8a`, `x86_64`
- Root-cause mitigation: the real package APK now uses the safe-entry Android bundle, so Expo Router/SecureStore/feature-module startup failures cannot terminate the Android process before a recoverable screen is shown.
- Patch method: `scripts/release/patch-android-apk-bundle.mjs` replaced `assets/index.android.bundle` in the latest verified original-package APK shell while preserving native library compression, then removed stale signatures, zipaligned, and debug-signed the APK.
- Static verification: PASS, `artifacts/qa/apk-original-safe-patched-current-universal-aapt-badging-20260722-latest-source.log` and `artifacts/android/salary-hijacking-original-safe-patched-current-universal.apk.verify.txt`.
- Emulator proof: PASS, `artifacts/qa/original-safe-patched-lifecycle-latest-source-20260722/summary.json` records clean install exit 0, cold start 10/10, background/resume 10/10, target fatal markers 0.
- Remaining physical-phone status: BLOCKED, no affected Samsung/ARM64 phone is attached. The user-reported phone crash cannot be closed until the patched APK is installed on that phone and redacted logcat/exit-info shows no startup fatal exception.
- Install caveat: this is locally debug-signed; if Android reports an update/signature conflict over an older `com.salaryhijacking.mobile` build, uninstall the older app before installing this QA APK.

## 2026-07-22 Original Package Crash Recheck

- Original package direct-entry universal APK: `artifacts/android/salary-hijacking-original-direct-current-universal.apk`
- Mobile copy: `C:/Users/PC/Downloads/salary-hijacking-original-direct-current-universal.apk`
- SHA-256: `915AE5680B21510F413F684E55FA4547007A815B4469A24FD10D3798080DB76F`
- applicationId: `com.salaryhijacking.mobile`
- Launcher activity: `com.salaryhijacking.mobile.MainActivity`
- ABI: `arm64-v8a`, `x86_64`
- Result: PASS on x86_64 emulator after clean install, cold start 10/10, background/resume 10/10, `FATAL EXCEPTION` 0, exit-info crash/ANR 0.
- Evidence: `artifacts/qa/original-direct-current-universal-emulator-20260722/summary.json`, `artifacts/qa/original-direct-current-universal-emulator-20260722/logcat-fatal-filter.txt`, `artifacts/qa/original-direct-current-universal-emulator-20260722/logcat-full.txt`.
- Additional ABI finding: the ARM64-only original package APK (`B21D03C0D11A822882CF098D6B824DD94693C315AE092CBCA387015A440623D7`) correctly targets Samsung/ARM64 phones, but it crashes on the x86_64 emulator with `SoLoaderDSONotFoundError: couldn't find DSO to load: libreactnative.so` because the emulator requires x86_64 native libraries. The universal APK is therefore the recommended QA artifact unless a phone-specific ARM64 size reduction is required.
- Physical phone status: BLOCKED, no physical Android phone is attached to this Codex Windows environment.

### 2026-07-22 Entry Restore Regression Guard

- Newly reproduced regression: after a `--android-entry direct` phone APK build, `apps/mobile/index.android.js` remained on `import "./src/android-direct-entry";`, which made the repository source fail safe-entry startup contract tests and could poison later builds.
- RED evidence: `artifacts/qa/android-debug-build-entry-restore-red-20260722.log`.
- Fix: `apps/mobile/scripts/expo-local-android-debug-build.mjs` now restores `apps/mobile/index.android.js` to `import "./src/android-safe-entry";` in `finally` after local Android builds.
- GREEN evidence: `artifacts/qa/android-debug-build-entry-restore-green-20260722.log`, `artifacts/qa/mobile-entry-contract-test-20260722-entry-restore-green.log`.
- Follow-up validation: mobile typecheck PASS, core Salary/Plan/Notification/payroll reminder tests PASS, mobile lint PASS, mobile/root format checks PASS.
- Cleanup evidence: `artifacts/qa/clean-junk-20260722-entry-restore.log` removed generated build/test caches and freed 6.80 GB.

## 2026-07-22 Current-Source Direct/Functional APK Evidence

- Current direct-entry mitigation status: PASS on Android emulator with the current dirty mobile source snapshot packaged into the APK.
- Universal APK: `artifacts/android/salary-hijacking-qa-direct-current-universal.apk`
- Universal mobile copy: `C:/Users/PC/Downloads/salary-hijacking-qa-direct-current-universal.apk`
- Universal SHA-256: `47C4BA596453367A71565D1AA02544D19C39A0500BB2799CA36AA412F8F1C0B9`
- ARM64 phone-target APK: `artifacts/android/salary-hijacking-qa-direct-current-arm64.apk`
- ARM64 mobile copy: `C:/Users/PC/Downloads/salary-hijacking-qa-direct-current-arm64.apk`
- ARM64 SHA-256: `AEBBC33F339C6DBFC0B9D719BAB518DE83768E579E6377E67722F5B191C2DBDE`
- applicationId: `com.salaryhijacking.mobile.qa.direct`
- Launcher activity: `com.salaryhijacking.mobile.MainActivity`
- Bundled direct-entry Hermes JS SHA-256: `A4A6F041D8997122E1A8358C009544D61854D91782321365F31AE2C1DCC2D2B1`
- Dirty mobile source snapshot SHA-256: `755C41BF5F4ACE405671FD32A9C8BED01B6CA035B9142DEFE8E87D8EDB639420`
- Emulator install/lifecycle QA: `artifacts/qa/direct-current-emulator-20260722/summary.json` records install success, cold start 10/10, background/resume 10/10, actual fatal markers 0, and crash/ANR exit-info 0.
- Screen evidence: `artifacts/qa/direct-current-emulator-20260722/home-screen.png`
- Physical phone status: BLOCKED, no physical Android phone is attached to this Codex Windows environment.

## 2026-07-22 Current-Source Safe-Entry APK Evidence

- Root-cause mitigation status: PASS on Android emulator with the current dirty mobile source snapshot packaged into the APK.
- Universal APK: `artifacts/android/salary-hijacking-qa-safe-current-universal.apk`
- Mobile copy: `C:/Users/PC/Downloads/salary-hijacking-qa-safe-current-universal.apk`
- D: mirror: `D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-safe-current-universal.apk`
- SHA-256: `71CE1FB9DE2BA39932602A8D99703A20FCDA7F45B0B90B90784A4B785002F413`
- ARM64 phone-target APK: `artifacts/android/salary-hijacking-qa-safe-current-arm64.apk`
- ARM64 mobile copy: `C:/Users/PC/Downloads/salary-hijacking-qa-safe-current-arm64.apk`
- ARM64 SHA-256: `C7E8A4819D06792ABB66B389503F8E1604592BC6617A35E8E5181D5C7F522145`
- applicationId: `com.salaryhijacking.mobile.qa.direct`
- Launcher activity: `com.salaryhijacking.mobile.MainActivity`
- Bundled Hermes JS SHA-256: `B4C817286B85324DB3F98FBCA5BEC163191401661831BF617EA578EF1D9C3BC3`
- Dirty mobile source snapshot SHA-256: `755C41BF5F4ACE405671FD32A9C8BED01B6CA035B9142DEFE8E87D8EDB639420`
- Emulator install/lifecycle QA: `artifacts/qa/safe-current-emulator-20260722-rerun/summary.json` records clean/update install success, cold start 10/10, background/resume 10/10, and fatal filter 0.
- Physical phone status: BLOCKED, no physical Android phone is attached to this Codex Windows environment.

## Confirmed Runtime Failures

Two startup failures were reproduced from Android logcat on the local x86_64 emulator before the final ARM64 phone APK was rebuilt.

### RC-003 Android build script reverted the crash-safe entry before bundling

- Symptom: ARM64 APK rebuilds succeeded, but the APK SHA stayed unchanged and the embedded `assets/index.android.bundle` still contained `1.0.0-android-router-bypass`.
- Evidence:
  - Build log: `artifacts/qa/android-phone-debug-build-20260721-safe-entry.log`
  - APK bundle probe before fix: `android-safe-entry: false`, `1.0.0-android-router-bypass: true`
  - Build script source: `apps/mobile/scripts/expo-local-android-debug-build.mjs` and `apps/mobile/scripts/expo-local-android-production-build.mjs`
- Root cause: local Android build scripts rewrote `apps/mobile/index.android.js` back to `import "./src/android-direct-entry";` immediately before Gradle bundling. As a result, source changes to the new crash-safe entry were not actually packaged into the APK.
- Fix:
  - Added `apps/mobile/src/android-safe-entry.tsx`, a self-contained startup shell that does not import Expo Router, SecureStore, or feature modules at Android process start.
  - Updated `apps/mobile/index.android.js` to import `./src/android-safe-entry`.
  - Updated both local Android build scripts so they preserve/generate the safe entry.
  - Added/updated contract tests so future builds cannot silently revert to `android-direct-entry`.
- Regression evidence:
  - `artifacts/qa/mobile-targeted-test-20260721-android-safe-entry-contracts-rerun.log`
  - `artifacts/qa/android-debug-build-script-test-20260721-safe-entry.log`
  - `artifacts/qa/android-production-build-script-test-20260721-safe-entry.log`
  - ARM64 APK bundle probe after clean rebuild: `android-safe-entry: true`, `android-direct-entry: false`, `1.0.1-android-safe-entry: true`, `1.0.0-android-router-bypass: false`

### RC-001 JSC release/debug bundle parser crash

- Symptom: app process terminated immediately after launch.
- Evidence: `artifacts/qa/logcat-full-x86_64-emulator-20260721.txt`
- Key exception: `com.facebook.react.common.JavascriptException: Unexpected token '?'`
- Root cause: the local Android debug build script forced `-PhermesEnabled=false` on Windows, so the APK used JSC and failed to parse modern React Native / Metro syntax.
- Fix: removed the forced JSC override from `apps/mobile/scripts/expo-local-android-debug-build.mjs`; added regression coverage in `apps/mobile/scripts/expo-local-android-debug-build.test.mjs`.

### RC-002 Android URL credential accessor crash

- Symptom: app launched with Hermes but crashed during the salary home bootstrap.
- Evidence:
  - `artifacts/qa/logcat-full-x86_64-url-fix-emulator-20260721.txt`
  - `artifacts/qa/test-native-url-credential-accessor-red-20260721.log`
- Key exception: `URL.username is not implemented`
- Root cause: multiple mobile API base URL normalizers used URL credential accessors (`username`/`password`) that are not implemented in the Android runtime.
- Fix: added getter-free URL parsing in `apps/mobile/src/shared/api/url-validation.ts` and updated mobile API normalizers to avoid those accessors.
- Regression evidence:
  - `artifacts/qa/test-native-url-getter-free-green-20260721.log`
  - `artifacts/qa/mobile-url-notifications-regression-20260721.log`

## Current Verification

- Direct-entry universal `.qa.direct` APK build: PASS, SHA-256 `ED2E7EC443E8B7FF7A891ABD52C517E71197E8D2CE515611B8C59DB628F0838A`
- Direct-entry universal `.qa.direct` APK metadata: PASS, applicationId `com.salaryhijacking.mobile.qa.direct`, version `1.0.0-qa-direct` / `20260722`, ABI `arm64-v8a` + `x86_64`
- Direct-entry universal `.qa.direct` APK signing: PASS, APK Signature Scheme v2 debug signing verified
- Direct-entry universal `.qa.direct` emulator clean install: PASS, `artifacts/qa/qa-direct-universal-emulator-install-20260722.log`
- Direct-entry universal `.qa.direct` emulator cold starts: PASS, 10/10, `artifacts/qa/qa-direct-universal-emulator-cold-start-20260722.log`
- Direct-entry universal `.qa.direct` emulator background/resume: PASS, 10/10, `artifacts/qa/qa-direct-universal-emulator-background-resume-20260722.log`
- Direct-entry universal `.qa.direct` strict fatal marker count: PASS, 0, `artifacts/qa/qa-direct-universal-emulator-summary-20260722.json`
- Direct-entry universal `.qa.direct` screenshot evidence: PASS, `artifacts/qa/qa-direct-universal-emulator-current-screen-20260722.png`
- Direct-entry universal `.qa.direct` physical Samsung/ARM64 phone QA: BLOCKED, no physical phone is connected to this PC.
- Universal `.qa` crashfix APK build: PASS, SHA-256 `F4EBE8AA71895896C09077074F8982D4281567780F8B738347A5F20CA0E7E1A5`
- Universal `.qa` APK metadata: PASS, applicationId `com.salaryhijacking.mobile.qa`, version `1.0.0-qa` / `20260722`, ABI `arm64-v8a` + `x86_64`
- Universal `.qa` APK signing: PASS, APK Signature Scheme v2 debug signing verified
- Universal `.qa` emulator clean upgrade/install: PASS, `artifacts/qa/qa-universal-emulator-install-20260722.log`
- Universal `.qa` emulator cold starts: PASS, 10/10, `artifacts/qa/qa-universal-emulator-cold-start-10x-20260722.csv`
- Universal `.qa` emulator background/resume: PASS, 10/10
- Universal `.qa` emulator launcher monkey: PASS, exit 0, `artifacts/qa/qa-universal-emulator-launcher-summary-20260722.json`
- Universal `.qa` target-package fatal marker count: PASS, 0, `artifacts/qa/qa-universal-emulator-summary-20260722.json`
- Universal `.qa` physical Samsung/ARM64 phone QA: BLOCKED, no physical phone is connected to this PC.
- Safe-entry ARM64 APK build: PASS, SHA-256 `B2C09C8FA5A24DCCBB8A3C225967B77CEF8975C7821852D857B342C8EA8C3AC1`
- Safe-entry ARM64 APK static bundle/signing inspection: PASS
- Safe-entry current-source x86_64 emulator install/startup/lifecycle: PASS, `artifacts/qa/emulator-safe-entry-20260721`
- Safe-entry x86_64 emulator cold starts: PASS, 10/10
- Safe-entry x86_64 emulator background/resume: PASS, 10/10
- Safe-entry target-package fatal marker count: PASS, 0
- current-source x86_64 emulator install/startup/lifecycle after fixes: PASS, `artifacts/qa/emulator-current-x86-20260721-korean-fresh/summary.json`
- 10/10 cold starts after URL getter-free fix and Android direct-entry ErrorBoundary hardening: PASS, `artifacts/qa/emulator-current-x86-20260721-korean-fresh/startup-timings.csv`
- 10/10 background/resume after URL getter-free fix and Android direct-entry ErrorBoundary hardening: PASS, `artifacts/qa/emulator-current-x86-20260721-korean-fresh/background-resume-timings.csv`
- Fatal marker count for current-source x86_64 emulator run: PASS, 0, `artifacts/qa/emulator-current-x86-20260721-korean-fresh/logcat-target-fatal-filter.txt`
- Android direct-entry startup ErrorBoundary regression: PASS, `artifacts/qa/android-direct-entry-error-boundary-green-20260721.log`
- Android direct-entry Korean UTF-8 regression: PASS, `artifacts/qa/android-direct-entry-korean-green-20260721-final.log`
- Latest ARM64 APK build: PASS
- Latest ARM64 APK static bundle/signing inspection: PASS
- Phone-target build reproducibility: PASS, `artifacts/qa/android-phone-debug-build-20260721-preflight-transform-repair.log`
- AndroidTest skip regression for phone APK output: PASS, `artifacts/qa/phone-apk-skip-androidtest-green-20260721.log`
- Gradle transform preflight repair regression: PASS, `artifacts/qa/phone-apk-preflight-transform-repair-green-20260721.log`
- Physical Samsung phone install/startup logcat: BLOCKED, no Android device is currently connected to this PC.

## Latest ARM64 APK

- Path: `artifacts/android/salary-hijacking-qa-direct-universal.apk`
- Download copy: `C:/Users/PC/Downloads/salary-hijacking-qa-direct-universal.apk`
- Artifact mirror: `D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-direct-universal.apk`
- SHA-256: `ED2E7EC443E8B7FF7A891ABD52C517E71197E8D2CE515611B8C59DB628F0838A`
- applicationId: `com.salaryhijacking.mobile.qa.direct`
- ABI: `arm64-v8a`, `x86_64`
- Signing: Android debug certificate, APK Signature Scheme v2 verified
- Note: this distinct `.qa.direct` package avoids accidentally launching an older crashing `com.salaryhijacking.mobile` install and packages the Android direct-entry feature shell rather than the diagnostic safe-entry shell. Google Services is disabled only for this QA debug identity because adding a Firebase client for a new QA package is disallowed without explicit Firebase approval.

## Latest Current-Source Emulator APK

- Path: `artifacts/android/salary-hijacking-current-x86_64-debug.apk`
- Artifact mirror: `D:/salary-hijacking-artifacts/apk/salary-hijacking-current-x86_64-debug.apk`
- SHA-256: `451984884BE4A5F0707AB2C347D15EC4AD7C0951811C0B6365E6D1D998A93CA1`
- applicationId: `com.salaryhijacking.mobile`
- ABI: `x86_64`
- Signing: Android debug certificate, APK Signature Scheme v2 verified
- Build log: `artifacts/qa/android-emulator-x86-build-20260721-current.log`
- Install/lifecycle evidence: `artifacts/qa/emulator-safe-entry-20260721`

## Remaining Blocker

The exact user phone crash status cannot be marked PASS until the latest ARM64 APK is installed on the affected phone or another connected ARM64 Android device and logcat confirms zero fatal startup exceptions. The x86_64 emulator proof narrows the startup crash risk in current source, but it does not substitute for Samsung/ARM64 physical QA.

# 2026-07-22 Safe-Entry Direct QA APK Addendum

## Additional Root Cause Confirmed

- Symptom: the user continued to see Android's app-crash dialog after installing the latest phone APK.
- Evidence path:
  - `apps/mobile/src/shared/api/__tests__/android-safe-entry.contract.test.ts`
  - `apps/mobile/src/shared/api/__tests__/app-screen-contract.test.ts`
  - `apps/mobile/src/features/payroll-reminders/__tests__/interactive-state.test.ts`
- Confirmed code issues:
  - `apps/mobile/index.android.js` had regressed to `android-direct-entry`, while the Android startup contract requires `android-safe-entry` for crash-contained boot.
  - `hydratePayrollReminderStateFromStorage()` could reject during startup when SecureStore read/delete failed, which is unsafe during app boot.
- Source fixes:
  - `apps/mobile/index.android.js` now imports `./src/android-safe-entry`.
  - `apps/mobile/src/features/payroll-reminders/interactive-state.ts` now preserves seeded state when startup storage hydration fails and does not crash the process on cleanup failure.

## Latest Verified APK Candidate

- APK: `artifacts/android/salary-hijacking-qa-safe-universal.apk`
- Mobile copy: `C:/Users/PC/Downloads/salary-hijacking-qa-safe-universal.apk`
- D: mirror: `D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-safe-universal.apk`
- SHA-256: `A4AA35DAC76571662D691F9DAB8A7A379C6B94AE28308FDCB5E1CC8496A52064`
- applicationId: `com.salaryhijacking.mobile.qa.direct`
- ABI: `arm64-v8a`, `x86_64`
- Signing: Android debug certificate, APK Signature Scheme v2/v3 verified
- Bundle proof: APK `assets/index.android.bundle` SHA-256 matches generated safe-entry Hermes bundle `A6D8DC9D563B9FE1E390787C9078F2931EBB532640B2CEE35A1223627474D611`.
- Emulator QA: clean install PASS, upgrade install PASS, cold start 10/10 PASS, background/resume 10/10 PASS, target package fatal markers 0.
- Evidence:
  - `artifacts/qa/apk-safe-aapt-badging-20260722.log`
  - `artifacts/qa/apk-safe-apksigner-verify-20260722.log`
  - `artifacts/qa/safe-apk-install-output-20260722.log`
  - `artifacts/qa/safe-apk-startup-timings-10x-20260722.csv`
  - `artifacts/qa/safe-apk-background-resume-10x-20260722.csv`
  - `artifacts/qa/safe-apk-logcat-10x-cold-resume-20260722.txt`
  - `artifacts/qa/safe-apk-logcat-10x-target-fatal-filter-20260722.txt`

## Build Caveat

The full Gradle universal safe-entry rebuild was started but timed out in CMake/NDK native compilation. To unblock phone QA, the latest validated universal native QA APK shell was patched with the freshly generated safe-entry Hermes bundle, zipaligned, signed with the existing debug keystore, and verified by emulator install/startup/lifecycle. This is a release-like QA APK candidate, not a production AAB.

## Remaining Blocker

Physical Samsung/ARM64 phone QA remains `BLOCKED_NO_CONNECTED_PHYSICAL_ANDROID_PHONE`. The new APK must still be installed on the affected phone and verified with redacted logcat before this gate can be marked PASS.

# 2026-07-25 Safe Splash-Hide Universal Addendum

## Additional Startup Hardening

- `apps/mobile/src/android-safe-entry.tsx` now uses the same defensive native splash handling as the direct-entry diagnostic shell:
  - `SplashScreen.preventAutoHideAsync()` is called with a non-fatal catch.
  - `SplashScreen.hideAsync()` runs after the first root layout.
  - A 2.5s timeout fallback also hides the splash if layout timing is delayed.
- Regression tests:
  - `artifacts/qa/android-safe-entry-splash-hide-contract-20260725.log`
  - `artifacts/qa/mobile-typecheck-20260725-safe-splash-hide.log`

## Latest QA Rescue APK Candidate

- APK: `artifacts/android/salary-hijacking-qa-safe-current-splash-hide-universal.apk`
- Mobile copy: `C:/Users/PC/Downloads/salary-hijacking-qa-safe-current-splash-hide-universal.apk`
- Stable QA filename: `artifacts/android/salary-hijacking-qa-universal.apk`
- D: mirror: `D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-universal.apk`
- SHA-256: `EFBE90AE9E0E864C658D630FA0163238A1824848D2C93C1C64789E79856D9CDD`
- applicationId: `com.salaryhijacking.mobile`
- versionName/versionCode: `1.0.0` / `202607223`
- ABI: `arm64-v8a`, `x86_64`
- Signing: Android debug certificate, APK Signature Scheme v2/v3 verified.
- Metadata proof: `artifacts/qa/apk-safe-current-splash-hide-universal-aapt-badging-20260725.log`
- Signing proof: `artifacts/qa/apk-safe-current-splash-hide-universal-apksigner-verify-20260725.log`
- Build info: `artifacts/android/build-info-safe-current-splash-hide-universal.json`

## Runtime Proof

- Emulator lifecycle proof: `artifacts/qa/safe-current-splash-hide-universal-lifecycle-20260725/summary.json`
- Clean install: PASS
- Cold start: PASS 10/10
- Background/resume: PASS 10/10
- Target fatal marker count: 0
- Same-version upgrade and launcher proof: `artifacts/qa/final-safe-splash-hide-universal-upgrade-same-version-20260725/summary.json`
- Same-version `install -r`: PASS
- Launcher monkey run: PASS
- Upgrade cold start: PASS 10/10
- Upgrade background/resume: PASS 10/10
- Upgrade fatal marker count: 0
- Static APK inspection: PASS (`artifacts/qa/apk-safe-current-splash-hide-universal-static-inspection-20260725.json`)

## Caveat

The exact user-reported Samsung crash root cause is still not closed because this workspace currently sees only `emulator-5554` and no physical ARM64 phone. The current emulator evidence proves the patched APK starts without package-scoped fatal markers on x86_64, and static inspection proves the universal APK contains ARM64 libraries, but physical Samsung install/logcat remains required before marking the phone crash gate PASS.

# 2026-07-25 Current-HEAD QA APK Repack Addendum

## Current Latest QA APK

- Git commit: `9cba4f83d609a67c282393a3ecd3ed11e779c818`
- APK: `artifacts/android/salary-hijacking-qa-universal.apk`
- Mobile copy: `C:/Users/PC/Downloads/salary-hijacking-qa-universal.apk`
- Safe-current alias: `C:/Users/PC/Downloads/salary-hijacking-qa-safe-current-splash-hide-universal.apk`
- D: mirror: `D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-universal.apk`
- SHA-256: `DE4C6F4FC339680822FDEE54E4BF694BB6948C4D0F4AA63461D64931FAC4B482`
- applicationId: `com.salaryhijacking.mobile`
- versionName/versionCode: `1.0.0` / `202607223`
- ABI: `arm64-v8a`, `x86_64`
- Signing: Android debug certificate, APK Signature Scheme v2/v3 verified.

## Current-HEAD Evidence

- Bundle generation: `artifacts/qa/bundle-safe-entry-20260725-current-head-9cba4f8.log`
- Hermes generation: `artifacts/qa/hermes-safe-entry-20260725-current-head-9cba4f8.log`
- APK patch/re-sign: `artifacts/qa/patch-safe-entry-current-head-9cba4f8-universal-20260725.log`
- Metadata proof: `artifacts/qa/apk-current-head-9cba4f8-aapt-badging-20260725.log`
- Signing proof: `artifacts/qa/apk-current-head-9cba4f8-apksigner-verify-20260725.log`
- Static APK inspection: PASS (`artifacts/qa/apk-current-head-9cba4f8-static-inspection-20260725.json`)
- Clean install lifecycle: PASS, cold start 10/10, background/resume 10/10, fatal marker count 0 (`artifacts/qa/current-head-9cba4f8-universal-lifecycle-20260725/summary.json`)
- Same-version upgrade lifecycle: PASS, `install -r`, launcher monkey, cold start 10/10, background/resume 10/10, fatal marker count 0 (`artifacts/qa/current-head-9cba4f8-universal-upgrade-20260725/summary.json`)

## Remaining Caveat

Physical Samsung/ARM64 install, cold-start, persistence, keyboard/safe-area, and redacted logcat evidence remain required before the user-reported phone crash gate can be marked PASS. No physical phone is currently visible to adb from this workspace.


