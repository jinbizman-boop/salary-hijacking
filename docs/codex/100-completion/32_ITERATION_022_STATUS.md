# Iteration 022 - Salary Daily Toggle Server-First And Subst Cleanup

Date: 2026-07-13 KST

## Scope

- Salary Home daily budget item `사용 예정` / `사용 완료` toggles now use the server-authoritative Budget variable-expense API before local preview synchronization.
- The local Android debug APK builder now removes stale Salary Hijacking `subst` aliases that point to this workspace, so temporary `Z:`, `Y:`, or `X:` build roots do not remain as phantom project drives after interrupted or completed builds.

## Verification

- RED: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand`
  - Failed as expected because daily toggle API calls were `0`.
- GREEN: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand`
  - PASS, 9 tests.
- Focused regression: `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/budget/__tests__/budget.api.test.ts --runInBand`
  - PASS, 3 suites / 48 tests.
- Build script regression: `node --test apps\mobile\scripts\expo-local-android-debug-build.test.mjs`
  - PASS, 21 tests.
- Typecheck: `corepack pnpm --filter @salary-hijacking/mobile run typecheck`
  - PASS.
- Prettier touched-file check
  - PASS.
- `git diff --check`
  - PASS.
- Local ARM64 debug APK build
  - PASS.
- `subst` after build
  - PASS, no active aliases remained.
- APK signature verification
  - PASS with APK Signature Scheme v2.
- `aapt dump badging`
  - PASS, package `com.salaryhijacking.mobile`, min SDK 24, target SDK 35, native-code `arm64-v8a`.
- APK ZIP/native library inspection
  - PASS, `lib/arm64-v8a/libexpo-modules-core.so` and `lib/arm64-v8a/libreactnative.so` present.

## Artifact

- APK: `D:/salary-hijacking-artifacts/20260713/iteration-022-salary-daily-toggle-server-first/salary-hijacking-phone-arm64-iteration022-debug.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration022-debug.apk`
- SHA256: `51ECDD391E96C56FA6618CAB159763E9AF15E156241FA42D747A905E1C9A3AD0`
- Size: 65,079,773 bytes
- Evidence: `D:/salary-hijacking-artifacts/20260713/iteration-022-salary-daily-toggle-server-first/apk-summary.json`
- Release evidence: `release/mobile-preview-evidence.json`

## Remaining Limits

- This is a debug/pre-release APK, not a production AAB.
- Physical Android phone install, cold-start, keyboard, safe-area, persistence, and logcat QA remain blocked until a real device is attached to this Codex Windows environment.
- Production AAB, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, and Cloudflare secret mutation were not performed.
