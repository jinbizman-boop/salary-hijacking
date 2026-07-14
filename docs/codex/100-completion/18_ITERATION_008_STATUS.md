# Iteration 008 Status - stale subst cleanup hardening

Date: 2026-07-13 KST
Repository: `C:/Users/PC/Desktop/salary-hijacking-platform`
HEAD: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`
Branch: `codex/commercialization-100`

## Result

PASS for cleanup automation hardening.
PASS for latest APK preservation after cleanup.
BLOCKED for new latest-source x86_64 emulator APK proof because the local Windows Gradle build exceeded the command timeout after an earlier Gradle transform-cache corruption failure.

## What Changed

- `scripts/dev/clean-generated-junk.mjs` now detects stale Windows `subst` mappings that point at the current repository root.
- `clean:junk` removes those stale mappings before removing generated filesystem junk.
- The cleanup is scoped to the current repository root and does not remove unrelated old workspaces.
- JSON output keeps `subst` mappings readable instead of rendering them as repository-relative paths.

## Regression Tests

- `scripts/dev/clean-generated-junk.test.mjs` now covers:
  - parsing Windows `subst` output,
  - collecting only mappings that point at the active repository root,
  - deleting the matching stale mapping through a stubbed `subst Z: /D` call.

## Verification

- `node --test scripts/dev/clean-generated-junk.test.mjs`: PASS, 7 tests.
- `node --test scripts/dev/clean-generated-junk.test.mjs scripts/dev/report-workspace-disk-usage.test.mjs scripts/dev/run-node-tests-with-clean-temp.test.mjs`: PASS, 12 tests.
- `corepack pnpm run format:check`: PASS.
- `corepack pnpm run clean:junk`: PASS, removed 22 generated paths and freed 1.54 GB after the failed x86_64 build attempt.
- `node scripts/release/check-release-readiness.mjs --soft`: READY with warnings for missing local GitHub CLI, missing local Neon CLI, and dirty working tree.
- `subst`: no mappings remain.
- Active filesystem drives after cleanup: `C:` and `D:`.

## APK Preservation

- Phone APK remains preserved at `D:/salary-hijacking-artifacts/20260713/iteration-007-latest-source/salary-hijacking-phone-arm64-latest-source-debug.apk`.
- Phone APK download copy remains preserved at `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-latest-source-debug.apk`.
- SHA256 remains `4B23C8C5560BA3BBF1748FFAC72740B171F2149B1464E88B4DC53F851811F97F`.

## Failed Attempt

Attempted to rebuild a latest-source x86_64 APK for emulator QA after moving the Android/JDK toolchain to D-drive-backed `.tools`.

First attempt failed at `:react-native-reanimated:configureCMakeDebug[x86_64]` because Gradle could not read `C:/Users/PC/.gradle/caches/8.13/transforms/.../metadata.bin`.
The corrupt Gradle transform cache was removed with a long-path-safe delete.

Second attempt exceeded the 30-minute command timeout before producing `apps/mobile/build/phone/android/salary-hijacking-phone-x86_64-latest-source-debug.apk`.
The timeout left a temporary `Z:` mapping and Java/Node build processes, which were removed immediately.
`clean:junk` then removed the generated build outputs.

## Remaining Blockers

- Physical Android phone install, cold-start, navigation, keyboard, persistence, safe-area, and logcat QA remain BLOCKED because no physical phone is attached.
- Fresh x86_64 latest-source emulator APK proof remains incomplete after the timeout.
- Production AAB, EAS submit, Play upload/submit, new EAS project, new keystore, Firebase reset, destructive DB migration, force push/rebase, and secret changes were not performed.

## Notes

This iteration improves cleanup reliability and prevents another timeout from leaving duplicate Salary Hijacking workspace drives behind. It does not change the user-facing mobile APK.
