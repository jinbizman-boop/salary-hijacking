# Iteration 099 - Preview APK HEAD Gate

Date: 2026-07-14 KST

## Scope

- Strengthened release readiness so preview APK evidence cannot pass merely because the working tree is clean.
- The preview APK evidence must now match the current Git HEAD when `latestSourcePackagedHead` is present.

## RED

- Added `blocks latest-source preview APK evidence when packaged HEAD is stale`.
- Before the fix, release readiness returned OK even when:
  - preview evidence said the APK was packaged from `111111111111...`
  - current local HEAD was `222222222222...`

## GREEN

- `checkMobilePreviewEvidence` now receives the current Git HEAD.
- `mobile:preview:latest-source-apk` is BLOCKED when `latestSourcePackagedHead` differs from local HEAD.

## Verification

- Targeted RED/GREEN test:
  - `node --test --test-name-pattern "blocks latest-source preview APK evidence when packaged HEAD is stale" scripts\release\check-release-readiness.test.mjs`
  - Result: PASS after implementation.
- Full release readiness test suite:
  - `node --test scripts\release\check-release-readiness.test.mjs`
  - Result: PASS, 85 tests.
- Strict readiness current-state proof:
  - `node scripts\release\check-release-readiness.mjs --strict`
  - Result: BLOCKED as expected because existing APK evidence was packaged from `cabb4e8c7fed...` while local HEAD is `11abca29bf64...`.

## Remaining Blocker

- A fresh Android preview/debug APK must be built from the current HEAD before APK evidence can be considered current.
- Physical Android phone install/cold-start/persistence/keyboard/safe-area/logcat QA remains required for final launch readiness.
