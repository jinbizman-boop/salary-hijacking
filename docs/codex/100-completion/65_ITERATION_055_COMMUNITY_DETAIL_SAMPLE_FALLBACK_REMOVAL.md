# Iteration 055 Community Detail Sample Fallback Removal

Date: 2026-07-14 KST

## Scope

Community post detail routing still contained route-local sample detail and sample comment fallback data. Even after the route moved to the authenticated mobile community service boundary, this fallback could mask missing server data and make a failed or empty API response look like a successful real community post during launch QA.

## Root Cause

`apps/mobile/app/community/[postId].tsx` used `useCommunityPost(createMobileCommunityService(), postId)`, but then replaced missing `state.detail` with `sampleDetail` and replaced empty `state.comments` with `sampleComments`.

That meant the route could display a plausible post and comments even when the server returned no usable detail, when the request failed, or before real data was loaded.

## TDD Evidence

RED:

```text
corepack pnpm --filter @salary-hijacking/mobile test -- apps/mobile/src/features/community/__tests__/community-detail-routes.screen-wiring.test.ts --runInBand --testNamePattern "does not mask missing community post details"
```

The new test failed because `[postId].tsx` still contained `sampleDetail`, `sampleComments`, `state.detail ??`, and the local comments fallback expression.

GREEN:

```text
corepack pnpm --filter @salary-hijacking/mobile test -- apps/mobile/src/features/community/__tests__/community-detail-routes.screen-wiring.test.ts --runInBand --testNamePattern "does not mask missing community post details"
```

Result: PASS, 5 tests.

## Implementation

Changed `apps/mobile/app/community/[postId].tsx` to:

- remove route-local `sampleDetail`
- remove route-local `sampleComments`
- render community detail only when `state.detail` is present
- render a safe empty/error state when server detail is unavailable
- keep contextual ad disclosure separate from raw financial or personal targeting
- keep real comments from `state.comments`; empty comments now render an explicit empty state instead of fake comments

## Verification

```text
corepack pnpm --filter @salary-hijacking/mobile test -- apps/mobile/src/features/community/__tests__/community-detail-routes.screen-wiring.test.ts apps/mobile/src/features/community/__tests__/community.components.test.tsx apps/mobile/src/features/community/__tests__/community.service.test.ts apps/mobile/src/features/community/__tests__/community.hooks.test.tsx --runInBand
```

Result: PASS, 4 suites and 36 tests.

```text
corepack pnpm --filter @salary-hijacking/mobile run typecheck
```

Result: PASS.

## Release Impact

This reduces a launch-readiness risk where community detail could appear successful without authoritative server data. It does not prove deployed API persistence, real Android device QA, clean release source, production AAB approval, or Play submission.
