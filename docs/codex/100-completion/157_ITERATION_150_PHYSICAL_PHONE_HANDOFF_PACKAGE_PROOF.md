# Iteration 150 - Physical Phone Handoff Package Proof

Date: 2026-07-17 KST

## Scope

- Updated the generated physical Android phone QA handoff template so it matches the stricter installed-package proof gate.
- The handoff now explicitly requires `adb shell pm path com.salaryhijacking.mobile`, `installedPackageVerified=true`, `installedPackagePathHash`, and `packageInfoProbe.rawPackageInfoStored=false`.
- The generated instructions also state that raw `/data/app/...` package paths must not be stored in tracked proof files.

## Files

- `scripts/release/generate-physical-phone-qa-handoff.mjs`
- `scripts/release/generate-physical-phone-qa-handoff.test.mjs`
- `docs/codex/08_FILE_COMPLETION_LOG.md`

## Verification

- RED: `node --test scripts/release/generate-physical-phone-qa-handoff.test.mjs` failed because the generated handoff did not mention `adb shell pm path com.salaryhijacking.mobile`.
- GREEN: `node --test scripts/release/generate-physical-phone-qa-handoff.test.mjs` passed after the template update.
- Regression: `node --test scripts/release/generate-physical-phone-qa-handoff.test.mjs scripts/release/check-release-readiness.test.mjs scripts/release/collect-mobile-preview-phone-proof.test.mjs scripts/release/run-physical-phone-qa.test.mjs` passed, 104 tests.
- Format: `corepack pnpm run format:check` passed.

## Remaining Blocker

- Physical Android phone QA remains BLOCKED until a real attached Android device produces the local no-secret proof file for the current APK.
- No production AAB, Play submission, production deploy, destructive DB migration, new keystore/project, secret rotation, force push, or rebase was performed.
