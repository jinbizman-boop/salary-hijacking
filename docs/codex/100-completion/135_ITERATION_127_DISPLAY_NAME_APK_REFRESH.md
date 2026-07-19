# Iteration 127 - Display Name Boundary APK Refresh

Date: 2026-07-15 KST

## Scope

Rebuilt the phone-target Android debug APK after source commit `89f6964fb576cfe8453840c4c859ce1bfbe26dbb`.

## Artifact

- APK: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration127-debug.apk`
- Artifact copy: `D:/salary-hijacking-artifacts/20260715/iteration-127-current-head-apk/salary-hijacking-phone-arm64-iteration127-debug.apk`
- Download URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration127/salary-hijacking-phone-arm64-iteration127-debug.apk`
- SHA256: `0BDC59CABCAE91D8E618ED4EB5DCCE2014B135196425DF18FDEDBDB0C092B87A`
- Size: `64827725` bytes

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile run build:e2e:android:local-debug:preflight`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile run build:phone:android:local-debug`: PASS, exit code 0.
- APK header: PASS, `50 4B 03 04`.
- APK ABI inspection: PASS, `arm64-v8a` only.
- `aapt dump badging`: PASS for package `com.salaryhijacking.mobile`, label `급여납치`, min SDK 24, target SDK 35, native-code `arm64-v8a`.
- `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2.
- GitHub raw APK download verification: PASS, HTTP 200, downloaded SHA256 matched local APK.

## Remaining

- Physical Android phone install, cold start, persistence, keyboard, safe-area, and logcat proof remain pending because no physical phone is attached.
- This remains a QA debug APK. It is not a production AAB and was not submitted to Google Play.
- Gradle emitted transient transform workspace move failures during intermediate attempts, but the guarded build wrapper recovered and produced a verified APK.
