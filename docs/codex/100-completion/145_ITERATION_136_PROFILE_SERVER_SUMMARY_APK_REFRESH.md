# Iteration 136 - Profile Server Summary APK Refresh

## Scope

- Refreshed the Android arm64-v8a preview/debug APK after the source commit `d5e541096ea839d596cac04adc1b4363279193d6`.
- This APK includes the MY/Profile tab server-summary wiring and removal of prototype profile sample copy from the tab route.
- Production AAB, Play submission, new EAS project, new keystore, secret rotation, and destructive database changes were not performed.

## Artifact

- APK file: `salary-hijacking-phone-arm64-iteration136-debug.apk`
- Local artifact: `D:/salary-hijacking-artifacts/20260715/iteration-136-profile-server-summary-apk/salary-hijacking-phone-arm64-iteration136-debug.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration136-debug.apk`
- Temporary raw URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration136/salary-hijacking-phone-arm64-iteration136-debug.apk`
- SHA256: `53568DEC9759CCD45236ECDD5D6D0C3D13D2420F2E56D326F73B01BBD6709F51`
- Package: `com.salaryhijacking.mobile`
- Label: `급여납치`
- ABI: `arm64-v8a`
- Target SDK: `35`

## Verification

- Local APK SHA256 generated with `certutil -hashfile`: PASS.
- APK header bytes `50 4B 03 04`: PASS.
- `aapt dump badging`: PASS for package `com.salaryhijacking.mobile`, label `급여납치`, min SDK `24`, target SDK `35`, and native code `arm64-v8a`.
- `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2.
- Raw GitHub download SHA matched the local APK SHA: PASS.
- `adb devices`: no attached Android device, so physical-phone install/cold-start/logcat/persistence QA remains BLOCKED.

## Evidence Updated

- `release/mobile-preview-evidence.json`
- `D:/salary-hijacking-artifacts/20260715/iteration-136-profile-server-summary-apk/apk-summary.json`
- Artifact branch: `codex-apk-artifacts-20260715-iteration136`

## Remaining Blockers

- Physical Android phone QA is still blocked because no phone is attached in this Codex Windows environment.
- Strict launch readiness remains blocked by unresolved P0/P1/P2 gap register rows and external gates.
- This preview/debug APK is for final QA iteration only; it is not a production AAB or Play submission artifact.
