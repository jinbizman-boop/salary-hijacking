# Iteration 089 Mobile Notifications Conflict Port Review

Date: 2026-07-14 KST

## Scope

Reviewed the mobile Notifications conflict archive rows:

- `apps/mobile/app/notifications/index.tsx`
- `apps/mobile/src/features/notifications/__tests__/notifications.components.test.tsx`
- `apps/mobile/src/features/notifications/__tests__/notifications.screen-wiring.test.ts`
- `apps/mobile/src/features/notifications/components/index.ts`
- `apps/mobile/src/features/notifications/components/NotificationList.tsx`
- `apps/mobile/src/features/notifications/components/NotificationPreferenceStrip.tsx`
- `apps/mobile/src/features/notifications/components/NotificationSummaryCard.tsx`

## Decision

All seven rows are `CURRENT_ACCEPTED`.

The current platform files supersede the archived copies because the current Notifications route is an independent stack screen using `NotificationReferenceScreen`, not a static in-route component assembly. It now aligns with the user-requested notification behavior:

- The notification screen is outside the bottom tab navigator.
- The screen exposes a back action and settings action.
- Notification rows open typed deep links such as `/salary` and `/level/reading`.
- Korean UI copy replaces older debug marker strings.
- Rendered components explicitly avoid raw push-token and sensitive financial amount exposure.
- Notification component tests still cover unread status, safe deeplink actions, and mark-all-read behavior.

## Evidence

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/app/notifications/index.tsx apps/mobile/app/notifications/index.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/notifications/__tests__/notifications.components.test.tsx apps/mobile/src/features/notifications/__tests__/notifications.components.test.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/notifications/__tests__/notifications.screen-wiring.test.ts apps/mobile/src/features/notifications/__tests__/notifications.screen-wiring.test.ts`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/notifications/components/index.ts apps/mobile/src/features/notifications/components/index.ts`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/notifications/components/NotificationList.tsx apps/mobile/src/features/notifications/components/NotificationList.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/notifications/components/NotificationPreferenceStrip.tsx apps/mobile/src/features/notifications/components/NotificationPreferenceStrip.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/notifications/components/NotificationSummaryCard.tsx apps/mobile/src/features/notifications/components/NotificationSummaryCard.tsx`
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/notifications/__tests__/notifications.components.test.tsx --runInBand`: PASS, 3 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/notifications/__tests__/notifications.screen-wiring.test.ts --runInBand`: PASS, 1 test.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/notifications/__tests__/notifications.launch-readiness.test.tsx --runInBand`: PASS, 1 test.
- `node scripts\release\classify-merge-conflict-archive.mjs`: PASS; decisions now show 47 `CURRENT_ACCEPTED`, 45 `REVIEW_REQUIRED`, 26 `EXCLUDE_RUNTIME`, and 14 `SUPERSEDED_BY_CURRENT_EVIDENCE`.

## Remaining Work

The merge archive remains a historical review source. It is not yet safe to delete because 45 mobile-source rows still require semantic port review.
