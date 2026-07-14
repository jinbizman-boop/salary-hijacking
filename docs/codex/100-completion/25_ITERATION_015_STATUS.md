# Iteration 015 Status - Server-First Variable Expense Save

Date: 2026-07-13 KST

## Scope

- Mobile Salary Home variable-expense quick save.
- Latest-source arm64 preview APK refresh.
- Release evidence update without production AAB, store submit, new EAS project, new keystore, secret rotation, or destructive DB work.

## Changes

- Added a regression test proving the Salary Home variable-expense form submits to a server-authoritative `createVariableExpense` API before keeping the preview row.
- Updated `SalaryHomeReferenceScreen` so runtime builds create a mobile Budget API client and submit variable expenses to `/api/v1/variable-expenses` through the existing mobile API factory.
- Kept local QA preview fallback available when the API is unavailable, while treating it as non-authoritative preview state.
- Mapped Korean free-form categories such as 음식, 카페, 교통, 게임, 교육, 건강, 여행 into the server enum values used by the variable-expense contract.
- Rebuilt the phone-target arm64-v8a debug APK and updated `release/mobile-preview-evidence.json`.

## Verification

- RED: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand` failed before implementation because `createVariableExpense` was called 0 times.
- GREEN: same focused salary test passed, 5 tests.
- Focused regression: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/preview/__tests__/interactive-state.test.ts src/features/salary/__tests__/salary.components.test.tsx src/features/budget/__tests__/budget.api.test.ts --runInBand` passed, 34 tests.
- Typecheck: `corepack pnpm --filter @salary-hijacking/mobile run typecheck` passed.
- Prettier and `git diff --check` passed for touched code before APK build.
- Android preflight passed.
- Android local debug build passed.
- APK signature verification passed with APK Signature Scheme v2.
- ZIP inspection confirmed arm64-v8a Expo core native library presence.
- `node scripts/release/check-release-readiness.mjs --soft` reported mobile latest-source APK PASS and phone-target APK PASS for SHA256 `44971E900A0CA357A78D43A35474FAB2E58673DE2B2866885A96F8718232DC04`.

## APK

- Archive: `D:/salary-hijacking-artifacts/20260713/iteration-015-server-first-variable-expense/salary-hijacking-phone-arm64-iteration015-debug.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration015-debug.apk`
- SHA256: `44971E900A0CA357A78D43A35474FAB2E58673DE2B2866885A96F8718232DC04`
- Size: 65,071,477 bytes

## Remaining Non-Completion Items

- Physical Android phone install/cold-start/logcat QA remains pending because no real phone is attached to this Codex Windows environment.
- Production AAB build, EAS submit, Google Play upload/submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, and Cloudflare secret mutation remain not performed by policy.
- The Salary Home quick-add path is now server-first, but full plan/home synchronization, all CRUD surfaces, deployed staging smoke, DB migration/rollback proof, Admin OpenNext proof, and public URL proof still require further verified iterations.
