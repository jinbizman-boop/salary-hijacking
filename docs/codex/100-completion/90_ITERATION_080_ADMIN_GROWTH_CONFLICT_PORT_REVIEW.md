# Iteration 080 - Admin Growth Conflict Port Review

Date: 2026-07-14 KST

## Scope

- `apps/admin/src/app/growth-content/page.tsx`
- `apps/admin/tests/unit/growth-content-page.test.ts`
- `.merged-from-salary-hijacking-main/conflicts/apps/admin/src/app/growth-content/page.tsx`
- `.merged-from-salary-hijacking-main/conflicts/apps/admin/tests/unit/growth-content-page.test.ts`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISIONS.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`

## Decision

Both `admin-source` conflict rows are `CURRENT_ACCEPTED`.

The current platform Admin LV UP content console supersedes the archived conflict copy because it uses the current product taxonomy:

- content types: `READING`, `NEWS`, `ENGLISH`, `HEALTH`
- content statuses: `DRAFT`, `REVIEW`, `PUBLISHED`, `ARCHIVED`
- difficulty levels: `EASY`, `NORMAL`, `HARD`, `EXTREME`

The archive copy still contains older labels such as `EXERCISE`, `IN_REVIEW`, `APPROVED`, and `BEGINNER`, which conflict with the current API/mobile LV UP direction.

## Evidence

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/admin/src/app/growth-content/page.tsx apps/admin/src/app/growth-content/page.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/admin/tests/unit/growth-content-page.test.ts apps/admin/tests/unit/growth-content-page.test.ts`
- `node scripts\release\classify-merge-conflict-archive.mjs`

## Register Result

- total conflicts: 132
- current path exists: 106
- missing current path: 26
- byte-identical: 0
- `CURRENT_ACCEPTED`: 12
- `REVIEW_REQUIRED`: 80
- `EXCLUDE_RUNTIME`: 26
- `SUPERSEDED_BY_CURRENT_EVIDENCE`: 14

## Remaining

The historical merge archive is still not safe to delete. The remaining 80 `REVIEW_REQUIRED` rows need semantic review before `.merged-from-salary-hijacking-main` can be removed.
