# Iteration 139 Physical Phone QA Handoff Refresh

Date: 2026-07-15 KST

## Scope

- `scripts/release/generate-device-test-matrix.mjs`
- `scripts/release/generate-device-test-matrix.test.mjs`
- `docs/codex/100-completion/07_DEVICE_TEST_MATRIX.md`
- `docs/qa/100-completion/physical-phone-qa-handoff.md`

## Result

- Refreshed the physical Android phone QA handoff so the required phone command now uses the current iteration 138 ARM64 APK.
- Refreshed the device test matrix so the latest-source phone APK row points at the current iteration 138 artifact and SHA256.
- Fixed the device matrix generator so its default `Updated` date is derived from the current Asia/Seoul day instead of a stale hardcoded date.

## Current Phone QA Target

- Downloads APK: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration138-debug.apk`
- Artifact APK: `D:/salary-hijacking-artifacts/20260715/iteration-138-root-capture-web-guard-apk/salary-hijacking-phone-arm64-iteration138-debug.apk`
- SHA256: `79E68CC7B6C0532B9672CCE4F2654BB9ADEF2814AC3A68B4652160DE9E33E879`
- Android package: `com.salaryhijacking.mobile`
- ABI: `arm64-v8a`

## Verification

- RED: `node --test --test-name-pattern "defaults the updated date" scripts\release\generate-device-test-matrix.test.mjs` failed because the generated matrix still said `Updated: 2026-07-14 KST`.
- GREEN: `node --test --test-name-pattern "defaults the updated date" scripts\release\generate-device-test-matrix.test.mjs` PASS.
- Regression: `node --test scripts\release\generate-device-test-matrix.test.mjs scripts\release\generate-physical-phone-qa-handoff.test.mjs scripts\release\check-release-readiness.test.mjs` PASS, 91 tests.
- `adb devices` returned no attached physical device, so real phone install/cold-start/logcat/persistence/keyboard/safe-area QA remains blocked.

## Remaining Blocker

Physical Android phone QA still requires an attached ARM64 phone and this command:

```powershell
node scripts\release\collect-mobile-preview-phone-proof.mjs --apk "C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration138-debug.apk" --runs 20 --output release/mobile-preview-phone-proof.local.json --package com.salaryhijacking.mobile
```

No production AAB, Play submission, new EAS project, new keystore, secret rotation, destructive DB change, force push, or rebase was performed.
