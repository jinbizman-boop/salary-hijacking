# Iteration 120 - Current HEAD Phone APK Refresh

Date: 2026-07-15 KST

## Scope

Refreshed the Android arm64-v8a phone-target debug APK after the production
route screen entrypoint cleanup commit.

This is still a pre-release/debug APK for QA. It is not a production AAB and it
was not submitted to Google Play.

## APK

- Source HEAD: `01f43d59daaa299b8a002d326e2243794ff73809`
- Local artifact:
  `D:/salary-hijacking-artifacts/20260715/iteration-119-current-head-apk/salary-hijacking-phone-arm64-iteration119-debug.apk`
- Downloads copy:
  `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration119-debug.apk`
- SHA256:
  `0E7EF02948845AE12AC0F2A7AD080A01344C56A176CC920A1DAF282462EB9109`
- Download URL:
  `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration119/salary-hijacking-phone-arm64-iteration119-debug.apk`

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile run build:e2e:android:local-debug:preflight`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile run build:phone:android:local-debug`: Gradle `assembleDebug` and `assembleDebugAndroidTest` completed successfully; the Codex tool wrapper timed out before the long-running process finished, then the background process completed and produced both APKs.
- APK SHA256 calculated from the copied artifact: PASS.
- ABI inspection: APK contains only `arm64-v8a`.
- Core native library inspection: `libexpo-modules-core.so`, `libhermes.so`, `libreactnative.so`, and `libreanimated.so` are present under `lib/arm64-v8a/`.
- Raw GitHub URL HEAD request: HTTP 200, `Content-Length=64827757`.

## Remaining

- Physical Android phone install, cold start, keyboard/safe-area, persistence,
  and no-secret logcat proof remain pending because no physical phone is
  attached to this Codex Windows environment.
- Production AAB and Google Play submission remain explicitly unapproved.
