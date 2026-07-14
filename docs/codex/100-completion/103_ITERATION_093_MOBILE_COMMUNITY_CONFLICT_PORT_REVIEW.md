# Iteration 093 Mobile Community Conflict Port Review

Date: 2026-07-14 KST

## Scope

- `apps/mobile/src/features/community/community.constants.ts`
- `apps/mobile/src/features/community/__tests__/community.components.test.tsx`
- `apps/mobile/src/features/community/__tests__/community.feature-components.test.tsx`
- `apps/mobile/src/features/community/__tests__/community.screen-wiring.test.ts`
- `apps/mobile/src/features/community/components/CommunityTabBar.tsx`
- `apps/mobile/src/features/community/components/CommunityWriteForm.tsx`
- `apps/mobile/src/features/community/components/ComposeBottomSheet.tsx`
- `apps/mobile/src/features/community/components/PopularPostSection.tsx`
- `apps/mobile/app/community/write.tsx`
- `apps/mobile/app/community/[postId].tsx`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISIONS.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`

## Decision

All 10 remaining mobile Community conflict rows are `CURRENT_ACCEPTED`.

The current platform versions supersede the archive copies because they keep the expanded board taxonomy, Korean labels, board-tab accessibility, popular post cards, anonymous publishing, moderation feedback, SecureStore-backed draft persistence, authenticated mobile API publishing, idempotency guards, raw financial data guards, community detail API loading, comment/like/report route coverage, and no route-local sample-data fallback.

## Evidence

- `git diff --no-index --stat` was run for all 10 Community archive-current file pairs.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/community/__tests__/community.components.test.tsx src/features/community/__tests__/community.feature-components.test.tsx src/features/community/__tests__/community.screen-wiring.test.ts src/features/community/__tests__/community-detail-routes.screen-wiring.test.ts src/features/community/__tests__/community.write-hook.test.tsx --runInBand`: PASS, 5 suites and 19 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- UTF-8 integrity spot-check via Node confirmed no replacement characters in the reviewed Community visible-copy files.
- `node scripts/release/classify-merge-conflict-archive.mjs`: PASS and regenerated the CSV/Markdown registers with `CURRENT_ACCEPTED: 92`, `REVIEW_REQUIRED: 0`, `EXCLUDE_RUNTIME: 26`, and `SUPERSEDED_BY_CURRENT_EVIDENCE: 14`.

## Remaining Limits

This closes the semantic review of the merge conflict archive. It does not prove physical Android phone QA, full native E2E on a connected phone, production AAB, Play upload, Play submit, live Cloudflare/Neon smoke, or market publication.
