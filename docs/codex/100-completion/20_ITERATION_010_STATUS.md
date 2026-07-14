# Iteration 010 Status - Latest-Source ARM64 APK And Cleanup

Date: 2026-07-13 KST

## Scope

This iteration records the latest-source Android preview/debug APK proof and
post-build generated-artifact cleanup for the Salary Hijacking platform.

Working repository:

- `C:/Users/PC/Desktop/salary-hijacking-platform`
- HEAD: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`
- Branch: `codex/commercialization-100`

## Targeted Requirements

- Keep work scoped to `salary-hijacking-platform`.
- Prove the current dirty mobile-source snapshot is represented by a fresh APK
  evidence record, so stale APK links cannot pass release readiness.
- Preserve the phone-installable APK outside disposable build directories.
- Remove generated build/cache/temp outputs after verification-heavy work.
- Do not run production AAB, EAS submit, Play Console submit, new EAS project,
  new keystore, Firebase reset, destructive DB migration, force push/rebase, or
  secret mutation.

## APK Evidence

Latest phone-target debug APK:

- APK: `D:/salary-hijacking-artifacts/20260713/iteration-010-latest-source/salary-hijacking-phone-arm64-iteration010-debug.apk`
- User Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration010-debug.apk`
- Temporary download URL: `https://temp.sh/hZYyv/salary-hijacking-phone-arm64-iteration010-debug.apk`
- SHA256: `596ABBD6E7726779ED1924D557180121C12BE71D51A74B191EA80EBAD10A8094`
- Size: `65,065,053` bytes
- ABI: `arm64-v8a`
- APK signing: verified with Android v2 signing
- JS bundle: present
- Expo native core library: `lib/arm64-v8a/libexpo-modules-core.so`
- Evidence JSON: `D:/salary-hijacking-artifacts/20260713/iteration-010-latest-source/apk-summary.json`
- Download verification evidence: `D:/salary-hijacking-artifacts/20260713/iteration-010-latest-source/temp-sh-download-verify.json`

Tracked preview evidence:

- `release/mobile-preview-evidence.json`
- `android.phoneTargetDebugApkBuilt`: `true`
- `android.phoneTargetDebugApkSigned`: `true`
- `android.phoneTargetDebugApkDownloadVerified`: `true`
- `android.phoneTargetDebugApkAbiFilterVerified`: `true`
- `android.latestSourceChangesPackaged`: `true`
- `android.latestSourceGitStatusSha256`:
  `82FE7585E6B8696F81EAC286616AF232F12A5AA2508CA737607A19A44967E410`

## Cleanup Evidence

The user reported Windows Explorer showing multiple apparent Salary Hijacking
drives. The current shell and Windows system queries showed only real `C:` and
`D:` file-system drives:

- `fsutil fsinfo drives`: `C:\ D:\`
- `cmd /c subst`: no mappings
- `Get-SmbMapping`: no mappings
- `Get-CimInstance Win32_LogicalDisk`: `C:` and `D:` only

Generated-artifact cleanup:

- Command: `corepack pnpm run clean:junk`
- Result: PASS
- Removed: 299 generated paths
- Freed: 6.27 GB
- Major removed categories:
  - `apps/mobile/.expo`
  - `apps/mobile/android/.gradle`
  - `apps/mobile/android/**/build`
  - `apps/mobile/build`
  - generated Android dependency build outputs under `node_modules/.pnpm`
  - `%TEMP%/salary-release-ready-*`
  - Metro/Jest/temp caches covered by the cleanup policy

Post-clean storage check:

- `C:` free space after cleanup and follow-up validation:
  `12,166,217,728` bytes
- `D:` free space after cleanup and follow-up validation:
  `477,141,504,000` bytes
- Required `.tools` and `node_modules` directories were preserved.

## Verification

Commands run after cleanup:

- `corepack pnpm run format:check`: PASS
- `node --test apps\mobile\scripts\expo-local-android-debug-build.test.mjs scripts\release\check-release-readiness.test.mjs scripts\dev\clean-generated-junk.test.mjs`: PASS, 97 tests
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS
- `node scripts\release\check-release-readiness.mjs --soft`: READY with warnings
- `corepack pnpm exec prettier --check docs/codex/08_FILE_COMPLETION_LOG.md`: PASS after formatting

Release readiness warnings that still remain:

- GitHub CLI is not available on PATH; connector evidence exists.
- Neon CLI is not available on PATH; connector evidence exists.
- Git repository has local changes.

## Remaining Blockers And Warnings

Physical Android phone QA remains not verified in this Codex Windows
environment because no physical phone is attached. Required remaining phone-side
evidence:

- install latest phone APK
- cold start
- tab navigation
- notification route without bottom tab
- keyboard avoidance
- safe-area/system navigation overlap
- data persistence after app restart
- sanitized logcat review

External/forbidden actions not performed:

- production AAB build
- EAS submit
- Google Play upload or submit
- new EAS project creation
- new keystore creation
- Firebase project/app/secret reset
- destructive production DB migration
- Git force push or rebase
- Cloudflare secret deletion or mutation
- secret value output

## Status

Iteration 010 improves release evidence by proving a fresh latest-source
phone-target ARM64 debug APK and by cleaning generated artifacts after the
verification-heavy build cycle. It does not prove full market launch readiness
or 100% platform completion, because physical phone QA and external approval
gates remain unresolved.
