# Iteration 071 - Physical Phone Proof CLI and ADB Discovery

Date: 2026-07-14 KST

## Scope

Physical Android phone QA remains blocked until a real phone is attached, but the collector should be ready to run as soon as the phone is available. The previous collector relied on default evidence paths and did not expose manual CLI options for APK, ADB, run count, output path, or package name. It also did not search the common Windows Android SDK path under `LOCALAPPDATA`.

## Changes

- Added Windows `LOCALAPPDATA/Android/Sdk/platform-tools` ADB discovery.
- Added CLI parsing for:
  - `--apk`
  - `--adb`
  - `--runs`
  - `--output`
  - `--package`
- Kept no-secret output behavior unchanged.

## Verification

- RED: targeted phone proof collector test failed because `parseMobilePreviewPhoneProofArgs` was not exported.
- GREEN: `node --test --test-name-pattern "resolves adb from|parses physical phone proof CLI" scripts\release\collect-mobile-preview-phone-proof.test.mjs`: PASS.
- `node --test scripts\release\collect-mobile-preview-phone-proof.test.mjs scripts\release\check-release-readiness.test.mjs`: PASS, 90 tests.
- `corepack pnpm run clean:junk`: PASS; `$env:TEMP` Salary Hijacking fixture count after cleanup: 0.

## Remaining Launch Blockers

This iteration makes physical phone QA easier to execute when a device is attached. It does not itself attach a phone or produce the required physical install, cold-start, persistence, keyboard, safe-area, and no-secret logcat proof.
