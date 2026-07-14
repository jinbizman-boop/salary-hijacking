# Iteration 029 - Salary Home KST Payday Cycle Labels

Date: 2026-07-13 KST
Head: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`

## Scope

- Replaced static Salary Home payday-card dates with KST-derived salary-cycle labels.
- Current-cycle label is the latest configured payday day on or before the current Asia/Seoul date.
- Next label is the day before the next salary cycle starts, matching the PDF example where 2025-12-10 maps to 11/25 and 12/24.
- Added a regression test proving the screen no longer renders the static 11/25 and 12/24 design placeholders when the current KST date is 2026-07-13.

## Verification

- RED: Salary component regression failed because the screen still rendered `11월 25일` and `12월 24일`.
- GREEN: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand`
  - PASS, 16 tests.
- Broader regression:
  - `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/budget/__tests__/budget.api.test.ts --runInBand`
  - PASS, 3 suites / 56 tests.
- Typecheck:
  - `corepack pnpm --filter @salary-hijacking/mobile run typecheck`
  - PASS.
- Formatting:
  - `corepack pnpm --filter @salary-hijacking/mobile exec prettier --check src/features/salary/components/SalaryHomeReferenceScreen.tsx src/features/salary/__tests__/salary.components.test.tsx`
  - PASS.
- Android preview APK:
  - Local ARM64 debug APK build PASS after allowing a longer native compile window.
  - APK copied to `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration029-debug.apk`.
  - Artifact copied to `D:/salary-hijacking-artifacts/20260713/iteration-029-salary-kst-payday-cycle/salary-hijacking-phone-arm64-iteration029-debug.apk`.
  - SHA256: `818AD500EAFCF6BB6FA16FA597FEB3B3C371905EADDF17E73F3CF09A993E9C12`.
  - Size: 65,084,685 bytes.
  - `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2.
  - `aapt dump badging`: PASS for `com.salaryhijacking.mobile`, app label `급여납치`, and `arm64-v8a`.
  - ZIP native library inspection confirmed `lib/arm64-v8a/libexpo-modules-core.so` and `lib/arm64-v8a/libreactnative.so`.

## Evidence

- `release/mobile-preview-evidence.json`
- `D:/salary-hijacking-artifacts/20260713/iteration-029-salary-kst-payday-cycle/apk-summary.json`
- Latest-source fingerprint: `E90539C29862EDF1D9FC90369AF8E68011BAE75F1D7D7EE18F243A1C45FBCEE8`

## Cleanup

- The local Android builder temporarily used a `Z:` subst alias for native CMake stability.
- Post-build cleanup removed generated Android/Expo/Gradle outputs and temp caches.
- `subst` returned empty after cleanup.

## Remaining Blockers

- Physical Android phone install, cold-start, navigation, keyboard, safe-area, persistence, and logcat QA remain blocked because no physical phone is attached.
- Production AAB, EAS submit, Google Play submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, and Cloudflare secret mutation were not performed.
