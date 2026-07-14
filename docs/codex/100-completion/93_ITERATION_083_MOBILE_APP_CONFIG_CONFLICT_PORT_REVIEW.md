# Iteration 083 Mobile App Config Conflict Port Review

Date: 2026-07-14 KST

## Scope

- `apps/mobile/app.config.ts`
- `apps/mobile/src/config/__tests__/mobile-e2e-contract.test.ts`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/app.config.ts`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/src/config/__tests__/mobile-e2e-contract.test.ts`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISIONS.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`

## Decision

Both mobile app config conflict rows are `CURRENT_ACCEPTED`.

The current platform files supersede the archive copies. `app.config.ts` keeps the white launch/adaptive-icon background required by the current Salary Hijacking splash/login design and removes the stale `host: app` custom-scheme deep link so Expo Router paths open directly. The current mobile E2E contract test adds regressions for Expo PackageList patching, direct custom-scheme Router paths, and Android post-splash window background behavior.

## Evidence

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/app.config.ts apps/mobile/app.config.ts`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/config/__tests__/mobile-e2e-contract.test.ts apps/mobile/src/config/__tests__/mobile-e2e-contract.test.ts`
- `node scripts/release/classify-merge-conflict-archive.mjs`
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/config/__tests__/mobile-e2e-contract.test.ts --runInBand`: PASS, 10 tests
- `node --test scripts/release/classify-merge-conflict-archive.test.mjs scripts/release/check-release-readiness.test.mjs`: PASS, 89 tests

## Register Result

- Total conflict files: 132
- Current path exists: 106
- Missing current path: 26
- Byte-identical: 0
- `CURRENT_ACCEPTED`: 18
- `REVIEW_REQUIRED`: 74
- `EXCLUDE_RUNTIME`: 26
- `SUPERSEDED_BY_CURRENT_EVIDENCE`: 14

## Remaining Work

The merge archive is still not safe to delete. Seventy-four `REVIEW_REQUIRED` rows remain and must receive file-level semantic port decisions or verified supersession evidence first.
