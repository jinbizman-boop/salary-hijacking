# Device Test Matrix

Updated: 2026-09-09 KST

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
- Notes: Emulator availability is not proven by current evidence.

## Latest-source ARM64 phone debug APK

- Status: PASS
- Evidence: Artifact: `LOCAL_ARM64_APK_PATH_REDACTED_SHA256_VERIFIED`; SHA256 `E36B412A768220E6C5AB77152638DF3A691AD83126D12470549981DE2F26670D`; ABI arm64-v8a
- Notes: APK build, signing, download verification, ABI filter, and Expo native library proof are recorded without copying temporary artifact URLs.

## Android emulator cold start / route smoke

- Status: BLOCKED
- Evidence: Install evidence: `NOT_REQUIRED_ANDROID_ONLY_GALAXY_FINAL_AUTHORITY`; 0 cold starts; 0 fatal markers
- Notes: Emulator install, route smoke, notification no-tab, and background/foreground proof are recorded separately from physical phone QA.

## Android physical device cold start / logcat

- Status: BLOCKED
- Evidence: `release/mobile-preview-evidence.json`; handoff: `docs/qa/100-completion/physical-phone-qa-handoff.md`
- Notes: PENDING_USER_RETURN

## Android physical keyboard/safe-area matrix

- Status: BLOCKED
- Evidence: `release/mobile-preview-evidence.json`; handoff: `docs/qa/100-completion/physical-phone-qa-handoff.md`
- Notes: Emulator keyboard path and source contracts are covered, but all-screen/all-field physical safe-area and keyboard proof still requires a phone or device-farm run.
