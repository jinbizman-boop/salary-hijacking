# Iteration 067 - Test Temp Cleanup Hardening

Date: 2026-07-14 KST

## Scope

Release-readiness and database-evidence tests were leaving reusable fixture repositories under the Windows temp directory. This violated the standing cleanup rule because repeated verification created `salary-release-ready-*` and `salary-db-evidence-*` directories outside the repository.

## Root Cause

- `scripts/release/check-release-readiness.test.mjs` created fixture workspaces with `fs.mkdtempSync(path.join(os.tmpdir(), "salary-release-ready-"))` but did not remove them after each test.
- `scripts/release/generate-database-evidence.test.mjs` created fixture workspaces with `fs.mkdtempSync(path.join(os.tmpdir(), "salary-db-evidence-"))` but did not remove them after each test.
- `scripts/dev/clean-generated-junk.mjs` cleaned `salary-release-ready-*`, but did not recognize `salary-db-evidence-*` or the other no-secret release test fixture prefixes.

## Changes

- Added release-readiness fixture workspace tracking and `afterEach` cleanup.
- Added database-evidence fixture workspace tracking and `afterEach` cleanup.
- Added regression tests proving generated fixture workspaces can be removed.
- Extended `clean:junk` temp patterns to cover known no-secret Salary Hijacking release/evidence test fixture prefixes.
- Extended `clean-generated-junk` coverage for `salary-db-evidence-*`.

## Verification

- RED: `node --test --test-name-pattern "cleans generated release readiness fixture workspaces" scripts\release\check-release-readiness.test.mjs` failed with `cleanupWorkspaces is not defined`.
- GREEN: same targeted release-readiness cleanup test passed.
- RED: `node --test --test-name-pattern "cleans generated database evidence fixture workspaces" scripts\release\generate-database-evidence.test.mjs` failed with `cleanupWorkspaces is not defined`.
- GREEN: same targeted database-evidence cleanup test passed.
- RED: `node --test --test-name-pattern "removes only Salary Hijacking temp fixtures" scripts\dev\clean-generated-junk.test.mjs` failed because `salary-db-evidence-abc123` remained.
- GREEN: same targeted clean-junk test passed.
- `node --test scripts\dev\clean-generated-junk.test.mjs scripts\release\generate-database-evidence.test.mjs scripts\release\check-release-readiness.test.mjs`: PASS, 100 tests.
- `git diff --check`: PASS.
- `corepack pnpm run clean:junk`: PASS, removed 34 generated temp/cache paths.
- `Get-ChildItem $env:TEMP -Directory -Filter 'salary-*'`: no remaining Salary Hijacking temp fixture directories.
- `corepack pnpm run disk:report -- --top 15`: PASS, removable generated paths: none.

## Remaining Launch Blockers

This iteration only hardens workspace hygiene and test cleanup. It does not resolve the remaining strict release blockers:

- unresolved launch-blocking GAP rows,
- physical Android phone install/cold-start/persistence/keyboard/safe-area/logcat proof,
- dirty working tree,
- production AAB / Play submission approval gate.

No production AAB, Play submission, new EAS project, new keystore, secret rotation, destructive DB migration, Cloudflare secret mutation, force push, or rebase was performed.
