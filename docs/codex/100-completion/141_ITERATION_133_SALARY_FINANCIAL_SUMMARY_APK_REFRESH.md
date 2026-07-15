# Iteration 133 - Salary Financial Summary APK Refresh

Date: 2026-07-15 KST

## Scope

Rebuilt and republished the arm64-v8a phone-target Android debug APK after Iteration 132 moved Salary Home hero financial amounts behind the shared payroll-reminder financial summary boundary.

## Source

- Source branch: `codex/payroll-reminder-launch-ready-100-20260714`
- Source HEAD: `ce42621f976a341eeba72a866abab70c5d03a421`
- Source commit: `fix(mobile): move salary hero amounts behind financial state`

## APK

- Downloads path: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration133-debug.apk`
- Artifact path: `D:/salary-hijacking-artifacts/20260715/iteration-133-current-head-apk/salary-hijacking-phone-arm64-iteration133-debug.apk`
- Download URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration133/salary-hijacking-phone-arm64-iteration133-debug.apk`
- SHA256: `50CC6C77B7B7F60B037A9F90073563258B71B8AAFC838644DBBAD240833007BD`
- Size: `64828405` bytes

## Verification

- Local phone-target debug build wrapper exited 0 and produced a fresh final APK.
- Build note: Gradle output included intermediate cache move failures before the final successful build, so the final APK was independently verified rather than trusting the mixed build log alone.
- `aapt dump badging`: PASS for package `com.salaryhijacking.mobile`, label `급여납치`, min SDK 24, target SDK 35, native-code `arm64-v8a`.
- `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2 and one Android Debug signer.
- GitHub raw APK download: HTTP 200.
- Downloaded APK SHA256 matched local APK.
- `adb devices`: no attached physical Android phone.

## Remaining

- Physical Android phone install, cold start, navigation, persistence, keyboard, safe-area, and logcat QA remain blocked until a device is attached.
- This is a QA debug APK, not a production AAB or Google Play submission.
- GATE-052 is still not closed because prototype/reference and notification sample amount surfaces require separate cleanup or contract decisions.
