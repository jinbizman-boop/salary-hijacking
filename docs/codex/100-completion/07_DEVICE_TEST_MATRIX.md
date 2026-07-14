# Device Test Matrix

Updated: 2026-07-14 KST

## Jest React Native and release tooling runtime

- Status: PASS
- Evidence: `corepack pnpm run test:root-scripts`: PASS, 318 tests; targeted device-matrix generator test is also PASS.
- Notes: Covers release tooling regressions and mobile launch-readiness source contracts. It is not a physical phone substitute.

## Expo web export / responsive screenshots

- Status: PASS
- Evidence: `release/evidence/mobile-ui/capture-summary.json`; `release/evidence/mobile-ui/*.png`; `release/screenshots/*.png`
- Notes: Existing responsive capture evidence covers the web-rendered mobile UI and Google Play screenshot exports.

## Local Android/JDK/adb toolchain

- Status: PASS
- Evidence: Local adb/toolchain availability is recorded in `release/mobile-native-evidence.json`.
- Notes: Android emulator tooling is available locally.

## Latest-source ARM64 phone debug APK

- Status: PASS
- Evidence: Artifact: `D:/salary-hijacking-artifacts/20260714/iteration-110-preview-persistence-storage-cleanup/salary-hijacking-phone-arm64-iteration110-debug.apk`; Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration110-debug.apk`; SHA256 `C5659256EB93A747F5D8632FE093725BB69882531775227D69D556A83B93CCE3`; ABI arm64-v8a
- Notes: APK build, signing, download verification, ABI filter, and Expo native library proof are recorded without copying temporary artifact URLs.

## Android emulator cold start / route smoke

- Status: PASS
- Evidence: Install evidence: `docs/qa/100-completion/iteration-004-20260713/x86-clean-build/full-emulator-qa-abi-filter/full-emulator-qa-x86_64-abi-filter-summary.json`; 5 cold starts; 0 fatal markers
- Notes: Emulator install, route smoke, notification no-tab, and background/foreground proof are recorded separately from physical phone QA.

## Android physical device cold start / logcat

- Status: BLOCKED
- Evidence: `release/mobile-preview-evidence.json`; handoff: `docs/qa/100-completion/physical-phone-qa-handoff.md`
- Notes: No physical Android phone is attached to this Codex Windows environment at observation time.

## Android physical keyboard/safe-area matrix

- Status: BLOCKED
- Evidence: `release/mobile-preview-evidence.json`; handoff: `docs/qa/100-completion/physical-phone-qa-handoff.md`
- Notes: Emulator keyboard path and source contracts are covered, but all-screen/all-field physical safe-area and keyboard proof still requires a phone or device-farm run.
