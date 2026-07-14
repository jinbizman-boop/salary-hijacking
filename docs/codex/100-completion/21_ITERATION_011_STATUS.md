# Iteration 011 - Physical Phone QA Gate And Cleanup

Date: 2026-07-13 KST
Repository: `C:/Users/PC/Desktop/salary-hijacking-platform`
HEAD: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`

## Scope

This iteration added a local Android physical-phone preview QA collector so the release gate can distinguish emulator evidence from actual phone install/cold-start evidence.

The collector intentionally stores no raw device serials, raw logcat lines, tokens, signing keys, reviewer passwords, or secret values. Physical device serials are counted and hashed only for proof shape; logcat is reduced to fatal-marker counts.

## Implementation

- Added `scripts/release/collect-mobile-preview-phone-proof.mjs`.
- Added `scripts/release/collect-mobile-preview-phone-proof.test.mjs`.
- Added package script `release:mobile-preview-phone-proof`.
- Extended `scripts/release/check-release-readiness.mjs` so `release/mobile-preview-phone-proof.local.json` can verify or block the physical-phone QA gate.
- Added release-readiness regression coverage proving a valid no-secret phone proof clears the physical-phone check.

## Observed Result

`corepack pnpm run release:mobile-preview-phone-proof` produced a local no-secret proof, but the result is blocked because no physical Android phone is attached to this Windows environment.

Observed blocker:

`No physical Android phone is attached; emulator evidence does not replace phone QA.`

With that local proof present, release readiness correctly reports:

`BLOCKED mobile:preview:physical-phone`

This is the desired behavior. The project must not claim launch-ready physical-phone QA from emulator-only evidence.

## Validation

- `corepack pnpm exec prettier --check package.json scripts/release/collect-mobile-preview-phone-proof.mjs scripts/release/collect-mobile-preview-phone-proof.test.mjs scripts/release/check-release-readiness.mjs scripts/release/check-release-readiness.test.mjs`: PASS
- `node --test scripts\release\collect-mobile-preview-phone-proof.test.mjs scripts\release\check-release-readiness.test.mjs`: PASS, 76 tests
- `corepack pnpm run check:package-manager-scripts`: PASS, 15 package files checked
- `node scripts\release\check-release-readiness.mjs --soft`: BLOCKED only by physical phone proof while the local no-phone proof exists; warnings remain for missing local `gh`, missing local Neon CLI, and dirty worktree

## Cleanup Policy

`release/mobile-preview-phone-proof.local.json` is a generated local proof file. It is ignored by git and should be removed by generated-junk cleanup after the result is recorded here.

The latest phone APK remains preserved outside generated build folders:

- `D:/salary-hijacking-artifacts/20260713/iteration-010-latest-source/salary-hijacking-phone-arm64-iteration010-debug.apk`
- `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration010-debug.apk`
- SHA256: `596ABBD6E7726779ED1924D557180121C12BE71D51A74B191EA80EBAD10A8094`

## Remaining Blocker

Physical Android phone QA remains blocked until a real Android phone is connected with USB debugging enabled and the following command is run:

```powershell
corepack pnpm run release:mobile-preview-phone-proof
```

After a connected-phone proof passes with install verified, cold-start runs greater than zero, zero fatal markers, and raw logcat/device identifiers redacted, the physical-phone preview QA gate can pass.

## Forbidden Operations Not Performed

No production AAB build, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, Cloudflare secret mutation, destructive DB migration, force push, or rebase was performed.
