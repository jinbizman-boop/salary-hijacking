# Iteration 111 - Current-Head Phone APK Refresh

Date: 2026-07-14 KST

## Scope

Rebuilt and republished the Android phone-target debug APK after the current HEAD
`b2e165962af57a376d1add190ea230276b52d2b0` added the preview persistence rejection
guard and storage cache cleanup evidence.

## APK

- File:
  `D:/salary-hijacking-artifacts/20260714/iteration-110-preview-persistence-storage-cleanup/salary-hijacking-phone-arm64-iteration110-debug.apk`
- Downloads copy:
  `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration110-debug.apk`
- Raw GitHub download:
  `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260714-iteration110/salary-hijacking-phone-arm64-iteration110-debug.apk`
- SHA256:
  `C5659256EB93A747F5D8632FE093725BB69882531775227D69D556A83B93CCE3`
- Size: `64,826,333` bytes.
- Package: `com.salaryhijacking.mobile`.
- Label: `급여납치`.
- ABI: `arm64-v8a`.

## Verification

- `node apps/mobile/scripts/expo-local-android-debug-build.mjs --check --architecture arm64-v8a --output apps/mobile/build/phone/android/salary-hijacking-phone-arm64-debug.apk`:
  PASS.
- `corepack pnpm --filter @salary-hijacking/mobile run build:phone:android:local-debug`:
  PASS.
- `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2.
- `aapt dump badging`: PASS for package, app label, min SDK 24, target SDK 35, and
  `arm64-v8a`.
- APK ZIP/native library inspection: PASS for Expo/RN core arm64-v8a libraries.
- Raw GitHub URL download verification: PASS, HTTP 200, content length `64,826,333`,
  SHA256 matched.
- `release/mobile-preview-evidence.json`: updated for current HEAD and parsed as
  valid JSON.
- `node scripts/release/generate-device-test-matrix.mjs`: PASS.
- `node scripts/release/generate-physical-phone-qa-handoff.mjs`: PASS.

## Cleanup

- Removed the temporary downloaded APK used only for raw URL verification.
- Removed the temporary `publish-repo` used only to create the artifact branch.

## Remaining

This refresh proves a latest-source phone-target debug APK artifact exists and is
downloadable. It does not replace physical Android phone QA. Full launch readiness
still requires a real phone run proving install, cold start, navigation, persistence,
keyboard/safe-area, and no-fatal logcat markers.
