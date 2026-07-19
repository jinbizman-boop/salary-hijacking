# Iteration 121 - Product Screen Component Names

Date: 2026-07-15 KST

## Scope

Continued the cleanup requested by the latest goal objective: production mobile
screen entrypoints should not depend on `*ReferenceScreen` component names.

This iteration renames the feature-level Salary, Plan, and Notifications screen
components and exports to product names while preserving the current behavior.

## Changed

- `SalaryHomeReferenceScreen.tsx` -> `SalaryHomeScreen.tsx`
- `PlanReferenceScreen.tsx` -> `PlanScreen.tsx`
- `NotificationReferenceScreen.tsx` -> `NotificationScreen.tsx`
- Public feature barrels now export `SalaryHomeScreen`, `PlanScreen`, and
  `NotificationScreen` directly without reference-screen aliases.
- Capture, screen-wiring, launch-readiness, component, and contract tests now
  use the product screen names.

## Verification

- RED:
  `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.screen-wiring.test.ts src/features/plan/__tests__/plan.screen-wiring.test.ts src/features/notifications/__tests__/notifications.screen-wiring.test.ts --runInBand`
  failed because component barrels still exported direct `*ReferenceScreen`
  aliases and the Notification product screen file did not exist.
- GREEN:
  Same targeted command passed after the file/symbol rename, 6 tests.
- Broader impact suite:
  `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx src/features/salary/__tests__/salary.launch-readiness.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/plan/__tests__/plan.launch-readiness.test.tsx src/features/notifications/__tests__/notifications.components.test.tsx src/features/notifications/__tests__/notifications.launch-readiness.test.tsx src/features/preview/__tests__/reference-screen-copy.test.tsx src/shared/api/__tests__/app-screen-contract.test.ts src/shared/api/__tests__/prototype-ui-contract.test.ts src/shared/components/__tests__/shared-components.contract.test.tsx --runInBand`:
  PASS, 80 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `rg -n "ReferenceScreen|NotificationReferenceHref|SalaryHomeReference|PlanReference|NotificationReference" apps/mobile/src apps/mobile/app -g "*.ts" -g "*.tsx" -g "!**/__tests__/**"`:
  no runtime matches.
- `git diff --check`: PASS.

## Remaining

The shared interactive state module is still named as preview state. That needs
another server-authoritative state naming/data-flow cleanup slice. Because this
is a mobile source change, the current preview APK evidence will become stale
after this source commit until a fresh APK/evidence refresh is produced.
