# Iteration 021 Status - Plan Daily Living Detail Server-First CRUD

Date: 2026-07-13 KST
Head: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`

## Scope

- Plan daily living detail add/edit/delete now routes through the server-authoritative Budget variable-expense API before Salary Home preview synchronization.
- Latest-source Android phone-target preview/debug APK was rebuilt and evidence was refreshed.
- Generated Android/Expo build output was cleaned after preserving the APK in the release artifact folder and Downloads.

## Code Changes

- `apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx`
  - Extended injectable/runtime Budget API support to `createVariableExpense`, `updateVariableExpense`, and `deleteVariableExpense`.
  - Added server-first create/update/delete handling for daily living detail rows.
  - Maps daily living details to the existing Budget variable-expense contract using KRW integer amounts, date/time, category, payment method, and no raw financial data exposure flags.
  - Applies server-returned records to shared preview state only after the server API resolves.
  - Keeps local preview fallback only when the API is unavailable or fails in preview mode.
- `apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`
  - Added regression coverage proving create/update/delete API calls happen before Salary Home state synchronization.

## Verification

- RED before implementation: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.components.test.tsx --runInBand`: FAIL, 3 new tests observed `createVariableExpense`, `updateVariableExpense`, and `deleteVariableExpense` called 0 times.
- GREEN focused: same command PASS, 15 tests.
- Broader focused regression: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.components.test.tsx src/features/plan/__tests__/plan.api.test.ts src/features/salary/__tests__/salary.components.test.tsx src/features/budget/__tests__/budget.api.test.ts --runInBand`: PASS, 4 suites / 62 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm exec prettier --check apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`: PASS.
- `git diff --check -- apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`: PASS.
- Local Android arm64-v8a debug APK build: PASS.
- `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2.
- `aapt dump badging`: PASS, package `com.salaryhijacking.mobile`, target SDK 35, native-code `arm64-v8a`.
- ZIP/native library inspection: PASS, `lib/arm64-v8a/libexpo-modules-core.so` and `lib/arm64-v8a/libreactnative.so` present.

## APK

- Artifact: `D:/salary-hijacking-artifacts/20260713/iteration-021-plan-daily-living-detail-server-first/salary-hijacking-phone-arm64-iteration021-debug.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration021-debug.apk`
- SHA256: `0D5AEC72670E746AE0F7BEE4000D10FB9DA96873C9381A07081081088806CE12`
- Size: 65,078,997 bytes.

## Remaining Limits

- Physical Android phone install/cold-start/logcat/keyboard QA remains pending because no physical phone is attached to this Codex Windows environment.
- Production AAB, EAS submit, Play upload/submit, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, and Cloudflare secret mutation were not performed.
