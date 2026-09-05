# Iteration 118 - Current-Head APK Evidence Refresh

Date: 2026-07-15 KST

## Scope

Refreshed the mobile preview evidence so the launch-readiness checker no longer
points at the stale Iteration 115 APK. The current evidence now points at the
phone-target debug APK built from HEAD
`52acb8961bdeafac31b6004ae78c2982b00e116c`.

## APK

- Local artifact:
  `D:/salary-hijacking-artifacts/20260714/iteration-117-current-head-apk/salary-hijacking-phone-arm64-iteration117-debug.apk`
- Downloads copy:
  `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration117-debug.apk`
- Raw GitHub download:
  `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration117/salary-hijacking-phone-arm64-iteration117-debug.apk`
- SHA256:
  `4661878AE771A39D13879AD2E95749F17735BE74AE8916049438D69368345C36`
- Size: `64,827,573` bytes.
- Package: `com.salaryhijacking.mobile`.
- Label: `급여납치`.
- ABI: `arm64-v8a`.

## Verification

- Raw GitHub APK download: PASS, downloaded size `64,827,573` bytes and SHA256
  matched the local APK.
- `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2.
- `aapt dump badging`: PASS for package `com.salaryhijacking.mobile`, label
  `급여납치`, min SDK 24, target SDK 35, and native-code `arm64-v8a`.
- `release/mobile-preview-evidence.json`: refreshed to HEAD
  `52acb8961bdeafac31b6004ae78c2982b00e116c` and parsed as valid JSON.
- `corepack pnpm run check:release-readiness -- --strict`: current-source APK
  gates PASS:
  - `mobile:preview:apk`
  - `mobile:preview:latest-source-apk`
  - `mobile:preview:phone-target-apk`

## Remaining

This refresh proves that the current HEAD has a downloadable signed debug APK
for phone QA. It is not a production AAB and it is not a Play submission. Full
strict readiness is still blocked by unresolved launch gaps, `origin/main`
merge status, and physical Android phone QA/logcat proof.
