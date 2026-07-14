# Iteration 073 - Physical Phone Blocked Proof Requirements

Date: 2026-07-14 KST

## Scope

- `scripts/release/collect-mobile-preview-phone-proof.mjs`
- `scripts/release/collect-mobile-preview-phone-proof.test.mjs`
- `docs/codex/08_FILE_COMPLETION_LOG.md`

## Completed

- Added explicit 20-run reliability requirements to blocked physical-phone proof output.
- Blocked proof now records:
  - `requiredColdStartRuns: 20`
  - `requiredBackgroundForegroundRuns: 20`
  - `backgroundForegroundRuns: 0`
- `nextEvidenceRequired` now states that the physical phone collector must be rerun against the latest ARM64 APK with at least 20 cold-start runs and 20 background/foreground runs.
- This keeps the physical-phone QA gate honest while reducing repeated ambiguity when no phone or ADB is available.

## Verification

- RED before fix: `node --test --test-name-pattern "adb is unavailable" scripts\release\collect-mobile-preview-phone-proof.test.mjs` failed because blocked proof did not include the 20-run requirements.
- GREEN after fix: same targeted test passed.
- `node --test scripts\release\collect-mobile-preview-phone-proof.test.mjs scripts\release\check-release-readiness.test.mjs`: PASS, 92 tests.
- `corepack pnpm exec prettier --write scripts/release/collect-mobile-preview-phone-proof.mjs scripts/release/collect-mobile-preview-phone-proof.test.mjs`: PASS.

## Remaining

- ADB / physical Android phone is not available in this Codex Windows shell, so real phone installation, 20 cold starts, 20 background/foreground cycles, persistence, keyboard/safe-area, and no-secret logcat proof remain unverified.
- Strict readiness remains blocked until physical phone proof, unresolved GAP rows, and clean release source are resolved.
