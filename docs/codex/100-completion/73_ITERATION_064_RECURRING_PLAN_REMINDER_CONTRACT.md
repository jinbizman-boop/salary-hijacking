# Iteration 064 - Recurring Plan Reminder Contract

Date: 2026-07-14 KST

## Scope

- `apps/mobile/src/features/preview/interactive-state.ts`
- `apps/mobile/src/features/preview/__tests__/interactive-state.test.ts`
- `apps/mobile/src/features/salary/components/SalaryHomeReferenceScreen.tsx`
- `docs/codex/08_FILE_COMPLETION_LOG.md`
- `docs/codex/100-completion/05_GAP_REGISTER.md`

## Root Cause

Salary Home already hid fixed expense and fixed saving reminders when a row had `usedMonthKey` matching the current KST month, but that recurrence rule lived only as an inline screen filter. This made the core plan/home occurrence lifecycle harder to verify independently and kept the "current month completed, next month scheduled again" behavior weakly evidenced.

## Change

- Added `getVisiblePlanReminderItems(planItems, currentMonthKey)` to the preview state boundary.
- Updated Salary Home to use the shared helper instead of a route-local inline filter.
- Added a failing-then-passing test proving:
  - a current-month completed occurrence is hidden;
  - an open current-month occurrence is still visible;
  - a previous-month completion is visible again in the current month;
  - the same completed row is visible in the next month.

## Verification

- RED before implementation:
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/preview/__tests__/interactive-state.test.ts --runInBand`
  - Failed with `getVisiblePlanReminderItems is not a function`.
- GREEN after implementation:
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/preview/__tests__/interactive-state.test.ts --runInBand`: PASS, 6 tests.
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/preview/__tests__/interactive-state.test.ts --runInBand`: PASS, 3 suites / 35 tests.
  - `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
  - `corepack pnpm --filter @salary-hijacking/mobile run format:check`: PASS.
  - `git diff --check`: PASS.
- Latest-source phone APK evidence:
  - `node scripts\expo-local-android-debug-build.mjs --architecture arm64-v8a --output build/phone/android/salary-hijacking-phone-arm64-iteration064-debug.apk`: PASS after retrying with the script's Windows short-root alias enabled.
  - APK copied to `D:/salary-hijacking-artifacts/20260714/iteration-064-recurring-reminders-arm64/salary-hijacking-phone-arm64-iteration064-debug.apk`.
  - APK copied to `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration064-debug.apk`.
  - SHA256: `99710EAA3F423C6491D33044A2DB2CDCE8B8232430C498B25716A64CE6C83D34`.
  - `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2.
  - ABI check: PASS, APK contains `lib/arm64-v8a/libexpo-modules-core.so`, `lib/arm64-v8a/libhermes.so`, `lib/arm64-v8a/libreactnative.so`, and `lib/arm64-v8a/libreanimated.so`.
  - `node scripts\release\check-release-readiness.mjs --strict`: `mobile:preview:latest-source-apk` PASS after refreshing `release/mobile-preview-evidence.json`.

## Remaining Limits

- Strict release readiness remains BLOCKED by unresolved GAP register rows, physical Android phone QA, and dirty working tree.
- Physical Android phone QA remains unavailable because no phone is attached.
- Deployed DB recurrence generation and production Play submission remain outside this local proof.
