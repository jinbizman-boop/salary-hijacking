# Iteration 084 Mobile Clean Fintech Style Conflict Port Review

Date: 2026-07-14 KST

## Scope

- `apps/mobile/src/shared/styles/clean-fintech-screens.tsx`
- `apps/mobile/src/shared/styles/__tests__/clean-fintech-theme.test.ts`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/src/shared/styles/clean-fintech-screens.tsx`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/src/shared/styles/__tests__/clean-fintech-theme.test.ts`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISIONS.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`

## Decision

Both mobile Clean Fintech style conflict rows are `CURRENT_ACCEPTED`.

The current platform files supersede the archive copies. `clean-fintech-screens.tsx` now uses the static image asset registry (`appImageAssets.brand.platformLogo`) instead of importing the platform logo directly from the older app asset path. The current screen copy also replaces the archive English LV UP private-record prompts with Korean UX copy and Korean accessibility labels. The current design contract test follows the new `src/shared/assets/images/brand` logo path and asserts the Korean private LV UP record copy.

## Evidence

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/shared/styles/clean-fintech-screens.tsx apps/mobile/src/shared/styles/clean-fintech-screens.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/shared/styles/__tests__/clean-fintech-theme.test.ts apps/mobile/src/shared/styles/__tests__/clean-fintech-theme.test.ts`
- `node scripts/release/classify-merge-conflict-archive.mjs`
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/shared/styles/__tests__/clean-fintech-theme.test.ts --runInBand`
- `node --test scripts/release/classify-merge-conflict-archive.test.mjs scripts/release/check-release-readiness.test.mjs`

## Register Result

- Total conflict files: 132
- Current path exists: 106
- Missing current path: 26
- Byte-identical: 0
- `CURRENT_ACCEPTED`: 20
- `REVIEW_REQUIRED`: 72
- `EXCLUDE_RUNTIME`: 26
- `SUPERSEDED_BY_CURRENT_EVIDENCE`: 14

## Remaining Work

The merge archive is still not safe to delete. Seventy-two `REVIEW_REQUIRED` rows remain and must receive file-level semantic port decisions or verified supersession evidence first.
