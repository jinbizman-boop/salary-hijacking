# Iteration 025 - Salary Savings Reminder Server Deposit

Observed at: 2026-07-13 KST

## Scope

- Salary Home now shows fixed savings reminders alongside fixed expense reminders for the current pay cycle preview.
- Completing a savings reminder now calls the server-authoritative Plan Commitments savings deposit API before hiding the reminder for the current month.
- The reminder action remains local-preview compatible only when no injected/runtime API client exists, matching existing QA preview behavior.
- Latest phone-target ARM64 debug APK evidence was refreshed after the source change.

## Verification

- RED: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand` failed because `여행, 방학` was not rendered on Salary Home.
- GREEN: same focused Salary test PASS, 13 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/plan/__tests__/plan.api.test.ts src/features/budget/__tests__/budget.api.test.ts --runInBand`: PASS, 4 suites / 68 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm exec prettier --check apps/mobile/src/features/salary/components/SalaryHomeReferenceScreen.tsx apps/mobile/src/features/salary/__tests__/salary.components.test.tsx`: PASS.
- `git diff --check -- apps/mobile/src/features/salary/components/SalaryHomeReferenceScreen.tsx apps/mobile/src/features/salary/__tests__/salary.components.test.tsx`: PASS.
- Local Android phone-target ARM64 debug APK build: PASS.
- APK package metadata: PASS for `com.salaryhijacking.mobile`, app label `급여납치`, min SDK 24, target SDK 35, and `arm64-v8a`.
- APK signature verification: PASS with APK Signature Scheme v2.
- APK native-library inspection: PASS for `lib/arm64-v8a/libexpo-modules-core.so` and `lib/arm64-v8a/libreactnative.so`.
- Windows filesystem drive check after build: real drives are `C:` and `D:` only; `subst` returned empty.

## APK

- Downloads path: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration025-debug.apk`
- Artifact path: `D:/salary-hijacking-artifacts/20260713/iteration-025-salary-savings-reminder-server-deposit/salary-hijacking-phone-arm64-iteration025-debug.apk`
- SHA256: `A7A0A9D4E762D81F145D4DA6B95D476F56784F793906E783E7C5D1B51734851E`
- Evidence summary: `D:/salary-hijacking-artifacts/20260713/iteration-025-salary-savings-reminder-server-deposit/apk-summary.json`

## Remaining Limits

- Physical Android phone install/open/logcat QA remains pending because no real phone is attached to this Codex Windows environment.
- This is a debug/pre-release APK, not a production AAB or Google Play submission.
- No production AAB, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, or Cloudflare secret mutation was performed.
