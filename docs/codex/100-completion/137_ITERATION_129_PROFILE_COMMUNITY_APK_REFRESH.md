# Iteration 129 - Profile/Community Cleanup APK Refresh

Date: 2026-07-15 KST

## Scope

Rebuilt the arm64-v8a phone-target Android debug APK from current source HEAD
`c0f6f918aa8816b28abc7e0b4fa5ed56fd15503f` after the Profile and Community
runtime demo-name cleanup.

## Artifact

- APK: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration129-debug.apk`
- D-drive copy: `D:/salary-hijacking-artifacts/20260715/iteration-129-current-head-apk/salary-hijacking-phone-arm64-iteration129-debug.apk`
- Download URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration129/salary-hijacking-phone-arm64-iteration129-debug.apk`
- SHA256: `F71C2B6FB0F7CA984EB74D9DCFE15C72F48328CF1334638D6506110388FDF9CB`
- Summary: `D:/salary-hijacking-artifacts/20260715/iteration-129-current-head-apk/apk-summary.json`

## Verification

- Local build output exists for the current source rebuild.
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
