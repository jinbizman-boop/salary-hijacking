# Iteration 149 - Readiness Package Proof Gate

Date: 2026-07-17 KST

## Scope

Extended strict release readiness so a future local physical Android phone proof cannot pass unless it includes installed package verification from `adb shell pm path com.salaryhijacking.mobile`.

## Files

- `scripts/release/check-release-readiness.mjs`
- `scripts/release/check-release-readiness.test.mjs`
- `docs/codex/08_FILE_COMPLETION_LOG.md`

## Behavior

- A local `release/mobile-preview-phone-proof.local.json` is no longer accepted by readiness when it only proves `adb install`.
- The proof must include:
  - `installedPackageVerified=true`
  - a 64-character uppercase SHA256 `installedPackagePathHash`
  - `packageInfoProbe.rawPackageInfoStored=false`
- The readiness error now names missing installed package verification explicitly.

## Verification

- RED: `node --test scripts/release/check-release-readiness.test.mjs` failed because a proof without installed package verification still passed.
- GREEN: `node --test scripts/release/check-release-readiness.test.mjs` passed, 89 tests.
- Regression: `node --test scripts/release/check-release-readiness.test.mjs scripts/release/collect-mobile-preview-phone-proof.test.mjs scripts/release/run-physical-phone-qa.test.mjs scripts/release/generate-physical-phone-qa-handoff.test.mjs` passed, 104 tests.
- `corepack pnpm run format:check` passed.
- `node scripts/release/check-release-readiness.mjs --strict` remains BLOCKED for the expected physical phone QA, origin/main release gate, and pre-commit local changes.

## Remaining

Strict launch readiness still requires an attached physical Android phone to generate the no-secret proof with installed package verification, 20 cold starts, background/foreground runs, persistence, keyboard/safe-area, and zero fatal markers.
