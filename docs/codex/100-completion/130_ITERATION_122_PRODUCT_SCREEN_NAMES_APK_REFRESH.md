# Iteration 122 - Product Screen Names APK Refresh

Date: 2026-07-15 KST

## Scope

Refreshed the phone-target Android debug APK after source commit
`a507293a2e4ff24a8d6e872972315b4b7db3eb45`, which renamed production Salary,
Plan, and Notifications feature components away from internal
`*ReferenceScreen` names.

This is a preview/debug QA artifact only. It is not a production AAB and it was
not submitted to Google Play.

## Artifact

- APK:
  `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration122-debug.apk`
- D-drive evidence:
  `D:/salary-hijacking-artifacts/20260715/iteration-122-current-head-apk/apk-summary.json`
- Download URL:
  `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration122/salary-hijacking-phone-arm64-iteration122-debug.apk`
- SHA256:
  `5547EB794469D08E089E1A9AA604069EACAAE89454A8895CB68110F35E2DF522`
- Size:
  `64,827,505` bytes

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile run build:e2e:android:local-debug:preflight`:
  PASS.
- Android Gradle local debug build produced
  `apps/mobile/build/phone/android/salary-hijacking-phone-arm64-debug.apk`.
- APK ABI inspection: only `arm64-v8a`.
- Core native library inspection: Expo Modules Core, Hermes, React Native, and
  Reanimated native libraries are present under `lib/arm64-v8a/`.
- GitHub raw APK URL HEAD request: HTTP 200,
  `Content-Length=64827505`, `Content-Type=application/octet-stream`.
- `release/mobile-preview-evidence.json` now points current-source APK evidence
  at source HEAD `a507293a2e4ff24a8d6e872972315b4b7db3eb45`.

## Remaining

Physical Android phone install, cold-start, persistence, keyboard, safe-area,
and logcat QA remain blocked until a physical phone is attached or equivalent
device-farm evidence is provided. This APK is a QA debug artifact only.
