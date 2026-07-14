# Iteration 063 - Latest Source APK Evidence Refresh

Date: 2026-07-14 KST

## Scope

- Refresh Android preview/debug APK evidence after the plan item form accessibility-label fix.
- Keep the artifact limited to an arm64-v8a local debug APK for QA.
- Do not create a production AAB, submit to Google Play, create a new EAS project, create a new keystore, rotate secrets, run destructive database changes, force push, or rebase.

## Evidence

- Preflight initially failed because the current shell did not expose Java or Android SDK paths.
- Preflight passed after pointing `JAVA_HOME` and `ANDROID_SDK_ROOT` to the preserved local toolchain cache under `D:/salary-hijacking-toolchain-cache/salary-hijacking-platform-dottools`.
- Local Gradle build generated a fresh debug APK at `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
- The script timed out before copying to the requested final path, so the generated APK was verified and then copied to the artifact/download paths.

## Artifact

- Artifact: `D:/salary-hijacking-artifacts/20260714/iteration-063-latest-source-arm64/salary-hijacking-phone-arm64-iteration063-debug.apk`
- Download copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration063-debug.apk`
- Summary: `D:/salary-hijacking-artifacts/20260714/iteration-063-latest-source-arm64/apk-summary.json`
- SHA256: `0BE3346318B256A7BC3F2308D5D91AF31310F340EA207D4C293558FABF7E22DA`
- ABI: `arm64-v8a`
- APK signature: PASS, APK Signature Scheme v2 verified
- Signer certificate SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`

## Source Snapshot

- HEAD: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`
- Branch: `codex/commercialization-100`
- Dirty mobile source path count: 119
- Dirty mobile source snapshot SHA256: `DBFB1E68960A47638BD455CDAD1883A63382CE6F7E5F01CEB4D144CA80AF39C2`

## Validation

- `node -e "JSON.parse(require('fs').readFileSync('release/mobile-preview-evidence.json','utf8')); console.log('mobile-preview-evidence json ok')"`: PASS
- `node scripts/release/check-release-readiness.mjs --strict`: BLOCKED overall, but:
  - `mobile:preview:apk`: PASS
  - `mobile:preview:latest-source-apk`: PASS
  - `mobile:preview:phone-target-apk`: PASS

## Remaining Blockers

- Physical Android phone install/cold-start/persistence/keyboard/safe-area/logcat QA is still pending.
- The working tree is still dirty, so strict release readiness remains blocked.
- GAP register still contains launch-blocking rows for release source, physical startup/UI QA, Salary Home, Plan, and external approval.
