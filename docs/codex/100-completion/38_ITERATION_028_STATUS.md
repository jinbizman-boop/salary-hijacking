# Iteration 028 - Salary Completed Daily Detail Server Update

Observed at: 2026-07-13 KST

## Scope

- Salary Home completed daily budget detail edits now call the server-authoritative Budget `updateVariableExpense` API before replacing the row.
- The completed-row update request changes only the editable amount/category/content fields and omits `spentAt`, preserving the original occurrence date instead of resetting it to the current time.
- Planned/incomplete daily budget detail edits remain local preview edits until the user marks them completed.
- Latest phone-target ARM64 debug APK evidence was refreshed after the source change.
- Generated storage cleanup was rechecked: only real filesystem drives `C:` and `D:` are present, `subst` is empty after build, and regenerated mobile build/temp caches were cleaned or moved off C where already junctioned.

## Verification

- RED: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand` failed because completed daily detail edits did not call `updateVariableExpense`.
- Intermediate failure: the server update was called but the request included a fresh `spentAt`; this could reset an existing completed expense occurrence date.
- GREEN: same focused Salary test PASS, 15 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/budget/__tests__/budget.api.test.ts --runInBand`: PASS, 3 suites / 55 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile exec prettier --check src/features/salary/components/SalaryHomeReferenceScreen.tsx src/features/salary/__tests__/salary.components.test.tsx`: PASS.
- `git diff --check -- apps/mobile/src/features/salary/components/SalaryHomeReferenceScreen.tsx apps/mobile/src/features/salary/__tests__/salary.components.test.tsx`: PASS.
- Local Android phone-target ARM64 debug APK build: PASS; wrapper timed out after producing the APK, then Gradle/JDK processes exited cleanly.
- APK package metadata: PASS for `com.salaryhijacking.mobile`, app label `급여납치`, target SDK 35, and `arm64-v8a`.
- APK signature verification: PASS with APK Signature Scheme v2.
- APK native-library inspection: PASS for `lib/arm64-v8a/libexpo-modules-core.so` and `lib/arm64-v8a/libreactnative.so`.
- Windows filesystem drive check after build: real drives are `C:` and `D:` only; `subst` returned empty after verification.

## APK

- Downloads path: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration028-debug.apk`
- Artifact path: `D:/salary-hijacking-artifacts/20260713/iteration-028-salary-completed-daily-detail-server-update/salary-hijacking-phone-arm64-iteration028-debug.apk`
- SHA256: `36E795F6BC7F05711737DCFB541DD9B74AAA58BCBD48CBA0DA8ABB0B360FA7AB`
- Evidence summary: `D:/salary-hijacking-artifacts/20260713/iteration-028-salary-completed-daily-detail-server-update/apk-summary.json`

## Storage Cleanup

- Removed generated `apps/mobile/build` before rebuilding the latest APK.
- Removed safe temp caches: Jest, Metro file map, and V8 compile cache under `C:/Users/PC/AppData/Local/Temp`.
- Confirmed `platform/.tools` is already a junction to D-drive toolchain storage and is not duplicating Android SDK/JDK payloads on C.
- `C:` free space after cleanup/check: about `30.47GB`.

## Remaining Limits

- Physical Android phone install/open/logcat QA remains pending because no real phone is attached to this Codex Windows environment.
- This is a debug/pre-release APK, not a production AAB or Google Play submission.
- No production AAB, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, or Cloudflare secret mutation was performed.
