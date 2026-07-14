# Iteration 058 - Release Readiness Blocker Classification

Date: 2026-07-14 KST

## Scope

- `scripts/release/check-release-readiness.mjs`
- `scripts/release/check-release-readiness.test.mjs`
- `docs/codex/08_FILE_COMPLETION_LOG.md`

## Requirement

Strict release readiness must separate true release blockers from environment warnings without hiding launch risk.

Connector-backed CLI evidence should not create duplicate local CLI warnings when release evidence already proves account access through an approved connector path. Unresolved P0/P1/P2 gap-register entries must be direct blockers instead of warnings that are projected into strict blockers later.

## Root Cause

The readiness checker mixed two different classes of findings:

- Missing local `gh`, `neon`, or `neonctl` commands produced warnings even when connector evidence was present and release evidence could be evaluated.
- Unresolved gap-register rows were emitted as warnings first, then strict mode converted those warnings into generic blockers.

That made strict output noisier than necessary and obscured the actual remaining launch blockers.

## TDD Evidence

RED:

```powershell
node --test --test-name-pattern "connector evidence as an account-access fallback|connector-backed CLI fallbacks" scripts/release/check-release-readiness.test.mjs
```

Result: failed because connector-backed CLI fallback still produced CLI warnings.

GREEN:

```powershell
node --test --test-name-pattern "connector evidence as an account-access fallback|connector-backed CLI fallbacks" scripts/release/check-release-readiness.test.mjs
```

Result: PASS, 2 focused tests.

RED:

```powershell
node --test --test-name-pattern "strict readiness blocks unresolved P0/P1/P2 gap register entries" scripts/release/check-release-readiness.test.mjs
```

Result: failed because unresolved gap-register entries were still emitted as warning-derived strict blockers.

GREEN:

```powershell
node --test --test-name-pattern "strict readiness blocks unresolved P0/P1/P2 gap register entries" scripts/release/check-release-readiness.test.mjs
```

Result: PASS, 1 focused test.

Regression:

```powershell
node --test scripts/release/check-release-readiness.test.mjs
```

Result: PASS, 81 tests.

Current-source strict projection:

```powershell
node scripts/release/check-release-readiness.mjs --strict
```

Filtered result:

- `PASS cli:GitHub CLI`: missing `gh`; connector evidence observed.
- `PASS cli:Cloudflare Wrangler`: local Wrangler binary available.
- `PASS cli:Neon CLI`: missing `neon`/`neonctl`; connector evidence observed.
- `BLOCKED docs:gap-register`: unresolved launch-blocking gaps remain.
- `BLOCKED mobile:preview:latest-source-apk`: current mobile source changes are newer than APK evidence.
- `BLOCKED strict:physical-phone`: physical Android phone QA remains pending.
- `BLOCKED strict:warning`: git repository has local changes.

Post-verification cleanup:

```powershell
corepack pnpm run clean:junk
```

Result: PASS. Removed 241 generated paths and freed 4.05 GB, including regenerated `salary-release-ready-*` temp directories and `v8-compile-cache`.

## Implementation

- Connector-backed CLI fallback now records `PASS cli:*` with `connector evidence observed` instead of creating a warning.
- Unresolved P0/P1/P2 gap-register entries now produce a direct `BLOCKED docs:gap-register` check.
- The duplicate warning path for unresolved gap-register rows was removed.
- Tests now assert that connector-backed CLI fallback does not create strict warnings and that unresolved gap-register rows are direct blockers.

## Remaining Blockers

- Fresh Android preview APK must be produced from the current source snapshot.
- Physical Android phone install, cold start, navigation, persistence, keyboard/safe-area, and no-secret logcat proof is still missing.
- Gap register still contains unresolved P0/P1/P2 rows: release source, mobile startup, salary home, plan, UI, and external approval.
- Working tree is still dirty and cannot be treated as a clean release source.

## Status

File-level verified completeness: PASS for readiness blocker classification.

Project-wide launch readiness: still BLOCKED. No production AAB, Play submission, new EAS project, new keystore, secret rotation, destructive DB action, Cloudflare secret mutation, force push, or rebase was performed.
