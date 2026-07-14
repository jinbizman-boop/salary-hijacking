# Iteration 020 Status - Plan Daily Budget Server-First Save And Storage Cleanup

Date: 2026-07-13 KST
Head: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`

## Scope

- Plan daily living amount now saves through the server-authoritative DailyBudget API before Salary Home preview synchronization.
- Latest-source Android phone-target preview/debug APK was rebuilt and evidence was refreshed.
- Generated Android/Expo build output was cleaned after preserving the APK in the release artifact folder and Downloads.
- Old `salary-hijacking-main` and `salary-hijacking-work` folders were inspected for storage impact.

## Code Changes

- `apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx`
  - Added injectable/runtime Budget API support.
  - Added server-first `saveDailyBudget` call for daily living amount updates.
  - Applies server response snapshot to shared preview state before Salary Home sync.
  - Falls back to local preview sync only when the API is unavailable or fails in preview mode.
- `apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`
  - Added regression coverage proving daily living amount does not sync to Salary Home before the server-authoritative save resolves.

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.components.test.tsx src/features/plan/__tests__/plan.api.test.ts src/features/salary/__tests__/salary.components.test.tsx src/features/budget/__tests__/budget.api.test.ts --runInBand`: PASS, 4 suites / 59 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm exec prettier --check apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`: PASS.
- `git diff --check -- apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`: PASS.
- Local Android arm64-v8a debug APK build: PASS.
- `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2.
- `aapt dump badging`: PASS, package `com.salaryhijacking.mobile`, target SDK 35, native-code `arm64-v8a`.
- ZIP/native library inspection: PASS, `lib/arm64-v8a/libexpo-modules-core.so` and `lib/arm64-v8a/libreactnative.so` present.
- `node scripts\release\check-release-readiness.mjs --soft`: READY.
- `corepack pnpm run clean:junk`: PASS, removed 23 generated paths and freed 1.62 GB.
- `corepack pnpm run clean:junk:dry-run`: PASS, 0 generated paths remain.

## APK

- Artifact: `D:/salary-hijacking-artifacts/20260713/iteration-020-plan-daily-budget-server-first/salary-hijacking-phone-arm64-iteration020-debug.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration020-debug.apk`
- SHA256: `6C2E17F65A281A99E727FDBC6D376AA990F0D0AFE16C9CE0D9A0C64A974EF96F`
- Size: 65,077,317 bytes.

## Storage Cleanup Result

- Actual file-system drives detected by Windows CLI: `C:\` and `D:\` only.
- `C:/Users/PC/Desktop/salary-hijacking-platform`: about 1.6 GB after cleanup.
- `C:/Users/PC/Desktop/salary-hijacking-main`: 0 GB / 0 files, still locked by a Windows/Codex process and therefore not forcibly removed.
- `C:/Users/PC/Desktop/salary-hijacking-work`: 0 GB / 0 files, hidden legacy placeholder.
- `D:/salary-hijacking-artifacts`: about 0.06 GB after removing iteration 019.
- `D:/salary-hijacking-toolchain-cache`: about 8.4 GB; preserved because it contains active Android/Gradle/JDK toolchain cache and junction targets.
- C drive free space after cleanup: about 30.21 GB.

## Remaining Limits

- Physical Android phone install/cold-start/logcat/keyboard QA remains pending because no physical phone is attached to this Codex Windows environment.
- Production AAB, EAS submit, Play upload/submit, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, and Cloudflare secret mutation were not performed.
