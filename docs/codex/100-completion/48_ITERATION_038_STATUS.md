# Iteration 038 Status - Stale APK Cleanup Guard

Date: 2026-07-14 KST

## Scope

Hardened generated-artifact cleanup so old Android phone iteration APKs do not accumulate in the working repository after repeated preview QA builds.

## Requirement

- Remove regenerated junk promptly after each work unit.
- Do not delete protected dependencies, local secret files, tracked release evidence, or current QA APKs needed for install verification.
- Keep the cleanup behavior reproducible through automated tests.

## TDD Evidence

RED:

- `node --test scripts\dev\clean-generated-junk.test.mjs`
- Expected failure observed: `salary-hijacking-phone-arm64-iteration029-debug.apk` remained present because stale iteration APKs were not classified as generated junk.

GREEN:

- `scripts/dev/clean-generated-junk.mjs` now classifies only `apps/mobile/build/phone/android/salary-hijacking-phone-arm64-iteration###-debug.apk` files as removable generated junk.
- `scripts/dev/clean-generated-junk.test.mjs` verifies stale iteration APK removal while preserving `salary-hijacking-phone-arm64-debug.apk` and `salary-hijacking-e2e.apk`.

## Verification

- `node --test scripts\dev\clean-generated-junk.test.mjs`: PASS, 7 tests.
- `corepack pnpm run test:root-scripts`: PASS, 298 tests.
- `corepack pnpm run format:check`: PASS.
- `git diff --check`: PASS.
- `corepack pnpm run clean:junk`: PASS, removed 0 generated paths after the stale APKs had already been manually cleaned.

## Remaining Release Blockers

This iteration does not prove physical Android phone QA, clean release source, production AAB, Play submission, deployed DB smoke, or external production approvals.
