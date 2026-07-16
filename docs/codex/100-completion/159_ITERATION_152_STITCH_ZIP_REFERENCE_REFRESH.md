# Iteration 152 - Stitch ZIP Reference Refresh

Date: 2026-07-17 KST

## Scope

- Ingested all 10 user-supplied `stitch_salary_hijacking_design_system*.zip` archives from `C:/Users/PC/Downloads`.
- Added `scripts/release/prepare-stitch-design-system.mjs` to inventory the ZIPs and refresh the canonical 17 Stitch reference screens and HTML files without copying Stitch HTML into React Native.
- Added `scripts/release/prepare-stitch-design-system.test.mjs` and wired it into `test:root-scripts`.
- Regenerated visual evidence and Android QA APK evidence.

## Files

- `scripts/release/prepare-stitch-design-system.mjs`
- `scripts/release/prepare-stitch-design-system.test.mjs`
- `docs/design/stitch/2026-07-16/STITCH_SCREEN_INVENTORY.md`
- `docs/design/stitch/2026-07-16/stitch-screen-inventory.json`
- `docs/design/stitch/2026-07-16/source-zips/source-zips-manifest.json`
- `docs/design/stitch/2026-07-16/screens/*.png`
- `docs/design/stitch/2026-07-16/html/*.html`
- `release/evidence/mobile-ui/capture-summary.json`
- `release/evidence/mobile-ui/stitch-comparison.md`
- `release/evidence/build-artifacts.json`
- `release/evidence/checksums.txt`
- `release/evidence/final-qa-command-logs/apk-arm64-aapt-badging.log`
- `release/evidence/final-qa-command-logs/apk-arm64-apksigner-verify.log`

## Verification

- RED: `node --test scripts/release/prepare-stitch-design-system.test.mjs` failed before the preparation script existed.
- GREEN: `node --test scripts/release/prepare-stitch-design-system.test.mjs scripts/release/capture-mobile-clean-fintech-screenshots.test.mjs` PASS.
- `corepack pnpm --filter @salary-hijacking/mobile run lint` PASS.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck` PASS.
- `corepack pnpm --filter @salary-hijacking/mobile test` PASS, 66 suites / 769 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run format:check` PASS.
- `corepack pnpm run format:check` PASS.
- `corepack pnpm --filter @salary-hijacking/mobile run export:web` PASS.
- `node scripts/release/capture-mobile-clean-fintech-screenshots.mjs` PASS, 17 mobile UI screenshots and 105 responsive checks.
- `corepack pnpm --filter @salary-hijacking/mobile run build:phone:android:local-debug` completed and rebuilt the debug QA APK.
- `aapt dump badging` PASS for `com.salaryhijacking.mobile`, versionName `1.0.0`, targetSdk `35`.
- `apksigner verify --verbose --print-certs` PASS with APK Signature Scheme v2.

## APK

- Local APK: `apps/mobile/build/phone/android/salary-hijacking-phone-arm64-debug.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-debug.apk`
- Artifact copy: `D:/salary-hijacking-artifacts/apk/salary-hijacking-phone-arm64-debug.apk`
- SHA256: `854A17683326408384ED9E95EF45FCFD217891C361E51AFBA1C00BE96447BE22`

## Notes

- Source ZIP files are not committed. Their local paths and checksums are recorded in `docs/design/stitch/2026-07-16/source-zips/source-zips-manifest.json`.
- Runtime React Native code was not replaced with Stitch HTML. Existing server-authority/API/privacy/ad-separation behavior remains covered by mobile tests.
- Physical Android phone QA remains BLOCKED until a real device is attached via ADB. Production AAB and Play submission were not performed.
