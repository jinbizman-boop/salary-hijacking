# Iteration 070 - Physical Phone Proof Strict Fields

Date: 2026-07-14 KST

## Scope

Strict release readiness already states that physical Android phone QA must prove install, cold start, persistence, keyboard/safe-area, and no-secret logcat behavior. The local phone proof gate was weaker because a local proof with install, cold-start count, zero fatal markers, and raw-logcat redaction could pass without explicit persistence or keyboard/safe-area fields.

## Changes

- Strengthened `scripts/release/check-release-readiness.mjs` so local physical phone proof must include:
  - `navigationSmokeVerified`
  - `backgroundForegroundVerified`
  - `persistenceVerified`
  - `keyboardSafeAreaVerified`
- Added a regression test proving a physical phone proof that lacks persistence and keyboard/safe-area QA is blocked.
- Extended `scripts/release/collect-mobile-preview-phone-proof.mjs` to write these no-secret QA fields when ADB probes succeed.
- Kept privacy protections: raw logcat, raw device dumps, serials, credentials, signing keys, reviewer passwords, and tokens are still not stored.

## Verification

- RED: `node --test --test-name-pattern "blocks physical phone proof that lacks persistence" scripts\release\check-release-readiness.test.mjs` failed because the weaker proof was accepted.
- GREEN: same readiness test passed after requiring the stricter phone proof fields.
- RED: `node --test --test-name-pattern "builds verified no-secret proof" scripts\release\collect-mobile-preview-phone-proof.test.mjs` failed because the collector did not emit the stricter QA fields.
- GREEN: same phone proof collector test passed after adding the probes and fields.
- `node --test scripts\release\collect-mobile-preview-phone-proof.test.mjs scripts\release\check-release-readiness.test.mjs`: PASS, 88 tests.
- `corepack pnpm run clean:junk`: PASS; `$env:TEMP` Salary Hijacking fixture count after cleanup: 0.

## Remaining Launch Blockers

This iteration improves the proof gate and prevents a false physical-phone PASS. It does not attach a physical Android phone or complete the actual install, cold-start, persistence, keyboard, safe-area, and no-secret logcat QA run.
