# Iteration 119 - Production Route Screen Entrypoints

Date: 2026-07-15 KST

## Scope

Started the explicit removal of preview/reference naming from production mobile
routes. The Salary, Plan, and Notifications route entrypoints now import product
screen names instead of directly mounting `*ReferenceScreen` components.

This is a scoped first slice. It does not claim that the internal implementation
has fully removed every preview-state dependency yet.

## Changed

- `apps/mobile/app/(tabs)/salary/index.tsx` now mounts `SalaryHomeScreen`.
- `apps/mobile/app/(tabs)/plan/index.tsx` now mounts `PlanScreen`.
- `apps/mobile/app/notifications/index.tsx` now mounts `NotificationScreen`.
- Feature component barrels now expose product-screen aliases while preserving
  the existing internal components and tests.
- Screen wiring tests now guard against direct `ReferenceScreen` usage in the
  production route entrypoints.

## Verification

- RED:
  `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.screen-wiring.test.ts src/features/plan/__tests__/plan.screen-wiring.test.ts src/features/notifications/__tests__/notifications.screen-wiring.test.ts --runInBand`
  failed before implementation because all three route files still imported
  direct `*ReferenceScreen` names.
- GREEN:
  Same targeted command passed after the route entrypoint change.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `rg -n "ReferenceScreen" apps/mobile/app -g "*.tsx"`: no matches.
- `rg -n "PreviewState" apps/mobile/app -g "*.tsx"`: no matches.
- `corepack pnpm run format:check`: PASS.
- `git diff --check`: PASS.
- `corepack pnpm run check:release-readiness -- --strict`: BLOCKED as expected
  because launch-blocking gaps remain open, the latest source changes are not
  yet packaged into a fresh Android preview APK, the feature branch is not merged
  to `origin/main`, and physical Android phone QA/logcat proof is still pending.

## Remaining

Internal feature implementation files still contain preview/reference names and
state helpers. Those require separate server-authoritative data and naming
cleanup slices so the route-level safety change does not accidentally destabilize
the current Android QA APK path.
