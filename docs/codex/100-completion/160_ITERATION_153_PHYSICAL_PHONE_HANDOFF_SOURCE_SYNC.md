# Iteration 153 - Physical Phone Handoff Source Sync

## Summary

The physical Android phone QA handoff now carries the current preview APK source
context instead of only the Downloads and artifact paths. The generated handoff
records:

- Downloads APK path
- preserved artifact APK path
- repo build APK path
- remote debug APK URL
- SHA256
- packaged source HEAD
- Android package and ABI

This prevents a future phone run from using the right APK file while losing the
source/evidence trace needed to audit that APK.

## Files

- `scripts/release/generate-physical-phone-qa-handoff.mjs`
- `scripts/release/generate-physical-phone-qa-handoff.test.mjs`
- `docs/qa/100-completion/physical-phone-qa-handoff.md`
- `release/evidence/physical-phone/adb-devices.txt`
- `release/evidence/physical-phone/physical-phone-qa-summary.json`

## Verification

- RED: `node --test scripts/release/generate-physical-phone-qa-handoff.test.mjs`
  failed because the handoff omitted the repo APK path, remote APK URL, and
  packaged source HEAD.
- GREEN: `node --test scripts/release/generate-physical-phone-qa-handoff.test.mjs`
  passed after the generator wrote those fields.
- Regression: `node --test scripts/release/generate-physical-phone-qa-handoff.test.mjs scripts/release/run-physical-phone-qa.test.mjs scripts/release/collect-mobile-preview-phone-proof.test.mjs scripts/release/check-release-readiness.test.mjs`
  passed, 104 tests.
- `corepack pnpm run format:check`: PASS.
- `node scripts/release/check-release-readiness.mjs --strict`: still BLOCKED
  for the expected unresolved launch gaps, physical Android phone QA, and
  origin/main release gate.

## Remaining

This does not complete physical Android phone QA. A real ARM64 Android phone
still must run `node scripts/release/run-physical-phone-qa.mjs --runs 20` and
produce a no-secret local proof with install verification, installed package
verification, 20 cold starts, 20 background/foreground runs, persistence,
keyboard/safe-area, navigation, zero fatal markers, and raw-logcat redaction.
