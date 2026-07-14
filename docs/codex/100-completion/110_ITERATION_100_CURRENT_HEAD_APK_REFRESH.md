# Iteration 100 - Current HEAD APK Refresh

Date: 2026-07-14 KST

## Scope

- Built a fresh Android arm64-v8a debug APK from current HEAD `aed3ba9a6fe7bf1dcbfc55dc85bece2efb11882b`.
- This is a preview/debug QA APK, not a production AAB, EAS submit, Google Play submission, new keystore, or new EAS project.

## Artifact

- APK: `D:/salary-hijacking-artifacts/20260714/iteration-100-current-head-arm64/salary-hijacking-phone-arm64-iteration100-debug.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration100-debug.apk`
- Mobile download URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260714-iteration100/salary-hijacking-phone-arm64-iteration100-debug.apk`
- SHA256: `4FAB0126C48258C92DF90DABD1CDBAB8D6C76664F667EB37071B461DF1F6A6BF`
- Size: `64825201` bytes

## Verification

- Preflight:
  - `corepack pnpm --filter @salary-hijacking/mobile run build:e2e:android:local-debug:preflight`
  - Result: PASS.
- Build:
  - `corepack pnpm --filter @salary-hijacking/mobile exec node scripts/expo-local-android-debug-build.mjs --architecture arm64-v8a --output build/phone/android/salary-hijacking-phone-arm64-iteration100-debug.apk`
  - Result: PASS.
- Signing:
  - `apksigner verify --verbose --print-certs`
  - Result: PASS, APK Signature Scheme v2 verified.
- Package metadata:
  - package: `com.salaryhijacking.mobile`
  - label: `급여납치`
  - versionName: `1.0.0`
  - versionCode: `1`
  - minSdk: `24`
  - targetSdk: `35`
  - native-code: `arm64-v8a`
- Native libraries include:
  - `lib/arm64-v8a/libexpo-modules-core.so`
  - `lib/arm64-v8a/libhermes.so`
  - `lib/arm64-v8a/libreactnative.so`
  - `lib/arm64-v8a/libreanimated.so`
- Raw URL HEAD check:
  - Result: HTTP `200`
  - Content-Length: `64825201`

## Remaining Blocker

- Physical Android phone install, cold-start, navigation, persistence, keyboard/safe-area, and no-secret logcat QA still remain BLOCKED because no phone is attached to this Codex Windows environment.
