# Iteration 081 - Mobile Uploads Conflict Port Review

Date: 2026-07-14 KST

## Scope

- `apps/mobile/src/features/uploads/api.ts`
- `apps/mobile/src/features/uploads/__tests__/uploads.api.test.ts`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/uploads/api.ts`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/uploads/__tests__/uploads.api.test.ts`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISIONS.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`

## Decision

Both mobile Uploads conflict rows are `CURRENT_ACCEPTED` after porting archive-only privacy terms into the current implementation.

## Ported From Archive

- `연봉`
- `휴대폰`

## Preserved From Current

- `은행`
- `이메일`
- HTTPS or local-development-only API base URL validation
- unknown upload field rejection before bytes reach the network
- raw local file path rejection before upload headers
- sensitive server-echoed filename rejection
- no raw financial/personal/ad-targeting exposure headers
- safe Korean upload error wrapping

## Evidence

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/uploads/api.ts apps/mobile/src/features/uploads/api.ts`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/uploads/__tests__/uploads.api.test.ts apps/mobile/src/features/uploads/__tests__/uploads.api.test.ts`
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/uploads/__tests__/uploads.api.test.ts --runInBand`: PASS, 19 tests.
- `node scripts\release\classify-merge-conflict-archive.mjs`

## Register Result

- total conflicts: 132
- current path exists: 106
- missing current path: 26
- byte-identical: 0
- `CURRENT_ACCEPTED`: 14
- `REVIEW_REQUIRED`: 78
- `EXCLUDE_RUNTIME`: 26
- `SUPERSEDED_BY_CURRENT_EVIDENCE`: 14

## Remaining

The historical merge archive is still not safe to delete. The remaining 78 `REVIEW_REQUIRED` rows need semantic review before `.merged-from-salary-hijacking-main` can be removed.
