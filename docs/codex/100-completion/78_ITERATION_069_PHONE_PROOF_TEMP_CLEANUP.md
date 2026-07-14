# Iteration 069 - Physical Phone Proof Test Temp Cleanup

Date: 2026-07-14 KST

## Scope

The physical Android phone preview QA collector is still blocked until a real phone is attached, but its local test harness must not leave fixture workspaces behind while the project keeps iterating toward launch readiness.

## Root Cause

`scripts/release/collect-mobile-preview-phone-proof.test.mjs` created fixture workspaces with the `salary-mobile-phone-proof-*` prefix but did not clean them after tests. `clean:junk` could remove these folders, but the test should also clean its own fixtures immediately.

## Changes

- Added fixture workspace tracking to the physical phone proof test.
- Added `afterEach` cleanup for generated phone-proof workspaces.
- Added regression coverage proving generated physical phone proof fixture workspaces are removed.

## Verification

- RED: `node --test --test-name-pattern "cleans generated physical phone proof fixture workspaces" scripts\release\collect-mobile-preview-phone-proof.test.mjs` failed with `cleanupWorkspaces is not defined`.
- GREEN: same targeted test passed after adding fixture tracking and cleanup.
- `node --test scripts\release\collect-mobile-preview-phone-proof.test.mjs scripts\dev\clean-generated-junk.test.mjs`: PASS, 14 tests.
- `corepack pnpm run clean:junk`: PASS, removed the RED-run leftover `salary-mobile-phone-proof-*` fixture plus regenerated `v8-compile-cache`.

## Remaining Launch Blockers

This iteration prevents a test-generated junk recurrence. It does not attach a physical Android phone or satisfy the remaining install, cold-start, persistence, keyboard, safe-area, and no-secret logcat QA gate.
