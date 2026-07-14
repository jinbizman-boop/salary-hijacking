# Iteration 026 - Plan Living Days Server Recalculate

Observed at: 2026-07-13 KST

## Scope

- Plan daily living day-count changes now call the server-authoritative Budget `recalculate` API before syncing the shared Salary Home preview state.
- The recalculation request includes the KST period start/end dates, daily amount multiplied by the selected day count, overwrite intent, and a no-secret QA memo.
- The local editable fallback remains available only when no runtime/injected budget API exists or the staging/API call is unavailable.
- Latest phone-target ARM64 debug APK evidence was refreshed after the source change.

## Verification

- RED: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.components.test.tsx --runInBand` failed because `budgetApi.recalculate` was not called when changing `일수 설정`.
- GREEN: same focused Plan test PASS, 16 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.components.test.tsx src/features/salary/__tests__/salary.components.test.tsx src/features/budget/__tests__/budget.api.test.ts --runInBand`: PASS, 3 suites / 53 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile exec prettier --check src/features/plan/components/PlanReferenceScreen.tsx src/features/plan/__tests__/plan.components.test.tsx`: PASS.
- `git diff --check -- apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`: PASS.
- Local Android phone-target ARM64 debug APK build: PASS; wrapper timed out after producing the APK, then Gradle/JDK processes exited cleanly.
- APK package metadata: PASS for `com.salaryhijacking.mobile`, app label `급여납치`, target SDK 35, and `arm64-v8a`.
- APK signature verification: PASS with APK Signature Scheme v2.
- APK native-library inspection: PASS for `lib/arm64-v8a/libexpo-modules-core.so` and `lib/arm64-v8a/libreactnative.so`.
- Windows filesystem drive check after build: real drives are `C:` and `D:` only; `subst` returned empty after verification.

## APK

- Downloads path: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration026-debug.apk`
- Artifact path: `D:/salary-hijacking-artifacts/20260713/iteration-026-plan-living-days-server-recalculate/salary-hijacking-phone-arm64-iteration026-debug.apk`
- SHA256: `35A27753A9AD00CDCA54D45A63445C71714CF528BF9FD9AC98FA69ACDA1FBA95`
- Evidence summary: `D:/salary-hijacking-artifacts/20260713/iteration-026-plan-living-days-server-recalculate/apk-summary.json`

## Remaining Limits

- Physical Android phone install/open/logcat QA remains pending because no real phone is attached to this Codex Windows environment.
- This is a debug/pre-release APK, not a production AAB or Google Play submission.
- No production AAB, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, or Cloudflare secret mutation was performed.
