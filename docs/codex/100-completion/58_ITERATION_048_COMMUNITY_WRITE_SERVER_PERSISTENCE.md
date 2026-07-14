# Iteration 048 - Community Write Server Persistence Boundary

Date: 2026-07-14 KST

## Scope

The community write route still had a local success mock that generated a post from the draft inside `apps/mobile/app/community/write.tsx`. That made the screen appear to publish successfully without proving server persistence, which matches the user's repeated report that the app UI opens but functions cannot be trusted.

This iteration removes that local success path for the community write route and wires the screen to the authenticated mobile community API service.

## Root Cause

- `CommunityWriteForm` and `useCommunityWrite` already supported server-backed publishing and draft clearing only after successful publish.
- The actual route used a local `communityWriteService` with `publishPost: (draft) => response(postFromDraft(draft))`.
- The route also passed `initialDraft`, so `useCommunityWrite` did not restore a persisted draft from a `draftStore`.

## Changes

- Replaced the local `postFromDraft` mock service in `apps/mobile/app/community/write.tsx`.
- Wired the route to `createMobileCommunityService()`, which sends the publish request through the authenticated mobile API and `/api/v1/community/posts`.
- Added a SecureStore-backed draft store using `createSecureStoreRuntime`.
- Kept failed publish attempts from being reported as local success by relying on `useCommunityWrite` error handling.
- Added route-wiring regression coverage proving the route uses the mobile API service and no longer contains the local publish mock.

## RED Evidence

`corepack pnpm --filter @salary-hijacking/mobile test -- src/features/community/__tests__/community-detail-routes.screen-wiring.test.ts --runInBand`

- Failed as expected.
- The new contract expected `createMobileCommunityService`, `createSecureStoreRuntime`, and `draftStore`.
- The current route still contained `function postFromDraft` and `publishPost: (draft) => response(postFromDraft(draft))`.

## GREEN Evidence

`corepack pnpm --filter @salary-hijacking/mobile test -- src/features/community/__tests__/community-detail-routes.screen-wiring.test.ts --runInBand`

- PASS, 3 tests.

`corepack pnpm --filter @salary-hijacking/mobile run typecheck`

- PASS.

`corepack pnpm --filter @salary-hijacking/mobile test -- src/features/community/__tests__/community.write-hook.test.tsx src/features/community/__tests__/community.service.test.ts src/features/community/__tests__/community.components.test.tsx --runInBand`

- PASS, 3 suites and 28 tests.

`git diff --check`

- PASS.

## Remaining Limits

This closes the community write route's local-success mock gap. It does not prove deployed production DB persistence, physical-phone relaunch QA, full community moderation workflow, production AAB, EAS submit, Play submission, or market publication.
