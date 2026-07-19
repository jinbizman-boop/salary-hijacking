# Iteration 148 - Physical Phone Package Verification Guard

Date: 2026-07-17 KST

## Scope

Strengthened the physical Android phone QA proof collector so a successful `adb install` is not enough by itself. The collector now verifies the installed package with `adb shell pm path com.salaryhijacking.mobile` and stores only a SHA256 hash of the package path.

## Files

- `scripts/release/collect-mobile-preview-phone-proof.mjs`
- `scripts/release/collect-mobile-preview-phone-proof.test.mjs`
- `docs/qa/100-completion/physical-phone-qa-handoff.md`
- `release/evidence/physical-phone/physical-phone-qa-summary.json`
- `release/evidence/external-blockers.json`

## Behavior

- `installedPackageVerified=true` is required before `physicalPhoneVerified=true`.
- `installedPackagePathHash` records proof that `pm path` returned a package entry.
- Raw package paths such as `/data/app/...` are not stored in tracked evidence.
- If package verification fails, the proof remains blocked with `Installed package verification failed after adb install.`

## Verification

- RED: `node --test scripts/release/collect-mobile-preview-phone-proof.test.mjs` failed because `installedPackageVerified` and package-path redaction did not exist.
- GREEN: `node --test scripts/release/collect-mobile-preview-phone-proof.test.mjs` passed, 9 tests.
- Regression: `node --test scripts/release/run-physical-phone-qa.test.mjs scripts/release/generate-physical-phone-qa-handoff.test.mjs scripts/release/collect-mobile-preview-phone-proof.test.mjs` passed, 15 tests.
- `corepack pnpm run format:check` passed.
- `corepack pnpm run check:package-manager-scripts` passed.
- Local no-device smoke: `node scripts/release/run-physical-phone-qa.mjs --runs 1` still exits 1 with the expected blocker that no physical Android phone is attached.

## Remaining

Strict release readiness remains BLOCKED until an attached physical Android phone produces `release/mobile-preview-phone-proof.local.json` with package verification, 20 cold starts, 20 background/foreground runs, persistence, keyboard/safe-area, and no-secret logcat proof.
