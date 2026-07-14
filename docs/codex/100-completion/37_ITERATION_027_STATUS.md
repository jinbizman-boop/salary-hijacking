# Iteration 027 - Salary Daily Limit Server Save

Observed at: 2026-07-13 KST

## Scope

- Salary Home daily budget total changes now call the server-authoritative Budget `saveDailyBudget` API before updating the home summary.
- The request uses the current Asia/Seoul date, KRW integer amount, `budgetId: null`, and no raw financial memo.
- The local editable fallback remains available only when no runtime/injected budget API exists or the staging/API call is unavailable.
- Latest phone-target ARM64 debug APK evidence was refreshed after the source change.

## Verification

- RED: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand` failed because `saveDailyBudget` was not called when changing `일일 사용 총 금액`.
- GREEN: same focused Salary test PASS, 14 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/budget/__tests__/budget.api.test.ts --runInBand`: PASS, 3 suites / 54 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile exec prettier --check src/features/salary/components/SalaryHomeReferenceScreen.tsx src/features/salary/__tests__/salary.components.test.tsx`: PASS.
- `git diff --check -- apps/mobile/src/features/salary/components/SalaryHomeReferenceScreen.tsx apps/mobile/src/features/salary/__tests__/salary.components.test.tsx`: PASS.
- Local Android phone-target ARM64 debug APK build: PASS; wrapper timed out after producing the APK, then Gradle/JDK processes exited cleanly.
- APK package metadata: PASS for `com.salaryhijacking.mobile`, app label `급여납치`, target SDK 35, and `arm64-v8a`.
- APK signature verification: PASS with APK Signature Scheme v2.
- APK native-library inspection: PASS for `lib/arm64-v8a/libexpo-modules-core.so` and `lib/arm64-v8a/libreactnative.so`.
- Windows filesystem drive check after build: real drives are `C:` and `D:` only; `subst` returned empty after verification.

## APK

- Downloads path: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration027-debug.apk`
- Artifact path: `D:/salary-hijacking-artifacts/20260713/iteration-027-salary-daily-limit-server-save/salary-hijacking-phone-arm64-iteration027-debug.apk`
- SHA256: `116AD2F0DAA477934DE4B55205EED208505A5DCB0A392E7352DCC0EF61C0C89E`
- Evidence summary: `D:/salary-hijacking-artifacts/20260713/iteration-027-salary-daily-limit-server-save/apk-summary.json`

## Remaining Limits

- Physical Android phone install/open/logcat QA remains pending because no real phone is attached to this Codex Windows environment.
- This is a debug/pre-release APK, not a production AAB or Google Play submission.
- No production AAB, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, or Cloudflare secret mutation was performed.
