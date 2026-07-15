# Iteration 131 - Profile Empty Stats APK Refresh

Date: 2026-07-15 KST

## Scope

Refreshed the arm64-v8a phone-target Android debug APK for current source HEAD
`b1adb4ffae364e97e85919b9d0410299e9d34ca7` after the Profile empty-stats
runtime boundary cleanup.

## Build Note

The local wrapper process timed out after Gradle produced
`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`. The remaining
build processes were stopped, and that Gradle APK output was recovered as the
current-source debug artifact after independent verification.

## Artifact

- APK: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration131-debug.apk`
- D-drive copy: `D:/salary-hijacking-artifacts/20260715/iteration-131-current-head-apk/salary-hijacking-phone-arm64-iteration131-debug.apk`
- Download URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration131/salary-hijacking-phone-arm64-iteration131-debug.apk`
- SHA256: `A85CE1A3018552944C389A4F2B5CE035FE00E377CAFF07AE47F88CCDDA10FE0E`
- Summary: `D:/salary-hijacking-artifacts/20260715/iteration-131-current-head-apk/apk-summary.json`

## Verification

- APK ZIP header: `50 4B 03 04`.
- APK ABI inspection: only `arm64-v8a`.
- `aapt dump badging`: package `com.salaryhijacking.mobile`, versionName `1.0.0`, min SDK `24`, target SDK `35`, native-code `arm64-v8a`, app label verified.
- `apksigner verify --verbose --print-certs`: PASS, APK Signature Scheme v2.
- GitHub raw APK download: HTTP `200`.
- Downloaded APK SHA256 matched the local APK.

## Remaining

Physical Android phone install, cold start, persistence, keyboard, safe-area,
and logcat QA are still not verified because no physical Android device is
attached to this Codex Windows environment. This is a QA debug APK, not a
production AAB or Google Play submission.
