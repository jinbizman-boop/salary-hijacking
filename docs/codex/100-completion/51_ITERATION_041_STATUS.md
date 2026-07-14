# Iteration 041 Status - Community Comment KST Date Rendering

Date: 2026-07-14 KST

## Scope

- Continue closing the KST/date synchronization gap without changing production release approvals.
- Fix one remaining mobile display path that depended on device-local date formatting instead of explicit `Asia/Seoul`.

## Root Cause

`apps/mobile/src/features/community/components/CommunityCommentItem.tsx` rendered comment dates with:

```ts
new Date(comment.createdAt).toLocaleDateString("ko-KR");
```

That call uses the device/runtime default timezone. On devices configured outside Korea, comments created near UTC/KST day boundaries can render one day early.

## Code Change

- `CommunityCommentItem` now formats comment dates with `timeZone: "Asia/Seoul"`.
- `community.components.test.tsx` now includes a RED/GREEN regression where `2026-07-11T15:00:00.000Z` must render as the Korean calendar day `2026. 7. 12.`.

## Verification

- RED targeted test failed first because the component rendered `2026. 7. 11.`.
- GREEN targeted test PASS:
  - `corepack pnpm --filter @salary-hijacking/mobile test -- apps/mobile/src/features/community/__tests__/community.components.test.tsx --runInBand --testNamePattern "renders comment dates"`
- Focused community regression PASS:
  - `corepack pnpm --filter @salary-hijacking/mobile test -- apps/mobile/src/features/community/__tests__/community.components.test.tsx apps/mobile/src/features/community/__tests__/community.feature-components.test.tsx apps/mobile/src/features/community/__tests__/community.screen-wiring.test.ts --runInBand`
  - 3 suites, 12 tests
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck` PASS.
- `corepack pnpm run format:check` PASS.

## Remaining Blockers

- This closes one mobile KST rendering edge, not the full physical-device KST/safe-area/keyboard matrix.
- Physical Android phone QA, clean release source, production AAB approval, and Play submission approval remain blocked or incomplete.
