# Iteration 107 - Physical Phone QA Handoff

Date: 2026-07-14 KST

## Scope

This iteration reduces the remaining physical Android phone QA blocker by making the required phone-side proof collection reproducible from the current preview APK evidence.

It does not mark physical phone QA as complete. No physical Android phone is attached to this Codex Windows environment, so strict launch readiness remains blocked until `release/mobile-preview-phone-proof.local.json` is produced by the existing no-secret collector on a real phone.

## Files

- `scripts/release/generate-physical-phone-qa-handoff.mjs`
- `scripts/release/generate-physical-phone-qa-handoff.test.mjs`
- `docs/qa/100-completion/physical-phone-qa-handoff.md`
- `docs/codex/100-completion/116_ITERATION_107_PHYSICAL_PHONE_QA_HANDOFF.md`
- `docs/codex/08_FILE_COMPLETION_LOG.md`

## Current APK Evidence Used

- APK: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration104-debug.apk`
- Artifact: `D:/salary-hijacking-artifacts/20260714/iteration-104-daily-budget-date-key/salary-hijacking-phone-arm64-iteration104-debug.apk`
- SHA256: `5E9CC86ECA43F41327FF3C8B4392F5F8F08479C58EC1EB7ED204CF7356ADCDB0`
- Android package: `com.salaryhijacking.mobile`
- ABI: `arm64-v8a`

## Generated Handoff

The generated handoff at `docs/qa/100-completion/physical-phone-qa-handoff.md` records the exact command to run against the latest retained phone APK:

```powershell
Set-Location 'C:\Users\PC\Desktop\salary-hijacking-platform'
node scripts\release\collect-mobile-preview-phone-proof.mjs --apk "C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration104-debug.apk" --runs 20 --output release/mobile-preview-phone-proof.local.json --package com.salaryhijacking.mobile
```

The handoff also records the strict proof requirements:

- physical phone install verified
- 20 cold-start runs
- 20 background/foreground runs
- zero fatal startup markers
- navigation smoke verified
- persistence verified
- keyboard/safe-area verified
- raw logcat not stored

## Verification

- RED: `node --test scripts\release\generate-physical-phone-qa-handoff.test.mjs` failed before implementation because `generate-physical-phone-qa-handoff.mjs` was missing.
- GREEN: `node --test scripts\release\generate-physical-phone-qa-handoff.test.mjs` passed with 2 tests after implementation.
- Generation: `node scripts\release\generate-physical-phone-qa-handoff.mjs` wrote `docs/qa/100-completion/physical-phone-qa-handoff.md`.

## Remaining

- Physical Android phone QA is still BLOCKED until a real phone is attached and the collector writes a passing `release/mobile-preview-phone-proof.local.json`.
- The generated local phone proof must remain untracked and must not contain raw logcat, device serials, tokens, signing keys, or credentials.
- Production AAB, Play upload/submission, new EAS project, new keystore, secret rotation, destructive DB changes, and force push/rebase remain unapproved.
