# Iteration 147 - Physical Phone QA Runner

Date: 2026-07-17 KST

## Scope

Reduced the remaining physical Android phone QA blocker by adding a single command runner around the existing no-secret physical phone proof collector.

## Files

- `scripts/release/run-physical-phone-qa.mjs`
- `scripts/release/run-physical-phone-qa.test.mjs`
- `scripts/release/generate-physical-phone-qa-handoff.mjs`
- `scripts/release/generate-physical-phone-qa-handoff.test.mjs`
- `docs/qa/100-completion/physical-phone-qa-handoff.md`
- `release/evidence/physical-phone/physical-phone-qa-summary.json`
- `release/evidence/external-blockers.json`
- `package.json`

## Behavior

- New command: `node scripts/release/run-physical-phone-qa.mjs --runs 20`
- The runner reads the current preview APK evidence, chooses the latest phone-target APK, finds ADB from the local SDK or known artifact SDK path, writes the existing no-secret proof file, and only runs strict release readiness after physical phone proof passes.
- The runner preserves the privacy boundary: no raw logcat, serial numbers, tokens, signing keys, keystore material, or credentials are stored.

## Verification

- RED: `node --test scripts/release/run-physical-phone-qa.test.mjs` failed before implementation because `run-physical-phone-qa.mjs` did not exist.
- RED: `node --test scripts/release/generate-physical-phone-qa-handoff.test.mjs` failed before the handoff included the new one-command runner.
- GREEN: `node --test scripts/release/run-physical-phone-qa.test.mjs scripts/release/generate-physical-phone-qa-handoff.test.mjs` passed, 6 tests.
- `corepack pnpm run check:package-manager-scripts` passed.
- Local no-device smoke: `node scripts/release/run-physical-phone-qa.mjs --runs 1` exited 1 with blocker `No physical Android phone is attached; emulator evidence does not replace phone QA.`

## Remaining

Physical Android phone QA remains BLOCKED until a real phone is connected and the same runner produces `physicalPhoneVerified=true`.
