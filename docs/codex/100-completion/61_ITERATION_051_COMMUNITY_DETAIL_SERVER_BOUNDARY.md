# Iteration 051 Community Detail Server Boundary

Date: 2026-07-14 KST

## Scope

Continue removing mobile runtime paths that can make community features look successful without server persistence. This iteration focuses on the community post detail route.

## Root Cause

`apps/mobile/app/community/[postId].tsx` still defined a route-local `communityPostService` with `response(...)` helpers. That service returned local success for community detail reads and mutations such as comment deletion, post reporting, likes, bookmarks, and shares.

That path contradicted the launch contract because production-facing community UX must be server-first and must not silently succeed through local-only mocks.

## TDD Evidence

RED:

- Added `community-detail-routes.screen-wiring.test.ts` coverage requiring the detail route to use `createMobileCommunityService`.
- The new test also rejects route-local success helpers such as `function response(`, `const communityPostService: CommunityService`, `deleteComment: () => response({ ok: true })`, `reportPost: () => response({ ok: true })`, and local `setPostLiked` response stubs.
- The focused test failed as expected because the route still contained the local success service.

GREEN:

- Removed the route-local `response(...)` helper and local `communityPostService`.
- Wired the detail route to `createMobileCommunityService()` through `useMemo`.
- Kept the existing safe sample detail as a fallback display state so failed bootstrap does not render a blank screen, while the network load itself now goes through the authenticated mobile community API.
- Added `server_authoritative_detail_boundary` to the route completeness check.

## Verification

Commands:

- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/community/__tests__/community-detail-routes.screen-wiring.test.ts --runInBand`
  - PASS, 1 suite, 4 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`
  - PASS.
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/community/__tests__/community-detail-routes.screen-wiring.test.ts src/features/community/__tests__/community.hooks.test.tsx src/features/community/__tests__/community.service.test.ts src/features/community/__tests__/community.components.test.tsx --runInBand`
  - PASS, 4 suites, 35 tests.

## Remaining Limits

This closes a mobile runtime mock-only detail route boundary. It does not prove deployed production DB persistence, full community moderation, physical-phone relaunch QA, production AAB, EAS submit, Play submission, or market publication.

No production AAB, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, or Cloudflare secret mutation was performed.
