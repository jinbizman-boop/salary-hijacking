# Iteration 135 - Plan/Notification Cleanup APK Refresh

Date: 2026-07-15 KST

## Scope

Rebuilt and republished the arm64-v8a phone-target Android debug APK after Iteration 134 removed prototype financial/reward defaults from the Plan and Notification production runtime screens.

## Source

- Source branch: `codex/payroll-reminder-launch-ready-100-20260714`
- Source HEAD: `3b4ef0c4c7aae3d66696ae47a60b3ecf7064137d`
- Source commit: `fix(mobile): remove plan notification sample financial defaults`

## APK

- Downloads path: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration135-debug.apk`
- Artifact path: `D:/salary-hijacking-artifacts/20260715/iteration-135-current-head-apk/salary-hijacking-phone-arm64-iteration135-debug.apk`
- Download URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration135/salary-hijacking-phone-arm64-iteration135-debug.apk`
- SHA256: `5051C85AE5C2071D2D312A9495B876CA1E7F67E7335D99059F3F3F305438310B`
- Size: `64828421` bytes

## Verification

- Local phone-target debug build wrapper exited 0 and produced a fresh final APK.
- Build note: Gradle output included intermediate cache move failures before the final successful build, so the final APK was independently verified rather than trusting the mixed build log alone.
- APK header: PASS, `50 4B 03 04`.
- `aapt dump badging`: PASS for package `com.salaryhijacking.mobile`, label `급여납치`, min SDK 24, target SDK 35, native-code `arm64-v8a`.
- `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2 and one Android Debug signer.
- GitHub raw APK download: HTTP 200.
- Downloaded APK SHA256 matched local APK.
- `adb devices`: no attached physical Android phone.

## Remaining

- Physical Android phone install, cold start, navigation, persistence, keyboard, safe-area, and logcat QA remain blocked until a device is attached.
- This is a QA debug APK, not a production AAB or Google Play submission.
- `apps/mobile/src/shared/styles/clean-fintech-screens.tsx` still contains prototype/reference sample values and needs a separate dead-code removal or quarantine decision.
